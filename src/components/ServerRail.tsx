import React, { useState } from 'react';
import { Bot, Compass, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { AppTheme, Server } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';
import { TalkcobIcon } from './TalkcobIcon';

interface ServerRailProps {
  servers: Server[];
  activeServerId: string | 'home' | 'discover' | 'bots' | 'ai' | 'admin';
  onSelectHome: () => void;
  onSelectServer: (serverId: string) => void;
  onSelectDiscover: () => void;
  onSelectBots: () => void;
  onSelectAi?: () => void;
  onSelectAdmin?: () => void;
  canAccessAdminPanel?: boolean;
  onOpenCreateServer: () => void;
  unreadByServer: Record<string, number>;
  dmUnreadCount: number;
  inVoice: boolean;
  theme: AppTheme;
}

export const ServerRail: React.FC<ServerRailProps> = ({
  servers,
  activeServerId,
  onSelectHome,
  onSelectServer,
  onSelectDiscover,
  onSelectBots,
  onSelectAi,
  onSelectAdmin,
  canAccessAdminPanel = false,
  onOpenCreateServer,
  unreadByServer,
  dmUnreadCount,
  inVoice,
  theme,
}) => {
  const t = THEME_TOKENS[theme];
  const [failedIcons, setFailedIcons] = useState<Record<string, boolean>>({});

  return (
    <nav
      aria-label="Servers"
      className={`w-[72px] shrink-0 h-full flex flex-col items-center py-3 gap-2 overflow-y-auto talkcob-scroll-thin ${t.railBg}`}
    >
      {/* Home / Direct Messages with Red Talkcob Talking Icon */}
      <div className="relative group flex items-center justify-center w-full">
        <span
          className={`absolute left-0 w-1 rounded-r-full transition-all duration-150 bg-[#E53935] ${
            activeServerId === 'home'
              ? 'h-10 opacity-100'
              : 'h-0 group-hover:h-5 opacity-0 group-hover:opacity-100'
          }`}
        />
        <button
          onClick={onSelectHome}
          aria-label="Direct Messages and Talkcob Home"
          title="Direct Messages — Talkcob"
          className={`relative w-12 h-12 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
            activeServerId === 'home'
              ? 'rounded-[16px] bg-[#E53935] text-white shadow-sm'
              : `rounded-[24px] hover:rounded-[16px] ${
                  theme === 'light'
                    ? 'bg-white text-[#E53935] hover:bg-[#E53935] hover:text-white'
                    : 'bg-[#313338] text-[#EF4444] hover:bg-[#E53935] hover:text-white'
                }`
          }`}
        >
          <TalkcobIcon
            size={30}
            animated={inVoice}
            mascotColor="currentColor"
          />
          {dmUnreadCount > 0 && (
            <span
              className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center tabular-nums border-2 ${
                theme === 'light' ? 'border-[#E3E5E8]' : 'border-[#1E1F22]'
              }`}
            >
              {dmUnreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div
        className={`w-8 h-[2px] rounded-full my-0.5 ${
          theme === 'light' ? 'bg-[#CCCFD6]' : 'bg-[#35373C]'
        }`}
      />

      {/* Community Servers */}
      {servers.map((server) => {
        const isActive = activeServerId === server.id;
        const unread = unreadByServer[server.id] || 0;
        const iconKey = server.iconUrl ? `${server.id}:${server.iconUrl}` : '';
        const hasIcon = Boolean(server.iconUrl && !failedIcons[iconKey]);

        return (
          <div key={server.id} className="relative group flex items-center justify-center w-full">
            <span
              className={`absolute left-0 w-1 rounded-r-full transition-all duration-150 bg-[#E53935] ${
                isActive
                  ? 'h-10 opacity-100'
                  : unread > 0
                  ? 'h-2 opacity-100 group-hover:h-5'
                  : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
              }`}
            />
            <button
              onClick={() => onSelectServer(server.id)}
              aria-label={`Open ${server.name}`}
              title={server.name}
              className={`relative w-12 h-12 flex items-center justify-center overflow-hidden font-display font-bold text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
                isActive
                  ? 'rounded-[16px] text-white'
                  : 'rounded-[24px] hover:rounded-[16px] text-white'
              }`}
              style={{
                backgroundColor: hasIcon
                  ? undefined
                  : isActive
                  ? server.accentColor
                  : theme === 'light'
                  ? '#FFFFFF'
                  : '#313338',
                color: !hasIcon && !isActive && theme === 'light' ? '#E53935' : '#FFFFFF',
              }}
            >
              {hasIcon ? (
                <img
                  src={server.iconUrl}
                  alt={server.name}
                  referrerPolicy="no-referrer"
                  onError={() => setFailedIcons((prev) => ({ ...prev, [iconKey]: true }))}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className={`w-full h-full flex items-center justify-center transition-colors ${
                    !isActive ? 'hover:bg-[#E53935] hover:text-white' : ''
                  }`}
                >
                  {server.shortName}
                </span>
              )}
            </button>

            {unread > 0 && !isActive && (
              <span
                className={`pointer-events-none absolute bottom-0 right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center tabular-nums border-2 ${
                  theme === 'light' ? 'border-[#E3E5E8]' : 'border-[#1E1F22]'
                }`}
              >
                {unread}
              </span>
            )}
          </div>
        );
      })}

      {/* Add Server Button (Red) */}
      <div className="relative group flex items-center justify-center w-full">
        <button
          onClick={onOpenCreateServer}
          aria-label="Create a Talkcob server"
          title="Add a Server (Free)"
          className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
            theme === 'light'
              ? 'bg-white text-[#E53935] hover:bg-[#E53935] hover:text-white'
              : 'bg-[#313338] text-[#EF4444] hover:bg-[#E53935] hover:text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Discover & Free Features (Red) */}
      <div className="relative group flex items-center justify-center w-full">
        <span
          className={`absolute left-0 w-1 rounded-r-full transition-all duration-150 bg-[#E53935] ${
            activeServerId === 'discover'
              ? 'h-10 opacity-100'
              : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
          }`}
        />
        <button
          onClick={onSelectDiscover}
          aria-label="Explore Talkcob Communities"
          title="Explore Talkcob (100% Free)"
          className={`w-12 h-12 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
            activeServerId === 'discover'
              ? 'rounded-[16px] bg-[#E53935] text-white'
              : `rounded-[24px] hover:rounded-[16px] ${
                  theme === 'light'
                    ? 'bg-white text-[#E53935] hover:bg-[#E53935] hover:text-white'
                    : 'bg-[#313338] text-[#EF4444] hover:bg-[#E53935] hover:text-white'
                }`
          }`}
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Bot Studio & Developer Portal (Red) */}
      <div className="relative group flex items-center justify-center w-full">
        <span
          className={`absolute left-0 w-1 rounded-r-full transition-all duration-150 bg-[#E53935] ${
            activeServerId === 'bots'
              ? 'h-10 opacity-100'
              : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
          }`}
        />
        <button
          onClick={onSelectBots}
          aria-label="Open Bot Studio"
          title="Bot Studio — Create & Control Bots"
          className={`w-12 h-12 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
            activeServerId === 'bots'
              ? 'rounded-[16px] bg-[#E53935] text-white'
              : `rounded-[24px] hover:rounded-[16px] ${
                  theme === 'light'
                    ? 'bg-white text-[#E53935] hover:bg-[#E53935] hover:text-white'
                    : 'bg-[#313338] text-[#EF4444] hover:bg-[#E53935] hover:text-white'
                }`
          }`}
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>

      {/* Talkcob AI Help Chat */}
      {onSelectAi && (
        <div className="relative group flex items-center justify-center w-full">
          <span
            className={`absolute left-0 w-1 rounded-r-full transition-all duration-150 bg-[#E53935] ${
              activeServerId === 'ai'
                ? 'h-10 opacity-100'
                : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
            }`}
          />
          <button
            onClick={onSelectAi}
            aria-label="Ask Talkcob AI Guide"
            title="Talkcob AI — Ask How to Use Anything"
            className={`w-12 h-12 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
              activeServerId === 'ai'
                ? 'rounded-[16px] bg-gradient-to-br from-[#E53935] to-[#EC4899] text-white shadow-sm'
                : `rounded-[24px] hover:rounded-[16px] ${
                    theme === 'light'
                      ? 'bg-white text-[#E53935] hover:bg-[#E53935] hover:text-white'
                      : 'bg-[#313338] text-[#F472B6] hover:bg-[#E53935] hover:text-white'
                  }`
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Talkcob Admin Panel (Visible to Talkcob Owner & Added Admins) */}
      {canAccessAdminPanel && onSelectAdmin && (
        <div className="relative group flex items-center justify-center w-full">
          <span
            className={`absolute left-0 w-1 rounded-r-full transition-all duration-150 bg-[#FACC15] ${
              activeServerId === 'admin'
                ? 'h-10 opacity-100'
                : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
            }`}
          />
          <button
            onClick={onSelectAdmin}
            aria-label="Open Talkcob Admin Panel"
            title="Talkcob Admin Panel — Bans, IP Bans & Servers"
            className={`w-12 h-12 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
              activeServerId === 'admin'
                ? 'rounded-[16px] bg-[#E53935] text-[#FACC15] ring-2 ring-[#FACC15]/70'
                : `rounded-[24px] hover:rounded-[16px] ${
                    theme === 'light'
                      ? 'bg-white text-[#E53935] hover:bg-[#E53935] hover:text-white'
                      : 'bg-[#313338] text-[#FACC15] hover:bg-[#E53935] hover:text-white'
                  }`
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        </div>
      )}
    </nav>
  );
};
