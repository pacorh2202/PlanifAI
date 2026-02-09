
import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { fetchNotifications, markAsRead, markAllAsRead } from '../src/lib/notifications-api';
import { useCalendar } from '../contexts/CalendarContext';
import { supabase } from '../src/lib/supabase';
import { ICON_MAP } from '../constants';

interface NotificationListModalProps {
    onClose: () => void;
    onNotificationUpdate?: () => Promise<void>;
}

// Función helper para timestamps relativos
// Función helper para timestamps relativos
const getRelativeTime = (date: string, t: any): string => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs/ 60000);
    const diffHours = Math.floor(diffMs/ 3600000);
    const diffDays = Math.floor(diffMs/ 86400000);

    if (diffMins < 1) return t.notif_time_now || 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return t.notif_time_yesterday || 'Ayer';
    if (diffDays < 7) return `${diffDays}d`;
    return notifDate.toLocaleDateString();
};

// Helper para obtener configuración según tipo, categoría e información del evento
// Helper para obtener configuración según tipo, categoría e información del evento
const getDisplayConfig = (notif: any, activeTemplate: any, t: any) => {
    const { type, metadata } = notif;
    const categoryLabel = metadata?.categoryLabel;
    const categoryType = metadata?.categoryType;

   // Configuración base por tipo de notificación
    let config = {
        tag: t.notif_tag_general,
        icon: Calendar,
        tagColor: 'bg-gray-100 text-gray-500',
        iconBg: 'bg-gray-100 ',
        iconColor: 'text-gray-500',
        title: notif.title
    };

    if (type === 'event_shared') {
        config = {
            tag: t.notif_tag_request,
            icon: Calendar,
            tagColor: 'bg-[#FF6B6B]/10 text-[#FF6B6B]',
            iconBg: 'bg-[#FF6B6B]/10',
            iconColor: 'text-[#FF6B6B]',
            title: metadata?.eventTitle || notif.title
        };
    } else if (type === 'friend_accepted') {
        config = {
            tag: t.notif_tag_connection,
            icon: UserCheck,
            tagColor: 'bg-gray-100  text-gray-500 ',
            iconBg: 'bg-gray-100 ',
            iconColor: 'text-gray-500',
            title: notif.title
        };
    } else if (type === 'event_reminder') {
        config = {
            tag: t.notif_tag_reminder,
            icon: Clock,
            tagColor: 'bg-[#6A99A8]/10 text-[#6A99A8]',
            iconBg: 'bg-[#6A99A8]/10',
            iconColor: 'text-[#6A99A8]',
            title: notif.title
        };
    }

   // PRIORIDAD: Icono y color de la categoría de la tarea
    if (activeTemplate && (categoryType || categoryLabel)) {
        const category = activeTemplate.categories.find((c: any) =>
            (categoryType && c.type === categoryType) ||
            (categoryLabel && c.label === categoryLabel)
        );

        if (category) {
            const IconComponent = ICON_MAP[category.icon] || Calendar;
            config.icon = IconComponent;
            config.iconColor = 'text-white';
            config.iconBg = '';// Se usará el color de la categoría directamente
            (config as any).categoryColor = category.color;
        }
    }

    return config;
};

// Formateador de fecha legible para eventos
const formatEventTime = (isoString: string, language: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', options);
};

