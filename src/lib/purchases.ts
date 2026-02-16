import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

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
    private useMock = false;

    async initialize() {
        if (this.isInitialized) return;

        const platform = Capacitor.getPlatform();
        console.log('Current Framework Platform:', platform);

        // 1. Explicit Web Check
        if (platform === 'web') {
            console.log('Platform is Web. enabling mock mode.');
            this.useMock = true;
            this.isInitialized = true;
            return;
        }

        try {
            console.log('Initializing RevenueCat SDK...');
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
            await Purchases.configure({
                apiKey: 'appl_LUmihIzpxRqcFWYntXEDSBaEdLb'
            });
            console.log('RevenueCat SDK Initialized');
        } catch (e: any) {
            console.error('Failed to initialize RevenueCat', e);

            // 2. Fallback check - handles both Error objects and strings
            const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
            if (errorMessage.includes('Web not supported') || errorMessage.includes('Exclude') || e?.code === 'Exclude') {
                console.warn('RevenueCat initialization failed due to platform support. Falling back to mocks.');
                this.useMock = true;
            }
        }
        this.isInitialized = true;
    }

    async getOfferings() {
        if (!this.isInitialized) await this.initialize();

        // Native Path
        if (!this.useMock) {
            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                    return offerings.current.availablePackages;
                }
            } catch (e: any) {
                console.error('Error fetching offerings', e);
                // If it fails here with "Web not supported", switch to mock for future calls
                const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
                if (errorMessage.includes('Web not supported')) {
                    this.useMock = true;
                }
            }
        }

        // Web / Fallback Data (Run if mock is enabled OR if native failed above)
        // If native failed just now (and switched useMock), we want to return mocks immediately
        if (this.useMock) {
            console.log('Using Mock Data for Offerings');
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
                },
                {
                    identifier: 'Yearly_plus_access',
                    product: { title: 'Plus (Yearly)', description: 'Power up your life', priceString: '59.90€' }
                },
                {
                    identifier: 'Yearly_pro_access',
                    product: { title: 'Pro (Yearly)', description: 'The ultimate assistant', priceString: '129.90€' }
                }
            ];
        }
        return [];
    }

    async purchasePackage(packageId: string) {
        if (!this.isInitialized) await this.initialize();

        // Web / Fallback Path
        if (this.useMock) {
            console.log(`[MOCK] Purchase Successful for: ${packageId}`);
            return { success: true };
        }

        // Native Path
        try {
            console.log(`Executing purchase for: ${packageId}`);
            const offerings = await Purchases.getOfferings();
            const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId);

            if (pkg) {
                const result = await Purchases.purchasePackage({ aPackage: pkg });
                return { success: true, customerInfo: result.customerInfo };
            } else {
                console.warn(`Package ${packageId} not found in current offerings.`);
                alert(`Error: Package ${packageId} not found in RevenueCat Offerings. Check your Dashboard.`);
            }
        } catch (e: any) {
            console.error('Purchase failed', e);
            const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

            // Debugging Alert for Device
            if (!this.useMock) {
                alert(`Error Native: ${errorMessage}`);
            }

            if (errorMessage.includes('Web not supported')) {
                this.useMock = true;
                return { success: true };
            }
            if (e.userCancelled) return { success: false, cancelled: true };
        }
        return { success: false };
    }

    async restorePurchases() {
        if (!this.isInitialized) await this.initialize();

        // Web / Fallback Path
        if (this.useMock) {
            console.log('[MOCK] Restore Successful');
            return { success: true };
        }

        // Native Path
        try {
            console.log('Restoring purchases...');
            const customerInfo = await Purchases.restorePurchases();
            return { success: true, customerInfo };
        } catch (e: any) {
            console.error('Restore failed', e);
            const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
            if (errorMessage.includes('Web not supported')) {
                this.useMock = true;
                return { success: true };
            }
            return { success: false };
        }
    }
}

export const purchasesService = new PurchasesService();
