import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoElement } from "./VideoElement";
import { OverlayLayer } from "./OverlayLayer";
import { PlaybackControls } from "../Controls/PlaybackControls";
import { SegmentLegend } from "../Controls/SegmentLegend";
import { useVideoStore } from "../../stores/videoStore";
import { usePlaybackStore } from "../../stores/playbackStore";

import {
  usePlaybackEngine,
  type OverlayState,
} from "../../hooks/usePlaybackEngine";

interface PlayerProps {
  videoId: string;
  onBack: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  extracting: "Extracting streams",
  transcribing: "Fetching transcript",
  analyzing: "Analyzing with AI",
};

export function Player({ videoId, onBack }: PlayerProps) {
  const { media, analysis, status, progressMessage, progressPercent, error, loadVideo } = useVideoStore();
  const speedOverrides = usePlaybackStore((s) => s.speedOverrides);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [smartMode, setSmartMode] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState>({
    visible: false,
    text: "",
    type: "summary",
  });

  const handleOverlayChange = useCallback((o: OverlayState) => {
    setOverlay(o);
  }, []);

  const handleOverlayDismiss = useCallback(() => {
    setOverlay({ visible: false, text: "", type: "summary" });
  }, []);

  usePlaybackEngine({
    videoRef,
    analysis,
    enabled: smartMode,
    onOverlayChange: handleOverlayChange,
  });

  useEffect(() => {
    loadVideo(videoId);
  }, [videoId, loadVideo]);

  // Auto-enable smart mode when analysis is ready
  useEffect(() => {
    if (status === "ready" && analysis) {
      setSmartMode(true);
    }
  }, [status, analysis]);

  if (status === "extracting" && !media) {
    const hasPercent = progressPercent != null && progressPercent > 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        {hasPercent ? (
          <>
            <div className="w-64 h-2 bg-8x-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-8x-pink rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-8x-muted text-sm">{progressMessage}</p>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-8x-pink border-t-transparent rounded-full"
            />
            <p className="text-8x-muted">{progressMessage || "Extracting streams..."}</p>
          </>
        )}
      </div>
    );
  }

  if (status === "error" && !media) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-8x-orange text-lg">{error}</p>
        <button
          onClick={onBack}
          className="text-8x-muted hover:text-8x-white transition-colors"
        >
          &larr; Try another video
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      <div className="w-full max-w-5xl">
        <button
          onClick={onBack}
          className="mb-4 text-8x-muted hover:text-8x-white transition-colors text-sm"
        >
          &larr; Back
        </button>

        {media && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-8x-white">
                {media.title}
              </h2>

              {analysis && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-shrink-0"
                >
                  <div className="px-3 py-1.5 bg-8x-pink/15 border border-8x-pink/30 rounded-full">
                    <span className="text-8x-pink text-sm font-semibold">
                      {(() => {
                        const smartDuration = analysis.segments.reduce((sum, seg) => {
                          const speed = speedOverrides[seg.type];
                          if (!isFinite(speed)) return sum;
                          return sum + (seg.endTime - seg.startTime) / speed;
                        }, 0);
                        return smartDuration > 0
                          ? (analysis.totalDuration / smartDuration).toFixed(1)
                          : "∞";
                      })()}x faster
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            <div
              data-player-root
              className="relative w-full rounded-2xl overflow-hidden bg-8x-black select-none"
            >
              <VideoElement ref={videoRef} url={media.url} />

              {/* Overlays — below controls so controls stay interactive */}
              {smartMode && <OverlayLayer overlay={overlay} onDismiss={handleOverlayDismiss} />}

              {/* Custom controls */}
              <PlaybackControls
                videoRef={videoRef}
                smartMode={smartMode}
                onToggleSmartMode={() => setSmartMode((m) => !m)}
                analysisReady={!!analysis}
                segments={analysis?.segments}
              />
            </div>

            {/* Segment legend with speed controls */}
            {analysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 px-4"
              >
                <SegmentLegend />
              </motion.div>
            )}
          </>
        )}

        {/* Analysis status bar */}
        <AnimatePresence>
          {status !== "ready" &&
            status !== "idle" &&
            status !== "extracting" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center gap-3 px-4 py-3 bg-8x-surface border border-8x-border rounded-xl"
              >
                {status !== "error" ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-8x-cyan border-t-transparent rounded-full flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-8x-cyan text-sm font-medium">
                        {STATUS_LABELS[status] || status}
                      </span>
                      {progressMessage && (
                        <span className="text-8x-muted text-xs mt-0.5">
                          {progressMessage}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-8x-orange text-sm">
                    Analysis failed: {error} — video still plays normally
                  </span>
                )}
              </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}