-- ============================================================================
-- FIX DEFINITIVO: RLS EN EVENT_PARTICIPANTS
-- ============================================================================
-- El error 42P17 persiste porque event_participants TAMBIÉN tiene recursión.
-- Esta migración elimina TODAS las políticas de event_participants y las 
-- reemplaza con políticas ultra-simples SIN recursión.
-- ============================================================================

-- Paso 1: DESACTIVAR RLS temporalmente
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;

-- Paso 2: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'event_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.event_participants', pol.policyname);
        RAISE NOTICE 'Eliminada política de event_participants: %', pol.policyname;
    END LOOP;
END $$;

-- Paso 3: RECREAR POLÍTICAS SIMPLES
-- Políticas que NO hacen referencia a calendar_events u otras tablas complejas

-- Los usuarios pueden ver sus propias participaciones
CREATE POLICY "read_own_participations"
  ON public.event_participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden ser añadidos como participantes (para invitaciones)
-- Permitir INSERT sin verificación compleja
CREATE POLICY "allow_insert_participants"
  ON public.event_participants
  FOR INSERT
  WITH CHECK (true);  -- Cualquiera puede insertar (la lógica se maneja en app)

-- Los usuarios pueden actualizar su propio estado de participación
CREATE POLICY "update_own_participation_status"
  ON public.event_participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar su propia participación
CREATE POLICY "delete_own_participation"
  ON public.event_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Paso 4: REACTIVAR RLS
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- Esta solución:
-- ✅ Permite INSERT sin restricciones (para invitaciones)
-- ✅ Permite a usuarios ver sus propias participaciones
-- ✅ Permite actualizar/eliminar solo sus propias participaciones
-- ⚠️ NO verifica permisos complejos a nivel RLS
--
-- La seguridad adicional (ej: solo owner puede invitar) debe manejarse en:
-- - Código de aplicación (src/lib/calendar-api.ts)
-- - O mediante triggers AFTER INSERT (no políticas RLS)
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Consultas de prueba:
-- SELECT * FROM event_participants WHERE user_id = auth.uid();
-- INSERT INTO event_participants (event_id, user_id, role, status) VALUES (...);
-- 
-- Ambas deben funcionar SIN error 42P17
-- ============================================================================
