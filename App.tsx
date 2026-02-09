
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarProvider, useCalendar } from './contexts/CalendarContext';
import { useAuth } from './src/contexts/AuthContext';
import { AuthScreen } from './src/components/AuthScreen';
import { ChatScreen } from './components/ChatScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { StatsScreen } from './components/StatsScreen';
import { FriendsScreen } from './components/FriendsScreen';
import { ColorPaletteScreen } from './components/ColorPaletteScreen';
import { CustomPaletteScreen } from './components/CustomPaletteScreen';
import { PrivacyScreen } from './components/PrivacyScreen';
import { LanguageScreen } from './components/LanguageScreen';
import { AccountConfigScreen } from './components/AccountConfigScreen';
import { SubscriptionScreen } from './components/SubscriptionScreen';
import { VoiceSettingsScreen } from './components/VoiceSettingsScreen';
import { SuggestionsScreen } from './components/SuggestionsScreen';
import {
  BarChart2, Users, Calendar, MessageSquare, Menu, ChevronRight,
  Check, Palette, Mic, Settings, Bell, Sparkles, Globe, Pencil, Loader2, LogOut
} from 'lucide-react';

type TabType = 'chat' | 'calendar' | 'friends' | 'stats' | 'settings';

const AppContent: React.FC = () => {
  const { accentColor, isDetailViewOpen, t } = useCalendar();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [settingsView, setSettingsView] = useState<'main' | 'colors' | 'custom-palette' | 'privacy' | 'language' | 'account' | 'subscriptions' | 'voice-settings' | 'suggestions'>('main');

  const TABS: { id: TabType; icon: any; label: string }[] = [
    { id: 'chat', icon: Mic, label: t.chat_tab },
    { id: 'calendar', icon: Calendar, label: t.agenda_tab },
    { id: 'friends', icon: Users, label: t.friends_tab },
    { id: 'stats', icon: BarChart2, label: t.stats_tab },
    { id: 'settings', icon: Menu, label: t.menu_tab },
  ];

  const isSubSetting = activeTab === 'settings' && settingsView !== 'main';
  const showNavbar = !isSubSetting && !isDetailViewOpen;

  const renderScreen = () => {
    switch (activeTab) {
      case 'chat': return <ChatScreen/>;
      case 'calendar': return <CalendarScreen/>;
      case 'stats': return <StatsScreen/>;
      case 'friends': return <FriendsScreen/>;
      case 'settings':
        switch (settingsView) {
          case 'main': return <SettingsMainView onViewChange={setSettingsView} onClose={() => setActiveTab('chat')}/>;
          case 'colors': return <ColorPaletteScreen onBack={() => setSettingsView('main')} onOpenCustom={() => setSettingsView('custom-palette')}/>;
          case 'custom-palette': return <CustomPaletteScreen onBack={() => setSettingsView('colors')}/>;
          case 'privacy': return <PrivacyScreen onBack={() => setSettingsView('main')}/>;
          case 'language': return <LanguageScreen onBack={() => setSettingsView('main')}/>;
          case 'account': return <AccountConfigScreen onBack={() => setSettingsView('main')}/>;
          case 'subscriptions': return <SubscriptionScreen onBack={() => setSettingsView('main')}/>;
          case 'voice-settings': return <VoiceSettingsScreen onBack={() => setSettingsView('main')}/>;
          case 'suggestions': return <SuggestionsScreen onBack={() => setSettingsView('main')}/>;
          default: return null;
        }
      default: return null;
    }
  };

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    if (tabId !== 'settings') setSettingsView('main');
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#F8FAFC]  relative text-gray-900  font-sans flex flex-col transition-colors duration-300">
      <div className="flex-1 w-full overflow-hidden relative">
        {renderScreen()}
      </div>

      {showNavbar && (
        <div className="fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent /90 pointer-events-none z-[90] animate-fade-in"></div>
      )}

      {showNavbar && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-[100] animate-fade-in flex justify-center">
          <nav className="w-full max-w-[350px] bg-white/80/85 backdrop-blur-3xl border border-white/40  shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] rounded-[2.2rem] h-[72px] flex items-center justify-around px-1.5 pointer-events-auto transition-all duration-500">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 outline-none tap-highlight-transparent group"
                >
                  <div
                    className={`absolute inset-x-1.5 inset-y-2 rounded-[1.6rem] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-1'
                      }`}
                    style={{
                      backgroundColor: isActive ? accentColor : 'transparent',
                      boxShadow: isActive ? `0 10px 20px -5px ${accentColor}66` : 'none'
                    }}
                  ></div>

                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`relative z-10 transition-all duration-500 ${isActive ? 'text-white scale-110' : 'text-gray-400  group-hover:text-gray-500'
                      }`}
                 />
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

 // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100  ">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-[#B2D3A1]"/>
          <p className="text-gray-600  font-bold">Cargando...</p>
        </div>
      </div>
    );
  }

 // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen/>;
  }

 // User is authenticated - show main app
  return (
    <CalendarProvider>
      <AppContent/>
    </CalendarProvider>
  );
}


