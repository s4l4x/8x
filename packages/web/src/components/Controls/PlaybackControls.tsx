import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlaybackStore } from "../../stores/playbackStore";
import type { Segment } from "../../lib/types";

const SEGMENT_COLORS: Record<Segment["type"], string> = {
  key: "#06d6a0",       // 8x-cyan
  context: "#3b82f6",   // 8x-blue
  filler: "#5a5a66",
  tangential: "#ffd166", // 8x-yellow
};

interface PlaybackControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  smartMode: boolean;
  onToggleSmartMode: () => void;
  analysisReady: boolean;
  segments?: Segment[];
}

export function PlaybackControls({
  videoRef,
  smartMode,
  onToggleSmartMode,
  analysisReady,
  segments,
}: PlaybackControlsProps) {
  const { playing, currentTime, duration, speed, scrubbing, setPlaying, setScrubbing, setCurrentTime } =
    usePlaybackStore();
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number>(0);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef]);

  const seek = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const bar = scrubberRef.current;
      const video = videoRef.current;
      if (!bar || !video) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * duration;
      video.currentTime = time;
      setCurrentTime(time);
    },
    [videoRef, duration, setCurrentTime],
  );

  const onScrubStart = useCallback(
    (e: React.MouseEvent) => {
      const video = videoRef.current;
      const wasPlaying = video ? !video.paused : false;
      if (video && wasPlaying) video.pause();

      setScrubbing(true);
      seek(e);

      const onMove = (ev: MouseEvent) => seek(ev);
      const onUp = () => {
        setScrubbing(false);
        if (video && wasPlaying) video.play().catch(() => {});
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [seek, videoRef, setScrubbing],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (muted) {
      video.volume = volume;
      setMuted(false);
    } else {
      video.volume = 0;
      setMuted(true);
    }
  }, [videoRef, volume, muted]);

  const changeVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const v = parseFloat(e.target.value);
      video.volume = v;
      setVolumeState(v);
      setMuted(v === 0);
    },
    [videoRef],
  );

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const container = video.closest("[data-player-root]");
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [videoRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          if (videoRef.current) videoRef.current.currentTime += 10;
          break;
        case "ArrowLeft":
          if (videoRef.current) videoRef.current.currentTime -= 10;
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, videoRef]);

  // Auto-hide controls
  useEffect(() => {
    if (hovering || !playing || scrubbing) {
      clearTimeout(hideTimeoutRef.current);
      return;
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setHovering(false);
    }, 3000);
    return () => clearTimeout(hideTimeoutRef.current);
  }, [hovering, playing, scrubbing]);

  const showControls = !playing || hovering || scrubbing;

  return (
    <div
      className="absolute inset-0 flex flex-col justify-end"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={() => setHovering(true)}
    >
      {/* Click to play/pause */}
      <div className="flex-1 cursor-pointer" onClick={togglePlay} />

      {/* Big center play button when paused */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-8x-pink/80 backdrop-blur-sm flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="white"
                className="w-10 h-10 ml-1"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-4"
          >
            {/* Scrubber */}
            <div
              ref={scrubberRef}
              onMouseDown={onScrubStart}
              className="group/scrub relative cursor-pointer py-1.5 -mt-1.5 mb-0.5"
            >
              {/* Track — thin by default, expands to full timeline on hover */}
              <div className="relative h-1.5 group-hover/scrub:h-10 bg-white/20 rounded group-hover/scrub:rounded-lg transition-all duration-200 overflow-hidden">
                {segments && segments.length > 0 ? (
                  segments.map((seg) => {
                    const left = (seg.startTime / duration) * 100;
                    const width = ((seg.endTime - seg.startTime) / duration) * 100;
                    const isPlayed = (seg.endTime / duration) * 100 <= progress;
                    const isPartial = left < progress && !isPlayed;

                    return (
                      <div
                        key={seg.id}
                        className="absolute inset-y-0 transition-all hover:brightness-125"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: SEGMENT_COLORS[seg.type],
                          opacity: isPlayed ? 0.85 : isPartial ? 0.6 : 0.3,
                        }}
                        title={`${seg.type}: ${seg.summary}`}
                      >
                        {/* Importance bar — visible when expanded */}
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-white/20 border-t border-white/40 opacity-0 group-hover/scrub:opacity-100 transition-opacity"
                          style={{ height: `${seg.importance * 100}%` }}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="h-full bg-8x-pink rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                )}

                {/* Played overlay — brightens played region for non-segment fallback is handled above */}
                {segments && segments.length > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-white/15 pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                )}

              </div>

              {/* Playhead — circle when compact, pill when expanded, sits above overflow-hidden track */}
              <div
                className={`absolute z-10 pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-4 group-hover/scrub:w-1.5 group-hover/scrub:h-14 rounded-full bg-white border-2 group-hover/scrub:border border-white shadow-[0_0_6px_rgba(0,0,0,0.4)] ${scrubbing ? "transition-[width,height,border-width] duration-200" : "transition-all duration-200"}`}
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-8x-pink transition-colors"
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-8x-pink transition-colors"
                >
                  {muted || volume === 0 ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={changeVolume}
                  className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-8x-pink opacity-0 group-hover/vol:opacity-100 cursor-pointer"
                />
              </div>

              {/* Time */}
              <span className="text-white/70 text-xs font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Speed indicator (when 8x is active) */}
              <AnimatePresence>
                {smartMode && speed > 1.05 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-8x-cyan text-xs font-mono font-bold"
                  >
                    {speed.toFixed(1)}x
                  </motion.span>
                )}
              </AnimatePresence>

              <div className="flex-1" />

              {/* 8x Toggle */}
              {analysisReady && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleSmartMode}
                  className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${
                    smartMode
                      ? "bg-8x-pink text-white shadow-lg shadow-8x-pink/25"
                      : "bg-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  8x
                </motion.button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-8x-pink transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
