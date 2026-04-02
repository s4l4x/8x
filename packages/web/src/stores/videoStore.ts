import { create } from "zustand";
import type { MediaStreams, VideoAnalysis, TopicGroup } from "../lib/types";
import { processVideo, type TaskStatus } from "../lib/api";
import { computeStrategies } from "../lib/segmentEngine";

type AnalysisStatus = "idle" | "processing" | "ready" | "error";

interface VideoState {
  videoId: string | null;
  media: MediaStreams | null;
  analysis: VideoAnalysis | null;
  status: AnalysisStatus;
  overallProgress: number;
  tasks: TaskStatus[];
  error: string | null;

  loadVideo: (videoId: string) => void;
  reset: () => void;
}

let cleanupSSE: (() => void) | null = null;

export const useVideoStore = create<VideoState>((set, get) => ({
  videoId: null,
  media: null,
  analysis: null,
  status: "idle",
  overallProgress: 0,
  tasks: [],
  error: null,

  loadVideo: (videoId: string) => {
    cleanupSSE?.();
    set({
      videoId,
      status: "processing",
      overallProgress: 0,
      tasks: [],
      error: null,
      media: null,
      analysis: null,
    });

    cleanupSSE = processVideo(videoId, {
      onProgress: (overallProgress, tasks) => {
        set({ overallProgress, tasks });
      },

      onMedia: (media) => {
        set({ media });
      },

      onAnalysis: (raw) => {
        const media = get().media;

        // Flatten topics→segments, or use legacy flat array
        const rawSegments = raw.topics
          ? raw.topics.flatMap((t) => t.segments)
          : raw.segments ?? [];

        const segments = computeStrategies(rawSegments);

        // Build TopicGroup[] with strategy-enriched segments
        const topics: TopicGroup[] | undefined = raw.topics
          ? raw.topics.map((t) => ({
              title: t.title,
              segments: segments.filter((s) =>
                t.segments.some((rs) => rs.id === s.id),
              ),
            }))
          : undefined;

        const analysis: VideoAnalysis = {
          videoId,
          title: media?.title ?? "",
          totalDuration: media?.duration ?? 0,
          segments,
          topics,
          tangentialTopics: raw.tangentialTopics,
          estimatedSmartDuration: raw.estimatedSmartDuration,
        };

        set({ analysis, status: "ready", overallProgress: 100, tasks: [] });
      },

      onError: (errorMessage) => {
        set({
          error: errorMessage,
          status: "error",
          overallProgress: 0,
          tasks: [],
        });
      },
    });
  },

  reset: () => {
    cleanupSSE?.();
    cleanupSSE = null;
    set({
      videoId: null,
      media: null,
      analysis: null,
      status: "idle",
      overallProgress: 0,
      tasks: [],
      error: null,
    });
  },
}));
