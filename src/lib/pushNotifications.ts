/**
 * Push Notification Token Registration
 *
 * Handles registering OneSignal player_id (Subscription ID) from:
 * 1. Capacitor (iOS/Android) via onesignal-cordova-plugin (v5+)
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
    const isDespia = typeof (window as any).webkit?.messageHandlers?.despia !== 'undefined'
        || typeof (window as any).Despia !== 'undefined'
        || typeof (window as any).despia !== 'undefined'
        || /despia/i.test(navigator.userAgent);

    // DEBUG: Alert only if it looks like we might be in Despia but detection failed, or just to confirm.
    // console.log('isDespiaNative:', isDespia); 
    return isDespia;
}

// --- Subscription ID Retrieval ---

/**
 * Get the OneSignal Subscription ID from available native bridges.
 */
async function getOneSignalSubscriptionId(): Promise<string | null> {
    try {
        // 1. Capacitor Native (iOS/Android) - SDK v5
        if (isCapacitorNative()) {
            console.log('Detecting Capacitor Native environment (v5)...');

            // In v5, we access the subscription ID via the User namespace
            const subId = OneSignal.User.pushSubscription.id;
            const optedIn = OneSignal.User.pushSubscription.optedIn;

            if (subId && optedIn) {
                console.log('Got Capacitor OneSignal Subscription ID:', subId);
                return subId;
            }

            // If not available immediately, wait a bit or return null
            // For v5, we can listen for subscription changes.
            return new Promise((resolve) => {
                let resolved = false;
                const resolveId = (id: string) => {
                    if (resolved) return;
                    resolved = true;
                    // Cleanup
                    clearInterval(checkInterval);
                    OneSignal.User.pushSubscription.removeEventListener('change', changeListener);
                    console.log('Got Subscription ID:', id);
                    resolve(id);
                };

                // 1. Polling (Backup)
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    const id = OneSignal.User.pushSubscription.id;
                    const optedIn = OneSignal.User.pushSubscription.optedIn;

                    if (id && optedIn) { // Only resolve if opted in? Or just if ID exists? ID is enough for identifying.
                        resolveId(id);
                    } else if (attempts > 60) { // 30 seconds (60 * 500ms)
                        if (!resolved) {
                            resolved = true;
                            OneSignal.User.pushSubscription.removeEventListener('change', changeListener);
                            clearInterval(checkInterval);
                            console.warn('Timeout waiting for OneSignal Subscription ID (30s)');
                            resolve(null);
                        }
                    }
                }, 500);

                // 2. Event Listener
                const changeListener = (event: any) => {
                    // Check if we have an ID now
                    const id = OneSignal.User.pushSubscription.id;
                    if (id) {
                        resolveId(id);
                    }
                };

                try {
                    OneSignal.User.pushSubscription.addEventListener('change', changeListener);
                } catch (err) {
                    console.warn('Could not add push subscription listener:', err);
                }
            });
        }

        // 2. Despia Native (Web Wrapper)
        if (isDespiaNative()) {
            // alert('DEBUG: Despia detected. Asking for token...');
            console.log('Detecting Despia Native environment...');
            // Check for legacy global
            if ((window as any).__onesignal_player_id) {
                // alert('DEBUG: Found global token: ' + (window as any).__onesignal_player_id);
                return (window as any).__onesignal_player_id;
            }

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    // alert('DEBUG: Despia token timeout!');
                    resolve(null);
                }, 5000);

                const handleToken = (event: CustomEvent) => {
                    clearTimeout(timeout);
                    const t = event.detail?.player_id || event.detail?.token || null;
                    // alert('DEBUG: Got Despia Token event: ' + t);
                    resolve(t);
                };

                window.addEventListener('despia-push-token', handleToken as EventListener, { once: true });

                try {
                    // Try different bridge signatures
                    if ((window as any).webkit?.messageHandlers?.despia) {
                        (window as any).webkit.messageHandlers.despia.postMessage({ action: 'getPushToken' });
                    } else if ((window as any).Despia?.getPushToken) {
                        (window as any).Despia.getPushToken();
                    } else if ((window as any).despia?.getPushToken) {
                        (window as any).despia.getPushToken();
                    } else {
                        // alert('DEBUG: No Despia bridge found!');
                    }
                } catch (e) {
                    // alert('DEBUG: Despia bridge error: ' + JSON.stringify(e));
                    console.warn('Could not request push token from Despia:', e);
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
        }

        // 3. Web SDK (Fallback)
        if ((window as any).OneSignal) {
            // Web SDK might still use getUserId or similar depending on version, 
            // but typically we are in native context here.
            return await (window as any).OneSignal.getUserId();
        }

        console.warn('No native push environment detected');
        // alert('DEBUG: No native env detected (Capacitor/Despia false)');
        return null;

    } catch (e) {
        console.error('Error getting OneSignal ID:', e);
        // alert('DEBUG: Error getting ID: ' + JSON.stringify(e));
        return null;
    }
}

