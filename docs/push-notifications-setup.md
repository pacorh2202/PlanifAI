# Push Notifications Setup - OneSignal Integration

## Overview
This document describes how to set up push notifications for PlanifAI using OneSignal.

## Prerequisites
- OneSignal account (free tier available)
- OneSignal App ID and API Key
- Supabase project with Edge Functions enabled

## Configuration Steps

### 1. OneSignal Setup (User Action Required)

1. Go to [OneSignal](https://onesignal.com/) and create an account
2. Create a new app for PlanifAI
3. Note down:
   - **App ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **REST API Key** (found in Settings → Keys & IDs)

### 2. Environment Variables

Add to `.env.local`:
```bash
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here
```

Add to Supabase secrets (for Edge Functions):
```bash
supabase secrets set ONESIGNAL_API_KEY=your_onesignal_api_key_here
```

### 3. OneSignal SDK Integration

The SDK will be automatically initialized when you provide the App ID.

Location: `src/lib/notifications-api.ts` (to be created)

### 4. Notification Triggers

Notifications will be sent for:

#### Friend Request Received
- **Title**: "Nueva solicitud de amistad"
- **Body**: "{friend_name} te ha enviado una solicitud"
- **Icon**: Friend's avatar
- **Action**: Navigate to Friends screen

#### Event Shared With You
- **Title**: "Evento compartido"
- **Body**: "{friend_name} compartió '{event_title}' contigo"
- **Icon**: PlanifAI logo
- **Action**: Navigate to Calendar with event highlighted

#### Shared Event Updated
- **Title**: "Evento actualizado"
- **Body**: "'{event_title}' ha sido modificado"
- **Icon**: PlanifAI logo
- **Action**: Navigate to Calendar

## Implementation Status

### ✅ Completed
- Database tables for notifications (`notifications`, `device_tokens`)
- Edge Function skeleton (`send-push-notification`)

### ⏸️ Pending (Needs OneSignal Credentials)
- [ ] OneSignal SDK integration
- [ ] Device token registration
- [ ] Notification trigger functions
- [ ] Edge Function deployment
- [ ] Testing on mobile devices

## Files Structure

```
src/lib/notifications-api.ts        # OneSignal SDK wrapper
supabase/functions/
  send-push-notification/
    index.ts                         # Edge Function to send notifications
    README.md                        # Deployment instructions
```

## Edge Function: send-push-notification

### Purpose
Securely send push notifications via OneSignal API without exposing the API key to clients.

### Authentication
Requires valid Supabase JWT token.

### Request Format
```typescript
POST /functions/v1/send-push-notification
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

{
  "user_ids": ["uuid1", "uuid2"],
  "title": "Notification title",
  "body": "Notification body",
  "data": {
    "type": "friend_request" | "event_shared" | "event_updated",
    "payload": { ... }
  }
}
```

### Response
```typescript
{
  "success": true,
  "recipients": 2,
  "onesignal_id": "notification_id"
}
```

## Testing Plan

Once credentials are provided:

1. **Device Token Registration**
   - Open app on mobile device
   - Grant notification permission
   - Verify token stored in database

2. **Friend Request Notification**
   - User A sends friend request to User B
   - User B receives notification
   - Tapping notification opens Friends screen

3. **Event Sharing Notification**
   - User A shares event with User B
   - User B receives notification
   - Tapping notification opens Calendar

4. **Event Update Notification**
   - User A updates shared event
   - User B receives notification
   - Tapping notification opens Calendar

## Cost Estimate
- **OneSignal Free Tier**: Up to 10,000 subscribers
- **Estimated usage**: ~50 notifications/user/month
- **100 users** = 5,000 notifications/month ✅ Free

## Next Steps

1. **User provides**: `ONESIGNAL_APP_ID` and `ONESIGNAL_API_KEY`
2. **AI implements**:
   - `src/lib/notifications-api.ts`
   - Complete Edge Function
   - Trigger integrations in `friends-api.ts` and `calendar-api.ts`
3. **User tests**: On mobile device (iOS/Android)

## Security Considerations

- ✅ API Key stored in Supabase secrets (server-side)
- ✅ Only authenticated users can trigger notifications
- ✅ Users can only send notifications to their friends
- ✅ Rate limiting via Supabase Edge Functions
- ✅ Device tokens linked to user_id via RLS

## Reference Links

- [OneSignal Documentation](https://documentation.onesignal.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Push Notifications Best Practices](https://documentation.onesignal.com/docs/sending-notifications)
