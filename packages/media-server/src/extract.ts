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

export type ExtractStep = "video" | "audio" | "merge" | "metadata";

export interface ExtractEvent {
  step: ExtractStep;
  progress: number; // 0-100 within this step
  detail?: string;
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function runYtDlp(
  args: string[],
  onEvent?: (event: ExtractEvent) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";
    let currentStep: ExtractStep = "video";

    const parseChunk = (chunk: string) => {
      if (!onEvent) return;

      // Detect which file is being downloaded
      if (chunk.includes("Destination:")) {
        if (chunk.includes(".m4a") || chunk.includes(".audio")) {
          currentStep = "audio";
        } else {
          currentStep = "video";
        }
      }

      // Parse progress percentage
      const dlMatch = chunk.match(
        /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\w+)(?:\s+at\s+([\d.]+\w+\/s))?(?:\s+ETA\s+(\S+))?/,
      );
      if (dlMatch) {
        const [, pct, size, speed, eta] = dlMatch;
        let detail = `${pct}% of ${size}`;
        if (speed) detail += ` at ${speed}`;
        if (eta && eta !== "Unknown") detail += ` — ${eta}`;
        onEvent({ step: currentStep, progress: parseFloat(pct), detail });
      }

      // Merger step
      if (chunk.includes("[Merger]")) {
        onEvent({ step: "merge", progress: 50 });
      }
    };

    proc.stdout.on("data", (d) => {
      const chunk = d.toString();
      stdout += chunk;
      parseChunk(chunk);
    });
    proc.stderr.on("data", (d) => {
      const chunk = d.toString();
      stderr += chunk;
      parseChunk(chunk);
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
  onEvent?: (event: ExtractEvent) => void,
): Promise<ExtractResult> {
  ensureCacheDir();

  const combinedPath = path.join(CACHE_DIR, `${videoId}.mp4`);
  const videoPath = path.join(CACHE_DIR, `${videoId}.video.mp4`);
  const audioPath = path.join(CACHE_DIR, `${videoId}.audio.m4a`);

  // Check cache
  if (fs.existsSync(combinedPath)) {
    onEvent?.({ step: "video", progress: 100 });
    onEvent?.({ step: "audio", progress: 100 });
    onEvent?.({ step: "merge", progress: 100 });
    onEvent?.({ step: "metadata", progress: 0 });
    const info = await getVideoInfo(videoId);
    onEvent?.({ step: "metadata", progress: 100 });
    return { combinedPath, videoPath, audioPath, ...info };
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  await runYtDlp(
    [
      "-f", "bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "--newline",
      "-o", combinedPath,
      "--no-playlist",
      url,
    ],
    onEvent,
  );

  if (!fs.existsSync(combinedPath)) {
    throw new Error("Video extraction failed — file not found");
  }

  onEvent?.({ step: "merge", progress: 100 });
  onEvent?.({ step: "metadata", progress: 0 });
  const info = await getVideoInfo(videoId);
  onEvent?.({ step: "metadata", progress: 100 });
  return { combinedPath, videoPath, audioPath, ...info };
}
