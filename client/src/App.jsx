import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { apiUrl } from './api';
import './App.css';

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const DEFAULT_MODELS = [
  { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
  { id: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6' },
  { id: 'qwen/qwen3.5-122b-a10b', label: 'Qwen 3.5 122B' },
  { id: 'google/gemma-4-31b-it', label: 'Gemma 4 31B IT' },
  { id: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { id: 'deepseek-ai/deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
];

export default function App() {
  const [conversations, setConversations] = useState([
    { id: createId(), title: 'New conversation', messages: [] },
  ]);
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0].id);
  const [tempChat, setTempChat] = useState(null);

  const activeConversation = tempChat || conversations.find((c) => c.id === activeId);
  const selectedModelLabel =
    models.find((m) => m.id === selectedModel)?.label || 'Llama 3.3 70B Instruct';

  useEffect(() => {
    fetch(apiUrl('/api/models'))
      .then((res) => res.json())
      .then((data) => {
        if (data.models?.length) {
          const available = data.models.filter((m) => m.available);
          if (available.length) {
            setModels(available);
            setSelectedModel(data.defaultModel || available[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const handleChange = (e) => {
      if (e.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const updateConversation = (id, updater) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updater(c) } : c))
    );
  };

  const handleNewChat = () => {
    const newChat = { id: createId(), title: 'New conversation', messages: [] };
    setConversations((prev) => [newChat, ...prev]);
    setActiveId(newChat.id);
    setSelectedModel(DEFAULT_MODELS[0].id);
    setTempChat(null);
    setSidebarOpen(false);
  };

  const handleSelectChat = (id) => {
    setActiveId(id);
    setTempChat(null);
    setSidebarOpen(false);
  };

  const handleTempChat = () => {
    setTempChat({ id: createId(), title: 'Temporary chat', messages: [], isTemp: true });
    setSelectedModel(DEFAULT_MODELS[0].id);
    setSidebarOpen(false);
  };

  const handleDeleteChat = (id) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const newChat = { id: createId(), title: 'New conversation', messages: [] };
        setActiveId(newChat.id);
        return [newChat];
      }
      if (id === activeId) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleSend = async (content) => {
    if (!content.trim() || isLoading || !activeConversation) return;

    const userMessage = { role: 'user', content: content.trim() };
    const apiMessages = [...activeConversation.messages, userMessage]
      .filter((m) => m.content?.trim())
      .map(({ role, content: text }) => ({ role, content: text.trim() }));

    const isTemp = Boolean(tempChat);

    if (isTemp) {
      setTempChat((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, { role: 'assistant', content: '' }],
      }));
    } else {
      updateConversation(activeId, (c) => ({
        title:
          c.messages.length === 0
            ? content.trim().slice(0, 40) + (content.length > 40 ? '…' : '')
            : c.title,
        messages: [...c.messages, userMessage, { role: 'assistant', content: '' }],
      }));
    }

    setIsLoading(true);

    const updateActiveMessages = (updater) => {
      if (isTemp) {
        setTempChat((prev) => {
          const result = updater(prev);
          return { ...prev, ...result };
        });
      } else {
        updateConversation(activeId, updater);
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let reasoningAccum = '';
      let statusHint = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);

            if (parsed.info) {
              updateActiveMessages((c) => {
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  fallbackNotice: parsed.info,
                };
                return { messages: msgs };
              });
            }

            if (parsed.status) {
              const label = parsed.modelLabel || '';
              statusHint =
                parsed.status === 'connecting' && label.includes('Pro')
                  ? 'Connecting to Pro — this model can take up to a minute…'
                  : parsed.status === 'connecting'
                    ? 'Connecting…'
                    : label.includes('Pro')
                      ? 'Pro is generating…'
                      : 'Generating response…';
              updateActiveMessages((c) => {
                const msgs = [...c.messages];
                const prev = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = {
                  ...prev,
                  statusHint,
                  modelLabel: parsed.modelLabel || prev.modelLabel,
                };
                return { messages: msgs };
              });
            }

            if (parsed.reasoning) {
              reasoningAccum += parsed.reasoning;
            }

            if (parsed.content) {
              accumulated += parsed.content;
            }

            if (parsed.reasoning || parsed.content) {
              updateActiveMessages((c) => {
                const msgs = [...c.messages];
                const prev = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = {
                  role: 'assistant',
                  content: accumulated,
                  reasoning: reasoningAccum || undefined,
                  fallbackNotice: prev.fallbackNotice,
                  modelLabel: parsed.meta?.modelLabel || prev.modelLabel,
                  statusHint: accumulated || reasoningAccum ? undefined : prev.statusHint,
                };
                return { messages: msgs };
              });
            }

            if (parsed.meta?.modelLabel) {
              updateActiveMessages((c) => {
                const msgs = [...c.messages];
                const prev = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = {
                  ...prev,
                  modelLabel: parsed.meta.modelLabel,
                };
                return { messages: msgs };
              });
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    } catch (error) {
      const message =
        error.name === 'AbortError'
          ? 'Request timed out. Pro model can be slow — try again or use Flash.'
          : error.message;
      updateActiveMessages((c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: `Error: ${message}`,
          isError: true,
        };
        return { messages: msgs };
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        onSelect={handleSelectChat}
        onNewChat={handleNewChat}
        onTempChat={handleTempChat}
        onDelete={handleDeleteChat}
        onClose={() => setSidebarOpen(false)}
        activeModelLabel={selectedModelLabel}
        isTempActive={Boolean(tempChat)}
      />
      <ChatArea
        conversation={activeConversation}
        isLoading={isLoading}
        onSend={handleSend}
        onToggleSidebar={() => setSidebarOpen(true)}
        onNewChat={handleNewChat}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        isTempChat={Boolean(tempChat)}
      />
    </div>
  );
}
