# Supabase Setup Instructions

## Prerequisites
You've provided your Supabase project credentials:
- **URL**: https://ftybizjyqoezsmiqfmun.supabase.co
- **Publishable Key**: sb_publishable_E8MD06yHYlJzzvFwB5hsvQ_5MjQPkw2

## Next Steps

### 1. Apply Database Migrations

You need to apply the 3 migration files to your Supabase project:

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref ftybizjyqoezsmiqfmun

# Push migrations
supabase db push
```

**Option B: Manual via Supabase Dashboard**

1. Go to: https://supabase.com/dashboard/project/ftybizjyqoezsmiqfmun/sql/new
2. Copy and execute each migration file in order:
   - `supabase/migrations/20260203140000_initial_schema.sql`
   - `supabase/migrations/20260203140100_rls_policies.sql`
   - `supabase/migrations/20260203140200_kpi_views.sql`

### 2. Enable Email Authentication

1. Go to: https://supabase.com/dashboard/project/ftybizjyqoezsmiqfmun/auth/providers
2. Enable **Email** provider
3. Configure email templates if desired

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Test the Flow

1. Open http://localhost:5173
2. You should see the AuthScreen (login/signup)
3. Create a new account with email + password
4. Verify profile created in Supabase dashboard
5. Events from localStorage should auto-migrate
6. Try creating/updating/deleting events

### 5. Verify Realtime Works

1. Open app in two browser tabs with same user
2. Create/edit an event in one tab
3. See it instantly update in the other tab

---

## What Was Migrated

### ✅ Completed
- Database schema (7 tables with RLS)
- Authentication system
- Calendar data layer (Supabase instead of localStorage)
- Realtime event synchronization
- Optimistic UI updates

### Preserved
- All UI components (no visual changes)
- All TypeScript contracts
- CalendarContext API (exact same methods)
- AI tool contract (manageCalendar)

### Pending (Agents E-H)
- Friends & sharing
- Push notifications (OneSignal)
- Backend KPIs
- AI proxy (Edge Function)

---

## Troubleshooting

**"Cannot connect to Supabase"**
- Check `.env.local` has correct URL/key
- Verify internet connection
- Check browser console for errors

**"Migration failed"**
- Ensure you're using correct project ref
- Check SQL syntax in migration files
- Try applying migrations one at a time

**"Events not syncing"**
- Verify RLS policies applied correctly
- Check browser console for auth errors
- Ensure realtime is enabled in Supabase project settings

---

## Next Agent (D Completion)

Once migrations are applied and auth works:
1. Test localStorage migration
2. Test CRUD operations
3. Verify realtime sync
4. Move to Agent E (Friends & Sharing)
