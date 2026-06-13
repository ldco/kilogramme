# Puppet Master MCP Server

MCP (Model Context Protocol) server providing 26 tools for Puppet Master framework operations — initialization, development, database, deployment, builds, linting, testing, configuration, knowledge retrieval, contribution workflows, and code reviews.

## Quick Start

```bash
git clone <repo-url> pm-mcp-server
cd pm-mcp-server
npm install
```

### Global Registration (Kilo)

Add to `~/.config/kilo/kilo.json`:

```json
{
  "mcp": {
    "puppetmaster": {
      "type": "local",
      "command": ["node", "/path/to/pm-mcp-server/dist/index.js"],
      "enabled": true
    }
  }
}
```

Or use `tsx` to run from source (enables dynamic TS config imports):

```json
"command": ["npx", "tsx", "/path/to/pm-mcp-server/src/index.ts"]
```

### Local Registration (Project)

Add to `.kilo/kilo.json` in a project:

```json
{
  "mcp": {
    "puppetmaster": {
      "type": "local",
      "command": ["node", "../pm-mcp-server/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Tools (26)

| Category | Tools |
|----------|-------|
| Config | `pm_config_get`, `pm_config_set` |
| Dev | `pm_init`, `pm_dev`, `pm_status` |
| Database | `pm_db_push`, `pm_db_seed`, `pm_db_reset`, `pm_db_migrate`, `pm_db_studio` |
| Deploy | `pm_deploy`, `pm_rollback`, `pm_deploy_logs`, `pm_setup` |
| Build/Quality | `pm_build`, `pm_lint`, `pm_test` |
| Knowledge | `pm_knowledge`, `pm_knowledge_entrypoint`, `pm_knowledge_contributing` |
| Contributing | `pm_contribute_list`, `pm_contribute_read`, `pm_contribute_export`, `pm_contribute_apply` |
| Review | `pm_review_checklist`, `pm_review_run` |

## How It Works

The server uses `process.cwd()` to detect the current PM project root (set automatically by the host agent). Each tool operates on the project in the current working directory. From a non-PM directory, tools report "no config found" gracefully.

## Build

```bash
npm run build    # TypeScript → dist/
```

Pre-built `dist/` is committed for users who want to run with `node` directly without `tsx`.

## License

MIT
