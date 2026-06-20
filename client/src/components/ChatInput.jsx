import { useState, useRef, useEffect, useCallback } from 'react';
import { apiUrl } from '../api';
import './ChatInput.css';

const VOICE_INPUT_ENABLED = false;

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

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

const VOICE_ERRORS = {
  'not-allowed': 'Microphone access denied. Allow mic permission in browser settings.',
  'no-speech': 'No speech detected. Try again.',
  'network': 'Browser speech service unavailable. Trying server transcription…',
  'aborted': '',
};

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read audio'));
        return;
      }
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('Could not read audio'));
    reader.readAsDataURL(blob);
  });
}

export default function ChatInput({ onSend, onStop, isLoading, showGreeting, models = [], selectedModel, onModelChange }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceMode, setVoiceMode] = useState('browser');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceBaseRef = useRef('');
  const modelWrapRef = useRef(null);
  const [serverTranscriptionAvailable, setServerTranscriptionAvailable] = useState(false);

  const speechSupported = VOICE_INPUT_ENABLED && Boolean(SpeechRecognition);
  const recorderSupported =
    VOICE_INPUT_ENABLED && Boolean(pickRecorderMimeType() && navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (!VOICE_INPUT_ENABLED || !recorderSupported) return;

    fetch(apiUrl('/api/health'))
      .then((res) => res.json())
      .then((data) => {
        setServerTranscriptionAvailable(Boolean(data.transcriptionAvailable));
      })
      .catch(() => {
        setServerTranscriptionAvailable(false);
      });
  }, [recorderSupported]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!modelMenuOpen) return;

    const close = (e) => {
      if (modelWrapRef.current?.contains(e.target)) return;
      setModelMenuOpen(false);
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', close);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', close);
    };
  }, [modelMenuOpen]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      voiceChunksRef.current = [];
    }

    setIsListening(false);
  }, []);

  const transcribeRecording = useCallback(async (blob) => {
    setIsTranscribing(true);
    setVoiceError('');

    try {
      const audio = await blobToBase64(blob);
      const response = await fetch(apiUrl('/api/transcribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, mimeType: blob.type || 'audio/webm' }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed. Try again.');
      }

      const spoken = String(data.text || '').trim();
      if (!spoken) {
        setVoiceError('No speech detected. Try again.');
        return;
      }

      const base = voiceBaseRef.current;
      const combined = base && spoken ? `${base} ${spoken}` : base || spoken;
      setInput(combined);
      setVoiceError('');
    } catch (error) {
      setVoiceError(error.message || 'Transcription failed. Try again.');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startServerRecording = useCallback(async () => {
    if (!recorderSupported || isLoading || isTranscribing) return;

    stopListening();
    voiceBaseRef.current = input;
    voiceChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);

        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        voiceChunksRef.current = [];

        if (!blob.size) {
          setVoiceError('No audio captured. Try again.');
          return;
        }

        await transcribeRecording(blob);
      };

      recorder.onerror = () => {
        setVoiceError('Recording failed. Try again.');
        stopListening();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      setVoiceMode('server');
      setIsListening(true);
      setVoiceError('');
    } catch {
      setVoiceError('Microphone access denied. Allow mic permission in browser settings.');
      setIsListening(false);
    }
  }, [input, isLoading, isTranscribing, recorderSupported, stopListening, transcribeRecording]);

  const startBrowserListening = useCallback(() => {
    if (!SpeechRecognition || isLoading || isTranscribing) return;

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
      if (event.error === 'aborted') return;

      setIsListening(false);
      recognitionRef.current = null;

      if (event.error === 'network' && recorderSupported && serverTranscriptionAvailable) {
        setVoiceError(VOICE_ERRORS.network);
        startServerRecording();
        return;
      }

      setVoiceError(
        event.error === 'network'
          ? 'Browser speech service unavailable. Disable ad blockers/VPN, or add OPENAI_API_KEY to server/.env for server transcription.'
          : VOICE_ERRORS[event.error] || 'Voice input failed. Try again.'
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setVoiceMode('browser');
      setIsListening(true);
      setVoiceError('');
    } catch {
      if (recorderSupported && serverTranscriptionAvailable) {
        startServerRecording();
        return;
      }
      setVoiceError('Could not start voice input.');
    }
  }, [input, isLoading, isTranscribing, recorderSupported, serverTranscriptionAvailable, startServerRecording, stopListening]);

  const startListening = useCallback(() => {
    if (isLoading || isTranscribing) return;

    if (SpeechRecognition) {
      startBrowserListening();
      return;
    }

    if (serverTranscriptionAvailable) {
      startServerRecording();
      return;
    }

    setVoiceError('Voice input is not supported in this browser.');
  }, [isLoading, isTranscribing, serverTranscriptionAvailable, startBrowserListening, startServerRecording]);

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
    if (isTranscribing) return;
    if (isLoading) {
      onStop?.();
      return;
    }
    if (hasText) {
      handleSubmit();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const hasText = input.trim().length > 0;
  const voiceSupported = speechSupported || (recorderSupported && serverTranscriptionAvailable);

  const actionTitle = isLoading
    ? 'Stop generating'
    : isTranscribing
      ? 'Transcribing...'
      : hasText
        ? 'Send message'
        : VOICE_INPUT_ENABLED
          ? isListening
            ? voiceMode === 'server'
              ? 'Stop recording'
              : 'Stop listening'
            : voiceSupported
              ? 'Start voice input'
              : 'Voice not supported in this browser'
          : 'Type a message to send';

  const actionDisabled = isTranscribing
    ? true
    : VOICE_INPUT_ENABLED
      ? !isLoading && !hasText && !isListening && !voiceSupported
      : !isLoading && !hasText;

  const selectedLabel =
    models.find((m) => m.id === selectedModel)?.label || 'Llama 3.3 70B Instruct';

  return (
    <div className="chat-input-wrapper">
      {showGreeting && (
        <div className="input-greeting">
          <div className="input-greeting-avatar" aria-hidden="true" />
          <p>Hey there! I'm here to help with anything you need</p>
        </div>
      )}

      <div className={`chat-input-container ${isListening ? 'is-listening' : ''}`}>
        {VOICE_INPUT_ENABLED && isListening && (
          <div className="voice-status" role="status">
            <span className="voice-pulse" />
            {voiceMode === 'server' ? 'Recording… tap mic to finish' : 'Listening… tap mic to stop'}
          </div>
        )}

        {VOICE_INPUT_ENABLED && isTranscribing && (
          <div className="voice-status" role="status">
            <span className="spinner voice-spinner" />
            Transcribing…
          </div>
        )}

        {VOICE_INPUT_ENABLED && voiceError && (
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
          placeholder={isListening ? (voiceMode === 'server' ? 'Recording…' : 'Speak now…') : 'Ask me anything...'}
          rows={1}
          disabled={isLoading || isTranscribing}
        />

        <div className="input-toolbar">
          <div className="toolbar-left">
            <button type="button" className="toolbar-icon-btn toolbar-extra" title="Thinking mode" aria-label="Thinking mode">
              <BrainIcon />
            </button>
            <div className="model-selector-wrap" ref={modelWrapRef}>
              <button
                type="button"
                className={`model-selector ${modelMenuOpen ? 'open' : ''}`}
                title="Select model"
                aria-label="Select model"
                aria-expanded={modelMenuOpen}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setModelMenuOpen((open) => !open);
                }}
                disabled={isLoading}
              >
                <span className="model-icon">
                  <LightningIcon />
                </span>
                <span className="model-label">{selectedLabel}</span>
                <ChevronDownIcon />
              </button>
              {modelMenuOpen && (
                <div className="model-menu" role="menu">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      role="menuitem"
                      className={`model-menu-item ${model.id === selectedModel ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModelChange?.(model.id);
                        setModelMenuOpen(false);
                      }}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="toolbar-right">
            <button
              type="button"
              className={`action-btn ${isListening ? 'listening' : ''} ${isLoading ? 'stopping' : ''}`}
              onClick={handleActionClick}
              disabled={actionDisabled}
              title={actionTitle}
              aria-label={actionTitle}
              aria-pressed={isListening}
            >
              {isTranscribing ? (
                <span className="spinner" />
              ) : isLoading ? (
                <StopIcon />
              ) : hasText || !VOICE_INPUT_ENABLED ? (
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
