import { fetchTranscript } from "./transcript";
import { analyzeTranscript } from "./analyze";

interface Env {
  ANTHROPIC_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /api/transcript?videoId=xxx
      if (url.pathname === "/api/transcript" && request.method === "GET") {
        const videoId = url.searchParams.get("videoId");
        if (!videoId) {
          return json({ error: "videoId required" }, 400, corsHeaders);
        }

        const transcript = await fetchTranscript(videoId);
        return json({ transcript }, 200, corsHeaders);
      }

      // POST /api/analyze { videoId, title, transcript }
      if (url.pathname === "/api/analyze" && request.method === "POST") {
        const body = await request.json<{
          title: string;
          transcript: { text: string; start: number; duration: number }[];
        }>();

        if (!env.ANTHROPIC_API_KEY) {
          return json(
            { error: "ANTHROPIC_API_KEY not configured" },
            500,
            corsHeaders,
          );
        }

        const analysis = await analyzeTranscript(
          env.ANTHROPIC_API_KEY,
          body.title,
          body.transcript,
        );
        return json(analysis, 200, corsHeaders);
      }

      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("Worker error:", err);
      return json({ error: message }, 500, corsHeaders);
    }
  },
};

function json(
  data: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}
