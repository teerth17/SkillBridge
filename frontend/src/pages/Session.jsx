import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useNotifications } from "../context/NotificationContext";
import { getSession } from "../api/session";
import { getMessages } from "../api/communication";
import { createVideoCall, endVideoCall, createReview, getCallsForSession } from "../api/videocall";
import toast from "react-hot-toast";

// ── Mentor Selection Modal ─────────────────────────────────────
function MentorSelectModal({ session, currentUserId, onSelect, onCancel, isResponder }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }}>
      <div className="card" style={{ width: 360, textAlign: "center" }}>
        <h3 style={{ marginBottom: 8 }}>Who is the mentor for this call?</h3>
        <p className="text-muted text-sm mb-3">
          {isResponder
            ? "The other participant wants to start a video call. Select who will be the mentor."
            : "Both participants have the same role. Select who will be the mentor for this call."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => onSelect(session.user1_id)}>
            User #{session.user1_id}{session.user1_id === currentUserId ? " (You)" : ""}
          </button>
          <button className="btn btn-primary" onClick={() => onSelect(session.user2_id)}>
            User #{session.user2_id}{session.user2_id === currentUserId ? " (You)" : ""}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Rating Modal ───────────────────────────────────────────────
function RatingModal({ videoCallId, revieweeId, onSubmit, onSkip }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    await onSubmit(videoCallId, revieweeId, rating, feedback);
    setSubmitting(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }}>
      <div className="card" style={{ width: 380 }}>
        <h3 style={{ marginBottom: 8 }}>Rate this session</h3>
        <p className="text-muted text-sm mb-3">How was your experience with User #{revieweeId}?</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} style={{
              fontSize: 36, cursor: "pointer",
              color: star <= (hover || rating) ? "#f59e0b" : "#e4e4e4",
              transition: "color 0.1s",
            }}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
            >★</span>
          ))}
        </div>
        <div className="form-group">
          <label>Feedback (optional)</label>
          <textarea rows={3} placeholder="Share your experience..." value={feedback}
            onChange={(e) => setFeedback(e.target.value)} style={{ resize: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? <span className="spinner" /> : "Submit Rating"}
          </button>
          <button className="btn btn-ghost" onClick={onSkip}>Skip</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Session Page ──────────────────────────────────────────
export default function Session() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();            // ← use global socket
  const { markSessionRead } = useNotifications();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [sending, setSending] = useState(false);

  // Video call state
  const [activeCall, setActiveCall] = useState(null);
  const [callLoading, setCallLoading] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorModalIsResponder, setMentorModalIsResponder] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingCallId, setRatingCallId] = useState(null);
  const [ratingRevieweeId, setRatingRevieweeId] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const activeCallRef = useRef(null);
  const sessionRef = useRef(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const otherUserId = session
    ? session.user1_id === user.userId ? session.user2_id : session.user1_id
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // Load session + messages + active call, then mark as read
  useEffect(() => {
    Promise.all([
      getSession(sessionId),
      getMessages(sessionId, { limit: 50 }),
      getCallsForSession(sessionId),
    ])
      .then(([sessionRes, msgRes, callsRes]) => {
        const s = sessionRes.data.data.session;
        const me = user.userId;
        if (s.user1_id !== me && s.user2_id !== me) {
          toast.error("Access denied");
          navigate("/connections");
          return;
        }
        setSession(s);
        setMessages(msgRes.data.data.messages.reverse());
        const calls = callsRes.data.data.videoCalls;
        const active = calls.find((c) => c.status === "active" || c.status === "pending");
        if (active) setActiveCall(active);

        // Mark messages as read when session is opened
        markSessionRead(Number(sessionId));
      })
      .catch(() => {
        toast.error("Failed to load session");
        navigate("/connections");
      })
      .finally(() => setLoading(false));
  }, [sessionId, user.userId, navigate, markSessionRead]);

  // Socket event listeners — use global socket
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("join_session", { sessionId: Number(sessionId) });
    };

    const handleDisconnect = () => setConnected(false);

    const handleMessage = (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.message_id === msg.message_id)) return prev;
        return [...prev, {
          message_id: msg.messageId || msg.message_id,
          session_id: msg.sessionId || msg.session_id,
          sender_id: msg.senderId || msg.sender_id,
          message_text: msg.messageText || msg.message_text,
          message_type: msg.messageType || msg.message_type || "text",
          is_read: msg.isRead ?? msg.is_read ?? false,
          sent_at: msg.sentAt || msg.sent_at,
        }];
      });
      // Mark as read immediately since user is viewing this session
      markSessionRead(Number(sessionId));
    };

    const handleTyping = ({ userId, isTyping }) => {
      if (userId !== user.userId) setOtherTyping(isTyping);
    };

    const handleVideoCallInitiated = ({ videoCallId, meetingUrl, mentorUserId }) => {
      setActiveCall((prev) => prev || {
        video_call_id: videoCallId,
        meeting_url: meetingUrl,
        mentor_user_id: mentorUserId,
        status: "pending",
      });
      setShowMentorModal(false);
      toast("Video call started — click Join Call to enter", { icon: "📹" });
    };

    const handleMentorSelectionRequested = ({ initiatorId }) => {
      if (initiatorId !== user.userId) {
        setMentorModalIsResponder(true);
        setShowMentorModal(true);
      }
    };

    const handleMentorVote = ({ votedUserId }) => {
      if (votedUserId === user.userId) {
        toast("Waiting for the other participant to select...", { icon: "⏳" });
      }
      setCallLoading(false);
    };

    const handleMentorDisagreement = ({ message }) => {
      toast.error(message);
      setCallLoading(false);
      setShowMentorModal(true);
    };

    const handleReviewRequested = ({ videoCallId }) => {
      const call = activeCallRef.current;
      const mentorId = call?.mentor_user_id;
      if (mentorId && mentorId !== user.userId) {
        setRatingCallId(videoCallId);
        setRatingRevieweeId(mentorId);
        setShowRatingModal(true);
      }
    };

    // If socket already connected, join session immediately
    if (socket.connected) {
      setConnected(true);
      socket.emit("join_session", { sessionId: Number(sessionId) });
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message_received", handleMessage);
    socket.on("user_typing", handleTyping);
    socket.on("video_call_initiated", handleVideoCallInitiated);
    socket.on("mentor_selection_requested", handleMentorSelectionRequested);
    socket.on("mentor_selection_vote", handleMentorVote);
    socket.on("mentor_selection_disagreement", handleMentorDisagreement);
    socket.on("review_requested", handleReviewRequested);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message_received", handleMessage);
      socket.off("user_typing", handleTyping);
      socket.off("video_call_initiated", handleVideoCallInitiated);
      socket.off("mentor_selection_requested", handleMentorSelectionRequested);
      socket.off("mentor_selection_vote", handleMentorVote);
      socket.off("mentor_selection_disagreement", handleMentorDisagreement);
      socket.off("review_requested", handleReviewRequested);
      // Don't disconnect — global socket stays alive
    };
  }, [socket, sessionId, user.userId, markSessionRead]);

  // Send message
  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !socket || !connected) return;
    setSending(true);
    const optimistic = {
      message_id: `temp-${Date.now()}`,
      session_id: Number(sessionId),
      sender_id: user.userId,
      message_text: trimmed,
      message_type: "text",
      sent_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    socket.emit("send_message", { sessionId: Number(sessionId), text: trimmed });
    setSending(false);
  }, [text, connected, sessionId, user.userId, socket]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTypingInput = (e) => {
    setText(e.target.value);
    if (!socket || !connected) return;
    socket.emit("typing", { sessionId: Number(sessionId), isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit("typing", { sessionId: Number(sessionId), isTyping: false });
    }, 1500);
  };

  // Start video call
  const handleStartCallClick = async () => {
    if (!sessionRef.current) return;
    setCallLoading(true);
    try {
      const res = await createVideoCall(Number(sessionId), undefined);
      const call = res.data.data;
      setActiveCall(call);
      window.open(call.meetingUrl, "_blank");
      toast.success("Video call started!");
      setCallLoading(false);
    } catch (err) {
      const msg = err.response?.data?.error?.message || "";
      if (err.response?.status === 400 && msg.toLowerCase().includes("mentoruserid")) {
        socket?.emit("request_mentor_selection", {
          sessionId: Number(sessionId),
          initiatorId: user.userId,
        });
        setMentorModalIsResponder(false);
        setShowMentorModal(true);
        setCallLoading(false);
      } else {
        toast.error(msg || "Failed to start call");
        setCallLoading(false);
      }
    }
  };

  const handleMentorSelect = (mentorUserId) => {
    setShowMentorModal(false);
    setCallLoading(true);
    socket?.emit("submit_mentor_selection", {
      sessionId: Number(sessionId),
      selectedMentorId: mentorUserId,
    });
  };

  const handleJoinCall = () => {
    const url = activeCall?.meeting_url || activeCall?.meetingUrl;
    if (url) window.open(url, "_blank");
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    const callToEnd = activeCall;
    setCallLoading(true);
    try {
      await endVideoCall(callToEnd.video_call_id);
      setActiveCall(null);
      activeCallRef.current = null;
      toast.success("Call ended");
      const isMentor = callToEnd.mentor_user_id === user.userId;
      if (!isMentor) {
        setRatingCallId(callToEnd.video_call_id);
        setRatingRevieweeId(callToEnd.mentor_user_id);
        setShowRatingModal(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to end call");
    } finally {
      setCallLoading(false);
    }
  };

  const handleSubmitRating = async (videoCallId, revieweeId, rating, feedbackText) => {
    try {
      await createReview(videoCallId, revieweeId, rating, feedbackText || undefined);
      toast.success("Rating submitted!");
      setShowRatingModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to submit rating");
    }
  };

  if (loading) return <div className="center-page"><span className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: "16px", height: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>

      {showMentorModal && session && (
        <MentorSelectModal
          session={session}
          currentUserId={user.userId}
          onSelect={handleMentorSelect}
          onCancel={() => setShowMentorModal(false)}
          isResponder={mentorModalIsResponder}
        />
      )}
      {showRatingModal && ratingCallId && (
        <RatingModal
          videoCallId={ratingCallId}
          revieweeId={ratingRevieweeId}
          onSubmit={handleSubmitRating}
          onSkip={() => setShowRatingModal(false)}
        />
      )}

      {/* Header */}
      <div className="card-sm row mb-2" style={{ justifyContent: "space-between", flexShrink: 0 }}>
        <div className="row" style={{ gap: 10 }}>
          <Link to="/chats" style={{ color: "var(--muted)", fontSize: 20 }}>←</Link>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Session #{sessionId}</span>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: connected ? "#22c55e" : "#ef4444", display: "inline-block",
              }} />
              <span className="text-muted text-sm">{connected ? "Connected" : "Disconnected"}</span>
            </div>
            {otherUserId && (
              <Link to={`/profile/${otherUserId}`} className="text-sm" style={{ color: "var(--muted)" }}>
                with User #{otherUserId}
              </Link>
            )}
          </div>
        </div>

        {/* Video call controls */}
        <div className="row" style={{ gap: 8 }}>
          {!activeCall ? (
            <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 13 }}
              onClick={handleStartCallClick} disabled={callLoading}>
              {callLoading ? <span className="spinner" /> : "📹 Start Video Call"}
            </button>
          ) : (
            <>
              <button className="btn btn-primary"
                style={{ padding: "6px 14px", fontSize: 13, background: "#22c55e", border: "none" }}
                onClick={handleJoinCall}>
                Join Call
              </button>
              <button className="btn btn-danger"
                style={{ padding: "6px 14px", fontSize: 13 }}
                onClick={handleEndCall} disabled={callLoading}>
                {callLoading ? <span className="spinner" /> : "End Call"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active call banner */}
      {activeCall && (
        <div style={{
          background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8,
          padding: "8px 14px", marginBottom: 8, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span>📹 Video call is active</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d", fontWeight: 500, fontSize: 13 }}
            onClick={handleJoinCall}>Join →</button>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px", background: "#f9f9f9",
        borderRadius: 10, marginBottom: 10, display: "flex", flexDirection: "column", gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", marginTop: 40, fontSize: 14 }}>
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.userId;
          if (msg.message_type === "system") {
            return (
              <div key={msg.message_id} style={{ textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "var(--muted)", background: "#f3f4f6", padding: "3px 10px", borderRadius: 99 }}>
                  {msg.message_text}
                </span>
              </div>
            );
          }
          return (
            <div key={msg.message_id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%", padding: "8px 12px", borderRadius: 10,
                background: isMe ? "#2563eb" : "#ffffff",
                color: isMe ? "#fff" : "var(--text)",
                border: isMe ? "none" : "1px solid var(--border)",
                opacity: msg._optimistic ? 0.75 : 1, fontSize: 14, lineHeight: 1.5,
              }}>
                <p style={{ margin: 0 }}>{msg.message_text}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: isMe ? "rgba(255,255,255,0.7)" : "var(--muted)", textAlign: "right" }}>
                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "#fff", border: "1px solid var(--border)", fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
              typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="row" style={{ gap: 10, flexShrink: 0 }}>
        <textarea value={text} onChange={handleTypingInput} onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)" rows={1}
          style={{ flex: 1, resize: "none", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 14, fontFamily: "inherit", lineHeight: 1.5 }}
          disabled={!connected} />
        <button className="btn btn-primary" style={{ padding: "10px 18px", flexShrink: 0 }}
          onClick={sendMessage} disabled={!connected || !text.trim() || sending}>
          Send
        </button>
      </div>
      {!connected && (
        <p className="text-center text-sm" style={{ color: "var(--danger)", marginTop: 6 }}>
          Disconnected. Please refresh the page.
        </p>
      )}
    </div>
  );
}