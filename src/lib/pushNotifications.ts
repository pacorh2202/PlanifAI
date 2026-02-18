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
    return typeof (window as any).webkit?.messageHandlers?.despia !== 'undefined'
        || typeof (window as any).Despia !== 'undefined'
        || typeof (window as any).despia !== 'undefined'
        || /despia/i.test(navigator.userAgent);
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
            // For v5 there isn't a direct "getDeviceState" callback in the same way, 
            // but we can check the state.
            return new Promise((resolve) => {
                // Creating a short polling mechanism as `getDeviceState` is gone
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    const id = OneSignal.User.pushSubscription.id;
                    if (id) {
                        clearInterval(checkInterval);
                        console.log('Got Subscription ID after polling:', id);
                        resolve(id);
                    } else if (attempts > 10) {
                        clearInterval(checkInterval);
                        console.warn('Timeout waiting for OneSignal Subscription ID');
                        resolve(null);
                    }
                }, 500);
            });
        }

        // 2. Despia Native (Web Wrapper)
        if (isDespiaNative()) {
            console.log('Detecting Despia Native environment...');
            // Check for legacy global
            if ((window as any).__onesignal_player_id) {
                return (window as any).__onesignal_player_id;
            }

            return new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 3000);

                const handleToken = (event: CustomEvent) => {
                    clearTimeout(timeout);
                    resolve(event.detail?.player_id || event.detail?.token || null);
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
            // Web SDK might still use getUserId or similar depending on version, 
            // but typically we are in native context here.
            return await (window as any).OneSignal.getUserId();
        }

        console.warn('No native push environment detected');
        return null;

    } catch (e) {
        console.error('Error getting OneSignal ID:', e);
        return null;
    }
}

// --- Initializer for Capacitor ---

/**
 * Initialize OneSignal for Capacitor (SDK v5).
 * Should be called once at app startup.
 */
export function initCapacitorOneSignal() {
    if (!isCapacitorNative()) return;

    const ONESIGNAL_APP_ID = "95b31e0b-147f-485c-9e3e-0f1b2d7615f0";

    console.log("Initializing OneSignal SDK v5...");

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
        return;
    }

    console.log('Attempting to register push token for user:', userId);

    // Login to OneSignal (v5) to associate External ID if needed
    if (isCapacitorNative()) {
        OneSignal.login(userId);
    }

    const playerId = await getOneSignalSubscriptionId();

    if (!playerId) {
        console.warn('Could not obtain OneSignal Subscription ID');
        return;
    }

    console.log('Got OneSignal Subscription ID:', playerId.substring(0, 8) + '...');

    const deviceType = getDeviceType();
    const deviceModel = navigator.userAgent.substring(0, 100);

    try {
        const { error } = await supabase
            .from('device_tokens')
            .upsert(
                {
                    user_id: userId,
                    player_id: playerId, // This is now the Subscription ID
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
            console.error('Error upserting device token:', error);
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
