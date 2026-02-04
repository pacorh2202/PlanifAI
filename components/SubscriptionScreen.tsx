
import React, { useState } from 'react';
import { ChevronLeft, Check, Zap, ShieldCheck, Crown } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

interface SubscriptionScreenProps {
  onBack: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack }) => {
  const { accentColor, t } = useCalendar();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('premium');

  const plans = {
    basic: {
      name: t.sub_basic_name,
      price: "0€",
      features: t.sub_features_basic,
      icon: <Zap size={24} />
    },
    premium: {
      name: t.sub_premium_name,
      price: billingPeriod === 'monthly' ? "5€" : "50€",
      features: t.sub_features_premium,
      icon: <Crown size={24} />
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-20 transition-colors duration-300">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.sub_title}</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6 pt-8 space-y-12">
        <div className="text-center space-y-3 px-4">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight">{t.sub_hero_title}</h2>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest opacity-60 leading-relaxed">{t.sub_hero_desc}</p>
        </div>

        <div className="flex justify-center">
            <div className="bg-gray-100 dark:bg-gray-900 p-1.5 rounded-[1.8rem] flex items-center gap-1 w-full max-w-[300px] border border-gray-200/30 dark:border-gray-800">
                <button onClick={() => setBillingPeriod('monthly')} className={`flex-1 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${billingPeriod === 'monthly' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>{t.sub_monthly}</button>
                <button onClick={() => setBillingPeriod('yearly')} className={`flex-1 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all relative ${billingPeriod === 'yearly' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>{t.sub_yearly} <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[7px] px-1.5 py-0.5 rounded-full shadow-lg">{t.sub_save}</span></button>
            </div>
        </div>

        <div className="space-y-12 pb-8">
            <div onClick={() => setSelectedPlan('basic')} className={`group relative bg-white dark:bg-gray-900 rounded-[3rem] p-9 border-2 transition-all duration-500 cursor-pointer ${selectedPlan === 'basic' ? 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]' : 'border-transparent opacity-50 grayscale hover:opacity-70'}`} style={{ borderColor: selectedPlan === 'basic' ? accentColor : 'transparent' }}>
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">{plans.basic.icon}</div>
                        <div>
                            <h3 className="font-black text-gray-900 dark:text-white text-xl">{plans.basic.name}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.sub_basic_desc}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{plans.basic.price}</span>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.sub_per_month}</p>
                    </div>
                </div>
                <ul className="space-y-4">
                    {plans.basic.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />{feature}</li>
                    ))}
                </ul>
            </div>

            <div onClick={() => setSelectedPlan('premium')} className={`group relative bg-white dark:bg-gray-900 rounded-[3rem] p-9 border-2 transition-all duration-500 cursor-pointer overflow-hidden ${selectedPlan === 'premium' ? 'shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] scale-[1.02]' : 'border-transparent opacity-50 grayscale hover:opacity-70'}`} style={{ borderColor: selectedPlan === 'premium' ? accentColor : 'transparent' }}>
                <div className="absolute top-0 right-0 px-8 py-2 rounded-bl-[2rem] text-[9px] font-black uppercase tracking-[0.2em] text-white" style={{ backgroundColor: accentColor }}>Pro</div>
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: accentColor }}>{plans.premium.icon}</div>
                        <div>
                            <h3 className="font-black text-gray-900 dark:text-white text-xl">{plans.premium.name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{t.sub_premium_desc}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{plans.premium.price}</span>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">/ {billingPeriod === 'monthly' ? t.sub_monthly.toLowerCase() : t.sub_yearly.toLowerCase()}</p>
                    </div>
                </div>
                <ul className="space-y-4">
                    {plans.premium.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 font-bold"><Check size={18} style={{ color: accentColor }} strokeWidth={3} />{feature}</li>
                    ))}
                </ul>
            </div>
        </div>

        <div className="pt-6">
            <button className="w-full py-6 rounded-[2.5rem] text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all" style={{ backgroundColor: accentColor }}>{selectedPlan === 'basic' ? t.sub_select : t.sub_subscribe}</button>
            <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-10 px-12 leading-relaxed opacity-50">{t.sub_footer}</p>
        </div>

        <div className="pt-12 flex flex-col items-center gap-8 border-t border-gray-100 dark:border-gray-900">
            <div className="flex items-center gap-2.5 text-[#078809] bg-[#078809]/5 px-5 py-2 rounded-full">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.ssl_label}</span>
            </div>
        </div>
      </main>
    </div>
  );
};
