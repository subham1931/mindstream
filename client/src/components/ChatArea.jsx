import { useRef, useEffect, useState, useCallback } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import './ChatArea.css';

const SCROLL_THRESHOLD = 100;

export default function ChatArea({ conversation, isLoading, onSend, onToggleSidebar, onNewChat }) {
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

      <div className="chat-scroll-container">
        <div className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>
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
              </div>
            </div>
          )}
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
        <ChatInput onSend={handleSend} isLoading={isLoading} showGreeting={isEmpty} />
      </div>
    </main>
  );
}
