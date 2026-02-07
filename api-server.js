#!/usr/bin/env node
/**
 * Reachout API Server
 * Networking & Informational Interview Tracker
 */

'use strict';

const express = require('express');
const path = require('path');
const { getDb, closeDb, now } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3458;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Error handling helper
function handleError(res, error, message = 'Internal server error') {
    console.error(message, error);
    res.status(500).json({ error: message, details: error.message });
}

// Validation helpers
function validateContact(data) {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        errors.push('Name is required');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
    }
    if (data.relationship_strength && (data.relationship_strength < 1 || data.relationship_strength > 5)) {
        errors.push('Relationship strength must be between 1 and 5');
    }
    const validConnectionTypes = ['alumni', 'referral', 'cold', 'friend', 'colleague', 'other'];
    if (data.connection_type && !validConnectionTypes.includes(data.connection_type)) {
        errors.push(`Connection type must be one of: ${validConnectionTypes.join(', ')}`);
    }
    return errors;
}

function validateInterview(data) {
    const errors = [];
    if (!data.contact_id || !Number.isInteger(data.contact_id)) {
        errors.push('Valid contact_id is required');
    }
    const validStatuses = ['requested', 'scheduled', 'completed', 'cancelled'];
    if (data.status && !validStatuses.includes(data.status)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    const validLocations = ['virtual', 'phone', 'coffee', 'office', 'other'];
    if (data.location && !validLocations.includes(data.location)) {
        errors.push(`Location must be one of: ${validLocations.join(', ')}`);
    }
    return errors;
}

function validatePrepNote(data) {
    const errors = [];
    if (!data.interview_id || !Number.isInteger(data.interview_id)) {
        errors.push('Valid interview_id is required');
    }
    const validTypes = ['question', 'research', 'insight'];
    if (!data.type || !validTypes.includes(data.type)) {
        errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }
    if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
        errors.push('Content is required');
    }
    return errors;
}

function validateOutreach(data) {
    const errors = [];
    if (!data.contact_id || !Number.isInteger(data.contact_id)) {
        errors.push('Valid contact_id is required');
    }
    const validTypes = ['initial', 'follow_up', 'thank_you'];
    if (!data.type || !validTypes.includes(data.type)) {
        errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }
    const validChannels = ['email', 'linkedin', 'phone', 'other'];
    if (data.channel && !validChannels.includes(data.channel)) {
        errors.push(`Channel must be one of: ${validChannels.join(', ')}`);
    }
    return errors;
}

// ============================================
// CONTACTS API
// ============================================

// GET /api/contacts - List all contacts
app.get('/api/contacts', (req, res) => {
    try {
        const db = getDb();
        const { search, company, connection_type, sort = 'created_at', order = 'desc' } = req.query;
        
        let sql = 'SELECT * FROM contacts WHERE 1=1';
        const params = [];
        
        if (search) {
            sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        if (company) {
            sql += ' AND company = ?';
            params.push(company);
        }
        if (connection_type) {
            sql += ' AND connection_type = ?';
            params.push(connection_type);
        }
        
        const validSorts = ['created_at', 'name', 'company', 'relationship_strength'];
        const sortColumn = validSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
        
        const contacts = db.prepare(sql).all(...params);
        res.json(contacts);
    } catch (error) {
        handleError(res, error, 'Failed to fetch contacts');
    }
});

// GET /api/contacts/:id - Get single contact
app.get('/api/contacts/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        // Include related interviews and outreach
        contact.interviews = db.prepare('SELECT * FROM interviews WHERE contact_id = ? ORDER BY created_at DESC').all(id);
        contact.outreach = db.prepare('SELECT * FROM outreach WHERE contact_id = ? ORDER BY sent_at DESC').all(id);
        
        res.json(contact);
    } catch (error) {
        handleError(res, error, 'Failed to fetch contact');
    }
});

