import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log('Received suggestion payload:', payload)

        // The database webhook sends the row data in payload.record
        const suggestion = payload.record
        if (!suggestion || !suggestion.message) {
            throw new Error('No valid suggestion found in payload')
        }

        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not set. Email not sent.')
            return new Response(
                JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'PlanifAI <onboarding@resend.dev>', // Change this once domain is verified
                to: ['pacoriquelme22@gmail.com'],
                subject: 'Nueva sugerencia recibida en PlanifAI',
                html: `
          <h1>Nueva sugerencia</h1>
          <p><strong>Mensaje:</strong> ${suggestion.message}</p>
          <p><strong>Fecha:</strong> ${new Date(suggestion.created_at).toLocaleString()}</p>
          <p><strong>User ID:</strong> ${suggestion.user_id}</p>
        `,
            }),
        })

        const data = await res.json()
        console.log('Resend response:', data)

        return new Response(
            JSON.stringify(data),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error in send-suggestion-email function:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
