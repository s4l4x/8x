import { create } from "zustand";
import type { MediaStreams, VideoAnalysis } from "../lib/types";
import { extractMedia, fetchTranscript, analyzeVideo } from "../lib/api";
import { computeStrategies } from "../lib/segmentEngine";

type AnalysisStatus = "idle" | "extracting" | "transcribing" | "analyzing" | "ready" | "error";

interface VideoState {
  videoId: string | null;
  media: MediaStreams | null;
  analysis: VideoAnalysis | null;
  status: AnalysisStatus;
  error: string | null;

  loadVideo: (videoId: string) => Promise<void>;
  reset: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videoId: null,
  media: null,
  analysis: null,
  status: "idle",
  error: null,

  loadVideo: async (videoId: string) => {
    set({ videoId, status: "extracting", error: null, media: null, analysis: null });

    try {
      // Step 1: Extract media
      const media = await extractMedia(videoId);
      set({ media, status: "transcribing" });

      // Step 2: Fetch transcript
      const transcript = await fetchTranscript(videoId);
      set({ status: "analyzing" });

      // Step 3: Analyze with Claude
      const raw = await analyzeVideo(media.title, transcript);

      // Step 4: Compute playback strategies
      const segments = computeStrategies(raw.segments);

      const analysis: VideoAnalysis = {
        videoId,
        title: media.title,
        totalDuration: media.duration,
        segments,
        tangentialTopics: raw.tangentialTopics,
        estimatedSmartDuration: raw.estimatedSmartDuration,
      };

      set({ analysis, status: "ready" });
    } catch (err) {
      const currentMedia = get().media;
      set({
        error: err instanceof Error ? err.message : "Something went wrong",
        // If we at least got the media, keep it so video still plays
        status: currentMedia ? "error" : "error",
      });
    }
  },

  reset: () =>
    set({
      videoId: null,
      media: null,
      analysis: null,
      status: "idle",
      error: null,
    }),
}));
