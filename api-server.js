#!/usr/bin/env node
/**
 * Reachout API Server
 * Networking & Informational Interview Tracker
 */

'use strict';

const express = require('express');
const path = require('path');
const { getDb, closeDb, now } = require('./lib/db');
const {
    validateContact,
    validateInterview,
    validatePrepNote,
    validateOutreach,
    VALID_CONNECTION_TYPES,
    VALID_INTERVIEW_STATUSES,
    VALID_PREP_NOTE_TYPES,
    VALID_OUTREACH_TYPES,
    VALID_CHANNELS
} = require('./lib/validation');

const { researchPerson } = require('./lib/research');

const app = express();
const PORT = process.env.PORT || 3458;

// Middleware
app.use(express.json({ limit: '1mb' }));

// CORS headers for API routes
app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(204).send();
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.requestId}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// JSON parse error handler
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            details: 'Request body contains malformed JSON',
            requestId: req.requestId
        });
    }
    next(err);
});

// Error handling helper
function handleError(res, error, message = 'Internal server error', requestId = '') {
    console.error(`[${requestId}] ${message}:`, error.message);
    // Don't leak internal error details to clients
    res.status(500).json({
        error: message,
        requestId
    });
}

// Validation error response helper
function validationError(res, errors) {
    return res.status(400).json({
        error: 'Validation failed',
        details: errors
    });
}

// ============================================
// CONTACTS API
// ============================================

// Pagination helper
function parsePagination(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
    return { limit, offset };
}

// GET /api/contacts - List all contacts
app.get('/api/contacts', (req, res) => {
    try {
        const db = getDb();
        const { search, company, connection_type, sort = 'created_at', order = 'desc' } = req.query;
        const { limit, offset } = parsePagination(req.query);

        let whereSql = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereSql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        if (company) {
            whereSql += ' AND company = ?';
            params.push(company);
        }
        if (connection_type) {
            if (VALID_CONNECTION_TYPES.includes(connection_type)) {
                whereSql += ' AND connection_type = ?';
                params.push(connection_type);
            }
        }

        const validSorts = ['created_at', 'name', 'company', 'relationship_strength'];
        const sortColumn = validSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        const countSql = `SELECT COUNT(*) as total FROM contacts ${whereSql}`;
        const total = db.prepare(countSql).get(...params).total;

        const dataSql = `SELECT * FROM contacts ${whereSql} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
        const contacts = db.prepare(dataSql).all(...params, limit, offset);

        res.json({
            data: contacts,
            pagination: { total, limit, offset, hasMore: offset + contacts.length < total }
        });
    } catch (error) {
        handleError(res, error, 'Failed to fetch contacts', req.requestId);
    }
});

// GET /api/contacts/:id - Get single contact
app.get('/api/contacts/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid contact ID' });
        }

        const db = getDb();
        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        // Include related interviews and outreach
        contact.interviews = db.prepare('SELECT * FROM interviews WHERE contact_id = ? ORDER BY created_at DESC').all(id);
        contact.outreach = db.prepare('SELECT * FROM outreach WHERE contact_id = ? ORDER BY sent_at DESC').all(id);

        res.json(contact);
    } catch (error) {
        handleError(res, error, 'Failed to fetch contact', req.requestId);
    }
});

// POST /api/contacts - Create contact
app.post('/api/contacts', (req, res) => {
    try {
        const { valid, errors, sanitized } = validateContact(req.body, false);
        if (!valid) {
            return validationError(res, errors);
        }

        const db = getDb();
        const { name, email, linkedin_url, company, title, connection_type, relationship_strength, notes } = sanitized;

        const result = db.prepare(`
            INSERT INTO contacts (name, email, linkedin_url, company, title, connection_type, relationship_strength, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, email, linkedin_url, company, title, connection_type, relationship_strength, notes);

        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(contact);
    } catch (error) {
        handleError(res, error, 'Failed to create contact', req.requestId);
    }
});

// PUT /api/contacts/:id - Update contact
app.put('/api/contacts/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid contact ID' });
        }

        const { valid, errors, sanitized } = validateContact(req.body, true);
        if (!valid) {
            return validationError(res, errors);
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        const { name, email, linkedin_url, company, title, connection_type, relationship_strength, notes } = sanitized;

        db.prepare(`
            UPDATE contacts SET
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                linkedin_url = COALESCE(?, linkedin_url),
                company = COALESCE(?, company),
                title = COALESCE(?, title),
                connection_type = COALESCE(?, connection_type),
                relationship_strength = COALESCE(?, relationship_strength),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
        `).run(name, email, linkedin_url, company, title, connection_type, relationship_strength, notes, now(), id);

        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        res.json(contact);
    } catch (error) {
        handleError(res, error, 'Failed to update contact', req.requestId);
    }
});

