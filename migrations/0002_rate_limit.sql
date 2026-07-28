-- Add rate limiting columns to profiles
ALTER TABLE profiles ADD COLUMN login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN locked_until INTEGER DEFAULT 0;
