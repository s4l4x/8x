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

// Task-based progress tracking
interface Task {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
  detail?: string;
  weight: number; // relative weight for overall progress
  progress: number; // 0-100 within this task
}

function computeOverall(tasks: Task[]): number {
  const totalWeight = tasks.reduce((s, t) => s + t.weight, 0);
  return tasks.reduce((s, t) => s + (t.progress / 100) * (t.weight / totalWeight) * 100, 0);
}

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

  const tasks: Task[] = [
    { id: "video", label: "Download video", status: "active", weight: 35, progress: 0 },
    { id: "audio", label: "Download audio", status: "pending", weight: 30, progress: 0 },
    { id: "merge", label: "Mux video & audio", status: "pending", weight: 5, progress: 0 },
    { id: "metadata", label: "Fetch metadata", status: "pending", weight: 5, progress: 0 },
    { id: "transcript", label: "Download transcript", status: "pending", weight: 10, progress: 0 },
    { id: "analysis", label: "AI analysis", status: "pending", weight: 15, progress: 0 },
  ];

  const getTask = (id: string) => tasks.find((t) => t.id === id)!;

  const emitProgress = () => {
    send("progress", {
      overallProgress: Math.round(computeOverall(tasks)),
      tasks: tasks.map(({ id, label, status, detail }) => ({ id, label, status, detail })),
    });
  };

  const markActive = (id: string, detail?: string) => {
    const t = getTask(id);
    t.status = "active";
    t.detail = detail;
    emitProgress();
  };

  const markDone = (id: string) => {
    const t = getTask(id);
    t.status = "done";
    t.progress = 100;
    t.detail = undefined;
    emitProgress();
  };

  try {
    // Step 1: Extract media
    emitProgress();
    const result = await extractStreams(videoId, (event) => {
      const t = getTask(event.step);
      t.status = "active";
      t.progress = event.progress;
      t.detail = event.detail;
      if (event.progress >= 100) {
        t.status = "done";
        t.detail = undefined;
      }
      emitProgress();
    });

    // Mark extraction tasks done
    for (const id of ["video", "audio", "merge", "metadata"]) {
      markDone(id);
    }

    const media = {
      url: `/api/media/stream/${videoId}`,
      videoUrl: `/api/media/stream/${videoId}/video`,
      audioUrl: `/api/media/stream/${videoId}/audio`,
      title: result.title,
      duration: result.duration,
    };
    send("media", media);

    // Step 2: Fetch transcript
    markActive("transcript", "Downloading captions...");
    const transcript = await fetchTranscript(videoId, (message) => {
      getTask("transcript").detail = message;
      emitProgress();
    });
    markDone("transcript");

    // Step 3: Analysis
    const cachePath = path.resolve(
      import.meta.dirname,
      `../cache/${videoId}.analysis.json`,
    );

    let analysis;
    if (fs.existsSync(cachePath)) {
      markActive("analysis", "Loading cached analysis");
      analysis = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } else {
      markActive("analysis", "Sending to Claude...");
      analysis = await analyzeTranscript(result.title, transcript, (message) => {
        getTask("analysis").detail = message;
        emitProgress();
      });
      fs.writeFileSync(cachePath, JSON.stringify(analysis, null, 2));
    }
    markDone("analysis");

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
