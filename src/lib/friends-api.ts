/**
 * Agent E: Friends & Sharing API
 * Supabase operations for friend management and event sharing
 */

import { supabase } from './supabase';
import { Friend } from '../../types';
// Notifications are now handled by DB triggers — no manual createNotification needed

// ============================================================================
// Type Definitions
// ============================================================================

export interface DBFriend {
    id: string;
    user_id: string;
    friend_id: string;
    status: 'friend' | 'pending' | 'suggested';
    friend_name: string;
    friend_handle: string;
    friend_avatar: string | null;
    created_at: string;
    updated_at: string;
}

export interface EventShare {
    event_id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'invited' | 'accepted' | 'declined';
}

// ============================================================================
// Format Conversion
// ============================================================================

function dbFriendToFrontend(dbFriend: DBFriend, currentUserId: string): Friend {
    const isSender = dbFriend.user_id === currentUserId;

    // If I am the sender, the "friend" is the receiver
    // If I am the receiver, the "friend" is the sender
    // Note: The DBFriend already has friend_name/handle/avatar cached for the "friend_id" user.
    // If currentUserId == friend_id, the cache is about ME, which is not what we want.
    // We need to be careful here. Currently the table caches "friend_id" data.

    return {
        id: isSender ? dbFriend.friend_id : dbFriend.user_id,
        name: dbFriend.friend_name, // This might need a join or better cache
        handle: dbFriend.friend_handle,
        avatar: dbFriend.friend_avatar || undefined,
        status: dbFriend.status === 'friend' ? 'friend' : (isSender ? 'pending' : 'suggested'),
        friendshipId: dbFriend.id,
    };
}

// ============================================================================
// Friend Operations
// ============================================================================

/**
 * Fetch all friends for the current user
 */
export async function fetchFriends(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching friends:', error);
        throw error;
    }

    // We need to handle the case where we are the friend_id and the cache is about us.
    // However, the current schema is a bit limited. Let's optimize it.
    // Actually, let's just fetch the data and map it correctly.

    const friendships: Friend[] = [];

    for (const friendship of data as DBFriend[]) {
        if (friendship.user_id === userId) {
            // Outgoing request or accepted friend
            friendships.push({
                id: friendship.friend_id,
                name: friendship.friend_name,
                handle: friendship.friend_handle,
                avatar: friendship.friend_avatar || undefined,
                status: friendship.status === 'friend' ? 'friend' : 'pending', // 'pending' means I followed them
                friendshipId: friendship.id,
            });
        } else {
            // Incoming request or accepted friend
            // For incoming requests, we need the sender's info. 
            // The cache currently only stores the friend (receiver) info.
            // Let's do a quick fetch for the sender info if it's an incoming request.

            if (friendship.status === 'friend') {
                // If accepted, we can assume the cache is okay if we store it on both sides,
                // but currently it's one row. Let's just fetch the profile.
                const { data: profile } = await supabase.from('profiles').select('user_name, handle, profile_image').eq('id', friendship.user_id).single();
                if (profile) {
                    friendships.push({
                        id: friendship.user_id,
                        name: profile.user_name,
                        handle: profile.handle,
                        avatar: profile.profile_image || undefined,
                        status: 'friend',
                        friendshipId: friendship.id,
                    });
                }
            } else {
                // Incoming pending request
                const { data: profile } = await supabase.from('profiles').select('user_name, handle, profile_image').eq('id', friendship.user_id).single();
                if (profile) {
                    friendships.push({
                        id: friendship.user_id,
                        name: profile.user_name,
                        handle: profile.handle,
                        avatar: profile.profile_image || undefined,
                        status: 'suggested', // We'll use suggested or a new type for "incoming" in the context
                        friendshipId: friendship.id,
                    });
                }
            }
        }
    }

    return friendships;
}

/**
 * Fetch suggested friends (2nd degree connections)
 */
