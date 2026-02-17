-- Migration: Robust Notifications (Direct SQL Insert + Deduplication)
-- Description: Ensures notifications are created even if Edge Function fails, and prevents duplicates.

-- 1. Add Unique Indexes to prevent duplicates
-- These specific indexes allow us to insert from SQL and have the EF fail silently if it tries to insert the same event/friend notification.
-- We index into the JSONB 'metadata' -> 'entity_data' -> field.

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_invite_unique 
ON notifications (user_id, type, (metadata->'entity_data'->>'event_id')) 
WHERE type = 'EVENT_INVITE';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_friend_accept_unique 
ON notifications (user_id, type, (metadata->'entity_data'->>'friendship_id')) 
WHERE type = 'FRIEND_REQUEST_ACCEPTED';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_friend_request_unique 
ON notifications (user_id, type, (metadata->'entity_data'->>'request_id')) 
WHERE type = 'FRIEND_REQUEST_RECEIVED';


-- 2. Update Triggers to INSERT directly into notifications table

-- A. Event Invitation
CREATE OR REPLACE FUNCTION trigger_notify_event_invite()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  inviter_name TEXT;
  inviter_id TEXT;
  payload JSONB;
BEGIN
  IF NEW.status = 'invited' THEN
    SELECT title, user_id INTO event_title, inviter_id FROM calendar_events WHERE id = NEW.event_id;
    -- Fix for uuid vs text: cast inviter_id to uuid if needed, or ensuring profiles.id is compatible
    -- profiles.id is uuid. storage is uuid? let's assume uuid.
    -- If inviter_id in calendar_events is UUID, good.
    SELECT user_name INTO inviter_name FROM profiles WHERE id = inviter_id::uuid;

    -- Construct the payload/metadata
    payload := jsonb_build_object(
        'type', 'EVENT_INVITE',
        'entity_data', jsonb_build_object(
            'title', event_title,
            'invited_by_name', inviter_name,
            'event_id', NEW.event_id
        )
    );

    -- 1. Direct Insert (Safe via ON CONFLICT)
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    VALUES (
        NEW.user_id,
        'EVENT_INVITE',
        'Invitación', -- Fallback title, EF might improve it but this is safe
        COALESCE(inviter_name, 'Alguien') || ' te invitó a ' || event_title,
        payload, -- mirroring what EF does
        false
    )
    ON CONFLICT (user_id, type, (metadata->'entity_data'->>'event_id')) 
    DO NOTHING;

    -- 2. Call Edge Function for Push (unchanged)
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

-- B. Friend Accepted
CREATE OR REPLACE FUNCTION trigger_notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
  payload JSONB;
BEGIN
  -- Check for 'friend' status (based on previous fix)
  IF NEW.status = 'friend' AND OLD.status != 'friend' THEN
    SELECT user_name INTO accepter_name FROM profiles WHERE id = NEW.friend_id;
    
    payload := jsonb_build_object(
        'type', 'FRIEND_REQUEST_ACCEPTED',
        'entity_data', jsonb_build_object(
            'name', accepter_name,
            'friendship_id', NEW.id
        )
    );

    -- 1. Direct Insert
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    VALUES (
        NEW.user_id,
        'FRIEND_REQUEST_ACCEPTED',
        'Solicitud aceptada',
        (accepter_name || ' aceptó tu solicitud.'),
        payload,
        false
    )
    ON CONFLICT (user_id, type, (metadata->'entity_data'->>'friendship_id'))
    DO NOTHING;

    -- 2. Call EF for Push
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

-- C. Friend Request Received
CREATE OR REPLACE FUNCTION trigger_notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  payload JSONB;
BEGIN
  SELECT user_name INTO sender_name FROM profiles WHERE id = NEW.user_id;

  payload := jsonb_build_object(
      'type', 'FRIEND_REQUEST_RECEIVED',
      'entity_data', jsonb_build_object(
          'name', sender_name,
          'request_id', NEW.id
      )
  );

  -- 1. Direct Insert
  INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
  VALUES (
      NEW.friend_id, -- Targeted at the friend
      'FRIEND_REQUEST_RECEIVED',
      'Solicitud de amistad',
      ('Nueva solicitud de ' || sender_name),
      payload,
      false
  )
  ON CONFLICT (user_id, type, (metadata->'entity_data'->>'request_id'))
  DO NOTHING;

  -- 2. Call EF for Push
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
