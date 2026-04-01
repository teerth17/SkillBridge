import express from 'express';
import { createSession, getSessionById } from '../controllers/sessionController.js';

const router = express.Router();

// POST /sessions/create
router.post('/create', createSession);

// GET /sessions/:id
router.get('/:id', getSessionById);

export default router;
