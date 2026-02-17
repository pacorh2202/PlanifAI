import { supabase } from './supabase';
// @ts-ignore - despia-native might not have types
import despia from 'despia-native';

/**
 * Launch the RevenueCat paywall via Despia (LEGACY — kept for reference).
 * Use directPurchase() instead for immediate native purchase sheet.
 */
export const launchPaywall = async ({ userId }: { userId: string }) => {
    if (!userId) {
        console.error('User ID is required for Despia Paywall');
        return;
    }
    const offering = encodeURIComponent("planif ai");
    console.log(`Launching Despia Paywall for user: ${userId}`);
    despia(`revenuecat://launchPaywall?external_id=${encodeURIComponent(userId)}&offering=${offering}`);
};

/**
 * Direct purchase via Despia — opens native Apple/Google payment sheet immediately.
 * NO intermediate paywall screen.
 * 
 * @param userId - The authenticated user's ID
 * @param productId - The RevenueCat product identifier (e.g. 'Monthly_plus_access')
 * @returns Purchase result with purchaseResult and transactionID
 */
export const directPurchase = async ({ userId, productId }: { userId: string; productId: string }): Promise<{
    success: boolean;
    purchaseResult?: string;
    transactionID?: string;
    cancelled?: boolean;
}> => {
    if (!userId) {
        console.error('User ID is required for purchase');
        return { success: false };
    }

    console.log(`Direct purchase via Despia: user=${userId}, product=${productId}`);

    try {
        const result = await despia(
            `revenuecat://purchase?external_id=${encodeURIComponent(userId)}&product=${encodeURIComponent(productId)}`,
            ['purchaseResult', 'transactionID']
        );

        console.log('Despia purchase result:', result);

        if (result?.purchaseResult === 'success' || result?.transactionID) {
            return {
                success: true,
                purchaseResult: result.purchaseResult,
                transactionID: result.transactionID,
            };
        } else if (result?.purchaseResult === 'cancelled' || result?.purchaseResult === 'canceled') {
            return { success: false, cancelled: true };
        } else {
            console.warn('Unexpected purchase result:', result);
            return { success: false, purchaseResult: result?.purchaseResult };
        }
    } catch (e: any) {
        console.error('Despia purchase error:', e);
        // Timeout or user dismissed — treat as cancelled
        return { success: false, cancelled: true };
    }
};

// Polling Logic
export const waitForSubscriptionStatus = async (userId: string, onStatusChange: (status: any) => void) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds (2s interval)
    const interval = 2000;

    const poll = async () => {
        if (attempts >= maxAttempts) {
            console.log('Polling timed out');
            return;
        }
        attempts++;

        try {
            // @ts-ignore
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            const subscription = data as any;

            if (subscription && subscription.is_active && (subscription.plan === 'pro' || subscription.plan === 'plus' || subscription.plan === 'premium')) {
                console.log('Subscription confirmed:', subscription);
                onStatusChange(subscription);
                return;
            }
        } catch (e) {
            console.error('Polling error', e);
        }

        setTimeout(poll, interval);
    };

    poll();
};

// Global Callback Setup (kept for backward compat with Despia onRevenueCatPurchase)
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.onRevenueCatPurchase = async function () {
        console.log("RevenueCat purchase detected via Despia! Starting verification...");

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            window.dispatchEvent(new CustomEvent('purchase-processing-started'));

            waitForSubscriptionStatus(user.id, async (status) => {
                window.dispatchEvent(new CustomEvent('subscription-updated', { detail: status }));
                console.log("Subscription flow completed.");
            });
        } else {
            console.error("No user found during purchase callback");
        }
    };
}