// --- Initializer for Capacitor ---

/**
 * Initialize OneSignal for Capacitor (SDK v5) or check Despia availability.
 * Should be called once at app startup.
 */
export function initPushNotifications() {
    if (isCapacitorNative()) {
        const ONESIGNAL_APP_ID = "95b31e0b-147f-485c-9e3e-0f1b2d7615f0";
        console.log("Initializing OneSignal SDK v5 (Capacitor)...");

        // v5 Initialization
        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Request Permissions
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
            console.log("User accepted notifications:", accepted);
        });

        // Click Handler
        OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('Notification clicked:', event);
        });
    } else if (isDespiaNative()) {
        console.log("✅ Despia Native environment detected. Waiting for token registration events...");
    } else {
        console.log("Web environment detected - Push notifications disabled.");
    }
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
    // alert('DEBUG: registerPushToken start. Despia=' + isDespiaNative() + ' Capacitor=' + isCapacitorNative());

    if (!isDespiaNative() && !isCapacitorNative()) {
        // alert('DEBUG: Aborting registerPushToken - not native');
        return;
    }

    console.log('Attempting to register push token for user:', userId);

    // Login to OneSignal (v5) to associate External ID = Supabase user_id
    if (isCapacitorNative()) {
        try {
            OneSignal.login(userId);
            console.log('✅ OneSignal external_id set OK:', userId.substring(0, 8) + '...');
        } catch (loginErr) {
            console.warn('OneSignal.login failed:', loginErr);
        }
    }

    const playerId = await getOneSignalSubscriptionId();

    if (!playerId) {
        console.warn('Could not obtain OneSignal Subscription ID — push token NOT registered');
        // alert('DEBUG: No Player ID obtained!');
        return;
    }

    // alert('DEBUG: Got Token! ' + playerId);
    console.log('Got OneSignal Subscription ID:', playerId.substring(0, 8) + '...');

    const deviceType = getDeviceType();
    const deviceModel = navigator.userAgent.substring(0, 100);

    try {
        // IMPORTANT: onConflict must match UNIQUE constraint in DB.
        // DB has: UNIQUE(player_id) — NOT UNIQUE(user_id, player_id)
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
                    onConflict: 'player_id',
                    ignoreDuplicates: false
                }
            );

        if (error) {
            console.error('Error upserting device token:', error);
            // alert('DEBUG: DB Error: ' + JSON.stringify(error));
        } else {
            console.log('✅ Push token registered successfully for user:', userId.substring(0, 8) + '...');
            // alert('DEBUG: SUCCESS! Token registered in DB.');
        }
    } catch (e) {
        console.error('Failed to register push token:', e);
        // alert('DEBUG: Exception in DB insert: ' + JSON.stringify(e));
    }
}

/**
 * Deactivate push token on logout.
 */
export async function deactivatePushToken(userId: string): Promise<void> {
    try {
        // v5 Logout
        if (isCapacitorNative()) {
            OneSignal.logout();
        }

        await supabase
            .from('device_tokens')
            .update({ is_active: false })
            .eq('user_id', userId);
        console.log('Push tokens deactivated for user');
    } catch (e) {
        console.error('Error deactivating push tokens:', e);
    }
}

/**
 * Check if the user is currently opted in to push notifications.
 */
export function isPushOptedIn(): boolean {
    if (!isCapacitorNative()) return false;
    // v5 property access
    return OneSignal.User.pushSubscription.optedIn;
}

/**
 * Toggle push notification subscription state.
 */
export function setPushSubscription(enable: boolean): void {
    if (!isCapacitorNative()) return;

    if (enable) {
        console.log('Opting IN to push notifications');
        OneSignal.User.pushSubscription.optIn();
    } else {
        console.log('Opting OUT of push notifications');
        OneSignal.User.pushSubscription.optOut();
    }
}
