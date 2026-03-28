import { useState, useRef, useEffect } from "react";
import { usePlaybackStore, type SegmentType } from "../../stores/playbackStore";

const LEGEND_ITEMS: { type: SegmentType; bg: string; label: string }[] = [
  { type: "key", bg: "#06d6a0", label: "Key" },
  { type: "context", bg: "#3b82f6", label: "Context" },
  { type: "tangential", bg: "#ffd166", label: "Tangential" },
  { type: "filler", bg: "#5a5a66", label: "Filler" },
];

const MIN_SPEED = 0.5;
const MAX_SPEED = 8;

function formatSpeed(speed: number): string {
  if (!isFinite(speed) || speed >= MAX_SPEED) return "8";
  const str = speed.toFixed(1);
  return str.endsWith(".0") ? str.slice(0, -2) : str;
}

function sliderToSpeed(value: number): number {
  if (value >= MAX_SPEED) return Infinity;
  return value;
}

function speedToSlider(speed: number): number {
  if (!isFinite(speed)) return MAX_SPEED;
  return speed;
}

function LegendItem({
  type,
  bg,
  label,
}: {
  type: SegmentType;
  bg: string;
  label: string;
}) {
  const { speedOverrides, setSpeedOverride } = usePlaybackStore();
  const speed = speedOverrides[type];
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimeout = useRef<number>(0);

  const handleMouseEnter = () => {
    clearTimeout(leaveTimeout.current);
    setHovering(true);
  };

  const handleMouseLeave = () => {
    leaveTimeout.current = window.setTimeout(() => setHovering(false), 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => () => clearTimeout(leaveTimeout.current), []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: bg }}
      />
      <span className="text-8x-muted">{label}</span>
      <span className="text-8x-muted/60 font-mono">{formatSpeed(speed)}x</span>

      {/* Slider popover */}
      {hovering && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-8x-surface border border-8x-border rounded-lg shadow-xl z-50 flex items-center gap-2 min-w-[180px]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className="text-8x-muted text-[10px] font-mono w-6 text-right">
            0.5x
          </span>
          <input
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.25}
            value={speedToSlider(speed)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSpeedOverride(type, sliderToSpeed(val));
            }}
            className="flex-1 accent-8x-pink cursor-pointer h-1"
          />
          <span className="text-8x-muted text-[10px] font-mono w-4">
            8x
          </span>
          <span className="text-8x-white text-xs font-mono font-bold w-8 text-center">
            {formatSpeed(speed)}x
          </span>
        </div>
      )}
    </div>
  );
}

export function SegmentLegend() {
  return (
    <div className="flex gap-4 text-xs">
      {LEGEND_ITEMS.map((item) => (
        <LegendItem key={item.type} {...item} />
      ))}
    </div>
  );
}
