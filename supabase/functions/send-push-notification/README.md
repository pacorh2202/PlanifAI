# Send Push Notification - Supabase Edge Function

## Purpose
Securely send push notifications to users via OneSignal without exposing the API key to clients.

## Prerequisites
- OneSignal App ID and API Key configured in Supabase secrets
- Device tokens registered in `device_tokens` table

## Deployment

```bash
# Set OneSignal credentials in Supabase
supabase secrets set ONESIGNAL_APP_ID=your_app_id_here
supabase secrets set ONESIGNAL_API_KEY=your_api_key_here

# Deploy the function
supabase functions deploy send-push-notification
```

## Usage

### Request
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["user-uuid-1", "user-uuid-2"],
    "title": "Nueva solicitud de amistad",
    "body": "Juan te ha enviado una solicitud",
    "data": {
      "type": "friend_request",
      "payload": {
        "friend_id": "friend-uuid",
        "friendship_id": "friendship-uuid"
      }
    }
  }'
```

### Response (Success)
```json
{
  "success": true,
  "recipients": 2,
  "onesignal_id": "notification-id-from-onesignal"
}
```

### Response (Error)
```json
{
  "error": "Error message"
}
```

## Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_ids` | `string[]` | ✅ | Array of user UUIDs to notify |
| `title` | `string` | ✅ | Notification title |
| `body` | `string` | ✅ | Notification body text |
| `data` | `object` | ❌ | Additional data payload |
| `data.type` | `string` | ❌ | Notification type: `friend_request`, `event_shared`, `event_updated` |
| `data.payload` | `any` | ❌ | Type-specific payload |

## Integration Examples

### Friend Request Notification
```typescript
import { supabase } from './lib/supabase'

async function sendFriendRequestNotification(recipientId: string, senderName: string, friendshipId: string) {
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: [recipientId],
      title: 'Nueva solicitud de amistad',
      body: `${senderName} te ha enviado una solicitud`,
      data: {
        type: 'friend_request',
        payload: {
          friendship_id: friendshipId
        }
      }
    }
  })

  if (error) console.error('Error sending notification:', error)
  return data
}
```

### Event Shared Notification
```typescript
async function sendEventSharedNotification(
  userIds: string[], 
  sharer: string, 
  eventTitle: string,
  eventId: string
) {
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: userIds,
      title: 'Evento compartido',
      body: `${sharer} compartió "${eventTitle}" contigo`,
      data: {
        type: 'event_shared',
        payload: {
          event_id: eventId
        }
      }
    }
  })

  if (error) console.error('Error sending notification:', error)
  return data
}
```

## Security

- ✅ Requires valid Supabase JWT
- ✅ OneSignal API key stored server-side
- ✅ User can only send to their friends (implement validation)
- ✅ Rate limiting via Supabase Edge Functions
- ✅ RLS on `device_tokens` table

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Missing authorization header | No JWT provided |
| 401 | Unauthorized | Invalid or expired JWT |
| 400 | Missing required fields | `user_ids`, `title`, or `body` missing |
| 500 | Failed to fetch device tokens | Database error |
| 500 | Failed to send notification | OneSignal API error |

## Testing

```bash
# Test with real JWT
export SUPABASE_JWT="your-jwt-token"
export PROJECT_URL="your-project.supabase.co"

curl -X POST \
  "https://${PROJECT_URL}/functions/v1/send-push-notification" \
  -H "Authorization: Bearer ${SUPABASE_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["test-user-id"],
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

## Monitoring

View function logs:
```bash
supabase functions logs send-push-notification
```

## Future Enhancements

- [ ] Batch notification support (>1000 users)
- [ ] Scheduled notifications
- [ ] Notification templates
- [ ] A/B testing support
- [ ] Analytics integration
