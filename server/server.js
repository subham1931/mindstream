import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai';
import {
  MODEL_PROFILES,
  loadModelRoutes,
  buildRequestBody,
  extractReasoning,
  prepareMessages,
  getModelLabel,
} from './models.js';
import { authMiddleware } from './supabase.js';
import conversationsRouter from './routes/conversations.js';

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 4096;
const KEY_COOLDOWN_MS = Number(process.env.KEY_COOLDOWN_MS) || 60000;
const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS) || 120000;
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
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;
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
app.use(express.json({ limit: '15mb' }));
app.use(authMiddleware);

// Conversation persistence routes
app.use('/api/conversations', conversationsRouter);

const modelRoutes = loadModelRoutes();
const keyCooldownUntil = new Map();

function cooldownKey(key) {
  return `${key.slice(0, 12)}…`;
}

function isKeyAvailable(key) {
  const until = keyCooldownUntil.get(key);
  return !until || Date.now() > until;
}

function markKeyLimited(key) {
  keyCooldownUntil.set(key, Date.now() + KEY_COOLDOWN_MS);
}

function createClient(apiKey, timeoutMs = API_TIMEOUT_MS) {
  return new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
    timeout: timeoutMs,
  });
}

function isRetriableError(error) {
  const status = error?.status;
  return (
    status === 429 ||
    status === 403 ||
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    error?.code === 'ECONNABORTED' ||
    error?.name === 'TimeoutError' ||
    /timed out/i.test(error?.message || '')
  );
}

function orderRoutes(requestedModel) {
  if (!requestedModel) return modelRoutes;

  const preferred = modelRoutes.find((r) => r.id === requestedModel);
  if (!preferred) return modelRoutes;

  return [preferred, ...modelRoutes.filter((r) => r.id !== requestedModel)];
}

function buildFallbackNotice(routeIndex, route, requestedModel) {
  if (routeIndex === 0 && route.id === requestedModel) return null;

  const parts = [];
  if (routeIndex > 0 || route.id !== requestedModel) {
    parts.push(`Switched to ${route.label}`);
  }
  return parts.length ? `${parts.join(' · ')}. Response may take a moment.` : null;
}

function formatApiError(error) {
  const status = error?.status;

  if (status === 429) {
    return {
      status: 429,
      message:
        'All models are temporarily busy. Wait a minute and try again.',
    };
  }

  if (status === 401 || status === 403) {
    return {
      status,
      message: 'API key rejected. Verify your NVIDIA API keys in server .env',
    };
  }

  return {
    status: status || 500,
    message: error.message || 'Failed to get response',
  };
}

async function completeWithPool(messages, stream, requestedModel) {
  if (!modelRoutes.length) {
    throw Object.assign(new Error('No model routes configured'), { status: 500 });
  }

  const preparedMessages = prepareMessages(messages);
  const routes = orderRoutes(requestedModel);
  let lastError;

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const { apiKey } = route;

    if (!isKeyAvailable(apiKey)) continue;

    const client = createClient(apiKey, route.timeoutMs || API_TIMEOUT_MS);

    try {
      const completion = await client.chat.completions.create(
        buildRequestBody(route, preparedMessages, stream, MAX_TOKENS)
      );

      return {
        completion,
        meta: {
          model: route.id,
          modelLabel: route.label,
          usedFallback: i > 0 || route.id !== requestedModel,
          notice: buildFallbackNotice(i, route, requestedModel),
          hasReasoning: route.hasReasoning,
        },
      };
    } catch (error) {
      if (isRetriableError(error)) {
        if (error?.status === 429) markKeyLimited(apiKey);
        lastError = error;
        console.warn(
          `${route.label} unavailable (${error?.status || error?.message}) — trying next model...`
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError || Object.assign(new Error('All models rate limited'), { status: 429 });
}

const STT_MODEL = process.env.STT_MODEL || 'whisper-1';

function getSttConfig() {
  const apiKey = process.env.STT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseURL: process.env.STT_BASE_URL || 'https://api.openai.com/v1',
    model: STT_MODEL,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    models: modelRoutes.map((r) => ({ id: r.id, label: r.label })),
    defaultModel: modelRoutes[0]?.id,
    transcriptionAvailable: Boolean(getSttConfig()),
  });
});

app.get('/api/models', (_req, res) => {
  res.json({
    models: MODEL_PROFILES.map((p) => ({
      id: p.id,
      label: p.label,
      available: modelRoutes.some((r) => r.id === p.id),
    })),
    defaultModel: modelRoutes[0]?.id || MODEL_PROFILES[0]?.id,
  });
});

app.post('/api/chat', async (req, res) => {
  const { messages, stream = true, model: requestedModel } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  if (!modelRoutes.length) {
    return res.status(500).json({ error: 'No NVIDIA API keys configured for any model' });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const requestedLabel = getModelLabel(requestedModel) || 'model';
      res.write(
        `data: ${JSON.stringify({
          status: 'connecting',
          modelLabel: requestedLabel,
        })}\n\n`
      );
      res.flushHeaders?.();
    }

    const { completion, meta } = await completeWithPool(messages, stream, requestedModel);

    if (stream) {
      res.write(
        `data: ${JSON.stringify({
          meta: {
            model: meta.model,
            modelLabel: meta.modelLabel,
          },
          status: 'started',
          modelLabel: meta.modelLabel,
        })}\n\n`
      );

      if (meta.notice) {
        res.write(`data: ${JSON.stringify({ info: meta.notice })}\n\n`);
      }

      let receivedContent = false;
      let receivedReasoning = false;

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content;
        const reasoning =
          delta?.reasoning_content ||
          delta?.reasoning ||
          (typeof delta === 'object' && delta?.reasoning);

        if (reasoning) {
          receivedReasoning = true;
          res.write(`data: ${JSON.stringify({ reasoning })}\n\n`);
        }
        if (content) {
          receivedContent = true;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      if (!receivedContent && !receivedReasoning) {
        res.write(
          `data: ${JSON.stringify({ error: 'Model returned no content. Try again or switch models.' })}\n\n`
        );
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const message = completion.choices[0]?.message;
      const reasoning = extractReasoning(message);
      const content = message?.content || '';

      res.json({
        content,
        reasoning,
        meta,
      });
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

app.post('/api/transcribe', async (req, res) => {
  const { audio, mimeType = 'audio/webm' } = req.body;

  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  const sttConfig = getSttConfig();
  if (!sttConfig) {
    return res.status(503).json({
      error:
        'Server transcription is not configured. Set OPENAI_API_KEY in server/.env, or allow Chrome to reach Google speech services (disable ad blockers/VPN).',
      code: 'STT_NOT_CONFIGURED',
    });
  }

  try {
    const buffer = Buffer.from(audio, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ error: 'Audio data is empty' });
    }

    const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : 'webm';
    const client = new OpenAI({
      apiKey: sttConfig.apiKey,
      baseURL: sttConfig.baseURL,
      timeout: 60000,
    });
    const transcription = await client.audio.transcriptions.create({
      file: await toFile(buffer, `recording.${extension}`, { type: mimeType }),
      model: sttConfig.model,
    });

    res.json({ text: transcription.text?.trim() || '' });
  } catch (error) {
    const { status, message } = formatApiError(error);
    console.error('Transcription error:', message);
    res.status(status).json({ error: message || 'Transcription failed' });
  }
});

app.listen(PORT, () => {
  console.log(`MindStream server running on port ${PORT}`);
  console.log(
    `Models: ${modelRoutes.map((r) => `${r.label} (${cooldownKey(r.apiKey)})`).join(', ') || 'none'}`
  );
});
