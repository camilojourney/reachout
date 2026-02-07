# GitHub Copilot Instructions

## Agent System

Load from `.ai/agents/`:
- Feature work: `@.ai/agents/builder.md`
- Deployment: `@.ai/agents/operator.md`
- Documentation: `@.ai/agents/communicator.md`
- Prioritization: `@.ai/agents/strategist.md`

## Standards

Apply these to all code:
- JavaScript: `@.ai/standards/code/javascript.md`
- Node.js API + Static Frontend: `@.ai/standards/code/nodejs.md`
- Testing: `@.ai/standards/code/testing.md`
- API Design: `@.ai/standards/api/design.md`
- Security: `@.ai/standards/security/baseline.md`

## Core Rules

### Always
- Keep docs, specs, and context files aligned with shipped code

### Ask First
- Changes to production credentials, billing, or automation schedules

### Never
- Never bypass auth, rate limits, or audit logging controls

## Commands

- Install: `npm install`
- Dev: `node api-server.js`
- Test: `npm test`
- Build: `No build step (runtime Node app)`
- Lint: `npx eslint .`

## More Context

See `AGENTS.md` for full agent definitions and `CLAUDE.md` for quick reference.
