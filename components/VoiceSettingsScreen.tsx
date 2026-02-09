
import React, { useState, useRef } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ChevronLeft, Check, Pencil, Mic2, UserCircle2 } from 'lucide-react';

interface VoiceSettingsScreenProps {
  onBack: () => void;
}

export const VoiceSettingsScreen: React.FC<VoiceSettingsScreenProps> = ({ onBack }) => {
  const { accentColor, assistantName, setAssistantName, assistantVoice, setAssistantVoice, t } = useCalendar();
  const [tempName, setTempName] = useState(assistantName);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 50);
  };

  const handleSaveName = () => {
    if (tempName.trim()) setAssistantName(tempName);
    else setTempName(assistantName);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]  relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[140%] h-[40%] rounded-full blur-[120px] transition-all duration-[1500ms] ${isEditing ? 'opacity-[0.22] scale-110' : 'opacity-[0.08] [0.15]'}`} style={{ backgroundColor: accentColor }}></div>
      </div>

      <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 z-30">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50/50 backdrop-blur-xl border border-white/20  active:scale-90 transition-all">
          <ChevronLeft className="text-gray-900 " size={20}/>
        </button>
        <h1 className="text-sm font-black text-gray-400  uppercase tracking-[0.2em]">{t.voice_profile}</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-40 relative z-10 flex flex-col">
        <section className="flex flex-col items-center justify-center py-10">
            <div className="relative group w-full max-w-sm flex flex-col items-center">
                <div className="relative w-32 h-32 mb-10 group cursor-default">
                    <div className="absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse transition-colors duration-700" style={{ backgroundColor: accentColor, animationDuration: '4s' }}></div>
                    <div className="relative w-full h-full rounded-full bg-black  flex items-center justify-center shadow-2xl overflow-hidden border-4 border-white/10/5">
                        <div className="flex items-center justify-center gap-1.5 h-12 w-20">
                             <div className="w-1.5 rounded-full animate-wave bg-gradient-to-t from-rose-400 to-indigo-400" style={{ animationDuration: '1s', animationDelay: '0s' }}></div>
                             <div className="w-1.5 rounded-full animate-wave bg-gradient-to-t from-rose-400 to-indigo-400" style={{ animationDuration: '0.8s', animationDelay: '0.2s' }}></div>
                             <div className="w-1.5 rounded-full animate-wave bg-gradient-to-t from-rose-400 to-indigo-400" style={{ animationDuration: '1.2s', animationDelay: '0.4s' }}></div>
                             <div className="w-1.5 rounded-full animate-wave bg-gradient-to-t from-rose-400 to-indigo-400" style={{ animationDuration: '0.9s', animationDelay: '0.1s' }}></div>
                             <div className="w-1.5 rounded-full animate-wave bg-gradient-to-t from-rose-400 to-indigo-400" style={{ animationDuration: '1.1s', animationDelay: '0.3s' }}></div>
                        </div>
                    </div>
                </div>

                <div className="relative w-full bg-white/40/40 backdrop-blur-3xl rounded-[3.5rem] p-8 border border-white/60/60 shadow-xl flex flex-col items-center">
                    <p className="text-[10px] font-black text-gray-400  uppercase tracking-[0.3em] mb-6">{t.voice_personalize}</p>
                    <div className="grid grid-cols-[56px_1fr_56px] items-center w-full">
                        <div className="w-14 h-14 pointer-events-none opacity-0"></div>
                        <div className="flex flex-col items-center justify-center overflow-hidden">
                            {isEditing ? (
                                <input ref={inputRef} type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} onBlur={handleSaveName} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} className="text-center text-4xl font-black text-gray-900  bg-transparent border-none focus:ring-0 p-0 tracking-tighter w-full placeholder:opacity-20" placeholder="..."/>
                            ) : (
                                <h2 onClick={handleStartEditing} className="text-4xl font-black text-gray-900  tracking-tighter cursor-text truncate max-w-full">{assistantName}</h2>
                            )}
                            <div className={`h-1 rounded-full mt-3 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isEditing ? 'bg-indigo-500 w-full opacity-100' : 'bg-gray-200  w-10 opacity-40'}`}></div>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={isEditing ? handleSaveName : handleStartEditing} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg active:scale-90 ${isEditing ? 'text-white scale-110' : 'bg-white  text-gray-400 border border-gray-100 '}`} style={{ backgroundColor: isEditing ? accentColor : '' }}>
                                {isEditing ? <Check size={26} strokeWidth={3}/> : <Pencil size={20}/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mt-8">
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="w-8 h-8 rounded-full bg-gray-100  flex items-center justify-center text-gray-400"><Mic2 size={14}/></div>
                <h2 className="text-[11px] font-black text-gray-400  uppercase tracking-[0.3em]">{t.voice_personality}</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {[
                    { id: 'Zephyr', label: t.voice_fem, desc: t.voice_fem_desc, icon: <UserCircle2 size={24}/> },
                    { id: 'Puck', label: t.voice_masc, desc: t.voice_masc_desc, icon: <UserCircle2 size={24}/> }
                ].map((voice) => {
                    const isSelected = assistantVoice === voice.id;
                    return (
                        <button key={voice.id} onClick={() => setAssistantVoice(voice.id as any)} className={`group relative flex items-center gap-5 p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${isSelected ? 'bg-white  border-transparent shadow-xl translate-y-[-2px]' : 'bg-white/40/20 border-gray-100  opacity-60'}`} style={{ borderColor: isSelected ? accentColor : 'transparent' }}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isSelected ? 'text-white' : 'bg-gray-50  text-gray-400'}`} style={{ backgroundColor: isSelected ? accentColor : '' }}>{voice.icon}</div>
                            <div className="flex-1 text-left">
                                <h3 className={`font-black text-base tracking-tight ${isSelected ? 'text-gray-900 ' : 'text-gray-500'}`}>{voice.label}</h3>
                                <p className="text-[11px] text-gray-400  font-medium mt-0.5">{voice.desc}</p>
                            </div>
                            {isSelected && <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg animate-fade-in" style={{ backgroundColor: accentColor }}><Check size={16} strokeWidth={4}/></div>}
                        </button>
                    );
                })}
            </div>
        </section>

        <div className="mt-auto pt-14">
            <button onClick={onBack} className="w-full py-6 rounded-[2.8rem] text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all" style={{ backgroundColor: accentColor, boxShadow: `0 20px 60px -10px ${accentColor}66` }}>{t.confirm_identity}</button>
            <p className="text-[9px] text-gray-400  font-black uppercase tracking-[0.2em] mt-10 text-center opacity-60 leading-relaxed">{t.voice_confirm_desc}</p>
        </div>
      </main>
    </div>
  );
};