export async function getSuggestedFriends(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
        .rpc('get_suggested_friends', { current_user_id: userId });

    if (error) {
        console.error('Error fetching suggested friends:', error);
        return [];
    }

    return (data || []).map(suggested => ({
        id: suggested.id,
        name: suggested.user_name || 'Usuario Sugerido',
        handle: suggested.handle || `@${suggested.user_name?.toLowerCase().replace(/\s+/g, '')}`,
        avatar: suggested.profile_image || undefined,
        status: 'suggested' as const,
        mutualFriends: suggested.mutual_friends_count,
        friendshipId: '' // No friendship ID yet
    }));
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
    fromUserId: string,
    toUserId: string
): Promise<Friend> {
    // First, fetch the friend's profile info
    const { data: friendProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_name, handle, profile_image, id')
        .eq('id', toUserId)
        .single();

    if (profileError) {
        console.error('Error fetching friend profile:', profileError);
        throw profileError;
    }

    // Create friend request
    const { data, error } = await supabase
        .from('friends')
        .insert({
            user_id: fromUserId,
            friend_id: toUserId,
            friend_name: friendProfile.user_name,
            friend_handle: friendProfile.handle,
            friend_avatar: friendProfile.profile_image,
            status: 'pending' as const,
        })
        .select()
        .single();

    if (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }

    return dbFriendToFrontend(data as DBFriend, fromUserId);
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
    friendshipId: string,
    userId: string
): Promise<void> {
    const { error } = await supabase
        .from('friends')
        .update({ status: 'friend' })
        .eq('id', friendshipId)
        .eq('friend_id', userId); // Only the recipient can accept

    if (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
    // Notification is now handled by the DB trigger (trigger_notify_friend_accepted)
}

/**
 * Reject/decline a friend request
 */
export async function rejectFriendRequest(
    friendshipId: string,
    userId: string
): Promise<void> {
    const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId)
        .eq('friend_id', userId); // Only the recipient can reject

    if (error) {
        console.error('Error rejecting friend request:', error);
        throw error;
    }
}

/**
 * Remove a friend (friendship) - Bidirectional deletion
 */
export async function removeFriend(
    friendshipId: string,
    userId: string
): Promise<void> {
    // First, get the friend's ID to ensure we delete both ways if duplicates exist
    const { data: friendship } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .eq('id', friendshipId)
        .single();

    if (friendship) {
        const otherId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;

        // Delete any record involving both users
        const { error } = await supabase
            .from('friends')
            .delete()
            .or(`and(user_id.eq.${userId},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${userId})`);

        if (error) {
            console.error('Error removing friend:', error);
            throw error;
        }
    } else {
        // Fallback: just try to delete by ID if record not found (might have been deleted already)
        await supabase.from('friends').delete().eq('id', friendshipId);
    }
}

/**
 * Search users by name or handle
 */
export async function searchUsers(query: string, currentUserId: string): Promise<Friend[]> {
    const formattedQuery = query.startsWith('@') ? query.slice(1) : query;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, handle, profile_image')
        .neq('id', currentUserId) // Exclude current user
        .or(`user_name.ilike.%${formattedQuery}%,handle.ilike.%${formattedQuery}%`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        throw error;
    }

    // Enhance results with mutual friends count
    // Optimized: Run parallel counts
    const enhancedResults = await Promise.all(data.map(async (profile) => {
        const { data: mutualCount, error: mutualError } = await supabase
            .rpc('get_mutual_friends_count', {
                user_a: currentUserId,
                user_b: profile.id
            });

        if (mutualError) console.warn('Error fetching mutual friends for', profile.id, mutualError);

        return {
            id: profile.id,
            name: profile.user_name,
            handle: profile.handle ? `@${profile.handle}` : `@${profile.user_name.toLowerCase().replace(/\s+/g, '')}`,
            avatar: profile.profile_image || undefined,
            status: 'suggested' as const,
            mutualFriends: mutualCount || 0
        };
    }));

    return enhancedResults;
}

// ============================================================================
// Event Sharing Operations
// ============================================================================

/**
 * Share an event with friends
 */
export async function shareEvent(
    eventId: string,
    friendIds: string[],
    role: 'editor' | 'viewer' = 'viewer',
    userId: string
): Promise<void> {
    // Create participant records for each friend
    const participants = friendIds.map(friendId => ({
        event_id: eventId,
        user_id: friendId,
        role,
        status: 'invited',
    }));

    const { error } = await supabase
        .from('event_participants')
        .insert(participants);

    if (error) {
        console.error('Error sharing event:', error);
        throw error;
    }

    // Notification is handled by the DB trigger (trigger_notify_event_invite)
    // which fires on event_participants INSERT

    console.log(`✅ Event ${eventId} shared with ${friendIds.length} friends`);
}

/**
 * Update sharing permissions for an event participant
 */
export async function updateEventParticipant(
    eventId: string,
    participantUserId: string,
    updates: { role?: 'editor' | 'viewer'; status?: 'accepted' | 'declined' }
): Promise<void> {
    const { error } = await supabase
        .from('event_participants')
        .update(updates)
        .eq('event_id', eventId)
        .eq('user_id', participantUserId);

    if (error) {
        console.error('Error updating event participant:', error);
        throw error;
    }
}

/**
 * Remove a participant from a shared event
 */
export async function removeEventParticipant(
    eventId: string,
    participantUserId: string
): Promise<void> {
    const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', participantUserId);

    if (error) {
        console.error('Error removing event participant:', error);
        throw error;
    }
}

/**
 * Get participants for an event
 */
export async function getEventParticipants(eventId: string): Promise<EventShare[]> {
    const { data, error } = await supabase
        .from('event_participants')
        .select('user_id, role, status')
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching event participants:', error);
        throw error;
    }

    return data.map(p => ({
        event_id: eventId,
        user_id: p.user_id,
        role: p.role as 'owner' | 'editor' | 'viewer',
        status: p.status as 'invited' | 'accepted' | 'declined',
    }));
}

// ============================================================================
// Realtime Subscriptions
// ============================================================================

/**
 * Subscribe to friend request changes
 */
export function subscribeToFriends(
    userId: string,
    callbacks: {
        onFriendRequest?: (friend: Friend) => void;
        onFriendAccepted?: (friend: Friend) => void;
        onFriendRemoved?: (friendId: string) => void;
    }
) {
    const channel = supabase
        .channel('friends_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'friends',
                filter: `friend_id=eq.${userId}`, // New friend requests TO this user
            },
            (payload) => {
                if (callbacks.onFriendRequest) {
                    const newFriend = dbFriendToFrontend(payload.new as DBFriend, userId);
                    callbacks.onFriendRequest(newFriend);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'friends',
                filter: `user_id=eq.${userId}`, // Updates to MY friend requests
            },
            (payload) => {
                const updated = payload.new as DBFriend;
                if (updated.status === 'friend' && callbacks.onFriendAccepted) {
                    callbacks.onFriendAccepted(dbFriendToFrontend(updated, userId));
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'friends',
            },
            (payload) => {
                if (callbacks.onFriendRemoved) {
                    const old = payload.old as DBFriend;
                    callbacks.onFriendRemoved(old.friend_id);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
