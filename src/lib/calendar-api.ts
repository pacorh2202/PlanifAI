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
    };
}

/**
 * Convert frontend CalendarEvent format to database format
 */
function frontendEventToDB(
    event: any,
    userId: string
): any {
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
        color: event.color || null,
    };
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
        }

        // Notificaciones creadas automáticamente por trigger de base de datos
        // Ver: supabase/migrations/20260204120000_notifications_trigger.sql
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

    const { data, error } = await supabase
        .from('calendar_events')
        .update(dbUpdates)
        .eq('id', eventId)
        // .eq('user_id', userId) // Removed to allow participants with edit rights (Agent E expansion)
        .select()
        .single();

    if (error) {
        console.error('Error updating event:', error);
        throw error;
    }

    // Update participants if provided
    if (updates.participantIds && Array.isArray(updates.participantIds)) {
        // Delete existing and re-insert (simple sync)
        await supabase.from('event_participants').delete().eq('event_id', eventId);

        if (updates.participantIds.length > 0) {
            const participants = updates.participantIds.map((pId: string) => ({
                event_id: eventId,
                user_id: pId,
                role: 'viewer' as const,
                status: 'invited' as const,
            }));
            const { error: partError } = await supabase.from('event_participants').insert(participants);

            if (!partError) {
                // Notificaciones creadas automáticamente por trigger de base de datos
                // Ver: supabase/migrations/20260204120000_notifications_trigger.sql
            } else {
                alert(`Error al actualizar invitaciones: ${partError.message}`);
            }
        }
    }

    return dbEventToFrontend(data);
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
