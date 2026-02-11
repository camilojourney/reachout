-- Reachout Database Schema
-- Networking & Informational Interview Tracker

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Contacts: People to reach out to for informational interviews
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    company TEXT,
    title TEXT,
    connection_type TEXT CHECK(connection_type IN ('alumni', 'referral', 'cold', 'friend', 'colleague', 'other')) DEFAULT 'other',
    relationship_strength INTEGER CHECK(relationship_strength BETWEEN 1 AND 5) DEFAULT 1,
    notes TEXT,
    research_dossier TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Interviews: Track informational interview pipeline
CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('requested', 'scheduled', 'completed', 'cancelled')) DEFAULT 'requested',
    scheduled_at TEXT,
    completed_at TEXT,
    location TEXT CHECK(location IN ('virtual', 'phone', 'coffee', 'office', 'other')) DEFAULT 'virtual',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Prep Notes: Questions, research, and insights for interviews
CREATE TABLE IF NOT EXISTS prep_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('question', 'research', 'insight')) NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

-- Outreach: Track communication attempts
CREATE TABLE IF NOT EXISTS outreach (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('initial', 'follow_up', 'thank_you')) NOT NULL,
    channel TEXT CHECK(channel IN ('email', 'linkedin', 'phone', 'other')) DEFAULT 'email',
    sent_at TEXT DEFAULT (datetime('now')),
    response_received INTEGER DEFAULT 0,
    response_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_connection_type ON contacts(connection_type);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_contact_id ON interviews(contact_id);
CREATE INDEX IF NOT EXISTS idx_prep_notes_interview_id ON prep_notes(interview_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contact_id ON outreach(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_type ON outreach(type);
