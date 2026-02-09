// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
    user_ids: string[]
    title: string
    body: string
    data?: {
        type: 'friend_request' | 'event_shared' | 'event_updated'
        payload: any
    }
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get OneSignal API key from environment
        const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
        const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')

        if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
            throw new Error('OneSignal credentials not configured')
        }

        // Verify authentication
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Get authenticated user
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const notificationReq: NotificationRequest = await req.json()
        const { user_ids, title, body, data } = notificationReq

        if (!user_ids || !title || !body) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: user_ids, title, body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get device tokens for target users
        const { data: tokens, error: tokensError } = await supabaseClient
            .from('device_tokens')
            .select('token, user_id')
            .in('user_id', user_ids)
            .eq('platform', 'web') // or 'ios'/'android' based on your setup

        if (tokensError) {
            console.error('Error fetching device tokens:', tokensError)
            return new Response(
                JSON.stringify({ error: 'Failed to fetch device tokens' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!tokens || tokens.length === 0) {
            return new Response(
                JSON.stringify({ success: true, recipients: 0, message: 'No devices to notify' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Send notification via OneSignal
        const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_API_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_player_ids: tokens.map(t => t.token),
                headings: { en: title },
                contents: { en: body },
                data: data || {},
            })
        })

        const oneSignalData = await oneSignalResponse.json()

        if (!oneSignalResponse.ok) {
            console.error('OneSignal error:', oneSignalData)
            return new Response(
                JSON.stringify({ error: 'Failed to send notification', details: oneSignalData }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Store notification in database
        const { error: insertError } = await supabaseClient
            .from('notifications')
            .insert(
                user_ids.map(userId => ({
                    user_id: userId,
                    title,
                    message: body,
                    type: data?.type || 'info',
                    data: data?.payload || {},
                }))
            )

        if (insertError) {
            console.error('Error storing notification:', insertError)
        }

        return new Response(
            JSON.stringify({
                success: true,
                recipients: tokens.length,
                onesignal_id: oneSignalData.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in send-push-notification:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
