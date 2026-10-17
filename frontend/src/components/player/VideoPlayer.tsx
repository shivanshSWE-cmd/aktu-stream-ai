"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Video } from "@/lib/types";

interface VideoPlayerProps {
  video: Video;
  seekTime?: number | null;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({ video, seekTime, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isHlsSupported, setIsHlsSupported] = useState(true);

  const isNative = video.source_type === "NATIVE" || !video.youtube_video_id;

  // Handle external seek requests (e.g. from transcript clicks)
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTime;
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [seekTime]);

  // Initialize HLS for Native Uploads
  useEffect(() => {
    if (!isNative || !videoRef.current || !video.s3_hls_master_url) return;

    const videoEl = videoRef.current;
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true,
      });
      hls.loadSource(video.s3_hls_master_url);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsHlsSupported(true);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn("HLS Error:", data);
        }
      });
    } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      videoEl.src = video.s3_hls_master_url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [video.s3_hls_master_url, isNative]);

  // Video Event Handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (onTimeUpdate) {
      onTimeUpdate(curr);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || video.duration_seconds || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Render YouTube Embed if YouTube source
  if (!isNative && video.youtube_video_id) {
    const embedUrl = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&enablejsapi=1${
      seekTime ? `&start=${Math.floor(seekTime)}` : ""
    }`;

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl">
        <iframe
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  // Render Native HLS Player
  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl select-none"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={video.thumbnail_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
      />

      {/* Control Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Scrubber */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1 hover:text-indigo-400 transition-colors"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}
              className="p-1 hover:text-indigo-400 transition-colors"
              title="Rewind 10s"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="p-1 hover:text-indigo-400 transition-colors">
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <span className="font-mono text-gray-300 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded bg-gray-800/80 hover:bg-gray-700 font-semibold text-[11px]"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-gray-900 border border-gray-800 rounded-lg shadow-xl py-1 w-20 z-20">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`w-full px-3 py-1 text-left hover:bg-indigo-600/30 ${
                        playbackRate === rate ? "text-indigo-400 font-bold" : "text-gray-300"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-indigo-400 transition-colors"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
