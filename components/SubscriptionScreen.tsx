import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Check, Sparkles, CreditCard, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { useAuth } from '../src/contexts/AuthContext';
import { purchasesService, OfferingPackage } from '../src/lib/purchases';
import { directPurchase, waitForSubscriptionStatus } from '../src/lib/despiaPurchases';

interface SubscriptionScreenProps {
    onBack: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack }) => {
    const { user } = useAuth();
    const { accentColor, t, refreshStats } = useCalendar();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
    const [activePlanId, setActivePlanId] = useState<string>('plus');
    const [isLoading, setIsLoading] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Dynamic pricing from RevenueCat
    const [packages, setPackages] = useState<OfferingPackage[]>([]);
    const [pricesLoaded, setPricesLoaded] = useState(false);

    // Fetch real prices on mount
    useEffect(() => {
        const loadPrices = async () => {
            try {
                const offerings = await purchasesService.getOfferings();
                if (offerings.length > 0) {
                    setPackages(offerings);
                }
            } catch (e) {
                console.error('Failed to load offerings', e);
            }
            setPricesLoaded(true);
        };
        loadPrices();
    }, []);

    // Helper: get the price string for a given plan+period from RevenueCat packages
    const getDynamicPrice = useCallback((plan: 'plus' | 'pro', period: 'monthly' | 'yearly'): string => {
        const match = packages.find(pkg => {
            const info = purchasesService.getPackageInfo(pkg.identifier);
            return info?.plan === plan && info?.period === period;
        });
        if (match) return match.product.priceString;
        // Fallback hardcoded — must match App Store Connect prices
        const fallbacks: Record<string, Record<string, string>> = {
            plus: { monthly: '4,99 €', yearly: '49,99 €' },
            pro: { monthly: '9,99 €', yearly: '99,99 €' },
        };
        return fallbacks[plan]?.[period] ?? '—';
    }, [packages]);

    // Helper: get the RevenueCat package identifier for a plan+period
    const getPackageId = useCallback((plan: 'plus' | 'pro', period: 'monthly' | 'yearly'): string | null => {
        const match = packages.find(pkg => {
            const info = purchasesService.getPackageInfo(pkg.identifier);
            return info?.plan === plan && info?.period === period;
        });
        return match?.identifier ?? null;
    }, [packages]);

    // Listen for Despia purchase events (kept for backward compat)
    useEffect(() => {
        const handlePurchaseStart = () => setIsLoading(true);
        const handleSubscriptionUpdated = (e: any) => {
            console.log("Subscription updated event received:", e.detail);
            setIsLoading(false);
            setIsPurchasing(false);
            refreshStats();
            onBack();
        };

        window.addEventListener('purchase-processing-started', handlePurchaseStart);
        window.addEventListener('subscription-updated', handleSubscriptionUpdated);

        return () => {
            window.removeEventListener('purchase-processing-started', handlePurchaseStart);
            window.removeEventListener('subscription-updated', handleSubscriptionUpdated);
        };
    }, [refreshStats, onBack]);

    const plans = [
        {
            id: 'free' as const,
            plan: null as null,
            name: t.sub_plan_free,
            icon: Zap,
            features: t.sub_features_basic,
            buttonText: t.sub_choose_free,
        },
        {
            id: 'plus' as const,
            plan: 'plus' as const,
            name: t.sub_plan_plus,
            icon: Sparkles,
            features: t.sub_features_plus,
            buttonText: t.sub_choose_plus,
            recommended: true,
        },
        {
            id: 'pro' as const,
            plan: 'pro' as const,
            name: t.sub_plan_pro,
            icon: CreditCard,
            features: t.sub_features_premium,
            buttonText: t.sub_choose_pro,
        },
    ];

    const handlePurchase = async (planId: string) => {
        if (!user) {
            console.error("User not found for purchase");
            return;
        }

        if (planId === 'free') {
            onBack();
            return;
        }

        const plan = planId as 'plus' | 'pro';
        const packageId = getPackageId(plan, billingPeriod);

        if (!packageId) {
            console.error(`No package found for plan=${plan}, period=${billingPeriod}`);
            alert('Error loading subscription package. Please try again.');
            return;
        }

        setIsPurchasing(true);
        setIsLoading(true);

        try {
            console.log(`Direct purchase via Despia: ${packageId} (plan=${plan}, period=${billingPeriod})`);
            const result = await directPurchase({ userId: user.id, productId: packageId });

            if (result.success) {
                console.log('Purchase successful!', result);
                // Start polling for backend confirmation
                window.dispatchEvent(new CustomEvent('purchase-processing-started'));
                waitForSubscriptionStatus(user.id, (status) => {
                    window.dispatchEvent(new CustomEvent('subscription-updated', { detail: status }));
                });
            } else if (result.cancelled) {
                console.log('Purchase cancelled by user');
                setIsLoading(false);
                setIsPurchasing(false);
            } else {
                console.error('Purchase failed:', result);
                setIsLoading(false);
                setIsPurchasing(false);
            }
        } catch (error) {
            console.error("Purchase error", error);
            setIsLoading(false);
            setIsPurchasing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto overflow-x-hidden no-scrollbar pb-32 transition-colors duration-500" style={{ touchAction: 'pan-y' }}>
            {/* Elegant Header */}
            <header className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/90 dark:bg-black/90 backdrop-blur-xl z-[100] border-b border-gray-100 dark:border-gray-900 transition-all">
                <button onClick={onBack} className="p-3 -ml-3 rounded-2xl active:scale-95 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
                    <ChevronLeft className="text-gray-900 dark:text-white" size={20} />
                </button>
                <div className="flex flex-col items-center flex-1">
                    <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-widest uppercase italic">{t.sub_title}</h1>
                    <div className="h-1 w-8 rounded-full mt-1" style={{ backgroundColor: accentColor }}></div>
                </div>
            </header>

            <main className="px-6 pt-6 space-y-10 max-w-lg mx-auto w-full">
                {/* Hero Section */}
                <div className="text-center space-y-3">
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight px-4 leading-[1.1]">
                        {t.sub_hero_title}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium px-10 leading-relaxed">
                        {t.sub_hero_desc}
                    </p>
                </div>

                {/* Neo-Luxury Toggle */}
                <div className="flex justify-center">
                    <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-1.5 rounded-[2rem] flex items-center gap-1 w-full border border-gray-100 dark:border-gray-800 shadow-inner">
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`flex-1 py-4 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all duration-500 ${billingPeriod === 'monthly' ? 'bg-white dark:bg-gray-800 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]' : 'text-gray-400'}`}
                            style={{ color: billingPeriod === 'monthly' ? accentColor : undefined }}
                        >
                            {t.sub_monthly}
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            className={`flex-1 py-4 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all duration-500 relative ${billingPeriod === 'yearly' ? 'bg-white dark:bg-gray-800 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]' : 'text-gray-400'}`}
                            style={{ color: billingPeriod === 'yearly' ? accentColor : undefined }}
                        >
                            {t.sub_yearly}
                            {billingPeriod !== 'yearly' && (
                                <span className="absolute -top-3 -right-2 bg-indigo-500 text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg">
                                    -20%
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Card Stack */}
                <div className="space-y-6" style={{ touchAction: 'pan-y', overflowX: 'hidden' }}>
                    {plans.map((plan) => {
                        const isSelected = activePlanId === plan.id;
                        const PlanIcon = plan.icon;

                        // Dynamic price from RevenueCat
                        const displayPrice = plan.plan
                            ? getDynamicPrice(plan.plan, billingPeriod)
                            : '0€';

                        return (
                            <div
                                key={plan.id}
                                onClick={() => setActivePlanId(plan.id)}
                                className={`relative group cursor-pointer rounded-[3rem] p-1 transition-all duration-700 ${isSelected ? 'scale-[1.02]' : 'scale-100'}`}
                                style={{
                                    background: isSelected ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}66 100%)` : 'transparent'
                                }}
                            >
                                <div className={`h-full w-full bg-white dark:bg-gray-900 rounded-[2.9rem] p-8 shadow-2xl transition-all duration-500 overflow-hidden ${isSelected ? 'dark:bg-gray-800/90' : 'opacity-80'}`}>
                                    {isSelected && (
                                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full mix-blend-soft-light filter blur-3xl animate-pulse"
                                            style={{ backgroundColor: accentColor }}></div>
                                    )}

                                    {plan.recommended && (
                                        <div className="absolute top-6 right-8 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-xl animate-bounce" style={{ backgroundColor: accentColor }}>
                                            {t.sub_recommended}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-8">
                                        <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all duration-500 ${isSelected ? 'shadow-lg rotate-3' : 'bg-gray-50 dark:bg-black'}`}
                                            style={{
                                                backgroundColor: isSelected ? accentColor : undefined,
                                                color: isSelected ? 'white' : accentColor
                                            }}>
                                            <PlanIcon size={28} strokeWidth={isSelected ? 2.5 : 2} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-black text-gray-900 dark:text-white text-2xl tracking-tight leading-none mb-1">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tighter" style={{ color: isSelected ? accentColor : undefined }}>
                                                    {!pricesLoaded && plan.plan ? '...' : displayPrice}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    / {billingPeriod === 'monthly' ? t.sub_per_month.split(' ')[1] : t.sub_per_year.split(' ')[1]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-10 pl-2">
                                        {plan.features.map((feature, i) => (
                                            <div key={i} className={`flex items-start gap-4 transition-all duration-500 ${isSelected ? 'translate-x-1' : ''}`} style={{ transitionDelay: `${i * 100}ms` }}>
                                                <div className="mt-1 flex-shrink-0">
                                                    <Check size={14} style={{ color: isSelected ? accentColor : '#94A3B8' }} strokeWidth={4} />
                                                </div>
                                                <span className={`text-sm font-bold leading-snug transition-colors ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePurchase(plan.id);
                                        }}
                                        disabled={isLoading || isPurchasing}
                                        className="w-full relative overflow-hidden group/btn py-6 rounded-[2rem] text-white font-black text-sm uppercase tracking-[0.25em] shadow-2xl active:scale-[0.97] transition-all duration-500"
                                        style={{ backgroundColor: isSelected ? accentColor : '#334155' }}
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-3">
                                            {(isLoading || isPurchasing) && activePlanId === plan.id ? (
                                                <RefreshCw size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    {plan.buttonText}
                                                    <Zap size={16} className="opacity-50 group-hover/btn:scale-125 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-white/30"></div>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Manage Subscription / Unsubscribe Section */}
                <div className="mt-2 rounded-[2rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 text-center">{t.sub_manage_title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-5 leading-relaxed">
                        {t.sub_manage_desc}
                    </p>
                    <button
                        onClick={() => {
                            // iOS: opens App Store subscription management
                            // Android: opens Google Play subscription management
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            if (isIOS) {
                                window.open('https://apps.apple.com/account/subscriptions', '_blank');
                            } else {
                                window.open('https://play.google.com/store/account/subscriptions', '_blank');
                            }
                        }}
                        className="w-full py-4 rounded-[1.5rem] border-2 border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 font-black text-xs uppercase tracking-[0.2em] active:scale-[0.97] transition-all hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        {t.sub_manage_button}
                    </button>
                </div>

                {/* Compliance Footer */}
                <div className="flex flex-col items-center space-y-8 pt-6 pb-12 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-600">
                        <a href="#" className="hover:text-indigo-500 transition-colors">Terms</a>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                        <a href="#" className="hover:text-indigo-500 transition-colors">Privacy</a>
                    </div>

                    <div className="flex flex-col items-center gap-2 px-12 text-center">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.ssl_label}</span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                            {t.sub_cancel_disclaimer}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};
