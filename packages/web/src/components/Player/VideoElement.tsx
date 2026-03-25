import { useRef, useEffect } from "react";
import { usePlaybackStore } from "../../stores/playbackStore";

interface VideoElementProps {
  url: string;
}

export function VideoElement({ url }: VideoElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { speed, setPlaying, setCurrentTime, setDuration } =
    usePlaybackStore();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
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
  }, [setCurrentTime, setDuration, setPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  return (
    <video
      ref={videoRef}
      src={url}
      className="w-full aspect-video"
      controls
      playsInline
    />
  );
}
