import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 4096;

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

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

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

function formatApiError(error) {
  const status = error?.status;

  if (status === 429) {
    return {
      status: 429,
      message:
        'Rate limit reached on the NVIDIA API. Wait 30–60 seconds and try again. Free-tier keys have strict request limits.',
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: status,
      message: 'API key rejected. Verify NVIDIA_API_KEY is valid on Render.',
    };
  }

  return {
    status: status || 500,
    message: error.message || 'Failed to get response',
  };
}

async function callWithRetry(createFn, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await createFn();
    } catch (error) {
      const isRateLimit = error?.status === 429;
      if (isRateLimit && attempt < retries) {
        const delayMs = (attempt + 1) * 2000;
        console.warn(`Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: 'deepseek-ai/deepseek-v4-pro' });
});

app.post('/api/chat', async (req, res) => {
  const { messages, stream = true } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  if (!process.env.NVIDIA_API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY is not configured' });
  }

  const requestBody = {
    model: 'deepseek-ai/deepseek-v4-pro',
    messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: MAX_TOKENS,
    chat_template_kwargs: { thinking: false },
  };

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const completion = await callWithRetry(() =>
        openai.chat.completions.create({ ...requestBody, stream: true })
      );

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const completion = await callWithRetry(() =>
        openai.chat.completions.create({ ...requestBody, stream: false })
      );

      const content = completion.choices[0]?.message?.content || '';
      res.json({ content });
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
});
