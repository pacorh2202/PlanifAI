-- ============================================================================
-- SOLUCIÓN NUCLEAR: RESET COMPLETO DE RLS EN CALENDAR_EVENTS
-- ============================================================================
-- Esta migración elimina TODO el RLS complejo y lo reemplaza con políticas
-- ultra-simples que NO pueden causar recursión.
-- ============================================================================

-- Paso 1: DESACTIVAR RLS temporalmente para poder trabajar
ALTER TABLE public.calendar_events DISABLE ROW LEVEL SECURITY;

-- Paso 2: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES (sin importar el nombre)
-- Usamos un bloque DO para iterar y eliminar dinámicamente
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'calendar_events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events', pol.policyname);
        RAISE NOTICE 'Eliminada política: %', pol.policyname;
    END LOOP;
END $$;

-- Paso 3: RECREAR POLÍTICAS SIMPLES (SIN RECURSIÓN)
-- Solo políticas básicas que NO hacen referencia a otras tablas

-- Política 1: Leer propios eventos
CREATE POLICY "read_own_events"
  ON public.calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON POLICY "read_own_events" ON public.calendar_events IS
  'Permite a los usuarios ver solo sus propios eventos. Sin recursión.';

-- Política 2: Crear propios eventos
CREATE POLICY "insert_own_events"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "insert_own_events" ON public.calendar_events IS
  'Permite a los usuarios crear eventos donde ellos son el propietario.';

-- Política 3: Actualizar propios eventos
CREATE POLICY "update_own_events"
  ON public.calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "update_own_events" ON public.calendar_events IS
  'Permite a los usuarios actualizar solo sus propios eventos.';

-- Política 4: Eliminar propios eventos
CREATE POLICY "delete_own_events"
  ON public.calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "delete_own_events" ON public.calendar_events IS
  'Permite a los usuarios eliminar solo sus propios eventos.';

-- Paso 4: REACTIVAR RLS con las nuevas políticas simples
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICACIÓN MANUAL
-- ============================================================================
-- Ejecuta estas consultas para verificar que las políticas fueron creadas:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'calendar_events';
-- 
-- Deberías ver exactamente 4 políticas:
-- - read_own_events
-- - insert_own_events  
-- - update_own_events
-- - delete_own_events
-- ============================================================================

-- ============================================================================
-- LIMITACIONES TEMPORALES
-- ============================================================================
-- ⚠️ Esta migración DESACTIVA temporalmente la funcionalidad de eventos compartidos.
-- Los usuarios SOLO podrán ver sus propios eventos.
-- 
-- Esto es un TRADE-OFF necesario para desbloquear el sistema AHORA.
-- La funcionalidad de eventos compartidos se reimplementará después usando:
-- - Lógica a nivel de aplicación (fetching manual)
-- - O vistas materializadas
-- - O join tables sin RLS recursivo
-- ============================================================================
