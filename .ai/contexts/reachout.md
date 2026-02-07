# Reachout Product Context

## What It Is
Reachout is a networking and informational interview tracker for job seekers. It helps users organize their professional outreach, track informational interviews, and capture insights from conversations.

## Problem It Solves
Job seekers often struggle to:
1. Keep track of everyone they've reached out to
2. Remember where each contact is in the interview pipeline
3. Prepare good questions for informational interviews
4. Follow up appropriately after conversations
5. Capture and retrieve insights from networking conversations

## Target Users
- Job seekers actively networking
- Career changers building new industry connections
- Students seeking informational interviews
- Professionals expanding their network

## Core Features (MVP)
1. **Contact Management** - Store and organize networking contacts
2. **Interview Pipeline** - Track status from requested → scheduled → completed
3. **Prep Notes** - Questions, research, and insights for each interview
4. **Outreach Tracking** - Log communication attempts and responses
5. **Analytics** - Response rate, interviews completed, insights captured

## Tech Stack
- Node.js + Express API
- SQLite database (better-sqlite3)
- Vanilla JS + CSS frontend (single HTML file)
- Node.js built-in test runner

## Architecture
- Single server running API and static file serving
- No build step - files served directly
- Database auto-initializes on first request
- All data stored in local SQLite file

## Key Design Decisions
1. **No auth for MVP** - Local app, single user
2. **SQLite** - Simple, no external dependencies, portable
3. **Vanilla frontend** - Fast, no build step, easy to modify
4. **Node test runner** - No extra dependencies for testing

## API Design
RESTful endpoints with consistent patterns:
- GET /api/{resource} - List with query filters
- GET /api/{resource}/:id - Get single with related data
- POST /api/{resource} - Create with validation
- PUT /api/{resource}/:id - Update with partial data
- DELETE /api/{resource}/:id - Hard delete (cascades)

## Data Relationships
```
contacts ─┬─< interviews ──< prep_notes
          └─< outreach
```
- Contacts have many interviews and outreach records
- Interviews have many prep notes
- Deleting a contact cascades to all related data

## Current State
MVP complete with:
- Full CRUD for all entities
- Dashboard with pipeline and stats
- Keyboard shortcuts
- Input validation
- 62 passing tests

## Future Considerations
- Authentication for multi-user
- LinkedIn integration for contact import
- Email template generation
- Reminder notifications
- Data export/import
