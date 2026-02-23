-- ============================================================================
-- NUEVOS TIPOS DE NOTIFICACIONES
-- ============================================================================
-- Agrega tipos: friend_accepted (conexión aceptada) y event_reminder (recordatorio)
-- ============================================================================

-- 1. Actualizar constraint de tipo en tabla notifications
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('event_shared', 'friend_request', 'friend_accepted', 'event_reminder'));

-- ============================================================================
-- TRIGGER: Notificación cuando se acepta solicitud de amistad
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_friendship_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Solo notificar cuando el status cambia a 'accepted'
  IF NEW.status != 'accepted' OR (OLD.status IS NOT NULL AND OLD.status = 'accepted') THEN
    RETURN NEW;
  END IF;

  -- Obtener nombre del usuario que aceptó
  SELECT user_name INTO accepter_name
  FROM public.profiles
  WHERE id = NEW.user_id_2;

  -- Si no se encontró el perfil, usar placeholder
  IF accepter_name IS NULL THEN
    accepter_name := 'Un usuario';
  END IF;

  -- Crear notificación para el usuario que envió la solicitud (user_id_1)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    is_read
  ) VALUES (
    NEW.user_id_1,
    'friend_accepted',
    'Nueva conexión',
    accepter_name || ' aceptó tu solicitud de amistad',
    jsonb_build_object(
      'friendId', NEW.user_id_2,
      'friendshipId', NEW.id
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS on_friendship_accepted ON public.friends;

CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION notify_friendship_accepted();

COMMENT ON FUNCTION notify_friendship_accepted() IS 
  'Crea notificación cuando un usuario acepta una solicitud de amistad';

-- ============================================================================
-- FUNCIÓN: Crear recordatorios de eventos cercanos
-- ============================================================================

CREATE OR REPLACE FUNCTION create_event_reminders()
RETURNS void AS $$
DECLARE
  event_record RECORD;
  participant_record RECORD;
BEGIN
  -- Buscar eventos que empiezan en aproximadamente 1 hora
  -- (entre 50 y 70 minutos desde ahora)
  FOR event_record IN
    SELECT id, title, start_time, user_id
    FROM public.calendar_events
    WHERE start_time BETWEEN (NOW() + INTERVAL '50 minutes') AND (NOW() + INTERVAL '70 minutes')
      AND status = 'scheduled'
  LOOP
    -- Crear recordatorio para el creador del evento
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
      'Recordatorio',
      event_record.title || ' en 1 hora',
      jsonb_build_object('eventId', event_record.id),
      false
    )
    ON CONFLICT DO NOTHING; -- Evitar duplicados

    -- Crear recordatorios para todos los participantes aceptados
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
        'Recordatorio',
        event_record.title || ' en 1 hora',
        jsonb_build_object('eventId', event_record.id),
        false
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_event_reminders() IS 
  'Crea recordatorios para eventos que empiezan en ~1 hora. Debe ejecutarse con pg_cron cada hora.';

-- ============================================================================
-- CONFIGURAR CRON JOB (Requiere extensión pg_cron habilitada en Supabase)
-- ============================================================================
-- NOTA: pg_cron solo está disponible en planes Pro o superiores de Supabase
-- Si no tienes acceso, puedes ejecutar esta función manualmente o desde el cliente

-- Habilitar extensión pg_cron (solo si está disponible)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar función para ejecutarse cada hora
-- SELECT cron.schedule(
--   'create-event-reminders',
--   '0 * * * *', -- Cada hora en el minuto 0
--   'SELECT create_event_reminders();'
-- );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para probar manualmente los recordatorios:
-- SELECT create_event_reminders();
-- SELECT * FROM notifications WHERE type = 'event_reminder';
-- ============================================================================
