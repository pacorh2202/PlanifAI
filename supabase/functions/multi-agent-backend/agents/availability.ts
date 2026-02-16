import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SlotSuggestion {
    start: string;
    end: string;
    availableParticipants: string[];
    busyParticipants: string[];
}

export interface AvailabilityResult {
    success: boolean;
    slots: SlotSuggestion[];
    message?: string;
}

export async function findAvailableSlots(
    supabase: SupabaseClient,
    ownerId: string,
    participantIds: string[],
    searchStart: string,
    searchEnd: string,
    durationMinutes: number = 60
): Promise<AvailabilityResult> {
    console.log(`[Availability Agent] Searching slots for ${ownerId} + ${participantIds.join(', ')}`);

    // 1. Get busy slots for ALL participants
    const allUserIds = [ownerId, ...participantIds];
    const { data: busySlots, error } = await supabase.rpc('get_users_busy_slots', {
        target_user_ids: allUserIds,
        search_start: searchStart,
        search_end: searchEnd
    });

    if (error) {
        console.error('[Availability Agent] RPC Error:', error);
        return {
            success: false,
            slots: [],
            message: `Error al buscar disponibilidad: ${error.message || JSON.stringify(error)}`
        };
    }

    // 2. Simple slot search (every 30 mins)
    const start = new Date(searchStart);
    const end = new Date(searchEnd);
    const durationMs = durationMinutes * 60 * 1000;
    const stepMs = 30 * 60 * 1000;

    const suggestions: SlotSuggestion[] = [];
    let current = new Date(start);

    while (new Date(current.getTime() + durationMs) <= end && suggestions.length < 5) {
        const slotStart = current.toISOString();
        const slotEnd = new Date(current.getTime() + durationMs).toISOString();

        const busyInThisSlot = (busySlots || []).filter((b: any) => {
            return (slotStart < b.busy_end && slotEnd > b.busy_start);
        });

        const busyUserIds: string[] = [...new Set(busyInThisSlot.map((b: any) => b.participant_id))];
        const freeUserIds: string[] = allUserIds.filter(id => !busyUserIds.includes(id));

        // If everyone is free, prioritize it
        if (freeUserIds.length === allUserIds.length) {
            suggestions.push({
                start: slotStart,
                end: slotEnd,
                availableParticipants: freeUserIds,
                busyParticipants: []
            });
            // Skip the duration to avoid overlapping suggestions
            current = new Date(current.getTime() + durationMs);
            continue;
        }

        // If at least most are free (e.g. N-1), keep as fallback
        if (freeUserIds.length >= Math.max(2, allUserIds.length - 1)) {
            suggestions.push({
                start: slotStart,
                end: slotEnd,
                availableParticipants: freeUserIds,
                busyParticipants: busyUserIds
            });
        }

        current = new Date(current.getTime() + stepMs);
    }

    // Sort by most participants first
    suggestions.sort((a, b) => b.availableParticipants.length - a.availableParticipants.length);

    if (suggestions.length === 0) {
        return {
            success: true,
            slots: [],
            message: "No encontré huecos disponibles donde estuviérais la mayoría. ¿Quieres probar con otro rango?"
        };
    }

    return { success: true, slots: suggestions.slice(0, 3) };
}
