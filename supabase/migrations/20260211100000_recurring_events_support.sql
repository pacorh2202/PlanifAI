-- ============================================================================
-- RECURRING EVENTS SUPPORT
-- ============================================================================
-- 1. Add recurrence_id to identifying grouped events
-- 2. Update notification trigger to prevent spam (one notification per series)
-- 3. Add RPC to accept all events in a series at once
-- ============================================================================

-- 1. Add recurrence_id to calendar_events
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS recurrence_id UUID;

CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence_id ON public.calendar_events(recurrence_id);

-- 2. Update notify_event_participant to handle recurring events
CREATE OR REPLACE FUNCTION notify_event_participant()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  existing_notification_id UUID;
BEGIN
  -- Solo notificar si el status es 'invited'
  IF NEW.status != 'invited' THEN
    RETURN NEW;
  END IF;

  -- Obtener información del evento
  SELECT 
    ce.id,
    ce.title,
    ce.user_id,
    ce.event_type,
    ce.category_label,
    ce.start_time,
    ce.end_time,
    ce.recurrence_id,
    p.handle
  INTO 
    event_record
  FROM public.calendar_events ce
  JOIN public.profiles p ON p.id = ce.user_id
  WHERE ce.id = NEW.event_id;
  
  IF event_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- LOGIC FOR RECURRING EVENTS:
  -- If this event is part of a series (has recurrence_id), check if we already sent 
  -- a notification for this series to this user.
  IF event_record.recurrence_id IS NOT NULL THEN
    SELECT id INTO existing_notification_id
    FROM public.notifications
    WHERE user_id = NEW.user_id
      AND type = 'event_shared'
      AND (metadata->>'recurrenceId')::UUID = event_record.recurrence_id
      AND is_read = false; -- Only consider unread notifications as "active"

    -- If we already notified for this series, DO NOT send another one.
    IF existing_notification_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    is_read
  ) VALUES (
    NEW.user_id,
    'event_shared',
    event_record.title,
    CASE 
      WHEN event_record.recurrence_id IS NOT NULL THEN 
        '@' || event_record.handle || ' te ha invitado a una serie de eventos'
      ELSE 
        '@' || event_record.handle || ' te ha invitado a esta tarea'
    END,
    jsonb_build_object(
      'eventId', event_record.id,
      'recurrenceId', event_record.recurrence_id, -- Make sure this is included
      'role', NEW.role,
      'invitedBy', event_record.user_id,
      'eventTitle', event_record.title,
      'categoryType', event_record.event_type,
      'categoryLabel', event_record.category_label,
      'startTime', event_record.start_time,
      'endTime', event_record.end_time
    ),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC to accept all events in a recurring series
CREATE OR REPLACE FUNCTION accept_recurring_invitation(
  p_recurrence_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update status to 'accepted' for ALL events in this recurrence series 
  -- where the user is a participant
  UPDATE public.event_participants ep
  SET status = 'accepted'
  FROM public.calendar_events ce
  WHERE ep.event_id = ce.id
    AND ce.recurrence_id = p_recurrence_id
    AND ep.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_recurring_invitation(
  p_recurrence_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update status to 'declined' for ALL events in this recurrence series 
  -- where the user is a participant
  UPDATE public.event_participants ep
  SET status = 'declined'
  FROM public.calendar_events ce
  WHERE ep.event_id = ce.id
    AND ce.recurrence_id = p_recurrence_id
    AND ep.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
