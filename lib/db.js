/**
 * Database connection and utilities
 */

'use strict';

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'reachout.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

let db = null;

/**
 * Get database connection (singleton)
 * @returns {Database} SQLite database instance
 */
function getDb() {
    if (!db) {
        // Check if database exists, if not initialize it
        const dbExists = fs.existsSync(DB_PATH);

        db = new Database(DB_PATH);
        db.pragma('foreign_keys = ON');

        if (!dbExists) {
            console.log('Initializing new database...');
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
            db.exec(schema);
            console.log('Database initialized.');
        } else {
            const tableNames = db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'")
                .all();
            if (tableNames.length > 0) {
                const columns = db.pragma('table_info(contacts)', { simple: true });
                if (!columns.some((col) => col.name === 'research_dossier')) {
                    db.exec('ALTER TABLE contacts ADD COLUMN research_dossier TEXT');
                    console.log('Migrated: Added research_dossier column to contacts table.');
                }
            }
        }
    }
    return db;
}

/**
 * Close database connection
 */
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function now() {
    return new Date().toISOString();
}

module.exports = { getDb, closeDb, now, DB_PATH };
