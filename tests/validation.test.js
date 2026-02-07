/**
 * Tests for validation utilities
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
    isValidEmail,
    isValidUrl,
    isValidLinkedInUrl,
    sanitizeString,
    parseIntInRange,
    isValidISODate,
    validateContact,
    validateInterview,
    validatePrepNote,
    validateOutreach
} = require('../lib/validation');

describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
        assert.strictEqual(isValidEmail('test@example.com'), true);
        assert.strictEqual(isValidEmail('user.name@domain.org'), true);
        assert.strictEqual(isValidEmail('user+tag@example.co.uk'), true);
    });

    it('should return true for empty/null (optional field)', () => {
        assert.strictEqual(isValidEmail(''), true);
        assert.strictEqual(isValidEmail(null), true);
        assert.strictEqual(isValidEmail(undefined), true);
    });

    it('should return false for invalid emails', () => {
        assert.strictEqual(isValidEmail('notanemail'), false);
        assert.strictEqual(isValidEmail('missing@domain'), false);
        assert.strictEqual(isValidEmail('@nodomain.com'), false);
        assert.strictEqual(isValidEmail('spaces in@email.com'), false);
    });
});

describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
        assert.strictEqual(isValidUrl('https://example.com'), true);
        assert.strictEqual(isValidUrl('http://localhost:3000'), true);
        assert.strictEqual(isValidUrl('https://sub.domain.com/path?query=1'), true);
    });

    it('should return true for empty/null (optional field)', () => {
        assert.strictEqual(isValidUrl(''), true);
        assert.strictEqual(isValidUrl(null), true);
    });

    it('should return false for invalid URLs', () => {
        assert.strictEqual(isValidUrl('not a url'), false);
        assert.strictEqual(isValidUrl('://missing-protocol'), false);
    });
});

describe('isValidLinkedInUrl', () => {
    it('should return true for valid LinkedIn URLs', () => {
        assert.strictEqual(isValidLinkedInUrl('https://linkedin.com/in/johndoe'), true);
        assert.strictEqual(isValidLinkedInUrl('https://www.linkedin.com/in/johndoe'), true);
        assert.strictEqual(isValidLinkedInUrl('http://linkedin.com/company/acme'), true);
    });

    it('should return false for non-LinkedIn URLs', () => {
        assert.strictEqual(isValidLinkedInUrl('https://twitter.com/johndoe'), false);
        assert.strictEqual(isValidLinkedInUrl('https://example.com'), false);
    });

    it('should return false for phishing/spoofed URLs', () => {
        assert.strictEqual(isValidLinkedInUrl('https://evil.com/linkedin.com/phish'), false);
        assert.strictEqual(isValidLinkedInUrl('https://linkedin.com.evil.com/in/user'), false);
        assert.strictEqual(isValidLinkedInUrl('https://fake-linkedin.com/in/user'), false);
    });
});

describe('sanitizeString', () => {
    it('should trim whitespace', () => {
        assert.strictEqual(sanitizeString('  hello  '), 'hello');
    });

    it('should return null for empty strings', () => {
        assert.strictEqual(sanitizeString(''), null);
        assert.strictEqual(sanitizeString('   '), null);
    });

    it('should truncate long strings', () => {
        const longStr = 'a'.repeat(100);
        assert.strictEqual(sanitizeString(longStr, 50).length, 50);
    });

    it('should return null for non-strings', () => {
        assert.strictEqual(sanitizeString(123), null);
        assert.strictEqual(sanitizeString({}), null);
    });
});

describe('parseIntInRange', () => {
    it('should parse valid integers in range', () => {
        assert.strictEqual(parseIntInRange('3', 1, 5), 3);
        assert.strictEqual(parseIntInRange(3, 1, 5), 3);
    });

    it('should return null for out of range values', () => {
        assert.strictEqual(parseIntInRange('0', 1, 5), null);
        assert.strictEqual(parseIntInRange('6', 1, 5), null);
    });

    it('should return null for non-numeric values', () => {
        assert.strictEqual(parseIntInRange('abc', 1, 5), null);
        assert.strictEqual(parseIntInRange(NaN, 1, 5), null);
    });
});

describe('isValidISODate', () => {
    it('should return true for valid ISO dates', () => {
        assert.strictEqual(isValidISODate('2024-01-15'), true);
        assert.strictEqual(isValidISODate('2024-01-15T10:30:00Z'), true);
        assert.strictEqual(isValidISODate('2024-01-15T10:30:00.000Z'), true);
        assert.strictEqual(isValidISODate('2024-12-31'), true);
    });

    it('should return true for empty/null (optional field)', () => {
        assert.strictEqual(isValidISODate(''), true);
        assert.strictEqual(isValidISODate(null), true);
    });

    it('should return false for invalid dates', () => {
        assert.strictEqual(isValidISODate('not-a-date'), false);
        assert.strictEqual(isValidISODate('2024-13-45'), false);
        assert.strictEqual(isValidISODate('2024-02-30'), false); // Feb 30 doesn't exist
        assert.strictEqual(isValidISODate('2024/01/15'), false); // Wrong format
    });
});

describe('validateContact', () => {
    it('should pass for valid contact data', () => {
        const result = validateContact({
            name: 'John Doe',
            email: 'john@example.com',
            company: 'Acme Inc',
            connection_type: 'alumni',
            relationship_strength: 3
        });
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
    });

    it('should fail when name is missing', () => {
        const result = validateContact({ email: 'john@example.com' });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('Name')));
    });

    it('should allow missing name on update', () => {
        const result = validateContact({ email: 'john@example.com' }, true);
        assert.strictEqual(result.valid, true);
    });

    it('should fail for invalid email', () => {
        const result = validateContact({ name: 'John', email: 'invalid' });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('email')));
    });

    it('should fail for invalid connection type', () => {
        const result = validateContact({ name: 'John', connection_type: 'invalid' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail for invalid relationship strength', () => {
        const result = validateContact({ name: 'John', relationship_strength: 10 });
        assert.strictEqual(result.valid, false);
    });

    it('should sanitize string fields', () => {
        const result = validateContact({ name: '  John Doe  ' });
        assert.strictEqual(result.sanitized.name, 'John Doe');
    });
});

describe('validateInterview', () => {
    it('should pass for valid interview data', () => {
        const result = validateInterview({
            contact_id: 1,
            status: 'scheduled',
            location: 'virtual'
        });
        assert.strictEqual(result.valid, true);
    });

    it('should fail when contact_id is missing', () => {
        const result = validateInterview({ status: 'scheduled' });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('contact_id')));
    });

    it('should fail for invalid status', () => {
        const result = validateInterview({ contact_id: 1, status: 'invalid' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail for invalid location', () => {
        const result = validateInterview({ contact_id: 1, location: 'invalid' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail for invalid date format', () => {
        const result = validateInterview({ contact_id: 1, scheduled_at: 'not-a-date' });
        assert.strictEqual(result.valid, false);
    });
});

describe('validatePrepNote', () => {
    it('should pass for valid prep note data', () => {
        const result = validatePrepNote({
            interview_id: 1,
            type: 'question',
            content: 'What is your career path?'
        });
        assert.strictEqual(result.valid, true);
    });

    it('should fail when interview_id is missing', () => {
        const result = validatePrepNote({ type: 'question', content: 'Test' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail for invalid type', () => {
        const result = validatePrepNote({ interview_id: 1, type: 'invalid', content: 'Test' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail when content is empty', () => {
        const result = validatePrepNote({ interview_id: 1, type: 'question', content: '' });
        assert.strictEqual(result.valid, false);
    });
});

describe('validateOutreach', () => {
    it('should pass for valid outreach data', () => {
        const result = validateOutreach({
            contact_id: 1,
            type: 'initial',
            channel: 'email'
        });
        assert.strictEqual(result.valid, true);
    });

    it('should fail when contact_id is missing', () => {
        const result = validateOutreach({ type: 'initial' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail for invalid type', () => {
        const result = validateOutreach({ contact_id: 1, type: 'invalid' });
        assert.strictEqual(result.valid, false);
    });

    it('should fail for invalid channel', () => {
        const result = validateOutreach({ contact_id: 1, type: 'initial', channel: 'invalid' });
        assert.strictEqual(result.valid, false);
    });
});
