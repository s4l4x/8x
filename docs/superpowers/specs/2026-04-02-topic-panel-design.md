# Hierarchical Topic Panel

## Overview

Add a topic panel to the right side of the video player that shows a hierarchical outline of the video's content — topics containing segments. The panel tracks playback position, allows click-to-seek, and persists across normal and fullscreen modes.

## Layout

- The panel is **fixed-positioned** on the right edge of the viewport, independent of the video container.
- The existing centered video layout stays as-is, but with right padding/margin so the panel doesn't obscure it in normal mode.
- In fullscreen: the video fills the screen behind the panel. The panel stays fixed on top in its same position — no layout changes needed.

## Topic Panel Contents

- A scrollable tree of **topics** (collapsible groups) containing **segments** (leaf nodes).
- Each segment row shows:
  - Colored dot indicating segment type (cyan = key, blue = context, yellow = tangential, gray = filler)
  - Summary text
  - Timestamp
- Filler and tangential segments are dimmed (lower opacity).
- Topic headings use the same color/weight as segment text — hierarchy is conveyed by indentation alone.
- All topics start expanded.

## Current Segment Highlighting

- The currently playing segment gets a subtle background tint (`#ffffff0d`) and a ▶ marker before the text.
- The text brightens slightly (from `#888` to `#ccc`) to reinforce the highlight without being heavy.
- No colored left border or glow effects.

## Interactions

- **Click a segment** → seek video to that segment's start time.
- **Click a topic heading** → collapse/expand that topic group.
- **Auto-scroll** → panel scrolls to keep the current segment visible during playback.

## Data Model Change

Update the Claude analysis prompt so that segments are returned grouped under topics instead of as a flat array.

### New schema additions to `VideoAnalysis`

```typescript
interface TopicGroup {
  title: string;
  segments: Segment[];
}
```

- Add `topics: TopicGroup[]` to the analysis response.
- The flat `segments` array is derived by flattening `topics` — the playback engine, scrubber, and all existing code continue to work off the flat array with no changes.
- The `TopicPanel` component reads from `topics` for its hierarchical rendering.

### Prompt changes

Update the Claude analysis system prompt to ask for segments grouped under topic headings. The segment schema itself doesn't change — only the top-level structure gains the `topics` wrapper.

## Components

### TopicPanel

The fixed-position right-side panel. Renders the "Topics" header and a list of `TopicGroup` components. Has independent scroll. Background: `#12121f` with subtle border.

### TopicGroup

A collapsible section: topic title with ▼/▶ toggle arrow, followed by its child `SegmentRow` components when expanded. All start expanded.

### SegmentRow

A single segment leaf node. Shows colored type dot, summary text, and timestamp. Handles click-to-seek. Receives `isActive` prop for current-segment highlighting.

### Player layout changes

- Add right padding/margin to the existing player container to accommodate the panel width.
- The panel renders outside the player container, positioned fixed to the viewport.
