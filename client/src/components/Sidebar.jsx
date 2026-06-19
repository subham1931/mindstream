import './Sidebar.css';

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

export default function Sidebar({ conversations, activeId, isOpen, onSelect, onNewChat, onTempChat, onDelete, onClose, activeModelLabel, isTempActive }) {
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
          <div className="sidebar-actions">
            <button className="new-chat-btn" onClick={onNewChat}>
              <PlusIcon />
              <span>New chat</span>
            </button>
            <button className={`temp-chat-btn ${isTempActive ? 'active' : ''}`} onClick={onTempChat} title="Temporary chat — not saved to history">
              <IncognitoIcon />
              <span>Temp chat</span>
            </button>
          </div>
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
            <span>{activeModelLabel || 'DeepSeek V4 Flash'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
