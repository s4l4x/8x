import { create } from "zustand";

interface PlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;

  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  speed: 1,
  volume: 1,

  setPlaying: (playing) => set({ playing }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setSpeed: (speed) => set({ speed }),
  setVolume: (volume) => set({ volume }),
}));
