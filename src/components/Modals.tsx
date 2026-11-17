import React, { useState } from 'react';
import { Check, Copy, Crown, ExternalLink, Hash, Link as LinkIcon, Search, Sparkles, Volume2, X } from 'lucide-react';
import { AppTheme, Channel, DirectMessageThread, Server, User } from '../types/talkcob';
import { getDomainLabel, normalizeSocialUrl } from '../utils/dm';
import { getProfileEffectMeta } from '../utils/nitro';
import { getUserServerPermissions } from '../utils/permissions';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  theme: AppTheme;
  maxWidth?: string;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  title,
  onClose,
  theme,
  maxWidth = 'max-w-md',
  children,
}) => {
  const t = THEME_TOKENS[theme];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} rounded-xl border shadow-2xl overflow-hidden ${t.modalBg} ${t.border}`}
      >
        <div className={`px-5 py-4 border-b flex items-center justify-between ${t.border}`}>
          <h2 className={`font-display font-bold text-lg ${t.textPrimary}`}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`p-1 rounded-md text-[#EF4444] ${t.hoverBg}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

/* 1. Create Server Modal */
export const CreateServerModal: React.FC<{
  theme: AppTheme;
  onClose: () => void;
  onCreate: (name: string, accentColor: string, description: string) => void;
}> = ({ theme, onClose, onCreate }) => {
  const t = THEME_TOKENS[theme];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#E53935');

  const colors = ['#E53935', '#DC2626', '#B91C1C', '#F97316', '#0D9488', '#4F46E5'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(
      name.trim(),
      color,
      description.trim() || 'A free Talkcob community space.'
    );
    onClose();
  };

  return (
    <ModalWrapper title="Create a Talkcob Server" onClose={onClose} theme={theme}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className={`text-sm ${t.textMuted}`}>
          As the owner of any server you create, you have full access to Server Settings, Roles, and adding channels — completely free.
        </p>

        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
            Server Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Gamers"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
          />
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
            Short Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What do people talk about here?"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
          />
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>
            Server Accent Color
          </label>
          <div className="flex items-center gap-2.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#313338]' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              >
                {color === c && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${t.textSecondary} ${t.hoverBg}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#E53935] hover:bg-[#C62828] text-white transition-colors"
          >
            Create Server
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

/* 2. Create Channel Modal */
export const CreateChannelModal: React.FC<{
  theme: AppTheme;
  defaultType: 'text' | 'voice';
  existingCategories: string[];
  onClose: () => void;
  onCreate: (name: string, type: 'text' | 'voice', topic: string, category?: string) => void;
}> = ({ theme, defaultType, existingCategories, onClose, onCreate }) => {
  const t = THEME_TOKENS[theme];
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>(defaultType);
  const [category, setCategory] = useState(
    defaultType === 'voice' ? 'Voice Channels' : existingCategories[0] || 'Community'
  );
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanName =
      type === 'text' ? name.trim().toLowerCase().replace(/\s+/g, '-') : name.trim();
    onCreate(cleanName, type, topic.trim(), category.trim() || undefined);
    onClose();
  };

  return (
    <ModalWrapper title="Create Channel" onClose={onClose} theme={theme}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setType('text');
              if (category === 'Voice Channels') setCategory('Community');
            }}
            className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
              type === 'text'
                ? 'border-[#E53935] bg-[#E53935]/15'
                : `${t.border} ${t.hoverBg}`
            }`}
          >
            <Hash className="w-5 h-5 text-[#EF4444]" />
            <div>
              <div className={`text-sm font-semibold ${t.textPrimary}`}>Text</div>
              <div className={`text-xs ${t.textMuted}`}>Messages & images</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('voice');
              setCategory('Voice Channels');
            }}
            className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
              type === 'voice'
                ? 'border-[#E53935] bg-[#E53935]/15'
                : `${t.border} ${t.hoverBg}`
            }`}
          >
            <Volume2 className="w-5 h-5 text-[#EF4444]" />
            <div>
              <div className={`text-sm font-semibold ${t.textPrimary}`}>Voice</div>
              <div className={`text-xs ${t.textMuted}`}>Free live audio room</div>
            </div>
          </button>
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
            Channel Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'text' ? 'new-channel' : 'Studio Room'}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
          />
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Community"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
          />
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
            Topic (Optional)
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe what belongs here"
            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${t.textSecondary} ${t.hoverBg}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#E53935] hover:bg-[#C62828] text-white"
          >
            Create Channel
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

