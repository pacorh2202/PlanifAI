# Backend Testing Guide - PlanifAI

**Purpose**: Systematically test all backend features to verify the migration is complete and functional.

---

## 🔐 Test 1: Authentication Flow (5 min)

### Email/Password Sign Up

**Steps**:
1. Open `http://localhost:5173` in incognito
2. You should see the new Auth screen with PlanAI logo
3. Click "Registrarse" (bottom toggle)
4. Enter:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "test123"
5. Click "Crear Cuenta"

**Expected**:
- ✅ No console errors
- ✅ Redirected to main app (Chat screen)
- ✅ User can see calendar, friends, stats tabs

**If it fails**:
- Check console for Supabase errors
- Verify `.env.local` has correct Supabase credentials
- Check Supabase dashboard → Authentication → Users

---

### Email/Password Sign In

**Steps**:
1. Sign out (Settings → Logout button)
2. Enter same email/password
3. Click "Iniciar Sesión"

**Expected**:
- ✅ Logged in successfully
- ✅ Data persists (same user profile)

---

### Google OAuth (If Configured)

**Steps**:
1. Sign out
2. Click "Continuar con Google"
3. Select Google account

**Expected**:
- ✅ Redirected to Google OAuth
- ✅ After approval, redirected back to app
- ✅ Logged in automatically

**If it fails**:
- Verify Google OAuth is enabled in Supabase dashboard
- Check redirect URIs in Google Cloud Console
- See `docs/google-oauth-setup.md`

---

## 📅 Test 2: Calendar CRUD (Manual) (10 min)

### Create Event

**Steps**:
1. Go to Calendar tab
2. Click "+ New Event" button or similar
3. Fill in event details:
   - Title: "Gym Session"
   - Start: Tomorrow 5:00 PM
   - Category: Health
4. Save