export const NotificationListModal: React.FC<NotificationListModalProps> = ({ onClose, onNotificationUpdate }) => {
    const { user } = useAuth();
    const { events, refreshEvents, activeTemplate, language, t } = useCalendar();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadNotifications();
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await fetchNotifications(user.id);
            setNotifications(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!user) return;
        try {
           // Eliminar solo las notificaciones que ya están leídas
            await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id)
                .eq('is_read', true);

            if (onNotificationUpdate) await onNotificationUpdate();
            loadNotifications();
        } catch (e) {
            console.error('Error clearing notifications:', e);
        }
    };

    const findConflict = (notif: any) => {
        if (notif.type !== 'event_shared' || !notif.metadata?.startTime || !notif.metadata?.endTime) return null;

        const start = new Date(notif.metadata.startTime).getTime();
        const end = new Date(notif.metadata.endTime).getTime();

        return events.find(e => {
            if (e.id === notif.metadata.eventId) return false;
            const eStart = new Date(e.start).getTime();
            const eEnd = new Date(e.end).getTime();
           // Solapamiento: (start < eEnd) && (end > eStart)
            return (start < eEnd) && (end > eStart);
        });
    };

    const handleAccept = async (notification: any, conflictEventId?: string) => {
        if (!user || !notification.metadata?.eventId) return;

        try {
           // Si hay conflicto y el usuario decidió priorizar, eliminamos la tarea anterior
            if (conflictEventId) {
                await supabase
                    .from('calendar_events')
                    .delete()
                    .eq('id', conflictEventId);
            }

            await supabase
                .from('event_participants')
                .update({ status: 'accepted' })
                .eq('event_id', notification.metadata.eventId)
                .eq('user_id', user.id);

            await markAsRead(notification.id);
            if (onNotificationUpdate) await onNotificationUpdate();
            loadNotifications();
            if (refreshEvents) await refreshEvents();

            alert(t.notif_action_accepted || 'Invitación aceptada ✅');
        } catch (e) {
            console.error(e);
            alert(t.notif_error_accept || 'Error al aceptar invitación.');
        }
    };

    const handleReject = async (notification: any) => {
        if (!user || !notification.metadata?.eventId) return;

        try {
            await supabase
                .from('event_participants')
                .update({ status: 'declined' })
                .eq('event_id', notification.metadata.eventId)
                .eq('user_id', user.id);

            await markAsRead(notification.id);
            if (onNotificationUpdate) await onNotificationUpdate();
            loadNotifications();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center pointer-events-none">
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-xl transition-opacity pointer-events-auto"
                onClick={onClose}
           />
            <div className="w-full sm:w-[450px] max-h-[90vh] sm:max-h-[85vh] bg-white/95/95 backdrop-blur-2xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto transform transition-all duration-300 ease-out">

                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100/50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 :bg-gray-800 text-gray-400  transition-colors"
                        >
                            <X size={24}/>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900  tracking-tight" style={{ letterSpacing: '-0.02em' }}>{t.notifications}</h2>
                    </div>
                    <button
                        onClick={handleClearAll}
                        className="text-[#FF6B6B] hover:text-[#FF5252] font-semibold text-sm transition-colors active:scale-95 transform"
                    >
                        {t.notif_clear}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
                            {t.notif_loading}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50  rounded-full flex items-center justify-center mb-4 text-gray-300 ">
                                <Calendar size={28}/>
                            </div>
                            <p className="text-gray-500  font-medium tracking-tight">{t.notif_empty}</p>
                        </div>
                    ) : (
                        notifications
                            .filter(notif => notif.type !== 'ai_prediction' && notif.type !== 'sugerencia_ia')
                            .map(notif => {
                                const config = getDisplayConfig(notif, activeTemplate, t);
                                const Icon = config.icon;
                                const isUnread = !notif.is_read;
                                const eventTime = notif.metadata?.startTime ? formatEventTime(notif.metadata.startTime, language) : null;

                                return (
                                    <div
                                        key={notif.id}
                                        className={`p-6 rounded-[2.5rem] border transition-all duration-200 ${isUnread
                                            ? 'bg-white  border-gray-100  shadow-sm'
                                            : 'bg-gray-50/80/50 border-gray-50  opacity-80'
                                            }`}
                                    >
                                        {/* Header con tag y timestamp */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${config.tagColor}`}>
                                                {config.tag}
                                            </span>
                                            <span className="text-[12px] text-gray-400 font-semibold tracking-tight">
                                                {getRelativeTime(notif.created_at, t)}
                                            </span>
                                        </div>

                                        {/* Contenido */}
                                        <div className="flex gap-4">
                                            {notif.type === 'friend_accepted' && notif.metadata?.profileImage ? (
                                                <img
                                                    src={notif.metadata.profileImage}
                                                    alt="Avatar"
                                                    className="w-14 h-14 rounded-full object-cover shrink-0"
                                               />
                                            ) : (
                                                <div
                                                    className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm ${(config as any).categoryColor ? '' : config.iconBg + ' ' + config.iconColor}`}
                                                    style={(config as any).categoryColor ? { backgroundColor: (config as any).categoryColor } : {}}
                                                >
                                                    <Icon size={26} strokeWidth={2.5}/>
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900  text-[17px] leading-tight mb-1.5 tracking-tight capitalize">
                                                    {config.title}
                                                </h3>
                                                <p className="text-[14px] text-gray-500  leading-snug tracking-tight font-medium mb-2">
                                                    {notif.message}
                                                </p>

                                                {/* Detalle de Horario */}
                                                {eventTime && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide bg-gray-50/50 px-3 py-1.5 rounded-xl w-fit">
                                                        <Clock size={12} strokeWidth={3} className="text-[#6A99A8]"/>
                                                        {eventTime}
                                                    </div>
                                                )}

                                                {/* Detección de Conflicto Horario */}
                                                {isUnread && notif.type === 'event_shared' && (() => {
                                                    const conflict = findConflict(notif);
                                                    if (!conflict) return null;
                                                    return (
                                                        <div className="mt-4 p-3 bg-amber-50/20 border border-amber-100/50 rounded-2xl flex items-start gap-3">
                                                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[12px] font-bold text-amber-700  uppercase tracking-wider mb-0.5">
                                                                    {t.notif_conflict_title}
                                                                </p>
                                                                <p className="text-[13px] text-amber-600/80 font-medium leading-tight">
                                                                    {t.notif_conflict_desc} "{conflict.title}". {t.notif_conflict_suffix}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Botones de acción para solicitudes de tarea conjunta */}
                                                {isUnread && notif.type === 'event_shared' && (() => {
                                                    const conflict = findConflict(notif);
                                                    return (
                                                        <div className="flex gap-4 mt-6">
                                                            <button
                                                                onClick={() => handleAccept(notif, conflict?.id)}
                                                                className={`flex-1 px-5 py-3.5 ${conflict ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-[#FF6B6B] hover:bg-[#FF5252] shadow-[#FF6B6B]/20'} text-white rounded-[1.25rem] text-[15px] font-bold transition-all active:scale-[0.98] shadow-lg`}
                                                            >
                                                                {conflict ? t.notif_action_prioritize : t.notif_action_accept}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(notif)}
                                                                className="flex-1 px-5 py-3.5 bg-[#F3F4F6]  hover:bg-[#E5E7EB] :bg-gray-600 text-[#4B5563]  rounded-[1.25rem] text-[15px] font-bold transition-all active:scale-[0.98]"
                                                            >
                                                                {t.notif_action_ignore}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>

            </div>
        </div>
    );
};
