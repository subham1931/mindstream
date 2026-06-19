import { useState, useRef, useEffect, useCallback } from 'react';
import './ChatInput.css';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function BrainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4C9.5 4 8 5.5 7 7.5C5.5 7 4 8 3.5 9.5C3 11 3.5 12.5 4.5 13.5C4 15 4.5 16.5 6 17.5C6 19.5 7.5 21 10 21C10.5 21 11 20.8 11.5 20.5C12 21 13 21.5 14 21.5C16.5 21.5 18 20 18.5 18C20 17.5 21 16 21 14.5C21.5 13.5 21.5 12 21 11C21.5 9.5 21 8 19.5 7C19 5 17 4 14.5 4C13.5 4 12.5 4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l2.5-2.5a5 5 0 0 0-7.07-7.07l-1.27 1.27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-2.5 2.5a5 5 0 0 0 7.07 7.07l1.27-1.27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
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

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const VOICE_ERRORS = {
  'not-allowed': 'Microphone access denied. Allow mic permission in browser settings.',
  'no-speech': 'No speech detected. Try again.',
  'network': 'Voice input needs an internet connection.',
  'aborted': '',
};

export default function ChatInput({ onSend, isLoading, showGreeting }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef('');

  const speechSupported = Boolean(SpeechRecognition);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || isLoading) return;

    stopListening();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    voiceBaseRef.current = input;
    let sessionFinal = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          sessionFinal += text;
        } else {
          interim += text;
        }
      }

      const base = voiceBaseRef.current;
      const spoken = (sessionFinal + interim).trim();
      const combined = base && spoken ? `${base} ${spoken}` : base || spoken;
      setInput(combined);
      setVoiceError('');
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setVoiceError(VOICE_ERRORS[event.error] || 'Voice input failed. Try again.');
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setVoiceError('');
    } catch {
      setVoiceError('Could not start voice input.');
    }
  }, [input, isLoading, stopListening]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    stopListening();
    onSend(input);
    setInput('');
    voiceBaseRef.current = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e) => {
    if (isListening) stopListening();
    setInput(e.target.value);
    setVoiceError('');
  };

  const handleActionClick = () => {
    if (isLoading) return;
    if (hasText) {
      handleSubmit();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const hasText = input.trim().length > 0;

  const actionTitle = isLoading
    ? 'Sending...'
    : hasText
      ? 'Send message'
      : isListening
        ? 'Stop listening'
        : speechSupported
          ? 'Start voice input'
          : 'Voice not supported in this browser';

  const actionDisabled = isLoading || (!hasText && !isListening && !speechSupported);

  return (
    <div className="chat-input-wrapper">
      {showGreeting && (
        <div className="input-greeting">
          <div className="input-greeting-avatar" aria-hidden="true" />
          <p>Hey there! I'm here to help with anything you need</p>
        </div>
      )}

      <div className={`chat-input-container ${isListening ? 'is-listening' : ''}`}>
        {isListening && (
          <div className="voice-status" role="status">
            <span className="voice-pulse" />
            Listening… tap mic to stop
          </div>
        )}

        {voiceError && (
          <div className="voice-error" role="alert">
            {voiceError}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Speak now…' : 'Ask me anything...'}
          rows={1}
          disabled={isLoading}
        />

        <div className="input-toolbar">
          <div className="toolbar-left">
            <button type="button" className="toolbar-icon-btn toolbar-extra" title="Thinking mode" aria-label="Thinking mode">
              <BrainIcon />
            </button>
            <button type="button" className="toolbar-icon-btn toolbar-extra" title="Add link" aria-label="Add link">
              <LinkIcon />
            </button>
            <button type="button" className="model-selector" title="Select model" aria-label="Select model">
              <span className="model-icon">
                <LightningIcon />
              </span>
              <span className="model-label">DeepSeek V4</span>
              <ChevronDownIcon />
            </button>
          </div>

          <div className="toolbar-right">
            <button type="button" className="toolbar-icon-btn" title="Attach file" aria-label="Attach file">
              <FolderIcon />
            </button>
            <button
              type="button"
              className={`action-btn ${isListening ? 'listening' : ''}`}
              onClick={handleActionClick}
              disabled={actionDisabled}
              title={actionTitle}
              aria-label={actionTitle}
              aria-pressed={isListening}
            >
              {isLoading ? (
                <span className="spinner" />
              ) : hasText ? (
                <SendIcon />
              ) : (
                <MicIcon />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
