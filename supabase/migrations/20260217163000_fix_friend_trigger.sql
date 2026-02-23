-- Migration: Fix friend acceptance trigger condition
-- Description: Updates trigger_notify_friend_accepted_push to check for status = 'friend' instead of 'accepted', matching the application logic.

CREATE OR REPLACE FUNCTION trigger_notify_friend_accepted_push()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Change: Check for 'friend' instead of 'accepted'
  IF NEW.status = 'friend' AND OLD.status != 'friend' THEN
    SELECT user_name INTO accepter_name FROM profiles WHERE id = NEW.friend_id; -- The one who updated (accepter)
    
    -- Notify the requester (user_id)
    PERFORM invoke_notification_edge_function(jsonb_build_object(
      'user_id', NEW.user_id,
      'type', 'FRIEND_REQUEST_ACCEPTED',
      'entity_data', jsonb_build_object(
        'name', accepter_name,
        'friendship_id', NEW.id
      )
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
