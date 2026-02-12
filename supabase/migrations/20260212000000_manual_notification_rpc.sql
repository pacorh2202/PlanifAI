CREATE OR REPLACE FUNCTION send_event_invitation(
  p_user_id UUID,
  p_event_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB
)
RETURNS VOID AS $$
DECLARE
  v_sender_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Check: Sender must be Owner OR Editor of the event
  -- We allow owners (in calendar_events) OR editors (in event_participants)
  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_events 
    WHERE id = p_event_id AND user_id = v_sender_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.event_participants 
    WHERE event_id = p_event_id 
    AND user_id = v_sender_id
    AND role IN ('owner', 'editor')
    AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Not authorized to send invitations for this event';
  END IF;

  -- Insert notification (SECURITY DEFINER allows this)
  INSERT INTO public.notifications (
    user_id, type, title, message, metadata, is_read
  ) VALUES (
    p_user_id, 'event_shared', p_title, p_message, p_metadata, false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
