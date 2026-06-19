# Sandbox Execution

When running potentially destructive or untrusted operations, use sandboxed execution.

## Sandbox Types (in priority order)

### 1. Permission Rules (built-in)
kilo.json already has permission rules for destructive commands. These are the first line of defense.

### 2. Read-Only Verification
Before running destructive commands:
- `--dry-run` flags where available
- Preview mode for file operations
- `ls` before `rm`, review before `mv`

### 3. Docker Sandbox
For compiling/running untrusted code:
```
docker run --rm -v $(pwd):/work -w /work node:22 npm test
docker run --rm -v $(pwd):/work -w /work python:3.12 pytest
```

### 4. Firejail (if installed)
For general command isolation:
```
firejail --seccomp --private-tmp <command>
```

## When to Sandbox

- Running untrusted code from dependencies (node_modules, vendor/)
- Executing user-uploaded files
- Running build commands in CI-like scenarios
- Testing compilation of unknown/binary packages
- Any command involving `eval`, `exec`, or dynamic code loading

## Environment Safety

- Never pipe secrets to sandbox containers
- Use read-only volume mounts when possible
- Set resource limits: `docker run --memory=512m --cpus=2`
