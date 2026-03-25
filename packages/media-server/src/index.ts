import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { extractStreams } from "./extract.js";

const app = express();
const PORT = 3001;

app.use(cors());

// Extract video+audio for a given YouTube video ID
app.get("/api/media/extract/:videoId", async (req, res) => {
  const { videoId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    res.status(400).json({ error: "Invalid video ID" });
    return;
  }

  try {
    console.log(`Extracting streams for ${videoId}...`);
    const result = await extractStreams(videoId);
    console.log(`Extraction complete: ${result.title}`);

    res.json({
      url: `/api/media/stream/${videoId}`,
      videoUrl: `/api/media/stream/${videoId}/video`,
      audioUrl: `/api/media/stream/${videoId}/audio`,
      title: result.title,
      duration: result.duration,
    });
  } catch (err) {
    console.error("Extraction failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Extraction failed",
    });
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
