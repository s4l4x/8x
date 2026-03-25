# 8x — Intelligent Video Consumption at 8x Speed

## Context

The problem: watching videos at >2x is useless because audio becomes unintelligible. But most video content is padded with filler, tangents, and repetition. **8x achieves faster consumption not through literal 8x playback, but through intelligent skipping, speed modulation, and text overlays** — so you consume the *information* at 8x speed while the video plays at comfortable 1x-2x.

By using **yt-dlp** to extract actual video/audio streams, we get full control: arbitrary playback rates, independent audio/video speed, Web Audio API for pitch correction and smooth fades, and direct canvas/DOM overlays with no iframe restrictions.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Vite + React + TypeScript** | SPA, no SSR needed. Fast dev. |
| Styling | **Tailwind CSS v4** | Rapid UI iteration, custom player components |
| State | **Zustand** | Lightweight, fits the playback state complexity |
| Animation | **Framer Motion** | Smooth overlay/tag/speed transitions |
| API Layer | **Cloudflare Workers** | Thin serverless functions for transcript + Claude API proxy |
| Media Server | **Local dev server** (Express) | Runs yt-dlp, serves video/audio streams. Production hosting TBD. |
| LLM | **Claude API** (`@anthropic-ai/sdk`) | Transcript analysis → segment map |
| Video Extraction | **yt-dlp** | Extract separate video + audio streams from YouTube |
| Validation | **Zod** | Validate LLM structured output |
| Monorepo | **pnpm workspaces** | Separate web + worker + media-server packages |

**Design direction: Playful, bold** — color accents, expressive animations, personality in the UI.

## Project Structure

```
8x/
├── package.json                     # Workspace root
├── pnpm-workspace.yaml
├── .env.example                     # ANTHROPIC_API_KEY
├── packages/
│   ├── web/                         # Frontend SPA
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── Player/
│   │       │   │   ├── Player.tsx           # Orchestrator — holds video, audio, overlays
│   │       │   │   ├── VideoElement.tsx     # HTML5 <video> with direct stream
│   │       │   │   ├── OverlayLayer.tsx     # Text/graphic overlays directly on video
│   │       │   │   └── AudioController.tsx  # Web Audio API: fade, pitch, independent speed
│   │       │   ├── Timeline/
│   │       │   │   ├── Timeline.tsx         # Full timeline bar
│   │       │   │   └── ImportanceMap.tsx    # Color-coded importance segments
│   │       │   ├── Tags/
│   │       │   │   ├── TagCloud.tsx         # Floating tangential topic tags
│   │       │   │   └── TagExpansion.tsx     # Expanded tag detail view
│   │       │   ├── Controls/
│   │       │   │   ├── PlaybackControls.tsx # Play/pause, speed, mode
│   │       │   │   └── SpeedDial.tsx        # Visual speed indicator + manual override
│   │       │   └── Input/
│   │       │       └── URLInput.tsx         # YouTube URL entry
│   │       ├── hooks/
│   │       │   ├── useVideoPlayer.ts        # HTML5 video element control
│   │       │   ├── usePlaybackEngine.ts     # Core brain: drives speed/skip/overlay
│   │       │   ├── useWebAudio.ts           # Web Audio API: pitch correction, fades
│   │       │   └── useSegmentNavigation.ts  # Smart skip/seek logic
│   │       ├── stores/
│   │       │   ├── videoStore.ts            # Video metadata + analysis state
│   │       │   └── playbackStore.ts         # Playback state (position, speed, mode)
│   │       └── lib/
│   │           ├── api.ts                   # API client (CF Worker + media server)
│   │           ├── segmentEngine.ts         # Compute playback strategies from analysis
│   │           ├── overlayEngine.ts         # Overlay timing + content scheduling
│   │           └── types.ts                 # Core TypeScript types
│   │
│   ├── worker/                      # Cloudflare Worker (thin API)
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                    # Worker entry: routes
│   │       ├── transcript.ts               # Fetch YouTube transcript
│   │       ├── analyze.ts                  # Claude API analysis proxy
│   │       └── prompts.ts                  # LLM prompt templates
│   │
│   └── media-server/                # Local dev server for yt-dlp
│       ├── package.json
│       └── src/
│           ├── index.ts                    # Express server
│           ├── extract.ts                  # yt-dlp wrapper: extract video + audio
│           └── cache.ts                    # Cache extracted streams by video ID
```

## Core Data Model

```typescript
interface VideoAnalysis {
  videoId: string;
  title: string;
  totalDuration: number;
  segments: Segment[];
  tangentialTopics: TangentialTopic[];
  estimatedSmartDuration: number;
}

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'key' | 'context' | 'filler' | 'tangential';
  importance: number;                // 0.0–1.0
  summary: string;                   // overlay text
  playbackStrategy: PlaybackStrategy;
}

interface PlaybackStrategy {
  action: 'play' | 'speed' | 'skip';
  speed?: number;                    // arbitrary — no longer limited to 2x
  videoSpeed?: number;               // independent video rate
  audioSpeed?: number;               // independent audio rate
  showOverlay?: boolean;
  audioFade?: number;                // 0.0 (muted) – 1.0 (full)
  pitchCorrect?: boolean;            // keep pitch natural at higher speeds
}

interface TangentialTopic {
  id: string;
  label: string;
  segmentIds: string[];
  summary: string;
  expandedContent: string;
}
```

