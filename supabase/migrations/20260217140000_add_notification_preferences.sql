-- Migration: Add notification preferences to profiles
-- Description: Adds columns for detailed notification settings, quiet hours, timezone, and state tracking.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "enabled": true,
  "event_reminders": true,
  "event_now": false,
  "social": true,
  "motivation": true,
  "daily_summary": false,
  "daily_summary_time": "09:00"
}',
ADD COLUMN IF NOT EXISTS quiet_hours JSONB DEFAULT '{
  "enabled": false,
  "start": "22:00",
  "end": "08:00"
}',
ADD COLUMN IF NOT EXISTS notification_state JSONB DEFAULT '{
  "last_styles": {}, 
  "inactivity_sent_at": null,
  "daily_summary_sent_at": null
}';

-- Comment on columns for clarity
COMMENT ON COLUMN profiles.timezone IS 'User timezone string (e.g., "Europe/Madrid") for local time calculations';
COMMENT ON COLUMN profiles.notification_preferences IS 'JSON object storing user toggles for different notification types';
COMMENT ON COLUMN profiles.quiet_hours IS 'JSON object defining user quiet hours (start/end times)';
COMMENT ON COLUMN profiles.notification_state IS 'JSON object for internal state: last used copy styles, last sent timestamps';
