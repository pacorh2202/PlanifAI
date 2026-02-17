/**
 * Push Notification Token Registration
 * 
 * Handles registering OneSignal player_id from Despia native
 * into Supabase device_tokens table.
 */

import { supabase } from './supabase';

// Check if running inside Despia native wrapper
function isDespiaNative(): boolean {
    return typeof (window as any).webkit?.messageHandlers?.despia !== 'undefined'
        || typeof (window as any).Despia !== 'undefined'
        || /despia/i.test(navigator.userAgent);
}

/**
 * Get the OneSignal Player ID from Despia native bridge.
 * Despia exposes OneSignal via a JS bridge that we can query.
 */
async function getOneSignalPlayerId(): Promise<string | null> {
    try {
        // Method 1: Despia provides the player ID via a custom event or global
        if ((window as any).__onesignal_player_id) {
            return (window as any).__onesignal_player_id;
        }

        // Method 2: Try to get it from OneSignal Web SDK if available
        if ((window as any).OneSignal) {
            const playerId = await (window as any).OneSignal.getUserId();
            return playerId;
        }

        // Method 3: Listen for the Despia push token event
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 3000);

            window.addEventListener('despia-push-token', ((event: CustomEvent) => {
                clearTimeout(timeout);
                resolve(event.detail?.player_id || event.detail?.token || null);
            }) as EventListener, { once: true });

            // Trigger Despia to send us the token
            try {
                if ((window as any).webkit?.messageHandlers?.despia) {
                    (window as any).webkit.messageHandlers.despia.postMessage({
                        action: 'getPushToken'
                    });
                } else if ((window as any).Despia?.getPushToken) {
                    (window as any).Despia.getPushToken();
                }
            } catch (e) {
                console.warn('Could not request push token from Despia:', e);
                clearTimeout(timeout);
                resolve(null);
            }
        });
    } catch (e) {
        console.error('Error getting OneSignal player ID:', e);
        return null;
    }
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'web';
}

/**
 * Register the device push token in Supabase.
 * Call this after login.
 */
export async function registerPushToken(userId: string): Promise<void> {
    if (!isDespiaNative()) {
        console.log('Not running in Despia native — skipping push token registration');
        return;
    }

    console.log('Attempting to register push token for user:', userId);

    const playerId = await getOneSignalPlayerId();

    if (!playerId) {
        console.warn('Could not obtain OneSignal player_id — push notifications will not work');
        return;
    }

    console.log('Got OneSignal player_id:', playerId.substring(0, 8) + '...');

    const deviceType = getDeviceType();
    const deviceModel = navigator.userAgent.substring(0, 100);

    try {
        // Upsert: if this player_id already exists, update it; otherwise insert
        const { error } = await supabase
            .from('device_tokens')
            .upsert(
                {
                    user_id: userId,
                    player_id: playerId,
                    device_type: deviceType,
                    device_model: deviceModel,
                    is_active: true,
                    last_used_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id,player_id',
                    ignoreDuplicates: false
                }
            );

        if (error) {
            // If upsert fails due to missing unique constraint, try simple insert
            if (error.code === '42P10' || error.message.includes('unique')) {
                // Check if token already exists
                const { data: existing } = await supabase
                    .from('device_tokens')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('player_id', playerId)
                    .single();

                if (existing) {
                    // Update the existing record
                    await supabase
                        .from('device_tokens')
                        .update({ is_active: true, last_used_at: new Date().toISOString(), device_model: deviceModel })
                        .eq('id', existing.id);
                    console.log('Updated existing device token');
                } else {
                    // Insert new
                    const { error: insertError } = await supabase
                        .from('device_tokens')
                        .insert({
                            user_id: userId,
                            player_id: playerId,
                            device_type: deviceType,
                            device_model: deviceModel,
                            is_active: true,
                            last_used_at: new Date().toISOString()
                        });

                    if (insertError) {
                        console.error('Error inserting device token:', insertError);
                    } else {
                        console.log('Inserted new device token');
                    }
                }
            } else {
                console.error('Error upserting device token:', error);
            }
        } else {
            console.log('✅ Push token registered successfully');
        }
    } catch (e) {
        console.error('Failed to register push token:', e);
    }
}

/**
 * Deactivate push token on logout.
 */
export async function deactivatePushToken(userId: string): Promise<void> {
    try {
        await supabase
            .from('device_tokens')
            .update({ is_active: false })
            .eq('user_id', userId);
        console.log('Push tokens deactivated for user');
    } catch (e) {
        console.error('Error deactivating push tokens:', e);
    }
}
