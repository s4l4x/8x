import type { MediaStreams, VideoAnalysis, Segment } from "./types";

const MEDIA_SERVER = "/api/media";

type AnalysisStage = "extracting" | "transcribing" | "analyzing";

interface SSEProgressEvent {
  stage: AnalysisStage;
  message: string;
  progress?: number;
}

interface AnalysisResponse {
  segments: Omit<Segment, "playbackStrategy">[];
  tangentialTopics: VideoAnalysis["tangentialTopics"];
  estimatedSmartDuration: number;
}

interface ProcessCallbacks {
  onProgress: (stage: AnalysisStage, message: string, progress?: number) => void;
  onMedia: (media: MediaStreams) => void;
  onAnalysis: (analysis: AnalysisResponse) => void;
  onError: (error: string) => void;
}

export function processVideo(
  videoId: string,
  callbacks: ProcessCallbacks,
): () => void {
  const eventSource = new EventSource(`${MEDIA_SERVER}/process/${videoId}`);
  let completed = false;

  eventSource.addEventListener("progress", (e) => {
    const data: SSEProgressEvent = JSON.parse(e.data);
    callbacks.onProgress(data.stage, data.message, data.progress);
  });

  eventSource.addEventListener("media", (e) => {
    const media: MediaStreams = JSON.parse(e.data);
    callbacks.onMedia(media);
  });

  eventSource.addEventListener("analysis", (e) => {
    const analysis: AnalysisResponse = JSON.parse(e.data);
    callbacks.onAnalysis(analysis);
  });

  eventSource.addEventListener("error", (e) => {
    // Ignore connection-close errors after successful completion
    if (completed) return;
    if (e instanceof MessageEvent) {
      const data = JSON.parse(e.data);
      callbacks.onError(data.message);
    } else {
      callbacks.onError("Connection lost");
    }
    eventSource.close();
  });

  eventSource.addEventListener("done", () => {
    completed = true;
    eventSource.close();
  });

  // Return cleanup function
  return () => eventSource.close();
}
