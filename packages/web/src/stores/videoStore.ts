import { create } from "zustand";
import type { MediaStreams, VideoAnalysis } from "../lib/types";
import { extractMedia } from "../lib/api";

interface VideoState {
  videoId: string | null;
  media: MediaStreams | null;
  analysis: VideoAnalysis | null;
  loading: boolean;
  error: string | null;

  loadVideo: (videoId: string) => Promise<void>;
  reset: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videoId: null,
  media: null,
  analysis: null,
  loading: false,
  error: null,

  loadVideo: async (videoId: string) => {
    set({ videoId, loading: true, error: null, media: null, analysis: null });
    try {
      const media = await extractMedia(videoId);
      set({ media, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load video",
        loading: false,
      });
    }
  },

  reset: () =>
    set({
      videoId: null,
      media: null,
      analysis: null,
      loading: false,
      error: null,
    }),
}));
