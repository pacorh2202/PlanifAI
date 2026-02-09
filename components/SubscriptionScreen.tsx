
import React, { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

interface SubscriptionScreenProps {
    onBack: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack }) => {
    const { accentColor, t } = useCalendar();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [activePlanId, setActivePlanId] = useState<string | null>(null);

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
        <div className="flex flex-col h-full bg-[#F8FAFC]  overflow-y-auto no-scrollbar pb-20 transition-colors duration-300">
            <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80/80 backdrop-blur-md z-20">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 :bg-gray-800 transition-colors">
                    <ChevronLeft className="text-gray-900 " size={28}/>
                </button>
                <h1 className="text-xl font-bold text-gray-900  tracking-tight text-center flex-1 pr-6">{t.sub_title}</h1>
            </header>

            <main className="px-6 pt-4 space-y-8">
                {/* Toggle Mensual/Anual */}
                <div className="flex justify-center">
                    <div className="bg-gray-100  p-1.5 rounded-full flex items-center gap-1 w-full max-w-[300px] border border-gray-200/30 ">
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${billingPeriod === 'monthly' ? 'bg-white  shadow-sm' : 'text-gray-400'}`}
                            style={{ color: billingPeriod === 'monthly' ? accentColor : undefined }}
                        >
                            {t.sub_monthly}
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${billingPeriod === 'yearly' ? 'bg-white  shadow-sm' : 'text-gray-400'}`}
                            style={{ color: billingPeriod === 'yearly' ? accentColor : undefined }}
                        >
                            {t.sub_yearly}
                        </button>
                    </div>
                </div>

                <div className="space-y-6 pb-8">
                    {plans.map((plan) => {
                        const isActive = activePlanId === plan.id || (activePlanId === null && plan.recommended);

                        return (
                            <div
                                key={plan.id}
                                onMouseEnter={() => setActivePlanId(plan.id)}
                                onClick={() => setActivePlanId(plan.id)}
                                className={`relative bg-white  rounded-[2.5rem] p-8 shadow-sm border-2 transition-all duration-500 transform ${isActive ? 'scale-[1.02] shadow-xl' : 'scale-100 opacity-90'}`}
                                style={{
                                    borderColor: isActive ? accentColor : 'transparent',
                                    boxShadow: isActive ? `0 20px 40px -15px ${accentColor}33` : undefined
                                }}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-3 right-8 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg z-10" style={{ backgroundColor: '#3b82f6' }}>
                                        RECOMENDADO
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-bold text-gray-900  text-2xl tracking-tight transition-colors" style={{ color: isActive ? accentColor : undefined }}>{plan.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-gray-900  tracking-tighter transition-all" style={{ color: isActive ? accentColor : undefined }}>
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
                                                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300`}
                                                style={{ backgroundColor: isActive ? `${accentColor}20` : '#F1F5F9' }}
                                            >
                                                <Check size={12} style={{ color: isActive ? accentColor : '#94A3B8' }} strokeWidth={4}/>
                                            </div>
                                            <span className={`text-sm font-medium leading-tight transition-colors ${isActive ? 'text-gray-900 ' : 'text-gray-500 '}`}>
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="w-full py-5 rounded-3xl text-white font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all duration-300"
                                    style={{
                                        backgroundColor: isActive ? accentColor : '#94A3B8',
                                        transform: isActive ? 'translateY(-2px)' : 'none'
                                    }}
                                >
                                    {plan.buttonText}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest px-12 leading-relaxed pb-10">
                    Puedes cancelar tu suscripción en cualquier momento desde los ajustes de tu cuenta.
                </p>
            </main>
        </div>
    );
};
