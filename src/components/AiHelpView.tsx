import React, { useEffect, useRef, useState } from 'react';
import {
  BotMessageSquare,
  Loader2,
  Menu,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import { AppTheme, User } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';
import { TalkcobIcon } from './TalkcobIcon';

interface AiChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface AiHelpViewProps {
  currentUser: User;
  activeServerName?: string;
  activeChannelName?: string;
  onOpenMobileMenu: () => void;
  theme: AppTheme;
}

const STARTER_PROMPTS = [
  'How do I turn on my camera or share screen in VC and DM calls?',
  'How do I set up private channel permissions for roles and members?',
  'How do I claim and customize Free Nitro (badges, frames, banners)?',
  'How do I send GIFs, videos, or delete multiple messages?',
  'How do I create and program a custom bot in Bot Studio?',
  'How do friend requests and named social links work?',
];

function renderAiFormattedText(text: string, theme: AppTheme): React.ReactNode {
  const lines = text.split('\n');
  const codeBg = theme === 'light' ? 'bg-[#E3E5E8] text-[#1E1F22]' : 'bg-[#1E1F22] text-[#F2F3F5]';
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />;
        const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return (
          <p key={idx} className="whitespace-pre-wrap break-words">
            {tokens.map((tok, tIdx) => {
              if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
                return (
                  <code
                    key={tIdx}
                    className={`px-1.5 py-0.5 rounded font-mono text-[12px] ${codeBg}`}
                  >
                    {tok.slice(1, -1)}
                  </code>
                );
              }
              if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
                return (
                  <strong key={tIdx} className="font-bold">
                    {tok.slice(2, -2)}
                  </strong>
                );
              }
              return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export const AiHelpView: React.FC<AiHelpViewProps> = ({
  currentUser,
  activeServerName,
  activeChannelName,
  onOpenMobileMenu,
  theme,
}) => {
  const t = THEME_TOKENS[theme];
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'ai-welcome',
      role: 'model',
      text: `Hey **${currentUser.name}**! I'm **Talkcob AI Guide**.\n\nAsk me anything about how to use Talkcob — voice channels, cameras in VC & DM calls, screen sharing, channel permissions, Free Nitro customization, GIFs, deleting messages, bots, or friend requests!`,
      timestamp: 'Ready',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const cardSurface =
    theme === 'light'
      ? 'bg-white border-[#E1E3E6]'
      : theme === 'obsidian'
      ? 'bg-[#161920] border-[#242834]'
      : 'bg-[#2B2D31] border-[#3F4147]';

  const sendPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || loading) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: nowStr,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setDraft('');
    setError(null);
    setLoading(true);

    try {
      const apiMessages = nextHistory
        .filter((m) => m.id !== 'ai-welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          currentContext: {
            username: currentUser.username,
            displayName: currentUser.name,
            serverName: activeServerName,
            channelName: activeChannelName,
            hasFreeNitro: Boolean(currentUser.hasFreeNitro),
          },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error || 'Could not get an answer from Talkcob AI.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'model',
          text: data.reply!,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        },
      ]);
    } catch {
      setError('Network error while contacting Talkcob AI Guide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`flex-1 min-w-0 min-h-0 h-full flex flex-col ${t.chatBg}`}>
      {/* Header */}
      <header className={`h-14 px-4 sm:px-6 flex items-center justify-between border-b ${t.border} shrink-0`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className={`md:hidden p-1.5 rounded-md ${t.hoverBg} ${t.textPrimary}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E53935] to-[#EC4899] text-white flex items-center justify-center shrink-0 shadow-md">
            <BotMessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`font-display font-bold text-base sm:text-lg truncate ${t.textPrimary}`}>
                Talkcob AI Guide
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#23A55A]/15 border border-[#23A55A]/40 text-[#23A55A] text-[10px] font-bold uppercase tracking-wide shrink-0">
                Free Help
              </span>
            </div>
            <p className={`text-xs truncate ${t.textMuted}`}>
              Ask how to use voice, camera, permissions, GIFs, Free Nitro, bots, or anything on Talkcob
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMessages((prev) => prev.slice(0, 1));
          }}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textSecondary} ${t.hoverBg} shrink-0`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#EF4444]" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </header>

      {/* Scrollable Chat History */}
      <div className="flex-1 min-h-0 overflow-y-auto talkcob-scroll p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Quick Starter Chips */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${cardSurface}`}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#EF4444]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Popular How-To Questions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendPrompt(q)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium text-left transition-colors disabled:opacity-50 ${t.border} ${t.dockBg} ${t.textPrimary} ${t.hoverBg}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-full bg-[#E53935] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <TalkcobIcon size={22} mascotColor="#FFFFFF" animated={loading} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 border ${
                    isUser
                      ? 'bg-[#E53935] border-[#E53935] text-white'
                      : `${cardSurface} ${t.textPrimary}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`text-xs font-bold ${
                        isUser ? 'text-white/90' : 'text-[#EF4444]'
                      }`}
                    >
                      {isUser ? currentUser.name : 'Talkcob AI'}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        isUser ? 'text-white/75' : t.textMuted
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                  {renderAiFormattedText(msg.text, theme)}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E53935] text-white flex items-center justify-center shrink-0">
                <TalkcobIcon size={22} mascotColor="#FFFFFF" animated />
              </div>
              <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 text-xs ${cardSurface} ${t.textMuted}`}>
                <Loader2 className="w-4 h-4 animate-spin text-[#EF4444]" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/15 text-xs text-[#FCA5A5]">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="p-4 pt-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendPrompt(draft);
          }}
          className={`max-w-3xl mx-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${t.border} ${t.composerBg}`}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Talkcob AI how to use any feature..."
            className={`flex-1 min-w-0 bg-transparent text-sm focus:outline-none caret-[#EF4444] ${t.textPrimary} placeholder:text-[#80848E]`}
          />
          <button
            type="submit"
            disabled={!draft.trim() || loading}
            aria-label="Ask AI"
            className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </main>
  );
};
