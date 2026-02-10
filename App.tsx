
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
  Check, Palette, Mic, Settings, Bell, Sparkles, Globe, Pencil, Loader2
} from 'lucide-react';

type TabType = 'chat' | 'calendar' | 'friends' | 'stats' | 'settings';

const AppContent: React.FC = () => {
  const { accentColor, isDetailViewOpen, t } = useCalendar();
  const { user } = useAuth();
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
      case 'chat': return <ChatScreen />;
      case 'calendar': return <CalendarScreen />;
      case 'stats': return <StatsScreen />;
      case 'friends': return <FriendsScreen />;
      case 'settings':
        switch (settingsView) {
          case 'main': return <SettingsMainView onViewChange={setSettingsView} onClose={() => setActiveTab('chat')} />;
          case 'colors': return <ColorPaletteScreen onBack={() => setSettingsView('main')} onOpenCustom={() => setSettingsView('custom-palette')} />;
          case 'custom-palette': return <CustomPaletteScreen onBack={() => setSettingsView('colors')} />;
          case 'privacy': return <PrivacyScreen onBack={() => setSettingsView('main')} />;
          case 'language': return <LanguageScreen onBack={() => setSettingsView('main')} />;
          case 'account': return <AccountConfigScreen onBack={() => setSettingsView('main')} />;
          case 'subscriptions': return <SubscriptionScreen onBack={() => setSettingsView('main')} />;
          case 'voice-settings': return <VoiceSettingsScreen onBack={() => setSettingsView('main')} />;
          case 'suggestions': return <SuggestionsScreen onBack={() => setSettingsView('main')} />;
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
    <div className="h-[100dvh] w-full overflow-hidden bg-[#F8FAFC] dark:bg-black relative text-gray-900 dark:text-white font-sans flex flex-col transition-colors duration-300">
      <div className="flex-1 w-full overflow-hidden relative">
        {renderScreen()}
      </div>

      {showNavbar && (
        <div className="fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-black dark:via-black/90 pointer-events-none z-[90] animate-fade-in"></div>
      )}

      {showNavbar && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-[100] animate-fade-in flex justify-center">
          <nav className="w-full max-w-[22rem] bg-white/80 dark:bg-gray-900/85 backdrop-blur-3xl border border-white/40 dark:border-gray-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] rounded-[2.2rem] h-[4.5rem] flex items-center justify-around px-1.5 pointer-events-auto transition-all duration-500">
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
                    className={`relative z-10 transition-all duration-500 ${isActive ? 'text-white scale-110' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-500'
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
      <div className="h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-[#B2D3A1]" />
          <p className="text-gray-600 dark:text-gray-400 font-bold">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />;
  }

  // User is authenticated - show main app
  return (
    <CalendarProvider>
      <AppContent />
    </CalendarProvider>
  );
}


const SettingsMainView: React.FC<{ onViewChange: (v: any) => void, onClose: () => void }> = ({ onViewChange, onClose }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { accentColor, userName, assistantName, profileImage, t, language } = useCalendar();

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-background-light dark:bg-background-dark transition-colors duration-300">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md z-20">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.settings_title}</h1>
        <div className="w-10"></div>
      </header>

      <div className="px-6 pt-2">
        <section className="flex flex-col items-center py-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
          <div className="mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-lg transition-colors duration-500 overflow-hidden"
              style={{ backgroundColor: profileImage ? 'transparent' : `${accentColor}33`, color: accentColor }}
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {t.hello}, {userName}!
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">{t.premium_plan}</p>
            <p className="text-[10px] font-mono text-gray-300 mt-1">v2.1-fixed</p>
          </div>
        </section>

        <main className="space-y-3 pb-52">
          <button onClick={() => onViewChange('colors')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <Palette size={18} />
              </div>
              <span className="font-bold text-sm">{t.personalization}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
          </button>

          <button onClick={() => onViewChange('voice-settings')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <Mic size={18} />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm">{t.voice_assistant}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{assistantName}</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
          </button>

          <button onClick={() => onViewChange('account')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <Settings size={18} />
              </div>
              <span className="font-bold text-sm">{t.account_config}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
          </button>

          <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <Bell size={18} />
              </div>
              <span className="font-bold text-sm">{t.notifications}</span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className="relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-300 focus:outline-none"
              style={{ backgroundColor: notificationsEnabled ? accentColor : '#E2E8F0' }}
            >
              <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          <button onClick={() => onViewChange('language')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <Globe size={18} />
              </div>
              <span className="font-bold text-sm">{t.language}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-bold">{language === 'es' ? 'Español' : 'English'}</span>
              <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
            </div>
          </button>

          <button onClick={() => onViewChange('subscriptions')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <Sparkles size={18} />
              </div>
              <span className="font-bold text-sm">{t.subscriptions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/10 text-indigo-500 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Premium</span>
              <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
            </div>
          </button>

          <button onClick={() => onViewChange('privacy')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <LockIcon size={18} />
              </div>
              <span className="font-bold text-sm">{t.privacy}</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
          </button>

          {/* New Suggestions Section */}
          <button onClick={() => onViewChange('suggestions')} className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 active:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: accentColor }}>
                <MessageSquare size={18} />
              </div>
              <span className="font-bold text-sm">Sugerencias</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-active:translate-x-1 transition-transform" />
          </button>

        </main>
      </div>
    </div>
  );
};

function LockIcon({ size }: { size: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>lock</span>;
}

export default App;
