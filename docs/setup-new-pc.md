# New PC Setup Guide

One-command setup to reproduce the full Kilo + CodeWhale + Ralph TUI workflow.

## Quick Start

```bash
git clone <this-kilo-config-repo> ~/.config/kilo
cd ~/.config/kilo
git pull

# Then, for each project:
cd /path/to/your-project
~/.config/kilo/tools/setup.sh
```

## What setup.sh does

| Tool | What it installs | Destination |
|---|---|---|
| CodeWhale | `review-prompt.md` | `~/.config/codewhale/` |
| CodeWhale | Provider config (deepseek, deepseek-v4-pro) | CodeWhale internal config |
| Ralph TUI | `config.toml` (agent registration) | `~/.config/ralph-tui/` |
| Ralph TUI | `kilo.js` agent plugin | `~/.config/ralph-tui/plugins/agents/` |
| Ralph TUI | Template files (.hbs) | `~/.config/ralph-tui/templates/` |
| Ralph TUI | `project-config.toml` template | Copy to `.ralph-tui/config.toml` in your project |
| Wrappers | `cw-review` | `~/.local/bin/` |
| Wrappers | `kilo-ralph` (arg adapter) | `~/.local/bin/` |
| Wrappers | `kilo-prd` (PRD generator) | `~/.local/bin/` |
| Kilo | Agent configs (architect, code-reviewer) | Merged into `~/.config/kilo/kilo.json` |

## Manual Setup (without setup.sh)

### CodeWhale

```bash
mkdir -p ~/.config/codewhale
cp ~/.config/kilo/tools/codewhale/review-prompt.md ~/.config/codewhale/
codewhale login deepseek
codewhale config set default_text_model deepseek-v4-pro
codewhale config set projects."$(pwd)".trust_level trusted
```

### Ralph TUI

```bash
mkdir -p ~/.config/ralph-tui/plugins/agents ~/.config/ralph-tui/templates
cp ~/.config/kilo/tools/ralph-tui/config.toml ~/.config/ralph-tui/
cp ~/.config/kilo/tools/ralph-tui/plugins/agents/kilo.js ~/.config/ralph-tui/plugins/agents/
cp ~/.config/kilo/tools/ralph-tui/templates/*.hbs ~/.config/ralph-tui/templates/
cp ~/.config/kilo/tools/ralph-tui/project-config.toml .ralph-tui/config.toml
```

### Wrappers

```bash
mkdir -p ~/.local/bin
cp ~/.config/kilo/tools/wrappers/* ~/.local/bin/
chmod +x ~/.local/bin/cw-review ~/.local/bin/kilo-ralph ~/.local/bin/kilo-prd
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

### Kilo Agents

```bash
python3 ~/.config/kilo/tools/merge-agents.py
# Or manually: merge 'agent' section from ~/.config/kilo/tools/kilo/kilo-agents.json
# into ~/.config/kilo/kilo.json
```

## Verification

```bash
kilo --version
kilo agent list | grep -E "architect|code-reviewer"
codewhale --version
codewhale config list
ls ~/.config/codewhale/review-prompt.md
which cw-review kilo-ralph
ralph-tui doctor
```

## Directory Map After Setup

```
~/.config/kilo/
├── kilo.json              ← Your main config (agents merged here)
├── instructions/           ← Global instructions (cybersecurity, etc.)
├── commands/               ← Slash commands
└── tools/                  ← Source of truth for ALL external tool configs
    ├── setup.sh            ← One-command installer
    ├── merge-agents.py     ← Kilo agent config merger
    ├── codewhale/          ← CodeWhale configs
    ├── ralph-tui/          ← Ralph TUI configs
    ├── wrappers/           ← Shell wrappers
    └── kilo/               ← Kilo agent configs

~/.config/
├── codewhale/
│   └── review-prompt.md    ← Review methodology template
└── ralph-tui/
    ├── config.toml          ← Agent registration (Kilo plugin)
    ├── plugins/agents/
    │   └── kilo.js          ← Kilo agent plugin for Ralph TUI
    └── templates/           ← PRD output templates

~/.local/bin/
├── cw-review                ← CodeWhale review launcher
├── kilo-ralph               ← Arg adapter (Ralph → Kilo)
└── kilo-prd                 ← PRD generator

<project>/
├── .kilo/
│   ├── docs/                ← Project-specific workflow docs
│   └── plans/               ← Architect outputs (spec.md, prd.json)
└── .ralph-tui/
    └── config.toml          ← Project-level Ralph TUI settings
```

## What to Commit

- `~/.config/kilo/` — the kilo config repo (commit everything including `tools/`)
- `<project>/.kilo/docs/` and `<project>/.kilo/plans/` — project-specific docs
- `<project>/.ralph-tui/config.toml` — project-level Ralph settings

No secrets in any of these paths. API keys are configured separately via `codewhale login`.
