import { create } from "zustand";
import type { MediaStreams, VideoAnalysis } from "../lib/types";
import { processVideo } from "../lib/api";
import { computeStrategies } from "../lib/segmentEngine";

type AnalysisStatus = "idle" | "extracting" | "transcribing" | "analyzing" | "ready" | "error";

interface VideoState {
  videoId: string | null;
  media: MediaStreams | null;
  analysis: VideoAnalysis | null;
  status: AnalysisStatus;
  progressMessage: string | null;
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
  progressMessage: null,
  error: null,

  loadVideo: (videoId: string) => {
    cleanupSSE?.();
    set({
      videoId,
      status: "extracting",
      progressMessage: "Starting extraction...",
      error: null,
      media: null,
      analysis: null,
    });

    cleanupSSE = processVideo(videoId, {
      onProgress: (stage, message) => {
        set({ status: stage, progressMessage: message });
      },

      onMedia: (media) => {
        set({ media });
      },

      onAnalysis: (raw) => {
        const media = get().media;
        const segments = computeStrategies(raw.segments);

        const analysis: VideoAnalysis = {
          videoId,
          title: media?.title ?? "",
          totalDuration: media?.duration ?? 0,
          segments,
          tangentialTopics: raw.tangentialTopics,
          estimatedSmartDuration: raw.estimatedSmartDuration,
        };

        set({ analysis, status: "ready", progressMessage: null });
      },

      onError: (errorMessage) => {
        set({
          error: errorMessage,
          status: "error",
          progressMessage: null,
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
      progressMessage: null,
      error: null,
    });
  },
}));
