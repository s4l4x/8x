import { useState } from "react";
import { URLInput } from "./components/Input/URLInput";
import { Player } from "./components/Player/Player";

export function App() {
  const [videoId, setVideoId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-8x-black">
      {!videoId ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
          <div className="text-center">
            <h1 className="text-6xl font-bold font-display tracking-tight">
              <span className="text-8x-pink">8</span>
              <span className="text-8x-white">x</span>
            </h1>
            <p className="mt-3 text-8x-muted text-lg">
              Watch smarter, not longer
            </p>
          </div>
          <URLInput onSubmit={setVideoId} />
        </div>
      ) : (
        <Player videoId={videoId} onBack={() => setVideoId(null)} />
      )}
    </div>
  );
}
