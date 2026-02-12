// Follow this setup for the edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookEvent {
    event: {
        type: string
        app_user_id: string
        entitlement_ids: string[]
        expiration_at_ms?: number
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')

        if (!expectedSecret || authHeader !== expectedSecret) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const payload: WebhookEvent = await req.json()
        const { event } = payload
        const { app_user_id, entitlement_ids, type } = event

        console.log(`Received event ${type} for user ${app_user_id}`)

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let newTier = 'free'

        // Determine tier based on entitlements
        // Logic: Premium overwrites Pro. If neither, fallback to Free.
        if (entitlement_ids && entitlement_ids.includes('premium')) {
            newTier = 'premium'
        } else if (entitlement_ids && entitlement_ids.includes('pro')) {
            newTier = 'pro'
        }

        // Handle expiration specifically if needed (though entitlement_ids should be empty if expired)
        // RevenueCat usually sends empty entitlement_ids on expiration events, but let's be safe.
        if (type === 'EXPIRATION' && (!entitlement_ids || entitlement_ids.length === 0)) {
            newTier = 'free'
        }

        // Update User Profile
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ subscription_tier: newTier })
            .eq('id', app_user_id)

        if (updateError) {
            console.error('Error updating profile:', updateError)
            return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ success: true, tier: newTier }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
