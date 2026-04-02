import Anthropic from "@anthropic-ai/sdk";
import type { TranscriptEntry } from "./transcript.js";

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  type: "key" | "context" | "filler" | "tangential";
  importance: number;
  summary: string;
}

export interface TangentialTopic {
  id: string;
  label: string;
  segmentIds: string[];
  summary: string;
  expandedContent: string;
}

export interface AnalysisResult {
  segments: Segment[];
  tangentialTopics: TangentialTopic[];
  estimatedSmartDuration: number;
}

const SYSTEM_PROMPT = `You are an expert video content analyst for 8x, an intelligent video player.

Your job is to analyze a video transcript and create a segment map that enables smart, non-linear playback. The goal is to help viewers consume the video's information as fast as possible while retaining full comprehension of what matters.

You must classify every part of the transcript into segments with no gaps or overlaps. Return ONLY valid JSON, no markdown fences.`;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildPrompt(title: string, transcript: TranscriptEntry[]): string {
  const formatted = transcript
    .map((t) => `[${formatTime(t.start)}] ${t.text}`)
    .join("\n");

  return `Analyze this video transcript and create a segment map for intelligent playback.

**Video title:** ${title}

**Transcript:**
${formatted}

**Instructions:**
Classify the transcript into consecutive, non-overlapping segments. Each segment should be one of:
- **key**: Core information the viewer came for. The essential content.
- **context**: Supporting information that aids understanding of key content.
- **filler**: Repetition, padding, self-promotion, sponsor reads, intros/outros.
- **tangential**: Interesting but off-topic digressions worth offering as optional content.

For each segment provide:
- start and end timestamps (in seconds, matching the transcript timestamps)
- type classification
- importance score (0.0–1.0)
- a concise summary (1 sentence, suitable for display as a text overlay)

Also identify tangential topics that can be collapsed into clickable tags.

Return as JSON matching this exact schema (no markdown, just raw JSON):
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
      "expandedContent": "A paragraph with more detail"
    }
  ],
  "estimatedSmartDuration": 480
}

The estimatedSmartDuration is your estimate (in seconds) of how long it would take to consume this video using 8x smart playback.`;
}

export async function analyzeTranscript(
  title: string,
  transcript: TranscriptEntry[],
  onProgress?: (message: string) => void,
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set — create a .env file");
  }

  const client = new Anthropic({ apiKey });

  onProgress?.(`Sending ${transcript.length} transcript entries to Claude\u2026`);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildPrompt(title, transcript),
      },
    ],
  });

  let text = "";
  let lastSegCount = 0;

  stream.on("text", (chunk) => {
    text += chunk;
    // Count segments found so far — only report when count increases
    const segCount = (text.match(/"id"\s*:\s*"seg_/g) || []).length;
    if (segCount > lastSegCount) {
      lastSegCount = segCount;
      onProgress?.(`Building segment map\u2026 ${segCount} segments identified`);
    }
  });

  const finalMessage = await stream.finalMessage();

  const inputTokens = finalMessage.usage.input_tokens;
  const outputTokens = finalMessage.usage.output_tokens;
  onProgress?.(
    `Analysis complete — ${inputTokens} input tokens, ${outputTokens} output tokens`,
  );

  // Extract JSON — handle possible markdown fences
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();

  return JSON.parse(jsonStr) as AnalysisResult;
}
