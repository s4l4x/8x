import { create } from "zustand";
import type { Segment } from "../lib/types";

export type SegmentType = Segment["type"];

export const DEFAULT_SPEEDS: Record<SegmentType, number> = {
  key: 1,
  context: 2,
  filler: Infinity,
  tangential: 3,
};

interface PlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;
  speedOverrides: Record<SegmentType, number>;

  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setSpeedOverride: (type: SegmentType, speed: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  speed: 1,
  volume: 1,
  speedOverrides: { ...DEFAULT_SPEEDS },

  setPlaying: (playing) => set({ playing }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setSpeed: (speed) => set({ speed }),
  setVolume: (volume) => set({ volume }),
  setSpeedOverride: (type, speed) =>
    set((state) => ({
      speedOverrides: { ...state.speedOverrides, [type]: speed },
    })),
}));
