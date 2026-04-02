import { useState, useRef, useEffect } from "react";
import type { TopicGroup as TopicGroupType } from "../../lib/types";
import { SegmentRow } from "./SegmentRow";

interface TopicGroupProps {
  topic: TopicGroupType;
  activeSegmentId: string | null;
  onSeek: (time: number) => void;
}

export function TopicGroup({ topic, activeSegmentId, onSeek }: TopicGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSegmentId && activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSegmentId]);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 w-full text-left text-xs text-[#aaa] py-1 hover:text-[#ccc] transition-colors"
      >
        <span className="text-[10px] text-[#666] w-3 flex-shrink-0">
          {expanded ? "▼" : "▶"}
        </span>
        {topic.title}
      </button>

      {expanded && (
        <div className="ml-4 flex flex-col gap-px">
          {topic.segments.map((seg) => {
            const isActive = seg.id === activeSegmentId;
            return (
              <SegmentRow
                key={seg.id}
                ref={isActive ? activeRef : undefined}
                segment={seg}
                isActive={isActive}
                onSeek={onSeek}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
