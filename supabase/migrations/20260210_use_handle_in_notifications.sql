-- ============================================================================
-- PRIVACY UPDATE: USE HANDLES IN NOTIFICATIONS
-- ============================================================================
-- This script updates the notification trigger to use the user's handle (@username)
-- instead of their real name (user_name) when sending notifications to others.
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_event_participant()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
BEGIN
  -- Solo notificar si el status es 'invited'
  IF NEW.status != 'invited' THEN
    RETURN NEW;
  END IF;

  -- Obtener información detallada del evento y del creador
  SELECT 
    ce.id,
    ce.title,
    ce.user_id,
    ce.event_type,
    ce.category_label,
    ce.start_time,
    ce.end_time,
    p.handle -- Changed from user_name to handle
  INTO 
    event_record
  FROM public.calendar_events ce
  JOIN public.profiles p ON p.id = ce.user_id
  WHERE ce.id = NEW.event_id;
  
  -- Si no se encontró el evento, salir
  IF event_record.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Crear notificación para el participante invitado
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
    -- Construct message using handle with @ prefix
    '@' || event_record.handle || ' te ha invitado a esta tarea', 
    jsonb_build_object(
      'eventId', event_record.id,
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
