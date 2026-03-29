---
name: smoke-test
description: Run a smoke test of the 8x video player — automated browser checks + guided manual verification
---

# Smoke Test Skill

Run an end-to-end smoke test of the 8x video player. Uses Chrome automation for what's automatable and guides the user through manual checks.

## Prerequisites

Before running tests, verify the dev servers are running:
1. Check if `localhost:5173` (web) and `localhost:3001` (media server) are responding
2. If not, tell the user to run `pnpm dev` and wait for both servers

## Test Video

Use `dQw4w9WgXcQ` as the default test video (short, reliable, always available). If `$ARGUMENTS` contains a video ID, use that instead.

## Phase 1: Automated Checks (Chrome)

Use the chrome browser tools to automate these checks. Open `http://localhost:5173` in a new tab.

### 1.1 URL Input & Load Flow
- Find the URL input field and type the test video ID
- Click the submit button (or press Enter)
- Wait for the status to progress: extracting → transcribing → analyzing → ready
- **VERIFY**: Progress messages appear and update
- **VERIFY**: Video element becomes visible with a valid src
- **VERIFY**: No error messages displayed

### 1.2 Playback Controls Present
Once video is loaded, verify these elements exist:
- Play/pause button
- Scrubber/timeline bar with colored segments
- Volume control
- Fullscreen button
- Time display showing `0:00 / X:XX` format
- "8x" smart mode toggle button

### 1.3 Basic Playback
- Click play (or use JS to trigger play)
- Wait 2-3 seconds
- **VERIFY**: `currentTime` has advanced (video.currentTime > 0)
- **VERIFY**: Time display has updated from `0:00`
- Click pause
- **VERIFY**: Video is paused (video.paused === true)

### 1.4 Smart Mode Toggle
- Click the "8x" button to enable smart mode
- Use JS to read: `video.playbackRate`
- Let it play for a few seconds across segment boundaries if possible
- **VERIFY**: playbackRate changes from 1.0 when entering non-key segments
- Toggle "8x" off
- **VERIFY**: playbackRate returns to 1.0

### 1.5 Keyboard Shortcuts
- Use JS to dispatch keyboard events on the document:
  - Space → should toggle play/pause
  - ArrowRight → should advance currentTime by ~10s
  - ArrowLeft → should rewind currentTime by ~10s
  - 'm' → should toggle mute
- **VERIFY** each shortcut has the expected effect by reading video state after

### 1.6 Scrubber Seek
- Click at roughly 50% of the scrubber track width
- **VERIFY**: currentTime jumped to approximately 50% of duration

### 1.7 EventSource Cleanup (regression test for the leak we just fixed)
- With a video loaded, paste a new video ID and submit
- **VERIFY**: The old video is replaced, new extraction begins
- **VERIFY**: No JS errors in console related to closed EventSource

## Phase 2: Manual Verification (Guide the User)

After automated checks, present a checklist for the user to manually verify. These require human judgment:

```
Manual checks — please verify and confirm:

[ ] Speed ramping feels smooth (no jarring jumps between segments)
[ ] Scrubber playhead tracks smoothly during playback (no jitter)
[ ] Dragging the scrubber feels responsive (no lag or fighting)
[ ] Segment colors on timeline match the legend
[ ] Speed override sliders work (hover a legend dot, drag slider)
[ ] Overlays appear/disappear cleanly at segment boundaries
[ ] Volume slider expands on hover and adjusts audio
[ ] Fullscreen works and controls remain functional
[ ] Controls auto-hide after ~3s of no mouse movement during playback
[ ] Controls reappear on mouse move
```

## Reporting

After both phases, summarize results:
- List each automated check as PASS/FAIL with details on failures
- List manual checks as pending user confirmation
- If any automated check failed, suggest likely cause based on what you observed
