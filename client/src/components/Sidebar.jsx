import { useState, useRef, useEffect } from 'react';
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

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 17v5M9 3h6l-1 7h3l-5 7-5-7h3l-1-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ConversationItem({ conv, isActive, onSelect, onDelete, onRename, onPin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conv.title);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', close); };
  }, [menuOpen]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== conv.title) {
      onRename(conv.id, trimmed);
    }
    setIsRenaming(false);
  };

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''} ${conv.pinned ? 'pinned' : ''}`}
      onClick={() => !isRenaming && onSelect(conv.id)}
    >
      <span className="conversation-icon">
        {conv.pinned ? <PinIcon /> : <ChatIcon />}
      </span>

      {isRenaming ? (
        <input
          ref={inputRef}
          className="rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') { setRenameValue(conv.title); setIsRenaming(false); }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="conversation-title">{conv.title}</span>
      )}

      <div className="conv-menu-wrap" ref={menuRef}>
        <button
          className="conv-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          aria-label="More options"
        >
          <MoreIcon />
        </button>

        {menuOpen && (
          <div className="conv-menu" role="menu">
            <button
              role="menuitem"
              className="conv-menu-item"
              onClick={(e) => { e.stopPropagation(); onPin(conv.id); setMenuOpen(false); }}
            >
              <PinIcon />
              <span>{conv.pinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button
              role="menuitem"
              className="conv-menu-item"
              onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setRenameValue(conv.title); setMenuOpen(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Rename</span>
            </button>
            <button
              role="menuitem"
              className="conv-menu-item danger"
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); setMenuOpen(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ conversations, activeId, isOpen, onSelect, onNewChat, onTempChat, onDelete, onRename, onPin, onClose, activeModelLabel, isTempActive, user, onSignOut, onShowAuth }) {
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
            {[...conversations].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
                onPin={onPin}
              />
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-section">
              {user.user_metadata?.avatar_url ? (
                <img className="user-avatar-img" src={user.user_metadata.avatar_url} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="user-avatar">{(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase() || 'U'}</div>
              )}
              <div className="user-info">
                <span className="user-name">{user.user_metadata?.full_name || 'User'}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button className="sign-out-btn" onClick={onSignOut} title="Sign out" aria-label="Sign out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="sidebar-auth-btn signin" onClick={() => onShowAuth('signin')}>
                Sign In
              </button>
              <button className="sidebar-auth-btn signup" onClick={() => onShowAuth('signup')}>
                Sign Up
              </button>
            </div>
          )}
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
