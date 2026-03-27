import { useRef } from "react";
import { motion } from "framer-motion";
import type { Segment } from "../../lib/types";
import { usePlaybackStore } from "../../stores/playbackStore";

interface TimelineProps {
  segments: Segment[];
  duration: number;
}

const SEGMENT_COLORS: Record<Segment["type"], string> = {
  key: "bg-8x-cyan",
  context: "bg-8x-blue",
  filler: "bg-[#5a5a66]",
  tangential: "bg-8x-yellow",
};

const SEGMENT_LABELS: Record<Segment["type"], string> = {
  key: "Key",
  context: "Context",
  filler: "Filler",
  tangential: "Tangential",
};

export function Timeline({ segments, duration }: TimelineProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const { currentTime } = usePlaybackStore();

  const handleClick = (e: React.MouseEvent) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * duration;

    // Find the video element and seek
    const video = document.querySelector("video");
    if (video) video.currentTime = time;
  };

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        {(["key", "context", "filler", "tangential"] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${SEGMENT_COLORS[type]}`} />
            <span className="text-8x-muted">{SEGMENT_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Timeline bar */}
      <div
        ref={barRef}
        onClick={handleClick}
        className="relative h-10 rounded-lg overflow-hidden cursor-pointer flex bg-8x-black"
      >
        {segments.map((seg, i) => {
          const left = (seg.startTime / duration) * 100;
          const width = ((seg.endTime - seg.startTime) / duration) * 100;

          return (
            <motion.div
              key={seg.id}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              className={`absolute inset-y-0 ${SEGMENT_COLORS[seg.type]} hover:brightness-125 transition-all group`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                opacity: 0.4 + seg.importance * 0.6,
              }}
              title={`${SEGMENT_LABELS[seg.type]}: ${seg.summary}`}
            >
              {/* Importance bar within segment */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-white/20"
                style={{ height: `${seg.importance * 100}%` }}
              />
            </motion.div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute inset-y-0 w-0.5 bg-8x-white z-10 pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {/* Segment summary on hover — shows via CSS group */}
      <div className="flex justify-between text-xs text-8x-muted">
        <span>0:00</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
