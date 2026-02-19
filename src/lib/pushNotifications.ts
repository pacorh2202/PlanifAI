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

const ONESIGNAL_APP_ID = "95b31e0b-147f-485c-9e3e-0f1b2d7615f0";

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

function isWebPush(): boolean {
    return !isCapacitorNative() && !isDespiaNative();
}

// --- Helper: run a callback via OneSignalDeferred (Web SDK) ---
function withWebSDK(fn: (sdk: any) => void | Promise<void>): void {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(fn);
}

// --- Helper: get OneSignal Web SDK instance (resolves after init) ---
function getWebSDK(): Promise<any> {
    return new Promise((resolve) => {
        withWebSDK((sdk) => resolve(sdk));
    });
}

// --- Subscription ID Retrieval ---

async function getOneSignalSubscriptionId(): Promise<string | null> {
    try {
        // 1. Capacitor Native
        if (isCapacitorNative()) {
            console.log('[PUSH] Getting subscription ID from Capacitor...');
            const subId = OneSignal.User.pushSubscription.id;
            if (subId) return subId;

            return new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 5000);
                OneSignal.User.pushSubscription.addEventListener('change', () => {
                    const id = OneSignal.User.pushSubscription.id;
                    if (id) { clearTimeout(timeout); resolve(id); }
                });
            });
        }

        // 2. Despia Native
        if (isDespiaNative()) {
            console.log('[PUSH] Getting subscription ID from Despia...');
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
                } catch (e) { clearTimeout(timeout); resolve(null); }
            });
        }

        // 3. Web Push — wait for SDK, then poll for subscription ID (may take time after permission grant)
        console.log('[PUSH] Getting subscription ID from Web SDK...');
        const sdk = await getWebSDK();
        // Poll up to 10 seconds (permission dialog may be pending)
        for (let i = 0; i < 20; i++) {
            const id = sdk.User.PushSubscription.id;
            if (id) {
                console.log('[PUSH] Web Push subscription ID:', id);
                return id;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn('[PUSH] Web Push subscription ID not available after polling');
        return null;

    } catch (e) {
        console.error('[PUSH] Error getting OneSignal ID:', e);
        return null;
    }
}

// --- Initializer ---

/**
 * Initialize OneSignal SDK. Call once at app startup.
 */
export function initPushNotifications() {
    if (isCapacitorNative()) {
        console.log("[PUSH] Initializing OneSignal (Capacitor)...");
        OneSignal.initialize(ONESIGNAL_APP_ID);
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
            console.log("[PUSH] Capacitor permission:", accepted);
        });
        OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('[PUSH] Notification clicked:', event);
        });

    } else if (isDespiaNative()) {
        console.log("[PUSH] Despia environment detected.");

    } else {
        // WEB PUSH
        console.log("[PUSH] OneSignal Web init started");
        withWebSDK(async (sdk) => {
            try {
                await sdk.init({
                    appId: ONESIGNAL_APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerParam: { scope: '/' },
                    serviceWorkerPath: 'OneSignalSDKWorker.js',
                });
                console.log("[PUSH] OneSignal Web init SUCCESS");
            } catch (e) {
                console.error("[PUSH] OneSignal Web init ERROR:", e);
            }

            sdk.User.PushSubscription.addEventListener("change", (event: any) => {
                console.log("[PUSH] Subscription changed:", JSON.stringify(event));
            });
        });
    }
}

// --- Device Type ---

function getDeviceType(): string {
    if (isCapacitorNative()) return (window as any).Capacitor.getPlatform();
    if (isDespiaNative()) return 'despia';
    return 'web';
}

// --- Register Push Token ---

/**
 * Bind the current user to OneSignal (set external_id) and save token to Supabase.
 * MUST be called with a valid userId (auth.uid()). Will abort if userId is empty.
 */
