/**
 * Push Notification Module
 *
 * Handles OneSignal integration for:
 * 1. Capacitor (iOS/Android) via onesignal-cordova-plugin (v5+)
 * 2. Despia (native web wrapper) via JS bridge
 * 3. Web Push (Chrome/Safari/Firefox) via OneSignal Web SDK v16
 *
 * IMPORTANT: OneSignal Web SDK v16 requires ALL calls (login, optIn, etc.)
 * to go through OneSignalDeferred.push(). You CANNOT cache the SDK object
 * and call methods on it later — the internal state won't be ready.
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

// --- State tracking ---
let _webInitialized = false;
let _initCalled = false;   // guard: prevent double call to initPushNotifications()
let _webInitPromiseResolve: (() => void) | null = null;
const _webInitPromise = new Promise<void>((resolve) => {
    _webInitPromiseResolve = resolve;
});

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

// --- Device Type ---

function getDeviceType(): string {
    if (isCapacitorNative()) return (window as any).Capacitor.getPlatform();
    if (isDespiaNative()) return 'despia';
    return 'web';
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

        // 3. Web Push — use the SDK's change listener (more reliable than polling)
        console.log('[PUSH] Getting subscription ID from Web SDK...');
        await _webInitPromise; // Wait for init to complete

        return new Promise((resolve) => {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push((OneSignalSDK: any) => {
                // Try to read immediately
                const id = OneSignalSDK.User.PushSubscription.id;
                if (id) {
                    console.log('[PUSH] Web subscription ID (immediate):', id);
                    resolve(id);
                    return;
                }

                // If not available, listen for changes (permission may still be pending)
                console.log('[PUSH] Subscription ID not yet available, waiting for change event...');
                const timeout = setTimeout(() => {
                    console.warn('[PUSH] Subscription ID timeout after 15s');
                    resolve(null);
                }, 15000);

                OneSignalSDK.User.PushSubscription.addEventListener("change", (event: any) => {
                    const newId = event.current?.id;
                    console.log('[PUSH] Subscription change event:', JSON.stringify({ id: newId, optedIn: event.current?.optedIn }));
                    if (newId) {
                        clearTimeout(timeout);
                        resolve(newId);
                    }
                });
            });
        });

    } catch (e) {
        console.error('[PUSH] Error getting OneSignal ID:', e);
        return null;
    }
}

// --- Initializer ---

/**
 * Initialize OneSignal SDK. Call once at app startup.
 * For Web: this calls OneSignal.init() inside OneSignalDeferred.push().
 */
export function initPushNotifications() {
    // ── Guard: only init once ──
    if (_initCalled) {
        console.log('[PUSH] initPushNotifications() already called — skipping');
        return;
    }
    _initCalled = true;

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
        // Resolve init promise so registerPushToken doesn't hang
        if (_webInitPromiseResolve) _webInitPromiseResolve();

    } else {
        // WEB PUSH — exact pattern from OneSignal v16 docs
        console.log("[PUSH] Queuing OneSignal Web SDK init...");
        console.log("[PUSH] Current origin:", location.origin);
        console.log("[PUSH] ⚠️ OneSignal dashboard must allow this origin!");
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignalSDK: any) {
            try {
                console.log("[PUSH] OneSignal.init() starting on", location.origin);
                await OneSignalSDK.init({
                    appId: ONESIGNAL_APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerParam: { scope: '/' },
                    serviceWorkerPath: 'OneSignalSDKWorker.js',
                });
                _webInitialized = true;
                console.log("[PUSH] OneSignal.init() SUCCESS ✅");
                console.log("[PUSH] Permission:", OneSignalSDK.Notifications.permission);
                console.log("[PUSH] PushSubscription.id:", OneSignalSDK.User.PushSubscription.id);
                console.log("[PUSH] PushSubscription.optedIn:", OneSignalSDK.User.PushSubscription.optedIn);
            } catch (e: any) {
                console.error("[PUSH] OneSignal.init() FAILED:", e);
                if (String(e).includes('Can only be used on')) {
                    console.error('[PUSH] ❌ DOMAIN MISMATCH! Go to OneSignal Dashboard > Settings > Platforms > Web > Site URL');
                    console.error('[PUSH] ❌ Change allowed origin to:', location.origin);
                }
            }

            // ALWAYS resolve the init promise (even on failure) so login() doesn't hang
            if (_webInitPromiseResolve) _webInitPromiseResolve();

            // Listen for subscription changes (only if init succeeded)
            if (_webInitialized) {
                OneSignalSDK.User.PushSubscription.addEventListener("change", (event: any) => {
                    console.log("[PUSH] Subscription changed:", JSON.stringify({
                        prevId: event.previous?.id,
                        newId: event.current?.id,
                        optedIn: event.current?.optedIn
                    }));
                });
            }
        });
    }
}

