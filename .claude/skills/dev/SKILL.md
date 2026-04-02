---
name: dev
description: Start the 8x dev servers. Use when the user says "start the servers", "run dev", "spin up the app", "start the app", or any variation of wanting to run the local development environment. Also use when the user invokes /dev.
---

# Dev Servers

Start the 8x local development environment.

## Pre-flight

Before starting servers, verify the root `.env` file exists and contains `ANTHROPIC_API_KEY`. If it's missing, warn the user — the media server won't be able to call Claude for video analysis without it.

## Starting servers

**Default (no args):** Start all servers concurrently from the repo root:

```bash
pnpm dev
```

This runs the web frontend (localhost:5173), media server (localhost:3001), and Cloudflare worker in parallel.

**With args:** Start only the specified server(s). Accepted values: `web`, `media`, `worker`. Multiple can be combined.

| Arg | Command | What it runs |
|-----|---------|-------------|
| `web` | `pnpm dev:web` | Vite dev server on :5173 |
| `media` | `pnpm dev:media` | Express media server on :3001 |
| `worker` | `pnpm dev:worker` | Cloudflare Worker via wrangler |

If one arg is given, run that single command. If multiple args are given (e.g., `/dev web media`), run them concurrently with `pnpm -r --parallel` filtered to those packages, or simply run them as parallel background processes.

## Important

Run the dev command(s) in the background so the conversation remains interactive — the user will want to keep working while servers are running. Use `run_in_background` for Bash calls.

After starting, confirm which servers were launched and on which ports.
