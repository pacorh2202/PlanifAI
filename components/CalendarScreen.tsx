
import React, { useState, useEffect, useMemo } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { MapPin, ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import { CalendarEvent, PlannerTemplate } from '../types';
import { EventDetailModal } from './EventDetailModal';
import { ICON_MAP } from '../constants';

type ViewMode = 'day' | 'week' | 'month';

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 100;

export const getEventIcon = (event: CalendarEvent, template: PlannerTemplate) => {
    if (event.categoryLabel) {
        const catByLabel = template.categories.find(c => c.label === event.categoryLabel);
        if (catByLabel) {
            return ICON_MAP[catByLabel.icon] || ICON_MAP.Star;
        }
    }
    const category = template.categories.find(c => c.type === event.type);
    const iconName = category?.icon || 'Star';
    return ICON_MAP[iconName] || ICON_MAP.Star;
};

export const getEventColor = (event: CalendarEvent, template: PlannerTemplate): string => {
    if (event.color) return event.color;
    if (event.categoryLabel) {
        const catByLabel = template.categories.find(c => c.label === event.categoryLabel);
        if (catByLabel) return catByLabel.color;
    }
    const category = template.categories.find(c => c.type === event.type);
    return category ? category.color : template.categories[0].color;
};

export const CalendarScreen: React.FC = () => {
  const { events, updateEvent, activeTemplate, setIsDetailViewOpen, language, t } = useCalendar();
  const [view, setView] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const localeStr = language === 'es' ? 'es-ES' : 'en-US';

  const activeEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId) || null, 
    [events, selectedEventId]
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setCurrentDisplayMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const handlePrev = () => {
    const newDate = new Date(selectedDate);
    if (view === 'day') newDate.setDate(selectedDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(selectedDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (view === 'day') newDate.setDate(selectedDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(selectedDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const dayEvents = useMemo(() => {
    return events.filter(e => {
      const d = new Date(e.start);
      return d.toDateString() === selectedDate.toDateString();
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, selectedDate]);

  const nextEventStatus = useMemo(() => {
    if (view !== 'day') return null;
    const now = currentTime;
    const upcoming = dayEvents.filter(e => new Date(e.end) > now);
    if (upcoming.length === 0) return null;
    const next = upcoming[0];
    const startTime = new Date(next.start);
    if (now >= startTime) {
      return { text: t.in_progress, isActive: true };
    } else {
      const diffMs = startTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) {
        return { text: `${t.starts_in} ${diffMins}m`, isActive: false };
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return { text: `${t.starts_in} ${hours}h ${mins}m`, isActive: false };
      }
    }
  }, [dayEvents, currentTime, view, t]);

  const toggleComplete = (eventId: string, currentStatus: string) => {
    updateEvent(eventId, { status: currentStatus === 'completed' ? 'scheduled' : 'completed' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit', hour12: language === 'en' });
  };

  const renderCategoryLegend = () => (
    <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-4 px-4 pb-20">
        {activeTemplate.categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{cat.label}</span>
            </div>
        ))}
    </div>
  );

  const renderHeader = () => {
    const monthName = selectedDate.toLocaleDateString(localeStr, { month: 'long' }).toUpperCase();
    return (
      <header className="px-6 pt-14 pb-2 flex flex-col gap-4 bg-[#F8FAFC] dark:bg-black transition-colors duration-300">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-[10px] font-black tracking-[0.2em] text-[#94A3B8] uppercase">
              {monthName} {selectedDate.getFullYear()}
            </h2>
            <div className="flex flex-col">
              <h1 className={`font-black text-gray-900 dark:text-white tracking-tighter mt-1 ${view === 'day' ? 'text-6xl' : 'text-5xl'}`}>
                {selectedDate.getDate()}
              </h1>
              {view === 'day' && nextEventStatus && (
                <p className={`text-[11px] font-black uppercase tracking-[0.15em] mt-2 transition-opacity duration-500 ${nextEventStatus.isActive ? 'text-blue-500 animate-pulse' : 'text-[#FF7566]'}`}>
                  {nextEventStatus.text}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200/50 dark:border-gray-700">
                {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
                <button
                    key={m}
                    onClick={() => setView(m)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    view === m 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-[#94A3B8]'
                    }`}
                >
                    {m === 'day' ? t.view_day : m === 'week' ? t.view_week : t.view_month}
                </button>
                ))}
            </div>
            <button 
                onClick={() => {
                    setIsAddingManually(true);
                    setIsDetailViewOpen(true);
                }}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2.5 rounded-2xl shadow-sm active:scale-95 transition-all text-gray-900 dark:text-white"
            >
                <Plus size={16} strokeWidth={3} className="text-[#FF7566]" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t.manual_task}</span>
            </button>
          </div>
        </div>
      </header>
    );
  };

  const handleOpenEventDetail = (event: CalendarEvent) => {
    setSelectedEventId(event.id);
    setIsDetailViewOpen(true);
  };

  const handleCloseEventDetail = () => {
    setSelectedEventId(null);
    setIsAddingManually(false);
    setIsDetailViewOpen(false);
  };

  const renderDayView = () => {
    const weekDays = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      weekDays.push(d);
    }
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <section className="px-2 mt-4 shrink-0">
          <div className="flex justify-between items-center">
            <button onClick={handlePrev} className="p-2 text-gray-300"><ChevronLeft size={20} /></button>
            <div className="flex-1 flex justify-around items-center gap-1">
              {weekDays.map((d, idx) => {
                const isSelected = d.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(new Date(d))}
                    className={`flex flex-col items-center justify-center w-14 h-20 rounded-2xl transition-all duration-300 ${
                      isSelected 
                      ? 'bg-[#EFF4FF] dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 shadow-sm' 
                      : 'opacity-40'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase mb-1 tracking-wider ${isSelected ? 'text-blue-800 dark:text-blue-300' : 'text-gray-400'}`}>
                      {d.toLocaleDateString(localeStr, { weekday: 'short' }).slice(0, 3)}
                    </span>
                    <span className={`text-2xl font-black ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={handleNext} className="p-2 text-gray-300"><ChevronRight size={20} /></button>
          </div>
        </section>
        
        <div className="mt-8 bg-white dark:bg-gray-950 rounded-t-[3.5rem] flex-1 border-t border-gray-100 dark:border-gray-900 overflow-y-auto no-scrollbar">
          <div className="p-8 pb-80 relative">
            <div className="absolute left-[5.4rem] top-10 bottom-0 w-px bg-gray-100 dark:bg-gray-800 opacity-50"></div>
            <div className="space-y-6">
              {dayEvents.length === 0 ? (
                 <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-[10px]">{t.no_events}</div>
              ) : dayEvents.map(event => {
                const start = new Date(event.start);
                const end = new Date(event.end);
                const timeStr = formatTime(start);
                const endTimeStr = formatTime(end);
                
                const Icon = getEventIcon(event, activeTemplate);
                const dynamicColor = getEventColor(event, activeTemplate);
                
                return (
                  <div key={event.id} className="flex gap-4 items-center group cursor-pointer" onClick={() => handleOpenEventDetail(event)}>
                    <div className="w-16 text-right pr-2">
                      <span className="text-[11px] font-black text-gray-900 dark:text-white block leading-none">{timeStr}</span>
                    </div>
                    <div className="flex-1 flex gap-4 items-center relative z-10">
                      <div 
                        className="w-14 h-24 rounded-[2rem] flex items-center justify-center shadow-sm shrink-0 transition-colors duration-500"
                        style={{ backgroundColor: dynamicColor }}
                      >
                        <Icon className="text-white" size={24} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col justify-center flex-1">
                        <span className="text-[9px] font-black text-[#94A3B8] uppercase tracking-wider mb-0.5">
                          {timeStr} — {endTimeStr}
                        </span>
                        <h3 className={`text-[17px] font-bold text-gray-900 dark:text-white leading-tight ${event.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                          {event.title}
                        </h3>
                        {event.location && (
                           <div className="flex items-center gap-1 mt-1 text-[10px] text-[#94A3B8] font-bold uppercase">
                              <MapPin size={10} />
                              <span>{event.location}</span>
                           </div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(event.id, event.status);
                        }}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                          event.status === 'completed' 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        {event.status === 'completed' && <Check size={18} strokeWidth={4} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {renderCategoryLegend()}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
    const getDayEvents = (date: Date) => {
      return events.filter(e => new Date(e.start).toDateString() === date.toDateString());
    };
    const dayLabels = language === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors duration-300 overflow-y-auto no-scrollbar relative">
        <div className="px-6 pt-4 flex sticky top-0 bg-white dark:bg-gray-950 z-20 border-b border-gray-100 dark:border-gray-900 pb-4">
          <div className="w-12 shrink-0"></div>
          <div className="flex-1 grid grid-cols-7 text-center gap-1">
            {dayLabels.map((label, i) => {
              const date = weekDays[i];
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <div key={i} className="flex flex-col items-center">
                  <span className={`text-[9px] font-bold uppercase mb-1 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{label}</span>
                  <span className={`text-sm font-black ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex-1 relative pt-2 pb-80">
          <div className="flex px-4 relative min-h-[1200px]">
            <div className="w-12 shrink-0 flex flex-col text-[10px] font-black text-gray-300 dark:text-gray-600 pt-0">
              {hours.map(h => (
                <div key={h} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start">
                  <span>{h.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 relative">
              {hours.map(h => (
                <div 
                  key={`line-${h}`} 
                  className="absolute left-0 right-0 border-t border-gray-50 dark:border-gray-900/50 pointer-events-none"
                  style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                ></div>
              ))}
              {weekDays.map((date, dayIdx) => {
                const dayEvents = getDayEvents(date);
                return (
                  <div key={dayIdx} className="relative border-l border-gray-50 dark:border-gray-900/30 first:border-l-0">
                    {dayEvents.map(event => {
                      const start = new Date(event.start);
                      const end = new Date(event.end);
                      const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                      const top = (startMinutes / 60) * HOUR_HEIGHT;
                      const height = (durationMinutes / 60) * HOUR_HEIGHT;
                      
                      const Icon = getEventIcon(event, activeTemplate);
                      const dynamicColor = getEventColor(event, activeTemplate);
                      
                      return (
                        <div 
                          key={event.id}
                          style={{ 
                            top: `${top}px`, 
                            height: `${Math.max(30, height)}px`,
                            backgroundColor: dynamicColor,
                            zIndex: 10 
                          }}
                          onClick={() => handleOpenEventDetail(event)}
                          className={`absolute left-1 right-1 rounded-2xl p-1.5 flex flex-col items-center justify-center shadow-sm overflow-hidden transition-all duration-300 cursor-pointer active:scale-95 text-white`}
                        >
                          <Icon size={14} strokeWidth={2.5} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {renderCategoryLegend()}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const offset = (firstDayOfMonth + 6) % 7;
    const totalCells = 42;
    const calendarDays: Date[] = [];
    const startDate = new Date(year, month, 1 - offset);
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      calendarDays.push(d);
    }
    const dayLabels = language === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
      <div className="h-full overflow-y-auto no-scrollbar bg-white dark:bg-gray-950 transition-colors duration-300">
        <div className="px-6 pt-4 pb-80">
          <div className="flex justify-end gap-3 mb-6">
            <button onClick={handlePrev} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
              <ChevronLeft size={20} />
            </button>
            <button onClick={handleNext} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center mb-4">
            {dayLabels.map(d => (
              <span key={d} className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
            {calendarDays.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isCurrentMonth = date.getMonth() === month;
              const dayEvents = events.filter(e => new Date(e.start).toDateString() === date.toDateString());
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(new Date(date))}
                  className={`aspect-square bg-white dark:bg-gray-950 flex flex-col items-center justify-center relative cursor-pointer transition-all border-none ${
                    !isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/20' : ''
                  }`}
                >
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                      <span className={`text-[14px] font-black transition-colors ${
                        isSelected 
                          ? 'text-blue-600' 
                          : isToday 
                              ? 'text-blue-500' 
                              : isCurrentMonth 
                                  ? 'text-gray-900 dark:text-gray-100' 
                                  : 'text-gray-300 dark:text-gray-600'
                      }`}>
                        {date.getDate()}
                      </span>
                      
                      <div className="grid grid-cols-3 gap-0.5 mt-1 px-1 min-h-[14px] items-center justify-center">
                        {dayEvents.slice(0, 6).map((e, idx) => (
                          <div 
                              key={idx} 
                              style={{ backgroundColor: getEventColor(e, activeTemplate) }}
                              className="w-1.5 h-1.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                          ></div>
                        ))}
                      </div>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute inset-1 rounded-2xl bg-blue-50/40 dark:bg-blue-500/10 border-2 border-blue-500/20 z-0"></div>
                  )}
                </div>
              );
            })}
          </div>
          {renderCategoryLegend()}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-hidden transition-colors duration-300">
      {renderHeader()}
      <main className="flex-1 overflow-hidden relative">
        {view === 'day' && renderDayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
      </main>
      {(activeEvent || isAddingManually) && (
        <EventDetailModal 
          event={activeEvent || undefined} 
          isCreating={isAddingManually}
          initialDate={selectedDate}
          onClose={handleCloseEventDetail} 
        />
      )}
    </div>
  );
};
