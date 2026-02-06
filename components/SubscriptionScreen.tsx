
import React, { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

interface SubscriptionScreenProps {
    onBack: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack }) => {
    const { accentColor, t } = useCalendar();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            id: 'free',
            name: 'Plan Free',
            monthlyPrice: '0€',
            yearlyPrice: '0€',
            features: t.sub_features_basic,
            buttonText: 'Elegir Plan Free'
        },
        {
            id: 'plus',
            name: 'Plan Plus',
            monthlyPrice: '5€',
            yearlyPrice: '50€',
            features: t.sub_features_plus,
            buttonText: 'Elegir Plan Plus',
            recommended: billingPeriod === 'yearly'
        },
        {
            id: 'pro',
            name: 'Plan Pro',
            monthlyPrice: '10€',
            yearlyPrice: '100€',
            features: t.sub_features_premium,
            buttonText: 'Elegir Plan Pro'
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-20 transition-colors duration-300">
            <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                    <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.sub_title}</h1>
                <div className="w-10"></div>
            </header>

            <main className="px-6 pt-4 space-y-8">
                {/* Toggle Mensual/Anual */}
                <div className="flex justify-center">
                    <div className="bg-gray-100 dark:bg-gray-900 p-1.5 rounded-full flex items-center gap-1 w-full max-w-[300px] border border-gray-200/30 dark:border-gray-800">
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${billingPeriod === 'monthly' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-400'}`}
                            style={{ color: billingPeriod === 'monthly' ? accentColor : undefined }}
                        >
                            {t.sub_monthly}
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${billingPeriod === 'yearly' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-400'}`}
                            style={{ color: billingPeriod === 'yearly' ? accentColor : undefined }}
                        >
                            {t.sub_yearly}
                        </button>
                    </div>
                </div>

                <div className="space-y-6 pb-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border-2 transition-all duration-300 ${plan.recommended ? 'scale-[1.02]' : ''}`}
                            style={{ borderColor: plan.recommended ? accentColor : 'transparent' }}
                        >
                            {plan.recommended && (
                                <div className="absolute top-4 right-8 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg" style={{ backgroundColor: accentColor, opacity: 0.9 }}>
                                    RECOMENDADO
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-2xl tracking-tight">{plan.name}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                                        {billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                                    </span>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        / {billingPeriod === 'monthly' ? (t.sub_monthly === 'Mensual' ? 'mes' : 'month') : (t.sub_yearly === 'Anual' ? 'año' : 'year')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div
                                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.id === 'free' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                            style={{ backgroundColor: plan.id !== 'free' ? `${accentColor}20` : undefined }}
                                        >
                                            <Check size={12} style={{ color: plan.id === 'free' ? '#94A3B8' : accentColor }} strokeWidth={4} />
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-tight">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="w-full py-5 rounded-3xl text-white font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                                style={{ backgroundColor: accentColor }}
                            >
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest px-12 leading-relaxed pb-10">
                    Puedes cancelar tu suscripción en cualquier momento desde los ajustes de tu cuenta.
                </p>
            </main>
        </div>
    );
};