## How "8x" Actually Works

Non-linear playback — the speed is **always changing** based on content importance:

- **Key content** (importance 0.8–1.0): play at 1x, full audio, maybe even slow down + reinforce
- **Context** (0.5–0.8): speed to 1.5–2x, audio fading slightly, pitch-corrected
- **Filler** (0.1–0.5): speed to 3–4x with muted audio, overlay summary text visible
- **Tangential** (tagged): skip entirely, show as clickable floating tag
- **Transitions**: smooth acceleration/deceleration between speeds using Web Audio API

For a 20-minute video:
- 4 min key → play at 1x = **4 min**
- 5 min context → play at 1.75x = **2.9 min**
- 6 min filler → play at 4x with overlay = **1.5 min** (or skip entirely)
- 5 min tangential → collapsed to tags = **0 min**
- **Total: ~8.4 min** — with full comprehension of what matters

## Data Flow

1. **User pastes YouTube URL** → extract video ID
2. **Media server runs yt-dlp** → extracts separate video + audio streams, caches locally
3. **CF Worker fetches transcript** → timestamped captions
4. **CF Worker sends transcript to Claude** → segment classification, importance scores, summaries, tangential topics (structured JSON via Zod)
5. **Frontend loads streams + analysis** → `segmentEngine` computes per-segment playback strategies
6. **Playback engine** listens to `<video>` `timeupdate` events, applies strategies in real-time:
   - Set `video.playbackRate` for video speed (arbitrary values, smooth ramping)
   - Web Audio API `AudioBufferSourceNode.playbackRate` for independent audio speed + pitch correction
   - Overlay show/hide with Framer Motion transitions
   - Seek past skipped sections with summary flash
7. **User interacts**: clicks timeline segments, expands tangential tags, overrides speed manually

## Key Architecture: Web Audio API Pipeline

With actual audio streams (not YouTube iframe), we build a real audio processing chain:

```
Audio Stream → MediaElementSource → GainNode (fade) → PlaybackRate → AudioContext.destination
                                                    ↘ AnalyserNode (for visualizations)
```

- **GainNode**: smooth volume fades (0→1 over configurable duration)
- **PlaybackRate**: independent of video speed, with pitch preservation via `preservesPitch`
- **AnalyserNode**: optional — powers audio visualizations in the timeline or overlay

## Implementation Phases

### Phase 1: Project Scaffolding
- pnpm workspace with `web` + `worker` + `media-server` packages
- Vite + React + TypeScript + Tailwind + Framer Motion
- URL input component
- Media server: Express + yt-dlp wrapper → extract and serve video/audio for a given YouTube URL
- Basic HTML5 `<video>` + `<audio>` playing extracted streams

### Phase 2: Analysis Pipeline
- CF Worker: transcript fetching
- CF Worker: Claude API analysis with structured prompt + Zod validation
- Frontend: loading state while analysis runs (video plays normally meanwhile)
- `VideoAnalysis` stored in Zustand

### Phase 3: Smart Playback Engine
- `segmentEngine.ts` — compute strategies from analysis
- `usePlaybackEngine.ts` — `timeupdate`-driven loop applying speed/skip/overlay per segment
- `useWebAudio.ts` — Web Audio API pipeline: independent audio speed, pitch correction, smooth gain fades
- Smooth speed ramping: interpolate `playbackRate` over ~300ms via `requestAnimationFrame`
- Skip mechanic: seek past filler, flash summary overlay

### Phase 4: Timeline & Overlays
- `ImportanceMap` — color-coded timeline (bold palette: hot pink for key, electric blue for tangential, etc.)
- Click-to-seek on segments
- `OverlayLayer` — summary text, key-point reinforcement, skip indicators
- Playful transition animations (Framer Motion)

### Phase 5: Tangential Tags
- Floating `TagCloud` with bold, colorful tag pills
- Click to expand with summary + "play this" button
- Tags animate in/out as tangential content is detected

## Key Technical Decisions

1. **yt-dlp for stream extraction** — gives us full HTML5 video/audio control, arbitrary speeds, Web Audio API access. Runs locally for MVP, production hosting TBD.
2. **Separate video + audio streams** — enables independent speed control. Video can fast-forward while audio plays at a different rate or is muted.
3. **Web Audio API for audio processing** — real pitch correction via `preservesPitch`, smooth gain fades, potential for audio visualization.
4. **CF Workers for lightweight API** — transcript fetch + Claude proxy. No binary execution needed for these.
5. **`timeupdate` events (not polling)** — HTML5 video fires native events, more reliable than YouTube iframe polling. Supplement with `requestAnimationFrame` for smooth transitions.
6. **Cache everything** — media server caches extracted streams by video ID, CF Worker caches analyses. Re-watching is instant.
7. **Claude Sonnet for analysis** — fast + cheap for transcript analysis at MVP scale.

## Verification

1. `pnpm dev` starts web, worker (miniflare), and media-server
2. Paste a YouTube URL → media server extracts streams, video plays in browser
3. Analysis completes → timeline shows bold color-coded importance map
4. Smart playback: video smoothly accelerates through context/filler, skips tangential, plays key content at 1x
5. Audio fades and pitch-corrects as speed changes
6. Overlays appear with summaries during fast/skipped sections
7. Tangential tags float, expand on click
8. Timeline click-to-seek works
9. Speed indicator shows current effective speed + estimated time saved
