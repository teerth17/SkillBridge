Video Call Service (Port 4006) — Implementation Summary
1. Purpose of the Service

The Video Call Service manages synchronous mentoring sessions between two connected users.
It integrates with Jitsi Meet to generate meeting rooms and supports the full lifecycle of a call including:

Creating video calls

Starting and ending calls

Generating meeting URLs

Submitting reviews after the call

Notifying other services about call events

The service ensures that video calls only occur between users who already have a session relationship.

2. Database Entities Used
VideoCall

Represents a scheduled or active video call linked to a session.

Important attributes:

video_call_id

session_id

mentor_user_id

topic

meeting_url

jitsi_room_id

start_time

end_time

duration_minutes

status

Key constraints:

Video call belongs to a Session

mentor_user_id must be a participant in the session

Review

Represents feedback submitted after a completed video call.

Attributes:

review_id

video_call_id

reviewer_id

reviewee_id

rating

feedback_text

created_at

Rules:

Reviews can only be created after the video call ends

A user cannot review themselves

3. Integration with Jitsi

The service integrates with Jitsi Meet for real-time video conferencing.

Room generation logic:

roomId = skillbridge-session-{sessionId}-{timestamp}
meeting_url = JITSI_BASE_URL / roomId

Example:

http://localhost:8000/skillbridge-session-12-1705854457

Configuration:

JITSI_BASE_URL=http://localhost:8000

This allows easy switching to an EC2 hosted Jitsi instance during deployment.

4. Mentor Determination Logic

Because the database requires mentor_user_id, the service determines the mentor using user roles.

Cases handled:

Case 1 — One mentor + one user

Mentor is automatically assigned.

Case 2 — Both users are mentors

The API requires mentorUserId to be provided.

Case 3 — Both users are normal users

The caller must specify mentorUserId.

Validation ensures:

The selected mentor is a session participant.

5. Service Interactions

The Video Call Service interacts with multiple microservices.

Inbound Calls
Frontend

Users initiate and manage video calls.

Endpoints used:

Create call

Start call

End call

Submit review

Communication Service

Handles notifications related to calls.

Examples:

Video call started

Review requested

Outbound Calls
Auth Service (4000)

Used to validate JWT tokens.

Purpose:

Authenticate the user making the request.

Session Service (4002)

Used to verify session membership.

Purpose:

Ensure the caller belongs to the session before creating a call.

Communication Service (4004)

Used for real-time notifications.

Events triggered:

1️⃣ Video call created

POST /communication/internal/sessions/{sessionId}/video-call-created

2️⃣ Request review after call ends

POST /communication/internal/sessions/{sessionId}/request-review
Session Service (promotion trigger)

After a call completes, the Video Call Service notifies the Session Service.

POST /internal/video-calls/{videoCallId}/completed

Purpose:

Promote the mentee to mentor after their first completed mentoring session.

6. Video Call Lifecycle

The lifecycle of a call follows these states:

1. Pending

Call is created and waiting to start.

2. Active

Call is currently ongoing.

3. Completed

Call ended successfully.

4. Cancelled

Call was cancelled before completion.

7. Call Creation Flow

User sends request to create video call.

Service validates JWT via Auth Service.

Service verifies session membership via Session Service.

Mentor is determined based on roles.

Jitsi room ID and meeting URL are generated.

VideoCall record is stored in database.

Communication Service is notified to inform participants.

8. Call Completion Flow

User ends the call.

Service records:

end_time

duration_minutes

status = completed

Communication Service is notified to request reviews.

Session Service is notified to evaluate promotion rules.

9. Review Submission Flow

User submits review after call completion.

Service verifies:

Call exists

Call has ended

Reviewer belongs to the session

Reviewer is not reviewing themselves

Review is stored in the database.

10. Security Measures

The service implements multiple validation layers:

Authentication

JWT validation through Auth Service.

Authorization

Session membership verified through Session Service.

Data Integrity

Database triggers enforce:

Mentor must belong to the session.

Reviews linked to valid video calls.

11. REST API Endpoints
Create Video Call
POST /video-calls
Start Call
PATCH /video-calls/{videoCallId}/start
End Call
PATCH /video-calls/{videoCallId}/end
List Calls for Session
GET /video-calls/sessions/{sessionId}
Create Review
POST /video-calls/{videoCallId}/reviews
List Reviews
GET /video-calls/{videoCallId}/reviews
12. Error Handling

The service uses a centralized error middleware.

Common errors handled:

Invalid session

Unauthorized access

Invalid mentor selection

Video call not found

Review submitted before call completion

13. Deployment Considerations

The service is containerized using Docker and runs alongside other microservices.

Key environment variables:

PORT=4006
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/skillbridge
AUTH_SERVICE_URL=http://user-service:4000
SESSION_SERVICE_URL=http://session-service:4002
COMMUNICATION_SERVICE_URL=http://communication-service:4004
JITSI_BASE_URL=http://localhost:8000
INTERNAL_SERVICE_TOKEN=secret_token
Current System Status
Service	Status
User Service	Completed
Profile Service	Completed
Session Service	Completed
Communication Service	Completed
Video Call Service	Completed
Analytics Service	Not implemented