export async function registerPushToken(userId: string): Promise<void> {
    if (!userId) {
        console.warn('[PUSH] registerPushToken: userId is empty — ABORTING');
        return;
    }

    const deviceType = getDeviceType();
    console.log(`[PUSH] registerPushToken: userId=${userId}, device=${deviceType}`);

    // ── Step 1: Set External ID (login) ──
    try {
        if (isCapacitorNative()) {
            console.log('[PUSH] Calling OneSignal.login (Capacitor)...');
            OneSignal.login(userId);
            console.log('[PUSH] OneSignal.login OK (Capacitor)');

        } else if (isWebPush()) {
            console.log('[PUSH] Calling OneSignal.login (Web)...');
            const sdk = await getWebSDK();
            await sdk.login(userId);
            console.log('[PUSH] OneSignal.login OK (Web) — external_id should now be:', userId);
        }
        // Despia: external_id binding is handled natively
    } catch (e) {
        console.error('[PUSH] OneSignal.login FAILED:', e);
        // Don't return — we still want to try capturing the subscription ID
    }

    // ── Step 2: Get Subscription ID ──
    const playerId = await getOneSignalSubscriptionId();

    if (!playerId) {
        console.warn('[PUSH] No subscription ID obtained. Token NOT saved to Supabase.');
        console.warn('[PUSH] This is expected if permission was not yet granted.');
        return;
    }

    console.log(`[PUSH] Got subscription ID: ${playerId}`);

    // ── Step 3: Upsert to Supabase device_tokens ──
    try {
        const { error } = await supabase
            .from('device_tokens')
            .upsert(
                {
                    user_id: userId,
                    player_id: playerId,
                    device_type: deviceType,
                    device_model: navigator.userAgent.substring(0, 100),
                    is_active: true,
                    last_used_at: new Date().toISOString()
                },
                { onConflict: 'player_id', ignoreDuplicates: false }
            );

        if (error) {
            console.error('[PUSH] Supabase upsert ERROR:', JSON.stringify(error));
        } else {
            console.log('[PUSH] ✅ Token saved to Supabase device_tokens');
        }
    } catch (e) {
        console.error('[PUSH] Supabase upsert EXCEPTION:', e);
    }
}

// --- Deactivate ---

export async function deactivatePushToken(userId: string): Promise<void> {
    try {
        if (isCapacitorNative()) {
            OneSignal.logout();
        } else if (isWebPush()) {
            const sdk = await getWebSDK();
            await sdk.logout();
        }
        await supabase
            .from('device_tokens')
            .update({ is_active: false })
            .eq('user_id', userId);
        console.log('[PUSH] Tokens deactivated for user');
    } catch (e) {
        console.error('[PUSH] Error deactivating tokens:', e);
    }
}

// --- Opt-in status ---

export function isPushOptedIn(): boolean {
    if (isCapacitorNative()) return OneSignal.User.pushSubscription.optedIn;
    if (typeof Notification !== 'undefined') return Notification.permission === 'granted';
    return false;
}

// --- Request permission explicitly (Web) ---

export async function requestWebPushPermission(): Promise<string> {
    if (isCapacitorNative()) return 'granted';

    try {
        const sdk = await getWebSDK();
        console.log('[PUSH] Requesting web push permission...');
        await sdk.Slidedown.promptPush();
        const perm = Notification.permission;
        console.log('[PUSH] Permission result:', perm);
        return perm; // 'granted' | 'denied' | 'default'
    } catch (e) {
        console.error('[PUSH] Error requesting permission:', e);
        return 'error';
    }
}

// --- Toggle subscription ---

export async function setPushSubscription(enable: boolean): Promise<void> {
    if (isCapacitorNative()) {
        if (enable) OneSignal.User.pushSubscription.optIn();
        else OneSignal.User.pushSubscription.optOut();
        return;
    }

    if (isWebPush()) {
        const sdk = await getWebSDK();
        if (enable) {
            console.log('[PUSH] Opting in (Web)...');
            await sdk.User.PushSubscription.optIn();
            // Also prompt for permission if not granted
            if (Notification.permission !== 'granted') {
                await requestWebPushPermission();
            }
        } else {
            console.log('[PUSH] Opting out (Web)...');
            sdk.User.PushSubscription.optOut();
        }
    }
}