// DELETE /api/contacts/:id - Delete contact
app.delete('/api/contacts/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid contact ID' });
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete contact', req.requestId);
    }
});

// ============================================
// INTERVIEWS API
// ============================================

// GET /api/interviews - List all interviews
app.get('/api/interviews', (req, res) => {
    try {
        const db = getDb();
        const { status, contact_id } = req.query;
        const { limit, offset } = parsePagination(req.query);

        let whereSql = 'WHERE 1=1';
        const params = [];

        if (status) {
            if (VALID_INTERVIEW_STATUSES.includes(status)) {
                whereSql += ' AND i.status = ?';
                params.push(status);
            }
        }
        if (contact_id) {
            const parsedId = parseInt(contact_id, 10);
            if (!isNaN(parsedId) && parsedId > 0) {
                whereSql += ' AND i.contact_id = ?';
                params.push(parsedId);
            }
        }

        const countSql = `SELECT COUNT(*) as total FROM interviews i ${whereSql}`;
        const total = db.prepare(countSql).get(...params).total;

        const dataSql = `
            SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title
            FROM interviews i
            JOIN contacts c ON i.contact_id = c.id
            ${whereSql}
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const interviews = db.prepare(dataSql).all(...params, limit, offset);

        res.json({
            data: interviews,
            pagination: { total, limit, offset, hasMore: offset + interviews.length < total }
        });
    } catch (error) {
        handleError(res, error, 'Failed to fetch interviews', req.requestId);
    }
});

// GET /api/interviews/:id - Get single interview with prep notes
app.get('/api/interviews/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid interview ID' });
        }

        const db = getDb();
        const interview = db.prepare(`
            SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title, c.email as contact_email
            FROM interviews i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = ?
        `).get(id);

        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        interview.prep_notes = db.prepare('SELECT * FROM prep_notes WHERE interview_id = ? ORDER BY created_at DESC').all(id);
        res.json(interview);
    } catch (error) {
        handleError(res, error, 'Failed to fetch interview', req.requestId);
    }
});

// POST /api/interviews - Create interview
app.post('/api/interviews', (req, res) => {
    try {
        const { valid, errors, sanitized } = validateInterview(req.body, false);
        if (!valid) {
            return validationError(res, errors);
        }

        const db = getDb();
        const { contact_id, status, scheduled_at, location, notes } = sanitized;

        // Verify contact exists
        const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id);
        if (!contact) {
            return res.status(400).json({ error: 'Contact not found' });
        }

        const result = db.prepare(`
            INSERT INTO interviews (contact_id, status, scheduled_at, location, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(contact_id, status, scheduled_at, location, notes);

        const interview = db.prepare(`
            SELECT i.*, c.name as contact_name, c.company as contact_company
            FROM interviews i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json(interview);
    } catch (error) {
        handleError(res, error, 'Failed to create interview', req.requestId);
    }
});

// PUT /api/interviews/:id - Update interview
app.put('/api/interviews/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid interview ID' });
        }

        const { valid, errors, sanitized } = validateInterview(req.body, true);
        if (!valid) {
            return validationError(res, errors);
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM interviews WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        const { status, scheduled_at, completed_at, location, notes } = sanitized;

        // Auto-set completed_at when status changes to completed
        let finalCompletedAt = completed_at;
        if (status === 'completed' && !existing.completed_at && !completed_at) {
            finalCompletedAt = now();
        }

        db.prepare(`
            UPDATE interviews SET
                status = COALESCE(?, status),
                scheduled_at = COALESCE(?, scheduled_at),
                completed_at = COALESCE(?, completed_at),
                location = COALESCE(?, location),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
        `).run(
            status,
            scheduled_at,
            finalCompletedAt,
            location,
            notes,
            now(),
            id
        );

        const interview = db.prepare(`
            SELECT i.*, c.name as contact_name, c.company as contact_company
            FROM interviews i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = ?
        `).get(id);

        res.json(interview);
    } catch (error) {
        handleError(res, error, 'Failed to update interview', req.requestId);
    }
});

// DELETE /api/interviews/:id - Delete interview
app.delete('/api/interviews/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid interview ID' });
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM interviews WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        db.prepare('DELETE FROM interviews WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete interview', req.requestId);
    }
});

// ============================================
// PREP NOTES API
// ============================================

// GET /api/prep-notes - List prep notes (optionally by interview)
app.get('/api/prep-notes', (req, res) => {
    try {
        const db = getDb();
        const { interview_id, type } = req.query;
        const { limit, offset } = parsePagination(req.query);

        let whereSql = 'WHERE 1=1';
        const params = [];

        if (interview_id) {
            const parsedId = parseInt(interview_id, 10);
            if (!isNaN(parsedId) && parsedId > 0) {
                whereSql += ' AND interview_id = ?';
                params.push(parsedId);
            }
        }
        if (type) {
            if (VALID_PREP_NOTE_TYPES.includes(type)) {
                whereSql += ' AND type = ?';
                params.push(type);
            }
        }

        const countSql = `SELECT COUNT(*) as total FROM prep_notes ${whereSql}`;
        const total = db.prepare(countSql).get(...params).total;

        const dataSql = `SELECT * FROM prep_notes ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const notes = db.prepare(dataSql).all(...params, limit, offset);

        res.json({
            data: notes,
            pagination: { total, limit, offset, hasMore: offset + notes.length < total }
        });
    } catch (error) {
        handleError(res, error, 'Failed to fetch prep notes', req.requestId);
    }
});

// GET /api/prep-notes/:id - Get single prep note
app.get('/api/prep-notes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid prep note ID' });
        }

        const db = getDb();
        const note = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        if (!note) {
            return res.status(404).json({ error: 'Prep note not found' });
        }
        res.json(note);
    } catch (error) {
        handleError(res, error, 'Failed to fetch prep note', req.requestId);
    }
});

