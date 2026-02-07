# Reachout Core MVP Spec

## Status: ✅ Implemented

## Overview
A networking and informational interview tracker for job seekers.

## User Stories

### As a job seeker, I want to:
1. ✅ Add and organize contacts I want to network with
2. ✅ Track which contacts I've reached out to
3. ✅ Manage a pipeline of informational interviews
4. ✅ Prepare questions and research for each interview
5. ✅ Capture insights from conversations
6. ✅ See my networking progress at a glance

## Data Model

### Contacts
```sql
CREATE TABLE contacts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    linkedin_url TEXT,
    company TEXT,
    title TEXT,
    connection_type TEXT CHECK(connection_type IN ('alumni', 'referral', 'cold', 'friend', 'colleague', 'other')),
    relationship_strength INTEGER CHECK(relationship_strength BETWEEN 1 AND 5),
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);
```

### Interviews
```sql
CREATE TABLE interviews (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES contacts(id),
    status TEXT CHECK(status IN ('requested', 'scheduled', 'completed', 'cancelled')),
    scheduled_at TEXT,
    completed_at TEXT,
    location TEXT CHECK(location IN ('virtual', 'phone', 'coffee', 'office', 'other')),
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);
```

### Prep Notes
```sql
CREATE TABLE prep_notes (
    id INTEGER PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id),
    type TEXT CHECK(type IN ('question', 'research', 'insight')),
    content TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
);
```

### Outreach
```sql
CREATE TABLE outreach (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES contacts(id),
    type TEXT CHECK(type IN ('initial', 'follow_up', 'thank_you')),
    channel TEXT CHECK(channel IN ('email', 'linkedin', 'phone', 'other')),
    sent_at TEXT,
    response_received INTEGER,
    response_at TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);
```

## API Endpoints

### CRUD Operations
- ✅ Contacts: GET, POST, PUT, DELETE
- ✅ Interviews: GET, POST, PUT, DELETE
- ✅ Prep Notes: GET, POST, PUT, DELETE
- ✅ Outreach: GET, POST, PUT, DELETE

### Pagination
- ✅ List endpoints support `?limit=` (1-100, default 50) and `?offset=` parameters
- ✅ Response format: `{ data: [...], pagination: { total, limit, offset, hasMore } }`

### Dashboard
- ✅ GET /api/pipeline - Interview statuses grouped
- ✅ GET /api/stats - Analytics data

## Frontend

### Views
- ✅ Dashboard with pipeline Kanban
- ✅ Contacts list with search/filter
- ✅ Interviews table
- ✅ Outreach table

### Features
- ✅ Modal forms for create/edit
- ✅ Keyboard shortcuts
- ✅ Toast notifications
- ✅ Bar charts for analytics

## Acceptance Criteria

### Contacts
- ✅ Can create contact with name (required)
- ✅ Can filter by connection type
- ✅ Can search by name, company, email
- ✅ Deleting contact cascades to interviews/outreach

### Interviews
- ✅ Can create interview linked to contact
- ✅ Status auto-tracks through pipeline
- ✅ Completed_at auto-sets when status = completed
- ✅ Can view prep notes for each interview

### Prep Notes
- ✅ Types: question, research, insight
- ✅ Linked to specific interview
- ✅ Visible on interview detail view

### Outreach
- ✅ Types: initial, follow_up, thank_you
- ✅ Response tracking with timestamp
- ✅ Response rate calculated in stats

### Dashboard
- ✅ Shows total contacts
- ✅ Shows interviews completed this month
- ✅ Shows response rate percentage
- ✅ Shows total insights captured
- ✅ Kanban pipeline with counts

## Non-Functional Requirements

### Performance
- ✅ Page loads < 1s
- ✅ API responses < 100ms (typical)

### Testing
- ✅ Unit tests for validation
- ✅ Integration tests for all endpoints
- ✅ 63 tests passing

### Code Quality
- ✅ ESLint configured
- ✅ Consistent error handling
- ✅ Input validation on all endpoints
