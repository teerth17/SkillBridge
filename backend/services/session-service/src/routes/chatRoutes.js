// src/routes/chatRoutes.js
import express from 'express';
import { getMessagesForSession, postMessageForSession } from '../controllers/chatController.js';
import { authenticateExpress } from '../utils/jwtUtils.js'; // express auth helper (below)

const router = express.Router({ mergeParams: true });

// GET /sessions/:id/messages
router.get('/:id/messages', authenticateExpress, (req, res) => {
  const sessionId = req.params.id;
  const limit = parseInt(req.query.limit || '200', 10);
  const messages = getMessagesForSession(req.app.locals.sessionsStore, sessionId, limit);
  res.json({ sessionId, messages });
});

// POST /sessions/:id/messages  (optional fallback/future moderation)
router.post('/:id/messages', authenticateExpress, (req, res) => {
  const sessionId = req.params.id;
  const { text, messageType } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const msg = postMessageForSession(req.app.locals.sessionsStore, sessionId, req.user.id, text, messageType);
  // Broadcast if Socket.IO available
  const io = req.app.locals.io;
  if (io) io.to(sessionId).emit('message', msg);

  res.status(201).json({ success:true, message: msg });
});

export default router;
