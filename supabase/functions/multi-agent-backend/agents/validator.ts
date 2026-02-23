
export interface ValidationResult {
    valid: boolean;
    reason?: string;
    data?: any;
}

/**
 * Validates event data.
 * For 'create' actions: full validation (dates required).
 * For 'update'/'move' actions: lenient — only validate what's present.
 */
export const validateEvent = (eventData: any, actionType?: string): ValidationResult => {
    if (!eventData) {
        return { valid: false, reason: "No event data provided." };
    }

    // 1. Sanitize Strings
    if (eventData.title) eventData.title = eventData.title.trim();
    if (eventData.description) eventData.description = eventData.description.trim();

    // 2. For partial updates (update/move/delete), skip mandatory date validation
    const isPartialUpdate = actionType === 'update' || actionType === 'move' || actionType === 'delete';

    if (!isPartialUpdate) {
        // Full validation: start is required for create
        let start = new Date(eventData.start);
        let end = new Date(eventData.end);

        if (isNaN(start.getTime())) {
            return { valid: false, reason: "Invalid start date." };
        }

        // Auto-fix end date if missing or invalid
        if (!eventData.end || isNaN(end.getTime())) {
            end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1h
            eventData.end = end.toISOString();
        }

        if (end <= start) {
            end = new Date(start.getTime() + 60 * 60 * 1000);
            eventData.end = end.toISOString();
        }

        // 3. Duration sanity check
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (durationHours > 24 && !eventData.allDay) {
            return { valid: false, reason: "Events longer than 24h must be 'allDay'." };
        }
    } else {
        // Partial update: if dates ARE present, validate them loosely
        if (eventData.start && eventData.end) {
            const start = new Date(eventData.start);
            const end = new Date(eventData.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
                // Auto-fix: extend end to 1h after start
                eventData.end = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
            }
        }
    }

    // 4. Return validated and potentially sanitized data
    return {
        valid: true,
        data: eventData
    };
};