/* 3. Invite People Modal */
export const InviteModal: React.FC<{
  server: Server;
  theme: AppTheme;
  onClose: () => void;
}> = ({ server, theme, onClose }) => {
  const t = THEME_TOKENS[theme];
  const [copied, setCopied] = useState(false);
  const inviteUrl = `https://talkcob.app/invite/${server.inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalWrapper title={`Invite friends to ${server.name}`} onClose={onClose} theme={theme}>
      <div className="space-y-4">
        <p className={`text-sm ${t.textMuted}`}>
          Share this invite link to bring friends directly into {server.name} for free.
        </p>

        <div className={`flex items-center gap-2 p-2 rounded-lg border ${t.inputBg} ${t.border}`}>
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className={`flex-1 bg-transparent text-sm font-mono focus:outline-none ${t.textPrimary}`}
          />
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              copied
                ? 'bg-[#23A55A] text-white'
                : 'bg-[#E53935] hover:bg-[#C62828] text-white'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

/* 4. User Profile Modal */
export const UserProfileModal: React.FC<{
  user: User;
  server?: Server;
  isCurrentUser: boolean;
  canManageRoles: boolean;
  friendStatus: 'none' | 'friends' | 'outgoing' | 'incoming';
  theme: AppTheme;
  onClose: () => void;
  onStartDm: (userId: string) => void;
  onAddFriend: (userId: string) => void;
  onAcceptFriend: (userId: string) => void;
  onRemoveFriend: (userId: string) => void;
  onToggleMemberRole?: (serverId: string, userId: string, roleId: string) => void;
}> = ({
  user,
  server,
  isCurrentUser,
  canManageRoles,
  friendStatus,
  theme,
  onClose,
  onStartDm,
  onAddFriend,
  onAcceptFriend,
  onRemoveFriend,
  onToggleMemberRole,
}) => {
  const t = THEME_TOKENS[theme];
  const perms = getUserServerPermissions(server, user.id);
  const settingsRole = server?.roles.find((r) => r.name.toLowerCase() === 'settings');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${user.name} profile`}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-xl border shadow-2xl overflow-hidden ${t.modalBg} ${t.border}`}
      >
        {/* Banner + Nitro Profile Effect */}
        <div
          className="h-28 relative overflow-hidden bg-cover bg-center"
          style={{
            backgroundColor: user.bannerColor,
            backgroundImage: user.customBannerUrl ? `url(${user.customBannerUrl})` : undefined,
          }}
        >
          {(() => {
            const fx = getProfileEffectMeta(user.profileEffect);
            return fx && fx.overlayGradient ? (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: fx.overlayGradient }}
              />
            ) : null;
          })()}
          {user.hasFreeNitro && (
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-[#F472B6] border border-[#F472B6]/40 text-[10px] font-bold inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>FREE NITRO</span>
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-10 mb-3">
            <Avatar
              name={user.name}
              src={user.avatar}
              accentColor={user.accentColor}
              size="xl"
              status={user.status}
              showStatus
              decoration={user.avatarDecoration}
              statusBorderClass={
                theme === 'light'
                  ? 'border-white'
                  : theme === 'obsidian'
                  ? 'border-[#161920]'
                  : 'border-[#313338]'
              }
              isCurrentUser={isCurrentUser}
            />
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={`font-display font-bold text-xl ${
                  user.hasFreeNitro && user.nameplateGradient
                    ? 'bg-clip-text text-transparent'
                    : t.textPrimary
                }`}
                style={
                  user.hasFreeNitro && user.nameplateGradient
                    ? { backgroundImage: user.nameplateGradient }
                    : undefined
                }
              >
                {user.name}
              </h2>
              {(perms.isOwner || user.isPlatformOwner) && (
                <Crown className={`w-4 h-4 ${user.isPlatformOwner ? 'text-[#FACC15]' : 'text-[#EF4444]'}`} />
              )}
              {user.hasFreeNitro && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EC4899]/15 border border-[#EC4899]/40 text-[#F472B6] text-[10px] font-bold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>NITRO $0</span>
                </span>
              )}
            </div>
            <p className={`text-xs ${t.textMuted}`}>
              @{user.username} ·{' '}
              {user.isPlatformOwner
                ? 'Talkcob Owner'
                : user.isPlatformAdmin
                ? 'Platform Admin'
                : perms.isOwner
                ? 'Server Owner'
                : user.role}{' '}
              · Member since {user.joinedAt}
            </p>
            {user.customStatus && (
              <p className={`text-xs mt-1.5 ${t.textSecondary}`}>{user.customStatus}</p>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${t.dockBg} ${t.border} mb-4`}>
            <div className={`text-xs font-semibold mb-1 ${t.textMuted}`}>About Me</div>
            <p className={`text-sm leading-relaxed ${t.textSecondary}`}>{user.bio}</p>
          </div>

          {user.socialLinks && user.socialLinks.length > 0 && (
            <div className={`p-3 rounded-lg border ${t.dockBg} ${t.border} mb-4 space-y-2`}>
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${t.textMuted}`}>
                <LinkIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Social Links</span>
              </div>
              <div className="space-y-1.5">
                {user.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={normalizeSocialUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border ${t.border} ${t.sidebarBg} ${t.hoverBg} transition-colors`}
                  >
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${t.textPrimary}`}>
                        {link.label}
                      </div>
                      <div className={`text-[11px] truncate ${t.textMuted}`}>
                        {getDomainLabel(link.url)}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {server && canManageRoles && !perms.isOwner && settingsRole && onToggleMemberRole && (
            <div className={`p-3 rounded-lg border ${t.dockBg} ${t.border} mb-4 flex items-center justify-between gap-2`}>
              <div>
                <div className={`text-xs font-semibold ${t.textPrimary}`}>Role: settings</div>
                <div className={`text-[11px] ${t.textMuted}`}>Add channels & Server Settings</div>
              </div>
              <button
                onClick={() => onToggleMemberRole(server.id, user.id, settingsRole.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  perms.hasSettingsRole
                    ? 'bg-[#E53935] text-white'
                    : `${t.sidebarBg} ${t.textSecondary} hover:bg-[#E53935] hover:text-white`
                }`}
              >
                {perms.hasSettingsRole ? 'Assigned' : 'Grant'}
              </button>
            </div>
          )}

          {!isCurrentUser && (
            <div className="flex items-center gap-2">
              {friendStatus === 'none' && (
                <button
                  onClick={() => onAddFriend(user.id)}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Add Friend
                </button>
              )}
              {friendStatus === 'outgoing' && (
                <button
                  disabled
                  className={`flex-1 py-2 px-3 rounded-lg border ${t.border} ${t.textMuted} text-xs font-semibold whitespace-nowrap`}
                >
                  Request Sent
                </button>
              )}
              {friendStatus === 'incoming' && (
                <button
                  onClick={() => onAcceptFriend(user.id)}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Accept Friend
                </button>
              )}
              {friendStatus === 'friends' && (
                <button
                  onClick={() => onRemoveFriend(user.id)}
                  className={`flex-1 py-2 px-3 rounded-lg border ${t.border} text-[#EF4444] hover:bg-[#E53935]/15 text-xs font-semibold transition-colors whitespace-nowrap`}
                >
                  Remove Friend
                </button>
              )}

              <button
                onClick={() => {
                  onStartDm(user.id);
                  onClose();
                }}
                className={`flex-1 py-2 px-3 rounded-lg border ${t.border} ${t.textPrimary} ${t.hoverBg} text-xs font-semibold transition-colors whitespace-nowrap`}
              >
                Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* 5. Quick Switcher (Cmd+K) */
