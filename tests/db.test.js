/**
 * Tests for database connection utilities (mocked sqlite — no native install).
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');

const mockSqlitePath = path.join(__dirname, 'mocks', 'better-sqlite3.js');
const dbModulePath = path.join(__dirname, '..', 'lib', 'db.js');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'better-sqlite3') {
        return mockSqlitePath;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { seedMockDb, clearMockDb } = require(mockSqlitePath);

function createTempDbPath() {
    return path.join(os.tmpdir(), `reachout-db-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function loadDbModule(dbPath) {
    process.env.DB_PATH = dbPath;
    delete require.cache[dbModulePath];
    return require(dbModulePath);
}

describe('lib/db', () => {
    let dbPath;

    beforeEach(() => {
        dbPath = createTempDbPath();
    });

    afterEach(() => {
        try {
            const { closeDb } = loadDbModule(dbPath);
            closeDb();
        } catch {
            // module may not be loaded in every test
        }
        clearMockDb(dbPath);
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
        delete process.env.DB_PATH;
        delete require.cache[dbModulePath];
    });

    describe('getDb', () => {
        it('should initialize a new database with the full schema', () => {
            const { getDb } = loadDbModule(dbPath);
            const db = getDb();

            const tables = db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                .all()
                .map((row) => row.name);

            assert.deepStrictEqual(tables, ['contacts', 'interviews', 'outreach', 'prep_notes']);

            const columns = db.pragma('table_info(contacts)', { simple: true }).map((col) => col.name);
            assert.ok(columns.includes('research_dossier'));
        });

        it('should return the same singleton instance on repeated calls', () => {
            const { getDb } = loadDbModule(dbPath);
            assert.strictEqual(getDb(), getDb());
        });

        it('should enable foreign key constraints', () => {
            const { getDb } = loadDbModule(dbPath);
            assert.strictEqual(getDb().pragma('foreign_keys', true), 1);
        });

        it('should migrate legacy databases missing research_dossier', () => {
            fs.writeFileSync(dbPath, 'legacy');
            seedMockDb(dbPath, { contacts: ['id', 'name', 'email', 'created_at'] });

            const { getDb } = loadDbModule(dbPath);
            const columns = getDb()
                .pragma('table_info(contacts)', { simple: true })
                .map((col) => col.name);

            assert.ok(columns.includes('research_dossier'));
        });
    });

    describe('closeDb', () => {
        it('should close the connection and allow a fresh singleton', () => {
            const dbModule = loadDbModule(dbPath);
            const first = dbModule.getDb();
            dbModule.closeDb();
            const second = dbModule.getDb();
            assert.notStrictEqual(first, second);
        });
    });

    describe('now', () => {
        it('should return an ISO-8601 timestamp string', () => {
            const { now } = loadDbModule(dbPath);
            assert.match(now(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });

    describe('DB_PATH', () => {
        it('should reflect the configured DB_PATH environment variable', () => {
            const { DB_PATH } = loadDbModule(dbPath);
            assert.strictEqual(DB_PATH, dbPath);
        });
    });
});
