
import { supabase } from '../lib/supabase';

export interface MultiAgentResponse {
    success: boolean;
    data?: any;
    error?: string;
    denialReason?: string;
    agentLogs?: string[];
}

export const MultiAgentService = {
    /**
     * Envía una acción al backend multi-agente para validación y procesamiento.
     */
    async validateAndProcess(
        actionType: string,
        eventData: any,
        userId: string,
        replaceEventId?: string,
        eventId?: string       // For update/move: the ID of the event being modified
    ): Promise<MultiAgentResponse> {
        try {
            console.log('[MultiAgentService] 📤 Sending request to backend:', { actionType });

            // FORCE SESSION REFRESH CHECK
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.warn('[MultiAgentService] ⚠️ No active session found. Request might fail.', sessionError);
            } else {
                console.log('[MultiAgentService] 🔑 Authorized as:', session.user.id);
            }

            const { data, error } = await supabase.functions.invoke('multi-agent-backend', {
                body: {
                    actionType,
                    eventData,
                    userId,
                    replaceEventId,
                    eventId           // Pass for self-conflict exclusion
                },
                // Explicitly pass the token to be safe, though invoke does it automatically
                headers: session ? {
                    Authorization: `Bearer ${session.access_token}`
                } : undefined
            });

            if (error) {
                console.error('[MultiAgentService] 🚨 Supabase Function Error:', error);

                // Detailed 401 logging
                if (error.code === '401' || error.message?.includes('401')) {
                    console.error('[MultiAgentService] 🚫 401 Unauthorized. Token might be expired or missing.');
                }

                return { success: false, error: error.message };
            }

            console.log('[MultiAgentService] 📥 Received response:', data);
            return data as MultiAgentResponse;

        } catch (err) {
            console.error('[MultiAgentService] 💥 Unexpected Error:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    }
};
