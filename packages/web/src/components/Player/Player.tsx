import { useEffect } from "react";
import { motion } from "framer-motion";
import { VideoElement } from "./VideoElement";
import { useVideoStore } from "../../stores/videoStore";

interface PlayerProps {
  videoId: string;
  onBack: () => void;
}

export function Player({ videoId, onBack }: PlayerProps) {
  const { media, loading, error, loadVideo } = useVideoStore();

  useEffect(() => {
    loadVideo(videoId);
  }, [videoId, loadVideo]);

  if (error) {
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

  if (loading || !media) {
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

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      <div className="w-full max-w-5xl">
        <button
          onClick={onBack}
          className="mb-4 text-8x-muted hover:text-8x-white transition-colors text-sm"
        >
          &larr; Back
        </button>
        <h2 className="text-xl font-semibold text-8x-white mb-4">
          {media.title}
        </h2>
        <div className="relative w-full rounded-2xl overflow-hidden bg-8x-dark">
          <VideoElement url={media.url} />
        </div>
      </div>
    </div>
  );
}
