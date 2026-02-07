/**
 * API endpoint tests
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const TEST_PORT = 3459;
const TEST_DB = path.join(__dirname, 'test.db');
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;

/**
 * Make HTTP request helper
 */
function request(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : null;
                    resolve({ status: res.statusCode, data: json, headers: res.headers });
                } catch {
                    resolve({ status: res.statusCode, data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

describe('API Tests', () => {
    before(async () => {
        // Clean up test database
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }

        // Set test environment
        process.env.PORT = TEST_PORT;
        process.env.DB_PATH = TEST_DB;

        // Import and start server (need to do this after setting env vars)
        // We need to actually start the server
        return new Promise((resolve) => {
            const { spawn } = require('node:child_process');
            server = spawn('node', ['api-server.js'], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env, PORT: TEST_PORT, DB_PATH: TEST_DB }
            });

            server.stdout.on('data', (data) => {
                if (data.toString().includes('running')) {
                    setTimeout(resolve, 500); // Give server time to fully initialize
                }
            });

            server.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });
        });
    });

    after(() => {
        if (server) {
            server.kill();
        }
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    describe('Health Check', () => {
        it('GET /api/health should return ok status', async () => {
            const res = await request('GET', '/api/health');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'ok');
            assert.ok(res.data.timestamp);
        });
    });

    describe('Contacts API', () => {
        let contactId;

        it('POST /api/contacts should create a contact', async () => {
            const res = await request('POST', '/api/contacts', {
                name: 'Jane Smith',
                email: 'jane@example.com',
                company: 'Tech Corp',
                title: 'Engineering Manager',
                connection_type: 'referral',
                relationship_strength: 3
            });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.name, 'Jane Smith');
            assert.strictEqual(res.data.email, 'jane@example.com');
            assert.strictEqual(res.data.company, 'Tech Corp');
            assert.ok(res.data.id);
            contactId = res.data.id;
        });

        it('POST /api/contacts should fail without name', async () => {
            const res = await request('POST', '/api/contacts', {
                email: 'test@example.com'
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.error, 'Validation failed');
        });

        it('POST /api/contacts should fail with invalid email', async () => {
            const res = await request('POST', '/api/contacts', {
                name: 'Test',
                email: 'invalid-email'
            });

            assert.strictEqual(res.status, 400);
        });

        it('GET /api/contacts should list contacts', async () => {
            const res = await request('GET', '/api/contacts');

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data));
            assert.ok(res.data.length > 0);
        });

        it('GET /api/contacts with search should filter', async () => {
            const res = await request('GET', '/api/contacts?search=Jane');

            assert.strictEqual(res.status, 200);
            assert.ok(res.data.some(c => c.name === 'Jane Smith'));
        });

        it('GET /api/contacts/:id should get single contact', async () => {
            const res = await request('GET', `/api/contacts/${contactId}`);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.id, contactId);
            assert.strictEqual(res.data.name, 'Jane Smith');
        });

        it('GET /api/contacts/:id should return 404 for non-existent', async () => {
            const res = await request('GET', '/api/contacts/99999');

            assert.strictEqual(res.status, 404);
        });

        it('PUT /api/contacts/:id should update contact', async () => {
            const res = await request('PUT', `/api/contacts/${contactId}`, {
                title: 'Senior Engineering Manager',
                relationship_strength: 4
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.title, 'Senior Engineering Manager');
            assert.strictEqual(res.data.relationship_strength, 4);
        });

        it('DELETE /api/contacts/:id should delete contact', async () => {
            // Create a contact to delete
            const createRes = await request('POST', '/api/contacts', {
                name: 'To Delete'
            });
            const deleteId = createRes.data.id;

            const res = await request('DELETE', `/api/contacts/${deleteId}`);
            assert.strictEqual(res.status, 204);

            // Verify it's gone
            const getRes = await request('GET', `/api/contacts/${deleteId}`);
            assert.strictEqual(getRes.status, 404);
        });
    });

    describe('Interviews API', () => {
        let contactId;
        let interviewId;

        before(async () => {
            // Create a contact for interview tests
            const res = await request('POST', '/api/contacts', {
                name: 'Interview Contact',
                company: 'Interview Co'
            });
            contactId = res.data.id;
        });

        it('POST /api/interviews should create an interview', async () => {
            const res = await request('POST', '/api/interviews', {
                contact_id: contactId,
                status: 'requested',
                location: 'virtual'
            });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.contact_id, contactId);
            assert.strictEqual(res.data.status, 'requested');
            assert.ok(res.data.id);
            interviewId = res.data.id;
        });

        it('POST /api/interviews should fail without contact_id', async () => {
            const res = await request('POST', '/api/interviews', {
                status: 'requested'
            });

            assert.strictEqual(res.status, 400);
        });

        it('POST /api/interviews should fail with invalid contact', async () => {
            const res = await request('POST', '/api/interviews', {
                contact_id: 99999
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.error, 'Contact not found');
        });

        it('GET /api/interviews should list interviews', async () => {
            const res = await request('GET', '/api/interviews');

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data));
        });

        it('GET /api/interviews/:id should get interview with prep notes', async () => {
            const res = await request('GET', `/api/interviews/${interviewId}`);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.id, interviewId);
            assert.ok(Array.isArray(res.data.prep_notes));
        });

        it('PUT /api/interviews/:id should update status', async () => {
            const res = await request('PUT', `/api/interviews/${interviewId}`, {
                status: 'scheduled',
                scheduled_at: '2024-03-15T14:00:00Z'
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, 'scheduled');
        });

        it('PUT /api/interviews/:id should auto-set completed_at', async () => {
            const res = await request('PUT', `/api/interviews/${interviewId}`, {
                status: 'completed'
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.data.completed_at);
        });
    });

    describe('Prep Notes API', () => {
        let interviewId;

        before(async () => {
            // Create contact and interview for prep note tests
            const contactRes = await request('POST', '/api/contacts', {
                name: 'Prep Note Test Contact'
            });
            const interviewRes = await request('POST', '/api/interviews', {
                contact_id: contactRes.data.id
            });
            interviewId = interviewRes.data.id;
        });

        it('POST /api/prep-notes should create a prep note', async () => {
            const res = await request('POST', '/api/prep-notes', {
                interview_id: interviewId,
                type: 'question',
                content: 'What is your typical day like?'
            });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.type, 'question');
            assert.strictEqual(res.data.content, 'What is your typical day like?');
        });

        it('POST /api/prep-notes should fail with invalid type', async () => {
            const res = await request('POST', '/api/prep-notes', {
                interview_id: interviewId,
                type: 'invalid',
                content: 'Test'
            });

            assert.strictEqual(res.status, 400);
        });

        it('GET /api/prep-notes should list notes', async () => {
            const res = await request('GET', `/api/prep-notes?interview_id=${interviewId}`);

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data));
            assert.ok(res.data.length > 0);
        });
    });

    describe('Outreach API', () => {
        let contactId;

        before(async () => {
            const res = await request('POST', '/api/contacts', {
                name: 'Outreach Test Contact'
            });
            contactId = res.data.id;
        });

        it('POST /api/outreach should create outreach record', async () => {
            const res = await request('POST', '/api/outreach', {
                contact_id: contactId,
                type: 'initial',
                channel: 'linkedin'
            });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.type, 'initial');
            assert.strictEqual(res.data.channel, 'linkedin');
        });

        it('PUT /api/outreach/:id should mark response received', async () => {
            const createRes = await request('POST', '/api/outreach', {
                contact_id: contactId,
                type: 'follow_up',
                channel: 'email'
            });

            const res = await request('PUT', `/api/outreach/${createRes.data.id}`, {
                response_received: true
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.response_received, 1);
            assert.ok(res.data.response_at);
        });
    });

    describe('Pipeline API', () => {
        it('GET /api/pipeline should return pipeline data', async () => {
            const res = await request('GET', '/api/pipeline');

            assert.strictEqual(res.status, 200);
            assert.ok(res.data.requested !== undefined);
            assert.ok(res.data.scheduled !== undefined);
            assert.ok(res.data.completed !== undefined);
            assert.ok(res.data.cancelled !== undefined);
        });
    });

    describe('Stats API', () => {
        it('GET /api/stats should return statistics', async () => {
            const res = await request('GET', '/api/stats');

            assert.strictEqual(res.status, 200);
            assert.ok(res.data.contacts);
            assert.ok(typeof res.data.contacts.total === 'number');
            assert.ok(res.data.interviews);
            assert.ok(res.data.outreach);
            assert.ok(typeof res.data.outreach.response_rate === 'number');
        });
    });
});
