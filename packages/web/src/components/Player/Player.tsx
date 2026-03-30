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

export function Player({ videoId, onBack }: PlayerProps) {
  const { media, analysis, status, overallProgress, tasks, error, loadVideo } = useVideoStore();
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

  // Loading screen — shown before media is available
  if (status === "processing" && !media) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        {/* Overall progress bar */}
        <div className="w-80 flex flex-col gap-2">
          <div className="flex justify-between text-xs text-8x-muted">
            <span>Preparing video</span>
            <span className="tabular-nums">{overallProgress}%</span>
          </div>
          <div className="w-full h-2 bg-8x-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-8x-pink rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Task list */}
        {tasks.length > 0 && (
          <div className="w-80 flex flex-col gap-1.5">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-baseline gap-2 text-xs" style={{ minHeight: "1.25rem" }}>
                <span className="w-4 flex-shrink-0 text-center">
                  {task.status === "done" ? (
                    <span className="text-8x-cyan">✓</span>
                  ) : task.status === "active" ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-3 h-3 border-[1.5px] border-8x-pink border-t-transparent rounded-full inline-block"
                    />
                  ) : (
                    <span className="text-8x-muted/40">○</span>
                  )}
                </span>
                <span className={`flex-shrink-0 ${
                  task.status === "done"
                    ? "text-8x-muted"
                    : task.status === "active"
                    ? "text-8x-white"
                    : "text-8x-muted/50"
                }`}>
                  {task.label}
                </span>
                {task.detail && task.status === "active" && (
                  <span className="text-8x-muted tabular-nums truncate ml-auto">{task.detail}</span>
                )}
              </div>
            ))}
          </div>
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

        {/* Processing status bar — shown after media is loaded while transcript/analysis runs */}
        <AnimatePresence>
          {status === "processing" && media && tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 px-4 py-3 bg-8x-surface border border-8x-border rounded-xl"
            >
              {/* Compact progress bar */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1.5 bg-8x-darker rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-8x-cyan rounded-full"
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
                <span className="text-8x-muted text-xs tabular-nums">{overallProgress}%</span>
              </div>
              {/* Active task detail */}
              {tasks.filter((t) => t.status === "active").map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-2 border-8x-cyan border-t-transparent rounded-full flex-shrink-0"
                  />
                  <span className="text-8x-cyan text-sm font-medium">{task.label}</span>
                  {task.detail && (
                    <span className="text-8x-muted text-xs ml-auto">{task.detail}</span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error bar — shown after media loaded if analysis fails */}
        <AnimatePresence>
          {status === "error" && media && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 px-4 py-3 bg-8x-surface border border-8x-border rounded-xl"
            >
              <span className="text-8x-orange text-sm">
                Analysis failed: {error} — video still plays normally
              </span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
