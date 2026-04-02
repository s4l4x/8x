export interface TopicGroup {
  title: string;
  segments: Segment[];
}

export interface VideoAnalysis {
  videoId: string;
  title: string;
  totalDuration: number;
  segments: Segment[];
  topics?: TopicGroup[];
  tangentialTopics: TangentialTopic[];
  estimatedSmartDuration: number;
}

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  type: "key" | "context" | "filler" | "tangential";
  importance: number;
  summary: string;
  playbackStrategy: PlaybackStrategy;
}

export interface PlaybackStrategy {
  action: "play" | "speed" | "skip";
  speed?: number;
  videoSpeed?: number;
  audioSpeed?: number;
  showOverlay?: boolean;
  audioFade?: number;
  pitchCorrect?: boolean;
}

export interface TangentialTopic {
  id: string;
  label: string;
  segmentIds: string[];
  summary: string;
  expandedContent: string;
}

export interface MediaStreams {
  url: string;
  videoUrl: string;
  audioUrl: string;
  title: string;
  duration: number;
}
