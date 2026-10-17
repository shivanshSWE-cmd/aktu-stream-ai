"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  CheckCircle2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Video } from "@/types";

interface UnifiedPlayerProps {
  video: Video;
  seekTime?: number | null;
  initialStartTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export function UnifiedPlayer({
  video,
  seekTime,
  initialStartTime = 0,
  onTimeUpdate,
  onEnded,
}: UnifiedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.duration_seconds || 0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [availableLevels, setAvailableLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  const isNative = video.source_type === "NATIVE" || !video.youtube_video_id;

  // Jump to seekTime if requested externally (e.g. transcript clicked)
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [seekTime]);

  // Set initial start time on first metadata load
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || video.duration_seconds || 0;
    setDuration(dur);

    if (initialStartTime > 0 && initialStartTime < dur * 0.95) {
      videoRef.current.currentTime = initialStartTime;
      setCurrentTime(initialStartTime);
    }
  }, [initialStartTime, video.duration_seconds]);

  // HLS stream configuration
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

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((lvl) => ({
          height: lvl.height,
          bitrate: lvl.bitrate,
        }));
        setAvailableLevels(levels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevelIndex(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn("HLS Stream Error:", data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = video.s3_hls_master_url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [video.s3_hls_master_url, isNative]);

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
      onTimeUpdate(curr, duration || videoRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
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

  // YouTube IFrame Player
  if (!isNative && video.youtube_video_id) {
    const startSec = Math.floor(seekTime || initialStartTime || 0);
    const embedUrl = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1${
      startSec > 0 ? `&start=${startSec}` : ""
    }`;

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-surface-border bg-black shadow-ambient-glow transition-all">
        <iframe
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  // Native Adaptive HLS Player with 16:9 aspect ratio and ambient glow
  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-surface-border bg-black shadow-ambient-glow select-none transition-all"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain cursor-pointer"
        poster={video.thumbnail_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
        playsInline
      />

      {/* Control Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background-dark/95 via-surface-dark/75 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-primary hover:accent-brand-primary/80 transition-all"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-text-primary text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1 hover:text-brand-primary transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}
              className="p-1 hover:text-brand-primary transition-colors"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 hover:text-brand-primary transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-text-secondary" />
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
                className="w-16 h-1 bg-surface-border rounded appearance-none cursor-pointer accent-brand-primary"
              />
            </div>

            <span className="font-mono text-text-secondary ml-2 text-[11px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className="px-2 py-1 rounded-lg bg-surface-dark border border-surface-border hover:bg-surface-border font-mono font-semibold text-[11px] text-text-primary transition-colors"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-surface-dark border border-surface-border rounded-xl shadow-2xl py-1 w-20 z-20">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`w-full px-3 py-1 text-left text-xs font-mono hover:bg-brand-primary/10 ${
                        playbackRate === rate ? "text-brand-primary font-bold" : "text-text-secondary"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            {availableLevels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className="p-1 hover:text-brand-primary transition-colors text-text-secondary"
                  title="Quality Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-9 right-0 bg-surface-dark border border-surface-border rounded-xl shadow-2xl py-1 w-28 z-20 text-xs">
                    <div className="px-3 py-1 font-mono font-bold text-text-secondary border-b border-surface-border text-[10px] uppercase">
                      Quality
                    </div>
                    <button
                      onClick={() => {
                        setCurrentLevelIndex(-1);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-brand-primary/10 flex items-center justify-between font-mono ${
                        currentLevelIndex === -1 ? "text-brand-primary font-bold" : "text-text-secondary"
                      }`}
                    >
                      <span>Auto</span>
                      {currentLevelIndex === -1 && <CheckCircle2 className="h-3 w-3 text-brand-primary" />}
                    </button>
                    {availableLevels.map((lvl, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentLevelIndex(idx);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left hover:bg-brand-primary/10 flex items-center justify-between font-mono ${
                          currentLevelIndex === idx ? "text-brand-primary font-bold" : "text-text-secondary"
                        }`}
                      >
                        <span>{lvl.height}p</span>
                        {currentLevelIndex === idx && <CheckCircle2 className="h-3 w-3 text-brand-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-brand-primary transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
