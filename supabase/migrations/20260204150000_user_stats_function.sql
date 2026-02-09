-- ============================================================================
-- FUNCIÓN: ESTADÍSTICAS DINÁMICAS DE USUARIO
-- ============================================================================
-- Calcula KPIs en tiempo real basados en los eventos del usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  completed BIGINT,
  failed BIGINT,
  moved BIGINT,
  current_streak INT,
  best_streak INT,
  completion_rate NUMERIC,
  avg_daily NUMERIC,
  favorite_category TEXT,
  distribution JSONB,
  total_tasks BIGINT,
  pending_tasks BIGINT
) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  week_ago DATE := today_date - INTERVAL '7 days';
BEGIN
  -- Total de tareas
  SELECT COUNT(*) INTO total_tasks
  FROM calendar_events
  WHERE user_id = p_user_id;
  
  -- Tareas completadas
  SELECT COUNT(*) INTO completed
  FROM calendar_events
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Tareas fallidas
  SELECT COUNT(*) INTO failed
  FROM# Plan de Conexión de KPIs Dinámicos 📈

Este plan detalla los pasos para conectar la pantalla de estadísticas (`StatsScreen.tsx`) con los datos reales procesados en el backend de Supabase y expuestos a través del `CalendarContext`.

## Cambios Propuestos

### [Componente] [StatsScreen.tsx](file:///Users/franciscoriquelmehernandez/Desktop/planifai-bilingüe (1)/components/StatsScreen.tsx)

#### [MODIFY] StatsScreen.tsx
- **Integración de Estado:** Usar el objeto `stats` proveniente de `useCalendar()`.
- **Mapeo de Datos:**
  - **Racha Actual:** Reemplazar `15` con `stats?.current_streak`.
  - **Progreso de Racha:** Usar `stats?.current_streak` y un objetivo dinámico (ej. `stats?.best_streak + 5`).
  - **Tasa de Completitud:** Reemplazar `88%` con `stats?.completion_rate`.
  - **Actividad Semanal:** Mapear `stats?.daily_stats` al gráfico de barras `ActivityChart`.
  - **Distribución:** Mapear `stats?.category_distribution` al gráfico de pastel `DistributionChart`.
  - **Total Tareas:** Reemplazar `142` con `stats?.total_tasks`.
- **Formateo de Tiempo:** Convertir los minutos/horas reales de `stats` para visualización (Tiempo ahorrado, Eficiencia).
- **Reactividad:** Asegurar que los gráficos se actualicen cuando `stats` cambie (ya manejado por el context).

## Plan de Verificación

### Pruebas Manuales
1. Entrar a la pestaña de Estadísticas.
2. Comprobar que los números coinciden con la realidad del usuario (si no hay tareas, mostrar estados vacíos o 0).
3. Completar una tarea en el calendario.
4. Volver a Estadísticas y verificar que los números (racha, total) se han actualizado.
ion_date - (ROW_NUMBER() OVER (ORDER BY completion_date DESC))::int as grp
    FROM daily_completions
  ),
  consecutive_groups AS (
    SELECT grp, COUNT(*) as streak_length
    FROM ranked_dates
    GROUP BY grp
    ORDER BY MIN(completion_date) DESC
  )
  SELECT COALESCE(MAX(CASE 
    WHEN EXISTS (
      SELECT 1 FROM daily_completions WHERE completion_date = today_date
    ) THEN streak_length 
    ELSE 0 
  END), 0)
  INTO current_streak
  FROM consecutive_groups
  LIMIT 1;
  
  -- Best streak (racha histórica más larga)
  WITH daily_completions AS (
    SELECT DISTINCT DATE(end_time) as completion_date
    FROM calendar_events
    WHERE user_id = p_user_id 
      AND status = 'completed'
      AND end_time IS NOT NULL
  ),
  ranked_dates AS (
    SELECT 
      completion_date,
      completion_date - (ROW_NUMBER() OVER (ORDER BY completion_date))::int as grp
    FROM daily_completions
  ),
  consecutive_groups AS (
    SELECT COUNT(*) as streak_length
    FROM ranked_dates
    GROUP BY grp
  )
  SELECT COALESCE(MAX(streak_length), 0)
  INTO best_streak
  FROM consecutive_groups;
  
  -- Completion rate (última semana)
  WITH week_tasks AS (
    SELECT 
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC as comp,
      COUNT(*)::NUMERIC as total
    FROM calendar_events
    WHERE user_id = p_user_id 
      AND end_time >= week_ago
      AND end_time <= NOW()
      AND status IN ('completed', 'failed', 'scheduled')
  )
  SELECT COALESCE((comp / NULLIF(total, 0) * 100), 0)
  INTO completion_rate
  FROM week_tasks;
  
  -- Average daily (última semana)
  SELECT COALESCE(COUNT(*)::NUMERIC / 7.0, 0) 
  INTO avg_daily
  FROM calendar_events
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND end_time >= week_ago
    AND end_time <= NOW();
  
  -- Favorite category (más usada en tareas completadas)
  SELECT COALESCE(category_label, 'N/A') 
  INTO favorite_category
  FROM calendar_events
  WHERE user_id = p_user_id AND status = 'completed'
  GROUP BY category_label
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Distribution (por categoría)
  SELECT COALESCE(
    jsonb_object_agg(category_label, count),
    '{}'::jsonb
  )
  INTO distribution
  FROM (
    SELECT 
      COALESCE(category_label, 'Sin categoría') as category_label, 
      COUNT(*) as count
    FROM calendar_events
    WHERE user_id = p_user_id AND status = 'completed'
    GROUP BY category_label
    ORDER BY count DESC
    LIMIT 10
  ) sub;
  
  RETURN QUERY SELECT 
    COALESCE(completed, 0)::BIGINT,
    COALESCE(failed, 0)::BIGINT,
    COALESCE(moved, 0)::BIGINT,
    COALESCE(current_streak, 0)::INT,
    COALESCE(best_streak, 0)::INT,
    COALESCE(ROUND(completion_rate, 1), 0),
    COALESCE(ROUND(avg_daily, 1), 0),
    COALESCE(favorite_category, 'N/A'),
    COALESCE(distribution, '{}'::jsonb),
    COALESCE(total_tasks, 0)::BIGINT,
    COALESCE(pending_tasks, 0)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_stats(UUID) IS 
  'Calcula estadísticas en tiempo real para un usuario: tareas completadas, fallidas, rachas, tasa de completitud, etc.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para probar:
-- SELECT * FROM get_user_stats('tu-user-id-aqui');
-- ============================================================================
