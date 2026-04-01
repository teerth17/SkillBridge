import crypto from 'crypto';

const INTERNAL_JITSI_URL = process.env.JITSI_INTERNAL_URL || 'https://jitsi-web:8443';
const PUBLIC_JITSI_URL = process.env.JITSI_PUBLIC_URL || 'https://localhost:8443';


console.log(process.env.JITSI_BASE_URL);

// In-memory store for prototype (later replace with DB)
const sessions = new Map();

export const createSession = (req, res) => {
  try {
    const { mentorId, userId } = req.body;
    if (!mentorId || !userId) {
      return res.status(400).json({ error: 'mentorId and userId are required' });
    }

    const sessionId = crypto.randomUUID();
    const roomName = `session_${mentorId}_${Date.now()}`;

    const meetingUrl = `${PUBLIC_JITSI_URL}/${roomName}`;

    const session = {
      id: sessionId,
      mentorId,
      userId,
      roomName,
      meetingUrl,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    sessions.set(sessionId, session);

    return res.status(201).json({
      message: 'Session created successfully',
      session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessionById = (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  return res.json(session);
};