// POST /api/prep-notes - Create prep note
app.post('/api/prep-notes', (req, res) => {
    try {
        const { valid, errors, sanitized } = validatePrepNote(req.body, false);
        if (!valid) {
            return validationError(res, errors);
        }

        const db = getDb();
        const { interview_id, type, content } = sanitized;

        // Verify interview exists
        const interview = db.prepare('SELECT id FROM interviews WHERE id = ?').get(interview_id);
        if (!interview) {
            return res.status(400).json({ error: 'Interview not found' });
        }

        const result = db.prepare(`
            INSERT INTO prep_notes (interview_id, type, content)
            VALUES (?, ?, ?)
        `).run(interview_id, type, content);

        const note = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(note);
    } catch (error) {
        handleError(res, error, 'Failed to create prep note', req.requestId);
    }
});

// PUT /api/prep-notes/:id - Update prep note
app.put('/api/prep-notes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid prep note ID' });
        }

        // For updates, type and content are optional - validate what's provided
        const errors = [];
        if (req.body.type !== undefined) {
            if (!VALID_PREP_NOTE_TYPES.includes(req.body.type)) {
                errors.push(`Type must be one of: ${VALID_PREP_NOTE_TYPES.join(', ')}`);
            }
        }
        if (req.body.content !== undefined && (typeof req.body.content !== 'string' || req.body.content.trim() === '')) {
            errors.push('Content cannot be empty');
        }
        if (errors.length > 0) {
            return validationError(res, errors);
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Prep note not found' });
        }

        const type = req.body.type;
        const content = req.body.content ? req.body.content.trim().slice(0, 10000) : undefined;

        db.prepare(`
            UPDATE prep_notes SET
                type = COALESCE(?, type),
                content = COALESCE(?, content),
                updated_at = ?
            WHERE id = ?
        `).run(type, content, now(), id);

        const note = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        res.json(note);
    } catch (error) {
        handleError(res, error, 'Failed to update prep note', req.requestId);
    }
});

// DELETE /api/prep-notes/:id - Delete prep note
app.delete('/api/prep-notes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid prep note ID' });
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Prep note not found' });
        }

        db.prepare('DELETE FROM prep_notes WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete prep note', req.requestId);
    }
});

// ============================================
// OUTREACH API
// ============================================

// GET /api/outreach - List outreach records
app.get('/api/outreach', (req, res) => {
    try {
        const db = getDb();
        const { contact_id, type } = req.query;
        const { limit, offset } = parsePagination(req.query);

        let whereSql = 'WHERE 1=1';
        const params = [];

        if (contact_id) {
            const parsedId = parseInt(contact_id, 10);
            if (!isNaN(parsedId) && parsedId > 0) {
                whereSql += ' AND o.contact_id = ?';
                params.push(parsedId);
            }
        }
        if (type) {
            if (VALID_OUTREACH_TYPES.includes(type)) {
                whereSql += ' AND o.type = ?';
                params.push(type);
            }
        }

        const countSql = `SELECT COUNT(*) as total FROM outreach o ${whereSql}`;
        const total = db.prepare(countSql).get(...params).total;

        const dataSql = `
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            ${whereSql}
            ORDER BY o.sent_at DESC
            LIMIT ? OFFSET ?
        `;
        const records = db.prepare(dataSql).all(...params, limit, offset);

        res.json({
            data: records,
            pagination: { total, limit, offset, hasMore: offset + records.length < total }
        });
    } catch (error) {
        handleError(res, error, 'Failed to fetch outreach records', req.requestId);
    }
});

