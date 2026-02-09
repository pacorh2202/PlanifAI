-- PlanifAI Initial Schema Migration
-- This schema exactly matches the TypeScript contracts in types.ts
-- NO breaking changes to existing frontend contracts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Extends auth.users with custom profile data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Usuario',
  assistant_name TEXT NOT NULL DEFAULT 'PlanifAI',
  assistant_voice TEXT NOT NULL DEFAULT 'Zephyr' CHECK (assistant_voice IN ('Zephyr', 'Puck')),
  profile_image TEXT,
  accent_color TEXT NOT NULL DEFAULT '#B2D3A1',
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  is_dark_mode BOOLEAN NOT NULL DEFAULT false,
  active_template_id TEXT NOT NULL DEFAULT 'coral-planner',
  custom_template JSONB, -- Stores PlannerTemplate structure
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CALENDAR EVENTS TABLE
-- ============================================================================
-- Matches CalendarEvent interface exactly
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core event fields (matching CalendarEvent interface)
  title TEXT NOT NULL,
  description_points TEXT[], -- Array of strings
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  
  -- Event type and categorization
  event_type TEXT NOT NULL CHECK (event_type IN ('work', 'study', 'health', 'personal', 'leisure', 'other')),
  category_label TEXT, -- Custom category label
  
  -- Event status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'failed', 'moved')),
  
  -- Optional fields
  location TEXT,
  attendees TEXT[], -- Array of attendee names/emails
  color TEXT, -- Custom color override
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_time_range CHECK (end_time >= start_time)
);

CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_status ON public.calendar_events(status);

-- ============================================================================
-- FRIENDS TABLE
-- ============================================================================
-- Matches Friend interface
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User who initiated the relationship
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Friend user
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Friend status: 'friend', 'pending', 'suggested'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('friend', 'pending', 'suggested')),
  
  -- Cached friend data for display (denormalized for performance)
  friend_name TEXT NOT NULL,
  friend_handle TEXT NOT NULL,
  friend_avatar TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate friendships
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  -- Prevent self-friendship
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_status ON public.friends(status);

-- ============================================================================
-- EVENT PARTICIPANTS TABLE
-- ============================================================================
-- Many-to-many relationship for shared events
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Permission level for this participant
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  
  -- Participation status
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate participants
  CONSTRAINT unique_event_participant UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON public.event_participants(user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- In-app notification queue
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'friend_request', 
    'friend_accepted', 
    'event_shared', 
    'event_updated', 
    'event_reminder'
  )),
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Additional data (event_id, friend_id, etc.)
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- DEVICE TOKENS TABLE
-- ============================================================================
-- OneSignal push notification device tokens
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- OneSignal player ID
  player_id TEXT NOT NULL,
  
  -- Device information
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  device_model TEXT,
  
  -- Token status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One token per device
  CONSTRAINT unique_player_id UNIQUE (player_id)
);

CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_is_active ON public.device_tokens(is_active);

-- ============================================================================
-- KPI CACHE TABLE
-- ============================================================================
-- Materialized KPI statistics for performance
CREATE TABLE IF NOT EXISTS public.kpi_cache (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- KPI metrics (matches KPIStats interface)
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  moved INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  
  -- Event type distribution (JSON object)
  distribution JSONB NOT NULL DEFAULT '{"work": 0, "study": 0, "health": 0, "personal": 0, "leisure": 0, "other": 0}',
  
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', 'Usuario'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with PlanifAI settings';
COMMENT ON TABLE public.calendar_events IS 'Calendar events matching CalendarEvent TypeScript interface';
COMMENT ON TABLE public.friends IS 'Friend relationships matching Friend TypeScript interface';
COMMENT ON TABLE public.event_participants IS 'Shared event participants for collaboration';
COMMENT ON TABLE public.notifications IS 'In-app notification queue';
COMMENT ON TABLE public.device_tokens IS 'OneSignal push notification device tokens';
COMMENT ON TABLE public.kpi_cache IS 'Cached KPI statistics for performance';
