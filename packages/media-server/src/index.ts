import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });
import express from "express";
import cors from "cors";
import fs from "fs";
import { extractStreams } from "./extract.js";
import { fetchTranscript } from "./transcript.js";
import { analyzeTranscript } from "./analyze.js";

const app = express();
const PORT = 3001;

app.use(cors());

// Full pipeline with SSE progress reporting
app.get("/api/media/process/:videoId", async (req, res) => {
  const { videoId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    res.status(400).json({ error: "Invalid video ID" });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Step 1: Extract media
    send("progress", { stage: "extracting", message: "Starting extraction...", progress: 0 });
    const result = await extractStreams(videoId, (message, progress) => {
      send("progress", { stage: "extracting", message, progress });
    });

    const media = {
      url: `/api/media/stream/${videoId}`,
      videoUrl: `/api/media/stream/${videoId}/video`,
      audioUrl: `/api/media/stream/${videoId}/audio`,
      title: result.title,
      duration: result.duration,
    };
    send("media", media);

    // Step 2: Fetch transcript
    send("progress", { stage: "transcribing", message: "Fetching transcript..." });
    const transcript = await fetchTranscript(videoId, (message) => {
      send("progress", { stage: "transcribing", message });
    });
    send("progress", {
      stage: "transcribing",
      message: `Transcript loaded — ${transcript.length} entries`,
    });

    // Step 3: Check analysis cache
    const cachePath = path.resolve(
      import.meta.dirname,
      `../cache/${videoId}.analysis.json`,
    );

    let analysis;
    if (fs.existsSync(cachePath)) {
      send("progress", { stage: "analyzing", message: "Found cached analysis" });
      analysis = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } else {
      send("progress", { stage: "analyzing", message: "Starting AI analysis..." });
      analysis = await analyzeTranscript(result.title, transcript, (message) => {
        send("progress", { stage: "analyzing", message });
      });

      // Cache result
      fs.writeFileSync(cachePath, JSON.stringify(analysis, null, 2));
    }

    send("analysis", analysis);
    send("done", {});
    res.end();
  } catch (err) {
    send("error", {
      message: err instanceof Error ? err.message : "Processing failed",
    });
    res.end();
  }
});

// Stream combined video+audio
app.get("/api/media/stream/:videoId", (req, res) => {
  const filePath = path.resolve(
    import.meta.dirname,
    `../cache/${req.params.videoId}.mp4`,
  );
  streamFile(filePath, "video/mp4", req, res);
});

// Stream video-only file
app.get("/api/media/stream/:videoId/video", (req, res) => {
  const filePath = path.resolve(
    import.meta.dirname,
    `../cache/${req.params.videoId}.video.mp4`,
  );
  streamFile(filePath, "video/mp4", req, res);
});

// Stream audio file
app.get("/api/media/stream/:videoId/audio", (req, res) => {
  const filePath = path.resolve(
    import.meta.dirname,
    `../cache/${req.params.videoId}.audio.m4a`,
  );
  streamFile(filePath, "audio/mp4", req, res);
});

function streamFile(
  filePath: string,
  contentType: string,
  req: express.Request,
  res: express.Response,
) {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });

    fs.createReadStream(filePath).pipe(res);
  }
}

app.listen(PORT, () => {
  console.log(`🎬 8x media server running on http://localhost:${PORT}`);
});
