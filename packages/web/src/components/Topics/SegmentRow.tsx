import { forwardRef } from "react";
import type { Segment } from "../../lib/types";
import { SEGMENT_COLORS } from "../../lib/constants";

interface SegmentRowProps {
  segment: Segment;
  isActive: boolean;
  onSeek: (time: number) => void;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const SegmentRow = forwardRef<HTMLDivElement, SegmentRowProps>(
  function SegmentRow({ segment, isActive, onSeek }, ref) {
    const isDimmed =
      segment.type === "filler" || segment.type === "tangential";

    return (
      <div
        ref={ref}
        onClick={() => onSeek(segment.startTime)}
        className={`flex items-start gap-1.5 py-1 px-1.5 rounded cursor-pointer transition-colors hover:bg-white/5 ${
          isActive ? "bg-[#ffffff0d]" : ""
        } ${isDimmed ? "opacity-50" : ""}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
          style={{ backgroundColor: SEGMENT_COLORS[segment.type] }}
        />
        <span
          className={`flex-1 text-xs leading-snug ${
            isActive ? "text-[#ccc]" : "text-[#888]"
          }`}
        >
          {segment.summary}
        </span>
        <span className="text-[10px] text-[#666] tabular-nums flex-shrink-0">
          {formatTimestamp(segment.startTime)}
        </span>
      </div>
    );
  },
);
