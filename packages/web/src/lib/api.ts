import type { MediaStreams } from "./types";

const MEDIA_SERVER = "/api/media";

export async function extractMedia(videoId: string): Promise<MediaStreams> {
  const res = await fetch(`${MEDIA_SERVER}/extract/${videoId}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Media extraction failed: ${err}`);
  }
  return res.json();
}
