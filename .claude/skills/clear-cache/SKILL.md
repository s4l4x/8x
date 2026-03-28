---
name: clear-cache
description: Clear cached media, transcripts, and analysis results from the media server cache directory
disable-model-invocation: true
allowed-tools: Bash
---

Delete all cached files from `packages/media-server/cache/`. Accepts an optional videoId argument to clear only that video's files.

If `$ARGUMENTS` contains a videoId (11-character string), delete only files matching that videoId. Otherwise delete all cached files.

```bash
CACHE_DIR="packages/media-server/cache"

if [ -n "$ARGUMENTS" ]; then
  echo "Clearing cache for video: $ARGUMENTS"
  rm -f "$CACHE_DIR/$ARGUMENTS".*
else
  echo "Clearing all cached files..."
  rm -f "$CACHE_DIR"/*.mp4 "$CACHE_DIR"/*.m4a "$CACHE_DIR"/*.json3 "$CACHE_DIR"/*.json
fi
```

After running, list remaining files in the cache directory to confirm.
