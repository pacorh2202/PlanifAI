import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export interface OfferingPackage {
    identifier: string;
    product: {
        title: string;
        description: string;
        priceString: string;
    };
    // Keep the original RC package so we can pass it to purchasePackage
    _rcPackage?: any;
}

const OFFERING_ID = 'planif_ai';

// Map RevenueCat package identifiers to plan keys used by the UI
const PACKAGE_MAP: Record<string, { plan: 'plus' | 'pro'; period: 'monthly' | 'yearly' }> = {
    'Monthly_plus_access': { plan: 'plus', period: 'monthly' },
    'monthly_plus_access': { plan: 'plus', period: 'monthly' },
    'Monthly_pro_access': { plan: 'pro', period: 'monthly' },
    'monthly_pro_access': { plan: 'pro', period: 'monthly' },
    'Yearly_plus_access': { plan: 'plus', period: 'yearly' },
    'yearly_plus_access': { plan: 'plus', period: 'yearly' },
    'Yearly_pro_access': { plan: 'pro', period: 'yearly' },
    'yearly_pro_access': { plan: 'pro', period: 'yearly' },
};

class PurchasesService {
    private isInitialized = false;
    private useMock = false;
    // Cache the raw offerings to avoid refetching
    private cachedOfferings: any = null;

    async initialize() {
        if (this.isInitialized) return;

        const platform = Capacitor.getPlatform();
        console.log('Current Framework Platform:', platform);

        if (platform === 'web') {
            console.log('Platform is Web. Enabling mock mode.');
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
            const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
            if (errorMessage.includes('Web not supported') || errorMessage.includes('Exclude') || e?.code === 'Exclude') {
                console.warn('RevenueCat init failed (platform). Falling back to mocks.');
                this.useMock = true;
            }
        }
        this.isInitialized = true;
    }

    /**
     * Get all packages from the "planif_ai" offering.
     * Returns typed packages with plan/period info for easy UI mapping.
     */
    async getOfferings(): Promise<OfferingPackage[]> {
        if (!this.isInitialized) await this.initialize();

        // Native path
        if (!this.useMock) {
            try {
                const offerings = await Purchases.getOfferings();

                // Try to find our specific offering first, fall back to current
                const offering = offerings.all?.[OFFERING_ID] || offerings.current;

                if (offering && offering.availablePackages.length > 0) {
                    this.cachedOfferings = offering;
                    return offering.availablePackages.map((pkg: any) => ({
                        identifier: pkg.identifier,
                        product: {
                            title: pkg.product?.title ?? pkg.identifier,
                            description: pkg.product?.description ?? '',
                            priceString: pkg.product?.priceString ?? pkg.product?.price?.formatted ?? '—',
                        },
                        _rcPackage: pkg,
                    }));
                }
            } catch (e: any) {
                console.error('Error fetching offerings', e);
                const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
                if (errorMessage.includes('Web not supported')) {
                    this.useMock = true;
                }
            }
        }

        // Mock / fallback
        if (this.useMock) {
            console.log('Using Mock Data for Offerings');
            return [
                { identifier: 'Monthly_plus_access', product: { title: 'Plus', description: 'Power up your life', priceString: '4,99 €' } },
                { identifier: 'Monthly_pro_access', product: { title: 'Pro', description: 'The ultimate assistant', priceString: '9,99 €' } },
                { identifier: 'Yearly_plus_access', product: { title: 'Plus (Yearly)', description: 'Power up your life', priceString: '49,99 €' } },
                { identifier: 'Yearly_pro_access', product: { title: 'Pro (Yearly)', description: 'The ultimate assistant', priceString: '99,99 €' } },
            ];
        }
        return [];
    }

    /**
     * Get the plan/period info for a package identifier.
     */
    getPackageInfo(identifier: string): { plan: 'plus' | 'pro'; period: 'monthly' | 'yearly' } | null {
        return PACKAGE_MAP[identifier] ?? null;
    }

    /**
     * Purchase a specific package by its identifier.
     * NO paywall — triggers the native Apple/Google payment sheet directly.
     */
    async purchasePackage(packageId: string): Promise<{ success: boolean; customerInfo?: any; cancelled?: boolean }> {
        if (!this.isInitialized) await this.initialize();

        if (this.useMock) {
            console.log(`[MOCK] Purchase Successful for: ${packageId}`);
            return { success: true };
        }

        try {
            console.log(`Executing direct purchase for: ${packageId}`);

            // Try cached offerings first, otherwise refetch
            let offering = this.cachedOfferings;
            if (!offering) {
                const offerings = await Purchases.getOfferings();
                offering = offerings.all?.[OFFERING_ID] || offerings.current;
                this.cachedOfferings = offering;
            }

            const pkg = offering?.availablePackages.find((p: any) => p.identifier === packageId);

            if (pkg) {
                const result = await Purchases.purchasePackage({ aPackage: pkg });
                return { success: true, customerInfo: result.customerInfo };
            } else {
                console.warn(`Package ${packageId} not found in offering "${OFFERING_ID}".`);
                // Try case-insensitive match as fallback
                const pkgFallback = offering?.availablePackages.find(
                    (p: any) => p.identifier.toLowerCase() === packageId.toLowerCase()
                );
                if (pkgFallback) {
                    const result = await Purchases.purchasePackage({ aPackage: pkgFallback });
                    return { success: true, customerInfo: result.customerInfo };
                }
                alert(`Error: Package "${packageId}" not found. Please contact support.`);
            }
        } catch (e: any) {
            console.error('Purchase failed', e);
            const errorMessage = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

            if (errorMessage.includes('Web not supported')) {
                this.useMock = true;
                return { success: true };
            }
            if (e.userCancelled) return { success: false, cancelled: true };

            if (!this.useMock) {
                alert(`Purchase error: ${errorMessage}`);
            }
        }
        return { success: false };
    }

    async restorePurchases() {
        if (!this.isInitialized) await this.initialize();

        if (this.useMock) {
            console.log('[MOCK] Restore Successful');
            return { success: true };
        }

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

    /**
     * Get latest customer info from RevenueCat.
     * Useful for checking active entitlements and management URL.
     */
    async getCustomerInfo() {
        if (!this.isInitialized) await this.initialize();

        if (this.useMock) {
            return {
                entitlements: { active: {} },
                activeSubscriptions: [],
                managementURL: null
            };
        }

        try {
            const info = await Purchases.getCustomerInfo();
            return info.customerInfo;
        } catch (e) {
            console.error('Error fetching customer info:', e);
            return null;
        }
    }
}

export const purchasesService = new PurchasesService();
