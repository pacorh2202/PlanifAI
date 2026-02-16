
export interface NotificationResult {
    needsNotification: boolean;
    recipients?: string[];
    message?: string;
}

export const processNotifications = (eventData: any): NotificationResult => {
    // Check if there are participants in the event data
    const attendees = eventData.attendees || [];
    const participantIds = eventData.participantIds || [];

    // If we have participants, Agent 5 flag it
    if (participantIds.length > 0 || attendees.length > 1) {
        return {
            needsNotification: true,
            recipients: participantIds,
            message: `Agent 5: Invitation detected for ${attendees.length} participants.`
        };
    }

    return { needsNotification: false };
};
