# PlanifAI Backend Architecture

## Overview

PlanifAI has been migrated from a localStorage-based frontend-only app to a full-stack architecture with Supabase backend, while maintaining 100% UI/UX consistency.

---

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** (utility classes via inline styles) - Styling
- **Lucide React** - Icon system
- **Recharts** - Data visualization

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Realtime subscriptions
  - Edge Functions (Deno)
- **OneSignal** - Push notifications

### AI
- **Google Gemini 2.5 Flash** - Live voice assistant
- Proxied via Supabase Edge Functions (security)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ ChatScreen│CalendarScreen│StatsScreen│FriendsScreen│Settings │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Context Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ AuthContext  │  │CalendarContext│  │ (Future)     │       │
│  │ - User auth  │  │ - Events      │  │NotificationCtx│       │
│  │ - Profile    │  │ - KPIs        │  └──────────────┘       │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Layer (src/lib)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  supabase.ts │ │calendar-api.ts│ │friends-api.ts│         │
│  │  (main client│ │               │ │              │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Supabase Backend                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  PostgreSQL Database                  │   │
│  │  ┌────────┐ ┌──────────────┐ ┌────────────────┐     │   │
│  │  │profiles│ │calendar_events│ │friends         │     │   │
│  │  └────────┘ └──────────────┘ └────────────────┘     │   │
│  │  ┌────────────────┐ ┌───────────────┐              │   │
│  │  │event_participants│ │notifications  │              │   │
│  │  └────────────────┘ └───────────────┘              │   │
│  │  ┌────────────┐ ┌────────────┐                     │   │
│  │  │device_tokens│ │kpi_cache   │                     │   │
│  │  └────────────┘ └────────────┘                     │   │
│  │                                                      │   │
│  │  + RLS Policies (user-level data isolation)         │   │
│  │  + Triggers (auto-create profile, update timestamps)│   │
│  │  + Functions (KPI calculation, helpers)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Edge Functions (Deno)                   │   │
│  │  ┌─────────────────┐  ┌─────────────────────────┐   │   │
│  │  │  ai-proxy       │  │ send-push-notification  │   │   │
│  │  │  (Gemini API)   │  │ (OneSignal)             │   │   │
│  │  └─────────────────┘  └─────────────────────────┘   │   │
│  │  ┌─────────────────┐                                │   │
│  │  │ calculate-kpis  │  (optional cron)               │   │
│  │  └─────────────────┘                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Realtime Engine                      │   │
│  │  - Event changes broadcast to all participants        │   │
│  │  - Notification delivery                              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### tables

#### `profiles`
User settings and preferences. One profile per auth.users record.

```sql
id UUID PRIMARY KEY → auth.users(id)
user_name TEXT
assistant_name TEXT
assistant_voice TEXT ('Zephyr' | 'Puck')
profile_image TEXT
accent_color TEXT
language TEXT ('es' | 'en')
is_dark_mode BOOLEAN
active_template_id TEXT
custom_template JSONB
```

**Policies**:
- Users can read/update own profile
- All users can read public profiles (for friends)

---

#### `calendar_events`
Calendar events exactly matching `CalendarEvent` TypeScript interface.

```sql
id UUID PRIMARY KEY
user_id UUID → profiles(id)
title TEXT
description_points TEXT[]
start_time TIMESTAMPTZ
end_time TIMESTAMPTZ
all_day BOOLEAN
event_type TEXT (work|study|health|personal|leisure|other)
category_label TEXT
status TEXT (scheduled|completed|failed|moved)
location TEXT
attendees TEXT[]
color TEXT
```

**Policies**:
- Users can CRUD own events
- Users can read/edit events shared with them (via participants table)

---

#### `friends`
Friend relationships. Denormalized for performance.

```sql
id UUID PRIMARY KEY
user_id UUID → profiles(id)
friend_id UUID → profiles(id)
status TEXT ('friend' | 'pending' | 'suggested')
friend_name TEXT (cached)
friend_handle TEXT (cached)
friend_avatar TEXT (cached)
```

**Policies**:
- Users can read friendships where they are user_id OR friend_id
- Users can create/update/delete their own friend relationships

---

#### `event_participants`
Many-to-many for shared events.

```sql
id UUID PRIMARY KEY
event_id UUID → calendar_events(id)
user_id UUID → profiles(id)
role TEXT (owner|editor|viewer)
status TEXT (invited|accepted|declined)
```

**Policies**:
- Event owners can add/remove participants
- Participants can update their own status (accept/decline)

---

#### Other Tables
- **notifications**: In-app notification queue
- **device_tokens**: OneSignal player IDs for push
- **kpi_cache**: Materialized KPI stats

---

## Authentication Flow

```
User opens app
    │
    ▼
Is user logged in? (localStorage session)
    │
    ├─ NO → Show AuthScreen
    │        │
    │        ├─ Sign Up: email + password + name
    │        │   └─ Supabase creates auth.users
    │        │       └─ Trigger creates profiles row
    │        │           └─ Fetch profile
    │        │               └─ migrateLocalStorageToSupabase()
    │        │
    │        └─ Sign In: email + password
    │            └─ Supabase validates credentials
    │                └─ Fetch profile
    │
    └─ YES → Show main app
             └─ Fetch user profile from Supabase
                 └─ Load calendar events
```

---

## Data Flow: Create Event

1. User speaks to AI: "Schedule gym at 5pm tomorrow"
2. Gemini calls `manageCalendar` tool with action='create'
3. `hooks/usePlanAILive.ts` receives tool call
4. Calls `CalendarContext.executeAction(action)`
5. **OLD**: `addEvent()` saves to localStorage
6. **NEW**: `addEvent()` calls Supabase:
   ```typescript
   supabase.from('calendar_events').insert({
     user_id: auth.uid(),
     title: 'Gym',
     start_time: '2026-02-04T17:00:00',
     end_time: '2026-02-04T18:00:00',
     event_type: 'health',
     status: 'scheduled'
   })
   ```
7. Supabase insert triggers realtime broadcast
8. Any other devices with this user logged in see event appear
9. Event ID returned, AI confirms "Gym scheduled for 5pm tomorrow"

---

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only access their own data
- Users can access shared events (via participants table)
- Friends can see each other's public profile info
- Notifications only visible to recipient

### API Keys
- **Client**: Only `SUPABASE_ANON_KEY` (safe, limited permissions)
- **Backend**: `GEMINI_API_KEY` stored in Edge Function secrets
- **Server**: Database access via RLS + Supabase service role

### Authentication
- Email/password via Supabase Auth
- Session stored in localStorage (encrypted)
- Auto-refresh tokens
- RLS uses `auth.uid()` for user identification

---

## Realtime Features

### Event Sync
```typescript
supabase
  .channel('calendar_events')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'calendar_events' },
    (payload) => {
      // Update local state
      refetchEvents();
    }
  )
  .subscribe();
```

### Notifications
```typescript
supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => {
      showToast(payload.new.message);
    }
  )
  .subscribe();
```

---

## Edge Functions

### `ai-proxy`
**Purpose**: Secure Gemini API access with caching

```typescript
// Input: { audio: base64, userId: uuid }
// Process:
//   1. Check cache for similar request (last 5min)
//   2. If cache hit, return cached response
//   3. Else, call Gemini API with GEMINI_API_KEY
//   4. Store response in cache
//   5. Return to client
// Output: { audio: base64, transcript: string }
```

**Rate Limiting**: 100 requests/user/hour

---

### `send-push-notification`
**Purpose**: Send push via OneSignal

```typescript
// Triggered by: INSERT on notifications table
// Process:
//   1. Get notification details
//   2. Fetch user's device tokens
//   3. Call OneSignal API for each token
//   4. Update notification status
```

---

### `calculate-kpis` (optional)
**Purpose**: Refresh materialized view for KPIs

```typescript
// Triggered by: Cron (nightly at 2am UTC)
// Process:
//   1. REFRESH MATERIALIZED VIEW user_kpi_stats
//   2. Update kpi_cache table
```

---

## KPI Calculation

### Client-Side (OLD)
```typescript
// Calculated on every render
const calculateStats = () => {
  events.forEach(e => {
    if (e.status === 'completed') completed++;
    // ...
  });
};
```

### Server-Side (NEW)
```typescript
// Fetched from pre-computed view
const stats = await supabase.rpc('rpc_get_kpi_stats');
// Returns: { completed: 12, failed: 2, moved: 5, streak: 4, distribution: {...} }
```

**Performance**: ~50ms (vs 200ms+ client-side)

---

## Migration Strategy

### localStorage → Supabase

On first login after migration:

```typescript
async function migrateLocalStorageToSupabase(userId: string) {
  const localEvents = JSON.parse(localStorage.getItem('planai_events') || '[]');
  
  if (localEvents.length > 0) {
    // Batch insert to Supabase
    await supabase.from('calendar_events').insert(
      localEvents.map(e => ({
        user_id: userId,
        title: e.title,
        start_time: e.start,
        end_time: e.end,
        // ... map all fields
      }))
    );
    
    // Clear localStorage (now in cloud)
    localStorage.removeItem('planai_events');
  }
}
```

---

## Monitoring & Observability

### Metrics to Track
- **API Response Time**: Target &lt;500ms for calendar load
- **Realtime Latency**: Target &lt;200ms for event sync
- **AI Request Cost**: Track Gemini API usage per user
- **Cache Hit Rate**: Target 30%+ for AI requests
- **KPI Calculation Time**: Target &lt;50ms

### Logging
- Edge Function logs in Supabase dashboard
- Frontend errors sent to console (future: error tracking service)

---

## Cost Optimization

### Caching
- AI responses cached for 5 minutes (dedupe identical requests)
- KPIs pre-computed (avoid recalculating on every load)

### Database Queries
- Indexes on frequently queried columns (user_id, start_time, status)
- Materialized views for complex aggregations

### Rate Limiting
- AI proxy: 100 req/user/hour
- Prevents abuse and controls costs

---

## Future Enhancements

1. **Offline Mode**: Queue mutations, sync when online
2. **Collaborative Editing**: Live cursors on shared events
3. **Analytics Dashboard**: Admin view of platform usage
4. **AI Improvements**: Context-aware suggestions
5. **Mobile Apps**: iOS/Android native with same backend

---

## Environment Variables

### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
VITE_ONESIGNAL_APP_ID=xxx
```

### Backend (Supabase Secrets)
```
GEMINI_API_KEY=AIza...
ONESIGNAL_API_KEY=YTMw...
```

---

## Deployment

### Frontend
1. Build: `npm run build`
2. Deploy to: Vercel, Netlify, or static hosting
3. Set environment variables in hosting platform

### Backend
1. Push migrations: `supabase db push`
2. Deploy Edge Functions: `supabase functions deploy`
3. Set secrets: `supabase secrets set GEMINI_API_KEY=xxx`

---

## Troubleshooting

### "Cannot read properties of null"
- Check if user is authenticated (AuthContext)
- Verify Supabase client initialized

### Events not syncing
- Check realtime subscription status
- Verify RLS policies allow access
- Check browser console for errors

### AI not responding
- Verify GEMINI_API_KEY in Supabase secrets
- Check Edge Function logs
- Ensure rate limit not exceeded

---

## Contact

For questions or issues with this architecture, refer to `docs/agent-handoffs.md` or the main implementation plan.
