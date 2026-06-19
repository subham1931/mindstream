export const SYSTEM_PROMPT = {
  role: 'system',
  content:
    'You are MindStream, a helpful AI assistant. Match the user\'s language exactly. When the user writes in English, every part of your reply — including any internal reasoning — must be in English only. Never default to Chinese unless the user wrote in Chinese. Be clear and concise.',
};

export function prepareMessages(messages) {
  const cleaned = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
    .map(({ role, content }) => ({
      role,
      content: String(content || '').trim(),
    }))
    .filter((m) => m.content);

  const hasSystem = cleaned.some((m) => m.role === 'system');
  return hasSystem ? cleaned : [SYSTEM_PROMPT, ...cleaned];
}

export const MODEL_PROFILES = [
  {
    id: 'meta/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B Instruct',
    keyEnv: 'NVIDIA_KEY_LLAMA',
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    hasReasoning: false,
    timeoutMs: 60000,
  },
  {
    id: 'moonshotai/kimi-k2.6',
    label: 'Kimi K2.6',
    keyEnv: 'NVIDIA_KEY_KIMI',
    temperature: 1,
    top_p: 1,
    max_tokens: 16384,
    hasReasoning: false,
    timeoutMs: 90000,
  },
  {
    id: 'deepseek-ai/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    keyEnv: 'NVIDIA_KEY_DEEPSEEK',
    temperature: 1,
    top_p: 0.95,
    max_tokens: 4096,
    chat_template_kwargs: { thinking: true, reasoning_effort: 'medium' },
    hasReasoning: true,
    timeoutMs: 90000,
  },
  {
    id: 'deepseek-ai/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    keyEnv: 'NVIDIA_KEY_DEEPSEEK_PRO',
    temperature: 1,
    top_p: 0.95,
    max_tokens: 4096,
    chat_template_kwargs: { thinking: false },
    hasReasoning: false,
    timeoutMs: 45000,
  },
];

export function loadModelRoutes() {
  const genericKeys = (process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const flashKey = process.env.NVIDIA_KEY_DEEPSEEK?.trim();
  const proKey = process.env.NVIDIA_KEY_DEEPSEEK_PRO?.trim();
  const kimiKey = process.env.NVIDIA_KEY_KIMI?.trim();

  return MODEL_PROFILES.map((profile, index) => {
    let apiKey = process.env[profile.keyEnv]?.trim();

    if (!apiKey) {
      if (profile.id.includes('kimi')) {
        apiKey = kimiKey || genericKeys[0];
      } else if (profile.id.includes('flash')) {
        apiKey = flashKey || genericKeys[0];
      } else if (profile.id.includes('pro')) {
        apiKey = proKey || flashKey || genericKeys[1] || genericKeys[0];
      } else {
        apiKey = genericKeys[index] || genericKeys[0];
      }
    }

    return apiKey ? { ...profile, apiKey } : null;
  }).filter(Boolean);
}

export function getModelLabel(modelId) {
  return MODEL_PROFILES.find((p) => p.id === modelId)?.label || modelId;
}

export function buildRequestBody(profile, messages, stream, maxTokens) {
  const body = {
    model: profile.id,
    messages,
    temperature: profile.temperature,
    top_p: profile.top_p,
    max_tokens: profile.max_tokens || maxTokens,
    stream,
  };

  if (profile.chat_template_kwargs) {
    body.chat_template_kwargs = profile.chat_template_kwargs;
  }

  return body;
}

export function extractReasoning(message) {
  return message?.reasoning || message?.reasoning_content || '';
}
