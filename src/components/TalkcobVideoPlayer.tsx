import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TalkcobIcon } from './TalkcobIcon';

interface TalkcobVideoPlayerProps {
  src: string;
  name: string;
  size?: number;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2] as const;

export const TalkcobVideoPlayer: React.FC<TalkcobVideoPlayerProps> = ({ src, name, size }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasError, setHasError] = useState(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2400);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused || vid.ended) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const skipBy = (deltaSeconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + deltaSeconds));
    vid.currentTime = next;
    setCurrentTime(next);
    bumpControls();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = Number(e.target.value);
    vid.currentTime = next;
    setCurrentTime(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    const next = Number(e.target.value);
    setVolume(next);
    const muted = next === 0;
    setIsMuted(muted);
    if (vid) {
      vid.volume = next;
      vid.muted = muted;
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (vid) {
      vid.muted = nextMuted;
      if (!nextMuted && vid.volume === 0) {
        vid.volume = 0.7;
        setVolume(0.7);
      }
    }
  };

  const cycleSpeed = () => {
    const vid = videoRef.current;
    const idx = SPEED_OPTIONS.indexOf(playbackRate as (typeof SPEED_OPTIONS)[number]);
    const nextRate = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
    if (vid) vid.playbackRate = nextRate;
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen denial
    }
  };

  const togglePiP = async () => {
    const vid = videoRef.current;
    if (!vid || typeof document === 'undefined') return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (typeof vid.requestPictureInPicture === 'function') {
        await vid.requestPictureInPicture();
      }
    } catch {
      // Ignore PiP unsupported
    }
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const sizeLabel = formatFileSize(size);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={bumpControls}
      onMouseEnter={() => setControlsVisible(true)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          togglePlay();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          skipBy(-5);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          skipBy(5);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleMute();
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          void toggleFullscreen();
        }
      }}
      aria-label={`Talkcob Video Player: ${name}`}
      className={`group/player relative w-full max-w-[520px] rounded-xl overflow-hidden border border-[#2E3035] bg-[#0B0C0E] shadow-xl select-none focus:outline-none focus:ring-2 focus:ring-[#E53935] ${
        isFullscreen ? 'max-w-none w-screen h-screen rounded-none flex items-center justify-center' : ''
      }`}
    >
      {/* Underlying HTML5 video (browser native controls disabled — custom Talkcob HUD below) */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        controls={false}
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setControlsVisible(true);
        }}
        onLoadedMetadata={(e) => {
          const vid = e.currentTarget;
          setDuration(vid.duration || 0);
          vid.volume = volume;
          vid.muted = isMuted;
        }}
        onTimeUpdate={(e) => {
          const vid = e.currentTarget;
          setCurrentTime(vid.currentTime || 0);
          if (vid.buffered.length > 0 && vid.duration > 0) {
            const end = vid.buffered.end(vid.buffered.length - 1);
            setBufferedPct(Math.min(100, (end / vid.duration) * 100));
          }
        }}
        onError={() => setHasError(true)}
        className={`w-full bg-black cursor-pointer object-contain ${
          isFullscreen ? 'h-full' : 'max-h-[340px] min-h-[200px]'
        }`}
      />

      {/* Top Overlay Header Bar */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 px-3.5 py-2.5 bg-gradient-to-b from-black/85 via-black/45 to-transparent flex items-center justify-between gap-3 transition-opacity duration-200 ${
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-bold tracking-wide shrink-0">
            <TalkcobIcon size={12} variant="mark" mascotColor="#FFFFFF" />
            <span>PLAYER</span>
          </span>
          <span className="text-xs font-semibold text-white truncate">{name}</span>
          {sizeLabel && (
            <span className="text-[11px] text-[#B5BAC1] shrink-0 tabular-nums">{sizeLabel}</span>
          )}
        </div>

        <a
          href={src}
          download={name}
          onClick={(e) => e.stopPropagation()}
          title={`Download ${name}`}
          className="pointer-events-auto p-1.5 rounded-md bg-black/50 hover:bg-[#E53935] text-white transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Center Play Overlay (when paused or error) */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
          <Film className="w-8 h-8 text-[#EF4444] mb-2" />
          <p className="text-xs font-semibold">Unable to decode this video format in browser.</p>
          <a
            href={src}
            download={name}
            className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold"
          >
            Download Clip
          </a>
        </div>
      ) : (
        !isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play video"
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#E53935]/90 hover:bg-[#E53935] text-white shadow-2xl shadow-black/60 flex items-center justify-center transition-transform hover:scale-105 ring-4 ring-black/35"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
        )
      )}

      {/* Bottom Talkcob Custom Player Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 px-3 pt-6 pb-2.5 bg-gradient-to-t from-black/90 via-black/65 to-transparent space-y-2 transition-opacity duration-200 ${
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Scrubbing Timeline */}
        <div className="relative h-4 flex items-center group/seek">
          <div className="w-full h-1.5 group-hover/seek:h-2 transition-all rounded-full bg-white/20 overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-white/35"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-[#E53935]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek video timeline"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="pointer-events-none absolute w-3 h-3 rounded-full bg-white ring-2 ring-[#E53935] shadow opacity-0 group-hover/seek:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={() => skipBy(-10)}
              title="Back 10s"
              aria-label="Skip back 10 seconds"
              className="p-1.5 rounded-md hover:bg-white/15 transition-colors text-[#E2E8F0]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => skipBy(10)}
              title="Forward 10s"
              aria-label="Skip forward 10 seconds"
              className="p-1.5 rounded-md hover:bg-white/15 transition-colors text-[#E2E8F0]"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-[#EF4444]" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Video volume"
                className="w-14 sm:w-16 accent-[#E53935] h-1 cursor-pointer"
              />
            </div>

            <span className="ml-1.5 text-[11px] font-mono text-[#E2E8F0] tabular-nums">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cycleSpeed}
              title="Playback speed"
              className="px-1.5 py-1 rounded-md hover:bg-white/15 text-[11px] font-mono font-bold text-[#FACC15] transition-colors"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={() => void togglePiP()}
              title="Picture-in-Picture"
              aria-label="Picture in Picture"
              className="hidden sm:inline-flex p-1.5 rounded-md hover:bg-white/15 transition-colors"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
