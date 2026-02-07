/**
 * Input validation utilities
 */

'use strict';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
    if (!url) return true; // Optional field
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate LinkedIn URL
 * @param {string} url - LinkedIn URL to validate
 * @returns {boolean} True if valid
 */
function isValidLinkedInUrl(url) {
    if (!url) return true;
    if (!isValidUrl(url)) return false;
    return url.includes('linkedin.com');
}

/**
 * Sanitize string input - trim and limit length
 * @param {string} str - String to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string|null} Sanitized string or null
 */
function sanitizeString(str, maxLength = 1000) {
    if (!str) return null;
    if (typeof str !== 'string') return null;
    return str.trim().slice(0, maxLength) || null;
}

/**
 * Validate and parse integer
 * @param {any} value - Value to parse
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number|null} Parsed integer or null
 */
function parseIntInRange(value, min, max) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return null;
    if (num < min || num > max) return null;
    return num;
}

/**
 * Validate ISO date string
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid ISO date
 */
function isValidISODate(dateStr) {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Validate value is in allowed list
 * @param {any} value - Value to check
 * @param {Array} allowed - Allowed values
 * @returns {boolean} True if value is allowed
 */
function isOneOf(value, allowed) {
    if (!value) return true; // Optional
    return allowed.includes(value);
}

// Validation schemas
const VALID_CONNECTION_TYPES = ['alumni', 'referral', 'cold', 'friend', 'colleague', 'other'];
const VALID_INTERVIEW_STATUSES = ['requested', 'scheduled', 'completed', 'cancelled'];
const VALID_LOCATIONS = ['virtual', 'phone', 'coffee', 'office', 'other'];
const VALID_PREP_NOTE_TYPES = ['question', 'research', 'insight'];
const VALID_OUTREACH_TYPES = ['initial', 'follow_up', 'thank_you'];
const VALID_CHANNELS = ['email', 'linkedin', 'phone', 'other'];

/**
 * Validate contact data
 * @param {Object} data - Contact data
 * @param {boolean} isUpdate - If true, name is optional
 * @returns {{valid: boolean, errors: string[], sanitized: Object}}
 */
function validateContact(data, isUpdate = false) {
    const errors = [];
    const sanitized = {};

    // Name - required for create
    if (!isUpdate) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
            errors.push('Name is required');
        }
    }
    sanitized.name = sanitizeString(data.name, 200);

    // Email - optional but must be valid format
    if (data.email && !isValidEmail(data.email)) {
        errors.push('Invalid email format');
    }
    sanitized.email = sanitizeString(data.email, 254);

    // LinkedIn URL - optional but must be valid
    if (data.linkedin_url && !isValidLinkedInUrl(data.linkedin_url)) {
        errors.push('Invalid LinkedIn URL');
    }
    sanitized.linkedin_url = sanitizeString(data.linkedin_url, 500);

    // Company and title
    sanitized.company = sanitizeString(data.company, 200);
    sanitized.title = sanitizeString(data.title, 200);

    // Connection type
    if (!isOneOf(data.connection_type, VALID_CONNECTION_TYPES)) {
        errors.push(`Connection type must be one of: ${VALID_CONNECTION_TYPES.join(', ')}`);
    }
    sanitized.connection_type = data.connection_type || 'other';

    // Relationship strength
    if (data.relationship_strength !== undefined) {
        const strength = parseIntInRange(data.relationship_strength, 1, 5);
        if (strength === null) {
            errors.push('Relationship strength must be between 1 and 5');
        }
        sanitized.relationship_strength = strength || 1;
    } else {
        sanitized.relationship_strength = 1;
    }

    // Notes
    sanitized.notes = sanitizeString(data.notes, 5000);

    return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate interview data
 * @param {Object} data - Interview data
 * @param {boolean} isUpdate - If true, contact_id is optional
 * @returns {{valid: boolean, errors: string[], sanitized: Object}}
 */
