import { useEffect, useRef, useCallback } from "react";
import type { Segment, VideoAnalysis } from "../lib/types";
import { usePlaybackStore, computeSegmentSpeed } from "../stores/playbackStore";

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
  const skippingRef = useRef(false);
  const { setSpeed, speedOverrides } = usePlaybackStore();
  const speedOverridesRef = useRef(speedOverrides);
  speedOverridesRef.current = speedOverrides;
  const onOverlayChangeRef = useRef(onOverlayChange);
  onOverlayChangeRef.current = onOverlayChange;

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
      skippingRef.current = false;
      setSpeed(1);
      return;
    }

    const onSeeked = () => {
      skippingRef.current = false;
    };

    const onTimeUpdate = () => {
      if (!video || !analysis || !enabled) return;
      if (skippingRef.current || usePlaybackStore.getState().scrubbing) return;

      const time = video.currentTime;
      const seg = findSegment(analysis.segments, time);
      const overrides = usePlaybackStore.getState().speedOverrides;

      if (!seg) {
        if (currentSegRef.current !== null) {
          currentSegRef.current = null;
          setTargetSpeed(1);
          video.volume = 1;
          onOverlayChangeRef.current({ visible: false, text: "", type: "summary" });
        }
        return;
      }

      const isNewSegment = seg.id !== currentSegRef.current;
      const baseSpeed = overrides[seg.type];
      const overrideSpeed = computeSegmentSpeed(seg.type, seg.importance, baseSpeed);
      const strategy = seg.playbackStrategy;

      if (!isFinite(overrideSpeed)) {
        skippingRef.current = true;
        currentSegRef.current = seg.id;
        const wasPlaying = !video.paused;
        const next = findNextPlayableSegment(analysis.segments, seg.endTime, overrides);

        onOverlayChangeRef.current({
          visible: true,
          text: seg.summary || `Skipping ${seg.type} content`,
          type: "skip",
        });

        if (next) {
          video.currentTime = next.startTime;
          currentSegRef.current = next.id;
        } else {
          video.currentTime = video.duration;
        }

        // Resume playback after seek completes
        if (wasPlaying && next) {
          video.addEventListener("seeked", () => {
            video.play().catch(() => {});
          }, { once: true });
        }
        return;
      }

      // Apply speed — picks up slider changes mid-segment too
      if (targetSpeedRef.current !== overrideSpeed || isNewSegment) {
        setTargetSpeed(overrideSpeed);
      }

      if (!isNewSegment) return;

      currentSegRef.current = seg.id;
      video.volume = Math.max(0, Math.min(1, strategy.audioFade ?? 1));

      if (strategy.showOverlay && seg.summary) {
        onOverlayChangeRef.current({ visible: true, text: seg.summary, type: "summary" });
      } else if (seg.type === "key" && seg.importance >= 0.8) {
        onOverlayChangeRef.current({ visible: true, text: seg.summary, type: "key" });
      } else {
        onOverlayChangeRef.current({ visible: false, text: "", type: "summary" });
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeked", onSeeked);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeked", onSeeked);
      cancelAnimationFrame(rafRef.current);
      skippingRef.current = false;
    };
    // onOverlayChange accessed via ref to avoid re-running this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, analysis, enabled, setTargetSpeed, setSpeed]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}

function findNextPlayableSegment(
  segments: Segment[],
  afterTime: number,
  speedOverrides: Record<string, number>,
): Segment | null {
  return (
    segments.find(
      (s) =>
        s.startTime >= afterTime && isFinite(speedOverrides[s.type]),
    ) ?? null
  );
}
