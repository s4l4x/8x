import { motion, AnimatePresence } from "framer-motion";
import type { OverlayState } from "../../hooks/usePlaybackEngine";

interface OverlayLayerProps {
  overlay: OverlayState;
  onDismiss: () => void;
}

export function OverlayLayer({ overlay, onDismiss }: OverlayLayerProps) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-center items-start p-6 pb-20">
      {/* Summary/skip overlay */}
      <AnimatePresence>
        {overlay.visible && overlay.text && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className={`pointer-events-auto px-4 py-3 rounded-xl backdrop-blur-md max-w-[80%] ${
              overlay.type === "skip"
                ? "bg-8x-orange/20 border border-8x-orange/30"
                : overlay.type === "key"
                  ? "bg-8x-cyan/20 border border-8x-cyan/30"
                  : "bg-black/50 border border-white/10"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {overlay.type === "skip" && (
                  <span className="text-8x-orange text-xs font-semibold uppercase tracking-wider block mb-1">
                    Skipping
                  </span>
                )}
                {overlay.type === "key" && (
                  <span className="text-8x-cyan text-xs font-semibold uppercase tracking-wider block mb-1">
                    Key Point
                  </span>
                )}
                <p className="text-white text-sm leading-relaxed">
                  {overlay.text}
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="flex-shrink-0 text-white/50 hover:text-white transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
