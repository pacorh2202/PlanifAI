
import React from 'react';
import { ChevronLeft, Database, Activity, Cpu, Cloud, Lock, UserRoundPen } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

interface PrivacyScreenProps {
  onBack: () => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  const { accentColor, t } = useCalendar();

  const sections = [
    {
      icon: <Database size={20}/>,
      title: t.privacy_q1,
      content: (
        <ul className="space-y-3 mt-3 text-sm text-gray-600 ">
          <li className="flex gap-2">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}/>
            <p>{t.privacy_q1_p1}</p>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}/>
            <p>{t.privacy_q1_p2}</p>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}/>
            <p>{t.privacy_q1_p3}</p>
          </li>
        </ul>
      )
    },
    { icon: <Activity size={20}/>, title: t.privacy_q2, description: t.privacy_q2_desc },
    { icon: <Cpu size={20}/>, title: t.privacy_q3, description: t.privacy_q3_desc },
    { icon: <Cloud size={20}/>, title: t.privacy_q4, description: t.privacy_q4_desc },
    { icon: <Lock size={20}/>, title: t.privacy_q5, description: t.privacy_q5_desc },
    { icon: <UserRoundPen size={20}/>, title: t.privacy_q6, description: t.privacy_q6_desc }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]  overflow-y-auto no-scrollbar pb-10 transition-colors duration-300">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 :bg-gray-800 transition-colors">
          <ChevronLeft className="text-gray-900 " size={28}/>
        </button>
        <h1 className="text-xl font-bold text-gray-900  tracking-tight">{t.privacy_title}</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6 space-y-4 pt-2">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white  rounded-[2rem] p-6 shadow-sm border border-gray-100  transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>{section.icon}</div>
              <h2 className="text-[17px] font-bold text-gray-900  tracking-tight">{section.title}</h2>
            </div>
            {section.description && <p className="text-sm text-gray-600  leading-relaxed">{section.description}</p>}
            {section.content}
          </div>
        ))}

        <div className="pt-12 pb-8 text-center px-8">
          <p className="text-[10px] text-gray-400  font-bold uppercase tracking-[0.2em] leading-relaxed opacity-60">
            {t.privacy_updated} {t.privacy_footer}
          </p>
        </div>
      </main>
    </div>
  );
};
