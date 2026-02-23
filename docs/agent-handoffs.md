# Agent Handoffs - PlanifAI Backend Migration

## Purpose
This document coordinates work between Agents A-H, ensuring smooth handoffs and preventing duplicate work or conflicts.

---

## Agent A: Repository Audit ✅ COMPLETE

**Deliverables**:
- [x] `contracts-freeze.md` - No-touch reference for all agents
- [x] Repository structure analysis
- [x] TypeScript contracts documentation

**Handoff to Next Agents**: All agents must read `contracts-freeze.md` before making changes.

---

## Agent B: Supabase Schema ✅ COMPLETE

**Deliverables**:
- [x] `supabase/migrations/20260203140000_initial_schema.sql` - 7 tables matching contracts
- [x] `supabase/migrations/20260203140100_rls_policies.sql` - Row Level Security
- [x] `supabase/migrations/20260203140200_kpi_views.sql` -Analytics views and functions

**Tables Created**:
1. `profiles` - User settings
2. `calendar_events` - Events matching `CalendarEvent` interface
3. `friends` - Friend relationships
4. `event_participants` - Shared events
5. `notifications` - In-app notifications
6. `device_tokens` - OneSignal push tokens
7. `kpi_cache` - Cached analytics

**Next Steps**: Agent C can proceed with authentication (no blockers).

---

## Agent C: Authentication 🔄 IN PROGRESS

**Deliverables**:
- [x] `src/lib/supabase.ts` - Supabase client
- [x] `src/lib/database.types.ts` - TypeScript types
- [x] `src/contexts/AuthContext.tsx` - Auth state management
- [x] `src/components/AuthScreen.tsx` - Login/signup UI
- [x] Updated `package.json` with Supabase dependency
- [x] Updated `.env.local` with Supabase vars
- [ ] Install dependencies (`npm install`)
- [ ] Integrate AuthProvider into App.tsx
- [ ] Test signup/signin flows

**Blockers**: 
- Need Supabase project URL and anon key to test
- Must run `npm install` before testing

**Handoff Notes**:
- AuthContext is ready for Agent D to use
- Profile data syncs with Supabase automatically
- Auth state persists via localStorage

---

## Agent D: Calendar Data Migration 📋 PENDING

**Prerequisites**:
- Agent C must complete authentication
- User must be logged in to access calendar

**Tasks**:
1. Create `src/lib/calendar-api.ts` - Supabase calendar operations
2. Refactor `contexts/CalendarContext.tsx`:
   - Replace localStorage with Supabase queries
   - Keep exact same API (addEvent, updateEvent, deleteEvent, executeAction)
   - Add realtime subscription for event updates
3. Implement `migrateLocalStorageToSupabase()` function
4. Test: Create/update/delete events via Supabase

**Critical Rules**:
- ❌ DO NOT change CalendarContext interface
- ❌ DO NOT break executeAction() - AI tool depends on it
- ✅ CAN add internal helper functions

**Handoff to Agent E**: Once calendar data works, friends can share events.

---

## Agent E: Friends & Sharing 📋 PENDING

**Prerequisites**:
- Agent D: Calendar events stored in Supabase
- Agent C: Authentication working

**Tasks**:
1. Create `src/lib/friends-api.ts`:
   - `sendFriendRequest(toUserId)`
   - `acceptFriendRequest(requestId)`
   - `shareEvent(eventId, friendIds)`
2. Update `components/FriendsScreen.tsx`:
   - Connect to friends API
   - Enable real friend invites (currently mock)
3. Test: Send friend request, accept, share event

**Handoff to Agent F**: Once sharing works, enable notifications.

---

## Agent F: Notifications 📋 PENDING

**Prerequisites**:
- Agent E: Friend sharing functional
- OneSignal app ID configured

**Tasks**:
1. Create `src/lib/notifications-api.ts`:
   - `createNotification()`
   - `getNotifications()`
   - `markAsRead()`
   - `registerDeviceToken()`
2. Create `src/hooks/useNotifications.ts` - React hook with realtime
3. Create `supabase/functions/send-push-notification/index.ts` - Edge Function
4. Test: Share event → friend gets notification

**Environment Variables Needed**:
```
VITE_ONESIGNAL_APP_ID=<from OneSignal dashboard>
ONESIGNAL_API_KEY=<in Supabase secrets>
```

---

## Agent G: KPIs Pipeline 📋 PENDING

**Prerequisites**:
- Agent D: Calendar events in Supabase
- KPI views already created by Agent B

**Tasks**:
1. Create `supabase/functions/calculate-kpis/index.ts` (optional cron job)
2. Update `CalendarContext.tsx`:
   - Fetch stats from `rpc_get_kpi_stats()` instead of calculating client-side
   - Keep same `KPIStats` interface
3. Test: Complete events → KPIs update correctly

**Performance Goal**: Stats load in &lt;200ms.

---

## Agent H: AI Security & Cost 📋 PENDING

**Prerequisites**:
- Agent D: CalendarContext refactored
- Gemini API key available

**Tasks**:
1. Create `supabase/functions/ai-proxy/index.ts`:
   - Accept audio input from client
   - Call Gemini API (key in secrets)
   - Implement caching (dedupe similar requests)
   - Add rate limiting (max N requests/user/hour)
2. Create `src/lib/ai-client.ts` - Client wrapper
3. Update `hooks/usePlanAILive.ts`:
   - Replace direct SDK calls with ai-proxy
   - Keep same hook API (connect, disconnect, isTalking, etc.)
4. Test: Voice chat still works, but API key not in client

**Environment Variables Needed**:
```
# In Supabase Edge Function secrets
GEMINI_API_KEY=<actual key>
```

**Cost Savings Goal**: 50% reduction via caching.

---

## Verification Checklist (All Agents)

Before marking your phase complete, verify:

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] UI looks identical to before (screenshot comparison)
- [ ] Your feature works end-to-end (manual test)
- [ ] Documentation updated in `/docs`
- [ ] Handoff notes written for next agent

---

## Communication Protocol

### If You Need Help
1. Document the blocker in this file
2. Note what you've tried
3. Suggest alternatives if possible

### If You Discover a Contract Change Needed
1. **STOP immediately**
2. Document why the change is necessary
3. Get user approval (via notify_user)
4. Update `contracts-freeze.md`

### If You Finish Early
1. Mark your section ✅ COMPLETE
2. Update task.md
3. Create walkthrough in `/docs`
4. Notify next agent via this file

---

## Current Status: Phase 4 (Agent C) in Progress

**Completed**: Agents A, B
**In Progress**: Agent C (Authentication)
**Pending**: Agents D, E, F, G, H

**Next Milestone**: Complete Agent C → Begin Agent D (Calendar Migration)
