#!/bin/bash
# setup.sh — Kilo Workflow Framework installer
# Installs all tool configs and wrappers from ~/.config/kilo/tools/
# Run from your project directory to set up that project's workspace trust.
#
# Usage:
#   ~/.config/kilo/tools/setup.sh
#
# Options:
#   --skip-codewhale    Don't set up CodeWhale
#   --skip-ralph        Don't set up Ralph TUI
#   --skip-wrappers     Don't install wrapper scripts
#   --dry-run           Print what would be done, don't do it

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PWD}"
DRY_RUN=false
SKIP_CODEWHALE=false
SKIP_RALPH=false
SKIP_WRAPPERS=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --skip-codewhale) SKIP_CODEWHALE=true ;;
        --skip-ralph) SKIP_RALPH=true ;;
        --skip-wrappers) SKIP_WRAPPERS=true ;;
    esac
done

BIN_DIR="${HOME}/.local/bin"
CONFIG_KILO="${HOME}/.config/kilo"
CONFIG_CODEWHALE="${HOME}/.config/codewhale"
CONFIG_RALPH="${HOME}/.config/ralph-tui"

# ── Helpers ──────────────────────────────────────────────────────────────────

link_or_copy() {
    local src="$1" dst="$2"
    if $DRY_RUN; then
        echo "  [DRY-RUN] Would link: $src → $dst"
        return
    fi
    mkdir -p "$(dirname "$dst")"
    if [ -L "$dst" ] || [ -f "$dst" ]; then
        echo "  Exists, backing up: $dst → $dst.bak"
        mv "$dst" "$dst.bak" 2>/dev/null || true
    fi
    cp "$src" "$dst"
    echo "  Installed: $dst"
}

ensure_dir() {
    local dir="$1"
    if $DRY_RUN; then return; fi
    mkdir -p "$dir"
}

header() {
    echo ""
    echo "── $1 ──"
    echo ""
}

# ── Prerequisites ────────────────────────────────────────────────────────────

header "Checking prerequisites"

check_cmd() {
    local name="$1" hint="$2"
    if command -v "$name" &>/dev/null; then
        echo "  ✓ $name ($(command -v "$name"))"
    else
        echo "  ✗ $name not found — $hint"
    fi
}

check_cmd "kilo" "npm install -g @anthropic-ai/kilo"
check_cmd "git" "install git"

# ── CodeWhale ────────────────────────────────────────────────────────────────

if ! $SKIP_CODEWHALE; then
header "CodeWhale"

check_cmd "codewhale" "npm install -g codewhale"

ensure_dir "$CONFIG_CODEWHALE"

# Review prompt template
link_or_copy \
    "$SCRIPT_DIR/codewhale/review-prompt.md" \
    "$CONFIG_CODEWHALE/review-prompt.md"

# Provider configuration
echo ""
echo "  Configuring CodeWhale provider..."
echo "  (You will be prompted for your DeepSeek API key)"

if ! $DRY_RUN; then
    if ! codewhale config list 2>/dev/null | grep -q "provider = deepseek"; then
        codewhale login deepseek 2>/dev/null || \
            echo "  NOTE: Run 'codewhale login deepseek' manually to configure your API key"
    fi
    codewhale config set default_text_model deepseek-v4-pro 2>/dev/null || true
    echo "  ✓ Provider: deepseek, Model: deepseek-v4-pro"
fi

echo "  Trust this project workspace:"
echo "    codewhale config set projects.\"$PROJECT_ROOT\".trust_level trusted"
fi

# ── Ralph TUI ────────────────────────────────────────────────────────────────

if ! $SKIP_RALPH; then
header "Ralph TUI"

check_cmd "bun" "curl -fsSL https://bun.sh/install | bash"
check_cmd "ralph-tui" "npm install -g ralph-tui"

ensure_dir "$CONFIG_RALPH/plugins/agents"
ensure_dir "$CONFIG_RALPH/templates"

# Main config
link_or_copy \
    "$SCRIPT_DIR/ralph-tui/config.toml" \
    "$CONFIG_RALPH/config.toml"

# Kilo agent plugin (ESM module for Ralph TUI)
link_or_copy \
    "$SCRIPT_DIR/ralph-tui/plugins/agents/kilo.js" \
    "$CONFIG_RALPH/plugins/agents/kilo.js"

# Templates
for tmpl in "$SCRIPT_DIR/ralph-tui/templates/"*.hbs; do
    [ -f "$tmpl" ] || continue
    link_or_copy "$tmpl" "$CONFIG_RALPH/templates/$(basename "$tmpl")"
