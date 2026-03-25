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

function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
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

export async function extractStreams(videoId: string): Promise<ExtractResult> {
  ensureCacheDir();

  const combinedPath = path.join(CACHE_DIR, `${videoId}.mp4`);
  const videoPath = path.join(CACHE_DIR, `${videoId}.video.mp4`);
  const audioPath = path.join(CACHE_DIR, `${videoId}.audio.m4a`);

  // Check cache — only need combined for now
  if (fs.existsSync(combinedPath)) {
    const info = await getVideoInfo(videoId);
    return { combinedPath, videoPath, audioPath, ...info };
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Download best video+audio merged into mp4
  await runYtDlp([
    "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    "--merge-output-format", "mp4",
    "-o", combinedPath,
    "--no-playlist",
    url,
  ]);

  if (!fs.existsSync(combinedPath)) {
    throw new Error("Video extraction failed — file not found");
  }

  const info = await getVideoInfo(videoId);
  return { combinedPath, videoPath, audioPath, ...info };
}
