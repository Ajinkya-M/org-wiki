# Claude Project Instructions

Follow `AGENTS.md` as the primary collaboration contract for this repository.

Before making any changes, read:

1. `RAG_SYSTEM_DESIGN.md`
2. `PHASE1_MVP_PLAN.md`
3. `AI_CONTEXT/PROJECT_STATE.md`
4. `AI_CONTEXT/TASK_BOARD.md`
5. `AI_CONTEXT/DECISIONS.md`

Treat `AI_CONTEXT/` as required shared memory, not optional notes.

## Development Environment

This project is developed on **WSL2 (Windows Subsystem for Linux 2)** running **Ubuntu** on a Windows host.

| | Path |
|---|---|
| **Windows** | `D:\Ajinkya\workspace\AI\org-wiki` |
| **WSL2** | `/mnt/d/Ajinkya/workspace/AI/org-wiki` |

All shell commands, paths, and tooling instructions must target the WSL2/Ubuntu environment:

- **Working directory:** all relative paths assume the developer is `cd`'d into `/mnt/d/Ajinkya/workspace/AI/org-wiki`. Never use `~/` or paths outside this root.
- Use Linux paths — never Windows paths (`C:\...` or `D:\...`)
- Package installation: use `apt` / `apt-get` for system packages, `pip` for Python (always with `--break-system-packages` — no virtualenv), `npm` / `npx` for Node
- Python: use `python3` and `pip3`. No virtualenv — install packages system-wide with `pip install --break-system-packages <package>`.
- Shell: bash (default Ubuntu shell)
- Never output PowerShell, CMD, or Windows-specific commands
- If a tool requires a native dependency (e.g. `poppler` for PDF parsing), provide the `apt` install command

Example correct commands:
```bash
cd /mnt/d/Ajinkya/workspace/AI/org-wiki
sudo apt-get install -y poppler-utils
pip install --break-system-packages fastapi uvicorn
mkdir playground          # created at /mnt/d/Ajinkya/workspace/AI/org-wiki/playground
```

