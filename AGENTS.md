# Agent Collaboration Contract

This repository is shared by multiple AI agents. `AI_CONTEXT/` is the coordination source of truth for project state, decisions, active work, and handoffs.

## Development Environment

**Runtime:** WSL2 (Windows Subsystem for Linux 2) — Ubuntu on a Windows host.

Every agent must follow these environment rules without exception:

- **Project root (Windows):** `D:\Ajinkya\workspace\AI\org-wiki`
- **Project root (WSL2):** `/mnt/d/Ajinkya/workspace/AI/org-wiki`
- **Working directory assumption:** all relative paths and `mkdir` commands assume the developer is `cd`'d into `/mnt/d/Ajinkya/workspace/AI/org-wiki`. Never use `~/` or paths outside the project root unless explicitly told to.
- **Paths:** always use Linux paths. Never emit Windows paths (`C:\`, `D:\`) in commands, scripts, or docs.
- **Shell:** bash. Do not generate PowerShell or CMD syntax.
- **System packages:** `sudo apt-get install -y <package>`
- **Python:** `python3` / `pip3`. No virtualenv — install directly into the system Python using `pip install --break-system-packages <package>`. Do not generate venv creation or activation commands.
- **Node:** `node` / `npm` / `npx` as available in the Ubuntu environment.
- **Native PDF dependencies:** `sudo apt-get install -y poppler-utils` (required by `unstructured[pdf]`).
- **Service management:** `systemctl` / `service` for any daemon-style services.
- **Environment variables:** stored in `.env` at the project root, loaded via `python-dotenv` or `pydantic-settings`. Never hardcode secrets.

If a step differs between WSL2/Ubuntu and other platforms, document the WSL2 variant first and mark alternatives explicitly.

## Required Read Order

Before making changes, every agent must read these files in order:

1. `plan/architecture/rag-system-design.md`
2. `plan/phase/phase1-mvp-plan.md`
3. `AI_CONTEXT/PROJECT_STATE.md`
4. `AI_CONTEXT/TASK_BOARD.md`
5. `AI_CONTEXT/DECISIONS.md`

Do not start implementation until you understand the current phase, known gaps, and any existing task claims.

## Required Workflow

1. Add or update your task claim in `AI_CONTEXT/TASK_BOARD.md` before editing code or docs.
2. Keep your changes scoped to the claimed task.
3. If you change architecture, scope, assumptions, interfaces, or priorities, update `AI_CONTEXT/PROJECT_STATE.md` and `AI_CONTEXT/DECISIONS.md` in the same change.
4. Append a concise entry to `AI_CONTEXT/CHANGELOG.md` after every meaningful work session.
5. When handing work off, use `AI_CONTEXT/HANDOFF_TEMPLATE.md` and place the completed note into `AI_CONTEXT/CHANGELOG.md` or `AI_CONTEXT/PROJECT_STATE.md`, whichever is more appropriate.

## Coordination Rules

- Do not overwrite another agent's in-progress work without first updating the task board to reflect the handoff or takeover.
- Prefer additive updates over silent rewrites so other agents can reconstruct intent.
- Record exact files touched, unresolved risks, and verification status.
- If code and docs diverge, update the docs in the same session.
- Use ISO dates (`YYYY-MM-DD`) and 24-hour timestamps with timezone when logging activity.
- Never commit secrets, API keys, or local machine paths that should remain private.

## Definition of Done for Any Change

A change is not complete until:

- the task status is updated in `AI_CONTEXT/TASK_BOARD.md`
- the latest context is reflected in `AI_CONTEXT/PROJECT_STATE.md` if needed
- a log entry is added to `AI_CONTEXT/CHANGELOG.md`
- known risks or follow-ups are explicitly called out

## If You Are Unsure

Default to leaving a clear note in `AI_CONTEXT/CHANGELOG.md` rather than making a silent assumption.

