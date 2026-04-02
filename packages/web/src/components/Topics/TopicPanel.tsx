import { useCallback, useMemo } from "react";
import type { TopicGroup as TopicGroupType } from "../../lib/types";
import { usePlaybackStore } from "../../stores/playbackStore";
import { TopicGroup } from "./TopicGroup";

interface TopicPanelProps {
  topics: TopicGroupType[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function TopicPanel({ topics, videoRef }: TopicPanelProps) {
  const currentTime = usePlaybackStore((s) => s.currentTime);

  const activeSegmentId = useMemo(() => {
    for (const topic of topics) {
      for (const seg of topic.segments) {
        if (currentTime >= seg.startTime && currentTime < seg.endTime) {
          return seg.id;
        }
      }
    }
    return null;
  }, [topics, currentTime]);

  const handleSeek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    [videoRef],
  );

  return (
    <div className="fixed top-4 right-4 bottom-4 w-80 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl z-50 flex flex-col shadow-2xl shadow-black/40">
      <div className="px-3 pt-4 pb-2">
        <span className="text-[11px] uppercase tracking-wider text-[#666]">
          Topics
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {topics.map((topic, i) => (
          <TopicGroup
            key={i}
            topic={topic}
            activeSegmentId={activeSegmentId}
            onSeek={handleSeek}
          />
        ))}
      </div>
    </div>
  );
}
