import { supabase, Tables, Inserts, Updates } from './supabase';
import { createNotification } from './notifications-api';

// Calendar Event API types matching database schema
type DBCalendarEvent = Tables<'calendar_events'>;
type NewCalendarEvent = Inserts<'calendar_events'>;
type UpdateCalendarEvent = Updates<'calendar_events'>;

/**
 * Convert database event format to frontend CalendarEvent format
 * Database uses snake_case, frontend uses camelCase
 */
function dbEventToFrontend(dbEvent: DBCalendarEvent): any {
    try {
        return {
            id: dbEvent.id,
            title: dbEvent.title,
            descriptionPoints: dbEvent.description_points || undefined,
            start: dbEvent.start_time,
            end: dbEvent.end_time,
            allDay: dbEvent.all_day,
            type: dbEvent.event_type,
            categoryLabel: dbEvent.category_label || undefined,
            status: dbEvent.status,
            location: dbEvent.location || undefined,
            attendees: dbEvent.attendees || undefined,
            color: dbEvent.color || undefined,
            creationSource: dbEvent.creation_source as any,
            emotionalImpact: dbEvent.emotional_impact as any,
            recurrenceId: dbEvent.recurrence_id || undefined,
        };
    } catch (error) {
        console.error('Error converting DB event to frontend:', error);
        return null;
    }
}

/**
 * Convert frontend CalendarEvent format to database format
 */
function frontendEventToDB(
    event: any, // Changed to any to match the instruction's implied type
    userId: string
): any { // Use any or a custom intermediate type to avoid strict New/Update mismatch during creation
    return {
        user_id: userId,
        title: event.title,
        description_points: event.descriptionPoints || null,
        start_time: event.start,
        end_time: event.end,
        all_day: event.allDay ?? false,
        event_type: event.type,
        category_label: event.categoryLabel || null,
        status: event.status || 'scheduled',
        location: event.location || null,
        attendees: event.attendees || null,
        // color: event.color || null, // Removed as per instruction
        creation_source: event.creationSource || 'manual',
        emotional_impact: event.emotionalImpact || 'neutral',
        recurrence_id: event.recurrenceId || null, // Added recurrence_id
    };
}

export async function acceptRecurringInvitation(recurrenceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('accept_recurring_invitation', {
        p_recurrence_id: recurrenceId,
        p_user_id: user.id
    });

    if (error) {
        console.error('Error accepting recurring invitation:', error);
        throw error;
    }
}

export async function rejectRecurringInvitation(recurrenceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('reject_recurring_invitation', {
        p_recurrence_id: recurrenceId,
        p_user_id: user.id
    });

    if (error) {
        console.error('Error rejecting recurring invitation:', error);
        throw error;
    }
}

/**
 * Fetch all calendar events visible to the user
 * Uses SECURITY DEFINER function to include own + shared accepted events
 * WITHOUT triggering RLS recursion
 */
export async function fetchEvents(userId: string) {
    try {
        // NUEVA IMPLEMENTACIÓN: Single RPC call
        // Retorna eventos propios + eventos compartidos aceptados
        const { data, error } = await supabase
            .rpc('get_user_visible_events');

        if (error) {
            console.error('Error fetching events via SECURITY DEFINER:', error);
            throw error;
        }

        // Convert DB format → Frontend format
        return (data || [])
            .map(dbEventToFrontend)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    } catch (error) {
        console.error('Error in fetchEvents:', error);
        return [];
    }
}

/**
 * Helper to fetch inviter details
 */
async function getInviterDetails(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_name')
        .eq('id', userId)
        .single();

    return { name: data?.user_name || 'Alguien', error };
}

/**
 * Create a new calendar event
 * @returns The created event with generated ID
 */
