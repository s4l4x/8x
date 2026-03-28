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
  const leaveTimeout = useRef<number>(0);

  const handleMouseEnter = () => {
    clearTimeout(leaveTimeout.current);
    setHovering(true);
  };

  const handleMouseLeave = () => {
    leaveTimeout.current = window.setTimeout(() => setHovering(false), 300);
  };

  useEffect(() => () => clearTimeout(leaveTimeout.current), []);

  const sliderId = `slider-${type}`;

  return (
    <div
      className="flex items-center gap-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        #${sliderId} {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        #${sliderId}::-webkit-slider-runnable-track {
          height: 3px;
          border-radius: 1.5px;
          background: rgba(255,255,255,0.15);
        }
        #${sliderId}::-moz-range-track {
          height: 3px;
          border-radius: 1.5px;
          background: rgba(255,255,255,0.15);
        }
        #${sliderId}::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${bg};
          border: none;
          cursor: pointer;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
          margin-top: -3.5px;
        }
        #${sliderId}::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${bg};
          border: none;
          cursor: pointer;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Dot — always present, collapses to 0 width when slider is open */}
      <div
        className="rounded-full flex-shrink-0 transition-all duration-200"
        style={{
          backgroundColor: bg,
          width: hovering ? 0 : 10,
          height: hovering ? 0 : 10,
          opacity: hovering ? 0 : 1,
        }}
      />

      <span className="text-8x-muted whitespace-nowrap">{label}</span>

      {/* Slider track — expands from 0 width */}
      <input
        id={sliderId}
        type="range"
        min={MIN_SPEED}
        max={MAX_SPEED}
        step={0.25}
        value={speedToSlider(speed)}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setSpeedOverride(type, sliderToSpeed(val));
        }}
        className="transition-all duration-200 h-3"
        style={{
          width: hovering ? 96 : 0,
          opacity: hovering ? 1 : 0,
          overflow: "hidden",
        }}
      />

      <span className="text-8x-muted/60 font-mono whitespace-nowrap">
        {formatSpeed(speed)}x
      </span>
    </div>
  );
}

export function SegmentLegend() {
  return (
    <div className="flex gap-4 text-xs items-center">
      {LEGEND_ITEMS.map((item) => (
        <LegendItem key={item.type} {...item} />
      ))}
    </div>
  );
}
