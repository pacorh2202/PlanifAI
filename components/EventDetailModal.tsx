
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, MapPin, Plus, Check, MoreHorizontal, Calendar as CalendarIcon, Clock, Navigation, ChevronRight, Star, Repeat } from 'lucide-react';
import { CalendarEvent, Friend } from '../types';
import { useCalendar } from '../contexts/CalendarContext';
import { getEventColor, getEventIcon } from './CalendarScreen';
import { ICON_MAP } from '../constants';

interface EventDetailModalProps {
  event?: CalendarEvent;
  isCreating?: boolean;
  initialDate?: Date;
  onClose: () => void;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  health: ['gym', 'deporte', 'entrenamiento', 'yoga', 'correr', 'bici', 'salud', 'médico', 'doctor', 'hospital', 'entrenar', 'ejercicio'],
  leisure: ['cena', 'comida', 'restaurante', 'cine', 'fiesta', 'bar', 'concierto', 'café', 'brunch', 'ocio', 'viaje', 'playa', 'montaña'],
  personal: ['familia', 'amigos', 'boda', 'reunión', 'cita', 'cumple', 'cumpleaños', 'hijos', 'padres', 'casa', 'limpiar', 'compras'],
  study: ['estudiar', 'repaso', 'examen', 'clase', 'curso', 'deberes', 'biblioteca', 'universidad', 'academia', 'leer', 'estudio'],
  work: ['trabajo', 'reunión', 'call', 'meeting', 'proyecto', 'oficina', 'jefe', 'cliente', 'email', 'laboral', 'negocios']
};

