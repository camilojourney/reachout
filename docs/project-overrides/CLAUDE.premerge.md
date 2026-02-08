# Reachout

Networking and informational interview tracker for job seekers.

## The Vision

Help job seekers build meaningful professional connections through organized outreach, interview tracking, and relationship management.

## Commands

- Dev: `node api-server.js`
- Test: `npm test`
- Lint: `npx eslint .`
- Build: `No build step (runtime Node app)`

## Structure

- Pages: `public/`
- Components: `public/`
- Lib: `lib/`
- Server: `./`
- Tests: `tests/`

## Agents

Load from `.ai/agents/`:

- builder.md (features, bugs, tests, review)
- operator.md (deploy, security, infrastructure)
- communicator.md (docs, UI, support)
- strategist.md (prioritization, feedback, growth)

## Standards

- `.ai/standards/code/` (JavaScript, Node.js API + Static Frontend, testing)
- `.ai/standards/api/design.md`
- `.ai/standards/security/baseline.md`
- `.ai/standards/comms/voice.md`

## Critical Rules

- Track all outreach attempts with timestamps\n- Never lose interview notes\n- Maintain relationship context across interactions

## Key Files

- `api-server.js`\n- `schema.sql`\n- `public/index.html`

## Database Tables

- `contacts` (people to reach out to)\n- `interviews` (scheduled/completed conversations)\n- `notes` (prep questions, insights, follow-ups)\n- `outreach` (messages sent, response status)

## External Services

- LinkedIn (future)\n- Fruco Activities API for logging

## Current Focus

See `.ai/contexts/current-priorities.md`

## Two Parallel Systems

| System | Location | Purpose |
|--------|----------|---------|
| **Playbooks** | `docs/playbooks/` | Human-facing prompts for driving AI sessions |
| **.ai** | `.ai/` | AI-facing context and standards for autonomous operation |

Use **playbooks** when you want to guide an AI through a specific workflow step-by-step.
Use **.ai** when you want AI to operate autonomously with full context.

## Development Workflow

Phase-based playbook in `docs/playbooks/`:

1. `1-spec-create.md` - Write detailed specs from ideas
2. `2-spec-review.md` - QA specs before implementation
3. `3-implement.md` - Build from specs
4. `4-audit-logic.md` - Hostile bug hunting (be adversarial)
5. `5-audit-intent.md` - UX and intent verification
6. `6-fix-iterate.md` - Apply fixes with minimal changes

Usage: "Read docs/playbooks/4-audit-logic.md and audit the feature I just built"

## MCP Servers

Configured in `.mcp.json` - filesystem, memory, GitHub access.

## Project Overrides

- Pre-merge CLAUDE notes (if present):
- none
- Use repository READMEs and docs for feature-level constraints before implementation.
