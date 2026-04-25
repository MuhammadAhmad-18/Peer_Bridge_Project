-- ================================================
-- Peer Bridge – Migration v2
-- Run once against an existing peer_bridge database
-- ================================================
USE peer_bridge;

-- Add moderation columns to posts
ALTER TABLE posts
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Add moderation columns to users
ALTER TABLE users
  ADD COLUMN is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN is_under_review BOOLEAN NOT NULL DEFAULT FALSE;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  target_type ENUM('post','user','resource') NOT NULL,
  target_id   INT NOT NULL,
  reason      ENUM('Spam','Harassment','Inappropriate','Misinformation') NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY  unique_report (reporter_id, target_type, target_id),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_target (target_type, target_id)
);

-- Remove the admin seed user (if present)
DELETE FROM users WHERE email = 'admin@nust.edu.pk' AND role = 'admin';