function validateInterview(data, isUpdate = false) {
    const errors = [];
    const sanitized = {};

    // Contact ID - required for create
    if (!isUpdate) {
        if (!data.contact_id || !Number.isInteger(data.contact_id)) {
            const parsed = parseInt(data.contact_id, 10);
            if (isNaN(parsed) || parsed < 1) {
                errors.push('Valid contact_id is required');
            } else {
                sanitized.contact_id = parsed;
            }
        } else {
            sanitized.contact_id = data.contact_id;
        }
    }

    // Status
    if (!isOneOf(data.status, VALID_INTERVIEW_STATUSES)) {
        errors.push(`Status must be one of: ${VALID_INTERVIEW_STATUSES.join(', ')}`);
    }
    sanitized.status = data.status || 'requested';

    // Scheduled at
    if (data.scheduled_at && !isValidISODate(data.scheduled_at)) {
        errors.push('Invalid scheduled_at date format');
    }
    sanitized.scheduled_at = data.scheduled_at || null;

    // Completed at
    if (data.completed_at && !isValidISODate(data.completed_at)) {
        errors.push('Invalid completed_at date format');
    }
    sanitized.completed_at = data.completed_at || null;

    // Location
    if (!isOneOf(data.location, VALID_LOCATIONS)) {
        errors.push(`Location must be one of: ${VALID_LOCATIONS.join(', ')}`);
    }
    sanitized.location = data.location || 'virtual';

    // Notes
    sanitized.notes = sanitizeString(data.notes, 5000);

    return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate prep note data
 * @param {Object} data - Prep note data
 * @param {boolean} isUpdate - If true, interview_id is optional
 * @returns {{valid: boolean, errors: string[], sanitized: Object}}
 */
function validatePrepNote(data, isUpdate = false) {
    const errors = [];
    const sanitized = {};

    // Interview ID - required for create
    if (!isUpdate) {
        const parsed = parseInt(data.interview_id, 10);
        if (isNaN(parsed) || parsed < 1) {
            errors.push('Valid interview_id is required');
        } else {
            sanitized.interview_id = parsed;
        }
    }

    // Type - required
    if (!data.type || !VALID_PREP_NOTE_TYPES.includes(data.type)) {
        errors.push(`Type must be one of: ${VALID_PREP_NOTE_TYPES.join(', ')}`);
    }
    sanitized.type = data.type;

    // Content - required
    if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
        errors.push('Content is required');
    }
    sanitized.content = sanitizeString(data.content, 10000);

    return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate outreach data
 * @param {Object} data - Outreach data
 * @param {boolean} isUpdate - If true, contact_id is optional
 * @returns {{valid: boolean, errors: string[], sanitized: Object}}
 */
function validateOutreach(data, isUpdate = false) {
    const errors = [];
    const sanitized = {};

    // Contact ID - required for create
    if (!isUpdate) {
        const parsed = parseInt(data.contact_id, 10);
        if (isNaN(parsed) || parsed < 1) {
            errors.push('Valid contact_id is required');
        } else {
            sanitized.contact_id = parsed;
        }
    }

    // Type - required
    if (!data.type || !VALID_OUTREACH_TYPES.includes(data.type)) {
        errors.push(`Type must be one of: ${VALID_OUTREACH_TYPES.join(', ')}`);
    }
    sanitized.type = data.type;

    // Channel
    if (!isOneOf(data.channel, VALID_CHANNELS)) {
        errors.push(`Channel must be one of: ${VALID_CHANNELS.join(', ')}`);
    }
    sanitized.channel = data.channel || 'email';

    // Sent at
    if (data.sent_at && !isValidISODate(data.sent_at)) {
        errors.push('Invalid sent_at date format');
    }
    sanitized.sent_at = data.sent_at || null;

    // Response received
    sanitized.response_received = data.response_received ? 1 : 0;

    // Response at
    if (data.response_at && !isValidISODate(data.response_at)) {
        errors.push('Invalid response_at date format');
    }
    sanitized.response_at = data.response_at || null;

    // Notes
    sanitized.notes = sanitizeString(data.notes, 5000);

    return { valid: errors.length === 0, errors, sanitized };
}

module.exports = {
    isValidEmail,
    isValidUrl,
    isValidLinkedInUrl,
    sanitizeString,
    parseIntInRange,
    isValidISODate,
    isOneOf,
    validateContact,
    validateInterview,
    validatePrepNote,
    validateOutreach,
    VALID_CONNECTION_TYPES,
    VALID_INTERVIEW_STATUSES,
    VALID_LOCATIONS,
    VALID_PREP_NOTE_TYPES,
    VALID_OUTREACH_TYPES,
    VALID_CHANNELS
};
