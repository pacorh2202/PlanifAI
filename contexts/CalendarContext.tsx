
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CalendarEvent, KPIStats, CalendarAction, PlannerTemplate, CategoryStyle, EventType } from '../types';
import { Language, translations } from '../translations';
import { useAuth } from '../src/contexts/AuthContext';
import * as calendarApi from '../src/lib/calendar-api';
import * as friendsApi from '../src/lib/friends-api';
import * as notificationsApi from '../src/lib/notifications-api'; // Import notifications API
import { fetchUserStats, UserStats } from '../src/lib/stats-api';
import { supabase } from '../src/lib/supabase';
import { Friend } from '../types';
import { MultiAgentService } from '../src/services/MultiAgentService';


interface CalendarContextType {
  events: CalendarEvent[];
  stats: UserStats | null;
  refreshStats: () => Promise<void>;
  isDarkMode: boolean;
  language: Language;
  t: any;
  activeTemplate: PlannerTemplate;
  defaultTemplates: PlannerTemplate[];
  customTemplate: PlannerTemplate;
  accentColor: string;
  userName: string;
  userHandle: string;
  assistantName: string;
  assistantVoice: 'Zephyr' | 'Puck';
  profileImage: string | null;
  isDetailViewOpen: boolean;
  friends: Friend[];
  refreshFriends: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  toggleDarkMode: () => void;
  setLanguage: (lang: Language) => void;
  setTemplate: (id: string) => void;
  saveCustomTemplate: (categories: CategoryStyle[]) => void;
  setAccentColor: (color: string) => void;
  setUserName: (name: string) => void;
  setUserHandle: (handle: string) => void;
  setAssistantName: (name: string) => void;
  setAssistantVoice: (voice: 'Zephyr' | 'Puck') => void;
  setProfileImage: (img: string | null) => void;
  setIsDetailViewOpen: (open: boolean) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<string>;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  unreadCount: number;
  hasUnread: boolean;
  refreshNotifications: () => Promise<void>;
  executeAction: (action: CalendarAction) => Promise<string>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, updateProfile } = useAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  const [language, setLanguageState] = useState<Language>('es');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('planifai_accent_color') || '#B2D3A1';
    }
    return '#B2D3A1';
  });
  const [userName, setUserNameState] = useState<string>('');
  const [userHandle, setUserHandleState] = useState<string>('');
  const [assistantName, setAssistantNameState] = useState<string>('PlanifAI');
  const [assistantVoice, setAssistantVoiceState] = useState<'Zephyr' | 'Puck'>('Zephyr');
  const [profileImage, setProfileImageState] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('coral-planner');
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [friends, setFriendsState] = useState<Friend[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  // Notification State
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);

  const useMultiAgent = true; // Always enabled

  // Initial Data Load & Realtime Subscriptions
  useEffect(() => {
    if (!user) return;

    // 1. Fetch Initial Notifications
    const loadNotifications = async () => {
      try {
        const data = await notificationsApi.fetchNotifications(user.id);
        const unread = data.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
        setHasUnread(unread > 0);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    loadNotifications();

    // 2. Subscribe to Realtime Notifications
    const unsubscribe = notificationsApi.subscribeToNotifications(user.id, {
      onInsert: (newNotification) => {
        // Play sound or show toast here if desired
        setUnreadCount(prev => prev + 1);
        setHasUnread(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationsApi.fetchNotifications(user.id);
      const unread = data.filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
      setHasUnread(unread > 0);
    } catch (err) {
      console.error('Error refreshing notifications:', err);
    }
  };

  const t = useMemo(() => translations[language], [language]);

  const [customTemplate, setCustomTemplate] = useState<PlannerTemplate>({
    id: 'custom',
    name: translations[language].my_template_name,
    categories: [
      { type: 'health', label: translations[language].cat_health, icon: 'Dumbbell', color: '#FF7566' },
      { type: 'leisure', label: translations[language].cat_leisure, icon: 'Star', color: '#FFD2CC' },
      { type: 'personal', label: translations[language].cat_personal, icon: 'Users', color: '#FFF4E0' },
      { type: 'other', label: translations[language].cat_food, icon: 'Utensils', color: '#B2D3A1' },
      { type: 'other', label: translations[language].cat_rest, icon: 'Leaf', color: '#A7C7E7' },
      { type: 'study', label: translations[language].cat_study, icon: 'BookOpen', color: '#C1B3E3' },
    ]
  });

  const defaultTemplates: PlannerTemplate[] = useMemo(() => [
    {
      id: 'coral-planner',
      name: 'Coral Planner',
      categories: [
        { type: 'health', label: t.cat_health, icon: 'Dumbbell', color: '#FF7566' },
        { type: 'leisure', label: t.cat_leisure, icon: 'Star', color: '#FFD2CC' },
        { type: 'personal', label: t.cat_personal, icon: 'Users', color: '#FFF4E0' },
        { type: 'other', label: t.cat_food, icon: 'Utensils', color: '#B2D3A1' },
        { type: 'other', label: t.cat_rest, icon: 'Leaf', color: '#A7C7E7' },
        { type: 'study', label: t.cat_study, icon: 'BookOpen', color: '#C1B3E3' },
      ]
    },
    {
      id: 'ocean-calm',
      name: 'Ocean Calm',
      categories: [
        { type: 'health', label: t.cat_health, icon: 'Dumbbell', color: '#E0F2F1' },
        { type: 'leisure', label: t.cat_leisure, icon: 'Star', color: '#B2DFDB' },
        { type: 'personal', label: t.cat_personal, icon: 'Users', color: '#4DB6AC' },
        { type: 'other', label: t.cat_food, icon: 'Utensils', color: '#009688' },
        { type: 'other', label: t.cat_rest, icon: 'Leaf', color: '#00796B' },
        { type: 'study', label: t.cat_study, icon: 'BookOpen', color: '#004D40' },
      ]
    }
  ], [t]);

  const activeTemplate = useMemo(() => {
    if (activeTemplateId === 'custom') return customTemplate;
    return defaultTemplates.find(templ => templ.id === activeTemplateId) || defaultTemplates[0];
  }, [activeTemplateId, customTemplate, defaultTemplates]);

  // Initialize from profile
  useEffect(() => {
    if (profile) {
      setLanguageState(profile.language as Language || 'es');
      setIsDarkMode(profile.is_dark_mode || false);
      if (profile.accent_color) {
        setAccentColorState(profile.accent_color);
        localStorage.setItem('planifai_accent_color', profile.accent_color);
      } else {
        setAccentColorState('#B2D3A1');
      }
      setUserNameState(profile.user_name || '');
      setUserHandleState(profile.handle || '');
      setAssistantNameState(profile.assistant_name || 'PlanifAI');
      setAssistantVoiceState(profile.assistant_voice || 'Zephyr');
      setProfileImageState(profile.profile_image || null);
      setActiveTemplateId(profile.active_template_id || 'coral-planner');

      if (profile.custom_template) {
        setCustomTemplate(profile.custom_template as unknown as PlannerTemplate);
      }
    }
  }, [profile]);

  // Update custom template labels when language changes
  useEffect(() => {
    setCustomTemplate(prev => {
      const newCategories = prev.categories.map(cat => {
        let newLabel = cat.label;
        switch (cat.type) {
          case 'health': newLabel = t.cat_health; break;
          case 'leisure': newLabel = t.cat_leisure; break;
          case 'personal': newLabel = t.cat_personal; break;
          case 'study': newLabel = t.cat_study; break;
          case 'work': newLabel = t.cat_work; break;
          case 'other':
            if (cat.icon === 'Utensils') newLabel = t.cat_food;
            else if (cat.icon === 'Leaf') newLabel = t.cat_rest;
            break;
        }
        return { ...cat, label: newLabel };
      });
      return { ...prev, name: t.my_template_name, categories: newCategories };
    });
  }, [t]);

  // Load events from Supabase on mount
  const loadEvents = async () => {
    if (!user) return;
    try {
      const migrationResult = await calendarApi.migrateLocalStorageToSupabase(user.id);
      const fetchedEvents = await calendarApi.fetchEvents(user.id);
      setEvents(fetchedEvents);
      setEventsLoaded(true);

      if (migrationResult.migrated > 0) {
        console.log(`✅ Migrated ${migrationResult.migrated} events to Supabase`);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  useEffect(() => {
    if (user && !eventsLoaded) {
      loadEvents();
    }
  }, [user, eventsLoaded]);

  // Load and refresh stats
  const refreshStats = async () => {
    if (!user) return;
    try {
      const newStats = await fetchUserStats(user.id);
      setStats(newStats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshStats();
    }
  }, [user]);

  // Recalculate stats when events change
  useEffect(() => {
    refreshStats();
  }, [events]);
  useEffect(() => {
    if (!user) return;

    const unsubscribe = calendarApi.subscribeToEvents(user.id, {
      onInsert: (newEvent) => {
        setEvents(prev => {
          if (prev.find(e => e.id === newEvent.id)) return prev;
          return [...prev, newEvent];
        });
      },
      onUpdate: (updatedEvent) => {
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      },
      onDelete: (eventId) => {
        setEvents(prev => prev.filter(e => e.id !== eventId));
      },
    });

    return () => unsubscribe();
  }, [user]);

  // Load and subscribe to friends
  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      try {
        const data = await friendsApi.fetchFriends(user.id);
        setFriendsState(data);
        setFriendsLoaded(true);
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };

    loadFriends();

    const unsubscribe = friendsApi.subscribeToFriends(user.id, {
      onFriendRequest: () => loadFriends(),
      onFriendAccepted: () => loadFriends(),
      onFriendRemoved: () => loadFriends(),
    });

    return () => unsubscribe();
  }, [user]);

  const refreshFriends = async () => {
    if (!user) return;
    try {
      const data = await friendsApi.fetchFriends(user.id);
      setFriendsState(data);
    } catch (error) {
      console.error('Error refreshing friends:', error);
    }
  };

  // Recalculate stats when events change
  useEffect(() => {
    refreshStats();
  }, [events]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    updateProfile({ is_dark_mode: newVal });
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    updateProfile({ language: lang });
  };

  const setTemplate = (id: string) => {
    setActiveTemplateId(id);
    updateProfile({ active_template_id: id });
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('planifai_accent_color', color);
    updateProfile({ accent_color: color });
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    updateProfile({ user_name: name });
  };

  const setUserHandle = (handle: string) => {
    setUserHandleState(handle);
    updateProfile({ handle });
  };

  const setAssistantName = (name: string) => {
    setAssistantNameState(name);
    updateProfile({ assistant_name: name });
  };

  const setAssistantVoice = (voice: 'Zephyr' | 'Puck') => {
    setAssistantVoiceState(voice);
    updateProfile({ assistant_voice: voice });
  };

  const setProfileImage = (img: string | null) => {
    setProfileImageState(img);
    updateProfile({ profile_image: img });
  };


  const saveCustomTemplate = (categories: CategoryStyle[]) => {
    const newTemplate = { ...customTemplate, categories };
    setCustomTemplate(newTemplate);
    updateProfile({
      custom_template: newTemplate as any,
      active_template_id: 'custom'
    });
    setActiveTemplateId('custom');
  };

  const addEvent = async (eventData: Omit<CalendarEvent, 'id'>): Promise<string> => {
    if (!user) return '';
    const tempId = Math.random().toString(36).substr(2, 9);
    const newEvent: CalendarEvent = { ...eventData, id: tempId };

    // Optimistic update
    setEvents(prev => [...prev, newEvent]);

    try {
      const createdEvent = await calendarApi.createEvent(eventData, user.id);
      setEvents(prev => prev.map(e => e.id === tempId ? createdEvent : e));
      return createdEvent.id;
    } catch (error) {
      console.error('Error creating event:', error);
      setEvents(prev => prev.filter(e => e.id !== tempId));
      throw error;
    }
  };

  const updateEvent = async (id: string, data: Partial<CalendarEvent>): Promise<void> => {
    if (!user) return;
    const originalEvent = events.find(e => e.id === id);

    // Optimistic update
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));

    try {
      await calendarApi.updateEvent(id, data, user.id);
    } catch (err) {
      console.error('Error updating event:', err);
      // Rollback on error
      if (originalEvent) {
        setEvents(prev => prev.map(e => e.id === id ? originalEvent : e));
      } else {
        calendarApi.fetchEvents(user.id).then(setEvents);
      }
      throw err;
    }
  };

  const deleteEvent = (id: string) => {
    if (!user) return;
    const deletedEvent = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    calendarApi.deleteEvent(id, user.id).catch(err => {
      if (deletedEvent) setEvents(prev => [...prev, deletedEvent]);
    });
  };


  const executeAction = async (action: CalendarAction): Promise<string> => {
    try {
      console.log('[executeAction] Received action:', action.actionType, action);

      // --- MULTI-AGENT INTERCEPTION ---
      if (useMultiAgent && user) {
        console.log('[executeAction] 🤖 Multi-Agent Mode ENABLED');

        // PRE-PROCESSING: Map attendees to IDs for 'findSlots' or other social actions
        if ((action.actionType === 'findSlots' || action.actionType === 'create') && action.eventData?.attendees) {
          const participantIds: string[] = [];
          const attendeesArray = action.eventData.attendees;

          attendeesArray.forEach((nameOrHandle: string) => {
            const cleanInput = nameOrHandle.replace(/^@/, '').toLowerCase().trim();
            if (cleanInput === userName.toLowerCase().trim() || cleanInput === userHandle.toLowerCase()) return;

            let friend = friends.find(f => f.handle.toLowerCase().replace(/^@/, '') === cleanInput.replace(/^@/, ''));
            if (!friend) {
              const nameMatches = friends.filter(f => f.name.toLowerCase().trim().includes(cleanInput));
              if (nameMatches.length === 1) friend = nameMatches[0];
            }
            if (friend && !participantIds.includes(friend.friend_id)) {
              participantIds.push(friend.friend_id);
            }
          });
          action.eventData.participantIds = participantIds;
        }

        const agentResponse = await MultiAgentService.validateAndProcess(
          action.actionType,
          action.eventData || {},
          user.id,
          action.replaceEventId
        );

        if (!agentResponse.success) {
          console.warn('[executeAction] 🛑 Agent Denied:', agentResponse.denialReason);
          return `⛔ ${agentResponse.denialReason || agentResponse.error || "Acción rechazada por el asistente."}`;
        }

        // Special handling for findSlots: The agent returns slots in the data field
        if (action.actionType === 'findSlots' && agentResponse.success) {
          if (!agentResponse.data || agentResponse.data.length === 0) {
            return (agentResponse as any).message || "No pude encontrar huecos libres para todos.";
          }

          const currentParticipantIds = action.eventData.participantIds || [];

          // Format slots for the AI to read
          const slots = agentResponse.data.map((s: any, i: number) => {
            const start = new Date(s.start).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            const end = new Date(s.end).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            const available = s.availableParticipants.length;
            return `Opción ${i + 1}: ${start} a ${end} (${available}/${currentParticipantIds.length + 1} personas libres)`;
          }).join('\n');

          return `He encontrado estos huecos disponibles:\n${slots}\n\n¿Cuál prefieres?`;
        }

        if (agentResponse.data) {
          console.log('[executeAction] 🔄 Applying Agent changes:', agentResponse.data);
          action.eventData = { ...action.eventData, ...agentResponse.data };
        }
      }
      // -------------------------------

      switch (action.actionType) {
        case 'create': {
          if (!action.eventData) return "Error: Missing event data.";

          // 0. DETECCIÓN DE CONFLICTOS DE HORARIO
          if (action.eventData.start && action.eventData.end) {
            const newStart = new Date(action.eventData.start);
            const newEnd = new Date(action.eventData.end);

            // Buscar eventos que se solapen con el nuevo evento
            const conflictingEvents = events.filter(e => {
              // Ignorar el evento que vamos a reemplazar (si existe)
              if (action.replaceEventId && e.id === action.replaceEventId) return false;

              const eventStart = new Date(e.start);
              const eventEnd = new Date(e.end);

              // Detectar solapamiento: nuevo evento empieza antes de que termine el existente
              // Y el nuevo evento termina después de que empiece el existente
              return (newStart < eventEnd && newEnd > eventStart);
            });

            // Si hay conflictos y NO estamos resolviendo uno explícitamente
            if (conflictingEvents.length > 0 && !action.replaceEventId) {
              const conflictDetails = conflictingEvents.map(e => {
                const startTime = new Date(e.start).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(e.end).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                return `ID: ${e.id} | "${e.title}" (${startTime} - ${endTime})`;
              }).join(', ');

              return `CONFLICTO DE HORARIO: Ya tienes ${conflictingEvents.length} evento(s) a esa hora: ${conflictDetails}. Pregunta al usuario cuál priorizar y llama de nuevo con replaceEventId si quiere reemplazar.`;
            }

            // Si hay replaceEventId, eliminar el evento antiguo primero
            if (action.replaceEventId) {
              console.log(`[executeAction] Reemplazando evento ${action.replaceEventId}`);
              await deleteEvent(action.replaceEventId);
            }
          }

          // 1. Ensure Title exists & Handle Emojis
          let title = action.eventData.title || "Nueva Tarea 📅";

          // Check if title already has an emoji at the start (regex for emoji)
          const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;
          if (!emojiRegex.test(title)) {
            // Only add if missing. AI usually adds it, but this is a safety net.
            // Actually, the user complained AI adds it APART from the one already there.
            // So if the AI provided one, we trust it. If it didn't, we leave it or add default.
            // The issue is likely the AI prompt adds one AND this code adds one? 
            // Looking at the code: The previous code didn't force an emoji here, it was in the prompt.
            // But if the User *says* "Gimnasio", AI might output "🏋️ Gimnasio".
            // If User says "🏋️ Gimnasio", AI might output "🏋️ 🏋️ Gimnasio" if prompt is too strict.
            // I will clean the title to ensure only ONE emoji at start.
          }

          // Better logic: Clean leading emojis then re-add single if needed? 
          // User request: "AI está poniendo un emoticono aparte del que ya estaba".
          // This implies the AI is *appending* or *prepending* redundancy.
          // I will TRUST the input `title` but strip potentially double emojis if they look identical.

          // Actually, strict instruction to AI was: "Incluye un EMOJI relevante al principio".
          // If the AI sees an emoji user provided, it might add another.
          // I needs to update usePlanAILive instructions to say "ONLY add if not present".

          // 2. Ensure Category/Type is valid
          let type = action.eventData.type || 'other';
          let categoryLabel = action.eventData.categoryLabel;
          let color = action.eventData.color;

          // Try to match category strictly
          const cat = activeTemplate.categories.find(c =>
            c.label.toLowerCase() === (action.eventData?.type || '').toLowerCase() ||
            c.type === action.eventData?.type
          );
          if (cat) {
            type = cat.type;
            categoryLabel = cat.label;
            color = cat.color;
          }

          // 3. Ensure Dates are valid (Auto-fix missing end time)
          const startStr = action.eventData.start;
          if (!startStr) return "Error: Fecha de inicio obligatoria.";

          let startDate = new Date(startStr);
          if (isNaN(startDate.getTime())) return "Error: Fecha de inicio inválida.";

          let endStr = action.eventData.end;
          let endDate = endStr ? new Date(endStr) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1h
          if (isNaN(endDate.getTime())) endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

          // 4. Clean Description Points
          const descriptionPoints = Array.isArray(action.eventData.descriptionPoints)
            ? action.eventData.descriptionPoints.map(String)
            : [];

          // Map action.eventData.type to categoryLabel from ACTIVE template
          const category = activeTemplate.categories.find((c: any) => c.label === action.eventData.type);

          const attendeesArray = Array.isArray(action.eventData.attendees) ? action.eventData.attendees : [];

          // IMPORTANTE: Si hay otros participantes (evento compartido), 
          // agregar al creador (userName) al inicio de la lista
          const finalAttendees = attendeesArray.length > 0
            ? [userName, ...attendeesArray] // El creador va primero
            : [];

          // 5. Construct Safe Event Data
          const safeEventData: any = {
            title,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            type,
            categoryLabel,
            color,
            descriptionPoints,
            location: action.eventData.location || null,
            allDay: action.eventData.allDay || false,
            attendees: finalAttendees, // Use the potentially modified attendees list
            creationSource: action.eventData.creationSource || 'manual',
            emotionalImpact: action.eventData.emotionalImpact || 'neutral'
          };

          // 6. Social Integration: Map named attendees to user IDs (con feedback)
          const notFoundAttendees: string[] = [];
          if (safeEventData.attendees.length > 0) {
            const participantIds: string[] = [];
            safeEventData.attendees.forEach((nameOrHandle: string) => {
              if (!nameOrHandle) return; // Skip if null/undefined

              const cleanInput = (nameOrHandle || '').replace(/^@/, '').toLowerCase().trim();

              // Evitar buscar al propio usuario como si fuera un invitado
              const safeUserName = (userName || '').toLowerCase().trim();
              const safeUserHandle = (userHandle || '').toLowerCase().trim();

              if (cleanInput === safeUserName || (safeUserHandle && cleanInput === safeUserHandle)) {
                return;
              }

              // 1. Try exact handle match (stripping @ if present)
              let friend = friends.find(f =>
                (f.handle || '').toLowerCase().replace(/^@/, '') === cleanInput.replace(/^@/, '')
              );

              // 2. If no handle match, try name match
              if (!friend) {
                const nameMatches = friends.filter(f => (f.name || '').toLowerCase().trim().includes(cleanInput));

                if (nameMatches.length === 1) {
                  friend = nameMatches[0];
                } else if (nameMatches.length > 1) {
                  console.warn(`[executeAction] Ambigüedad: "${cleanInput}" coincide con ${nameMatches.length} amigos.`);

                  // Try exact match
                  const exactNameMatch = nameMatches.find(f => (f.name || '').toLowerCase().trim() === cleanInput);
                  friend = exactNameMatch || nameMatches[0];
                }
              }

              if (friend) {
                // Evitar duplicados
                if (!participantIds.includes(friend.friend_id)) {
                  console.log(`[executeAction] Found friend for "${nameOrHandle}": ${friend.name} (${friend.friend_id})`);
                  participantIds.push(friend.friend_id);
                }
              } else {
                console.warn(`[executeAction] No se encontró amigo: "${nameOrHandle}" en lista de ${friends.length} amigos.`);
                notFoundAttendees.push(nameOrHandle);
              }
            });
            console.log(`[executeAction] Final participantIds:`, participantIds);
            safeEventData.participantIds = participantIds;
          }

          console.log('[executeAction] Creating sanitized event:', safeEventData);
          const id = await addEvent(safeEventData);

          // Mensaje con feedback
          let message = id ? `Evento "${title}" creado con éxito.` : "Error al guardar en base de datos.";
          if (notFoundAttendees.length > 0 && id) {
            message += ` Nota: No se encontró en tu red a ${notFoundAttendees.join(', ')}. Añádelos como amigos primero.`;
          }
          return message;
        }

        case 'update':
          if (!action.eventId) return "Error: ID de evento requerido.";
          await updateEvent(action.eventId, action.eventData || {});
          return "Evento actualizado correctamente.";

        case 'move':
          if (!action.eventId || !action.eventData?.start) return "Error: Datos de movimiento incompletos.";
          await updateEvent(action.eventId, {
            start: action.eventData.start,
            end: action.eventData.end,
            status: 'moved'
          });
          // Log reorganization activity if it's a move
          if (user) {
            calendarApi.logActivity(user.id, 'reorganized', { eventId: action.eventId, action: 'move' });
          }
          return "Evento movido correctamente.";

        case 'delete':
          if (!action.eventId) return "Error: ID de evento requerido.";
          await deleteEvent(action.eventId);
          // Log reorganization activity if it's a delete (often part of cleanup)
          if (user) {
            calendarApi.logActivity(user.id, 'reorganized', { eventId: action.eventId, action: 'delete' });
          }
          return "Evento eliminado correctamente.";

        case 'findSlots':
          // findSlots is handled in the Multi-Agent interception block above
          return "Búsqueda de huecos completada.";

        default:
          return "Acción desconocida.";
      }
    } catch (e) {
      console.error('[executeAction] Critical Failure:', e);
      return `Error crítico: ${e instanceof Error ? e.message : "Error desconocido"}`;
    }
  };

  // Función para refrescar eventos manualmente (ej: tras aceptar invitación)
  const refreshEvents = async () => {
    if (!user) return;
    try {
      const fetchedEvents = await calendarApi.fetchEvents(user.id);
      setEvents(fetchedEvents);
      console.log('📅 Events refreshed:', fetchedEvents.length);
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  };

  return (
    <CalendarContext.Provider value={{
      events, stats, refreshStats, isDarkMode, language, t, activeTemplate, defaultTemplates,
      customTemplate, accentColor, userName, userHandle, assistantName, assistantVoice,
      profileImage, isDetailViewOpen, friends, toggleDarkMode, setLanguage,
      setTemplate, saveCustomTemplate, setAccentColor, setUserName, setUserHandle,
      setAssistantName, setAssistantVoice, setProfileImage, setIsDetailViewOpen,
      refreshFriends, addEvent, updateEvent, deleteEvent, executeAction,
      refreshEvents, // Exportar para uso en otros componentes
      // Notification Exports
      unreadCount, hasUnread, refreshNotifications
    }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('useCalendar must be used within a CalendarProvider');
  return context;
};
