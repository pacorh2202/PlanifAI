
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ConflictResult {
    hasConflict: boolean;
    details?: string;
}

export const detectConflicts = async (
    supabase: SupabaseClient,
    userId: string,
    eventData: any,
    replaceEventId?: string,
    eventId?: string      // For update/move: exclude the event itself from conflict check
): Promise<ConflictResult> => {

    if (!eventData.start || !eventData.end) {
        return { hasConflict: false }; // Cannot check without dates
    }

    const newStart = new Date(eventData.start).toISOString();
    const newEnd = new Date(eventData.end).toISOString();

    // Query for overlapping events
    let query = supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time')
        .eq('user_id', userId)
        .lt('start_time', newEnd)
        .gt('end_time', newStart);

    // Exclude the event being replaced (conflict resolution)
    if (replaceEventId) {
        query = query.neq('id', replaceEventId);
    }

    // Exclude the event itself when updating/moving (self-conflict)
    if (eventId) {
        query = query.neq('id', eventId);
    }

    const { data: conflicts, error } = await query;

    if (error) {
        console.error("Error checking conflicts:", error);
        return { hasConflict: false }; // Fail open
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
