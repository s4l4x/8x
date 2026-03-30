import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const CACHE_DIR = path.resolve(import.meta.dirname, "../cache");

export interface ExtractResult {
  combinedPath: string;
  videoPath: string;
  audioPath: string;
  title: string;
  duration: number;
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function runYtDlp(
  args: string[],
  onProgress?: (message: string, progress?: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";

    const parseProgress = (chunk: string) => {
      if (!onProgress) return;
      // Parse yt-dlp progress lines like "[download]  45.2% of ~100.00MiB at 5.00MiB/s ETA 00:10"
      const dlMatch = chunk.match(
        /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\w+)(?:\s+at\s+([\d.]+\w+\/s))?(?:\s+ETA\s+(\S+))?/,
      );
      if (dlMatch) {
        const [, pct, size, speed, eta] = dlMatch;
        let msg = `Downloading: ${pct}% of ${size}`;
        if (speed) msg += ` at ${speed}`;
        if (eta) msg += ` — ${eta} remaining`;
        onProgress(msg, parseFloat(pct));
      }
      // Parse merger step
      if (chunk.includes("[Merger]")) {
        onProgress("Merging video and audio streams...", 100);
      }
    };

    proc.stdout.on("data", (d) => {
      const chunk = d.toString();
      stdout += chunk;
      parseProgress(chunk);
    });
    proc.stderr.on("data", (d) => {
      const chunk = d.toString();
      stderr += chunk;
      parseProgress(chunk);
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        console.warn(`yt-dlp exited with code ${code}, stderr:\n${stderr}`);
      }
      resolve(stdout);
    });
    proc.on("error", reject);
  });
}

export async function getVideoInfo(
  videoId: string,
): Promise<{ title: string; duration: number }> {
  const stdout = await runYtDlp([
    "--dump-json",
    "--no-download",
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);
  const info = JSON.parse(stdout);
  return { title: info.title, duration: info.duration };
}

export async function extractStreams(
  videoId: string,
  onProgress?: (message: string, progress?: number) => void,
): Promise<ExtractResult> {
  ensureCacheDir();

  const combinedPath = path.join(CACHE_DIR, `${videoId}.mp4`);
  const videoPath = path.join(CACHE_DIR, `${videoId}.video.mp4`);
  const audioPath = path.join(CACHE_DIR, `${videoId}.audio.m4a`);

  // Check cache — only need combined for now
  if (fs.existsSync(combinedPath)) {
    onProgress?.("Found cached video, loading metadata...");
    const info = await getVideoInfo(videoId);
    return { combinedPath, videoPath, audioPath, ...info };
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  onProgress?.("Starting download...");

  // Download best h264 video + aac audio, merged into mp4
  await runYtDlp(
    [
      "-f", "bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "--newline",
      "-o", combinedPath,
      "--no-playlist",
      url,
    ],
    onProgress,
  );

  if (!fs.existsSync(combinedPath)) {
    throw new Error("Video extraction failed — file not found");
  }

  onProgress?.("Fetching video metadata...");
  const info = await getVideoInfo(videoId);
  return { combinedPath, videoPath, audioPath, ...info };
}
