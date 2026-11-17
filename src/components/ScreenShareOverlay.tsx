import React, { useEffect, useRef, useState } from 'react';
import {
  GripHorizontal,
  HeadphoneOff,
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  PictureInPicture2,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { User } from '../types/talkcob';
import { Avatar } from './Avatar';
import { TalkcobIcon } from './TalkcobIcon';

export type ScreenOverlayMode = 'inline' | 'floating' | 'theater';

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface SharedOverlayProps {
  stream: MediaStream;
  sharer: User;
  roomLabel: string;
  shareLabel?: string | null;
  mode: ScreenOverlayMode;
  onChangeMode: (mode: ScreenOverlayMode) => void;
  isMuted: boolean;
  isDeafened: boolean;
  micLevel: number;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onReshare?: () => void;
  onStopShare: () => void;
  onDisconnectCall?: () => void;
}

export const ScreenShareOverlay: React.FC<SharedOverlayProps> = ({
  stream,
  sharer,
  roomLabel,
  shareLabel,
  mode,
  onChangeMode,
  isMuted,
  isDeafened,
  micLevel,
  onToggleMute,
  onToggleDeafen,
  onReshare,
  onStopShare,
  onDisconnectCall,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const theaterRef = useRef<HTMLDivElement>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [hudVisible, setHudVisible] = useState(true);
  const [floatingLarge, setFloatingLarge] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, mode, floatingLarge]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const boxW = floatingLarge ? 440 : 320;
      const boxH = floatingLarge ? 270 : 205;
      const maxX = Math.max(12, window.innerWidth - boxW - 12);
      const maxY = Math.max(12, window.innerHeight - boxH - 12);
      setPos({
        x: Math.max(12, Math.min(maxX, dragRef.current.originX + dx)),
        y: Math.max(12, Math.min(maxY, dragRef.current.originY + dy)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [floatingLarge]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = (e.currentTarget.closest('[data-floating-overlay]') as HTMLElement | null);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
    };
  };

  const handleNativeFullscreen = async () => {
    const el = theaterRef.current;
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

  if (mode === 'inline') return null;

  // 1. FLOATING DRAGGABLE OVERLAY
  if (mode === 'floating') {
    const defaultStyle: React.CSSProperties = pos
      ? { left: pos.x, top: pos.y }
      : { right: 20, bottom: 20 };

    return (
      <div
        data-floating-overlay
        style={defaultStyle}
        className={`fixed z-50 ${
          floatingLarge ? 'w-[440px] max-w-[calc(100vw-24px)]' : 'w-[320px] max-w-[calc(100vw-24px)]'
        } rounded-2xl border border-[#E53935]/55 bg-[#0F1013]/95 backdrop-blur-md shadow-2xl shadow-black/70 overflow-hidden select-none`}
      >
        {/* Draggable Talkcob Overlay Header */}
        <div
          onPointerDown={startDrag}
          className="px-3 py-2 bg-[#18191D] border-b border-[#2E3035] flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-[#949BA4] shrink-0" />
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[9px] font-extrabold tracking-wider uppercase shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <span className="text-xs font-bold text-white truncate">
              {shareLabel || 'Screen Share'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-[#B5BAC1] tabular-nums mr-1">
              {formatElapsed(elapsedSec)}
            </span>
            <button
              type="button"
              onClick={() => setFloatingLarge((prev) => !prev)}
              title={floatingLarge ? 'Smaller Overlay' : 'Larger Overlay'}
              className="p-1 rounded-md text-[#B5BAC1] hover:text-white hover:bg-[#2B2D31] transition-colors"
            >
              {floatingLarge ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('theater')}
              title="Open Full Theater Overlay"
              className="p-1 rounded-md text-[#EF4444] hover:text-white hover:bg-[#E53935] transition-colors"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Video Stream */}
        <div className={`relative w-full bg-black ${floatingLarge ? 'h-[235px]' : 'h-[168px]'}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) {
                setDimensions({ w: v.videoWidth, h: v.videoHeight });
              }
            }}
            className="w-full h-full object-contain"
          />

          {/* Subtle Corner Watermark + Resolution Badge */}
          <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/65 border border-white/10 text-[10px] text-white/90">
            <TalkcobIcon size={12} variant="mark" mascotColor="#EF4444" />
            <span className="font-semibold truncate max-w-[140px]">{roomLabel}</span>
            {dimensions && (
              <span className="text-[#949BA4] font-mono">
                {dimensions.w}×{dimensions.h}
              </span>
            )}
          </div>
        </div>

        {/* Floating Overlay Quick HUD Controls */}
        <div className="px-3 py-2 bg-[#16171B] border-t border-[#2E3035] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar
              name={sharer.name}
              src={sharer.avatar}
              accentColor={sharer.accentColor}
              size="xs"
              isCurrentUser
            />
            <span className="text-[11px] font-medium text-[#DBDEE1] truncate">
              {sharer.name}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              className={`p-1.5 rounded-md transition-colors ${
                isMuted ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('inline')}
              title="Dock back to Voice/Call view"
              className="px-2 py-1 rounded-md bg-[#2B2D31] hover:bg-[#383A40] text-[11px] font-semibold text-[#DBDEE1] transition-colors"
            >
              Dock
            </button>
            <button
              type="button"
              onClick={onStopShare}
              title="Stop Screen Share"
              className="px-2 py-1 rounded-md bg-[#E53935] hover:bg-[#C62828] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <MonitorOff className="w-3 h-3" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL THEATER OVERLAY
  return (
    <div
      ref={theaterRef}
      role="dialog"
      aria-modal="true"
      aria-label="Talkcob Screen Share Overlay"
      onMouseMove={() => setHudVisible(true)}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none"
    >
      {/* Top Translucent Talkcob Overlay HUD */}
      <div
        className={`relative z-20 px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex flex-wrap items-center justify-between gap-3 transition-opacity duration-200 ${
          hudVisible ? 'opacity-100' : 'opacity-25 hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#E53935] text-white flex items-center justify-center shadow-lg shrink-0">
            <TalkcobIcon size={22} variant="mark" mascotColor="#FFFFFF" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-extrabold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE OVERLAY
              </span>
              <span className="text-sm font-display font-bold text-white truncate">
                {shareLabel || 'Screen Stream'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#B5BAC1] mt-0.5">
              <Radio className="w-3.5 h-3.5 text-[#23A55A]" />
              <span className="truncate">{roomLabel}</span>
              <span>·</span>
              <span className="font-mono tabular-nums text-white">{formatElapsed(elapsedSec)}</span>
              {dimensions && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[#949BA4]">
                    {dimensions.w}×{dimensions.h}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onChangeMode('floating')}
            className="px-3 py-1.5 rounded-lg bg-[#2B2D31]/90 hover:bg-[#383A40] border border-white/10 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <PictureInPicture2 className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>Float Over Chat</span>
          </button>

          <button
            type="button"
            onClick={() => void handleNativeFullscreen()}
            title="Toggle Browser Fullscreen"
            className="p-2 rounded-lg bg-[#2B2D31]/90 hover:bg-[#383A40] border border-white/10 text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('inline')}
            className="px-3 py-1.5 rounded-lg bg-[#2B2D31]/90 hover:bg-[#383A40] border border-white/10 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Overlay</span>
          </button>
        </div>
      </div>

      {/* Main Centered Screen Stream */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-10 py-2">
        <div className="relative w-full h-full max-w-6xl rounded-2xl border border-[#2E3035] bg-black overflow-hidden shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) {
                setDimensions({ w: v.videoWidth, h: v.videoHeight });
              }
            }}
            className="w-full h-full object-contain"
          />

          {/* Floating Sharer Corner Pill Overlay inside stream */}
          <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-sm flex items-center gap-2">
            <Avatar
              name={sharer.name}
              src={sharer.avatar}
              accentColor={sharer.accentColor}
              size="xs"
              isCurrentUser
            />
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-tight">{sharer.name}</div>
              <div className="text-[10px] text-[#949BA4] leading-tight">
                {isMuted ? 'Mic Muted' : 'Audio Live'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Talkcob Control Dock */}
      <div className="relative z-20 px-4 pb-5 pt-2 flex justify-center">
        <div className="px-4 py-2.5 rounded-2xl bg-[#18191D]/95 border border-[#2E3035] shadow-2xl flex flex-wrap items-center justify-center gap-2.5">
          {/* Mic + Level Indicator */}
          <div className="flex items-center gap-2 pr-2 border-r border-[#2E3035]">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isMuted ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <div className="w-16 h-1.5 rounded-full bg-[#2B2D31] overflow-hidden">
              <div
                className="h-full bg-[#23A55A] transition-all duration-75"
                style={{ width: `${isMuted ? 0 : Math.min(100, micLevel)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleDeafen}
            aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDeafened ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
            }`}
          >
            {isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </button>

          {onReshare && (
            <button
              type="button"
              onClick={onReshare}
              className="px-3.5 h-10 rounded-xl bg-[#2B2D31] hover:bg-[#383A40] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Change Window</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStopShare}
            className="px-4 h-10 rounded-xl bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <MonitorOff className="w-4 h-4" />
            <span>Stop Sharing</span>
          </button>

          {onDisconnectCall && (
            <button
              type="button"
              onClick={onDisconnectCall}
              title="Disconnect Call"
              aria-label="Disconnect Call"
              className="w-10 h-10 rounded-xl bg-[#E53935]/20 hover:bg-[#E53935] text-[#EF4444] hover:text-white flex items-center justify-center transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface InlineStreamViewportProps {
  stream: MediaStream;
  sharer: User;
  roomLabel: string;
  shareLabel?: string | null;
  heightClass: string;
  onOpenTheaterOverlay: () => void;
  onOpenFloatingOverlay: () => void;
  onStopShare: () => void;
}

export const InlineScreenShareFrame: React.FC<InlineStreamViewportProps> = ({
  stream,
  sharer,
  roomLabel,
  shareLabel,
  heightClass,
  onOpenTheaterOverlay,
  onOpenFloatingOverlay,
  onStopShare,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full rounded-2xl border border-[#E53935]/45 bg-[#0B0C0E] overflow-hidden shadow-2xl">
      {/* Top Overlay Header */}
      <div className="px-4 py-2.5 bg-[#18191C] border-b border-[#2E3035] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-bold tracking-wider uppercase shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
          <span className="text-xs font-semibold text-white truncate">
            {sharer.name} is sharing {shareLabel || 'their screen'}
          </span>
          <span className="text-[11px] font-mono text-[#949BA4] tabular-nums shrink-0">
            {formatElapsed(elapsedSec)}
          </span>
          {dimensions && (
            <span className="hidden sm:inline text-[11px] font-mono text-[#80848E] shrink-0">
              {dimensions.w}×{dimensions.h}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenFloatingOverlay}
            title="Float Talkcob Overlay over chat"
            className="px-2.5 py-1 rounded-md bg-[#2B2D31] hover:bg-[#383A40] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <PictureInPicture2 className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="hidden sm:inline">Float Overlay</span>
          </button>

          <button
            type="button"
            onClick={onOpenTheaterOverlay}
            title="Open Full Talkcob Overlay"
            className="px-2.5 py-1 rounded-md bg-[#2B2D31] hover:bg-[#383A40] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="hidden sm:inline">Full Overlay</span>
          </button>

          <button
            type="button"
            onClick={onStopShare}
            className="px-2.5 py-1 rounded-md bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <MonitorOff className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Video + Embedded Talkcob Overlay Watermark HUD */}
      <div className={`relative w-full bg-black flex items-center justify-center ${heightClass}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) {
              setDimensions({ w: v.videoWidth, h: v.videoHeight });
            }
          }}
          className="w-full h-full object-contain"
        />

        {/* Subtle Bottom-Left Sharer Overlay Tag */}
        <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/10 backdrop-blur-sm flex items-center gap-2">
          <TalkcobIcon size={14} variant="mark" mascotColor="#EF4444" />
          <span className="text-[11px] font-semibold text-white">{roomLabel}</span>
          <span className="text-[10px] text-[#949BA4] flex items-center gap-1">
            <MonitorUp className="w-3 h-3 text-[#23A55A]" />
            Overlay Ready
          </span>
        </div>
      </div>
    </div>
  );
};
