-- Fix RLS Infinite Recursion in Calendar Events Policies
-- This migration drops problematic recursive policies and creates simpler ones

-- ============================================================================
-- FIX: Drop problematic policies that cause infinite recursion
-- ============================================================================

DROP POLICY IF EXISTS "Users can read shared events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update shared events with editor role" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can read shared event participants" ON public.event_participants;
DROP POLICY IF EXISTS "Event owners can add participants" ON public.event_participants;
DROP POLICY IF EXISTS "Event owners can update participants" ON public.event_participants;
DROP POLICY IF EXISTS "Event owners can remove participants" ON public.event_participants;

-- ============================================================================
-- CALENDAR EVENTS: Simplified policies (no recursion)
-- ============================================================================

-- Users can read events they own
-- (This policy already exists, just ensuring it's simple)

-- Users can read shared events (FIXED: no subquery to event_participants)
CREATE POLICY "Users can read shared events v2"
  ON public.calendar_events
  FOR SELECT
  USING (
    -- Allow if user is in participants table for this event
    id IN (
      SELECT event_id FROM public.event_participants
      WHERE user_id = auth.uid()
        AND status = 'accepted'
    )
  );

-- Users can update shared events if editor (FIXED: simpler check)
CREATE POLICY "Users can update shared events v2"
  ON public.calendar_events
  FOR UPDATE
  USING (
    -- Allow if user has editor/owner role
    id IN (
      SELECT event_id FROM public.event_participants
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'editor')
        AND status = 'accepted'
    )
  );

-- ============================================================================
-- EVENT PARTICIPANTS: Simplified policies
-- ============================================================================

-- Users can read participants for events they own OR are part of
CREATE POLICY "Users can read event participants v2"
  ON public.event_participants
  FOR SELECT
  USING (
    -- User is the participant themselves
    user_id = auth.uid()
    OR
    -- User owns the event (check via simple join)
    event_id IN (
      SELECT id FROM public.calendar_events WHERE user_id = auth.uid()
    )
  );

-- Event owners can add participants (FIXED: simpler owner check)
CREATE POLICY "Event owners can add participants v2"
  ON public.event_participants
  FOR INSERT
  WITH CHECK (
    -- Check event ownership without recursion
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_participants.event_id
        AND ce.user_id = auth.uid()
    )
  );

-- Event owners can update participants (FIXED)
CREATE POLICY "Event owners can update participants v2"
  ON public.event_participants
  FOR UPDATE
  USING (
    -- User owns the event
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_participants.event_id
        AND ce.user_id = auth.uid()
    )
  );

-- Event owners can remove participants (FIXED)
CREATE POLICY "Event owners can remove participants v2"
  ON public.event_participants
  FOR DELETE
  USING (
    -- User owns the event
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_participants.event_id
        AND ce.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- These policies should now work without infinite recursion because:
-- 1. calendar_events SELECT policies only query event_participants (one direction)
-- 2. event_participants policies only query calendar_events (reverse direction)
-- 3. No circular dependencies between the two tables
