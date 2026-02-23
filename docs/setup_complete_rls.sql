
-- ⚠️ IMPORTANT: RUN THIS ENTIRE BLOCK IN SUPABASE SQL EDITOR TO FIX NOTIFICATIONS
-- This script fixes the permissions that block users from inviting others.

-- 1. NOTIFICATIONS: Allow sending notifications to ANYONE (Critical for invites)
DROP POLICY IF EXISTS "Users can insert notifications for others" ON notifications;
CREATE POLICY "Users can insert notifications for others" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Ensure users can see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure users can mark as read
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);


-- 2. EVENT PARTICIPANTS: Allow inviting friends to events
-- This policy lets you add a row to 'event_participants' if you own the event.
DROP POLICY IF EXISTS "Event owners can invite" ON event_participants;
CREATE POLICY "Event owners can invite"
ON event_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM calendar_events ce 
    WHERE ce.id = event_id AND ce.user_id = auth.uid()
  )
);

-- Allow seeing who is attending shared events
DROP POLICY IF EXISTS "Users can view participation" ON event_participants;
CREATE POLICY "Users can view participation"
ON event_participants FOR SELECT
USING (
    auth.uid() = user_id -- I am the participant
    OR EXISTS (
        SELECT 1 FROM calendar_events ce 
        WHERE ce.id = event_id AND ce.user_id = auth.uid() -- I am the event owner
    )
    OR EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id = event_id AND ep.user_id = auth.uid() -- I am a co-participant
    )
);

-- Allow accepting/rejecting invites
DROP POLICY IF EXISTS "Users can update own status" ON event_participants;
CREATE POLICY "Users can update own status"
ON event_participants FOR UPDATE
USING (auth.uid() = user_id);

-- 3. CALENDAR EVENTS: Allow invited users to SEE the event details
DROP POLICY IF EXISTS "Participants can view shared events" ON calendar_events;
CREATE POLICY "Participants can view shared events"
ON calendar_events FOR SELECT
USING (
  auth.uid() = user_id -- Owner
  OR EXISTS (
    SELECT 1 FROM event_participants ep 
    WHERE ep.event_id = id AND ep.user_id = auth.uid() -- Invited guest
  )
);
