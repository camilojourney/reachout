/**
 * Lightweight better-sqlite3 stub for db tests (no native module required).
 */

'use strict';

const dbStateByPath = new Map();

function getState(path) {
    if (!dbStateByPath.has(path)) {
        dbStateByPath.set(path, { tables: {}, foreignKeys: false });
    }
    return dbStateByPath.get(path);
}

function seedMockDb(path, tables) {
    const state = getState(path);
    state.tables = { ...tables };
}

function clearMockDb(path) {
    dbStateByPath.delete(path);
}

class MockDatabase {
    constructor(path) {
        this.path = path;
        this.state = getState(path);
        this.closed = false;
    }

    pragma(stmt, option) {
        if (stmt === 'foreign_keys = ON') {
            this.state.foreignKeys = true;
            return;
        }
        if (stmt === 'foreign_keys') {
            return this.state.foreignKeys ? 1 : 0;
        }
        if (stmt === 'table_info(contacts)') {
            const columns = this.state.tables.contacts || [];
            if (option && option.simple) {
                return columns.map((name) => ({ name }));
            }
            return columns;
        }
        return undefined;
    }

    exec(sql) {
        const createMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g);
        for (const match of createMatches) {
            const table = match[1];
            if (!this.state.tables[table]) {
                this.state.tables[table] = defaultColumnsFor(table);
            }
        }

        if (sql.includes('ALTER TABLE contacts ADD COLUMN research_dossier')) {
            const columns = this.state.tables.contacts || [];
            if (!columns.includes('research_dossier')) {
                this.state.tables.contacts = [...columns, 'research_dossier'];
            }
        }
    }

    prepare(sql) {
        const state = this.state;
        return {
            all() {
                if (sql.includes("name='contacts'")) {
                    return state.tables.contacts ? [{ name: 'contacts' }] : [];
                }
                if (sql.includes('sqlite_master') && sql.includes("type='table'")) {
                    return Object.keys(state.tables)
                        .sort()
                        .map((name) => ({ name }));
                }
                return [];
            }
        };
    }

    close() {
        this.closed = true;
    }
}

function defaultColumnsFor(table) {
    if (table === 'contacts') {
        return [
            'id', 'name', 'email', 'linkedin_url', 'company', 'title',
            'connection_type', 'relationship_strength', 'notes',
            'research_dossier', 'created_at', 'updated_at'
        ];
    }
    return ['id'];
}

module.exports = MockDatabase;
module.exports.seedMockDb = seedMockDb;
module.exports.clearMockDb = clearMockDb;
