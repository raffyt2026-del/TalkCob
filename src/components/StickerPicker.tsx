import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pin, Search, Sticker, Upload, X } from 'lucide-react';
import { AppTheme } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';

export interface StickerItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  category: string;
}

interface StickerPickerProps {
  theme: AppTheme;
  pinnedStickerUrls: string[];
  onSelectSticker: (sticker: StickerItem) => void;
  onPinSticker: (sticker: StickerItem) => void;
  onUnpinSticker?: (stickerUrl: string) => void;
  onUploadStickerFile: (file: File) => void;
  onClose: () => void;
}

const STICKER_CATEGORIES = [
  'Popular',
  'Reactions',
  'Cute',
  'Funny',
  'Hype',
  'Gaming',
  'Love',
];

export const StickerPicker: React.FC<StickerPickerProps> = ({
  theme,
  pinnedStickerUrls,
  onSelectSticker,
  onPinSticker,
  onUnpinSticker,
  onUploadStickerFile,
  onClose,
}) => {
  const t = THEME_TOKENS[theme];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Popular');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set('q', query.trim());
        } else {
          params.set('category', category);
        }
        const res = await fetch(`/api/stickers/search?${params.toString()}`);
        const data = (await res.json()) as {
          ok?: boolean;
          stickers?: StickerItem[];
          error?: string;
        };
        if (!cancelled) {
          if (res.ok && Array.isArray(data.stickers)) {
            setStickers(data.stickers);
          } else {
            setError(data.error || 'Could not load popular stickers.');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Could not reach sticker service.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, category]);

  return (
    <div
      className={`w-[340px] sm:w-[410px] max-w-[calc(100vw-2rem)] rounded-xl border shadow-2xl z-30 overflow-hidden ${t.modalBg} ${t.border}`}
    >
      {/* Header & Search */}
      <div className={`p-3 border-b ${t.border} space-y-2.5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-[#EC4899] to-[#E53935] text-white text-[10px] font-extrabold tracking-wide inline-flex items-center gap-1">
              <Sticker className="w-3 h-3" />
              <span>STICKERS</span>
            </span>
            <span className={`font-display font-bold text-xs ${t.textPrimary}`}>
              Popular via{' '}
              <a
                href="https://klipy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EF4444] hover:underline"
              >
                klipy.com
              </a>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              ref={uploadRef}
              type="file"
              accept="image/webp,image/png,image/gif,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onUploadStickerFile(f);
                  onClose();
                }
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              title="Upload custom sticker"
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold inline-flex items-center gap-1 ${t.border} ${t.textSecondary} ${t.hoverBg}`}
            >
              <Upload className="w-3 h-3 text-[#EF4444]" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sticker picker"
              className={`p-1 rounded-md ${t.textMuted} ${t.hoverBg}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#EF4444] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stickers (e.g. wave, cat, lol, gg)..."
            className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary} placeholder:text-[#80848E] focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#949BA4] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {!query.trim() && (
          <div className="flex items-center gap-1 overflow-x-auto talkcob-scroll-thin pb-0.5">
            {STICKER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-[#E53935] text-white'
                    : `${t.dockBg} ${t.textSecondary} ${t.hoverBg}`
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Stickers Grid */}
      <div className="h-64 overflow-y-auto talkcob-scroll p-2.5">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[#949BA4]">
            <Loader2 className="w-5 h-5 animate-spin text-[#EF4444]" />
            <span>Loading popular stickers...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
            <Sticker className="w-5 h-5 text-[#EF4444]" />
            <p className={`text-xs ${t.textMuted}`}>{error}</p>
          </div>
        ) : stickers.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#949BA4]">
            No stickers found for &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {stickers.map((sticker) => {
              const isPinned = pinnedStickerUrls.includes(sticker.url);
              return (
                <div
                  key={sticker.id}
                  className={`group relative rounded-xl border p-1.5 flex flex-col items-center justify-center aspect-square transition-all ${
                    isPinned
                      ? 'border-[#23A55A] bg-[#23A55A]/10'
                      : `${t.border} ${t.dockBg} hover:border-[#E53935]`
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSticker(sticker);
                      onClose();
                    }}
                    title={`Send Sticker: ${sticker.title}`}
                    className="w-full h-full flex items-center justify-center focus:outline-none"
                  >
                    <img
                      src={sticker.previewUrl}
                      alt={sticker.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="max-h-20 max-w-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </button>

                  {/* Pin Sticker directly to Message Area */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPinned && onUnpinSticker) {
                        onUnpinSticker(sticker.url);
                      } else {
                        onPinSticker(sticker);
                      }
                    }}
                    title={isPinned ? 'Unpin from message area' : 'Pin sticker to message area'}
                    aria-label={isPinned ? 'Unpin sticker' : 'Pin sticker to message area'}
                    className={`absolute top-1 right-1 w-6 h-6 rounded-md flex items-center justify-center transition-all shadow ${
                      isPinned
                        ? 'bg-[#23A55A] text-white opacity-100'
                        : 'bg-black/75 text-white opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[#E53935]'
                    }`}
                  >
                    {isPinned ? <Check className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  </button>

                  <span className="w-full text-[10px] font-medium truncate text-center opacity-80 mt-0.5 pointer-events-none">
                    {sticker.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`px-3 py-1.5 border-t ${t.border} text-[10px] flex items-center justify-between ${t.textMuted}`}>
        <span>Click sticker to send</span>
        <span>Click 📌 to pin to message area</span>
      </div>
    </div>
  );
};
