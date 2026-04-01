-- ============================================================================
-- SkillBridge Database Schema
-- Version: 1.0
-- Description: Complete database schema with all constraints and indexes
-- ============================================================================

DROP TABLE IF EXISTS UserBadge CASCADE;
DROP TABLE IF EXISTS Review CASCADE;
DROP TABLE IF EXISTS VideoCall CASCADE;
DROP TABLE IF EXISTS Message CASCADE;
DROP TABLE IF EXISTS Session CASCADE;
DROP TABLE IF EXISTS Connection CASCADE;
DROP TABLE IF EXISTS UserSkill CASCADE;
DROP TABLE IF EXISTS Badge CASCADE;
DROP TABLE IF EXISTS Skill CASCADE;
DROP TABLE IF EXISTS User CASCADE;

-- User Table (Strong Entity)
CREATE TABLE User (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    profile_picture VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    experience TEXT,
    availability VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- Constraints
    CONSTRAINT chk_user_role CHECK (role IN ('user', 'mentor')),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Skill Table (Strong Entity)
CREATE TABLE Skill (
    skill_id SERIAL PRIMARY KEY,
    skill_name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Badge Table (Strong Entity)
CREATE TABLE Badge (
    badge_id SERIAL PRIMARY KEY,
    badge_name VARCHAR(100) NOT NULL UNIQUE,
    badge_type VARCHAR(50) NOT NULL,
    description TEXT,
    criteria_sessions INT NOT NULL DEFAULT 0,
    criteria_rating DECIMAL(3,2),
    icon_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_badge_type CHECK (badge_type IN ('New', 'Trusted', 'Top')),
    CONSTRAINT chk_criteria_rating CHECK (criteria_rating IS NULL OR (criteria_rating >= 1.0 AND criteria_rating <= 5.0))
);

-- Connection Table (Strong Entity - represents user relationships)
CREATE TABLE Connection (
    connection_id SERIAL PRIMARY KEY,
    requester_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_connection_requester FOREIGN KEY (requester_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_connection_receiver FOREIGN KEY (receiver_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT,
    
    -- Constraints
    CONSTRAINT chk_connection_status CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    CONSTRAINT chk_connection_different_users CHECK (requester_id != receiver_id),
    );

CREATE OR REPLACE FUNCTION check_session_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Connection c
        WHERE c.connection_id = NEW.connection_id
        AND (
            (c.requester_id = NEW.user1_id AND c.receiver_id = NEW.user2_id) OR
            (c.requester_id = NEW.user2_id AND c.receiver_id = NEW.user1_id)
        )
    ) THEN
        RAISE EXCEPTION 'Session participants must match connection participants';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- WEAK ENTITIES
-- ============================================================================

-- UserSkill Table (Weak Entity - depends on User and Skill)
CREATE TABLE UserSkill (
    user_skill_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    proficiency_level VARCHAR(50),
    years_experience DECIMAL(4,1),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_userskill_user FOREIGN KEY (user_id) 
        REFERENCES "User"(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_userskill_skill FOREIGN KEY (skill_id) 
        REFERENCES Skill(skill_id) ON DELETE RESTRICT,
    
    -- Constraints
    CONSTRAINT chk_proficiency_level CHECK (
        proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')
    ),

    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

-- Session Table (Weak Entity - depends on Connection)
CREATE TABLE Session (
    session_id SERIAL PRIMARY KEY,
    connection_id INT NOT NULL,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    skill_id INT,  -- NULLABLE - sessions can be general conversation
    session_status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_session_connection FOREIGN KEY (connection_id) 
        REFERENCES Connection(connection_id) ON DELETE CASCADE,
    CONSTRAINT fk_session_user1 FOREIGN KEY (user1_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_session_user2 FOREIGN KEY (user2_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_session_skill FOREIGN KEY (skill_id) 
        REFERENCES Skill(skill_id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_session_status CHECK (session_status IN ('active', 'archived', 'closed')),
    CONSTRAINT chk_session_different_users CHECK (user1_id != user2_id),
    CONSTRAINT uq_session_connection UNIQUE (connection_id)
);


CREATE TRIGGER trg_check_session_participants
BEFORE INSERT OR UPDATE ON Session
FOR EACH ROW
EXECUTE FUNCTION check_session_participants();

-- Message Table (Weak Entity - depends on Session)
CREATE TABLE Message (
    message_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_message_session FOREIGN KEY (session_id) 
        REFERENCES Session(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT,
    
    -- Constraints
    CONSTRAINT chk_message_type CHECK (message_type IN ('text', 'system')),
    CONSTRAINT chk_message_not_empty CHECK (TRIM(message_text) != '')
);

-- Validate sender is participant of session
CREATE OR REPLACE FUNCTION check_message_sender()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Session s
        WHERE s.session_id = NEW.session_id
        AND (s.user1_id = NEW.sender_id OR s.user2_id = NEW.sender_id)
    ) THEN
        RAISE EXCEPTION 'Message sender must be a participant of the session';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_message_sender
BEFORE INSERT ON Message
FOR EACH ROW
EXECUTE FUNCTION check_message_sender();

-- VideoCall Table (Weak Entity - depends on Session)
CREATE TABLE VideoCall (
    video_call_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    mentor_user_id INT NOT NULL,
    topic TEXT,  -- NULLABLE - optional description of what was discussed
    meeting_url VARCHAR(500),
    jitsi_room_id VARCHAR(255),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_videocall_session FOREIGN KEY (session_id) 
        REFERENCES Session(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_videocall_mentor FOREIGN KEY (mentor_user_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT
);



-- Validate mentor is participant of session
CREATE OR REPLACE FUNCTION check_videocall_mentor()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Session s
        WHERE s.session_id = NEW.session_id
        AND (s.user1_id = NEW.mentor_user_id OR s.user2_id = NEW.mentor_user_id)
    ) THEN
        RAISE EXCEPTION 'Video call mentor must be a participant of the session';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_videocall_mentor
BEFORE INSERT OR UPDATE ON VideoCall
FOR EACH ROW
EXECUTE FUNCTION check_videocall_mentor();

-- Review Table (Weak Entity - depends on VideoCall)
CREATE TABLE Review (
    review_id SERIAL PRIMARY KEY,
    video_call_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,
    rating INT NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_review_videocall FOREIGN KEY (video_call_id) 
        REFERENCES VideoCall(video_call_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_review_reviewee FOREIGN KEY (reviewee_id) 
        REFERENCES "User"(user_id) ON DELETE RESTRICT
);

-- Validate reviewer is NOT the mentor and reviewee IS the mentor
CREATE OR REPLACE FUNCTION check_review_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Check that reviewee is the mentor of the video call
    IF NOT EXISTS (
        SELECT 1 FROM VideoCall vc
        WHERE vc.video_call_id = NEW.video_call_id
        AND vc.mentor_user_id = NEW.reviewee_id
    ) THEN
        RAISE EXCEPTION 'Reviewee must be the mentor of the video call';
    END IF;
    
    -- Check that reviewer is NOT the mentor (i.e., is the other participant)
    IF EXISTS (
        SELECT 1 FROM VideoCall vc
        WHERE vc.video_call_id = NEW.video_call_id
        AND vc.mentor_user_id = NEW.reviewer_id
    ) THEN
        RAISE EXCEPTION 'Reviewer cannot be the mentor of the video call';
    END IF;
    
    -- Check that reviewer is a participant of the session
    IF NOT EXISTS (
        SELECT 1 FROM VideoCall vc
        JOIN Session s ON vc.session_id = s.session_id
        WHERE vc.video_call_id = NEW.video_call_id
        AND (s.user1_id = NEW.reviewer_id OR s.user2_id = NEW.reviewer_id)
    ) THEN
        RAISE EXCEPTION 'Reviewer must be a participant of the session';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_review_participants
BEFORE INSERT OR UPDATE ON Review
FOR EACH ROW
EXECUTE FUNCTION check_review_participants();

-- UserBadge Table (Weak Entity - depends on User and Badge)
CREATE TABLE UserBadge (
    user_badge_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Foreign Keys
    CONSTRAINT fk_userbadge_user FOREIGN KEY (user_id) 
        REFERENCES "User"(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_userbadge_badge FOREIGN KEY (badge_id) 
        REFERENCES Badge(badge_id) ON DELETE RESTRICT
);

-- View: Active connections with user details
CREATE OR REPLACE VIEW v_active_connections AS
SELECT 
    c.connection_id,
    c.requester_id,
    u1.name AS requester_name,
    u1.email AS requester_email,
    c.receiver_id,
    u2.name AS receiver_name,
    u2.email AS receiver_email,
    c.status,
    c.requested_at,
    c.responded_at
FROM Connection c
JOIN "User" u1 ON c.requester_id = u1.user_id
JOIN "User" u2 ON c.receiver_id = u2.user_id
WHERE c.status IN ('accepted', 'pending');

-- View: Mentor statistics
CREATE OR REPLACE VIEW v_mentor_stats AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.role,
    COUNT(DISTINCT vc.video_call_id) AS total_sessions_as_mentor,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(DISTINCT r.review_id) AS total_reviews,
    MAX(vc.end_time) AS last_session_date
FROM "User" u
LEFT JOIN VideoCall vc ON u.user_id = vc.mentor_user_id AND vc.status = 'ended'
LEFT JOIN Review r ON vc.video_call_id = r.video_call_id
WHERE u.deleted_at IS NULL
GROUP BY u.user_id, u.name, u.email, u.role;

-- View: User session participation
CREATE OR REPLACE VIEW v_user_session_stats AS
SELECT 
    u.user_id,
    u.name,
    COUNT(DISTINCT s.session_id) AS total_sessions,
    COUNT(DISTINCT CASE WHEN vc.mentor_user_id = u.user_id THEN vc.video_call_id END) AS sessions_as_mentor,
    COUNT(DISTINCT CASE WHEN vc.mentor_user_id != u.user_id THEN vc.video_call_id END) AS sessions_as_mentee,
    COALESCE(SUM(vc.duration_minutes), 0) AS total_minutes
FROM "User" u
LEFT JOIN Session s ON u.user_id IN (s.user1_id, s.user2_id)
LEFT JOIN VideoCall vc ON s.session_id = vc.session_id AND vc.status = 'ended'
WHERE u.deleted_at IS NULL
GROUP BY u.user_id, u.name;


-- Insert default badges
INSERT INTO Badge (badge_name, badge_type, description, criteria_sessions, criteria_rating) VALUES
('New Mentor', 'New', 'Completed your first mentorship session', 1, NULL),
('Trusted Mentor', 'Trusted', 'Completed 10+ sessions with 4.0+ rating', 10, 4.0),
('Top Mentor', 'Top', 'Completed 50+ sessions with 4.5+ rating', 50, 4.5)
ON CONFLICT (badge_name) DO NOTHING;

-- Insert common skills (example)
INSERT INTO Skill (skill_name, category) VALUES
('JavaScript', 'Programming'),
('Python', 'Programming'),
('React', 'Web Development'),
('Node.js', 'Backend Development'),
('SQL', 'Database'),
('Machine Learning', 'Data Science'),
('UI/UX Design', 'Design'),
('Project Management', 'Management')
ON CONFLICT (skill_name) DO NOTHING;