done

# Verify
if ! $DRY_RUN; then
    echo ""
    export PATH="${HOME}/.bun/bin:${HOME}/.local/bin:${PATH}"
    if ralph-tui plugins agents 2>/dev/null | grep -q "kilo (user)"; then
        echo "  ✓ Ralph TUI detects Kilo plugin"
    else
        echo "  ⚠ Ralph TUI plugin detection issue — run 'ralph-tui doctor' to diagnose"
    fi
fi
fi

# ── Shell Wrappers ───────────────────────────────────────────────────────────

if ! $SKIP_WRAPPERS; then
header "Shell Wrappers"
ensure_dir "$BIN_DIR"

link_or_copy "$SCRIPT_DIR/wrappers/cw-review"   "$BIN_DIR/cw-review"
link_or_copy "$SCRIPT_DIR/wrappers/kilo-ralph"  "$BIN_DIR/kilo-ralph"
link_or_copy "$SCRIPT_DIR/wrappers/kilo-prd"    "$BIN_DIR/kilo-prd"

chmod +x "$BIN_DIR/cw-review" "$BIN_DIR/kilo-ralph" "$BIN_DIR/kilo-prd" 2>/dev/null || true

echo ""
echo "  Ensure $BIN_DIR is in your PATH:"
echo "    export PATH=\"$BIN_DIR:\$PATH\""
echo "  (Add this line to ~/.bashrc or ~/.zshrc)"
fi

# ── Kilo Agent Config ────────────────────────────────────────────────────────

header "Kilo Agents"

ensure_dir "$CONFIG_KILO"

echo "  Agent configs are in: $SCRIPT_DIR/kilo/kilo-agents.json"
echo ""
echo "  To install, merge the 'agent' section into your ~/.config/kilo/kilo.json:"
echo ""
echo "  Option A (manual): Copy the 'architect' and 'code-reviewer' entries"
echo "                     from ~/.config/kilo/tools/kilo/kilo-agents.json"
echo "                     into ~/.config/kilo/kilo.json under 'agent'"
echo ""
echo "  Option B (scripted): python3 ~/.config/kilo/tools/merge-agents.py"

# Create merge helper if it doesn't exist
if [ ! -f "$SCRIPT_DIR/merge-agents.py" ]; then
    cat > "$SCRIPT_DIR/merge-agents.py" << 'PYEOF'
#!/usr/bin/env python3
"""Merge Kilo agent configs from kilo-agents.json into ~/.config/kilo/kilo.json"""
import json, sys, os

agents_file = os.path.join(os.path.dirname(__file__), "kilo", "kilo-agents.json")
kilo_config = os.path.expanduser("~/.config/kilo/kilo.json")

with open(agents_file) as f:
    agents_data = json.load(f)

if not os.path.exists(kilo_config):
    print(f"Creating {kilo_config} from agent template")
    with open(kilo_config, "w") as f:
        json.dump(agents_data, f, indent=2)
    sys.exit(0)

with open(kilo_config) as f:
    kilo_data = json.load(f)

if "agent" not in kilo_data:
    kilo_data["agent"] = {}

merged = agents_data.get("agent", {})
for name, config in merged.items():
    if name in kilo_data["agent"]:
        print(f"WARNING: Agent '{name}' already exists. Overwrite? [y/N] ", end="")
        resp = input().strip().lower()
        if resp != "y":
            print(f"  Skipping '{name}'")
            continue
    kilo_data["agent"][name] = config
    print(f"  Added agent: {name}")

with open(kilo_config, "w") as f:
    json.dump(kilo_data, f, indent=2, ensure_ascii=False)

print(f"Done. {kilo_config} updated with {len(merged)} agent(s).")
PYEOF
    chmod +x "$SCRIPT_DIR/merge-agents.py"
    echo "  Created merge helper: ~/.config/kilo/tools/merge-agents.py"
fi

# ── Verification ─────────────────────────────────────────────────────────────

header "Verification Summary"

echo "Run these to verify the setup:"
echo ""
echo "  kilo --version"
echo "  kilo agent list | grep -E 'architect|code-reviewer'"
echo "  codewhale --version"
echo "  codewhale config list"
echo "  ls ~/.config/codewhale/review-prompt.md"
echo "  which cw-review"
echo "  ralph-tui doctor       (if Ralph TUI installed)"

echo ""
echo "── Done ──"
