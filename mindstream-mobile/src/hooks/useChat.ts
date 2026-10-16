import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import type { Conversation, Model } from '../types';
import {
  createDraftConversation,
  createId,
  isStartedConversation,
  withSingleDraft,
} from '../utils/conversation';

const DEFAULT_MODELS: Model[] = [
  { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
  { id: 'qwen/qwen3.5-122b-a10b', label: 'Qwen 3.5 122B' },
  { id: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6' },
  { id: 'google/gemma-4-31b-it', label: 'Gemma 4 31B IT' },
  { id: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { id: 'deepseek-ai/deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
];

const FREE_MESSAGE_LIMIT = 0;

export function useChat() {
  const { user, getAccessToken } = useAuth();
  const userId = user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>(() => [createDraftConversation()]);
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [tempChat, setTempChat] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0].id);
  const [showAuth, setShowAuth] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const conversationsLoadedForUserRef = useRef<string | null>(null);

  const activeConversation = tempChat || conversations.find((c) => c.id === activeId);
  const sidebarConversations = conversations.filter(isStartedConversation);
  const isEmpty = (activeConversation?.messages.length ?? 0) === 0;

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(options.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(url, { ...options, headers });
    },
    [getAccessToken]
  );

  useEffect(() => {
    if (!userId || !supabase) {
      conversationsLoadedForUserRef.current = null;
      return;
    }

    if (conversationsLoadedForUserRef.current === userId) return;
    conversationsLoadedForUserRef.current = userId;

    setGuestMessageCount(0);
    setShowAuth(false);

    const draft = createDraftConversation();

    authFetch(apiUrl('/api/conversations'))
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations?.length) {
          const loaded: Conversation[] = data.conversations.map(
            (c: { id: string; title: string; pinned?: boolean }) => ({
              id: c.id,
              title: c.title,
              pinned: c.pinned || false,
              messages: [],
              dbId: c.id,
              loaded: false,
            })
          );
          setConversations(withSingleDraft(loaded, draft));
        } else {
          setConversations([draft]);
        }
        setActiveId(draft.id);
        setTempChat(null);
      })
      .catch(() => {});
  }, [userId, authFetch]);

  useEffect(() => {
    if (!userId || !supabase || !activeId || tempChat) return;

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
  }, [activeId, userId, conversations, tempChat, authFetch]);

  const updateConversation = useCallback((id: string, updater: (c: Conversation) => Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updater(c) } : c))
    );
  }, []);

  const saveConversationToDb = useCallback(
    async (conv: Conversation) => {
      if (!user || !supabase) return null;

      try {
        const token = await getAccessToken();
        if (!conv.dbId) {
          const res = await fetch(apiUrl('/api/conversations'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: conv.title }),
          });
          const data = await res.json();
          if (data.conversation) {
            const dbId = data.conversation.id;
            setConversations((prev) =>
              prev.map((c) => (c.id === conv.id ? { ...c, dbId } : c))
            );
            return dbId as string;
          }
        }
        return conv.dbId ?? null;
      } catch {
        return conv.dbId ?? null;
      }
    },
    [user, getAccessToken]
  );

  const saveMessagesToDb = useCallback(
    async (
      dbId: string,
      userMsg: { content: string },
      assistantMsg: { content: string; reasoning?: string; modelLabel?: string }
    ) => {
      if (!user || !supabase || !dbId) return;

      try {
        const token = await getAccessToken();
        await fetch(apiUrl(`/api/conversations/${dbId}/messages`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: userMsg.content },
              {
                role: 'assistant',
                content: assistantMsg.content,
                reasoning: assistantMsg.reasoning,
                modelLabel: assistantMsg.modelLabel,
              },
            ],
          }),
        });
      } catch {
        /* silent */
      }
    },
    [user, getAccessToken]
  );

  const handleNewChat = useCallback(() => {
    if (tempChat) setTempChat(null);

    const active = conversations.find((c) => c.id === activeId);
    if (active && !isStartedConversation(active)) return;

    setConversations((prev) => {
      const draft = prev.find((c) => !isStartedConversation(c)) || createDraftConversation();
      setActiveId(draft.id);
      return withSingleDraft(prev, draft);
    });
    setSelectedModel(DEFAULT_MODELS[0].id);
  }, [activeId, conversations, tempChat]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveId(id);
    setTempChat(null);
  }, []);

  const handleTempChat = useCallback(() => {
    setTempChat({
      id: createId(),
      title: 'Temporary chat',
      messages: [],
      isTemp: true,
    });
    setSelectedModel(DEFAULT_MODELS[0].id);
  }, []);

  const handleDeleteChat = useCallback(
    async (id: string) => {
      const conv = conversations.find((c) => c.id === id);

      if (conv?.dbId && user) {
        try {
          const token = await getAccessToken();
          await fetch(apiUrl(`/api/conversations/${conv.dbId}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          /* continue */
        }
      }

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        const started = filtered.filter(isStartedConversation);
        if (started.length === 0) {
          const draft = createDraftConversation();
          setActiveId(draft.id);
          return [draft];
        }
        if (id === activeId) setActiveId(started[0].id);
        const draft = filtered.find((c) => !isStartedConversation(c));
        return draft ? [draft, ...started] : withSingleDraft(started);
      });
    },
    [activeId, conversations, user, getAccessToken]
  );

  const handleRenameChat = useCallback(
    (id: string, newTitle: string) => {
      updateConversation(id, () => ({ title: newTitle }));
      const conv = conversations.find((c) => c.id === id);
      if (conv?.dbId && user) {
        getAccessToken().then((token) => {
          fetch(apiUrl(`/api/conversations/${conv.dbId}`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: newTitle }),
          }).catch(() => {});
        });
      }
    },
    [conversations, updateConversation, user, getAccessToken]
  );

  const handlePinChat = useCallback(
    (id: string) => {
      const conv = conversations.find((c) => c.id === id);
      const newPinned = !conv?.pinned;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned: newPinned } : c))
      );
      if (conv?.dbId && user) {
        getAccessToken().then((token) => {
          fetch(apiUrl(`/api/conversations/${conv.dbId}`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ pinned: newPinned }),
          }).catch(() => {});
        });
      }
    },
    [conversations, user, getAccessToken]
  );

  const handleStop = useCallback(() => {
    if (!abortControllerRef.current) return;
    stopRequestedRef.current = true;
    abortControllerRef.current.abort();
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !activeConversation) return;

      if (!user && supabase && guestMessageCount >= FREE_MESSAGE_LIMIT) {
        setShowAuth(true);
        return;
      }

      const userMessage = { role: 'user' as const, content: content.trim() };
      const apiMessages = [...activeConversation.messages, userMessage]
        .filter((m) => m.content?.trim())
        .map(({ role, content: text }) => ({ role, content: text.trim() }));

      const isTemp = Boolean(tempChat);
      const currentActiveId = activeId;

      if (isTemp) {
        setTempChat((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, userMessage, { role: 'assistant', content: '' }],
              }
            : null
        );
      } else {
        const newTitle =
          activeConversation.messages.length === 0
            ? content.trim().slice(0, 40) + (content.length > 40 ? '…' : '')
            : undefined;

        updateConversation(activeId, (c) => ({
          title: newTitle || c.title,
          messages: [...c.messages, userMessage, { role: 'assistant', content: '' }],
        }));
      }

      setIsLoading(true);

      const updateActiveMessages = (updater: (c: Conversation) => Partial<Conversation>) => {
        if (isTemp) {
          setTempChat((prev) => (prev ? { ...prev, ...updater(prev) } : null));
        } else {
          updateConversation(currentActiveId, updater);
        }
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let finalContent = '';
      let finalReasoning = '';
      let finalModelLabel = '';

      try {
        const token = await getAccessToken();
        const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) fetchHeaders.Authorization = `Bearer ${token}`;

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

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming not supported');

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
                  msgs[msgs.length - 1] = {
                    ...prev,
                    statusHint,
                    modelLabel: parsed.modelLabel || prev.modelLabel,
                  };
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
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }

        finalContent = accumulated;
        finalReasoning = reasoningAccum;

        if (!user && supabase) {
          setGuestMessageCount((prev) => prev + 1);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError' && stopRequestedRef.current) {
          updateActiveMessages((c) => {
            const msgs = [...c.messages];
            const prev = msgs[msgs.length - 1];
            if (prev?.role === 'assistant') {
              if (!prev.content?.trim() && !prev.reasoning?.trim()) {
                msgs.pop();
              } else {
                msgs[msgs.length - 1] = { ...prev, statusHint: undefined };
              }
            }
            return { messages: msgs };
          });
        } else {
          const message =
            error instanceof Error && error.name === 'AbortError'
              ? 'Request timed out. Pro model can be slow — try again or use Flash.'
              : error instanceof Error
                ? error.message
                : 'Something went wrong';
          updateActiveMessages((c) => {
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { role: 'assistant', content: `Error: ${message}`, isError: true };
            return { messages: msgs };
          });
        }
      } finally {
        clearTimeout(timeoutId);
        const wasStopped = stopRequestedRef.current;
        stopRequestedRef.current = false;
        abortControllerRef.current = null;
        setIsLoading(false);

        if (!isTemp && finalContent && user && !wasStopped) {
          const conv =
            conversations.find((c) => c.id === currentActiveId) ||
            ({
              id: currentActiveId,
              title: content.trim().slice(0, 40),
              messages: [],
            } as Conversation);
          const dbId = await saveConversationToDb(conv);
          if (dbId) {
            await saveMessagesToDb(dbId, userMessage, {
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
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ title: newTitle }),
                });
              } catch {
                /* silent */
              }
            }
          }
        }
      }
    },
    [
      activeConversation,
      activeId,
      conversations,
      getAccessToken,
      guestMessageCount,
      isLoading,
      saveConversationToDb,
      saveMessagesToDb,
      selectedModel,
      tempChat,
      updateConversation,
      user,
    ]
  );

  const handleSignOut = useCallback(() => {
    conversationsLoadedForUserRef.current = null;
    const draft = createDraftConversation();
    setConversations([draft]);
    setActiveId(draft.id);
    setTempChat(null);
  }, []);

  return {
    user,
    activeConversation,
    sidebarConversations,
    isEmpty,
    isLoading,
    isTempChat: Boolean(tempChat),
    models: DEFAULT_MODELS,
    selectedModel,
    setSelectedModel,
    showAuth,
    setShowAuth,
    handleNewChat,
    handleSelectChat,
    handleTempChat,
    handleDeleteChat,
    handleRenameChat,
    handlePinChat,
    handleSend,
    handleStop,
    handleSignOut,
  };
}
