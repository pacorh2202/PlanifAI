/**
 * Push Notification Token Registration
 *
 * Handles registering OneSignal player_id (Subscription ID) from:
 * 1. Capacitor (iOS/Android) via onesignal-cordova-plugin (v5+)
 * 2. Despia (native web wrapper) via JS bridge
 * 3. Web Push (Chrome/Safari/Firefox) via OneSignal Web SDK
 *
 * Stores tokens in Supabase device_tokens table.
 */

import { supabase } from './supabase';
import OneSignal from 'onesignal-cordova-plugin';

// --- Types for Web SDK ---
declare global {
    interface Window {
        OneSignalDeferred: any[];
        OneSignal: any;
    }
}

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
 * Get the OneSignal Subscription ID from available native bridges or Web SDK.
 */
async function getOneSignalSubscriptionId(): Promise<string | null> {
    try {
        // 1. Capacitor Native (iOS/Android) - SDK v5
        if (isCapacitorNative()) {
            console.log('Detecting Capacitor Native environment (v5)...');
            const subId = OneSignal.User.pushSubscription.id;
            const optedIn = OneSignal.User.pushSubscription.optedIn;

            if (subId && optedIn) {
                return subId;
            }

            return new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 5000);
                const changeListener = (event: any) => {
                    const id = OneSignal.User.pushSubscription.id;
                    if (id) {
                        clearTimeout(timeout);
                        resolve(id);
                    }
                };
                OneSignal.User.pushSubscription.addEventListener('change', changeListener);
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
                const handleToken = (event: CustomEvent) => {
                    clearTimeout(timeout);
                    resolve(event.detail?.player_id || event.detail?.token || null);
                };
                window.addEventListener('despia-push-token', handleToken as EventListener, { once: true });

                try {
                    if ((window as any).webkit?.messageHandlers?.despia) {
                        (window as any).webkit.messageHandlers.despia.postMessage({ action: 'getPushToken' });
                    } else if ((window as any).Despia?.getPushToken) {
                        (window as any).Despia.getPushToken();
                    } else if ((window as any).despia?.getPushToken) {
                        (window as any).despia.getPushToken();
                    }
                } catch (e) {
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
        }

        // 3. Web Push (Standard Browser)
        console.log('Detecting Web Push environment...');
        return new Promise((resolve) => {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async function (OneSignalWeb: any) {
                try {
                    const id = await OneSignalWeb.User.PushSubscription.id;
                    const optedIn = await OneSignalWeb.User.PushSubscription.optedIn; // Check opt-in status if needed
                    console.log('Web Push ID:', id, 'OptedIn:', optedIn);
                    resolve(id || null);
                } catch (e) {
                    console.error('Error getting Web Push ID:', e);
                    resolve(null);
                }
            });
        });

    } catch (e) {
        console.error('Error getting OneSignal ID:', e);
        return null;
    }
}

// --- Initializer ---

/**
 * Initialize OneSignal for Capacitor, Despia, OR Web.
 * Should be called once at app startup (e.g. App.tsx or index.tsx).
 */
export function initPushNotifications() {
    const ONESIGNAL_APP_ID = "95b31e0b-147f-485c-9e3e-0f1b2d7615f0";

    if (isCapacitorNative()) {
        console.log("Initializing OneSignal SDK v5 (Capacitor)...");
        OneSignal.initialize(ONESIGNAL_APP_ID);
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
            console.log("User accepted notifications:", accepted);
        });
        OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('Notification clicked:', event);
        });

    } else if (isDespiaNative()) {
        console.log("✅ Despia Native environment detected.");

    } else {
        // WEB PUSH INITIALIZATION
        console.log("Initializing OneSignal Web SDK...");
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignalWeb: any) {
            OneSignalWeb.init({
                appId: ONESIGNAL_APP_ID,
                safari_web_id: "web.onesignal.auto.645731b5-6548-4e3a-9694-1a3f65e4e8a4", // Optional: Add if you have it
                notifyButton: {
                    enable: true, // Floating bell
                },
                allowLocalhostAsSecureOrigin: true, // Helpful for local dev
                serviceWorkerParam: { scope: '/' },
                serviceWorkerPath: 'OneSignalSDKWorker.js',
            });

            // Log subscription changes
            OneSignalWeb.User.PushSubscription.addEventListener("change", function (event: any) {
                console.log("Web Push Subscription changed:", event);
            });
        });
    }
}

/**
 * Detect device type
 */
function getDeviceType(): string {
    if (isCapacitorNative()) {
        return (window as any).Capacitor.getPlatform();
    }
    if (isDespiaNative()) {
        return 'despia'; // Or treat as 'ios'/'android' depending on UA if preferred
    }
    return 'web';
}

/**
 * Register the device push token in Supabase.
 * Call this after login.
 */
export async function registerPushToken(userId: string): Promise<void> {
    console.log('Attempting to register push token for user:', userId);

    const deviceType = getDeviceType();

    // 1. Identify User in OneSignal (External ID = Supabase user_id)
    if (isCapacitorNative()) {
        try {
            OneSignal.login(userId);
        } catch (e) {
            console.warn('OneSignal.login failed (Capacitor):', e);
        }
    } else if (isDespiaNative()) {
        // Despia might handle this internally or not support login via JS bridge easily
        // Usually Despia just exposes the player_id
    } else {
        // Web Push Login
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignalWeb: any) {
            console.log('Logging in to OneSignal Web with External ID:', userId);
            OneSignalWeb.login(userId);
        });
    }

    // 2. Get Subscription ID
    const playerId = await getOneSignalSubscriptionId();

    if (!playerId) {
        console.warn('Could not obtain OneSignal Subscription ID — push token NOT registered');
        return;
    }

    console.log(`Got OneSignal ID (${deviceType}):`, playerId);
    const deviceModel = navigator.userAgent.substring(0, 100);

    // 3. Upsert to Supabase
    try {
        const { error } = await supabase
            .from('device_tokens')
            .upsert(
                {
                    user_id: userId,
                    player_id: playerId,
                    device_type: deviceType, // 'ios', 'android', 'web', 'despia'
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
        } else {
            console.log('✅ Push token registered successfully for user:', userId);
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
        if (isCapacitorNative()) {
            OneSignal.logout();
        } else if (!isDespiaNative()) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(function (OneSignalWeb: any) {
                OneSignalWeb.logout();
            });
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
    if (isCapacitorNative()) {
        return OneSignal.User.pushSubscription.optedIn;
    }
    // Web synchronous check is hard because OneSignalDeferred is async.
    // For now return false or rely on UI state updates via listeners.
    return Notification.permission === 'granted';
}

/**
 * Toggle push notification subscription state.
 */
export function setPushSubscription(enable: boolean): void {
    if (isCapacitorNative()) {
        if (enable) OneSignal.User.pushSubscription.optIn();
        else OneSignal.User.pushSubscription.optOut();
    } else if (!isDespiaNative()) {
        // Web Push
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignalWeb: any) {
            if (enable) {
                OneSignalWeb.User.PushSubscription.optIn();
                // Also request permission if not granted
                OneSignalWeb.Slidedown.promptPush();
            } else {
                OneSignalWeb.User.PushSubscription.optOut();
            }
        });
    }
}
