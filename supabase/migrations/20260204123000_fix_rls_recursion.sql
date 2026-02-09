-- ============================================================================
-- FIX: RLS INFINITE RECURSION IN CALENDAR_EVENTS
-- ============================================================================
-- Problema: La política "Users can read shared events" causa recursión infinita
-- al verificar event_participants, que referencia calendar_events.id
-- 
-- Solución: Crear función auxiliar con SECURITY DEFINER que bypassea RLS
-- ============================================================================

-- Paso 1: Crear función segura para verificar acceso a eventos compartidos
CREATE OR REPLACE FUNCTION public.user_has_access_to_event(event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_participants
    WHERE event_participants.event_id = $1
      AND event_participants.user_id = auth.uid()
      AND event_participants.status = 'accepted'
  );
$$;

COMMENT ON FUNCTION public.user_has_access_to_event(UUID) IS 
  'Verifica si el usuario actual tiene acceso a un evento compartido. Usa SECURITY DEFINER para evitar recursión RLS.';

-- Paso 2: Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can read shared events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update shared events with editor role" ON public.calendar_events;

-- Paso 3: Recrear políticas SIN recursión usando la función auxiliar
CREATE POLICY "Users can read shared events"
  ON public.calendar_events
  FOR SELECT
  USING (public.user_has_access_to_event(id));

-- Función auxiliar para verificar rol de editor
CREATE OR REPLACE FUNCTION public.user_has_editor_access(event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_participants
    WHERE event_participants.event_id = $1
      AND event_participants.user_id = auth.uid()
      AND event_participants.role IN ('owner', 'editor')
      AND event_participants.status = 'accepted'
  );
$$;

COMMENT ON FUNCTION public.user_has_editor_access(UUID) IS 
  'Verifica si el usuario actual tiene rol de editor en un evento compartido. Usa SECURITY DEFINER para evitar recursión RLS.';

CREATE POLICY "Users can update shared events with editor role"
  ON public.calendar_events
  FOR UPDATE
  USING (public.user_has_editor_access(id));

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Las siguientes consultas deben funcionar sin errores después de aplicar esta migración:
-- 
-- 1. SELECT * FROM calendar_events WHERE user_id = auth.uid();
-- 2. INSERT INTO calendar_events (...) VALUES (...);
-- 3. SELECT * FROM calendar_events WHERE event_id IN (SELECT event_id FROM event_participants WHERE user_id = auth.uid());
--
-- Si alguna falla con "infinite recursion detected", revisar las funciones auxiliares
-- ============================================================================
