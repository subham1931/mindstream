import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3001;

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

  // Allow all Vercel production and preview deployments
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

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const completion = await openai.chat.completions.create({
        model: 'deepseek-ai/deepseek-v4-pro',
        messages,
        temperature: 1,
        top_p: 0.95,
        max_tokens: 16384,
        stream: true,
        chat_template_kwargs: { thinking: false },
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const completion = await openai.chat.completions.create({
        model: 'deepseek-ai/deepseek-v4-pro',
        messages,
        temperature: 1,
        top_p: 0.95,
        max_tokens: 16384,
        stream: false,
        chat_template_kwargs: { thinking: false },
      });

      const content = completion.choices[0]?.message?.content || '';
      res.json({ content });
    }
  } catch (error) {
    console.error('Chat error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to get response' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`MindStream server running on port ${PORT}`);
});