// GET /api/outreach/:id - Get single outreach record
app.get('/api/outreach/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid outreach record ID' });
        }

        const db = getDb();
        const record = db.prepare(`
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            WHERE o.id = ?
        `).get(id);

        if (!record) {
            return res.status(404).json({ error: 'Outreach record not found' });
        }
        res.json(record);
    } catch (error) {
        handleError(res, error, 'Failed to fetch outreach record', req.requestId);
    }
});

// POST /api/outreach - Create outreach record
app.post('/api/outreach', (req, res) => {
    try {
        const { valid, errors, sanitized } = validateOutreach(req.body, false);
        if (!valid) {
            return validationError(res, errors);
        }

        const db = getDb();
        const { contact_id, type, channel, sent_at, notes } = sanitized;

        // Verify contact exists
        const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id);
        if (!contact) {
            return res.status(400).json({ error: 'Contact not found' });
        }

        const result = db.prepare(`
            INSERT INTO outreach (contact_id, type, channel, sent_at, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(contact_id, type, channel, sent_at || now(), notes);

        const record = db.prepare(`
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            WHERE o.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json(record);
    } catch (error) {
        handleError(res, error, 'Failed to create outreach record', req.requestId);
    }
});

// PUT /api/outreach/:id - Update outreach record
app.put('/api/outreach/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid outreach record ID' });
        }

        // Validate update fields
        const errors = [];

        if (req.body.type !== undefined && !VALID_OUTREACH_TYPES.includes(req.body.type)) {
            errors.push(`Type must be one of: ${VALID_OUTREACH_TYPES.join(', ')}`);
        }
        if (req.body.channel !== undefined && !VALID_CHANNELS.includes(req.body.channel)) {
            errors.push(`Channel must be one of: ${VALID_CHANNELS.join(', ')}`);
        }
        if (errors.length > 0) {
            return validationError(res, errors);
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM outreach WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Outreach record not found' });
        }

        const { type, channel, response_received, response_at, notes } = req.body;

        // Only update response_received if explicitly provided
        const finalResponseReceived = response_received !== undefined ? (response_received ? 1 : 0) : null;

        // Auto-set response_at when marking response received
        let finalResponseAt = response_at;
        if (response_received && !existing.response_at && !response_at) {
            finalResponseAt = now();
        }

        db.prepare(`
            UPDATE outreach SET
                type = COALESCE(?, type),
                channel = COALESCE(?, channel),
                response_received = COALESCE(?, response_received),
                response_at = COALESCE(?, response_at),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
        `).run(type, channel, finalResponseReceived, finalResponseAt, notes, now(), id);

        const record = db.prepare(`
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            WHERE o.id = ?
        `).get(id);

        res.json(record);
    } catch (error) {
        handleError(res, error, 'Failed to update outreach record', req.requestId);
    }
});

// DELETE /api/outreach/:id - Delete outreach record
app.delete('/api/outreach/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid outreach record ID' });
        }

        const db = getDb();
        const existing = db.prepare('SELECT * FROM outreach WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Outreach record not found' });
        }

        db.prepare('DELETE FROM outreach WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete outreach record', req.requestId);
    }
});

// ============================================
// RESEARCH API
// ============================================

