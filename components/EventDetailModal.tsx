
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, MapPin, Plus, Check, MoreHorizontal, Calendar as CalendarIcon, Clock, Navigation, ChevronRight, Star } from 'lucide-react';
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

 // Recurrence State
  const [isRecurrenceEnabled, setIsRecurrenceEnabled] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);// 0=Sun, 1=Mon...

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

  const dynamicColor = (editedEvent.color || getEventColor(editedEvent, activeTemplate));
  const Icon = getEventIcon(editedEvent, activeTemplate);

  const statusLabel = useMemo(() => {
    if (isCreating) return t.new_task;
    if (event?.status === 'completed') return t.done;
    const start = new Date(editedEvent.start);
    const end = new Date(editedEvent.end);
    if (now >= start && now <= end) return t.in_progress;
    if (now < start) {
      const diffMs = start.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs/ 60000);
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

    if (isCreating && isRecurrenceEnabled && recurrenceDays.length > 0) {
     // BATCH CREATION logic
      const eventsToCreate: Promise<any>[] = [];
      const currentMonth = new Date(editedEvent.start).getMonth();
      const currentYear = new Date(editedEvent.start).getFullYear();
      const baseStartDate = new Date(editedEvent.start);
      const baseEndDate = new Date(editedEvent.end);
      const duration = baseEndDate.getTime() - baseStartDate.getTime();

     // Start iterating from tomorrow (or today?) - Let's iterate from baseStartDate
     // If baseStartDate is today, we check today and future days in month.
      let iterDate = new Date(baseStartDate);

     // We limit to current month as per requirements
      while (iterDate.getMonth() === currentMonth) {
        if (recurrenceDays.includes(iterDate.getDay())) {
         // Create event for this day
          const newStart = new Date(iterDate);
          const newEnd = new Date(iterDate.getTime() + duration);

         // Only add if it's not in the past relative to baseStartDate (or maybe allow it? Requirement says "automate manual task")
         // Let's assume we create for all matching days from start date onwards in this month.

          const eventPayload = {
            ...editedEvent,
            start: newStart.toISOString(),
            end: newEnd.toISOString()
          };
          eventsToCreate.push(addEvent(eventPayload));
        }
        iterDate.setDate(iterDate.getDate() + 1);
      }

      if (eventsToCreate.length > 0) {
        await Promise.all(eventsToCreate);
      } else {
       // Fallback if no days matched in remaining month, allow creating just the single one?
       // Maybe alert user? For now just create the single one.
        addEvent(editedEvent);
      }
    } else {
     // Normal single creation/update
      if (isCreating) addEvent(editedEvent);
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

  const toggleAttendee = (name: string) => {
    const current = editedEvent.attendees || [];
    const isAlreadySelected = current.includes(name);
    const updated = isAlreadySelected ? current.filter(n => n !== name) : [...current, name];
    setEditedEvent({ ...editedEvent, attendees: updated });
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

      <div className="relative bg-[#F8FAFC]  w-full h-[85vh] rounded-t-[3.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)] border-t border-white/20 overflow-hidden animate-slide-up">
        <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-16 h-1.5 bg-gray-200  rounded-full"></div>
        </div>

        <div className="absolute top-6 right-6 flex items-center gap-2.5 z-[120]">
          {!isEditing ? (
            <>
              <button onClick={handleStartEditing} className="w-10 h-10 rounded-full bg-white  flex items-center justify-center text-gray-500 shadow-md border border-gray-100  active:scale-90 transition-transform">
                <MoreHorizontal size={20}/>
              </button>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white  flex items-center justify-center text-gray-500 shadow-md border border-gray-100  active:scale-90 transition-transform">
                <X size={20}/>
              </button>
            </>
          ) : (
            <button onClick={handleSave} className="w-11 h-11 rounded-full text-white  flex items-center justify-center shadow-xl active:scale-90 transition-transform font-bold" style={{ backgroundColor: accentColor }}>
              <Check size={22} strokeWidth={3}/>
            </button>
          )}
        </div>

        <div ref={scrollRef} className="h-full overflow-y-auto no-scrollbar px-8 pt-16 pb-32">
          <div className="flex items-start gap-4 mb-10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-500`} style={{ backgroundColor: dynamicColor }}>
              <Icon size={28} className="text-white" strokeWidth={2.5}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-2`} style={{ color: dynamicColor }}>
                {statusLabel}
              </p>
              {!isEditing ? (
                <h1 className="text-[30px] font-black text-gray-900  tracking-tighter leading-tight">
                  {editedEvent.title || t.no_events}
                </h1>
              ) : (
                <input
                  type="text" autoFocus value={editedEvent.title}
                  onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                  className="text-[30px] font-black text-gray-900  tracking-tighter leading-tight bg-transparent border-none p-0 focus:ring-0 w-full mt-1"
                  placeholder={t.placeholder_title}
               />
              )}
            </div>
          </div>

          {isEditing && (
            <section className="mb-8 animate-fade-in">
              <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-4">{t.category}</h2>
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
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-1.5 transition-all duration-300 ${isSelected ? 'ring-4 ring-white ' : ''
                          }`}
                        style={{
                          backgroundColor: cat.color,
                          boxShadow: isSelected ? `0 0 0 2px ${accentColor}` : 'none'
                        }}
                      >
                        <CatIcon size={22} className="text-white"/>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider text-gray-500 truncate w-full px-1 text-center ${isSelected ? 'text-gray-900 ' : ''}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="bg-white  rounded-[2.5rem] p-6 mb-8 border border-gray-100  shadow-sm transition-colors duration-300">
            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-5">{t.agenda_tab}</h2>
            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50/20 flex items-center justify-center text-blue-500">
                    <CalendarIcon size={18}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.view_day}</p>
                    <p className="text-sm font-bold text-gray-900 ">
                      {new Date(editedEvent.start).toLocaleDateString(localeStr, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50/20 flex items-center justify-center text-blue-500">
                    <Clock size={18}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.agenda_tab}</p>
                    <p className="text-sm font-bold text-gray-900 ">
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
                    <div className="w-full bg-gray-50  border border-gray-100  rounded-3xl p-5 flex items-center justify-between shadow-sm group-active:bg-gray-100 :bg-gray-700 transition-colors">
                      <span className="text-sm font-bold text-gray-900 ">
                        {new Date(editedEvent.start).toLocaleDateString(localeStr, { day: 'numeric', month: 'short' })} • {new Date(editedEvent.start).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ChevronRight size={18} className="text-gray-300 "/>
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
                    <div className="w-full bg-gray-50  border border-gray-100  rounded-3xl p-5 flex items-center justify-between shadow-sm group-active:bg-gray-100 :bg-gray-700 transition-colors">
                      <span className="text-sm font-bold text-gray-900 ">
                        {new Date(editedEvent.end).toLocaleDateString(localeStr, { day: 'numeric', month: 'short' })} • {new Date(editedEvent.end).toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ChevronRight size={18} className="text-gray-300 "/>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* New Automation Section */}
          {isCreating && isEditing && (
            <section className="bg-white  rounded-[2.5rem] p-6 mb-8 border border-gray-100  shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em]">{t.recurrence_title}</h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isRecurrenceEnabled} onChange={(e) => setIsRecurrenceEnabled(e.target.checked)}/>
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 :ring-blue-800 rounded-full peer  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all  peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {isRecurrenceEnabled && (
                <div className="space-y-4 animate-slide-down">
                  <p className="text-xs text-gray-500 font-medium">{t.recurrence_desc}</p>
                  <div className="flex justify-between gap-1">
                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, idx) => {
                     // idx 0 = Sunday, 1 = Monday... matches getDay()
                      const isSelected = recurrenceDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setRecurrenceDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isSelected
                            ? 'bg-blue-500 text-white shadow-md scale-105'
                            : 'bg-gray-100  text-gray-400'
                            }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="bg-white  rounded-[2.5rem] p-6 mb-8 border border-gray-100  shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em]">{t.notes_tasks}</h2>
              {isEditing && <button onClick={addPoint} className="text-blue-500 active:scale-90 transition-transform"><Plus size={18}/></button>}
            </div>
            <div className="space-y-4">
              {(editedEvent.descriptionPoints || []).length === 0 && !isEditing ? (
                <p className="text-sm text-gray-400 italic">{t.no_events}.</p>
              ) : (
                (editedEvent.descriptionPoints || []).map((point, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-fade-in">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dynamicColor }}></div>
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input value={point} onChange={(e) => updatePoint(idx, e.target.value)} className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 " placeholder={t.placeholder_notes}/>
                        <button onClick={() => removePoint(idx)} className="text-gray-300"><X size={14}/></button>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-gray-700 ">{point}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white  rounded-[2.5rem] p-6 mb-8 border border-gray-100  shadow-sm">
            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-5">{t.participants}</h2>
            <div className="flex flex-wrap gap-3">
              {friends.filter(f => f.status === 'friend').map(friend => {
                const isAttendee = editedEvent.attendees?.includes(friend.name);
                if (!isEditing && !isAttendee) return null;
                return (
                  <div key={friend.id} className="relative">
                    <button onClick={() => isEditing && toggleAttendee(friend.name)} className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${isAttendee ? 'border-gray-900  shadow-lg scale-105' : 'border-transparent opacity-40 grayscale'}`}>
                      <img src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=FF7566&color=fff`} alt={friend.name} className="w-12 h-12 rounded-full object-cover"/>
                    </button>
                    <p className="text-[8px] font-black text-center mt-1 uppercase text-gray-400 truncate w-14">{friend.name.split(' ')[0]}</p>
                  </div>
                );
              })}
              {friends.filter(f => f.status === 'friend').length === 0 && (
                <p className="text-sm text-gray-400 italic">No tienes amigos añadidos todavía.</p>
              )}
            </div>
          </section>

          <section className="bg-white  rounded-[2.5rem] p-6 mb-8 border border-gray-100  shadow-sm">
            <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] mb-5">{t.location}</h2>
            {!isEditing ? (
              editedEvent.location ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50/20 flex items-center justify-center text-rose-500"><MapPin size={18}/></div>
                    <span className="text-sm font-bold text-gray-900 ">{editedEvent.location}</span>
                  </div>
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editedEvent.location || '')}`, '_blank')} className="p-3 bg-gray-50  rounded-xl text-gray-400"><Navigation size={18}/></button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">{t.no_events}.</p>
              )
            ) : (
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input type="text" value={editedEvent.location} onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })} placeholder={t.placeholder_location} className="w-full bg-gray-50  border-none rounded-3xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-0 "/>
              </div>
            )}
          </section>

          {!isCreating && (
            <div className="pt-8 flex gap-4">
              <button onClick={handleDelete} className="flex-1 py-5 rounded-[2rem] bg-rose-50/10 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] border border-rose-100/20 active:scale-95 transition-all">{t.delete_task}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
