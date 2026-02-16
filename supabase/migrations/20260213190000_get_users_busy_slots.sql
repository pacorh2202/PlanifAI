-- Create a function to fetch busy slots for a list of users
-- This is strictly for free/busy checks and does not return event titles or details.

CREATE OR REPLACE FUNCTION get_users_busy_slots(
  target_user_ids UUID[],
  search_start TIMESTAMPTZ,
  search_end TIMESTAMPTZ
)
RETURNS TABLE (
  participant_id UUID,
  busy_start TIMESTAMPTZ,
  busy_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to bypass RLS for free/busy check
SET search_path = public
AS $$
BEGIN
  -- Security note: This function bypasses RLS to check availability.
  -- The application logic in the Multi-Agent backend should ensure that 
  -- target_user_ids are friends of the requester before calling this.
  
  RETURN QUERY
  SELECT e.user_id, e.start, e.end
  FROM events e
  WHERE e.user_id = ANY(target_user_ids)
    AND e.start < search_end
    AND e.end > search_start
    AND e.status != 'cancelled'; -- Don't count cancelled events as busy
END;
$$;

-- Add a comment for API documentation
COMMENT ON FUNCTION get_users_busy_slots IS 'Fetches busy time blocks for specified users within a time range. Strictly returns only timing info for privacy.';
