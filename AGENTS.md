# AGENTS.md - Reachout Project Constitution

## Project Overview

Reachout is **Networking and informational interview tracker for job seekers.**.

**Vision:** Help job seekers build meaningful professional connections through organized outreach, interview tracking, and relationship management.

## Build Phases

| Phase | Timeline | Focus |
|-------|----------|-------|
| **MVP** | 0-4 weeks | Contact management, interview pipeline, and basic prep notes |
| **V1.5** | 4-10 weeks | LinkedIn integration, email templates, analytics dashboard |
| **V2** | 10+ weeks | Multi-environment hardening and operational maturity |

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `node api-server.js` | Start dev server |
| `No build step (runtime Node app)` | Production build |
| `npm test` | Run tests |
| `npx eslint .` | Lint and auto-fix |

Clean clone: `npm install` then `npm test`. Native `better-sqlite3` must install for the current Node (see `package.json`); API tests spawn the server via `tests/helpers/start-api-server.js`. Node 20 remains supported and may compile that binding from source (`better-sqlite3@12.11.1` has no Node 20 prebuild).

## Tech Stack

- **Framework:** Node.js API + Static Frontend
- **Language:** JavaScript
- **Database:** SQLite
- **Contact pipeline, interview scheduling, prep notes, follow-up tracking**

## Project Structure

```
reachout/
├── src/           # Source code
├── public/       # Reusable components
├── lib/              # Utilities and libraries
├── ./           # API routes and server logic
└── tests/            # Test files
```

## Two Parallel Systems

| System | Location | Purpose |
|--------|----------|---------|
| **Playbooks** | `docs/playbooks/` | Human-facing prompts for driving AI sessions |
| **.ai** | `.ai/` | AI-facing context and standards for autonomous operation |

Use **playbooks** when you want to guide an AI through a specific workflow step-by-step.
Use **.ai** when you want AI to operate autonomously with full context.

## Agent System

| Task Type | Agent | File |
|-----------|-------|------|
| Build anything technical | Builder | `.ai/agents/builder.md` |
| Keep it running | Operator | `.ai/agents/operator.md` |
| Talk to humans | Communicator | `.ai/agents/communicator.md` |
| Decide what to build | Strategist | `.ai/agents/strategist.md` |

## Standards

- JavaScript: `.ai/standards/code/javascript.md`
- Node.js API + Static Frontend: `.ai/standards/code/nodejs.md`
- Testing: `.ai/standards/code/testing.md`
- API: `.ai/standards/api/design.md`
- Security: `.ai/standards/security/baseline.md`
- Voice: `.ai/standards/comms/voice.md`

## Workflows

- Ship Feature: `.ai/workflows/ship-feature.md`
- Investigate Bug: `.ai/workflows/investigate-bug.md`
- Customer Feedback: `.ai/workflows/customer-feedback.md`
- Weekly Ops: `.ai/workflows/weekly-ops.md`

## Contexts

- Product: `.ai/contexts/product-context.md`
- Priorities: `.ai/contexts/current-priorities.md`
- Optional project-specific context: `.ai/contexts/reachout.md`

## Templates

- PR Description: `.ai/templates/pr-description.md`
- Changelog Entry: `.ai/templates/changelog-entry.md`
- Customer Response: `.ai/templates/customer-response.md`
- Weekly Update: `.ai/templates/weekly-update.md`

## Core Rules

### Always

- Use JavaScript strict mode
- Write tests for business logic
- Run `npx eslint .` before committing
- Add documentation to exported functions
- Keep docs, specs, and context files aligned with shipped code

### Ask First

- Adding new dependencies
- Modifying database schema
- Changing authentication flow
- Major architectural changes
- Changes to production credentials, billing, or automation schedules

### Never

- Commit API keys or secrets
- Disable type checking
- Skip error handling
- Never bypass auth, rate limits, or audit logging controls

## Escalation (All Agents)

- Work estimate > 1 day
- Breaking change to API or database
- Security severity > Medium
- Confidence is low

See `.ai/decision-boundaries.md` for full authority matrix.

## Domain Concepts

- Contact/person tracking\n- Informational interview pipeline (requested → scheduled → completed → follow-up)\n- Interview preparation notes\n- Relationship strength scoring\n- Insights and learnings capture

## Specs

- **MVP:** `specs/reachout-core.md`

## Project Overrides

- Pre-merge AGENTS (if present):
- `docs/project-overrides/AGENTS.premerge.md`
- Project-specific context source: `.ai/contexts/reachout.md`
- Existing repository docs remain authoritative for business/domain details.
