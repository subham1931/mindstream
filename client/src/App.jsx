import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { apiUrl } from './api';
import './App.css';

function createId() {
  return crypto.randomUUID();
}

export default function App() {
  const [conversations, setConversations] = useState([
    { id: createId(), title: 'New conversation', messages: [] },
  ]);
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeId);

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
    setSidebarOpen(false);
  };

  const handleSelectChat = (id) => {
    setActiveId(id);
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
    const apiMessages = [...activeConversation.messages, userMessage];

    updateConversation(activeId, (c) => ({
      title:
        c.messages.length === 0
          ? content.trim().slice(0, 40) + (content.length > 40 ? '…' : '')
          : c.title,
      messages: [...c.messages, userMessage, { role: 'assistant', content: '' }],
    }));

    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

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
            if (parsed.content) {
              accumulated += parsed.content;
              updateConversation(activeId, (c) => {
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = { role: 'assistant', content: accumulated };
                return { messages: msgs };
              });
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    } catch (error) {
      updateConversation(activeId, (c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: `Error: ${error.message}`,
          isError: true,
        };
        return { messages: msgs };
      });
    } finally {
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
        onDelete={handleDeleteChat}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatArea
        conversation={activeConversation}
        isLoading={isLoading}
        onSend={handleSend}
        onToggleSidebar={() => setSidebarOpen(true)}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
