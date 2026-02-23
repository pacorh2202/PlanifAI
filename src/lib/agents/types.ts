
export interface AgentResponse {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: {
        agentId: string;
        processingTime: number;
        usage?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    };
    suggestedChanges?: Partial<CalendarActionData>; // If validator modifies data
    denialReason?: string; // If validator/conflict rejects action
}

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

export interface MultiAgentRequest {
    action: 'create' | 'update' | 'delete' | 'move';
    data: CalendarActionData;
    userId: string;
    userTimeZone: string;
}
