import ReactMarkdown from 'react-markdown';
import './Message.css';

export default function Message({ message, isStreaming }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${message.isError ? 'error' : ''}`}>
      <div className="message-avatar" aria-hidden={!isUser}>
        {isUser ? 'You' : ''}
      </div>
      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <>
            <ReactMarkdown>{message.content || (isStreaming ? '▍' : '')}</ReactMarkdown>
            {isStreaming && message.content && <span className="cursor-blink">▍</span>}
          </>
        )}
      </div>
    </div>
  );
}
