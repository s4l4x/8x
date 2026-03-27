import type { Segment, PlaybackStrategy } from "./types";

type RawSegment = Omit<Segment, "playbackStrategy">;

export function computeStrategies(raw: RawSegment[]): Segment[] {
  const sorted = [...raw].sort((a, b) => a.startTime - b.startTime);
  const filled = fillGaps(sorted);
  return filled.map((seg) => ({
    ...seg,
    playbackStrategy: strategyForSegment(seg),
  }));
}

/** Fill gaps between segments with filler segments */
function fillGaps(segments: RawSegment[]): RawSegment[] {
  if (segments.length === 0) return segments;

  const result: RawSegment[] = [];
  let gapIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prevEnd = i === 0 ? 0 : segments[i - 1].endTime;

    // If there's a gap before this segment, insert filler
    if (seg.startTime - prevEnd > 0.5) {
      result.push({
        id: `gap_${gapIndex++}`,
        startTime: prevEnd,
        endTime: seg.startTime,
        type: "filler",
        importance: 0.05,
        summary: "",
      });
    }

    result.push(seg);
  }

  return result;
}

function strategyForSegment(seg: RawSegment): PlaybackStrategy {
  switch (seg.type) {
    case "key":
      return {
        action: "play",
        speed: 1,
        audioFade: 1,
        showOverlay: false,
        pitchCorrect: false,
      };

    case "context":
      return {
        action: "speed",
        speed: 1.5 + (1 - seg.importance) * 0.5, // 1.5x–2x based on importance
        audioFade: 0.8,
        showOverlay: false,
        pitchCorrect: true,
      };

    case "filler":
      return {
        action: seg.importance < 0.15 ? "skip" : "speed",
        speed: 3,
        audioFade: 0.2,
        showOverlay: true,
        pitchCorrect: true,
      };

    case "tangential":
      return {
        action: "skip",
        speed: 1,
        audioFade: 0,
        showOverlay: false,
        pitchCorrect: false,
      };
  }
}
