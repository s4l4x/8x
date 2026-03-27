import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const CACHE_DIR = path.resolve(import.meta.dirname, "../cache");

export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
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
        console.warn(`yt-dlp transcript exited with code ${code}`);
      }
      resolve(stdout);
    });
    proc.on("error", reject);
  });
}

export async function fetchTranscript(
  videoId: string,
): Promise<TranscriptEntry[]> {
  const subtitlePath = path.join(CACHE_DIR, `${videoId}.en.json3`);

  // Check cache
  if (fs.existsSync(subtitlePath)) {
    return parseJson3(subtitlePath);
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Try auto-generated English subs first
  await runYtDlp([
    "--write-auto-sub",
    "--sub-lang", "en",
    "--sub-format", "json3",
    "--skip-download",
    "--no-playlist",
    "-o", path.join(CACHE_DIR, `${videoId}`),
    url,
  ]);

  if (!fs.existsSync(subtitlePath)) {
    // Try manual subs
    await runYtDlp([
      "--write-sub",
      "--sub-lang", "en",
      "--sub-format", "json3",
      "--skip-download",
      "--no-playlist",
      "-o", path.join(CACHE_DIR, `${videoId}`),
      url,
    ]);
  }

  if (!fs.existsSync(subtitlePath)) {
    throw new Error("No English captions available for this video");
  }

  return parseJson3(subtitlePath);
}

function parseJson3(filePath: string): TranscriptEntry[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const events: TranscriptEntry[] = [];

  for (const event of raw.events || []) {
    if (!event.segs) continue;

    const text = event.segs
      .map((s: { utf8?: string }) => s.utf8 || "")
      .join("")
      .trim();

    if (!text || text === "[Music]" || text === "[Applause]") continue;

    const start = (event.tStartMs || 0) / 1000;
    const duration = (event.dDurationMs || 0) / 1000;

    events.push({ text, start, duration });
  }

  // Merge entries that are very close together into larger chunks
  const merged: TranscriptEntry[] = [];
  let current: TranscriptEntry | null = null;

  for (const entry of events) {
    if (!current) {
      current = { ...entry };
      continue;
    }

    const gap = entry.start - (current.start + current.duration);
    if (gap < 1.0 && current.text.length < 200) {
      current.text += " " + entry.text;
      current.duration = entry.start + entry.duration - current.start;
    } else {
      merged.push(current);
      current = { ...entry };
    }
  }
  if (current) merged.push(current);

  return merged;
}