// POST /api/research - Research person and store dossier alongside contact
app.post('/api/research', async (req, res) => {
    try {
        const { name, company, context = '' } = req.body;
        if (!name?.trim() || !company?.trim()) {
            return res.status(400).json({ error: 'name and company are required' });
        }

        const db = getDb();
        const trimmedName = name.trim();
        const trimmedCompany = company.trim();

        // Find existing contact (case insensitive)
        let contact = db.prepare(
            'SELECT * FROM contacts WHERE LOWER(name) = LOWER(?) AND LOWER(company) = LOWER(?)'
        ).get(trimmedName, trimmedCompany);

        const dossier = await researchPerson({
            name: trimmedName,
            company: trimmedCompany,
            context: context?.trim() || '',
        });

        if (contact) {
            // Update
            db.prepare(
                'UPDATE contacts SET research_dossier = ?, updated_at = ? WHERE id = ?'
            ).run(JSON.stringify(dossier), now(), contact.id);
            contact.research_dossier = JSON.stringify(dossier);
        } else {
            // Create new contact
            const result = db.prepare(
                'INSERT INTO contacts (name, company, research_dossier, connection_type, relationship_strength, notes, created_at, updated_at) ' +
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(
                trimmedName,
                trimmedCompany,
                JSON.stringify(dossier),
                'cold',
                1,
                'Auto-generated from research',
                now(),
                now()
            );
            contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
        }

        res.json({ success: true, contact, dossier });
    } catch (error) {
        handleError(res, error, 'Failed to research person', req.requestId);
    }
});

// ============================================
// DASHBOARD & STATS
// ============================================

// GET /api/pipeline - Interview pipeline view
app.get('/api/pipeline', (req, res) => {
    try {
        const db = getDb();

        const pipeline = {
            requested: db.prepare(`
                SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title
                FROM interviews i
                JOIN contacts c ON i.contact_id = c.id
                WHERE i.status = 'requested'
                ORDER BY i.created_at DESC
            `).all(),
            scheduled: db.prepare(`
                SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title
                FROM interviews i
                JOIN contacts c ON i.contact_id = c.id
                WHERE i.status = 'scheduled'
                ORDER BY i.scheduled_at ASC
            `).all(),
            completed: db.prepare(`
                SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title
                FROM interviews i
                JOIN contacts c ON i.contact_id = c.id
                WHERE i.status = 'completed'
                ORDER BY i.completed_at DESC
                LIMIT 10
            `).all(),
            cancelled: db.prepare(`
                SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title
                FROM interviews i
                JOIN contacts c ON i.contact_id = c.id
                WHERE i.status = 'cancelled'
                ORDER BY i.updated_at DESC
                LIMIT 5
            `).all()
        };

        res.json(pipeline);
    } catch (error) {
        handleError(res, error, 'Failed to fetch pipeline', req.requestId);
    }
});

// GET /api/stats - Analytics and stats
app.get('/api/stats', (req, res) => {
    try {
        const db = getDb();

        const stats = {
            contacts: {
                total: db.prepare('SELECT COUNT(*) as count FROM contacts').get().count,
                by_connection_type: db.prepare(`
                    SELECT connection_type, COUNT(*) as count
                    FROM contacts
                    GROUP BY connection_type
                `).all(),
                by_company: db.prepare(`
                    SELECT company, COUNT(*) as count
                    FROM contacts
                    WHERE company IS NOT NULL
                    GROUP BY company
                    ORDER BY count DESC
                    LIMIT 10
                `).all()
            },
            interviews: {
                total: db.prepare('SELECT COUNT(*) as count FROM interviews').get().count,
                by_status: db.prepare(`
                    SELECT status, COUNT(*) as count
                    FROM interviews
                    GROUP BY status
                `).all(),
                completed_this_month: db.prepare(`
                    SELECT COUNT(*) as count
                    FROM interviews
                    WHERE status = 'completed'
                    AND completed_at >= date('now', 'start of month')
                `).get().count
            },
            outreach: {
                total: db.prepare('SELECT COUNT(*) as count FROM outreach').get().count,
                response_rate: (() => {
                    const total = db.prepare("SELECT COUNT(*) as count FROM outreach WHERE type = 'initial'").get().count;
                    const responded = db.prepare("SELECT COUNT(*) as count FROM outreach WHERE type = 'initial' AND response_received = 1").get().count;
                    return total > 0 ? Math.round((responded / total) * 100) : 0;
                })(),
                by_channel: db.prepare(`
                    SELECT channel, COUNT(*) as count
                    FROM outreach
                    GROUP BY channel
                `).all()
            },
            prep_notes: {
                total: db.prepare('SELECT COUNT(*) as count FROM prep_notes').get().count,
                insights: db.prepare("SELECT COUNT(*) as count FROM prep_notes WHERE type = 'insight'").get().count
            }
        };

        res.json(stats);
    } catch (error) {
        handleError(res, error, 'Failed to fetch stats', req.requestId);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    try {
        const db = getDb();
        // Verify database is accessible with a simple query
        db.prepare('SELECT 1').get();
        res.json({ status: 'ok', timestamp: now(), db: 'connected' });
    } catch (error) {
        console.error(`[${req.requestId}] Health check failed:`, error.message);
        res.status(503).json({ status: 'error', timestamp: now(), db: 'disconnected' });
    }
});

// 404 handler for API routes
app.use('/api', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        details: `Route ${req.method} ${req.path} does not exist`,
        requestId: req.requestId
    });
});

// Global error handler
app.use((err, req, res, _next) => {
    console.error(`[${req.requestId}] Unhandled error:`, err.message);
    res.status(500).json({
        error: 'Internal server error',
        requestId: req.requestId
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    closeDb();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    closeDb();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Reachout API server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