// POST /api/contacts - Create contact
app.post('/api/contacts', (req, res) => {
    try {
        const errors = validateContact(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        
        const db = getDb();
        const { name, email, linkedin_url, company, title, connection_type, relationship_strength, notes } = req.body;
        
        const result = db.prepare(`
            INSERT INTO contacts (name, email, linkedin_url, company, title, connection_type, relationship_strength, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            name.trim(),
            email || null,
            linkedin_url || null,
            company || null,
            title || null,
            connection_type || 'other',
            relationship_strength || 1,
            notes || null
        );
        
        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(contact);
    } catch (error) {
        handleError(res, error, 'Failed to create contact');
    }
});

// PUT /api/contacts/:id - Update contact
app.put('/api/contacts/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const errors = validateContact({ ...req.body, name: req.body.name || 'placeholder' });
        // Name is optional for updates
        const filteredErrors = errors.filter(e => !e.includes('Name is required'));
        if (filteredErrors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: filteredErrors });
        }
        
        const db = getDb();
        const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        const { name, email, linkedin_url, company, title, connection_type, relationship_strength, notes } = req.body;
        
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
        `).run(
            name || null,
            email,
            linkedin_url,
            company,
            title,
            connection_type,
            relationship_strength,
            notes,
            now(),
            id
        );
        
        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        res.json(contact);
    } catch (error) {
        handleError(res, error, 'Failed to update contact');
    }
});

// DELETE /api/contacts/:id - Delete contact
app.delete('/api/contacts/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
        const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        
        db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete contact');
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
        
        let sql = `
            SELECT i.*, c.name as contact_name, c.company as contact_company, c.title as contact_title
            FROM interviews i
            JOIN contacts c ON i.contact_id = c.id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            sql += ' AND i.status = ?';
            params.push(status);
        }
        if (contact_id) {
            sql += ' AND i.contact_id = ?';
            params.push(parseInt(contact_id, 10));
        }
        
        sql += ' ORDER BY i.created_at DESC';
        
        const interviews = db.prepare(sql).all(...params);
        res.json(interviews);
    } catch (error) {
        handleError(res, error, 'Failed to fetch interviews');
    }
});

// GET /api/interviews/:id - Get single interview with prep notes
app.get('/api/interviews/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
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
        handleError(res, error, 'Failed to fetch interview');
    }
});

// POST /api/interviews - Create interview
app.post('/api/interviews', (req, res) => {
    try {
        const errors = validateInterview(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        
        const db = getDb();
        const { contact_id, status, scheduled_at, location, notes } = req.body;
        
        // Verify contact exists
        const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id);
        if (!contact) {
            return res.status(400).json({ error: 'Contact not found' });
        }
        
        const result = db.prepare(`
            INSERT INTO interviews (contact_id, status, scheduled_at, location, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            contact_id,
            status || 'requested',
            scheduled_at || null,
            location || 'virtual',
            notes || null
        );
        
        const interview = db.prepare(`
            SELECT i.*, c.name as contact_name, c.company as contact_company
            FROM interviews i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json(interview);
    } catch (error) {
        handleError(res, error, 'Failed to create interview');
    }
});

// PUT /api/interviews/:id - Update interview
app.put('/api/interviews/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const db = getDb();
        
        const existing = db.prepare('SELECT * FROM interviews WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        
        const { status, scheduled_at, completed_at, location, notes } = req.body;
        
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
        handleError(res, error, 'Failed to update interview');
    }
});

// DELETE /api/interviews/:id - Delete interview
app.delete('/api/interviews/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
        const existing = db.prepare('SELECT * FROM interviews WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        
        db.prepare('DELETE FROM interviews WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete interview');
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
        
        let sql = 'SELECT * FROM prep_notes WHERE 1=1';
        const params = [];
        
        if (interview_id) {
            sql += ' AND interview_id = ?';
            params.push(parseInt(interview_id, 10));
        }
        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const notes = db.prepare(sql).all(...params);
        res.json(notes);
    } catch (error) {
        handleError(res, error, 'Failed to fetch prep notes');
    }
});

// GET /api/prep-notes/:id - Get single prep note
app.get('/api/prep-notes/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
        const note = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        if (!note) {
            return res.status(404).json({ error: 'Prep note not found' });
        }
        res.json(note);
    } catch (error) {
        handleError(res, error, 'Failed to fetch prep note');
    }
});

// POST /api/prep-notes - Create prep note
app.post('/api/prep-notes', (req, res) => {
    try {
        const errors = validatePrepNote(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        
        const db = getDb();
        const { interview_id, type, content } = req.body;
        
        // Verify interview exists
        const interview = db.prepare('SELECT id FROM interviews WHERE id = ?').get(interview_id);
        if (!interview) {
            return res.status(400).json({ error: 'Interview not found' });
        }
        
        const result = db.prepare(`
            INSERT INTO prep_notes (interview_id, type, content)
            VALUES (?, ?, ?)
        `).run(interview_id, type, content.trim());
        
        const note = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(note);
    } catch (error) {
        handleError(res, error, 'Failed to create prep note');
    }
});

// PUT /api/prep-notes/:id - Update prep note
app.put('/api/prep-notes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const db = getDb();
        
        const existing = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Prep note not found' });
        }
        
        const { type, content } = req.body;
        
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
        handleError(res, error, 'Failed to update prep note');
    }
});

// DELETE /api/prep-notes/:id - Delete prep note
app.delete('/api/prep-notes/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
        const existing = db.prepare('SELECT * FROM prep_notes WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Prep note not found' });
        }
        
        db.prepare('DELETE FROM prep_notes WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete prep note');
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
        
        let sql = `
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            WHERE 1=1
        `;
        const params = [];
        
        if (contact_id) {
            sql += ' AND o.contact_id = ?';
            params.push(parseInt(contact_id, 10));
        }
        if (type) {
            sql += ' AND o.type = ?';
            params.push(type);
        }
        
        sql += ' ORDER BY o.sent_at DESC';
        
        const records = db.prepare(sql).all(...params);
        res.json(records);
    } catch (error) {
        handleError(res, error, 'Failed to fetch outreach records');
    }
});

// GET /api/outreach/:id - Get single outreach record
app.get('/api/outreach/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
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
        handleError(res, error, 'Failed to fetch outreach record');
    }
});

// POST /api/outreach - Create outreach record
app.post('/api/outreach', (req, res) => {
    try {
        const errors = validateOutreach(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        
        const db = getDb();
        const { contact_id, type, channel, sent_at, notes } = req.body;
        
        // Verify contact exists
        const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id);
        if (!contact) {
            return res.status(400).json({ error: 'Contact not found' });
        }
        
        const result = db.prepare(`
            INSERT INTO outreach (contact_id, type, channel, sent_at, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            contact_id,
            type,
            channel || 'email',
            sent_at || now(),
            notes || null
        );
        
        const record = db.prepare(`
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            WHERE o.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json(record);
    } catch (error) {
        handleError(res, error, 'Failed to create outreach record');
    }
});

// PUT /api/outreach/:id - Update outreach record
app.put('/api/outreach/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const db = getDb();
        
        const existing = db.prepare('SELECT * FROM outreach WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Outreach record not found' });
        }
        
        const { type, channel, response_received, response_at, notes } = req.body;
        
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
        `).run(type, channel, response_received ? 1 : 0, finalResponseAt, notes, now(), id);
        
        const record = db.prepare(`
            SELECT o.*, c.name as contact_name, c.company as contact_company
            FROM outreach o
            JOIN contacts c ON o.contact_id = c.id
            WHERE o.id = ?
        `).get(id);
        
        res.json(record);
    } catch (error) {
        handleError(res, error, 'Failed to update outreach record');
    }
});

// DELETE /api/outreach/:id - Delete outreach record
app.delete('/api/outreach/:id', (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        
        const existing = db.prepare('SELECT * FROM outreach WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Outreach record not found' });
        }
        
        db.prepare('DELETE FROM outreach WHERE id = ?').run(id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete outreach record');
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
        handleError(res, error, 'Failed to fetch pipeline');
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
                    const total = db.prepare('SELECT COUNT(*) as count FROM outreach WHERE type = "initial"').get().count;
                    const responded = db.prepare('SELECT COUNT(*) as count FROM outreach WHERE type = "initial" AND response_received = 1').get().count;
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
                insights: db.prepare('SELECT COUNT(*) as count FROM prep_notes WHERE type = "insight"').get().count
            }
        };
        
        res.json(stats);
    } catch (error) {
        handleError(res, error, 'Failed to fetch stats');
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: now() });
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
