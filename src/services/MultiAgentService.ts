
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
        replaceEventId?: string
    ): Promise<MultiAgentResponse> {
        try {
            console.log('[MultiAgentService] 📤 Sending request to backend:', { actionType });

            const { data, error } = await supabase.functions.invoke('multi-agent-backend', {
                body: {
                    actionType,
                    eventData,
                    userId,
                    replaceEventId
                }
            });

            if (error) {
                console.error('[MultiAgentService] 🚨 Supabase Function Error:', error);
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