// MOCK_FRIENDS removed - using real data from context

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, isCreating, initialDate, onClose }) => {
  const { updateEvent, deleteEvent, addEvent, activeTemplate, accentColor, t, language, friends } = useCalendar();
  const [isEditing, setIsEditing] = useState(isCreating || false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Swipe-to-dismiss state ───────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setDragY(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 120) {
      // Close with animation
      setIsClosing(true);
      setTimeout(onClose, 300);
    } else {
      setDragY(0);
    }
  };

  // ─── Scroll to top on open ────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  const localeStr = language === 'es' ? 'es-ES' : 'en-US';

  const defaultStartTime = initialDate ? new Date(initialDate) : new Date();
  if (isCreating) {
    defaultStartTime.setHours(new Date().getHours() + 1, 0, 0, 0);
  }
  const defaultEndTime = new Date(defaultStartTime);
  defaultEndTime.setHours(defaultStartTime.getHours() + 1);

  const initialEventState: CalendarEvent = event || {
    id: '',
    title: '',
    start: defaultStartTime.toISOString(),
    end: defaultEndTime.toISOString(),
    type: activeTemplate.categories[0].type,
    categoryLabel: activeTemplate.categories[0].label,
    status: 'scheduled',
    allDay: false,
    descriptionPoints: [],
    attendees: [],
    location: ''
  };

  const [editedEvent, setEditedEvent] = useState<CalendarEvent>(initialEventState);
  const [now, setNow] = useState(new Date());
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(!isCreating);

  // Recurossion state
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0=Sun, 1=Mon, ...

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /* Desactivado por petición del usuario - Detección automática de categorías
  useEffect(() => {
    if (!isEditing || hasManuallySelectedCategory || !editedEvent.title) return;

    const title = editedEvent.title.toLowerCase();
    let detectedType: string | null = null;

    for (const [type, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => title.includes(keyword))) {
        detectedType = type;
        break;
      }
    }

    if (detectedType) {
      const category = activeTemplate.categories.find(c => c.type === detectedType);
      if (category) {
        setEditedEvent(prev => ({
          ...prev,
          type: detectedType as any,
          categoryLabel: category.label
        }));
      }
    }
  }, [editedEvent.title, isEditing, hasManuallySelectedCategory, activeTemplate]);
  */

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const dynamicColor = getEventColor(editedEvent, activeTemplate);
  const Icon = getEventIcon(editedEvent, activeTemplate);

  const statusLabel = useMemo(() => {
    if (isCreating) return t.new_task;
    if (event?.status === 'completed') return t.done;
    const start = new Date(editedEvent.start);
    const end = new Date(editedEvent.end);
    if (now >= start && now <= end) return t.in_progress;
    if (now < start) {
      const diffMs = start.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${t.starts_in} ${diffMins}m`;
      return t.pending;
    }
    if (now > end) return t.pending;
    return t.pending;
  }, [event, editedEvent, now, isCreating, t]);

  const handleSave = async () => {
    if (!editedEvent.title.trim()) {
      alert(t.alert_title);
      return;
    }

    // Resolve attendee names → participant IDs for sharing
    let participantIds: string[] = [];
    if (editedEvent.attendees && editedEvent.attendees.length > 0) {
      for (const name of editedEvent.attendees) {
        const friend = friends.find(f => f.name === name && f.status === 'friend');
        if (friend) participantIds.push(friend.id);
      }
    }

    if (isCreating && isRecurring && selectedDays.length > 0) {
      const start = new Date(editedEvent.start);
      const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const eventDuration = new Date(editedEvent.end).getTime() - new Date(editedEvent.start).getTime();
      const current = new Date(start);

      const promises: Promise<string>[] = [];
      const recurrenceId = crypto.randomUUID(); // Generate unique ID for this series

      while (current <= endOfMonth) {
        if (selectedDays.includes(current.getDay())) {
          const newStart = new Date(current);
          const newEnd = new Date(newStart.getTime() + eventDuration);

          const eventToCreate = {
            ...editedEvent,
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
            participantIds, // Pass participant IDs for sharing
            recurrenceId, // Link all events in this series
          };
          promises.push(addEvent(eventToCreate));
        }
        current.setDate(current.getDate() + 1);
      }

      if (promises.length === 0) {
        addEvent({ ...editedEvent, participantIds });
      } else {
        await Promise.all(promises);
      }

    } else {
      if (isCreating) addEvent({ ...editedEvent, participantIds });
      else if (event) updateEvent(event.id, editedEvent);
    }
    onClose();
  };

  const handleDelete = () => {
    if (event) deleteEvent(event.id);
    onClose();
  };

  const addPoint = () => {
    setEditedEvent({ ...editedEvent, descriptionPoints: [...(editedEvent.descriptionPoints || []), ""] });
  };

  const updatePoint = (idx: number, val: string) => {
    const newPoints = [...(editedEvent.descriptionPoints || [])];
    newPoints[idx] = val;
    setEditedEvent({ ...editedEvent, descriptionPoints: newPoints });
  };

  const removePoint = (idx: number) => {
    setEditedEvent({ ...editedEvent, descriptionPoints: (editedEvent.descriptionPoints || []).filter((_, i) => i !== idx) });
  };

  const toggleAttendee = (friend: any) => {
    const current = editedEvent.attendees || [];
    const handleWithAt = `@${friend.handle}`;

    // Check if selected by any identifier (Name, Handle, or @Handle)
    // We check all variations to ensure we can deselect old events that might have names
    const isSelected = current.some(a =>
      a === friend.name ||
      a === friend.handle ||
      a === handleWithAt
    );

    if (isSelected) {
      // Remove all variations to ensure clean toggle off
      const updated = current.filter(a =>
        a !== friend.name &&
        a !== friend.handle &&
        a !== handleWithAt
      );
      setEditedEvent({ ...editedEvent, attendees: updated });
    } else {
      // Add using the new standard format (@handle)
      setEditedEvent({ ...editedEvent, attendees: [...current, handleWithAt] });
    }
  };

  const formatForInput = (isoString: string) => {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleTimeChange = (field: 'start' | 'end', val: string) => {
    if (!val) return;
    const newDate = new Date(val);
    setEditedEvent(prev => ({ ...prev, [field]: newDate.toISOString() }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in transition-opacity duration-300 cursor-pointer" onClick={onClose}></div>

      <div
        className={`relative bg-[#F8FAFC] dark:bg-gray-950 w-full h-[85vh] rounded-t-[3.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)] border-t border-white/20 overflow-hidden ${isClosing ? '' : 'animate-slide-up'}`}
        style={{
          transform: `translateY(${isClosing ? '100%' : `${dragY}px`})`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-14 flex items-center justify-center z-50 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mt-3"></div>
          <button
            onClick={onClose}
            className="absolute right-5 top-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors active:scale-90"
            aria-label="Close"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="absolute top-4 right-6 flex items-center gap-2.5 z-[120]">
          {!isEditing ? (
            <>
              <button onClick={handleStartEditing} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 shadow-md border border-gray-100 dark:border-gray-700 active:scale-90 transition-transform">
                <MoreHorizontal size={18} />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 shadow-md border border-gray-100 dark:border-gray-700 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </>
          ) : (
            <button onClick={handleSave} className="w-11 h-11 rounded-full text-white dark:text-black flex items-center justify-center shadow-xl active:scale-90 transition-transform font-bold" style={{ backgroundColor: accentColor }}>
              <Check size={22} strokeWidth={3} />
            </button>
          )}
        </div>

        <div ref={scrollRef} className="h-full overflow-y-auto no-scrollbar px-8 pt-16 pb-32">
          <div className="flex items-start gap-4 mb-10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-500`} style={{ backgroundColor: dynamicColor }}>
              <Icon size={28} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-2`} style={{ color: dynamicColor }}>
                {statusLabel}
              </p>
              {!isEditing ? (
                <h1 className="text-[30px] font-black text-gray-900 dark:text-white tracking-tighter leading-tight">
                  {editedEvent.title || t.no_events}
                </h1>
              ) : (
                <input
                  type="text" autoFocus value={editedEvent.title}
                  onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                  className="text-[30px] font-black text-gray-900 dark:text-white tracking-tighter leading-tight bg-transparent border-none p-0 focus:ring-0 w-full mt-1"
                  placeholder={t.placeholder_title}
                />
              )}
            </div>
          </div>

          {isEditing && (
            <section className="mb-8 animate-fade-in">
              <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-4">{t.category_label}</h2>
              <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2">
                {activeTemplate.categories.map((cat, idx) => {
                  const isSelected = editedEvent.categoryLabel === cat.label || (!editedEvent.categoryLabel && editedEvent.type === cat.type);
                  const CatIcon = ICON_MAP[cat.icon] || Star;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setEditedEvent({ ...editedEvent, type: cat.type, categoryLabel: cat.label });
                        setHasManuallySelectedCategory(true);
                      }}
                      className={`flex flex-col items-center justify-center min-w-[75px] h-20 transition-all ${isSelected
                        ? 'opacity-100 scale-105'
                        : 'opacity-40 grayscale-[0.2]'
                        }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-1.5 transition-all duration-300 ${isSelected ? 'ring-4 ring-white dark:ring-gray-950' : ''
                          }`}
                        style={{
                          backgroundColor: cat.color,
                          boxShadow: isSelected ? `0 0 0 2px ${accentColor}` : 'none'
                        }}
                      >
                        <CatIcon size={22} className="text-white" />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider text-gray-500 truncate w-full px-1 text-center ${isSelected ? 'text-gray-900 dark:text-gray-100' : ''}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-5">{t.agenda_tab}</h2>
            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.view_day}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(editedEvent.start).toLocaleDateString(localeStr, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.agenda_tab}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(editedEvent.start).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })} — {new Date(editedEvent.end).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.starts}</label>
                  <div className="relative overflow-hidden active:scale-[0.98] transition-all group">
                    <input
                      type="datetime-local"
                      value={formatForInput(editedEvent.start)}
                      onChange={(e) => handleTimeChange('start', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                    />
                    <div className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 flex items-center justify-between shadow-sm group-active:bg-gray-100 dark:group-active:bg-gray-700 transition-colors">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(editedEvent.start).toLocaleDateString(localeStr, { day: 'numeric', month: 'short' })} • {new Date(editedEvent.start).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.ends}</label>
                  <div className="relative overflow-hidden active:scale-[0.98] transition-all group">
                    <input
                      type="datetime-local"
                      value={formatForInput(editedEvent.end)}
                      onChange={(e) => handleTimeChange('end', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                    />
                    <div className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 flex items-center justify-between shadow-sm group-active:bg-gray-100 dark:group-active:bg-gray-700 transition-colors">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(editedEvent.end).toLocaleDateString(localeStr, { day: 'numeric', month: 'short' })} • {new Date(editedEvent.end).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {isCreating && isEditing && (
            <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    <Repeat size={18} />
                  </div>
                  <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em]">{t.event_recurring_title}</h2>
                </div>
                <div
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-12 h-7 rounded-full transition-colors duration-300 flex items-center px-1 cursor-pointer`}
                  style={{ backgroundColor: isRecurring ? accentColor : '#D1D5DB' }}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {isRecurring && (
                <div className="animate-fade-in">
                  <p className="text-xs text-gray-400 mb-4 font-medium ml-1">
                    {t.event_select_days}
                  </p>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                      const isSelected = selectedDays.includes(dayIndex);
                      const label = language === 'es'
                        ? ['D', 'L', 'M', 'X', 'J', 'V', 'S'][dayIndex]
                        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIndex];

                      return (
                        <button
                          key={dayIndex}
                          onClick={() => {
                            if (selectedDays.includes(dayIndex)) {
                              setSelectedDays(prev => prev.filter(d => d !== dayIndex));
                            } else {
                              setSelectedDays(prev => [...prev, dayIndex]);
                            }
                          }}
                          style={isSelected ? { backgroundColor: accentColor, color: '#fff' } : undefined}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${isSelected
                            ? 'shadow-lg scale-105'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em]">{t.notes_tasks}</h2>
              {isEditing && <button onClick={addPoint} className="text-blue-500 active:scale-90 transition-transform"><Plus size={18} /></button>}
            </div>
            <div className="space-y-4">
              {(editedEvent.descriptionPoints || []).length === 0 && !isEditing ? (
                <p className="text-sm text-gray-400 italic">{t.no_notes}.</p>
              ) : (
                (editedEvent.descriptionPoints || []).map((point, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-fade-in">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dynamicColor }}></div>
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input value={point} onChange={(e) => updatePoint(idx, e.target.value)} className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 dark:text-white" placeholder={t.placeholder_notes} />
                        <button onClick={() => removePoint(idx)} className="text-gray-300"><X size={14} /></button>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{point}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-5">{t.participants}</h2>
            <div className="flex flex-wrap gap-3">
              {friends.filter(f => f.status === 'friend').map(friend => {
                const isAttendee = editedEvent.attendees?.some(a =>
                  a === friend.name ||
                  a === friend.handle ||
                  a === `@${friend.handle}`
                );

                if (!isEditing && !isAttendee) return null;
                return (
                  <div key={friend.id} className="relative">
                    <button onClick={() => isEditing && toggleAttendee(friend)} className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${isAttendee ? 'border-gray-900 dark:border-white shadow-lg scale-105' : 'border-transparent opacity-40 grayscale'}`}>
                      <img src={friend.avatar || '/default-avatar.png'} alt={friend.handle} className="w-12 h-12 rounded-full object-cover" />
                    </button>
                    <div className="flex flex-col items-center w-14 overflow-hidden">
                      <p className="text-[9px] font-black text-center mt-1 text-gray-900 dark:text-white truncate w-full leading-tight">{friend.handle}</p>
                    </div>
                  </div>
                );
              })}
              {friends.filter(f => f.status === 'friend').length === 0 && (
                <p className="text-sm text-gray-400 italic">{t.no_friends_yet}</p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-5">{t.location}</h2>
            {!isEditing ? (
              editedEvent.location ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500"><MapPin size={18} /></div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{editedEvent.location}</span>
                  </div>
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editedEvent.location || '')}`, '_blank')} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400"><Navigation size={18} /></button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">{t.no_location}.</p>
              )
            ) : (
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={editedEvent.location} onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })} placeholder={t.placeholder_location} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-3xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 dark:text-white" />
              </div>
            )}
          </section>

          {!isCreating && (
            <div className="pt-8 flex gap-4">
              <button onClick={handleDelete} className="flex-1 py-5 rounded-[2rem] bg-rose-50 dark:bg-rose-900/10 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] border border-rose-100 dark:border-rose-900/20 active:scale-95 transition-all">{t.delete_task}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
