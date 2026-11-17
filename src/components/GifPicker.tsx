import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Sparkles, Upload, X } from 'lucide-react';
import { AppTheme } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  category: string;
}

interface GifPickerProps {
  theme: AppTheme;
  onSelectGif: (gif: GifItem) => void;
  onUploadGifFile: (file: File) => void;
  onClose: () => void;
}

const GIF_CATEGORIES = [
  'Trending',
  'Reactions',
  'Funny',
  'Hype',
  'Gaming',
  'Love',
  'Memes',
  'Anime',
];

export const GifPicker: React.FC<GifPickerProps> = ({
  theme,
  onSelectGif,
  onUploadGifFile,
  onClose,
}) => {
  const t = THEME_TOKENS[theme];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Trending');
  const [gifs, setGifs] = useState<GifItem[]>([]);
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
        const res = await fetch(`/api/gifs/search?${params.toString()}`);
        const data = (await res.json()) as { ok?: boolean; gifs?: GifItem[]; error?: string };
        if (!cancelled) {
          if (res.ok && Array.isArray(data.gifs)) {
            setGifs(data.gifs);
          } else {
            setError(data.error || 'Could not load KLIPY GIFs.');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Could not reach KLIPY GIF search service.');
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
      {/* Top Search Bar */}
      <div className={`p-3 border-b ${t.border} space-y-2.5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-extrabold tracking-wide">
              KLIPY
            </span>
            <span className={`font-display font-bold text-xs ${t.textPrimary}`}>
              GIFs via{' '}
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
              accept="image/gif,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onUploadGifFile(f);
                  onClose();
                }
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              title="Upload your own GIF from device"
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold inline-flex items-center gap-1 ${t.border} ${t.textSecondary} ${t.hoverBg}`}
            >
              <Upload className="w-3 h-3 text-[#EF4444]" />
              <span>Upload GIF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close GIF picker"
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
            placeholder="Search KLIPY GIFs (e.g. gg, laugh, cat, hype)..."
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
            {GIF_CATEGORIES.map((cat) => (
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

      {/* GIF Grid */}
      <div className="h-64 overflow-y-auto talkcob-scroll p-2.5">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[#949BA4]">
            <Loader2 className="w-5 h-5 animate-spin text-[#EF4444]" />
            <span>Loading KLIPY GIFs...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
            <Sparkles className="w-5 h-5 text-[#EF4444]" />
            <p className={`text-xs ${t.textMuted}`}>{error}</p>
          </div>
        ) : gifs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#949BA4]">
            No KLIPY GIFs matched &ldquo;{query}&rdquo;. Try another search term.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => {
                  onSelectGif(gif);
                  onClose();
                }}
                className="group relative rounded-lg overflow-hidden border border-black/20 bg-black/40 aspect-[16/10] hover:ring-2 hover:ring-[#E53935] transition-all focus:outline-none"
                title={`Send KLIPY GIF: ${gif.title}`}
              >
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 py-1 text-left opacity-90 group-hover:opacity-100">
                  <span className="text-[11px] font-bold text-white truncate block">
                    {gif.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
