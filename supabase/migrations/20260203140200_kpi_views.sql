-- PlanifAI KPI Views and Functions
-- Optimized queries for analytics and statistics

-- ============================================================================
-- MATERIALIZED VIEW: User KPI Statistics
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_kpi_stats AS
SELECT 
  ce.user_id,
  
  -- Count metrics
  COUNT(*) FILTER (WHERE ce.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE ce.status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE ce.status = 'moved') AS moved,
  
  -- Event type distribution
  jsonb_build_object(
    'work', COUNT(*) FILTER (WHERE ce.event_type = 'work'),
    'study', COUNT(*) FILTER (WHERE ce.event_type = 'study'),
    'health', COUNT(*) FILTER (WHERE ce.event_type = 'health'),
    'personal', COUNT(*) FILTER (WHERE ce.event_type = 'personal'),
    'leisure', COUNT(*) FILTER (WHERE ce.event_type = 'leisure'),
    'other', COUNT(*) FILTER (WHERE ce.event_type = 'other')
  ) AS distribution,
  
  NOW() AS last_calculated_at
  
FROM public.calendar_events ce
GROUP BY ce.user_id;

-- Create unique index on user_id for faster refreshes
CREATE UNIQUE INDEX idx_user_kpi_stats_user_id ON public.user_kpi_stats(user_id);

-- ============================================================================
-- FUNCTION: Calculate User Streak
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_streak(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_completion BOOLEAN;
BEGIN
  -- Check each day going backwards from today
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE user_id = user_uuid
        AND status = 'completed'
        AND DATE(start_time) = check_date
    ) INTO has_completion;
    
    -- If no completion on this day, break the streak
    IF NOT has_completion THEN
      EXIT;
    END IF;
    
    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';
    
    -- Safety limit: don't check more than 365 days
    IF current_streak >= 365 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get User KPI Stats with Streak
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_kpi_stats(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  streak_count INTEGER;
BEGIN
  -- Get cached stats from materialized view
  SELECT jsonb_build_object(
    'completed', COALESCE(completed, 0),
    'failed', COALESCE(failed, 0),
    'moved', COALESCE(moved, 0),
    'distribution', COALESCE(distribution, '{"work": 0, "study": 0, "health": 0, "personal": 0, "leisure": 0, "other": 0}')
  ) INTO stats
  FROM public.user_kpi_stats
  WHERE user_id = user_uuid;
  
  -- If no cached stats, return defaults
  IF stats IS NULL THEN
    stats := jsonb_build_object(
      'completed', 0,
      'failed', 0,
      'moved', 0,
      'distribution', '{"work": 0, "study": 0, "health": 0, "personal": 0, "leisure": 0, "other": 0}'
    );
  END IF;
  
  -- Calculate current streak (not cached, always fresh)
  streak_count := calculate_user_streak(user_uuid);
  
  -- Add streak to stats
  stats := stats || jsonb_build_object('streak', streak_count);
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Refresh User KPI Cache
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_user_kpi_cache(user_uuid UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF user_uuid IS NULL THEN
    -- Refresh all users
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_kpi_stats;
  ELSE
    -- Refresh specific user by rebuilding the view
    -- (materialized views don't support partial refresh easily)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_kpi_stats;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Auto-refresh KPI cache on event changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_kpi_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidate cache for the affected user
  -- In production, this could queue a background job instead of immediate refresh
  PERFORM refresh_user_kpi_cache(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT/UPDATE/DELETE of events
CREATE TRIGGER refresh_kpi_on_event_change
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_kpi_cache();

-- ============================================================================
-- RPC FUNCTION: Client-callable KPI stats
-- ============================================================================

-- This function can be called directly from the frontend
CREATE OR REPLACE FUNCTION rpc_get_kpi_stats()
RETURNS JSONB AS $$
BEGIN
  RETURN get_user_kpi_stats(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION rpc_get_kpi_stats() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON MATERIALIZED VIEW public.user_kpi_stats IS 'Cached KPI statistics per user for performance';
COMMENT ON FUNCTION calculate_user_streak IS 'Calculate consecutive days with completed events';
COMMENT ON FUNCTION get_user_kpi_stats IS 'Get complete KPI stats including streak for a user';
COMMENT ON FUNCTION refresh_user_kpi_cache IS 'Refresh materialized view for KPI cache';
COMMENT ON FUNCTION rpc_get_kpi_stats IS 'RPC endpoint for frontend to fetch KPI stats';
