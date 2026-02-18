/**
 * Push Notification Token Registration
 *
 * Handles registering OneSignal player_id from:
 * 1. Capacitor (iOS/Android) via onesignal-cordova-plugin
 * 2. Despia (native web wrapper) via JS bridge
 *
 * Stores tokens in Supabase device_tokens table.
 */

import { supabase } from './supabase';
import OneSignal from 'onesignal-cordova-plugin';

// --- Environment Detection ---

function isCapacitorNative(): boolean {
    return !!(window as any).Capacitor?.isNative;
}

function isDespiaNative(): boolean {
    return typeof (window as any).webkit?.messageHandlers?.despia !== 'undefined'
        || typeof (window as any).Despia !== 'undefined'
        || /despia/i.test(navigator.userAgent);
}

// --- Player ID Retrieval ---

/**
 * Get the OneSignal Player ID from available native bridges.
 */
async function getOneSignalPlayerId(): Promise<string | null> {
    try {
        // 1. Capacitor Native (iOS/Android)
        if (isCapacitorNative()) {
            console.log('Detecting Capacitor Native environment...');
            return new Promise((resolve) => {
                // Set limit to prevent hanging
                const timeout = setTimeout(() => {
                    console.warn('OneSignal getDeviceState timeout');
                    resolve(null);
                }, 5000);

                OneSignal.getDeviceState((state) => {
                    clearTimeout(timeout);
                    if (state && state.userId) {
                        console.log('Got Capacitor OneSignal userId:', state.userId);
                        resolve(state.userId);
                    } else {
                        console.warn('OneSignal state returned but no userId', state);
                        resolve(null);
                    }
                });
            });
        }

        // 2. Despia Native (Web Wrapper)
        if (isDespiaNative()) {
            console.log('Detecting Despia Native environment...');
            if ((window as any).__onesignal_player_id) {
                return (window as any).__onesignal_player_id;
            }

            return new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 3000);

                window.addEventListener('despia-push-token', ((event: CustomEvent) => {
                    clearTimeout(timeout);
                    resolve(event.detail?.player_id || event.detail?.token || null);
                }) as EventListener, { once: true });

                try {
                    if ((window as any).webkit?.messageHandlers?.despia) {
                        (window as any).webkit.messageHandlers.despia.postMessage({ action: 'getPushToken' });
                    } else if ((window as any).Despia?.getPushToken) {
                        (window as any).Despia.getPushToken();
                    }
                } catch (e) {
                    console.warn('Could not request push token from Despia:', e);
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
        }

        // 3. Web SDK (Fallback)
        if ((window as any).OneSignal) {
            return await (window as any).OneSignal.getUserId();
        }

        console.warn('No native push environment detected (not Capacitor, not Despia)');
        return null;

    } catch (e) {
        console.error('Error getting OneSignal player ID:', e);
        return null;
    }
}

// --- Initializer for Capacitor ---

/**
 * Initialize OneSignal for Capacitor.
 * Should be called once at app startup (e.g., in App.tsx or similar).
 */
export function initCapacitorOneSignal() {
    if (!isCapacitorNative()) return;

    // Use the User's provided App ID
    const ONESIGNAL_APP_ID = "95b31e0b-147f-485c-9e3e-0f1b2d7615f0";

    OneSignal.setAppId(ONESIGNAL_APP_ID);

    OneSignal.setNotificationOpenedHandler(function (jsonData) {
        console.log('notificationOpenedCallback: ' + JSON.stringify(jsonData));
    });

    // Prompt for push notifications
    OneSignal.promptForPushNotificationsWithUserResponse(function (accepted) {
        console.log("User accepted notifications: " + accepted);
    });
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): string {
    if (isCapacitorNative()) {
        const platform = (window as any).Capacitor.getPlatform(); // 'ios', 'android', 'web'
        return platform;
    }
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
    if (!isDespiaNative() && !isCapacitorNative()) {
        console.log('Not running in native app (Capacitor/Despia) — skipping push token registration');
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
            // Fallback for duplicates or constraints
            if (error.code === '42P10' || error.message.includes('unique')) {
                const { data: existing } = await supabase
                    .from('device_tokens')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('player_id', playerId)
                    .single();

                if (existing) {
                    await supabase
                        .from('device_tokens')
                        .update({ is_active: true, last_used_at: new Date().toISOString() })
                        .eq('id', existing.id);
                    console.log('Updated existing device token');
                } else {
                    // Retry insert? Usually upsert covers it. Just log.
                    console.error('Error upserting device token (possible conflict):', error);
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

        // Also clear from OneSignal if possible, or remove external id
        if (isCapacitorNative()) {
            OneSignal.removeExternalUserId();
        }
    } catch (e) {
        console.error('Error deactivating push tokens:', e);
    }
}
