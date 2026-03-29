# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

8x is an intelligent video player that uses Claude to analyze YouTube transcripts and enable smart, non-linear playback (speed ramping, filler skipping, key-point highlighting).

## Commands

```bash
pnpm dev          # Run all packages concurrently
pnpm dev:web      # Vite dev server (localhost:5173)
pnpm dev:media    # Express media server with tsx watch (localhost:3001)
pnpm dev:worker   # Cloudflare Worker via wrangler
```

Web build: `cd packages/web && pnpm build` (runs tsc then vite build).

No test runner is configured yet.

## Architecture

pnpm monorepo with three packages, all ESM (`"type": "module"`), TypeScript strict mode, ES2022 target.

**@8x/web** — Vite 6 + React 19 SPA. Tailwind CSS v4, Framer Motion, Zustand for state. Proxies `/api/media` to the media server in dev (see `vite.config.ts`).

**@8x/media-server** — Express server. Spawns yt-dlp as a child process to extract video/audio streams and transcripts. Proxies transcript to Claude for analysis. Caches all results (media, transcripts, analysis JSON) in `packages/media-server/cache/`.

**@8x/worker** — Cloudflare Worker, alternative/lightweight API layer with Zod validation of Claude responses.

### Data flow

```
User pastes YouTube URL
  → extractMedia (yt-dlp: video + audio + metadata)
  → fetchTranscript (yt-dlp: subtitles → merged chunks)
  → analyzeVideo (Claude: classify segments as key/context/filler/tangential)
  → computeStrategies (map segment types to playback rules)
  → usePlaybackEngine (real-time: speed ramp, skip, overlay, volume via timeupdate)
```

Orchestrated by `videoStore.ts` (Zustand). Status progresses: idle → extracting → transcribing → analyzing → ready.

### Playback engine

`usePlaybackEngine` hook listens to HTML5 video `timeupdate` events and applies per-segment strategies in real-time: playback rate changes with smooth 300ms ramping, skip-ahead for filler, overlay display, and volume fading. Web Audio API handles pitch correction for sped-up audio independently from video playback rate.

### Segment types

Claude classifies transcript into segments, each with a type and importance score (0-1):
- **key** — core content, played at 1x
- **context** — supporting info, 1.5-2x speed
- **filler** — padding/sponsors/intros, 3x or skipped
- **tangential** — off-topic digressions, skipped (offered as optional)

## Caching

The media server caches everything in `packages/media-server/cache/` keyed by videoId:
- `{videoId}.mp4` / `.video.mp4` / `.audio.m4a` — extracted media
- `{videoId}.en.json3` — transcript
- `{videoId}.analysis.json` — Claude analysis result

Analysis caching avoids redundant Claude API calls during dev. On cache hit you'll see `Analysis cache hit for {videoId}` in server logs. To bust the analysis cache, delete the `.analysis.json` file or run `/clear-cache` to wipe everything.

## Environment

Requires `ANTHROPIC_API_KEY` in root `.env` (see `.env.example`). Media server loads it via dotenv from `../../../.env`.

## Testing

When adding or fixing user-facing behavior, add a corresponding check to the smoke test skill (`.claude/skills/smoke-test/SKILL.md`). Automated checks go in Phase 1, things requiring human judgment go in Phase 2's manual checklist.

## Conventions

- ESM imports with `.js` extensions in media-server/worker (Node ESM resolution)
- Tailwind v4 with custom `@theme` palette: `8x-pink`, `8x-cyan`, `8x-orange`, `8x-dark`, `8x-darker`
- Web package uses `@/*` path alias mapped to `src/`
- Claude model: `claude-sonnet-4-20250514` for analysis
