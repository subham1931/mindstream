import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 4096;
const KEY_COOLDOWN_MS = Number(process.env.KEY_COOLDOWN_MS) || 60000;
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function normalizeOrigin(url) {
  return url?.replace(/\/$/, '') || '';
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((url) => normalizeOrigin(url.trim()))
    .filter(Boolean),
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(normalized)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
  })
);
app.use(express.json());

function loadApiKeys() {
  const raw = process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '';
  return [...new Set(raw.split(',').map((k) => k.trim()).filter(Boolean))];
}

function loadModels() {
  const primary = process.env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4-pro';
  const fallbacks = (process.env.NVIDIA_FALLBACK_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

const apiKeys = loadApiKeys();
const models = loadModels();
const keyCooldownUntil = new Map();

function isKeyAvailable(key) {
  const until = keyCooldownUntil.get(key);
  return !until || Date.now() > until;
}

function markKeyLimited(key) {
  keyCooldownUntil.set(key, Date.now() + KEY_COOLDOWN_MS);
}

function createClient(apiKey) {
  return new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
}

function buildRequestBody(messages, model, stream) {
  const body = {
    model,
    messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: MAX_TOKENS,
    stream,
  };

  if (model.includes('deepseek')) {
    body.chat_template_kwargs = { thinking: false };
  }

  return body;
}

function buildFallbackNotice(modelIndex, keyIndex, model) {
  const parts = [];

  if (keyIndex > 0) {
    parts.push(`Backup API key in use (${keyIndex + 1}/${apiKeys.length})`);
  }

  if (modelIndex > 0) {
    parts.push(`Switched to alternate model: ${model}`);
  }

  if (!parts.length) return null;

  return `${parts.join(' · ')}. Response may take a moment.`;
}

function formatApiError(error) {
  const status = error?.status;

  if (status === 429) {
    return {
      status: 429,
      message:
        'All API keys and models are temporarily busy. Wait a minute and try again, or add more NVIDIA API keys on the server.',
    };
  }

  if (status === 401 || status === 403) {
    return {
      status,
      message: 'API key rejected. Verify your NVIDIA API keys on Render.',
    };
  }

  return {
    status: status || 500,
    message: error.message || 'Failed to get response',
  };
}

async function completeWithPool(messages, stream) {
  if (!apiKeys.length) {
    throw Object.assign(new Error('No NVIDIA API keys configured'), { status: 500 });
  }

  let lastError;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      const key = apiKeys[keyIndex];
      if (!isKeyAvailable(key)) continue;

      const client = createClient(key);

      try {
        const completion = await client.chat.completions.create(
          buildRequestBody(messages, model, stream)
        );

        return {
          completion,
          meta: {
            model,
            keySlot: keyIndex + 1,
            totalKeys: apiKeys.length,
            usedFallback: modelIndex > 0 || keyIndex > 0,
            notice: buildFallbackNotice(modelIndex, keyIndex, model),
          },
        };
      } catch (error) {
        if (error?.status === 429) {
          markKeyLimited(key);
          lastError = error;
          console.warn(
            `Rate limited: model=${model}, key=${keyIndex + 1}/${apiKeys.length} — trying next...`
          );
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError || Object.assign(new Error('All keys rate limited'), { status: 429 });
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: models[0],
    fallbackModels: models.slice(1),
    apiKeyCount: apiKeys.length,
  });
});

app.post('/api/chat', async (req, res) => {
  const { messages, stream = true } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  if (!apiKeys.length) {
    return res.status(500).json({ error: 'NVIDIA API keys are not configured' });
  }

  try {
    const { completion, meta } = await completeWithPool(messages, stream);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (meta.notice) {
        res.write(`data: ${JSON.stringify({ info: meta.notice, meta })}\n\n`);
      }

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const content = completion.choices[0]?.message?.content || '';
      res.json({ content, meta });
    }
  } catch (error) {
    const { status, message } = formatApiError(error);
    console.error('Chat error:', message);

    if (!res.headersSent) {
      res.status(status).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`MindStream server running on port ${PORT}`);
  console.log(`API keys loaded: ${apiKeys.length}, models: ${models.join(', ')}`);
});
