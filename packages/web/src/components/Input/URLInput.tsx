import { useState } from "react";
import { motion } from "framer-motion";

function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = input.trim().match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function URLInput({ onSubmit }: { onSubmit: (videoId: string) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(url);
    if (id) {
      setError("");
      onSubmit(id);
    } else {
      setError("Couldn't find a YouTube video ID in that URL");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="Paste a YouTube URL..."
          className="flex-1 px-5 py-4 bg-8x-surface border border-8x-border rounded-2xl text-8x-white placeholder:text-8x-muted focus:outline-none focus:border-8x-pink focus:ring-1 focus:ring-8x-pink transition-colors text-lg"
          autoFocus
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-8x-pink text-white font-semibold rounded-2xl hover:brightness-110 transition-all text-lg"
        >
          Go
        </motion.button>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-8x-orange text-sm"
        >
          {error}
        </motion.p>
      )}
    </form>
  );
}
