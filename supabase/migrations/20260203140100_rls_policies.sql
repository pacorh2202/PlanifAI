-- PlanifAI Row Level Security Policies
-- Ensures users can only access their own data + shared events

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profiles are created automatically via trigger (no INSERT policy needed for users)

-- Users can read other users' public profile info (for friends)
CREATE POLICY "Users can read public profiles"
  ON public.profiles
  FOR SELECT
  USING (true); -- All profiles are readable (name, avatar, etc.)

-- ============================================================================
-- CALENDAR EVENTS POLICIES
-- ============================================================================

-- Users can read their own events
CREATE POLICY "Users can read own events"
  ON public.calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read events shared with them
CREATE POLICY "Users can read shared events"
  ON public.calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_participants.event_id = calendar_events.id
        AND event_participants.user_id = auth.uid()
        AND event_participants.status = 'accepted'
    )
  );

-- Users can insert their own events
CREATE POLICY "Users can create own events"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update own events"
  ON public.calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can update shared events if they have editor role
CREATE POLICY "Users can update shared events with editor role"
  ON public.calendar_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_participants.event_id = calendar_events.id
        AND event_participants.user_id = auth.uid()
        AND event_participants.role IN ('owner', 'editor')
        AND event_participants.status = 'accepted'
    )
  );

-- Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON public.calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FRIENDS POLICIES
-- ============================================================================

-- Users can read their own friend relationships
CREATE POLICY "Users can read own friendships"
  ON public.friends
  FOR SELECT
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can create friend requests
CREATE POLICY "Users can create friend requests"
  ON public.friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friend status (accept/decline)
CREATE POLICY "Users can update friend status"
  ON public.friends
  FOR UPDATE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can delete friendships
CREATE POLICY "Users can delete friendships"
  ON public.friends
  FOR DELETE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- ============================================================================
-- EVENT PARTICIPANTS POLICIES
-- ============================================================================

-- Users can read participants of their own events
CREATE POLICY "Users can read own event participants"
  ON public.event_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE calendar_events.id = event_participants.event_id
        AND calendar_events.user_id = auth.uid()
    )
  );

-- Users can read participants of events shared with them
CREATE POLICY "Users can read shared event participants"
  ON public.event_participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Event owners can add participants
CREATE POLICY "Event owners can add participants"
  ON public.event_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE calendar_events.id = event_participants.event_id
        AND calendar_events.user_id = auth.uid()
    )
  );

-- Participants can update their own participation status
CREATE POLICY "Participants can update own status"
  ON public.event_participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Event owners can update participants
CREATE POLICY "Event owners can update participants"
  ON public.event_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE calendar_events.id = event_participants.event_id
        AND calendar_events.user_id = auth.uid()
    )
  );

-- Event owners can remove participants
CREATE POLICY "Event owners can remove participants"
  ON public.event_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE calendar_events.id = event_participants.event_id
        AND calendar_events.user_id = auth.uid()
    )
  );

-- Participants can remove themselves
CREATE POLICY "Participants can remove themselves"
  ON public.event_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- System/backend can create notifications (via service role)
-- No INSERT policy for users - notifications created by triggers/functions

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DEVICE TOKENS POLICIES
-- ============================================================================

-- Users can read their own device tokens
CREATE POLICY "Users can read own device tokens"
  ON public.device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can register their own device tokens
CREATE POLICY "Users can create own device tokens"
  ON public.device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own device tokens
CREATE POLICY "Users can update own device tokens"
  ON public.device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own device tokens
CREATE POLICY "Users can delete own device tokens"
  ON public.device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- KPI CACHE POLICIES
-- ============================================================================

-- Users can read their own KPI cache
CREATE POLICY "Users can read own KPI cache"
  ON public.kpi_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- KPI cache updated by backend functions (service role)
-- No INSERT/UPDATE/DELETE policies for users

-- ============================================================================
-- HELPER FUNCTIONS FOR POLICIES
-- ============================================================================

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friends
    WHERE (
      (user_id = user_a AND friend_id = user_b) OR
      (user_id = user_b AND friend_id = user_a)
    )
    AND status = 'friend'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to an event
CREATE OR REPLACE FUNCTION has_event_access(event_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.calendar_events
    WHERE id = event_uuid
    AND (
      user_id = user_uuid OR
      EXISTS (
        SELECT 1 FROM public.event_participants
        WHERE event_id = event_uuid
        AND user_id = user_uuid
        AND status = 'accepted'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Users can read own profile" ON public.profiles IS 'Users can view their own profile data';
COMMENT ON POLICY "Users can read public profiles" ON public.profiles IS 'All users can view basic profile info for friends and sharing';
COMMENT ON POLICY "Users can read own events" ON public.calendar_events IS 'Users can view events they created';
COMMENT ON POLICY "Users can read shared events" ON public.calendar_events IS 'Users can view events shared with them by friends';
COMMENT ON FUNCTION are_friends IS 'Helper function to check if two users are friends with status=friend';
COMMENT ON FUNCTION has_event_access IS 'Helper function to check if user owns or has access to an event';
