---
description: Browse, search, and edit project memory files
---

# /memory — Browse and Edit Project Memory

Manage the auto-memory system. Read past learnings, add new ones, or edit existing entries.

## Subcommands

### List
Show all memory entries for the current project:
```
/memory
```

### Read topic
Show a specific topic file:
```
/memory debugging
/memory api-conventions
```

### Add entry
Add a learning to memory:
```
/memory add "Build: npm run dev starts the server"
```

### Search
Search across all memory files:
```
/memory search auth
/memory search database
```

### Open directory
Open the memory directory to browse/edit files directly:
```
/memory open
```

## Implementation Notes

- Memory root: `~/.kilo/memory/<project-slug>/`
- Main file: `MEMORY.md` (loaded at session start, capped at 200 lines)
- Topic files: `<topic>.md` (loaded on demand)
- Project slug: derive from git remote (`git remote get-url origin`) or working directory name
