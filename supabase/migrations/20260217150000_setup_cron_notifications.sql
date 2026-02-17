-- Migration: Setup Cron Jobs for Scheduled Notifications
-- Description: Implements T-30 reminders, Daily Summary, and Inactivity Catchup using pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- 1. Helper: Invoke Edge Function (Reused/Ensured)
-- =============================================
-- (Assumes 'invoke_notification_edge_function' exists from previous migration)

-- =============================================
-- 2. T-30 Reminder Processor
-- =============================================
CREATE OR REPLACE FUNCTION process_t30_reminders() RETURNS VOID AS $$
DECLARE
  event_record RECORD;
  participant_id TEXT;
  now_plus_30 TIMESTAMP;
  now_plus_35 TIMESTAMP;
BEGIN
  now_plus_30 := (now() + interval '30 minutes');
  now_plus_35 := (now() + interval '35 minutes');

  -- Find events starting between 30 and 35 minutes from now
  -- AND status is not cancelled
  FOR event_record IN
    SELECT id, title, start_time 
    FROM calendar_events 
    WHERE start_time >= now_plus_30 
      AND start_time < now_plus_35
      AND status != 'cancelled'
  LOOP
    -- For each accepted participant
    FOR participant_id IN 
      SELECT user_id FROM event_participants 
      WHERE event_id = event_record.id AND status = 'accepted'
    LOOP
      PERFORM invoke_notification_edge_function(jsonb_build_object(
        'user_id', participant_id,
        'type', 'EVENT_T30_REMINDER',
        'entity_data', jsonb_build_object(
          'title', event_record.title,
          'start_time', event_record.start_time,
          'event_id', event_record.id
        )
      ));
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Daily Summary Processor
-- =============================================
CREATE OR REPLACE FUNCTION process_daily_summary() RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  task_count INT;
  first_task_time TEXT;
BEGIN
  -- Iterate over users whose local time matches their daily_summary_time preference (Hour precision)
  -- Logic: Check if current UTC hour + user offset matches preference hour?
  -- Simpler: Check if (now() at time zone p.timezone)::time Is closely matching daily_summary_time.
  -- We assume this runs hourly.
  
  FOR user_record IN
    SELECT id, timezone, notification_preferences 
    FROM profiles 
    WHERE (notification_preferences->>'daily_summary')::boolean = true
  LOOP
    -- Check if it is the right hour for this user
    -- Cast daily_summary_time (e.g. "09:00") to time
    -- Check if current local time hour equals summary time hour
    IF EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(user_record.timezone, 'UTC'))) = 
       EXTRACT(HOUR FROM (user_record.notification_preferences->>'daily_summary_time')::time) 
    THEN
      -- Get stats for today
      SELECT COUNT(*), to_char(MIN(start_time), 'HH24:MI')
      INTO task_count, first_task_time
      FROM calendar_events ce
      JOIN event_participants ep ON ep.event_id = ce.id
      WHERE ep.user_id = user_record.id 
        AND ep.status = 'accepted'
        AND ce.status != 'cancelled'
        AND ce.start_time::date = (now() AT TIME ZONE COALESCE(user_record.timezone, 'UTC'))::date;
      
      IF task_count > 0 THEN
        PERFORM invoke_notification_edge_function(jsonb_build_object(
          'user_id', user_record.id,
          'type', 'DAILY_SUMMARY',
          'entity_data', jsonb_build_object(
            'count', task_count,
            'first_time', first_task_time
          )
        ));
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Inactivity Catchup Processor
-- =============================================
CREATE OR REPLACE FUNCTION process_inactivity_catchup() RETURNS VOID AS $$
DECLARE
  user_rec RECORD;
  last_active TIMESTAMP;
  days_inactive INT;
  last_sent_at TIMESTAMP;
BEGIN
  -- Iterate users
  FOR user_rec IN 
    SELECT p.id, p.notification_state, MAX(dt.last_used_at) as last_device_use
    FROM profiles p
    LEFT JOIN device_tokens dt ON dt.user_id = p.id
    GROUP BY p.id
  LOOP
    last_active := COALESCE(user_rec.last_device_use, '2000-01-01'); -- Fallback if never active?
    days_inactive := EXTRACT(DAY FROM (now() - last_active));
    
    -- Check phases: 2, 4, 7
    IF days_inactive IN (2, 4, 7) THEN
       -- Check filtering: Max 1 per 48h (Prompt requirement)
       last_sent_at := (user_rec.notification_state->>'inactivity_sent_at')::timestamp;
       
       IF last_sent_at IS NULL OR (now() - last_sent_at) > interval '48 hours' THEN
         PERFORM invoke_notification_edge_function(jsonb_build_object(
          'user_id', user_rec.id,
          'type', 'INACTIVITY_CATCHUP',
          'entity_data', jsonb_build_object(
            'days', days_inactive
          )
         ));
         
         -- Update state (last sent) - done by Edge Function ideally? 
         -- Edge function updates "last_styles", but maybe not "inactivity_sent_at".
         -- Prompt said "Guarda registro... para poder reintentar".
         -- Let's update it here to be safe and avoid loops if Edge Function fails to update.
         UPDATE profiles 
         SET notification_state = jsonb_set(
            COALESCE(notification_state, '{}'::jsonb), 
            '{inactivity_sent_at}', 
            to_jsonb(now())
         )
         WHERE id = user_rec.id;
       END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Schedule Jobs
-- =============================================

-- T-30: Run every 5 minutes
SELECT cron.schedule(
  't30_reminder_check',
  '*/5 * * * *',
  $$SELECT process_t30_reminders()$$
);

-- Daily Summary: Run hourly (to catch different timezones)
SELECT cron.schedule(
  'daily_summary_check',
  '0 * * * *', 
  $$SELECT process_daily_summary()$$
);

-- Inactivity: Run once a day (e.g. 10:00 UTC)
SELECT cron.schedule(
  'inactivity_check',
  '0 10 * * *',
  $$SELECT process_inactivity_catchup()$$
);
