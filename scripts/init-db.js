#!/usr/bin/env node
/**
 * Database initialization script
 * Creates the SQLite database and applies the schema
 */

'use strict';

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'reachout.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

function initDatabase() {
    console.log(`Initializing database at: ${DB_PATH}`);
    
    // Read schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    // Create/open database
    const db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Execute schema
    db.exec(schema);
    
    console.log('Database initialized successfully!');
    console.log('Tables created: contacts, interviews, prep_notes, outreach');
    
    db.close();
}

// Run if called directly
if (require.main === module) {
    try {
        initDatabase();
    } catch (err) {
        console.error('Failed to initialize database:', err.message);
        process.exit(1);
    }
}

module.exports = { initDatabase, DB_PATH };