export const QuickSwitcherModal: React.FC<{
  servers: Server[];
  channels: Channel[];
  dmThreads: DirectMessageThread[];
  users: Record<string, User>;
  currentUserId: string;
  theme: AppTheme;
  onClose: () => void;
  onJumpChannel: (serverId: string, channelId: string) => void;
  onJumpDm: (userId: string) => void;
}> = ({
  servers,
  channels,
  dmThreads,
  users,
  currentUserId,
  theme,
  onClose,
  onJumpChannel,
  onJumpDm,
}) => {
  const t = THEME_TOKENS[theme];
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matchedChannels = channels.filter((c) => c.name.toLowerCase().includes(q));
  const matchedDms = dmThreads
    .map((d) => users[d.participantId])
    .filter(
      (u): u is User =>
        Boolean(u) &&
        u.id !== currentUserId &&
        (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    );

  return (
    <ModalWrapper title="Quick Switcher" onClose={onClose} theme={theme} maxWidth="max-w-lg">
      <div className="space-y-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t.inputBg} ${t.border}`}>
          <Search className="w-4 h-4 text-[#EF4444]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where would you like to go? Type a channel name..."
            className={`flex-1 bg-transparent text-sm focus:outline-none ${t.textPrimary}`}
          />
        </div>

        <div className="max-h-72 overflow-y-auto talkcob-scroll space-y-1">
          {matchedDms.map((friend) => (
            <button
              key={friend.id}
              onClick={() => {
                onJumpDm(friend.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${t.hoverBg}`}
            >
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={friend.name}
                  src={friend.avatar}
                  accentColor={friend.accentColor}
                  size="xs"
                />
                <span className={`text-sm font-medium ${t.textPrimary}`}>{friend.name}</span>
                <span className={`text-xs ${t.textMuted}`}>@{friend.username}</span>
              </div>
              <span className={`text-xs ${t.textMuted}`}>Direct Message</span>
            </button>
          ))}

          {matchedChannels.map((ch) => {
            const srv = servers.find((s) => s.id === ch.serverId);
            return (
              <button
                key={ch.id}
                onClick={() => {
                  onJumpChannel(ch.serverId, ch.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${t.hoverBg}`}
              >
                <div className="flex items-center gap-2.5">
                  {ch.type === 'voice' ? (
                    <Volume2 className="w-4 h-4 text-[#EF4444]" />
                  ) : (
                    <Hash className="w-4 h-4 text-[#EF4444]" />
                  )}
                  <span className={`text-sm font-medium ${t.textPrimary}`}>{ch.name}</span>
                </div>
                <span className={`text-xs ${t.textMuted}`}>{srv?.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalWrapper>
  );
};

