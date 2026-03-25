export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export async function fetchTranscript(
  videoId: string,
): Promise<TranscriptEntry[]> {
  // Fetch the YouTube page to get captions data
  const pageRes = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
  );

  const html = await pageRes.text();

  // Extract captions URL from the page
  const captionsMatch = html.match(
    /"captions":.*?"captionTracks":\s*(\[.*?\])/s,
  );
  if (!captionsMatch) {
    throw new Error("No captions found for this video");
  }

  const tracks = JSON.parse(captionsMatch[1]);
  // Prefer English, fall back to first available
  const track =
    tracks.find(
      (t: { languageCode: string }) =>
        t.languageCode === "en" || t.languageCode === "en-US",
    ) || tracks[0];

  if (!track?.baseUrl) {
    throw new Error("No caption track URL found");
  }

  // Fetch the actual captions XML
  const captionsRes = await fetch(track.baseUrl);
  const xml = await captionsRes.text();

  // Parse the XML transcript
  const entries: TranscriptEntry[] = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    entries.push({
      start: parseFloat(match[1]),
      duration: parseFloat(match[2]),
      text: decodeXMLEntities(match[3]),
    });
  }

  if (entries.length === 0) {
    throw new Error("Transcript was empty");
  }

  return entries;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, " ");
}
