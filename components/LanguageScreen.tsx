
import React from 'react';
import { ChevronLeft, Globe, Check } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

interface LanguageScreenProps {
  onBack: () => void;
}

export const LanguageScreen: React.FC<LanguageScreenProps> = ({ onBack }) => {
  const { accentColor, language, setLanguage, t } = useCalendar();

  const languages = [
    { id: 'es', label: 'Español', native: 'Español (España)' },
    { id: 'en', label: 'English', native: 'English (United States)' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-10 transition-colors duration-300">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.language}</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6 space-y-6 pt-2">
        <div className="space-y-4">
          {languages.map((lang) => {
            const isSelected = language === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id as any)}
                className={`w-full flex items-center justify-between p-7 rounded-[2.5rem] bg-white dark:bg-gray-900 shadow-sm border transition-all duration-300 active:scale-[0.98] ${isSelected ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' : 'border-gray-100 dark:border-gray-800 opacity-70'
                  }`}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    style={{ color: isSelected ? accentColor : '#94A3B8' }}
                  >
                    <Globe size={24} />
                  </div>
                  <div className="text-left">
                    <p className={`font-black text-[17px] tracking-tight ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                      {lang.label}
                    </p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                      {lang.native}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg animate-fade-in"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Check size={16} strokeWidth={4} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-12 px-8">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.25em] text-center leading-relaxed opacity-60">
            {language === 'es'
              ? "Cambiar el idioma afectará a la interfaz y a la voz de respuesta del asistente PlanifAI."
              : "Changing the language will affect the interface and the response voice of the PlanifAI assistant."}
          </p>
        </div>
      </main>
    </div>
  );
};
