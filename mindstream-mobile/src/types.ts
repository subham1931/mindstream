export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  modelLabel?: string;
  statusHint?: string;
  fallbackNotice?: string;
  isError?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  pinned?: boolean;
  dbId?: string;
  loaded?: boolean;
  isTemp?: boolean;
};

export type Model = {
  id: string;
  label: string;
  available?: boolean;
};
