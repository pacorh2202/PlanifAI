-- Migration: Add notification triggers calling Edge Function
-- Description: Sets up triggers for Events and Social actions to invoke `send-push-notification`.

-- Note: This requires the `pg_net` extension enabled in Supabase.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call Edge Function
CREATE OR REPLACE FUNCTION invoke_notification_edge_function(
  payload JSONB
) RETURNS VOID AS $$
DECLARE
  project_url TEXT := 'https://ftybizjyqoezsmiqfmun.supabase.co'; -- Replace with actual project ref if different
  anon_key TEXT := current_setting('request.header.apikey', true); -- Get current key
BEGIN
  -- Perform async HTTP request
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Friend Request Received
CREATE OR REPLACE FUNCTION trigger_notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT user_name INTO sender_name FROM profiles WHERE id = NEW.user_id;

  PERFORM invoke_notification_edge_function(jsonb_build_object(
    'user_id', NEW.friend_id,
    'type', 'FRIEND_REQUEST_RECEIVED',
    'entity_data', jsonb_build_object(
      'name', sender_name,
      'request_id', NEW.id
    )
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_request_created
AFTER INSERT ON friends
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION trigger_notify_friend_request();

-- 2. Friend Request Accepted
CREATE OR REPLACE FUNCTION trigger_notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    SELECT user_name INTO accepter_name FROM profiles WHERE id = NEW.friend_id; -- The one who updated (accepter)
    
    -- Notify the requester (user_id)
    PERFORM invoke_notification_edge_function(jsonb_build_object(
      'user_id', NEW.user_id,
      'type', 'FRIEND_REQUEST_ACCEPTED',
      'entity_data', jsonb_build_object(
        'name', accepter_name,
        'friendship_id', NEW.id
      )
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_request_accepted
AFTER UPDATE ON friends
FOR EACH ROW
EXECUTE FUNCTION trigger_notify_friend_accepted();

-- 3. Event Invitation (Participant Invited)
CREATE OR REPLACE FUNCTION trigger_notify_event_invite()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  inviter_name TEXT;
  inviter_id TEXT;
BEGIN
  IF NEW.status = 'invited' THEN
    SELECT title, user_id INTO event_title, inviter_id FROM calendar_events WHERE id = NEW.event_id;
    SELECT user_name INTO inviter_name FROM profiles WHERE id = inviter_id;

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

CREATE TRIGGER on_participant_invited
AFTER INSERT ON event_participants
FOR EACH ROW
EXECUTE FUNCTION trigger_notify_event_invite();

-- 4. Event Cancelled (Status changed to cancelled)
CREATE OR REPLACE FUNCTION trigger_notify_event_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id TEXT;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Iterate over all verified/invited participants (except owner if owner cancelled? logic simplistic for now)
    FOR target_user_id IN 
      SELECT user_id FROM event_participants WHERE event_id = NEW.id AND status IN ('accepted', 'invited')
    LOOP
       PERFORM invoke_notification_edge_function(jsonb_build_object(
        'user_id', target_user_id,
        'type', 'EVENT_CANCELLED',
        'entity_data', jsonb_build_object(
          'title', NEW.title,
          'event_id', NEW.id
        )
      ));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_cancelled
AFTER UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION trigger_notify_event_cancelled();

-- 5. Event Updated (Time/Title changed)
-- This is complex because we don't want to spam. Only notify if significant change.
CREATE OR REPLACE FUNCTION trigger_notify_event_updated()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id TEXT;
  new_time_str TEXT;
BEGIN
  IF (NEW.start_time != OLD.start_time OR NEW.title != OLD.title) AND NEW.status != 'cancelled' THEN
    new_time_str := to_char(NEW.start_time, 'HH24:MI DD/MM');
    
    FOR target_user_id IN 
      SELECT user_id FROM event_participants WHERE event_id = NEW.id AND status = 'accepted' -- Only notify accepted participants? Or invited too?
    LOOP
       PERFORM invoke_notification_edge_function(jsonb_build_object(
        'user_id', target_user_id,
        'type', 'EVENT_UPDATED',
        'entity_data', jsonb_build_object(
          'title', NEW.title,
          'new_time', new_time_str,
          'event_id', NEW.id
        )
      ));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_updated
AFTER UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION trigger_notify_event_updated();
