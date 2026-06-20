import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthModal from './components/AuthModal';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
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

const FREE_MESSAGE_LIMIT = 0;

export default function App() {
  const { user, loading: authLoading, getAccessToken, signOut } = useAuth();

  const [conversations, setConversations] = useState([
    { id: createId(), title: 'New conversation', messages: [] },
  ]);
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0].id);
  const [tempChat, setTempChat] = useState(null);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');

  const activeConversation = tempChat || conversations.find((c) => c.id === activeId);
  const selectedModelLabel =
    models.find((m) => m.id === selectedModel)?.label || 'Llama 3.3 70B Instruct';

  // Helper to make authenticated API calls
  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getAccessToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  }, [getAccessToken]);

  // Load models
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

  // Load conversations from Supabase when user logs in
  useEffect(() => {
    if (!user || !supabase) return;

    // Reset guest count when user signs in
    setGuestMessageCount(0);
    setShowAuthModal(false);

    authFetch(apiUrl('/api/conversations'))
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations?.length) {
          const loaded = data.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            pinned: c.pinned || false,
            messages: [],
            dbId: c.id,
            loaded: false,
          }));
          const newChat = { id: createId(), title: 'New conversation', messages: [], loaded: true };
          setConversations([newChat, ...loaded]);
          setActiveId(newChat.id);
        }
      })
      .catch(() => {});
  }, [user, authFetch]);

  // Load messages when switching to a conversation that hasn't been loaded
  useEffect(() => {
    if (!user || !supabase || !activeId || tempChat) return;

    const conv = conversations.find((c) => c.id === activeId);
    if (!conv || conv.loaded || !conv.dbId) return;

    authFetch(apiUrl(`/api/conversations/${conv.dbId}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.conversation?.messages) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId
                ? { ...c, messages: data.conversation.messages, loaded: true }
                : c
            )
          );
        }
      })
      .catch(() => {});
  }, [activeId, user, conversations, tempChat, authFetch]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const handleChange = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const updateConversation = (id, updater) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updater(c) } : c))
    );
  };

  // Save conversation to DB
  const saveConversationToDb = useCallback(async (conv) => {
    if (!user || !supabase || !conv) return;

    try {
      const token = await getAccessToken();
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      if (!conv.dbId) {
        const res = await fetch(apiUrl('/api/conversations'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: conv.title }),
        });
        const data = await res.json();
        if (data.conversation) {
          const dbId = data.conversation.id;
          setConversations((prev) =>
            prev.map((c) => (c.id === conv.id ? { ...c, dbId } : c))
          );
          return dbId;
        }
      }
      return conv.dbId;
    } catch {
      return conv.dbId;
    }
  }, [user, getAccessToken]);

  // Save messages after response completes
  const saveMessagesToDb = useCallback(async (convId, dbId, userMsg, assistantMsg) => {
    if (!user || !supabase || !dbId) return;

    try {
      const token = await getAccessToken();
      await fetch(apiUrl(`/api/conversations/${dbId}/messages`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: userMsg.content },
            { role: 'assistant', content: assistantMsg.content, reasoning: assistantMsg.reasoning, modelLabel: assistantMsg.modelLabel },
          ],
        }),
      });
    } catch { /* silent fail */ }
  }, [user, getAccessToken]);

  const handleNewChat = () => {
    const newChat = { id: createId(), title: 'New conversation', messages: [], loaded: true };
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

  const handleDeleteChat = async (id) => {
    const conv = conversations.find((c) => c.id === id);

    if (conv?.dbId && user) {
      try {
        const token = await getAccessToken();
        await fetch(apiUrl(`/api/conversations/${conv.dbId}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* continue */ }
    }

    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const newChat = { id: createId(), title: 'New conversation', messages: [], loaded: true };
        setActiveId(newChat.id);
        return [newChat];
      }
      if (id === activeId) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleRenameChat = (id, newTitle) => {
    updateConversation(id, () => ({ title: newTitle }));
    // Update in DB if exists
    const conv = conversations.find((c) => c.id === id);
    if (conv?.dbId && user) {
      getAccessToken().then((token) => {
        fetch(apiUrl(`/api/conversations/${conv.dbId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: newTitle }),
        }).catch(() => {});
      });
    }
  };

  const handlePinChat = (id) => {
    const conv = conversations.find((c) => c.id === id);
    const newPinned = !conv?.pinned;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: newPinned } : c))
    );
    // Persist to DB
    if (conv?.dbId && user) {
      getAccessToken().then((token) => {
        fetch(apiUrl(`/api/conversations/${conv.dbId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pinned: newPinned }),
        }).catch(() => {});
      });
    }
  };

  const handleSend = async (content) => {
    if (!content.trim() || isLoading || !activeConversation) return;

    // Check if guest has exceeded free limit (require auth to chat)
    if (!user && supabase && guestMessageCount >= FREE_MESSAGE_LIMIT) {
      setShowAuthModal(true);
      return;
    }

    // If supabase is not configured, allow unlimited guest usage
    if (!user && !supabase) {
      // no restriction
    }

    const userMessage = { role: 'user', content: content.trim() };
    const apiMessages = [...activeConversation.messages, userMessage]
      .filter((m) => m.content?.trim())
      .map(({ role, content: text }) => ({ role, content: text.trim() }));

    const isTemp = Boolean(tempChat);
    const currentActiveId = activeId;

    if (isTemp) {
      setTempChat((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, { role: 'assistant', content: '' }],
      }));
    } else {
      const newTitle = activeConversation.messages.length === 0
        ? content.trim().slice(0, 40) + (content.length > 40 ? '…' : '')
        : undefined;

      updateConversation(activeId, (c) => ({
        title: newTitle || c.title,
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
        updateConversation(currentActiveId, updater);
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let finalContent = '';
    let finalReasoning = '';
    let finalModelLabel = '';

    try {
      const token = await getAccessToken();
      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

      const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: fetchHeaders,
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
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], fallbackNotice: parsed.info };
                return { messages: msgs };
              });
            }

            if (parsed.status) {
              const label = parsed.modelLabel || '';
              const statusHint =
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
                msgs[msgs.length - 1] = { ...prev, statusHint, modelLabel: parsed.modelLabel || prev.modelLabel };
                return { messages: msgs };
              });
            }

            if (parsed.reasoning) reasoningAccum += parsed.reasoning;
            if (parsed.content) accumulated += parsed.content;

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
              finalModelLabel = parsed.meta.modelLabel;
              updateActiveMessages((c) => {
                const msgs = [...c.messages];
                const prev = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...prev, modelLabel: parsed.meta.modelLabel };
                return { messages: msgs };
              });
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      finalContent = accumulated;
      finalReasoning = reasoningAccum;

      // Increment guest message count after successful response
      if (!user && supabase) {
        setGuestMessageCount((prev) => prev + 1);
      }
    } catch (error) {
      const message =
        error.name === 'AbortError'
          ? 'Request timed out. Pro model can be slow — try again or use Flash.'
          : error.message;
      updateActiveMessages((c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { role: 'assistant', content: `Error: ${message}`, isError: true };
        return { messages: msgs };
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);

      // Persist to DB (skip temp chats and errors)
      if (!isTemp && finalContent && user) {
        const conv = conversations.find((c) => c.id === currentActiveId) ||
          { id: currentActiveId, title: content.trim().slice(0, 40), dbId: null };
        const dbId = await saveConversationToDb(conv);
        if (dbId) {
          await saveMessagesToDb(currentActiveId, dbId, userMessage, {
            content: finalContent,
            reasoning: finalReasoning || undefined,
            modelLabel: finalModelLabel || undefined,
          });

          if (activeConversation.messages.length === 0) {
            try {
              const token = await getAccessToken();
              const newTitle = content.trim().slice(0, 40) + (content.length > 40 ? '…' : '');
              await fetch(apiUrl(`/api/conversations/${dbId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title: newTitle }),
              });
            } catch { /* silent */ }
          }
        }
      }
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="app app-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} defaultMode={authModalMode} />
      )}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        onSelect={handleSelectChat}
        onNewChat={handleNewChat}
        onTempChat={handleTempChat}
        onDelete={handleDeleteChat}
        onRename={handleRenameChat}
        onPin={handlePinChat}
        onClose={() => setSidebarOpen(false)}
        activeModelLabel={selectedModelLabel}
        isTempActive={Boolean(tempChat)}
        user={user}
        onSignOut={() => {
          signOut();
          const newChat = { id: createId(), title: 'New conversation', messages: [], loaded: true };
          setConversations([newChat]);
          setActiveId(newChat.id);
          setTempChat(null);
        }}
        onShowAuth={(mode) => { setAuthModalMode(mode); setShowAuthModal(true); }}
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
