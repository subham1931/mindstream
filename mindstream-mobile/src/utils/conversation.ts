export function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createDraftConversation() {
  return { id: createId(), title: 'New conversation', messages: [], loaded: true };
}

export function isStartedConversation(conv?: { dbId?: string; messages?: { length: number } }) {
  if (!conv) return false;
  if (conv.dbId) return true;
  return (conv.messages?.length ?? 0) > 0;
}

export function withSingleDraft<T extends { dbId?: string; messages?: { length: number } }>(
  conversations: T[],
  draft?: T
) {
  const nextDraft = draft ?? (createDraftConversation() as unknown as T);
  return [nextDraft, ...conversations.filter(isStartedConversation)];
}
