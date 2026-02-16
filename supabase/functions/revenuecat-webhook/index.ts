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
        product_id: string
        expiration_at_ms?: number
        environment: string
        period_type: string
    }
    api_version: string
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        // Mapped to REVENUECAT_WEBHOOK_SECRET in Supabase dashboard
        const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')

        if (!expectedSecret || authHeader !== expectedSecret) {
            console.error('Unauthorized webhook attempt')
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const payload: WebhookEvent = await req.json()
        const { event } = payload
        const { app_user_id, product_id, expiration_at_ms, environment } = event

        console.log(`Received event type: ${event.type} for user: ${app_user_id}`)

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Determine Plan Logic
        let plan = 'free'
        let isActive = false

        // Check cancellation/expiration events first
        const isExpired = event.type === 'EXPIRATION' || event.type === 'CANCELLATION' // Depends on RC version, usually EXPIRATION means access lost. 
        // Actually, RC sends CANCELLATION when auto-renew is off, but access remains until expiration.
        // EXPIRATION is when access is actually lost.

        // However, user logic is simple: map product_id to plan.
        // We need to determine if it's an active subscription.
        // If type is EXPIRATION, it's inactive.
        // If type is INITIAL_PURCHASE, RENEWAL, UNCHANCELLED -> active.

        const activeEvents = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE']

        if (activeEvents.includes(event.type)) {
            isActive = true
            if (product_id.includes('pro_access')) {
                plan = 'pro'
            } else if (product_id.includes('plus_access')) {
                plan = 'plus'
            }
        } else if (event.type === 'EXPIRATION') {
            isActive = false
            plan = 'free'
        } else {
            // For other events like BILLING_ISSUE, CANCELLATION (auto-renew off), keep current status or handle carefully.
            // User requested robust polling. Let's assume critical status updates trigger writes.
            // For safety, if it's just 'CANCELLATION', it usually means auto-renew off, but user is still active until expiration.
            // We use expiration_at_ms to verify validity if needed, but for now let's stick to the prompt's logic:
            // "Guardar/actualizar en DB tabla subscriptions"
            if (event.type === 'CANCELLATION') {
                // Do not mark as inactive immediately, wait for expiration
                // querying current state or relying on expiration_at_ms
                // Let's rely on the incoming event to dictate "Active" status if possible, or just update the metadata
                // For now, allow flow-through, assuming expiration handles the 'false' state.
                isActive = true // Logic: User still has access
                if (product_id.includes('pro_access')) plan = 'pro'
                else if (product_id.includes('plus_access')) plan = 'plus'
            }
        }

        const subscriptionData = {
            user_id: app_user_id,
            plan: plan,
            product_id: product_id,
            is_active: isActive,
            environment: environment,
            expires_at: expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null,
            updated_at: new Date().toISOString()
        }

        // Upsert into subscriptions table
        const { error: errorSub } = await supabaseAdmin
            .from('subscriptions')
            .upsert(subscriptionData)

        if (errorSub) {
            console.error('Error updating subscription table:', errorSub)
            throw errorSub
        }

        // Also update profiles table for redundancy/easier frontend access if needed (optional based on user request "desbloquear Pro/Plus")
        // User request: "El frontend detecta el cambio ... y desbloquea Pro/Plus"
        // It's safer to keep profile in sync for legacy checks
        if (isActive) {
            await supabaseAdmin.from('profiles').update({ subscription_tier: plan }).eq('id', app_user_id)
        } else if (event.type === 'EXPIRATION') {
            await supabaseAdmin.from('profiles').update({ subscription_tier: 'free' }).eq('id', app_user_id)
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Webhook Error:', error)
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