**Expected**:
- ✅ Event appears in calendar immediately
- ✅ Event persists after page refresh
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT * FROM calendar_events WHERE user_id = '<your-user-id>';
```

---

### Update Event

**Steps**:
1. Click on the "Gym Session" event
2. Change title to "Gym + Swimming"
3. Save

**Expected**:
- ✅ Title updates immediately
- ✅ Change persists after refresh

---

### Delete Event

**Steps**:
1. Click on event
2. Click delete/trash icon
3. Confirm deletion

**Expected**:
- ✅ Event removed from calendar
- ✅ Still deleted after refresh

---

## 🤖 Test 3: AI Calendar Creation (15 min)

**CRITICAL TEST** - This is the feature that was potentially broken.

### Prerequisites
- User must be logged in
- API key configured in `.env.local`:
  ```
  VITE_GOOGLE_GEMINI_API_KEY=your_key_here
  ```

### Test Voice Command

**Steps**:
1. Go to **Chat** tab
2. Click microphone button
3. Say clearly: **"Agenda gimnasio mañana a las 5pm"**
4. Wait for AI response

**Expected Console Logs**:
```
[AI] 🔧 Tool call received: { name: "manageCalendar", ... }
[AI] 📞 Function: manageCalendar | Args: { actionType: "create", eventData: {...} }
[AI] 📅 Executing manageCalendar...
[executeAction] AI called with action: {...}
[executeAction] Creating event with data: {...}
[addEvent] Creating event: {...} for user: <user-id>
[addEvent] ✅ Event created in Supabase: {...}
[AI] ✅ Result: Evento creado con éxito...
```

**Expected UI**:
- ✅ AI responds: "He agendado gimnasio para mañana a las 5pm..."
- ✅ Event appears in Calendar tab immediately
- ✅ Event persists after refresh

---

### Debugging If It Fails

#### Error: "Cannot add event: user not authenticated"

**Problem**: User is `null` in `CalendarContext`

**Solution**:
1. Check if user is actually logged in:
   ```javascript
   // In browser console
   JSON.parse(localStorage.getItem('supabase.auth.token'))
   ```
2. If null, sign out and sign in again
3. Verify `AuthContext` is providing `user`

---

#### Error: "addEvent returned empty ID"

**Problem**: Supabase insert failed

**Solution**:
1. Check console for Supabase errors
2. Verify RLS policies allow insert:
   ```sql
   -- Should return true
   SELECT COUNT(*) FROM calendar_events WHERE user_id = auth.uid();
   ```
3. Check `calendar-api.ts` for errors

---

#### AI doesn't call the tool

**Problem**: Tool not registered correctly

**Solution**:
1. Check `usePlanAILive.ts` - `calendarTool` definition
2. Verify tool is passed to Gemini session
3. Try more explicit command: "Use the manageCalendar tool to create an event called 'Test' tomorrow at 3pm"

---

### Test Text Command (Alternative)

If voice doesn't work, test with text:

**Steps**:
1. In Chat screen, look for text input (if available)
2. Type: "Crea un evento llamado 'Reunión' para mañana a las 10am"
3. Send

**Expected**: Same as voice command

---

## 👥 Test 4: Friends Flow (15 min)

### Create Second Test Account

**Steps**:
1. Open app in **incognito/private window**
2. Sign up with different email: "friend@example.com"
3. Set name: "Friend User"

Now you have:
- Window 1: test@example.com ("Test User")
- Window 2: friend@example.com ("Friend User")

---

### Send Friend Request

**In Window 1** (Test User):
1. Go to **Friends** tab
2. Click "Add Friend" or search icon
3. Search for: "friend@example.com" or "Friend User"
4. Click "Send Request"

**Expected**:
- ✅ "Request sent" confirmation
- ✅ User appears in "Pending" section

---

### Accept Friend Request

**In Window 2** (Friend User):
1. Go to **Friends** tab
2. You should see incoming request from "Test User"
3. Click "Accept"

**Expected**:
- ✅ "Now friends" confirmation
- ✅ User moves to "Friends" list

**In Window 1**:
- ✅ User should automatically move to "Friends" list (realtime update!)

---

### Share Event (Future Feature)

**Note**: Event sharing MVP may not be fully implemented in UI yet.

**To test**:
1. Create an event
2. Click "Share" (if available)
3. Select friend
4. Friend should receive notification (if notifications enabled)

---

## 📊 Test 5: KPIs Accuracy (5 min)

### Setup

**Steps**:
1. Go to Calendar tab
2. Create 5 events:
   - 3 for today (mark 2 as completed)
   - 2 for tomorrow

**Expected Stats** (in Stats tab):
- **Total Events**: 5
- **Completed Events**: 2  
- **Completion Rate**: 40%
- **Streak**: 1 day (if you completed events today)

**Verify**:
1. Go to Stats tab
2. Check if numbers match

---

### Test Realtime KPI Updates

**Steps**:
1. Stay on Stats tab
2. In another tab/window, complete another event
3. Switch back to Stats tab

**Expected**:
- ✅ Stats update automatically (no page refresh needed)
- ✅ Completed count increases
- ✅ Completion rate recalculates

---

## ✅ Final Verification Checklist

### Build & Type Check
- [ ] `npm run build` → No errors
- [ ] `npm run dev` → App runs without console errors

### Features
- [ ] Can sign up with email/password
- [ ] Can sign in with email/password
- [ ] Can sign in with Google (if configured)
- [ ] Can create calendar events manually
- [ ] Can update calendar events
- [ ] Can delete calendar events
- [ ] **AI can create events via voice/text**
- [ ] Can search for friends
- [ ] Can send friend requests
- [ ] Can accept friend requests
- [ ] Friends list updates in realtime
- [ ] KPIs calculate correctly
- [ ] KPIs update in realtime

### Account Management
- [ ] Can update name in Settings → Account
- [ ] Can update email (sends confirmation)
- [ ] Can change password
- [ ] Can logout

---

## 🐛 Common Issues & Solutions

### Issue: "Supabase URL is not defined"

**Solution**:
1. Check `.env.local` exists
2. Verify variables:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```
3. Restart dev server: `npm run dev`

---

### Issue: "RLS policy violation"

**Solution**:
1. Check if migrations were applied:
   - Go to Supabase dashboard → SQL Editor
   - Run: `SELECT * FROM supabase_migrations.schema_migrations;`
2. If missing, reapply migrations from `supabase/migrations/`

---

### Issue: "Calendar events not syncing"

**Solution**:
1. Check realtime is enabled in Supabase:
   - Dashboard → Database → Replication
   - Enable `calendar_events` table
2. Check console for subscription errors

---

### Issue: "AI creates event but it doesn't appear"

**Solution**:
1. Check `executeAction` logs in console
2. Verify `addEvent` doesn't return empty string
3. Check if event was created in Supabase:
   ```sql
   SELECT * FROM calendar_events ORDER BY created_at DESC LIMIT 5;
   ```
4. If event exists in DB but not in UI, check realtime subscription

---

## 📈 Success Criteria

Before marking backend migration **COMPLETE**:

- ✅ All authentication methods work
- ✅ All calendar CRUD operations work
- ✅ **AI can create events successfully** (CRITICAL)
- ✅ Friends flow works end-to-end
- ✅ KPIs calculate and update correctly
- ✅ No console errors on normal usage
- ✅ Data persists after page refresh
- ✅ Realtime updates work

---

## 📝 Next Steps After Testing

1. **Document any bugs found** in GitHub issues or task.md
2. **Fix critical bugs** before marking phase complete
3. **Update walkthrough.md** with test results
4. **Notify user** of testing status

---

**Estimated Testing Time**: 50 minutes total  
**Priority**: Test AI calendar creation first (most critical feature)
