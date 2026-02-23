-- ============================================================================
-- ACTUALIZACIÓN DE METADATOS EN NOTIFICACIONES
-- ============================================================================
-- Este script mejora el contenido de las notificaciones incluyendo el título
-- real de la tarea, su categoría y el horario de inicio.
-- ============================================================================

-- 1. Actualizar notify_event_participant para incluir category_label y start_time
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
    p.user_name
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
    event_record.title, -- Título real de la tarea
    event_record.user_name || ' te ha invitado a esta tarea',
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

-- 2. Actualizar create_event_reminders para incluir mas metadata
CREATE OR REPLACE FUNCTION create_event_reminders()
RETURNS void AS $$
DECLARE
  event_record RECORD;
  participant_record RECORD;
BEGIN
  FOR event_record IN
    SELECT id, title, start_time, end_time, user_id, category_label, event_type
    FROM public.calendar_events
    WHERE start_time BETWEEN (NOW() + INTERVAL '50 minutes') AND (NOW() + INTERVAL '70 minutes')
      AND status = 'scheduled'
  LOOP
    -- Crear recordatorio para el creador
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      is_read
    ) VALUES (
      event_record.user_id,
      'event_reminder',
      event_record.title, -- Título real
      'Tu tarea comienza en 1 hora',
      jsonb_build_object(
        'eventId', event_record.id,
        'categoryType', event_record.event_type,
        'categoryLabel', event_record.category_label,
        'startTime', event_record.start_time,
        'endTime', event_record.end_time
      ),
      false
    )
    ON CONFLICT DO NOTHING;

    -- Para participantes
    FOR participant_record IN
      SELECT user_id
      FROM public.event_participants
      WHERE event_id = event_record.id
        AND status = 'accepted'
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        metadata,
        is_read
      ) VALUES (
        participant_record.user_id,
        'event_reminder',
        event_record.title,
        'La tarea comienza en 1 hora',
        jsonb_build_object(
          'eventId', event_record.id,
          'categoryType', event_record.event_type,
          'categoryLabel', event_record.category_label,
          'startTime', event_record.start_time,
          'endTime', event_record.end_time
        ),
        false
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
