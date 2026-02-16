
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateEvent } from "./agents/validator.ts";
import { detectConflicts } from "./agents/conflict.ts";
import { processNotifications } from "./agents/notifier.ts";

console.log("🤖 Multi-Agent Backend Initialized");

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { actionType, eventData, userId, replaceEventId } = await req.json();

        console.log(`[Request] Action: ${actionType} User: ${userId}`);

        // ---------------------------------------------------------
        // AGENT 3: VALIDATOR (Rule-based consistency check)
        // ---------------------------------------------------------
        const validationResult = validateEvent(eventData);
        if (!validationResult.valid) {
            console.log(`[Agent 3] ❌ Validation failed: ${validationResult.reason}`);
            return new Response(
                JSON.stringify({ success: false, denialReason: validationResult.reason }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Si el validador modificó datos (ej: corrigió fechas), actualizamos
        let processedData = { ...eventData, ...validationResult.data };

        // ---------------------------------------------------------
        // AGENT 9: CONFLICT DETECTOR (Database check)
        // ---------------------------------------------------------
        // Solo chequeamos conflictos en creación o movimiento
        if (actionType === 'create' || actionType === 'move' || actionType === 'update') {
            const conflictResult = await detectConflicts(supabaseClient, userId, processedData, replaceEventId);

            if (conflictResult.hasConflict) {
                console.log(`[Agent 9] ⚠️ Conflict detected: ${conflictResult.details}`);
                return new Response(
                    JSON.stringify({
                        success: false,
                        denialReason: `Conflict detected: ${conflictResult.details}`,
                        // Opcional: devolver slots alternativos si el agente es listo
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // ---------------------------------------------------------
        // AGENT 5: NOTIFIER (Invitation audit)
        // ---------------------------------------------------------
        const notificationResult = processNotifications(processedData);

        // ---------------------------------------------------------
        // SUCCESS: Retornar datos procesados/saneados
        // ---------------------------------------------------------
        return new Response(
            JSON.stringify({
                success: true,
                data: processedData,
                agentLogs: [
                    "Agent 3 (Validator): OK",
                    "Agent 9 (Conflict): OK",
                    notificationResult.needsNotification ? "Agent 5 (Notifier): Triggered" : "Agent 5 (Notifier): Idle"
                ]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
