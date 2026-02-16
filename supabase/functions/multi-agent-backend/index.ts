
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateEvent } from "./agents/validator.ts";
import { detectConflicts } from "./agents/conflict.ts";
import { processNotifications } from "./agents/notifier.ts";
import { calculateKPIs } from "./agents/kpi.ts";
import { findAvailableSlots } from "./agents/availability.ts";

console.log("🤖 Multi-Agent Backend Initialized");

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error("[Auth] Missing Authorization header");
            return new Response(
                JSON.stringify({ success: false, error: "Missing Authorization header" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // MANUAL AUTH VERIFICATION
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error("[Auth] Token validation failed:", authError);
            return new Response(
                JSON.stringify({ success: false, error: "Invalid Token", details: authError }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }


        const { actionType, eventData, userId, replaceEventId } = await req.json();

        console.log(`[Request] Action: ${actionType} User: ${userId}`);

        // ---------------------------------------------------------
        // NEW ACTION: findSlots (Availability Agent)
        // ---------------------------------------------------------
        if (actionType === 'findSlots') {
            const { participantIds, searchStart, searchEnd, durationMinutes, attendees } = eventData || {};

            if (!searchStart || !searchEnd) {
                return new Response(
                    JSON.stringify({ success: false, denialReason: "Faltan fechas para buscar disponibilidad." }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // RESOLVE ATTENDEES (HANDLES) TO UUIDs
            let targetUserIds: string[] = participantIds || [];
            const debugLogs: string[] = [];

            if ((!targetUserIds || targetUserIds.length === 0) && attendees && Array.isArray(attendees)) {
                console.log(`[Availability] Resolving handles: ${attendees.join(', ')}`);
                const handles = attendees
                    .map((h: string) => h.replace('@', '').trim())
                    .filter((h: string) => h.length > 0);

                if (handles.length > 0) {
                    const { data: profiles, error: profileError } = await supabaseClient
                        .from('profiles')
                        .select('id, handle')
                        .in('handle', handles);

                    if (profileError) {
                        console.error('[Availability] Error resolving handles:', profileError);
                        debugLogs.push(`Error resolving handles: ${profileError.message}`);
                    } else if (profiles) {
                        targetUserIds = profiles.map((p: any) => p.id);
                        console.log(`[Availability] Resolved ${handles.length} handles to ${targetUserIds.length} UUIDs`);
                        debugLogs.push(`Resolved handles: ${handles.join(', ')} -> ${targetUserIds.length} UUIDs`);

                        // Check if any handle wasn't found
                        const foundHandles = profiles.map((p: any) => p.handle);
                        const missingHandles = handles.filter((h: string) => !foundHandles.includes(h));
                        if (missingHandles.length > 0) {
                            debugLogs.push(`Warning: Could not find users: @${missingHandles.join(', @')}`);
                        }
                    }
                }
            }

            const availabilityResult = await findAvailableSlots(
                supabaseClient,
                userId,
                targetUserIds,
                searchStart,
                searchEnd,
                durationMinutes || 60
            );

            // Add our debug logs to the agent logs
            if (availabilityResult.message && debugLogs.length > 0) {
                availabilityResult.message += ` (${debugLogs.join('; ')})`;
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    data: availabilityResult.slots,
                    message: availabilityResult.message,
                    agentLogs: ["Agent Availability: Search complete"]
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

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
        // AGENT 6: KPI ANALYST (Stats calculation)
        // ---------------------------------------------------------
        const kpiResult = await calculateKPIs(supabaseClient, userId, processedData);

        // ---------------------------------------------------------
        // SUCCESS: Retornar datos procesados/saneados
        // ---------------------------------------------------------
        return new Response(
            JSON.stringify({
                success: true,
                data: processedData,
                kpi: kpiResult,
                agentLogs: [
                    "Agent 3 (Validator): OK",
                    "Agent 9 (Conflict): OK",
                    notificationResult.needsNotification ? "Agent 5 (Notifier): Triggered" : "Agent 5 (Notifier): Idle",
                    "Agent 6 (KPI Analyst): Metrics updated"
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
