import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Message.css';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Message({ message, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const canCopy = Boolean(message.content?.trim()) && !isStreaming;

  const handleCopy = async () => {
    if (!canCopy) return;

    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${message.isError ? 'error' : ''}`}>
      <div className="message-avatar" aria-hidden={!isUser}>
        {isUser ? 'You' : ''}
      </div>
      <div className="message-content">
        {canCopy && (
          <button
            type="button"
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : isUser ? 'Copy question' : 'Copy response'}
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied && <span className="copy-label">Copied</span>}
          </button>
        )}

        {message.fallbackNotice && (
          <div className="fallback-notice" role="status">
            {message.fallbackNotice}
          </div>
        )}

        {!isUser && message.statusHint && !message.content && !message.reasoning && (
          <p className="status-hint">{message.statusHint}</p>
        )}

        {!isUser && message.reasoning && (
          <details className="reasoning-block" open={isStreaming}>
            <summary>Reasoning</summary>
            <ReactMarkdown>{message.reasoning}</ReactMarkdown>
          </details>
        )}

        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <>
            {isStreaming && !message.content && message.reasoning && (
              <p className="thinking-hint">Thinking…</p>
            )}
            <ReactMarkdown>{message.content || (isStreaming && !message.reasoning ? '▍' : '')}</ReactMarkdown>
            {isStreaming && message.content && <span className="cursor-blink">▍</span>}
          </>
        )}
      </div>
    </div>
  );
}
