
export interface ValidationResult {
    valid: boolean;
    reason?: string;
    data?: any;
}

export const validateEvent = (eventData: any): ValidationResult => {
    if (!eventData) {
        return { valid: false, reason: "No event data provided." };
    }

    // 1. Sanitize Strings
    if (eventData.title) eventData.title = eventData.title.trim();
    if (eventData.description) eventData.description = eventData.description.trim();

    // 2. Validate Dates
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
        // Auto-fix inverted dates? Or reject?
        // Agent policy: If end < start, assume user meant +1h from start
        end = new Date(start.getTime() + 60 * 60 * 1000);
        eventData.end = end.toISOString();
        // We could return valid but modified
    }

    // 3. Duration sanity check
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours > 24 && !eventData.allDay) {
        return { valid: false, reason: "Events longer than 24h must be 'allDay'." };
    }

    // 4. Return validated and potentially sanitized data
    return {
        valid: true,
        data: eventData
    };
};
