// src/controllers/chatController.js
export const getMessagesForSession = (sessionsStore, sessionId, limit = 200) => {
  const meta = sessionsStore.get(sessionId);
  if (!meta) return [];
  const messages = meta.messages || [];
  // return latest messages up to limit
  return messages.slice(-limit);
};

export const postMessageForSession = (sessionsStore, sessionId, senderId, text, messageType = 'text') => {
  if (!sessionsStore.has(sessionId)) {
    sessionsStore.set(sessionId, { messages: [], participants: new Set() });
  }
  const meta = sessionsStore.get(sessionId);
  const msg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
    sessionId,
    senderId,
    text,
    messageType,
    isRead: false,
    sentAt: new Date().toISOString()
  };
  meta.messages.push(msg);
  return msg;
};
