import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { AppTheme, Server, User } from '../types/talkcob';
import { getUserServerPermissions } from '../utils/permissions';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';

interface MemberSidebarProps {
  server?: Server;
  members: User[];
  currentUserId: string;
  onSelectUser: (user: User) => void;
  theme: AppTheme;
  speakingUserIds: string[];
}

export const MemberSidebar: React.FC<MemberSidebarProps> = ({
  server,
  members,
  currentUserId,
  onSelectUser,
  theme,
  speakingUserIds,
}) => {
  const t = THEME_TOKENS[theme];

  const botMembers = members.filter((m) => m.isBot || m.role === 'Bot');
  const humanMembers = members.filter((m) => !(m.isBot || m.role === 'Bot'));
  const onlineMembers = humanMembers.filter((m) => m.status !== 'offline');
  const offlineMembers = humanMembers.filter((m) => m.status === 'offline');

  const adminsAndSettings = onlineMembers.filter((m) => {
    const perms = getUserServerPermissions(server, m.id);
    return perms.isOwner || perms.hasSettingsRole || m.role === 'Founder' || m.role === 'Audio Lead';
  });

  const regularOnline = onlineMembers.filter((m) => !adminsAndSettings.some((a) => a.id === m.id));

  const groups = [
    { label: `Owner & Settings — ${adminsAndSettings.length}`, list: adminsAndSettings },
    { label: `Online — ${regularOnline.length}`, list: regularOnline },
    { label: `Bots — ${botMembers.length}`, list: botMembers },
    { label: `Offline — ${offlineMembers.length}`, list: offlineMembers },
  ].filter((g) => g.list.length > 0);

  return (
    <aside
      aria-label="Server Members"
      className={`hidden lg:flex w-[240px] shrink-0 h-full flex-col border-l ${t.sidebarSecondaryBg} ${t.border} overflow-y-auto talkcob-scroll px-2 py-4`}
    >
      {groups.map((group) => (
        <div key={group.label} className="mb-5">
          <h3 className={`px-2 mb-1.5 text-xs font-semibold tracking-wide ${t.textMuted} tabular-nums`}>
            {group.label}
          </h3>
          <div className="space-y-0.5">
            {group.list.map((member) => {
              const isOffline = member.status === 'offline';
              const perms = getUserServerPermissions(server, member.id);
              const isBotMember = Boolean(member.isBot || member.role === 'Bot');

              return (
                <button
                  key={member.id}
                  onClick={() => onSelectUser(member)}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-colors ${t.hoverBg} ${
                    isOffline ? 'opacity-55 hover:opacity-100' : ''
                  }`}
                >
                  <Avatar
                    name={member.name}
                    src={member.avatar}
                    accentColor={member.accentColor}
                    size="sm"
                    status={member.status}
                    showStatus
                    speaking={speakingUserIds.includes(member.id)}
                    decoration={member.avatarDecoration}
                    statusBorderClass={
                      theme === 'light'
                        ? 'border-[#F2F3F5]'
                        : theme === 'obsidian'
                        ? 'border-[#111318]'
                        : 'border-[#2B2D31]'
                    }
                    isCurrentUser={member.id === currentUserId}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-medium truncate ${
                          member.hasFreeNitro && member.nameplateGradient
                            ? 'bg-clip-text text-transparent font-bold'
                            : perms.isOwner || perms.hasSettingsRole
                            ? 'text-[#EF4444]'
                            : t.textPrimary
                        }`}
                        style={
                          member.hasFreeNitro && member.nameplateGradient
                            ? { backgroundImage: member.nameplateGradient }
                            : undefined
                        }
                      >
                        {server?.id && member.serverNicknames?.[server.id]?.trim()
                          ? member.serverNicknames[server.id]
                          : member.name}
                      </span>
                      {member.hasFreeNitro && (
                        <Sparkles
                          className="w-3 h-3 text-[#F472B6] shrink-0"
                          aria-label="Talkcob Nitro (Free)"
                        />
                      )}
                      {(perms.isOwner || member.isPlatformOwner) && (
                        <Crown
                          className={`w-3 h-3 shrink-0 ${
                            member.isPlatformOwner ? 'text-[#FACC15]' : 'text-[#EF4444]'
                          }`}
                          aria-label={member.isPlatformOwner ? 'Talkcob Owner' : 'Server Owner'}
                        />
                      )}
                      {isBotMember && (
                        <span className="px-1 py-0.2 rounded bg-[#E53935] text-white text-[9px] font-bold uppercase shrink-0">
                          BOT
                        </span>
                      )}
                    </div>
                    {perms.hasSettingsRole && !perms.isOwner ? (
                      <p className="text-[11px] truncate text-[#EF4444]/85">role: settings</p>
                    ) : member.customStatus && (!isOffline || isBotMember) ? (
                      <p className={`text-xs truncate ${t.textMuted}`}>{member.customStatus}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
};
