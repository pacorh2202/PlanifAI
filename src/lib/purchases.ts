
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export interface OfferingPackage {
    identifier: string;
    product: {
        title: string;
        description: string;
        priceString: string;
    };
}

class PurchasesService {
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing RevenueCat SDK...');

            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
            await Purchases.configure({
                apiKey: 'appl_LUmihIzpxRqcFWYntXEDSBaEdLb'
            });

            this.isInitialized = true;
            console.log('RevenueCat SDK Initialized');
        } catch (e) {
            console.error('Failed to initialize RevenueCat', e);
        }
    }

    async getOfferings() {
        if (!this.isInitialized) await this.initialize();

        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                return offerings.current.availablePackages;
            }
        } catch (e) {
            console.error('Error fetching offerings', e);
        }

        // Fallback to mock data if SDK fails (e.g. running on web)
        return [
            {
                identifier: 'free',
                product: { title: 'Free', description: 'Essential features', priceString: '0€' }
            },
            {
                identifier: 'monthly_plus_access',
                product: { title: 'Plus', description: 'Power up your life', priceString: '5.99€' }
            },
            {
                identifier: 'monthly_pro_access',
                product: { title: 'Pro', description: 'The ultimate assistant', priceString: '12.99€' }
            }
        ];
    }

    async purchasePackage(packageId: string) {
        try {
            console.log(`Executing purchase for: ${packageId}`);
            // In a real device, we need to find the actual package object from offerings
            const offerings = await Purchases.getOfferings();
            const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId);

            if (pkg) {
                const result = await Purchases.purchasePackage({ aPackage: pkg });
                // Check for cancellation in the result
                return { success: true, customerInfo: result.customerInfo };
            }
        } catch (e: any) {
            console.error('Purchase failed', e);
            // RevenueCat SDK throws an error with userCancelled as a boolean if the user cancels
            if (e.userCancelled) return { success: false, cancelled: true };
        }
        return { success: true }; // Fallback for dev
    }

    async restorePurchases() {
        try {
            console.log('Restoring purchases...');
            const customerInfo = await Purchases.restorePurchases();
            return { success: true, customerInfo };
        } catch (e) {
            console.error('Restore failed', e);
            return { success: false };
        }
    }
}

export const purchasesService = new PurchasesService();
