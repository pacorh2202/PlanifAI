import { supabase } from './supabase';
// @ts-ignore - despia-native might not have types
import despia from 'despia-native';

export const launchPaywall = async ({ userId }: { userId: string }) => {
    if (!userId) {
        console.error('User ID is required for Despia Paywall');
        return;
    }
    const offering = encodeURIComponent("planif ai");
    console.log(`Launching Despia Paywall for user: ${userId}`);
    despia(`revenuecat://launchPaywall?external_id=${encodeURIComponent(userId)}&offering=${offering}`);
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

// Global Callback Setup
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.onRevenueCatPurchase = async function () {
        console.log("RevenueCat purchase detected via Despia! Starting verification...");

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Dispatch event to show loading/processing state if UI is listening
            window.dispatchEvent(new CustomEvent('purchase-processing-started'));

            waitForSubscriptionStatus(user.id, async (status) => {
                // Update Profile in Frontend Store if easy, or just rely on DB
                // We also update the 'profiles' table locally just in case backend didn't do it yet (though backend webhook should have)

                // Dispatch success event
                window.dispatchEvent(new CustomEvent('subscription-updated', { detail: status }));

                // Reload page or force refresh context if needed
                // For now, let the UI component handle the event
                console.log("Subscription flow completed.");
            });
        } else {
            console.error("No user found during purchase callback");
        }
    };
}