const SettingsMainView: React.FC<{ onViewChange: (v: any) => void, onClose: () => void }> = ({ onViewChange, onClose }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { accentColor, userName, assistantName, profileImage, t, language } = useCalendar();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-[#F8FAFC]  transition-colors duration-500">
      {/* Premium Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-1/4 -right-1/4 w-[100%] h-[60%] rounded-full blur-[120px] transition-all duration-[2000ms] opacity-[0.08] [0.15]`} style={{ backgroundColor: accentColor }}></div>
        <div className={`absolute -bottom-1/4 -left-1/4 w-[100%] h-[60%] rounded-full blur-[120px] transition-all duration-[2000ms] opacity-[0.05] [0.1]`} style={{ backgroundColor: accentColor }}></div>
      </div>

      <header className="px-6 pt-14 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80/80 backdrop-blur-xl z-20">
        <div className="w-10"></div>
        <h1 className="text-xl font-black text-gray-900  tracking-tight uppercase tracking-[0.1em]">{t.settings_title}</h1>
        <div className="w-10"></div>
      </header>

      <div className="px-6 pt-2 relative z-10">
        <section className="flex flex-col items-center py-10 bg-white/40/40 backdrop-blur-3xl rounded-[3rem] shadow-xl mb-8 border border-white/60/60 transition-all">
          <div className="mb-6 relative group">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" style={{ backgroundColor: accentColor }}></div>
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black border-4 border-white  shadow-2xl transition-all duration-700 overflow-hidden"
              style={{ backgroundColor: profileImage ? 'transparent' : `${accentColor}22`, color: accentColor }}
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover"/>
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white  shadow-lg flex items-center justify-center border-2 border-white ">
              <Check size={14} style={{ color: accentColor }} strokeWidth={4}/>
            </div>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <h2 className="text-2xl font-black text-gray-900  leading-tight tracking-tight">
              {t.hello}, {userName}!
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-indigo-500/10 text-indigo-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm">{t.premium_plan}</span>
            </div>
          </div>
        </section>

        <main className="space-y-3.5 pb-40">
          <p className="text-[10px] font-black text-gray-400  uppercase tracking-[0.3em] ml-6 mb-4">{t.personalization}</p>

          <button onClick={() => onViewChange('colors')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <Palette size={20}/>
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.personalization}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
          </button>

          <button onClick={() => onViewChange('voice-settings')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <Mic size={20}/>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-[15px] text-gray-800 ">{t.voice_assistant}</span>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{assistantName}</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
          </button>

          <p className="text-[10px] font-black text-gray-400  uppercase tracking-[0.3em] ml-6 mt-8 mb-4">{t.account_config}</p>

          <button onClick={() => onViewChange('account')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <Settings size={20}/>
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.account_config}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
          </button>

          <div className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 transition-all shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center" style={{ color: accentColor }}>
                <Bell size={20}/>
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.notifications}</span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className="relative inline-flex items-center h-8 w-14 rounded-full transition-all duration-500 focus:outline-none shadow-inner"
              style={{ backgroundColor: notificationsEnabled ? accentColor : 'rgba(226, 232, 240, 0.4)' }}
            >
              <div
                className={`inline-block w-6 h-6 transform bg-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-lg ${notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
             />
            </button>
          </div>

          <button onClick={() => onViewChange('language')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <Globe size={20}/>
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.language}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-black uppercase tracking-widest">{language === 'es' ? 'Esp' : 'Eng'}</span>
              <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
            </div>
          </button>

          <button onClick={() => onViewChange('subscriptions')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <Sparkles size={20}/>
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.subscriptions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/10 text-indigo-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm">Premium</span>
              <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
            </div>
          </button>

          <button onClick={() => onViewChange('privacy')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <Pencil size={20}/> {/* Changed from LockIcon to Pencil as LockIcon is not imported */}
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.privacy}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
          </button>

          <button onClick={() => onViewChange('suggestions')} className="w-full bg-white/60/60 backdrop-blur-xl rounded-[2.2rem] p-5 flex items-center justify-between border border-white/80/80 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-50  flex items-center justify-center transition-colors group-hover:bg-white :bg-gray-700" style={{ color: accentColor }}>
                <MessageSquare size={20}/>
              </div>
              <span className="font-bold text-[15px] text-gray-800 ">{t.suggestions || 'Sugerencias'}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform"/>
          </button>

          <p className="text-[9px] text-center text-gray-400 font-black uppercase tracking-[0.3em] opacity-40 py-4">
            PlanifAI v1.0.0
          </p>

        </main>
      </div>
    </div>
  );
};

function LockIcon({ size }: { size: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>lock</span>;
}

export default App;
