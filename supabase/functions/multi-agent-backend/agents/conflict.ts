
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ConflictResult {
    hasConflict: boolean;
    details?: string;
}

export const detectConflicts = async (
    supabase: SupabaseClient,
    userId: string,
    eventData: any,
    replaceEventId?: string
): Promise<ConflictResult> => {

    if (!eventData.start || !eventData.end) {
        return { hasConflict: false }; // Cannot check without dates
    }

    const newStart = new Date(eventData.start).toISOString();
    const newEnd = new Date(eventData.end).toISOString();

    // Query for overlapping events
    // Logic: existing.start_time < newEnd AND existing.end_time > newStart
    let query = supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time')
        .eq('user_id', userId)
        .lt('start_time', newEnd)
        .gt('end_time', newStart);

    if (replaceEventId) {
        query = query.neq('id', replaceEventId);
    }

    const { data: conflicts, error } = await query;

    if (error) {
        console.error("Error checking conflicts:", error);
        return { hasConflict: false }; // Fail open (permitir si hay error de DB?)
        // Or fail closed? Better fail open to not block user specific actions if DB is glitchy, 
        // but maybe log it.
    }

    if (conflicts && conflicts.length > 0) {
        const conflictDetails = conflicts.map((c: any) =>
            `"${c.title}" (${new Date(c.start_time).toLocaleTimeString()} - ${new Date(c.end_time).toLocaleTimeString()})`
        ).join(', ');

        return {
            hasConflict: true,
            details: `Conflict with: ${conflictDetails}`
        };
    }

    return { hasConflict: false };
};
