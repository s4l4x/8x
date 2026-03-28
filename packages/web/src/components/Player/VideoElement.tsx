import { useEffect, forwardRef } from "react";
import { usePlaybackStore } from "../../stores/playbackStore";

interface VideoElementProps {
  url: string;
}

export const VideoElement = forwardRef<HTMLVideoElement, VideoElementProps>(
  function VideoElement({ url }, ref) {
    const { setPlaying, setCurrentTime, setDuration } = usePlaybackStore();

    useEffect(() => {
      const video =
        ref && "current" in ref ? ref.current : null;
      if (!video) return;

      const onTimeUpdate = () => {
        // Don't override store during scrub — scrubber sets currentTime directly
        if (!usePlaybackStore.getState().scrubbing) {
          setCurrentTime(video.currentTime);
        }
      };
      const onLoadedMetadata = () => setDuration(video.duration);
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);

      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);

      return () => {
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
      };
    }, [ref, setCurrentTime, setDuration, setPlaying]);

    return (
      <video
        ref={ref}
        src={url}
        className="w-full aspect-video"
        playsInline
      />
    );
  },
);
