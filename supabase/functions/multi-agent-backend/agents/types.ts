
export interface CalendarActionData {
    title?: string;
    start?: string; // ISO
    end?: string; // ISO
    type?: string;
    location?: string;
    descriptionPoints?: string[];
    attendees?: string[];
    [key: string]: any;
}

export interface AgentResult {
    success: boolean;
    data?: CalendarActionData;
    error?: string; // Internal error
    denialReason?: string; // User-facing reason
    suggestedChanges?: Partial<CalendarActionData>;
}

export interface AgentContext {
    userId: string;
    userTimeZone: string;
}
