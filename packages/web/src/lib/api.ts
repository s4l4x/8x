import type { MediaStreams, VideoAnalysis, Segment } from "./types";

const MEDIA_SERVER = "/api/media";

export async function extractMedia(videoId: string): Promise<MediaStreams> {
  const res = await fetch(`${MEDIA_SERVER}/extract/${videoId}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Media extraction failed: ${err}`);
  }
  return res.json();
}

interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export async function fetchTranscript(
  videoId: string,
): Promise<TranscriptEntry[]> {
  const res = await fetch(`${MEDIA_SERVER}/transcript/${videoId}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Transcript fetch failed: ${err}`);
  }
  const data = await res.json();
  return data.transcript;
}

interface AnalysisResponse {
  segments: Omit<Segment, "playbackStrategy">[];
  tangentialTopics: VideoAnalysis["tangentialTopics"];
  estimatedSmartDuration: number;
}

export async function analyzeVideo(
  title: string,
  transcript: TranscriptEntry[],
): Promise<AnalysisResponse> {
  const res = await fetch(`${MEDIA_SERVER}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, transcript }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Analysis failed: ${err}`);
  }
  return res.json();
}
