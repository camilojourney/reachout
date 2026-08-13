# Reachout 🤝

**Networking & Informational Interview Tracker for Job Seekers**

Reachout helps you organize and track your professional networking efforts, from initial outreach to completed informational interviews and beyond.

## Features

- **Contact Management** - Track people you want to connect with, including their company, role, and how you know them
- **Interview Pipeline** - Kanban-style board showing interviews from requested → scheduled → completed
- **Prep Notes** - Capture questions to ask, research notes, and insights from conversations
- **Outreach Tracking** - Log all communication attempts and track response rates
- **Analytics Dashboard** - See your networking stats at a glance

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3458
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Contacts |
| `Ctrl+3` | Interviews |
| `Ctrl+4` | Outreach |
| `N` | New Contact |
| `I` | New Interview |
| `O` | New Outreach |
| `/` | Focus Search |
| `?` | Toggle Help |
| `Esc` | Close Modal |

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript + CSS
- **Testing**: Node.js built-in test runner

## Project Structure

```
reachout/
├── api-server.js      # Express API server
├── schema.sql         # Database schema
├── lib/
│   ├── db.js          # Database connection
│   └── validation.js  # Input validation
├── public/
│   └── index.html     # Frontend SPA
├── tests/
│   ├── api.test.js    # API integration tests
│   └── validation.test.js # Unit tests
└── scripts/
    └── init-db.js     # Database initialization
```

## API Endpoints

### Contacts
- `GET /api/contacts` - List all contacts (supports `?search=`, `?company=`, `?connection_type=`, `?limit=`, `?offset=`)
- `GET /api/contacts/:id` - Get contact details with interviews and outreach
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Interviews
- `GET /api/interviews` - List all interviews (supports `?status=`, `?contact_id=`, `?limit=`, `?offset=`)
- `GET /api/interviews/:id` - Get interview with prep notes
- `POST /api/interviews` - Create interview
- `PUT /api/interviews/:id` - Update interview
- `DELETE /api/interviews/:id` - Delete interview

### Prep Notes
- `GET /api/prep-notes` - List prep notes (supports `?interview_id=`, `?type=`, `?limit=`, `?offset=`)
- `GET /api/prep-notes/:id` - Get prep note
- `POST /api/prep-notes` - Create prep note
- `PUT /api/prep-notes/:id` - Update prep note
- `DELETE /api/prep-notes/:id` - Delete prep note

### Outreach
- `GET /api/outreach` - List outreach records (supports `?contact_id=`, `?type=`, `?limit=`, `?offset=`)
- `GET /api/outreach/:id` - Get outreach record
- `POST /api/outreach` - Create outreach record
- `PUT /api/outreach/:id` - Update outreach record
- `DELETE /api/outreach/:id` - Delete outreach record

### Dashboard
- `GET /api/pipeline` - Get interview pipeline (Kanban view)
- `GET /api/stats` - Get analytics and statistics
- `GET /api/health` - Health check

## Data Model

### Contacts
| Field | Type | Description |
|-------|------|-------------|
| name | string | Contact's name (required) |
| email | string | Email address |
| linkedin_url | string | LinkedIn profile URL |
| company | string | Company name |
| title | string | Job title |
| connection_type | enum | alumni, referral, cold, friend, colleague, other |
| relationship_strength | 1-5 | How well you know them |
| notes | string | Additional notes |

### Interviews
| Field | Type | Description |
|-------|------|-------------|
| contact_id | integer | Related contact |
| status | enum | requested, scheduled, completed, cancelled |
| scheduled_at | datetime | When the interview is scheduled |
| completed_at | datetime | When the interview was completed |
| location | enum | virtual, phone, coffee, office, other |
| notes | string | Interview notes |

### Prep Notes
| Field | Type | Description |
|-------|------|-------------|
| interview_id | integer | Related interview |
| type | enum | question, research, insight |
| content | string | The note content |

### Outreach
| Field | Type | Description |
|-------|------|-------------|
| contact_id | integer | Related contact |
| type | enum | initial, follow_up, thank_you |
| channel | enum | email, linkedin, phone, other |
| sent_at | datetime | When the outreach was sent |
| response_received | boolean | Whether they responded |
| response_at | datetime | When they responded |
| notes | string | Additional notes |

## Development

Requires Node.js 20 or later. `npm install` must complete successfully before tests (it installs `express` and the native `better-sqlite3` binding).

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix lint errors
npm run lint:fix

# Initialize database manually
npm run db:init
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3458 | Server port |
| `DB_PATH` | ./reachout.db | SQLite database path |

## License

MIT

## AI Framework Integration

This repository includes a merged AI workflow framework for consistent execution across tools.

- Universal entrypoint: `AGENTS.md`
- Quick runtime context: `CLAUDE.md`
- Framework architecture: `ARCHITECTURE.md`
- AI standards/workflows: `.ai/`
- Human playbooks: `docs/playbooks/`

Project-specific pre-merge docs are preserved in `docs/project-overrides/` when applicable.
