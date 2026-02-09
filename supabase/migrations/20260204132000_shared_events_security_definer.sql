-- ============================================================================
-- SOLUCIÓN DEFINITIVA: EVENTOS COMPARTIDOS CON SECURITY DEFINER
-- ============================================================================
-- Esta migración agrega soporte completo para eventos compartidos SIN causar
-- recursión RLS, usando una función SECURITY DEFINER que bypasea las políticas.
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNCIÓN PARA OBTENER TODOS LOS EVENTOS VISIBLES
-- ============================================================================
-- Esta función retorna TODOS los eventos que el usuario actual puede ver:
-- - Sus propios eventos (donde user_id = auth.uid())
-- - Eventos compartidos donde es participante aceptado

CREATE OR REPLACE FUNCTION public.get_user_visible_events()
RETURNS SETOF public.calendar_events
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Eventos propios (soy el creador)
  SELECT DISTINCT ce.*
  FROM public.calendar_events ce
  WHERE ce.user_id = auth.uid()
  
  UNION
  
  -- Eventos compartidos (soy participante aceptado)
  SELECT DISTINCT ce.*
  FROM public.calendar_events ce
  INNER JOIN public.event_participants ep ON ep.event_id = ce.id
  WHERE ep.user_id = auth.uid()
    AND ep.status = 'accepted';
$$;

COMMENT ON FUNCTION public.get_user_visible_events() IS
  'Retorna todos los eventos visibles para el usuario actual: propios y compartidos aceptados. Usa SECURITY DEFINER para evitar recursión RLS.';

-- ============================================================================
-- PARTE 2: FUNCIÓN PARA OBTENER UN EVENTO ESPECÍFICO
-- ============================================================================
-- Esta función retorna un evento específico SOLO si el usuario tiene acceso
-- (es owner o participante aceptado)

CREATE OR REPLACE FUNCTION public.get_event_if_accessible(p_event_id UUID)
RETURNS SETOF public.calendar_events
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ce.*
  FROM public.calendar_events ce
  WHERE ce.id = p_event_id
    AND (
      -- Soy el owner
      ce.user_id = auth.uid()
      OR
      -- Soy participante aceptado
      EXISTS (
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = ce.id
          AND ep.user_id = auth.uid()
          AND ep.status = 'accepted'
      )
    );
$$;

COMMENT ON FUNCTION public.get_event_if_accessible(UUID) IS
  'Retorna un evento específico solo si el usuario actual es owner o participante aceptado. Usa SECURITY DEFINER para evitar recursión RLS.';

-- ============================================================================
-- PARTE 3: PERMISOS
-- ============================================================================
-- Otorgar permisos de ejecución a usuarios autenticados

GRANT EXECUTE ON FUNCTION public.get_user_visible_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_if_accessible(UUID) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para probar estas funciones:
--
-- 1. Obtener todos mis eventos visibles:
--    SELECT * FROM public.get_user_visible_events();
--
-- 2. Obtener un evento específico (si tengo acceso):
--    SELECT * FROM public.get_event_if_accessible('uuid-del-evento');
--
-- Ambas funciones deben retornar resultados SIN errores 42P17
-- ============================================================================

-- ============================================================================
-- NOTAS TÉCNICAS
-- ============================================================================
-- ¿Por qué SECURITY DEFINER evita recursión?
-- 
-- SECURITY DEFINER ejecuta la función con los permisos del CREADOR (postgres)
-- en lugar del INVOCADOR (usuario). Esto significa que:
-- 
-- 1. La función NO está sujeta a políticas RLS del usuario
-- 2. Puede leer todas las tablas libremente
-- 3. La lógica de seguridad está DENTRO de la función (WHERE clauses)
-- 4. NO hay bucles de verificación de políticas
--
-- Es como un "escape hatch" controlado y seguro para queries complejos.
-- ============================================================================
