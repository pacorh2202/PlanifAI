
import React, { useState, useEffect } from 'react';
import { usePlanAILive } from '../hooks/usePlanAILive';
import { useCalendar } from '../contexts/CalendarContext';
import { Visualizer } from './Visualizer';

export const ChatScreen: React.FC = () => {
  const { connect, disconnect, connected, isTalking, isThinking, volume } = usePlanAILive();
  const { t, assistantVoice } = useCalendar();

  useEffect(() => {
    // Check for first run on mount
    const hasRunBefore = localStorage.getItem('planai_onboarding_done');
    if (!hasRunBefore) {
      console.log("First run detected. Onboarding will trigger on first connection.");
    }
  }, []);

  const handleToggleConnection = () => {
    if (connected) {
      disconnect();
    } else {
      const hasRunBefore = localStorage.getItem('planai_onboarding_done');
      if (!hasRunBefore) {
        connect(assistantVoice, true);
        localStorage.setItem('planai_onboarding_done', 'true');
      } else {
        connect(assistantVoice, false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-rose-100/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-100/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Simplified Navigation Top Bar */}
      <div className="pt-14 px-6 z-20 flex justify-center items-center relative">
        <div className="text-center">
          <h1 className="text-xl font-black text-gray-900 tracking-tighter">PlanifAI</h1>
          <p className="text-[10px] text-[#94A3B8] uppercase font-black tracking-[0.2em] mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
        <Visualizer active={connected} volume={volume} isTalking={isTalking} isThinking={isThinking} />
      </div>

      {/* Connection Toggle Button */}
      <div className="pb-40 pt-4 px-4 flex justify-center z-20">
        <button
          onClick={handleToggleConnection}
          className={`relative group rounded-full transition-all duration-500 focus:outline-none focus:ring-0 tap-highlight-transparent ${connected ? 'scale-110' : 'scale-100'}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-tr from-rose-400 via-indigo-400 to-rose-400 rounded-full blur-2xl opacity-40 transition-opacity duration-700 ${connected ? 'opacity-90 animate-pulse' : 'opacity-0'}`}></div>

          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden border-2 ${connected ? 'bg-black border-white/40 shadow-indigo-500/20' : 'bg-white border-gray-100 shadow-xl'}`}>
            <div className="flex items-center justify-center gap-1.5 h-12 w-12">
              <div className={`w-1.5 rounded-full animate-wave ${connected ? 'bg-gradient-to-t from-rose-400 to-indigo-400' : 'bg-gray-600 dark:bg-gray-300'}`} style={{ animationDelay: '0s' }}></div>
              <div className={`w-1.5 rounded-full animate-wave ${connected ? 'bg-gradient-to-t from-rose-400 to-indigo-400' : 'bg-gray-600 dark:bg-gray-300'}`} style={{ animationDelay: '0.2s' }}></div>
              <div className={`w-1.5 rounded-full animate-wave ${connected ? 'bg-gradient-to-t from-rose-400 to-indigo-400' : 'bg-gray-600 dark:bg-gray-300'}`} style={{ animationDelay: '0.4s' }}></div>
              <div className={`w-1.5 rounded-full animate-wave ${connected ? 'bg-gradient-to-t from-rose-400 to-indigo-400' : 'bg-gray-600 dark:bg-gray-300'}`} style={{ animationDelay: '0.1s' }}></div>
              <div className={`w-1.5 rounded-full animate-wave ${connected ? 'bg-gradient-to-t from-rose-400 to-indigo-400' : 'bg-gray-600 dark:bg-gray-300'}`} style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