export async function createEvent(event: any, userId: string) {
    const dbEvent = frontendEventToDB(event, userId);

    const { data, error } = await supabase
        .from('calendar_events')
        .insert(dbEvent)
        .select()
        .single();

    if (error) {
        console.error('Error creating event:', error);
        throw error;
    }

    // Handle participants if provided (handles/IDs passed in event.participantIds)
    if (event.participantIds && Array.isArray(event.participantIds) && event.participantIds.length > 0) {
        const participants = event.participantIds.map((pId: string) => ({
            event_id: data.id,
            user_id: pId,
            role: 'viewer' as const,
            status: 'invited' as const,
        }));

        const { error: partError } = await supabase
            .from('event_participants')
            .insert(participants);

        if (partError) {
            console.error('Error adding participants:', partError);
            alert(`Error al invitar amigos: ${partError.message}`);
        } else {
            // Manual Notification via Secure RPC
            // Fetch inviter name
            const { name: inviterName } = await getInviterDetails(userId);

            // Send notification to each participant
            for (const pId of event.participantIds) {
                // @ts-ignore - RPC not yet in types
                const { error: notifError } = await supabase.rpc('send_event_invitation', {
                    p_user_id: pId,
                    p_event_id: data.id,
                    p_title: 'Nueva Invitación 📅',
                    p_message: `${inviterName} te ha invitado a "${event.title}"`,
                    p_metadata: {
                        eventId: data.id,
                        role: 'viewer',
                        invitedBy: userId,
                        eventTitle: event.title,
                        categoryType: event.type,
                        categoryLabel: event.categoryLabel,
                        startTime: event.start,
                        endTime: event.end
                    }
                });

                if (notifError) console.error('Error sending notification RPC:', notifError);
            }
        }
    }

    return dbEventToFrontend(data);
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(eventId: string, updates: any, userId: string) {
    // Only include fields that are being updated
    const dbUpdates: any = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.descriptionPoints !== undefined) dbUpdates.description_points = updates.descriptionPoints;
    if (updates.start !== undefined) dbUpdates.start_time = updates.start;
    if (updates.end !== undefined) dbUpdates.end_time = updates.end;
    if (updates.allDay !== undefined) dbUpdates.all_day = updates.allDay;
    if (updates.type !== undefined) dbUpdates.event_type = updates.type;
    if (updates.categoryLabel !== undefined) dbUpdates.category_label = updates.categoryLabel;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.attendees !== undefined) dbUpdates.attendees = updates.attendees;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.creationSource !== undefined) dbUpdates.creation_source = updates.creationSource;
    if (updates.emotionalImpact !== undefined) dbUpdates.emotional_impact = updates.emotionalImpact;
    if (updates.recurrenceId !== undefined) dbUpdates.recurrence_id = updates.recurrenceId;

    const { data: updatedEvent, error } = await supabase
        .from('calendar_events')
        .update(dbUpdates)
        .eq('id', eventId)
        .select()
        .single();

    if (error) {
        console.error('Error updating event:', error);
        throw error;
    }

    // Update participants if provided (Smart Delta Update)
    if (updates.participantIds && Array.isArray(updates.participantIds)) {
        // 1. Fetch existing participants
        const { data: existingParticipants, error: fetchError } = await supabase
            .from('event_participants')
            .select('user_id')
            .eq('event_id', eventId);

        if (fetchError) {
            console.error('Error fetching existing participants:', fetchError);
        }

        const currentIds = (existingParticipants || []).map(p => p.user_id);
        const newIds = updates.participantIds;

        // 2. Calculate diffs
        const toAdd = newIds.filter((id: string) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id: string) => !newIds.includes(id));

        // 3. Remove deleted participants
        if (toRemove.length > 0) {
            await supabase
                .from('event_participants')
                .delete()
                .eq('event_id', eventId)
                .in('user_id', toRemove);
        }

        // 4. Add new participants
        if (toAdd.length > 0) {
            const participantsToAdd = toAdd.map((pId: string) => ({
                event_id: eventId,
                user_id: pId,
                role: 'viewer' as const,
                status: 'invited' as const,
            }));

            const { error: insertError } = await supabase
                .from('event_participants')
                .insert(participantsToAdd);

            if (insertError) {
                console.error('Error adding new participants:', insertError);
                alert(`Error al invitar nuevos participantes: ${insertError.message}`);
            } else {
                // Manual Notification via Secure RPC
                const { name: inviterName } = await getInviterDetails(userId);

                // Use the updated event title if available, otherwise fallback (though update returns it)
                const eventTitle = updatedEvent.title;

                for (const pId of toAdd) {
                    // @ts-ignore - RPC not yet in types
                    const { error: notifError } = await supabase.rpc('send_event_invitation', {
                        p_user_id: pId,
                        p_event_id: eventId,
                        p_title: 'Nueva Invitación 📅',
                        p_message: `${inviterName} te ha invitado a "${eventTitle}"`,
                        p_metadata: {
                            eventId: eventId,
                            role: 'viewer',
                            invitedBy: userId,
                            eventTitle: eventTitle,
                            categoryType: updatedEvent.event_type,
                            categoryLabel: updatedEvent.category_label,
                            startTime: updatedEvent.start_time,
                            endTime: updatedEvent.end_time
                        }
                    });

                    if (notifError) console.error('Error sending notification RPC:', notifError);
                }
            }
        }
    }

    return dbEventToFrontend(updatedEvent);
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(eventId: string, userId: string) {
    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId); // Ensure user owns this event

    if (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

/**
 * Subscribe to realtime calendar event changes
 * @param userId - User ID to filter events
 * @param onInsert - Callback when new event is created
 * @param onUpdate - Callback when event is updated
 * @param onDelete - Callback when event is deleted
 * @returns Unsubscribe function
 */
export function subscribeToEvents(
    userId: string,
    callbacks: {
        onInsert?: (event: any) => void;
        onUpdate?: (event: any) => void;
        onDelete?: (eventId: string) => void;
    }
) {
    const channel = supabase
        .channel('calendar_events_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'calendar_events',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                if (callbacks.onInsert) {
                    const newEvent = dbEventToFrontend(payload.new as DBCalendarEvent);
                    callbacks.onInsert(newEvent);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'calendar_events',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                if (callbacks.onUpdate) {
                    const updatedEvent = dbEventToFrontend(payload.new as DBCalendarEvent);
                    callbacks.onUpdate(updatedEvent);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'calendar_events',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                if (callbacks.onDelete) {
                    callbacks.onDelete((payload.old as DBCalendarEvent).id);
                }
            }
        )
        .subscribe();

    // Return unsubscribe function
    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Migrate localStorage events to Supabase
 * This runs once on first login after migration
 */
export async function migrateLocalStorageToSupabase(userId: string) {
    try {
        const localEvents = localStorage.getItem('planai_events');
        if (!localEvents) return { migrated: 0 };

        const events = JSON.parse(localEvents);
        if (!Array.isArray(events) || events.length === 0) return { migrated: 0 };

        // Convert and insert all events
        const dbEvents = events.map(event => frontendEventToDB(event, userId));

        const { data, error } = await supabase
            .from('calendar_events')
            .insert(dbEvents)
            .select();

        if (error) {
            console.error('Error migrating events:', error);
            throw error;
        }

        // Clear localStorage after successful migration
        localStorage.removeItem('planai_events');
        console.log(`✅ Migrated ${data.length} events from localStorage to Supabase`);

        return { migrated: data.length, events: data.map(dbEventToFrontend) };
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

/**
 * Log a user activity (for Time Saved metric)
 */
export async function logActivity(userId: string, activityType: string, metadata: any = {}) {
    const { error } = await supabase
        .from('user_activity_logs')
        .insert({
            user_id: userId,
            activity_type: activityType,
            metadata
        });

    if (error) {
        console.error('Error logging activity:', error);
    }
}
