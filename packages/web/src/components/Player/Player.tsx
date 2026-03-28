import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoElement } from "./VideoElement";
import { OverlayLayer } from "./OverlayLayer";
import { PlaybackControls } from "../Controls/PlaybackControls";
import { useVideoStore } from "../../stores/videoStore";

import {
  usePlaybackEngine,
  type OverlayState,
} from "../../hooks/usePlaybackEngine";

interface PlayerProps {
  videoId: string;
  onBack: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  extracting: "Extracting video...",
  transcribing: "Fetching transcript...",
  analyzing: "Analyzing content with AI...",
};

export function Player({ videoId, onBack }: PlayerProps) {
  const { media, analysis, status, error, loadVideo } = useVideoStore();
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-8x-pink border-t-transparent rounded-full"
        />
        <p className="text-8x-muted">Extracting streams...</p>
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
                  className="flex items-center gap-3 flex-shrink-0"
                >
                  <span className="text-8x-muted text-sm">
                    {formatDuration(analysis.totalDuration)} &rarr;{" "}
                    {formatDuration(analysis.estimatedSmartDuration)}
                  </span>
                  <div className="px-3 py-1.5 bg-8x-pink/15 border border-8x-pink/30 rounded-full">
                    <span className="text-8x-pink text-sm font-semibold">
                      {formatSpeedUp(
                        analysis.totalDuration,
                        analysis.estimatedSmartDuration,
                      )}{" "}
                      faster
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

            {/* Segment legend */}
            {analysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex gap-4 text-xs"
              >
                {([
                  ["key", "bg-8x-cyan", "Key"],
                  ["context", "bg-8x-blue", "Context"],
                  ["tangential", "bg-8x-yellow", "Tangential"],
                  ["filler", "bg-[#5a5a66]", "Filler"],
                ] as const).map(([type, color, label]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-8x-muted">{label}</span>
                  </div>
                ))}
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
                    <span className="text-8x-cyan text-sm font-medium">
                      {STATUS_LABELS[status] || status}
                    </span>
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSpeedUp(original: number, smart: number): string {
  if (smart <= 0) return "∞x";
  return `${(original / smart).toFixed(1)}x`;
}
