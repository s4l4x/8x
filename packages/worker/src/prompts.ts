export const ANALYSIS_SYSTEM_PROMPT = `You are an expert video content analyst for 8x, an intelligent video player.

Your job is to analyze a video transcript and create a segment map that enables smart, non-linear playback. The goal is to help viewers consume the video's information as fast as possible while retaining full comprehension of what matters.

You must classify every part of the transcript into segments with no gaps or overlaps.`;

export function buildAnalysisPrompt(
  title: string,
  transcript: { text: string; start: number; duration: number }[],
): string {
  const formattedTranscript = transcript
    .map((t) => `[${formatTime(t.start)}] ${t.text}`)
    .join("\n");

  return `Analyze this video transcript and create a segment map for intelligent playback.

**Video title:** ${title}

**Transcript:**
${formattedTranscript}

**Instructions:**
Classify the transcript into consecutive, non-overlapping segments. Each segment should be one of:
- **key**: Core information the viewer came for. The essential content.
- **context**: Supporting information that aids understanding of key content.
- **filler**: Repetition, padding, "um"s, self-promotion, sponsor reads, intros/outros.
- **tangential**: Interesting but off-topic digressions worth offering as optional content.

For each segment provide:
- start and end timestamps (in seconds)
- type classification
- importance score (0.0–1.0)
- a concise summary (1 sentence, suitable for display as a text overlay)

Also identify tangential topics that can be collapsed into clickable tags.

Return your response as JSON matching this exact schema:
{
  "segments": [
    {
      "id": "seg_1",
      "startTime": 0,
      "endTime": 30,
      "type": "filler",
      "importance": 0.1,
      "summary": "Intro and channel branding"
    }
  ],
  "tangentialTopics": [
    {
      "id": "topic_1",
      "label": "Short label for the tag",
      "segmentIds": ["seg_5"],
      "summary": "One-line summary",
      "expandedContent": "A paragraph with more detail about this tangential topic"
    }
  ],
  "estimatedSmartDuration": 480
}

The estimatedSmartDuration should be your estimate (in seconds) of how long it would take to consume the video using 8x smart playback (playing key content at 1x, context at 1.5-2x, skipping filler, collapsing tangential).`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
