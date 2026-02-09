
-- ENABLE RLS on Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. NOTIFICATIONS POLICY:
-- Users can View their own notifications.
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Users can Insert notifications for ANYONE (required for invites).
-- This is critical for Paco to notify Hector.
CREATE POLICY "Users can insert notifications for others" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Users can Update their own notifications (mark as read).
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- 2. CALENDAR EVENTS SHARED ACCESS
-- Inherit access via event_participants
CREATE POLICY "Participants can view shared events"
ON calendar_events FOR SELECT
USING (
  auth.uid() = user_id -- Owner
  OR EXISTS (
    SELECT 1 FROM event_participants ep 
    WHERE ep.event_id = id AND ep.user_id = auth.uid()
  )
);

-- 3. PARTICIPANTS MANAGEMENT
-- Users can see modifying to events they are involved in
CREATE POLICY "Users can view participation"
ON event_participants FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM calendar_events ce WHERE ce.id = event_id AND ce.user_id = auth.uid()
));

-- Users can insert participation (invite mechanics) matches Calendar owners
CREATE POLICY "Event owners can invite"
ON event_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM calendar_events ce 
    WHERE ce.id = event_id AND ce.user_id = auth.uid()
  )
);

-- Users can update their own status (Accept/Decline)
CREATE POLICY "Users can update own status"
ON event_participants FOR UPDATE
USING (auth.uid() = user_id);
