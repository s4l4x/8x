import { useEffect, useRef, useCallback } from "react";
import type { Segment, VideoAnalysis } from "../lib/types";
import { usePlaybackStore } from "../stores/playbackStore";

export interface OverlayState {
  visible: boolean;
  text: string;
  type: "summary" | "skip" | "key";
}

interface PlaybackEngineOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  analysis: VideoAnalysis | null;
  enabled: boolean;
  onOverlayChange: (overlay: OverlayState) => void;
}

function findSegment(segments: Segment[], time: number): Segment | null {
  return segments.find((s) => time >= s.startTime && time < s.endTime) ?? null;
}

function findNextSegment(segments: Segment[], time: number): Segment | null {
  return segments.find((s) => s.startTime > time) ?? null;
}

export function usePlaybackEngine({
  videoRef,
  analysis,
  enabled,
  onOverlayChange,
}: PlaybackEngineOptions) {
  const currentSegRef = useRef<string | null>(null);
  const targetSpeedRef = useRef(1);
  const currentSpeedRef = useRef(1);
  const rafRef = useRef<number>(0);
  const skipCooldownRef = useRef(false);
  const { setSpeed } = usePlaybackStore();

  // Smooth speed ramping
  const rampSpeed = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const target = targetSpeedRef.current;
    const current = currentSpeedRef.current;
    const diff = target - current;

    if (Math.abs(diff) < 0.05) {
      currentSpeedRef.current = target;
      video.playbackRate = target;
      setSpeed(target);
      return;
    }

    // Ramp at ~0.1 per frame (~60fps = ramp over ~300ms for a 2x change)
    const step = Math.sign(diff) * Math.min(Math.abs(diff), 0.15);
    currentSpeedRef.current += step;
    video.playbackRate = currentSpeedRef.current;
    setSpeed(currentSpeedRef.current);

    rafRef.current = requestAnimationFrame(rampSpeed);
  }, [videoRef, setSpeed]);

  const setTargetSpeed = useCallback(
    (speed: number) => {
      targetSpeedRef.current = speed;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(rampSpeed);
    },
    [rampSpeed],
  );

  // Main engine: runs on timeupdate
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !analysis || !enabled) return;

    const time = video.currentTime;
    const seg = findSegment(analysis.segments, time);

    if (!seg) {
      // In a gap — play normally
      if (currentSegRef.current !== null) {
        currentSegRef.current = null;
        setTargetSpeed(1);
        video.volume = 1;
        onOverlayChange({ visible: false, text: "", type: "summary" });
      }
      return;
    }

    // Same segment — no change needed
    if (seg.id === currentSegRef.current) return;

    // New segment entered
    currentSegRef.current = seg.id;
    const strategy = seg.playbackStrategy;

    if (strategy.action === "skip" && !skipCooldownRef.current) {
      // Skip: seek to next non-skip segment
      const next = findNextPlayableSegment(analysis.segments, seg.endTime);
      if (next) {
        skipCooldownRef.current = true;
        onOverlayChange({
          visible: true,
          text: seg.summary || `Skipping ${seg.type} content`,
          type: "skip",
        });

        // Brief flash of skip overlay, then seek
        setTimeout(() => {
          video.currentTime = next.startTime;
          skipCooldownRef.current = false;
        }, 800);
      }
      return;
    }

    // Speed change
    const speed = strategy.speed ?? 1;
    setTargetSpeed(speed);

    // Volume fade
    video.volume = Math.max(0, Math.min(1, strategy.audioFade ?? 1));

    // Overlay
    if (strategy.showOverlay && seg.summary) {
      onOverlayChange({ visible: true, text: seg.summary, type: "summary" });
    } else if (seg.type === "key" && seg.importance >= 0.8) {
      onOverlayChange({ visible: true, text: seg.summary, type: "key" });
    } else {
      onOverlayChange({ visible: false, text: "", type: "summary" });
    }
  }, [videoRef, analysis, enabled, setTargetSpeed, onOverlayChange]);

  // Attach/detach the engine
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !analysis || !enabled) {
      // Reset when disabled
      if (video) {
        video.playbackRate = 1;
        video.volume = 1;
      }
      currentSegRef.current = null;
      targetSpeedRef.current = 1;
      currentSpeedRef.current = 1;
      setSpeed(1);
      return;
    }

    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef, analysis, enabled, onTimeUpdate, setSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}

function findNextPlayableSegment(
  segments: Segment[],
  afterTime: number,
): Segment | null {
  return (
    segments.find(
      (s) =>
        s.startTime >= afterTime && s.playbackStrategy.action !== "skip",
    ) ?? null
  );
}
