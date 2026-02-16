
export interface NotificationResult {
    needsNotification: boolean;
    recipients?: string[];
    message?: string;
}

export const processNotifications = (eventData: any): NotificationResult => {
    // Check if there are participants in the event data
    const attendees = eventData.attendees || [];
    const participantIds = eventData.participantIds || [];
    const isRecurring = !!(eventData.recurrenceId || eventData.recurrence_id);

    // If we have participants, Agent 5 flag it
    if (participantIds.length > 0 || attendees.length > 1) {
        const typeLabel = isRecurring ? "automated/recurring task" : "task";
        return {
            needsNotification: true,
            recipients: participantIds,
            message: `Agent 5: Invitation detected for ${typeLabel} with ${attendees.length} participants.`
        };
    }

    return { needsNotification: false };
};