// --- Register Push Token ---

/**
 * Bind the current user to OneSignal (set external_id) and save token to Supabase.
 * MUST be called with a valid userId (auth.uid()).
 * 
 * For Web: uses OneSignalDeferred.push() to call login() — the ONLY safe way
 * per the v16 SDK docs.
 */
export async function registerPushToken(userId: string): Promise<void> {
    if (!userId) {
        console.warn('[PUSH] registerPushToken: userId is empty — ABORTING');
        return;
    }

    const deviceType = getDeviceType();
    console.log(`[PUSH] registerPushToken START: userId=${userId}, device=${deviceType}`);

    // ── Step 1: Set External ID (login) ──
    try {
        if (isCapacitorNative()) {
            console.log('[PUSH] Calling OneSignal.login (Capacitor)...');
            OneSignal.login(userId);
            console.log('[PUSH] OneSignal.login OK (Capacitor)');

        } else if (isWebPush()) {
            // CRITICAL: Must wait for init() to finish before calling login()
            console.log('[PUSH] Waiting for Web SDK init to complete...');
            await _webInitPromise;

            if (!_webInitialized) {
                console.error('[PUSH] SDK init failed — cannot call login()');
                return;
            }

            // Use OneSignalDeferred.push() per official docs
            console.log('[PUSH] Queuing OneSignal.login() via Deferred...');
            await new Promise<void>((resolve, reject) => {
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                window.OneSignalDeferred.push(async function (OneSignalSDK: any) {
                    try {
                        console.log('[PUSH] Calling OneSignal.login(' + userId + ')...');
                        await OneSignalSDK.login(userId);
                        console.log('[PUSH] OneSignal.login() SUCCESS ✅ external_id =', userId);
                        console.log('[PUSH] After login — externalId:', OneSignalSDK.User.externalId);
                        console.log('[PUSH] After login — onesignalId:', OneSignalSDK.User.onesignalId);
                        console.log('[PUSH] After login — PushSubscription.id:', OneSignalSDK.User.PushSubscription.id);
                        resolve();
                    } catch (e) {
                        console.error('[PUSH] OneSignal.login() FAILED:', e);
                        reject(e);
                    }
                });
            });
        }
        // Despia: external_id binding handled natively
    } catch (e) {
        console.error('[PUSH] Login step failed:', e);
        // Continue — we still try to get the subscription ID
    }

    // ── Step 2: Get Subscription ID ──
    const playerId = await getOneSignalSubscriptionId();

    if (!playerId) {
        console.warn('[PUSH] No subscription ID obtained. Token NOT saved.');
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
            await _webInitPromise;
            await new Promise<void>((resolve) => {
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                window.OneSignalDeferred.push(async (OneSignalSDK: any) => {
                    await OneSignalSDK.logout();
                    resolve();
                });
            });
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
        await _webInitPromise;
        return await new Promise<string>((resolve) => {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignalSDK: any) => {
                try {
                    console.log('[PUSH] Requesting web push permission...');
                    await OneSignalSDK.Slidedown.promptPush();
                    const perm = Notification.permission;
                    console.log('[PUSH] Permission result:', perm);
                    resolve(perm);
                } catch (e) {
                    console.error('[PUSH] Error requesting permission:', e);
                    resolve('error');
                }
            });
        });
    } catch (e) {
        console.error('[PUSH] Error in requestWebPushPermission:', e);
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
        await _webInitPromise;
        await new Promise<void>((resolve) => {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignalSDK: any) => {
                if (enable) {
                    console.log('[PUSH] Opting in (Web)...');
                    await OneSignalSDK.User.PushSubscription.optIn();
                    if (Notification.permission !== 'granted') {
                        await OneSignalSDK.Slidedown.promptPush();
                    }
                } else {
                    console.log('[PUSH] Opting out (Web)...');
                    OneSignalSDK.User.PushSubscription.optOut();
                }
                resolve();
            });
        });
    }
}
