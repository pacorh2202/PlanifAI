# PlanifAI AI Proxy Edge Function

## Purpose

Securely proxies requests to Google Gemini API, keeping the API key secret on the backend.

## Benefits

- ✅ API key stored in Supabase secrets (never exposed to client)
- ✅ User authentication validation
- ✅ Request/response logging for debugging
- ✅ Future: Rate limiting per user
- ✅ Future: Response caching for cost savings

## Deployment

```bash
# Deploy function
supabase functions deploy ai-proxy

# Set API key secret
supabase secrets set GEMINI_API_KEY="your_actual_key_here"
```

## Usage (Frontend)

```typescript
const response = await supabase.functions.invoke('ai-proxy', {
  body: {
    message: "Schedule gym at 5pm",
    history: [...chatHistory],
    tools: [manageCalendarTool]
  }
});

const aiResponse = response.data;
```

## Security

- Requires valid Supabase auth token
- CORS enabled for your domain only (in production)
- API key never sent to client
- Rate limiting (future): 100 requests/user/hour
