import { useRef, useEffect, useState, useCallback } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import './ChatArea.css';

const SCROLL_THRESHOLD = 100;

function IncognitoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4C9 4 6.5 5.5 5 8h14c-1.5-2.5-4-4-7-4zM3 10h18M5 12c0 2.5 1.5 4.5 3.5 5.5M19 12c0 2.5-1.5 4.5-3.5 5.5M8.5 17.5a2.5 2.5 0 1 0 0 .01M15.5 17.5a2.5 2.5 0 1 0 0 .01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ChatArea({ conversation, isLoading, onSend, onStop, onToggleSidebar, onNewChat, onTempChat, models, selectedModel, onModelChange, isTempChat }) {
  const scrollRef = useRef(null);
  const isPinnedRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messages = conversation?.messages || [];
  const isEmpty = messages.length === 0;

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    if (behavior === 'smooth') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const pinned = isNearBottom();
    isPinnedRef.current = pinned;
    setShowScrollBtn(!pinned);
  }, [isNearBottom]);

  const handleScrollToBottom = useCallback(() => {
    isPinnedRef.current = true;
    setShowScrollBtn(false);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  const handleSend = useCallback(
    (content) => {
      isPinnedRef.current = true;
      setShowScrollBtn(false);
      onSend(content);
    },
    [onSend]
  );

  useEffect(() => {
    isPinnedRef.current = true;
    setShowScrollBtn(false);
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [conversation?.id, scrollToBottom]);

  useEffect(() => {
    if (!isPinnedRef.current) return;
    scrollToBottom(isLoading ? 'auto' : 'smooth');
  }, [messages, isLoading, scrollToBottom]);

  return (
    <main className={`chat-area ${isEmpty ? 'chat-area--empty' : ''}`}>
      {!isTempChat && (
        <div className="chat-top-bar">
          <button
            className="temp-chat-btn"
            onClick={onTempChat}
            title="Temporary chat — not saved to history"
            aria-label="Temporary chat"
          >
            <IncognitoIcon />
          </button>
        </div>
      )}
      {isTempChat && (
        <div className="temp-chat-banner" role="status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4C9 4 6.5 5.5 5 8h14c-1.5-2.5-4-4-7-4zM3 10h18M5 12c0 2.5 1.5 4.5 3.5 5.5M19 12c0 2.5-1.5 4.5-3.5 5.5M8.5 17.5a2.5 2.5 0 1 0 0 .01M15.5 17.5a2.5 2.5 0 1 0 0 .01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Temporary chat — this conversation won't be saved</span>
        </div>
      )}
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
        <div className="mobile-header-actions">
          {!isTempChat && (
            <button
              className="temp-chat-btn temp-chat-btn--mobile"
              onClick={onTempChat}
              title="Temporary chat — not saved to history"
              aria-label="Temporary chat"
            >
              <IncognitoIcon />
            </button>
          )}
          <button className="icon-btn" onClick={onNewChat} aria-label="New chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          </button>
        </div>
      </header>

      {isEmpty ? (
        <div className="chat-empty-stage">
          <ChatInput
            onSend={handleSend}
            onStop={onStop}
            isLoading={isLoading}
            showGreeting
            models={models}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
          />
        </div>
      ) : (
        <>
          <div className="chat-scroll-container">
            <div className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>
              <div className="messages">
                <div className="messages-inner">
                  {messages.map((msg, i) => (
                    <Message
                      key={i}
                      message={msg}
                      isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
                    />
                  ))}
                </div>
              </div>
            </div>

            {showScrollBtn && (
              <button
                className="scroll-to-bottom"
                onClick={handleScrollToBottom}
                aria-label="Scroll to latest message"
                title="Scroll to bottom"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="chat-input-slot">
            <ChatInput
              onSend={handleSend}
              onStop={onStop}
              isLoading={isLoading}
              showGreeting={false}
              models={models}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
          </div>
        </>
      )}
    </main>
  );
}
