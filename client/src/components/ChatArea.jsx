import { useRef, useEffect } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import './ChatArea.css';

export default function ChatArea({ conversation, isLoading, onSend, onToggleSidebar, onNewChat }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const messages = conversation?.messages || [];
  const isEmpty = messages.length === 0;

  return (
    <main className="chat-area">
      <header className="mobile-header">
        <button className="icon-btn" onClick={onToggleSidebar} aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="mobile-header-brand">
          <div className="mobile-header-avatar" aria-hidden="true" />
          <span className="mobile-header-title">MindStream</span>
        </div>
        <button className="icon-btn" onClick={onNewChat} aria-label="New chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="chat-scroll">
        {isEmpty ? (
          <div className="welcome welcome--minimal" />
        ) : (
          <div className="messages">
            <div className="messages-inner">
              {messages.map((msg, i) => (
                <Message
                  key={i}
                  message={msg}
                  isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-slot">
        <ChatInput onSend={onSend} isLoading={isLoading} showGreeting={isEmpty} />
      </div>
    </main>
  );
}
