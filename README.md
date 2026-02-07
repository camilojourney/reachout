# AI Development Framework Template

Reusable template for AI-assisted software development.

## Quick Start

Copy this template to your new project:

```bash
cp -r /path/to/this/template /path/to/your-new-project/
cd /path/to/your-new-project/
```

Then customize `AGENTS.md` and `CLAUDE.md` with your project details.

## What's Included

- `AGENTS.md`, `CLAUDE.md` - Entry points for AI tools
- `.ai/` - Single source of truth for all AI rules and workflows
- `docs/playbooks/` - Guided development phases (1-6 + hotfix)
- Tool integration folders: `.claude/`, `.github/`, `.agent/`, `.codex/`
- Baseline CI workflow

## Core Principle

Define standards once in `.ai/`, reference them from tool-specific folders.

## Model Recommendations

See `docs/playbooks/README.md` for which AI model to use for each phase:
- **Claude Opus 4.5** for creative/divergent tasks (specs, UX review)
- **Codex GPT-5.2 xHigh** for precision/convergent tasks (implementation, audits, fixes)

## AI Framework Integration

This repository includes a merged AI workflow framework for consistent execution across tools.

- Universal entrypoint: `AGENTS.md`
- Quick runtime context: `CLAUDE.md`
- Framework architecture: `ARCHITECTURE.md`
- AI standards/workflows: `.ai/`
- Human playbooks: `docs/playbooks/`

Project-specific pre-merge docs are preserved in `docs/project-overrides/` when applicable.
