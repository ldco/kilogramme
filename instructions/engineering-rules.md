# Engineering Rules (Global — applies to all projects)

## Git
- Default branch is ALWAYS `master` — never `main`. Do not suggest renaming or use `main` in commands or examples.
- **NEVER push.** Commit only. Pushing requires an explicit user request. Never suggest pushing, never push automatically.

## Code Quality
- Never emit placeholders, `// TODO`, or truncated code blocks. All generated code must be complete and syntactically valid.
- Prefer lightweight, single-responsibility structures. Do not over-engineer.
- No unnecessary comments. Code should be self-documenting.

## Communication & Output
- Be direct and concise. Use bullet points and tables, not walls of text.
- Present architectures in plain Markdown. No complex formatting or diagrams unless explicitly requested.
- One-word or single-sentence answers when that suffices. No preamble or postamble.

## Tool Discipline
- Use the most direct tool for the job. Do not chain tools when one suffices.
- Batch independent tool calls in parallel.
- Do not ask for confirmation on obvious next steps.
- Do not run builds or production commands unless explicitly asked.

## Integrity
- Be anti-sycophantic — do not fold arguments just because the user pushes back. Prioritize correctness over agreement.
- Persist through failures — fix problems until they are resolved. Search the web or read docs before giving up.
- State success criteria before starting work — what "done" means and how to verify it.

## Security (CRITICAL)
- **NEVER commit API keys, tokens, passwords, or secrets.** Always use environment variables or `.env` files (gitignored).
- Before any commit, explicitly check staged files for secrets: API keys (`sk-`, `pa-`, `ghp_`, etc.), private keys, passwords.
- If a secret was ever committed (even in past history), it is COMPROMISED — notify the user immediately and recommend rotation.
- Config files with secrets (`kilo.json`, `.env`) MUST be in `.gitignore`. Provide `.example` templates with placeholders instead.
- When writing code that needs an API key, inject it via `process.env` or config read at runtime — never hardcode.
- A global pre-commit hook scans for secrets on every commit. If the hook blocks a commit, do NOT use `--no-verify` — fix the problem.

## Error Handling (TypeScript projects)
- `catch` clauses: always `catch (e: unknown)`, never bare `catch`.
- No `any` types — use `unknown`, proper interfaces, or generics.
- No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, or `!` non-null assertions.
- Discriminated unions with `type`/`status`/`kind` literal discriminators.

### NVIDIA GSP Firmware
- **On driver ≥610, NEVER disable GSP firmware (`NVreg_EnableGpuFirmware=0`)** — GSP handles VRAM preservation during suspend/resume. Without it, GPU memory corrupts on each wake cycle, producing irreversible visual artifacts on all displays.
- ArchWiki GSP warnings are for older drivers (≤525). Not applicable to 610+.

## Bash / System Scripts
- **Sudo in automation:** Every bare `sudo` call after credential timeout (5 min) counts as a failed PAM auth — even with `2>/dev/null`. After 5 failures pam_faillock locks the user out. In daemon/systemd scripts, check `sudo -n -v` first; skip privileged ops if no cache.
- GUI sudo prompts (`kdialog`, `zenity`, `SUDO_ASKPASS`) are fine for interactive use. Just don't let automated scripts retry them in a loop.
