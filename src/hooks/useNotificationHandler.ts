import { useEffect } from 'react';
import { useCalendar } from '../../contexts/CalendarContext';

// Define the notification payload structure matching our Edge Function
interface NotificationPayload {
    type: string; // 'EVENT_T30_REMINDER', 'FRIEND_REQUEST_RECEIVED', etc.
    entity_data: any;
}

export const useNotificationHandler = (
    onNavigate: (tab: string, view?: string, data?: any) => void
) => {
    const { refetch: refetchCalendar } = useCalendar();

    useEffect(() => {
        // defined handler for potential native events
        const handleNotification = (event: CustomEvent<NotificationPayload>) => {
            console.log('Notification received in JS:', event.detail);
            const { type, entity_data } = event.detail;

            // 1. Refresh Data
            if (type.startsWith('EVENT_')) {
                refetchCalendar();
            }

            // 2. Logic for Navigation (Deep Linking)
            switch (type) {
                case 'EVENT_T30_REMINDER':
                case 'EVENT_NOW':
                case 'EVENT_UPDATED':
                case 'EVENT_INVITE':
                    // Navigate to Calendar and open specific event if possible
                    // We need to pass event_id to open detail view
                    onNavigate('calendar', 'detail', { eventId: entity_data.event_id });
                    break;

                case 'FRIEND_REQUEST_RECEIVED':
                case 'FRIEND_REQUEST_ACCEPTED':
                    // Navigate to Friends tab
                    onNavigate('friends');
                    break;

                case 'INACTIVITY_CATCHUP':
                    // Navigate to stats or home (chat)
                    onNavigate('stats');
                    break;

                case 'DAILY_SUMMARY':
                    // Navigate to Calendar day view
                    onNavigate('calendar', 'day');
                    break;

                default:
                    console.log('Unknown notification type, staying on current screen');
            }
        };

        // Listen for custom event 'despia-notification-opened'
        // We assume the native layer or a wrapper will dispatch this. 
        // If not exists, the user needs to ensure their native code dispatches this.
        window.addEventListener('despia-notification-opened', handleNotification as EventListener);

        // Also listen for standard 'onesignal-notification-opened' if they use a web wrapper
        window.addEventListener('onesignal-notification-opened', handleNotification as EventListener);

        return () => {
            window.removeEventListener('despia-notification-opened', handleNotification as EventListener);
            window.removeEventListener('onesignal-notification-opened', handleNotification as EventListener);
        };
    }, [onNavigate, refetchCalendar]);
};
