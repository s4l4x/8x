import { motion, AnimatePresence } from "framer-motion";
import type { OverlayState } from "../../hooks/usePlaybackEngine";

interface OverlayLayerProps {
  overlay: OverlayState;
}

export function OverlayLayer({ overlay }: OverlayLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-start p-6 pb-20">
      {/* Summary/skip overlay */}
      <AnimatePresence>
        {overlay.visible && overlay.text && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className={`px-4 py-3 rounded-xl backdrop-blur-md max-w-[80%] ${
              overlay.type === "skip"
                ? "bg-8x-orange/20 border border-8x-orange/30"
                : overlay.type === "key"
                  ? "bg-8x-cyan/20 border border-8x-cyan/30"
                  : "bg-black/50 border border-white/10"
            }`}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
