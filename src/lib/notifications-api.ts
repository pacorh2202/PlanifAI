
import { supabase } from './supabase';
import { Database } from './database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];

/**
 * Fetch all notifications for a user, ordered by newest first.
 */
export async function fetchNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }

    return data || [];
}

/**
 * Create a new notification for a specific user.
 */
export async function createNotification(
    userId: string,
    type: Database['public']['Tables']['notifications']['Row']['type'],
    title: string,
    message: string,
    metadata: any = null
) {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            message,
            metadata,
            is_read: false
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating notification:', error);
        // Don't throw, just log. Notifications shouldn't break the main flow.
        return null;
    }

    return data;
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark ALL notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false); // Solo las que no están leídas

    if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Subscribe to realtime notifications for a user.
 */
export function subscribeToNotifications(userId: string, callbacks: {
    onInsert?: (notification: Notification) => void;
}) {
    const channel = supabase
        .channel(`notifications:user:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                if (callbacks.onInsert) {
                    callbacks.onInsert(payload.new as Notification);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
