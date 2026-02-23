-- ============================================================================
-- MIGRATION: fix_notification_triggers_final_v2
-- PURPOSE: Fix all 4 root causes of missing in-app notifications
-- SAFE: No frontend changes needed. Matches existing type contract exactly.
-- ============================================================================

-- 1. DROP BROKEN OLD TRIGGERS
DROP TRIGGER IF EXISTS on_friend_request_accepted_push ON friends;
DROP TRIGGER IF EXISTS on_event_invite ON event_participants;
DROP TRIGGER IF EXISTS on_event_invite_push ON event_participants;
DROP TRIGGER IF EXISTS on_friend_accepted ON friends;

-- 2. FIX invoke_notification_edge_function (use hardcoded anon key, not request.header)
CREATE OR REPLACE FUNCTION invoke_notification_edge_function(payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT := 'https://ftybizjyqoezsmiqfmun.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eWJpemp5cW9lenNtaXFmbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjE0MTUsImV4cCI6MjA4NTY5NzQxNX0.hzeixBwL7LjySC6nYQZKVmmYfhrOcEtogQIzTHiHKrk';
BEGIN
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Edge function call failed: %', SQLERRM;
END;
$$;

-- 3. EVENT INVITE trigger function (type='event_shared' to match frontend)
CREATE OR REPLACE FUNCTION trigger_notify_event_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_title TEXT;
  v_inviter_name TEXT;
  v_inviter_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_category_label TEXT;
  v_recurrence_id TEXT;
  v_metadata JSONB;
BEGIN
  IF NEW.status = 'invited' THEN
    SELECT title, user_id, start_time, end_time, category_label, recurrence_id
    INTO v_event_title, v_inviter_id, v_start_time, v_end_time, v_category_label, v_recurrence_id
    FROM calendar_events WHERE id = NEW.event_id;

    SELECT COALESCE(NULLIF(handle, ''), user_name, 'Alguien')
    INTO v_inviter_name
    FROM profiles WHERE id = v_inviter_id;

    v_metadata := jsonb_build_object(
      'eventId', NEW.event_id,
      'eventTitle', v_event_title,
      'startTime', v_start_time,
      'endTime', v_end_time,
      'categoryLabel', v_category_label,
      'invitedByName', v_inviter_name
    );

    IF v_recurrence_id IS NOT NULL THEN
      v_metadata := v_metadata || jsonb_build_object('recurrenceId', v_recurrence_id);
    END IF;

    -- STEP 1: ALWAYS create in-app notification
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    VALUES (
      NEW.user_id,
      'event_shared',
      COALESCE(v_event_title, 'Nueva tarea'),
      COALESCE(v_inviter_name, 'Alguien') || ' te invitó a "' || COALESCE(v_event_title, 'una tarea') || '"',
      v_metadata,
      false
    );

    -- STEP 2: TRY push (failure is OK)
    BEGIN
      PERFORM invoke_notification_edge_function(jsonb_build_object(
        'user_id', NEW.user_id,
        'type', 'EVENT_INVITE',
        'entity_data', jsonb_build_object(
          'title', v_event_title,
          'invited_by_name', v_inviter_name,
          'event_id', NEW.event_id
        )
      ));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Push failed for event invite: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. FRIEND ACCEPTED trigger function (type='friend_accepted' to match frontend)
CREATE OR REPLACE FUNCTION trigger_notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accepter_name TEXT;
  v_accepter_image TEXT;
  v_metadata JSONB;
BEGIN
  IF NEW.status = 'friend' AND (OLD.status IS NULL OR OLD.status != 'friend') THEN
    SELECT user_name, profile_image
    INTO v_accepter_name, v_accepter_image
    FROM profiles WHERE id = NEW.friend_id;

    v_metadata := jsonb_build_object(
      'friendName', COALESCE(v_accepter_name, 'Alguien'),
      'friendshipId', NEW.id
    );

    IF v_accepter_image IS NOT NULL THEN
      v_metadata := v_metadata || jsonb_build_object('profileImage', v_accepter_image);
    END IF;

    -- STEP 1: ALWAYS create in-app notification
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    VALUES (
      NEW.user_id,
      'friend_accepted',
      'Solicitud aceptada',
      COALESCE(v_accepter_name, 'Alguien') || ' aceptó tu solicitud de amistad.',
      v_metadata,
      false
    );

    -- STEP 2: TRY push (failure is OK)
    BEGIN
      PERFORM invoke_notification_edge_function(jsonb_build_object(
        'user_id', NEW.user_id,
        'type', 'FRIEND_REQUEST_ACCEPTED',
        'entity_data', jsonb_build_object(
          'name', v_accepter_name,
          'friendship_id', NEW.id
        )
      ));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Push failed for friend accepted: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. ATTACH TRIGGERS
CREATE TRIGGER on_event_invite
  AFTER INSERT ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_event_invite();

CREATE TRIGGER on_friend_accepted
  AFTER UPDATE ON friends
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_friend_accepted();
