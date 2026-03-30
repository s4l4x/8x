---
name: clear-cache
description: Clear cached media, transcripts, and analysis results from the media server cache directory
disable-model-invocation: true
allowed-tools: Bash
---

Delete all cached files from `packages/media-server/cache/`. Accepts an optional videoId argument to clear only that video's files.

If `$ARGUMENTS` contains a videoId (11-character string), delete only files matching that videoId. Otherwise delete all cached files.

```bash
CACHE_DIR="$SKILL_DIR/../../../packages/media-server/cache"

if [ -n "$ARGUMENTS" ]; then
  # Validate videoId: must be exactly 11 alphanumeric/dash/underscore characters
  if ! echo "$ARGUMENTS" | grep -qE '^[a-zA-Z0-9_-]{11}$'; then
    echo "Error: Invalid video ID '$ARGUMENTS'. Must be 11 characters [a-zA-Z0-9_-]."
    exit 1
  fi
  echo "Clearing cache for video: $ARGUMENTS"
  find "$CACHE_DIR" -maxdepth 1 -name "$ARGUMENTS.*" -type f -delete
else
  echo "Clearing all cached files..."
  find "$CACHE_DIR" -maxdepth 1 -type f \( -name "*.mp4" -o -name "*.m4a" -o -name "*.json3" -o -name "*.json" \) -delete
fi

echo "Remaining files:"
ls "$CACHE_DIR"/ 2>/dev/null || echo "(empty)"
```
