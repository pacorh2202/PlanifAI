-- ============================================================================
-- NOTIFICACIONES AUTOMÁTICAS VIA DATABASE TRIGGER
-- ============================================================================
-- Este trigger crea automáticamente notificaciones cuando un usuario es
-- invitado a un evento, eliminando la necesidad de hacerlo manualmente
-- desde el cliente y respetando las políticas RLS.
-- ============================================================================

-- Función para crear notificación cuando se añade participante a evento
CREATE OR REPLACE FUNCTION notify_event_participant()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  inviter_name TEXT;
  inviter_id UUID;
BEGIN
  -- Solo notificar si el status es 'invited'
  IF NEW.status != 'invited' THEN
    RETURN NEW;
  END IF;

  -- Obtener información del evento y del creador
  SELECT 
    ce.title,
    ce.user_id,
    p.user_name
  INTO 
    event_title,
    inviter_id,
    inviter_name
  FROM public.calendar_events ce
  JOIN public.profiles p ON p.id = ce.user_id
  WHERE ce.id = NEW.event_id;
  
  -- Si no se encontró el evento, salir
  IF event_title IS NULL THEN
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
    'Nueva Invitación 📅',
    inviter_name || ' te ha invitado a "' || event_title || '"',
    jsonb_build_object(
      'eventId', NEW.event_id,
      'role', NEW.role,
      'invitedBy', inviter_id,
      'eventTitle', event_title
    ),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecuta DESPUÉS de insertar en event_participants
DROP TRIGGER IF EXISTS on_event_participant_inserted ON public.event_participants;

CREATE TRIGGER on_event_participant_inserted
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_participant();

-- Agregar comentarios para documentación
COMMENT ON FUNCTION notify_event_participant() IS 
  'Crea automáticamente una notificación cuando un usuario es invitado a un evento. Se ejecuta con SECURITY DEFINER para bypasear RLS y permitir INSERT en notifications.';

COMMENT ON TRIGGER on_event_participant_inserted ON public.event_participants IS 
  'Trigger automático que crea notificaciones para invitaciones a eventos';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para verificar que el trigger funciona:
-- 1. Insertar un participante: INSERT INTO event_participants (event_id, user_id, role, status) VALUES (...)
-- 2. Verificar notificación creada: SELECT * FROM notifications WHERE user_id = [id_participante]
-- ============================================================================
