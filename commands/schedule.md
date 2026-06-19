---
description: Schedule a recurring task using cron — PR reviews, dependency audits, daily standups
---

# /schedule — Recurring Tasks

Set up tasks that run on a schedule via the `kilo-schedule` wrapper.

## Usage

```
/schedule add "0 9 * * 1" "Review last week's PRs for security issues"
/schedule add "0 8 * * 1-5" "Run tests and report failures"
/schedule list
/schedule remove <id>
/schedule logs <id>
```

## Cron Format

Standard cron: minute hour day month weekday
- `0 9 * * 1` — every Monday at 9 AM
- `0 */4 * * *` — every 4 hours
- `30 8 * * 1-5` — weekdays at 8:30 AM
