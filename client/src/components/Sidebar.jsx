import './Sidebar.css';

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h4a8 8 0 0 1 4 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({ conversations, activeId, isOpen, onSelect, onNewChat, onDelete, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-panel">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-avatar" aria-hidden="true" />
            <span className="logo-text">MindStream</span>
            <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
              ×
            </button>
          </div>
          <button className="new-chat-btn" onClick={onNewChat}>
            <PlusIcon />
            <span>New chat</span>
          </button>
        </div>

        <div className="sidebar-section">
          <span className="section-label">Chats</span>
          <div className="conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${conv.id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(conv.id)}
              >
                <span className="conversation-icon">
                  <ChatIcon />
                </span>
                <span className="conversation-title">{conv.title}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="model-badge">
            <span className="model-icon">
              <LightningIcon />
            </span>
            <span>DeepSeek V4 Pro</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
