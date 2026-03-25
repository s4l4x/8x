import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { TranscriptEntry } from "./transcript";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts";

const SegmentSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  type: z.enum(["key", "context", "filler", "tangential"]),
  importance: z.number().min(0).max(1),
  summary: z.string(),
});

const TangentialTopicSchema = z.object({
  id: z.string(),
  label: z.string(),
  segmentIds: z.array(z.string()),
  summary: z.string(),
  expandedContent: z.string(),
});

const AnalysisResponseSchema = z.object({
  segments: z.array(SegmentSchema),
  tangentialTopics: z.array(TangentialTopicSchema),
  estimatedSmartDuration: z.number(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export async function analyzeTranscript(
  apiKey: string,
  title: string,
  transcript: TranscriptEntry[],
): Promise<AnalysisResponse> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildAnalysisPrompt(title, transcript),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from the response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
    text.match(/```\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();

  const parsed = JSON.parse(jsonStr);
  return AnalysisResponseSchema.parse(parsed);
}
