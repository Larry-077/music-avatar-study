-- Migration: Add user information and submission tracking
-- Date: 2026-02-20
-- Description: Adds user_name, submitted, and submitted_at fields to sessions table

-- Add new columns to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_name ON sessions(user_name);
CREATE INDEX IF NOT EXISTS idx_sessions_submitted ON sessions(submitted);

-- Add comments for documentation
COMMENT ON COLUMN sessions.user_name IS 'User name collected at session start via UserInfoForm';
COMMENT ON COLUMN sessions.submitted IS 'Whether user clicked the final "Submit My Mappings" button';
COMMENT ON COLUMN sessions.submitted_at IS 'Timestamp when user submitted their final mappings';

-- Verify migration
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name IN ('user_name', 'submitted', 'submitted_at');
