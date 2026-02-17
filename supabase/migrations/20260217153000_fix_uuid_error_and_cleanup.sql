-- Migration: Fix UUID type error and cleanup duplicate triggers
-- Description: 
-- 1. Fixes 'operator does not exist: uuid = text' error by typing variables correctly as UUID.
-- 2. Improves inviter name resolution to prioritize handle > user_name > 'Alguien'.
-- 3. Drops old redundant triggers/functions that were replaced by '_push' versions to prevent double notifications.

-- 1. Fix trigger_notify_event_invite_push (Use UUID for IDs)
CREATE OR REPLACE FUNCTION trigger_notify_event_invite_push()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  inviter_name TEXT;
  inviter_id UUID; -- Changed from TEXT to UUID to fix type error
BEGIN
  IF NEW.status = 'invited' THEN
    -- Get event title and owner ID
    SELECT title, user_id INTO event_title, inviter_id FROM calendar_events WHERE id = NEW.event_id;
    
    -- Get sophisticated name for inviter (Handle > Name > 'Alguien')
    SELECT COALESCE(NULLIF(handle, ''), user_name, 'Alguien') INTO inviter_name 
    FROM profiles WHERE id = inviter_id;

    PERFORM invoke_notification_edge_function(jsonb_build_object(
      'user_id', NEW.user_id,
      'type', 'EVENT_INVITE',
      'entity_data', jsonb_build_object(
        'title', event_title,
        'invited_by_name', inviter_name,
        'event_id', NEW.event_id
      )
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Cleanup duplicate triggers/functions (Old versions without _push suffix)

-- Event Invite
DROP TRIGGER IF EXISTS on_participant_invited ON event_participants;
DROP FUNCTION IF EXISTS trigger_notify_event_invite();

-- Event Cancelled
DROP TRIGGER IF EXISTS on_event_cancelled ON calendar_events;
DROP FUNCTION IF EXISTS trigger_notify_event_cancelled();

-- Event Updated
DROP TRIGGER IF EXISTS on_event_updated ON calendar_events;
DROP FUNCTION IF EXISTS trigger_notify_event_updated();

-- Friend Accepted
DROP TRIGGER IF EXISTS on_friend_request_accepted ON friends;
DROP FUNCTION IF EXISTS trigger_notify_friend_accepted();
