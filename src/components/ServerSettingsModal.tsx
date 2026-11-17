import React, { useMemo, useRef, useState } from 'react';
import {
  Ban,
  BookOpen,
  Bot,
  Check,
  Copy,
  Crop,
  Crown,
  Edit3,
  Hash,
  ImagePlus,
  Link as LinkIcon,
  Lock,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  Smile,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  ALL_ROLE_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_SETTINGS_PERMISSIONS,
  HOME_SERVER_ID,
} from '../data/seedData';
import {
  AppTheme,
  Channel,
  ChannelPermissionKey,
  CustomBot,
  PermissionOverrideValue,
  RolePermissions,
  Server,
  ServerAuditEntry,
  ServerRole,
  User,
} from '../types/talkcob';
import {
  CHANNEL_PERMISSION_DEFINITIONS,
  getUserServerPermissions,
  resolveRolePermissions,
} from '../utils/permissions';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';
import { AvatarCropModal } from './AvatarCropModal';

type SettingsTab =
  | 'overview'
  | 'roles'
  | 'channels'
  | 'expressions'
  | 'bots'
  | 'safety'
  | 'automod'
  | 'audit'
  | 'members'
  | 'invites'
  | 'bans'
  | 'welcome'
  | 'perks';

export type ServerSettingsTab = SettingsTab;

interface ServerSettingsModalProps {
  server: Server;
  channels: Channel[];
  users: Record<string, User>;
  bots?: CustomBot[];
  activeUserId: string;
  theme: AppTheme;
  initialTab?: SettingsTab;
  initialChannelId?: string | null;
  onClose: () => void;
  onUpdateServer: (serverId: string, updates: Partial<Server>) => void;
  onCreateChannel: (name: string, type: 'text' | 'voice', topic: string, category?: string) => void;
  onUpdateChannel?: (channelId: string, updates: Partial<Channel>) => void;
  onDeleteChannel: (channelId: string) => void;
  onToggleMemberRole: (serverId: string, userId: string, roleId: string) => void;
  onCreateRole: (serverId: string, role: ServerRole) => void;
  onUpdateRole: (serverId: string, roleId: string, updates: Partial<ServerRole>) => void;
  onDeleteRole: (serverId: string, roleId: string) => void;
  onToggleBotServer?: (botId: string, serverId: string) => void;
  onOpenBotStudio?: () => void;
  onDeleteServer: (serverId: string) => void;
  onSwitchActiveUser: (userId: string) => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  server,
  channels,
  users,
  bots = [],
  activeUserId,
  theme,
  initialTab = 'overview',
  initialChannelId = null,
  onClose,
  onUpdateServer,
  onCreateChannel,
  onUpdateChannel,
  onDeleteChannel,
  onToggleMemberRole,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onToggleBotServer,
  onOpenBotStudio,
  onDeleteServer,
  onSwitchActiveUser,
}) => {
  const t = THEME_TOKENS[theme];
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Overview & Server Profile state
  const [name, setName] = useState(server.name);
  const [shortName, setShortName] = useState(server.shortName);
  const [description, setDescription] = useState(server.description);
  const [accentColor, setAccentColor] = useState(server.accentColor);
  const [bannerColor, setBannerColor] = useState(server.bannerColor || server.accentColor);
  const [systemChannelId, setSystemChannelId] = useState(server.systemChannelId || '');
  const [afkChannelId, setAfkChannelId] = useState(server.afkChannelId || '');
  const [afkTimeoutMinutes, setAfkTimeoutMinutes] = useState<1 | 5 | 15 | 30 | 60>(
    server.afkTimeoutMinutes || 15
  );
  const [defaultNotifications, setDefaultNotifications] = useState<'all' | 'mentions'>(
    server.defaultNotifications || 'all'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  // Server Icon Upload & Cropper state
  const serverIconInputRef = useRef<HTMLInputElement>(null);
  const [cropSourceSrc, setCropSourceSrc] = useState<string | null>(null);

  // Roles state
  const [selectedRoleId, setSelectedRoleId] = useState<string>(server.roles[0]?.id || '');
  const [roleSubTab, setRoleSubTab] = useState<'display' | 'permissions' | 'members'>('permissions');
  const [permSearch, setPermSearch] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  // Channels & Per-Channel Permissions state
  const [newChName, setNewChName] = useState('');
  const [newChType, setNewChType] = useState<'text' | 'voice'>('text');
  const [newChCategory, setNewChCategory] = useState('Community');
  const [newChTopic, setNewChTopic] = useState('');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChName, setEditChName] = useState('');
  const [editChCategory, setEditChCategory] = useState('');
  const [editChTopic, setEditChTopic] = useState('');
  const [permChannelId, setPermChannelId] = useState<string | null>(initialChannelId);
  const [permTargetType, setPermTargetType] = useState<'role' | 'member'>('role');
  const [permTargetId, setPermTargetId] = useState<string>(
    server.roles.find((r) => r.name.toLowerCase() === 'member')?.id || server.roles[0]?.id || ''
  );
  const [chPermSearch, setChPermSearch] = useState('');
  const [addMemberPermId, setAddMemberPermId] = useState<string>('');

  // Safety & Moderation state
  const [verificationLevel, setVerificationLevel] = useState<'none' | 'low' | 'medium' | 'high'>(
    server.verificationLevel || 'low'
  );
  const [explicitFilter, setExplicitFilter] = useState<'disabled' | 'no_role' | 'all_members'>(
    server.explicitFilter || 'no_role'
  );
  const [slowmodeSeconds, setSlowmodeSeconds] = useState<0 | 5 | 10 | 30 | 60>(
    server.slowmodeSeconds || 0
  );
  const [safetySaved, setSafetySaved] = useState(false);

  // AutoMod state
  const [newBlockedWord, setNewBlockedWord] = useState('');

  // Welcome & Rules state
  const [welcomeEnabled, setWelcomeEnabled] = useState(server.welcomeMessageEnabled ?? true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    server.welcomeMessage || `Welcome to ${server.name}! Say hello and jump into any channel.`
  );
  const [rulesEnabled, setRulesEnabled] = useState(server.communityRulesEnabled ?? true);
  const [rulesSummary, setRulesSummary] = useState(
    server.rulesSummary || 'Be respectful, keep channels welcoming, and enjoy Talkcob for free.'
  );
  const [welcomeSaved, setWelcomeSaved] = useState(false);

  // Members & Invites state
  const [memberSearch, setMemberSearch] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [vanityDraft, setVanityDraft] = useState(server.vanityCode || '');
  const [vanitySaved, setVanitySaved] = useState(false);

  const actorName = users[activeUserId]?.name || 'Server Admin';
  const isPermanentHq = server.id === HOME_SERVER_ID;
  const isOwner = server.ownerId === activeUserId;
  const serverChannels = channels.filter((c) => c.serverId === server.id);
  const textChannels = serverChannels.filter((c) => c.type === 'text');
  const voiceChannels = serverChannels.filter((c) => c.type === 'voice');
  const members = server.memberIds.map((id) => users[id]).filter(Boolean);
  const bannedUsers = (server.bannedUserIds || []).map((id) => users[id]).filter(Boolean);
  const mutedIds = server.mutedUserIds || [];
  const blockedWords = server.blockedWords || [];
  const auditEntries = server.auditLog || [];
  const selectedRole = server.roles.find((r) => r.id === selectedRoleId) || server.roles[0];

  const colorChoices = ['#E53935', '#DC2626', '#B91C1C', '#F97316', '#0D9488', '#4F46E5'];

  const appendAudit = (action: string, extraUpdates: Partial<Server> = {}) => {
    const entry: ServerAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      action,
      actorName,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    onUpdateServer(server.id, {
      ...extraUpdates,
      auditLog: [entry, ...(server.auditLog || [])].slice(0, 30),
    });
  };

  const navSections = useMemo<
    Array<{
      title: string;
      items: Array<{
        id: SettingsTab;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        highlight?: boolean;
      }>;
    }>
  >(
    () => [
      {
        title: 'SERVER MANAGEMENT',
        items: [
          { id: 'overview', label: 'Server Profile', icon: ImagePlus },
          { id: 'roles', label: 'Roles', icon: Shield },
          { id: 'channels', label: 'Channels', icon: Hash },
          { id: 'expressions', label: 'Emoji & Stickers', icon: Smile },
          { id: 'bots', label: 'Bots & Integrations', icon: Bot },
        ],
      },
      {
        title: 'MODERATION & SAFETY',
        items: [
          { id: 'safety', label: 'Safety Setup', icon: ShieldAlert },
          { id: 'automod', label: 'AutoMod', icon: Bot },
          { id: 'audit', label: 'Audit Log', icon: ScrollText },
        ],
      },
      {
        title: 'PEOPLE & ACCESS',
        items: [
          { id: 'members', label: 'Members', icon: Users },
          { id: 'invites', label: 'Invites & Vanity', icon: LinkIcon },
          { id: 'bans', label: 'Bans', icon: Ban },
        ],
      },
      {
        title: 'COMMUNITY & PERKS',
        items: [
          { id: 'welcome', label: 'Welcome & Rules', icon: BookOpen },
          { id: 'perks', label: 'Server Perks (Free)', icon: Sparkles, highlight: true },
        ],
      },
    ],
    []
  );

  const q = searchQuery.trim().toLowerCase();
  const filteredSections = navSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => item.label.toLowerCase().includes(q)),
    }))
    .filter((sec) => sec.items.length > 0);

  const handleServerIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropSourceSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveOverview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    appendAudit(`Updated server profile & general settings for ${name.trim()}`, {
      name: name.trim(),
      shortName: (shortName.trim() || name.trim().slice(0, 2)).toUpperCase().slice(0, 2),
      description: description.trim(),
      accentColor,
      bannerColor,
      systemChannelId: systemChannelId || undefined,
      afkChannelId: afkChannelId || undefined,
      afkTimeoutMinutes,
      defaultNotifications,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRoleName.trim();
    if (!clean) return;
    const isSettingsName = clean.toLowerCase() === 'settings';
    const roleId = `role-${Date.now()}`;
    onCreateRole(server.id, {
      id: roleId,
      name: clean,
      color: isSettingsName ? '#E53935' : '#F97316',
      canAccessServerSettings: isSettingsName,
      canCreateChannels: isSettingsName,
      permissions: isSettingsName ? { ...DEFAULT_SETTINGS_PERMISSIONS } : { ...DEFAULT_MEMBER_PERMISSIONS },
    });
    appendAudit(`Created role "${clean}"`);
    setSelectedRoleId(roleId);
    setRoleSubTab('permissions');
    setNewRoleName('');
  };

  const handleAddChannelFromSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChName.trim()) return;
    const formatted =
      newChType === 'text'
        ? newChName.trim().toLowerCase().replace(/\s+/g, '-')
        : newChName.trim();
    onCreateChannel(
      formatted,
      newChType,
      newChTopic.trim(),
      newChCategory.trim() || (newChType === 'voice' ? 'Voice Channels' : 'Community')
    );
    appendAudit(`Created ${newChType} channel "${formatted}"`);
    setNewChName('');
    setNewChTopic('');
  };

  const handleSaveSafety = (e: React.FormEvent) => {
    e.preventDefault();
    appendAudit(`Updated Safety Setup (Verification: ${verificationLevel}, Slowmode: ${slowmodeSeconds}s)`, {
      verificationLevel,
      explicitFilter,
      slowmodeSeconds,
    });
    setSafetySaved(true);
    setTimeout(() => setSafetySaved(false), 1800);
  };

  const handleSaveWelcome = (e: React.FormEvent) => {
    e.preventDefault();
    appendAudit('Updated Welcome Message & Community Rules', {
      welcomeMessageEnabled: welcomeEnabled,
      welcomeMessage: welcomeMessage.trim(),
      communityRulesEnabled: rulesEnabled,
      rulesSummary: rulesSummary.trim(),
    });
    setWelcomeSaved(true);
    setTimeout(() => setWelcomeSaved(false), 1800);
  };

  const handleAddBlockedWord = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBlockedWord.trim().toLowerCase();
    if (!clean || blockedWords.includes(clean)) return;
    appendAudit(`Added AutoMod keyword "${clean}"`, {
      blockedWords: [...blockedWords, clean],
    });
    setNewBlockedWord('');
  };

  const handleRemoveBlockedWord = (word: string) => {
    appendAudit(`Removed AutoMod keyword "${word}"`, {
      blockedWords: blockedWords.filter((w) => w !== word),
    });
  };

  const handleToggleMuteMember = (userId: string, memberName: string) => {
    const isMutedMember = mutedIds.includes(userId);
    appendAudit(`${isMutedMember ? 'Removed timeout for' : 'Timed out'} ${memberName}`, {
      mutedUserIds: isMutedMember
        ? mutedIds.filter((id) => id !== userId)
        : [...mutedIds, userId],
    });
  };

  const handleBanMember = (userId: string, memberName: string) => {
    const existingBans = server.bannedUserIds || [];
    if (existingBans.includes(userId)) return;
    appendAudit(`Banned ${memberName} from ${server.name}`, {
      bannedUserIds: [...existingBans, userId],
    });
  };

  const handleUnbanMember = (userId: string, memberName: string) => {
    const existingBans = server.bannedUserIds || [];
    appendAudit(`Unbanned ${memberName}`, {
      bannedUserIds: existingBans.filter((id) => id !== userId),
    });
  };

  const inviteUrl = `https://talkcob.app/invite/${server.vanityCode || server.inviteCode}`;

  const filteredMembers = members.filter((m) => {
    const mq = memberSearch.trim().toLowerCase();
    if (!mq) return true;
    return m.name.toLowerCase().includes(mq) || m.username.toLowerCase().includes(mq);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${server.name} Server Settings`}
      className={`fixed inset-0 z-50 flex flex-col md:flex-row ${t.chatBg}`}
    >
      <input
        ref={serverIconInputRef}
        type="file"
        accept="image/*"
        onChange={handleServerIconSelect}
        className="hidden"
      />

      {/* Left Discord-style Navigation Sidebar */}
      <aside
        className={`w-full md:w-64 shrink-0 md:h-full border-b md:border-b-0 md:border-r flex flex-col justify-between p-3.5 overflow-x-auto md:overflow-y-auto talkcob-scroll ${t.sidebarBg} ${t.border}`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 pb-2.5">
            <div className={`px-1 text-xs font-bold uppercase tracking-wider truncate ${t.textMuted}`}>
              {server.name}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Server Settings"
              className={`md:hidden p-1.5 rounded-lg text-[#EF4444] ${t.hoverBg}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className={`mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E53935]/70 ${t.inputBg}`}
          >
            <Search className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search server settings"
              className={`w-full bg-transparent text-xs focus:outline-none ${t.textPrimary} placeholder:text-[#80848E]`}
            />
          </div>

          <nav className="flex md:block gap-1 overflow-x-auto md:overflow-visible">
            {filteredSections.map((sec, sIdx) => (
              <div key={sec.title} className={sIdx > 0 ? 'md:mt-4 flex md:block gap-1' : 'flex md:block gap-1'}>
                <div
                  className={`hidden md:block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}
                >
                  {sec.title}
                </div>
                <div className="flex md:block gap-1">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    const isHighlight = item.highlight;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`w-auto md:w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${
                          active
                            ? `${t.activeBg} ${isHighlight ? 'text-[#F59E0B]' : t.textPrimary}`
                            : `${isHighlight ? 'text-[#F59E0B]' : t.textSecondary} ${t.hoverBg}`
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isHighlight ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                          }`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className={`hidden md:block my-3 border-t ${t.border}`} />

          <div className="hidden md:block">
            {isPermanentHq ? (
              <div className={`px-2.5 py-2 rounded-md text-xs flex items-center justify-between ${t.textMuted}`}>
                <span>Permanent Server</span>
                <Lock className="w-3.5 h-3.5 text-[#EF4444]" />
              </div>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteServer(server.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-medium text-[#EF4444] hover:bg-[#E53935]/15 transition-colors"
              >
                <span>Delete Server</span>
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className={`hidden md:block pt-3 border-t ${t.border} text-xs ${t.textMuted}`}>
          <p className="font-medium">
            {isOwner ? 'Viewing as Server Owner' : 'Viewing with settings role'}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto talkcob-scroll">
        <div className="max-w-3xl mx-auto px-5 sm:px-10 py-8 relative">
          {/* Discord-style circular ESC close button */}
          <div className="hidden md:flex fixed top-6 right-6 sm:right-10 flex-col items-center gap-1 z-10">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Server Settings"
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ${t.border} text-[#EF4444] hover:bg-[#E53935] hover:text-white hover:border-[#E53935]`}
            >
              <X className="w-5 h-5" />
            </button>
            <span className={`text-[10px] font-bold tracking-wider ${t.textMuted}`}>ESC</span>
          </div>

          {/* TAB 1: SERVER PROFILE & OVERVIEW */}
          {tab === 'overview' && (
            <form onSubmit={handleSaveOverview} className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                  Server Profile & Overview
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Upload and crop a server picture, customize banner colors, configure channels, and manage notifications.
                </p>
              </div>

              {/* Server Icon Upload & Crop Showcase Card */}
              <div className={`rounded-xl border overflow-hidden ${t.sidebarBg} ${t.border}`}>
                <div
                  className="h-20 w-full transition-colors"
                  style={{ backgroundColor: bannerColor }}
                />
                <div className="p-5 -mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <button
                      type="button"
                      onClick={() => serverIconInputRef.current?.click()}
                      title="Upload & crop server picture"
                      className="group relative w-24 h-24 rounded-2xl border-4 border-[#1E1F22] overflow-hidden flex items-center justify-center font-display font-extrabold text-2xl text-white shrink-0 shadow-lg"
                      style={{ backgroundColor: server.iconUrl ? '#18181B' : accentColor }}
                    >
                      {server.iconUrl ? (
                        <img
                          src={server.iconUrl}
                          alt={server.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(shortName || 'TH').toUpperCase()}</span>
                      )}
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1">
                        <ImagePlus className="w-5 h-5 text-[#EF4444]" />
                        <span>Change Icon</span>
                      </div>
                    </button>

                    <div className="pb-1">
                      <div className={`font-display font-bold text-base ${t.textPrimary}`}>
                        {name || server.name}
                      </div>
                      <div className={`text-xs ${t.textMuted}`}>
                        Recommended 512x512 PNG or JPG · Croppable circular rail icon
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => serverIconInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Upload Picture</span>
                    </button>

                    {server.iconUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCropSourceSrc(server.iconUrl || null)}
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textPrimary} ${t.hoverBg} transition-colors`}
                        >
                          <Crop className="w-3.5 h-3.5 text-[#EF4444]" />
                          <span>Crop Picture</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            appendAudit('Removed server profile picture', { iconUrl: undefined })
                          }
                          title="Remove server picture"
                          aria-label="Remove server picture"
                          className={`p-2 rounded-lg border text-[#EF4444] ${t.border} hover:bg-[#E53935]/15 transition-colors`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Color Pickers */}
                <div className={`px-5 pb-5 pt-2 border-t ${t.border} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                  <div>
                    <div className={`text-xs font-semibold mb-2 ${t.textSecondary}`}>
                      Fallback Badge Color
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {colorChoices.map((c) => (
                        <button
                          key={`accent-${c}`}
                          type="button"
                          onClick={() => setAccentColor(c)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            accentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2B2D31]' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Choose accent ${c}`}
                        >
                          {accentColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={`text-xs font-semibold mb-2 ${t.textSecondary}`}>
                      Server Banner Color
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {colorChoices.map((c) => (
                        <button
                          key={`banner-${c}`}
                          type="button"
                          onClick={() => setBannerColor(c)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            bannerColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2B2D31]' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Choose banner ${c}`}
                        >
                          {bannerColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Initials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                    Initials (2 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-lg border text-sm uppercase font-display font-bold ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                  Server Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                />
              </div>

              {/* System Messages & AFK Settings */}
              <div className={`p-5 rounded-xl border space-y-4 ${t.sidebarBg} ${t.border}`}>
                <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                  System Messages & Voice AFK
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                      System Messages Channel
                    </label>
                    <select
                      value={systemChannelId}
                      onChange={(e) => setSystemChannelId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    >
                      <option value="">No System Channel</option>
                      {textChannels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                      Inactive (AFK) Channel
                    </label>
                    <select
                      value={afkChannelId}
                      onChange={(e) => setAfkChannelId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    >
                      <option value="">No Inactive Channel</option>
                      {voiceChannels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                      Inactive Timeout
                    </label>
                    <select
                      value={afkTimeoutMinutes}
                      onChange={(e) =>
                        setAfkTimeoutMinutes(Number(e.target.value) as 1 | 5 | 15 | 30 | 60)
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    >
                      <option value={1}>1 minute</option>
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>
                    Default Notification Settings
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {([
                      { id: 'all', label: 'All Messages', desc: 'Notify members on every message' },
                      { id: 'mentions', label: 'Only @mentions', desc: 'Recommended for busy communities' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDefaultNotifications(opt.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          defaultNotifications === opt.id
                            ? 'border-[#E53935] bg-[#E53935]/15'
                            : `${t.border} ${t.hoverBg}`
                        }`}
                      >
                        <div className={`text-sm font-semibold ${t.textPrimary}`}>{opt.label}</div>
                        <div className={`text-xs ${t.textMuted}`}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold transition-colors"
                >
                  Save Changes
                </button>
                {savedNotice && (
                  <span className="text-xs font-semibold text-[#23A55A] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 2: ROLES & DISCORD PERMISSIONS */}
          {tab === 'roles' && (() => {
            const selectedPerms = selectedRole
              ? resolveRolePermissions(selectedRole)
              : DEFAULT_MEMBER_PERMISSIONS;
            const isSettingsLocked = selectedRole?.name.trim().toLowerCase() === 'settings';
            const isMemberRole = selectedRole?.name.trim().toLowerCase() === 'member';

            const updateRolePerm = (key: keyof RolePermissions, value: boolean) => {
              if (!selectedRole) return;
              const nextPerms: RolePermissions = {
                ...selectedPerms,
                [key]: value,
              };
              if (isSettingsLocked) {
                nextPerms.manageServer = true;
                nextPerms.manageChannels = true;
              }
              onUpdateRole(server.id, selectedRole.id, {
                permissions: nextPerms,
                canAccessServerSettings: nextPerms.manageServer || nextPerms.administrator,
                canCreateChannels: nextPerms.manageChannels || nextPerms.administrator,
              });
            };

            const applyRolePreset = (preset: 'clear' | 'mod' | 'all') => {
              if (!selectedRole) return;
              let nextPerms: RolePermissions;
              if (preset === 'all') {
                nextPerms = { ...ALL_ROLE_PERMISSIONS };
              } else if (preset === 'mod') {
                nextPerms = {
                  ...DEFAULT_MEMBER_PERMISSIONS,
                  manageMessages: true,
                  kickMembers: true,
                  banMembers: true,
                  muteMembers: true,
                  mentionEveryone: true,
                  manageChannels: isSettingsLocked,
                  manageServer: isSettingsLocked,
                };
              } else {
                nextPerms = {
                  administrator: false,
                  manageServer: isSettingsLocked,
                  manageRoles: false,
                  manageChannels: isSettingsLocked,
                  kickMembers: false,
                  banMembers: false,
                  manageMessages: false,
                  sendMessages: false,
                  attachFiles: false,
                  addReactions: false,
                  mentionEveryone: false,
                  connectVoice: false,
                  speakVoice: false,
                  shareScreen: false,
                  muteMembers: false,
                  manageBots: false,
                };
              }
              onUpdateRole(server.id, selectedRole.id, {
                permissions: nextPerms,
                canAccessServerSettings: nextPerms.manageServer || nextPerms.administrator,
                canCreateChannels: nextPerms.manageChannels || nextPerms.administrator,
              });
              appendAudit(`Updated permissions preset for role "${selectedRole.name}"`);
            };

            const permissionCategories: Array<{
              category: string;
              items: Array<{
                key: keyof RolePermissions;
                label: string;
                desc: string;
                danger?: boolean;
                lockedOn?: boolean;
              }>;
            }> = [
              {
                category: 'General Server Permissions',
                items: [
                  {
                    key: 'administrator',
                    label: 'Administrator',
                    desc: 'Members with this permission have every permission and bypass channel restrictions. Grant with care.',
                    danger: true,
                  },
                  {
                    key: 'manageServer',
                    label: 'Manage Server (Server Settings)',
                    desc: 'Allows opening Server Settings, editing name, server picture, AutoMod, and server configuration.',
                    lockedOn: isSettingsLocked,
                  },
                  {
                    key: 'manageRoles',
                    label: 'Manage Roles',
                    desc: 'Allows creating new roles and editing role colors, names, and permissions.',
                  },
                  {
                    key: 'manageChannels',
                    label: 'Manage Channels',
                    desc: 'Allows creating, editing, and deleting text and voice channels.',
                    lockedOn: isSettingsLocked,
                  },
                  {
                    key: 'manageBots',
                    label: 'Manage Bots & Integrations',
                    desc: 'Allows adding or removing custom bots inside this server.',
                  },
                ],
              },
              {
                category: 'Membership Permissions',
                items: [
                  {
                    key: 'kickMembers',
                    label: 'Kick & Mute Members',
                    desc: 'Allows muting or removing members from the server.',
                  },
                  {
                    key: 'banMembers',
                    label: 'Ban Members',
                    desc: 'Allows permanently banning and unbanning members.',
                  },
                ],
              },
              {
                category: 'Text Channel Permissions',
                items: [
                  {
                    key: 'sendMessages',
                    label: 'Send Messages',
                    desc: 'Allows sending messages in server text channels.',
                  },
                  {
                    key: 'attachFiles',
                    label: 'Attach Files & Images',
                    desc: 'Allows uploading and posting images in text channels.',
                  },
                  {
                    key: 'addReactions',
                    label: 'Add Reactions',
                    desc: 'Allows adding emoji reactions to messages.',
                  },
                  {
                    key: 'mentionEveryone',
                    label: 'Mention @everyone & Roles',
                    desc: 'Allows tagging @everyone and server roles in chat.',
                  },
                  {
                    key: 'manageMessages',
                    label: 'Manage Messages',
                    desc: 'Allows pinning or deleting messages sent by any member.',
                  },
                ],
              },
              {
                category: 'Voice Channel Permissions',
                items: [
                  {
                    key: 'connectVoice',
                    label: 'Connect to Voice Channels',
                    desc: 'Allows joining voice channels in this server.',
                  },
                  {
                    key: 'speakVoice',
                    label: 'Speak in Voice',
                    desc: 'Allows talking with a microphone in voice channels.',
                  },
                  {
                    key: 'shareScreen',
                    label: 'Video & Share Screen',
                    desc: 'Allows streaming and sharing your screen in server voice channels.',
                  },
                  {
                    key: 'muteMembers',
                    label: 'Mute Members in Voice',
                    desc: 'Allows voice moderators to manage voice room audio.',
                  },
                ],
              },
            ];

            const pq = permSearch.trim().toLowerCase();

            return (
              <div className="space-y-6 md:pr-12">
                <div>
                  <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                    Server Roles & Permissions
                  </h2>
                  <p className={`text-sm mt-1 ${t.textMuted}`}>
                    Configure granular Discord-style permissions per role. Anyone with the{' '}
                    <strong className="text-[#EF4444]">settings</strong> role always has access to add channels and Server Settings.
                  </p>
                </div>

                <form onSubmit={handleAddRole} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="New role name (e.g. moderator, streamer, vip)"
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Role</span>
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  {/* Left Role Selector */}
                  <div className={`rounded-xl border p-2 space-y-1 ${t.sidebarBg} ${t.border}`}>
                    {server.roles.map((r) => {
                      const assignedCount = server.memberIds.filter((uid) =>
                        (server.memberRoles[uid] || []).includes(r.id)
                      ).length;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRoleId(r.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedRole?.id === r.id ? t.activeBg : t.hoverBg
                          } ${t.textPrimary}`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="truncate">{r.name}</span>
                          </span>
                          <span className={`text-[11px] tabular-nums ${t.textMuted}`}>
                            {assignedCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Role Editor with Display / Permissions / Manage Members */}
                  {selectedRole && (
                    <div className={`md:col-span-2 rounded-xl border p-5 space-y-5 ${t.sidebarBg} ${t.border}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: selectedRole.color }}
                          />
                          <h3 className={`font-display font-bold text-base truncate ${t.textPrimary}`}>
                            Edit Role — {selectedRole.name}
                          </h3>
                        </div>

                        {!isSettingsLocked && !isMemberRole && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteRole(server.id, selectedRole.id);
                              appendAudit(`Deleted role "${selectedRole.name}"`);
                            }}
                            className="text-xs font-semibold text-[#EF4444] hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Role
                          </button>
                        )}
                      </div>

                      {/* Discord-style Role Editor Tabs */}
                      <div className={`flex items-center gap-1 border-b pb-2 ${t.border}`}>
                        {([
                          { id: 'display', label: 'Display' },
                          { id: 'permissions', label: 'Permissions' },
                          { id: 'members', label: 'Manage Members' },
                        ] as const).map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setRoleSubTab(sub.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              roleSubTab === sub.id
                                ? 'bg-[#E53935] text-white'
                                : `${t.textSecondary} ${t.hoverBg}`
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>

                      {/* SUB-TAB 1: DISPLAY */}
                      {roleSubTab === 'display' && (
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${t.textMuted}`}>
                              Role Name
                            </label>
                            <input
                              type="text"
                              value={selectedRole.name}
                              disabled={isSettingsLocked || isMemberRole}
                              onChange={(e) =>
                                onUpdateRole(server.id, selectedRole.id, {
                                  name: e.target.value,
                                })
                              }
                              className={`w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-60 ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                            />
                            {(isSettingsLocked || isMemberRole) && (
                              <p className={`text-[11px] mt-1 ${t.textMuted}`}>
                                Built-in &ldquo;{selectedRole.name}&rdquo; role name is locked.
                              </p>
                            )}
                          </div>

                          <div>
                            <div className={`text-xs font-semibold mb-2 ${t.textMuted}`}>Role Color</div>
                            <div className="flex flex-wrap gap-2">
                              {colorChoices.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => onUpdateRole(server.id, selectedRole.id, { color: c })}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                    selectedRole.color === c ? 'ring-2 ring-white' : ''
                                  }`}
                                  style={{ backgroundColor: c }}
                                  aria-label={`Set role color ${c}`}
                                >
                                  {selectedRole.color === c && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 2: GRANULAR DISCORD PERMISSIONS */}
                      {roleSubTab === 'permissions' && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div
                              className={`flex-1 min-w-[180px] flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${t.inputBg} ${t.border}`}
                            >
                              <Search className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                              <input
                                type="text"
                                value={permSearch}
                                onChange={(e) => setPermSearch(e.target.value)}
                                placeholder="Search permissions"
                                className={`w-full bg-transparent text-xs focus:outline-none ${t.textPrimary} placeholder:text-[#80848E]`}
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => applyRolePreset('mod')}
                                className={`px-2.5 py-1.5 rounded-md border text-[11px] font-semibold ${t.border} ${t.textSecondary} ${t.hoverBg}`}
                              >
                                Moderator Preset
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('all')}
                                className={`px-2.5 py-1.5 rounded-md border text-[11px] font-semibold ${t.border} ${t.textSecondary} ${t.hoverBg}`}
                              >
                                Enable All
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('clear')}
                                className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-[#EF4444] hover:bg-[#E53935]/15"
                              >
                                Clear permissions
                              </button>
                            </div>
                          </div>

                          <div className="space-y-5 max-h-[420px] overflow-y-auto talkcob-scroll pr-1">
                            {permissionCategories.map((group) => {
                              const matchedItems = group.items.filter(
                                (it) =>
                                  !pq ||
                                  it.label.toLowerCase().includes(pq) ||
                                  it.desc.toLowerCase().includes(pq)
                              );
                              if (matchedItems.length === 0) return null;

                              return (
                                <div key={group.category} className="space-y-2">
                                  <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                                    {group.category}
                                  </div>
                                  <div className="space-y-2">
                                    {matchedItems.map((perm) => {
                                      const checked = Boolean(selectedPerms[perm.key]);
                                      return (
                                        <label
                                          key={perm.key}
                                          className={`flex items-start justify-between gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${t.border} ${t.dockBg}`}
                                        >
                                          <div className="min-w-0">
                                            <div
                                              className={`text-sm font-semibold flex items-center gap-1.5 ${
                                                perm.danger ? 'text-[#F59E0B]' : t.textPrimary
                                              }`}
                                            >
                                              <span>{perm.label}</span>
                                              {perm.lockedOn && (
                                                <Lock className="w-3 h-3 text-[#EF4444] shrink-0" />
                                              )}
                                            </div>
                                            <div className={`text-xs mt-0.5 leading-relaxed ${t.textMuted}`}>
                                              {perm.desc}
                                            </div>
                                          </div>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={perm.lockedOn}
                                            onChange={(e) => updateRolePerm(perm.key, e.target.checked)}
                                            className="w-4 h-4 mt-0.5 accent-[#E53935] shrink-0"
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 3: MANAGE MEMBERS */}
                      {roleSubTab === 'members' && (
                        <div>
                          <h4 className={`text-xs font-semibold mb-2 ${t.textMuted}`}>
                            Members with &ldquo;{selectedRole.name}&rdquo;
                          </h4>
                          <div className="space-y-1.5 max-h-80 overflow-y-auto talkcob-scroll pr-1">
                            {members.map((m) => {
                              const assigned = (server.memberRoles[m.id] || []).includes(selectedRole.id);
                              const memberIsOwner = server.ownerId === m.id;
                              return (
                                <label
                                  key={m.id}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${t.hoverBg}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar
                                      name={m.name}
                                      src={m.avatar}
                                      accentColor={m.accentColor}
                                      size="xs"
                                    />
                                    <span className={`text-sm font-medium truncate ${t.textPrimary}`}>
                                      {m.name}
                                    </span>
                                    <span className={`text-xs truncate ${t.textMuted}`}>
                                      @{m.username}
                                    </span>
                                    {memberIsOwner && (
                                      <Crown className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                                    )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={assigned}
                                    onChange={() => onToggleMemberRole(server.id, m.id, selectedRole.id)}
                                    className="w-4 h-4 accent-[#E53935]"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: CHANNELS & GRANULAR CHANNEL PERMISSIONS */}
          {tab === 'channels' && (() => {
            const selectedPermChannel = permChannelId
              ? serverChannels.find((c) => c.id === permChannelId) || null
              : null;

            const setChannelOverride = (
              ch: Channel,
              targetType: 'role' | 'member',
              targetId: string,
              key: ChannelPermissionKey,
              value: PermissionOverrideValue
            ) => {
              if (!onUpdateChannel) return;
              const mapKey = targetType === 'role' ? 'roleOverrides' : 'memberOverrides';
              const currentAll = { ...(ch[mapKey] || {}) };
              const currentTarget = { ...(currentAll[targetId] || {}) };
              if (value === 'inherit') {
                delete currentTarget[key];
              } else {
                currentTarget[key] = value;
              }
              if (Object.keys(currentTarget).length === 0) {
                delete currentAll[targetId];
              } else {
                currentAll[targetId] = currentTarget;
              }
              onUpdateChannel(ch.id, { [mapKey]: currentAll });
            };

            const applyChannelTargetPreset = (
              ch: Channel,
              targetType: 'role' | 'member',
              targetId: string,
              preset: 'allowAll' | 'inheritAll' | 'denyAll' | 'readOnly' | 'privateAccess'
            ) => {
              if (!onUpdateChannel) return;
              const mapKey = targetType === 'role' ? 'roleOverrides' : 'memberOverrides';
              const currentAll = { ...(ch[mapKey] || {}) };

              if (preset === 'inheritAll') {
                delete currentAll[targetId];
              } else if (preset === 'allowAll') {
                const next: Record<string, PermissionOverrideValue> = {};
                for (const def of CHANNEL_PERMISSION_DEFINITIONS) {
                  if (def.channelScope === 'all' || def.channelScope === ch.type) {
                    next[def.key] = 'allow';
                  }
                }
                currentAll[targetId] = next;
              } else if (preset === 'denyAll') {
                const next: Record<string, PermissionOverrideValue> = {};
                for (const def of CHANNEL_PERMISSION_DEFINITIONS) {
                  if (def.channelScope === 'all' || def.channelScope === ch.type) {
                    next[def.key] = 'deny';
                  }
                }
                currentAll[targetId] = next;
              } else if (preset === 'readOnly') {
                currentAll[targetId] = {
                  ...(currentAll[targetId] || {}),
                  viewChannel: 'allow',
                  readMessageHistory: 'allow',
                  sendMessages: 'deny',
                  sendMessagesInThreads: 'deny',
                  attachFiles: 'deny',
                  addReactions: 'deny',
                  mentionEveryone: 'deny',
                };
              } else if (preset === 'privateAccess') {
                currentAll[targetId] = {
                  ...(currentAll[targetId] || {}),
                  viewChannel: 'allow',
                  readMessageHistory: 'allow',
                  sendMessages: ch.type === 'text' ? 'allow' : 'inherit',
                  connect: ch.type === 'voice' ? 'allow' : 'inherit',
                  speak: ch.type === 'voice' ? 'allow' : 'inherit',
                };
              }

              onUpdateChannel(ch.id, { [mapKey]: currentAll });
              appendAudit(`Updated ${preset} channel permissions on #${ch.name}`);
            };

            if (selectedPermChannel) {
              const memberOverrideIds = Object.keys(selectedPermChannel.memberOverrides || {});
              const activeTargetValues =
                permTargetType === 'role'
                  ? selectedPermChannel.roleOverrides?.[permTargetId] || {}
                  : selectedPermChannel.memberOverrides?.[permTargetId] || {};
              const pq = chPermSearch.trim().toLowerCase();

              const relevantDefs = CHANNEL_PERMISSION_DEFINITIONS.filter((def) => {
                const scopeMatch =
                  def.channelScope === 'all' || def.channelScope === selectedPermChannel.type;
                const searchMatch =
                  !pq ||
                  def.label.toLowerCase().includes(pq) ||
                  def.description.toLowerCase().includes(pq);
                return scopeMatch && searchMatch;
              });

              const groupedCategories = Array.from(
                new Set(relevantDefs.map((d) => d.category))
              );

              const availableMembersToAdd = members.filter(
                (m) => !memberOverrideIds.includes(m.id)
              );

              return (
                <div className="space-y-5 md:pr-12">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => setPermChannelId(null)}
                        className="text-xs font-semibold text-[#EF4444] hover:underline mb-1 inline-flex items-center gap-1"
                      >
                        ← Back to all channels
                      </button>
                      <h2 className={`font-display font-bold text-xl flex items-center gap-2 ${t.textPrimary}`}>
                        {selectedPermChannel.type === 'voice' ? (
                          <Volume2 className="w-5 h-5 text-[#EF4444]" />
                        ) : (
                          <Hash className="w-5 h-5 text-[#EF4444]" />
                        )}
                        <span>{selectedPermChannel.name} — Permissions &amp; Settings</span>
                      </h2>
                      <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                        Configure private access, slowmode, voice limits, and 20+ per-role / per-member permission overrides.
                      </p>
                    </div>
                  </div>

                  {/* Quick Channel Settings Row */}
                  <div className={`p-4 rounded-xl border space-y-4 ${t.sidebarBg} ${t.border}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className={`text-sm font-semibold flex items-center gap-1.5 ${t.textPrimary}`}>
                          <Lock className="w-4 h-4 text-[#EF4444]" />
                          <span>Private Channel</span>
                        </div>
                        <div className={`text-xs ${t.textMuted}`}>
                          By turning this on, only selected roles and members explicitly granted &ldquo;View Channel&rdquo; can see or access #{selectedPermChannel.name}.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedPermChannel.isPrivate)}
                        onChange={(e) => {
                          onUpdateChannel?.(selectedPermChannel.id, {
                            isPrivate: e.target.checked,
                          });
                          appendAudit(
                            `${e.target.checked ? 'Enabled' : 'Disabled'} Private mode on #${selectedPermChannel.name}`
                          );
                        }}
                        className="w-4 h-4 accent-[#E53935] shrink-0"
                      />
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t ${t.border}`}>
                      {selectedPermChannel.type === 'text' ? (
                        <>
                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${t.textMuted}`}>
                              Channel Slowmode
                            </label>
                            <select
                              value={selectedPermChannel.slowmodeSeconds || 0}
                              onChange={(e) =>
                                onUpdateChannel?.(selectedPermChannel.id, {
                                  slowmodeSeconds: Number(e.target.value) as 0 | 5 | 10 | 15 | 30 | 60,
                                })
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary}`}
                            >
                              <option value={0}>Off</option>
                              <option value={5}>5 seconds</option>
                              <option value={10}>10 seconds</option>
                              <option value={15}>15 seconds</option>
                              <option value={30}>30 seconds</option>
                              <option value={60}>60 seconds</option>
                            </select>
                          </div>

                          <label className="sm:col-span-2 flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-inherit cursor-pointer">
                            <div>
                              <div className={`text-xs font-semibold ${t.textPrimary}`}>
                                Age-Restricted Channel (NSFW)
                              </div>
                              <div className={`text-[11px] ${t.textMuted}`}>
                                Mark this channel for mature topics
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={Boolean(selectedPermChannel.nsfw)}
                              onChange={(e) =>
                                onUpdateChannel?.(selectedPermChannel.id, {
                                  nsfw: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-[#E53935]"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${t.textMuted}`}>
                              Voice User Limit (0 = Unlimited)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={selectedPermChannel.userLimit || 0}
                              onChange={(e) =>
                                onUpdateChannel?.(selectedPermChannel.id, {
                                  userLimit: Math.max(0, Math.min(99, Number(e.target.value) || 0)),
                                })
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${t.textMuted}`}>
                              Audio Bitrate (Free Up to 384 kbps)
                            </label>
                            <select
                              value={selectedPermChannel.bitrateKbps || 128}
                              onChange={(e) =>
                                onUpdateChannel?.(selectedPermChannel.id, {
                                  bitrateKbps: Number(e.target.value),
                                })
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary}`}
                            >
                              <option value={64}>64 kbps</option>
                              <option value={96}>96 kbps</option>
                              <option value={128}>128 kbps (Standard HD)</option>
                              <option value={256}>256 kbps (Studio)</option>
                              <option value={384}>384 kbps (Max Free HD)</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Role / Member Override Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {/* Target Roles & Members List */}
                    <div className={`rounded-xl border p-3 space-y-3 ${t.sidebarBg} ${t.border}`}>
                      <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                        Roles
                      </div>
                      <div className="space-y-1">
                        {server.roles.map((r) => {
                          const ovCount = Object.keys(
                            selectedPermChannel.roleOverrides?.[r.id] || {}
                          ).length;
                          const selected =
                            permTargetType === 'role' && permTargetId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setPermTargetType('role');
                                setPermTargetId(r.id);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                selected ? t.activeBg : t.hoverBg
                              } ${t.textPrimary}`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: r.color }}
                                />
                                <span className="truncate">
                                  {r.name === 'member' ? '@everyone (member)' : r.name}
                                </span>
                              </span>
                              {ovCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#E53935]/20 text-[#EF4444] text-[10px] tabular-nums">
                                  {ovCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className={`pt-2 border-t ${t.border} space-y-2`}>
                        <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                          Member Overrides
                        </div>
                        {memberOverrideIds.map((uid) => {
                          const m = users[uid];
                          if (!m) return null;
                          const selected =
                            permTargetType === 'member' && permTargetId === uid;
                          const ovCount = Object.keys(
                            selectedPermChannel.memberOverrides?.[uid] || {}
                          ).length;
                          return (
                            <button
                              key={uid}
                              type="button"
                              onClick={() => {
                                setPermTargetType('member');
                                setPermTargetId(uid);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                                selected ? t.activeBg : t.hoverBg
                              } ${t.textPrimary}`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <Avatar
                                  name={m.name}
                                  src={m.avatar}
                                  accentColor={m.accentColor}
                                  size="xs"
                                />
                                <span className="truncate">{m.name}</span>
                              </span>
                              {ovCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#E53935]/20 text-[#EF4444] text-[10px]">
                                  {ovCount}
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {availableMembersToAdd.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <select
                              value={addMemberPermId}
                              onChange={(e) => setAddMemberPermId(e.target.value)}
                              className={`flex-1 min-w-0 px-2 py-1 rounded-md border text-xs ${t.inputBg} ${t.border} ${t.textPrimary}`}
                            >
                              <option value="">+ Add member...</option>
                              {availableMembersToAdd.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} (@{m.username})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!addMemberPermId}
                              onClick={() => {
                                if (!addMemberPermId) return;
                                setPermTargetType('member');
                                setPermTargetId(addMemberPermId);
                                setChannelOverride(
                                  selectedPermChannel,
                                  'member',
                                  addMemberPermId,
                                  'viewChannel',
                                  'allow'
                                );
                                setAddMemberPermId('');
                              }}
                              className="px-2 py-1 rounded-md bg-[#E53935] text-white text-xs font-semibold disabled:opacity-40"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tri-State Permission Switches */}
                    <div className={`md:col-span-2 rounded-xl border p-4 space-y-4 ${t.sidebarBg} ${t.border}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className={`text-xs font-bold ${t.textPrimary}`}>
                          Editing:{' '}
                          <span className="text-[#EF4444]">
                            {permTargetType === 'role'
                              ? server.roles.find((r) => r.id === permTargetId)?.name || 'Role'
                              : users[permTargetId]?.name || 'Member'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              applyChannelTargetPreset(
                                selectedPermChannel,
                                permTargetType,
                                permTargetId,
                                'privateAccess'
                              )
                            }
                            className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${t.border} ${t.textSecondary} ${t.hoverBg}`}
                          >
                            Allow Access
                          </button>
                          {selectedPermChannel.type === 'text' && (
                            <button
                              type="button"
                              onClick={() =>
                                applyChannelTargetPreset(
                                  selectedPermChannel,
                                  permTargetType,
                                  permTargetId,
                                  'readOnly'
                                )
                              }
                              className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${t.border} ${t.textSecondary} ${t.hoverBg}`}
                            >
                              Read-Only
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              applyChannelTargetPreset(
                                selectedPermChannel,
                                permTargetType,
                                permTargetId,
                                'allowAll'
                              )
                            }
                            className="px-2 py-1 rounded-md bg-[#23A55A]/15 text-[#23A55A] text-[11px] font-semibold"
                          >
                            Allow All
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              applyChannelTargetPreset(
                                selectedPermChannel,
                                permTargetType,
                                permTargetId,
                                'denyAll'
                              )
                            }
                            className="px-2 py-1 rounded-md bg-[#E53935]/15 text-[#EF4444] text-[11px] font-semibold"
                          >
                            Deny All
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              applyChannelTargetPreset(
                                selectedPermChannel,
                                permTargetType,
                                permTargetId,
                                'inheritAll'
                              )
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold ${t.textMuted} ${t.hoverBg}`}
                          >
                            Reset to Inherit
                          </button>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${t.inputBg} ${t.border}`}
                      >
                        <Search className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                        <input
                          type="text"
                          value={chPermSearch}
                          onChange={(e) => setChPermSearch(e.target.value)}
                          placeholder="Search channel permissions (e.g. send, files, slowmode, voice, mute)"
                          className={`w-full bg-transparent text-xs focus:outline-none ${t.textPrimary} placeholder:text-[#80848E]`}
                        />
                      </div>

                      <div className="space-y-4 max-h-[390px] overflow-y-auto talkcob-scroll pr-1">
                        {groupedCategories.map((cat) => (
                          <div key={cat} className="space-y-2">
                            <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                              {cat}
                            </div>
                            <div className="space-y-2">
                              {relevantDefs
                                .filter((d) => d.category === cat)
                                .map((def) => {
                                  const val: PermissionOverrideValue =
                                    activeTargetValues[def.key] || 'inherit';
                                  return (
                                    <div
                                      key={def.key}
                                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${t.border} ${t.dockBg}`}
                                    >
                                      <div className="min-w-0">
                                        <div
                                          className={`text-sm font-semibold ${
                                            def.danger ? 'text-[#F59E0B]' : t.textPrimary
                                          }`}
                                        >
                                          {def.label}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${t.textMuted}`}>
                                          {def.description}
                                        </div>
                                      </div>

                                      {/* Discord Tri-state Deny / Inherit / Allow Toggle */}
                                      <div
                                        role="group"
                                        aria-label={def.label}
                                        className={`inline-flex rounded-lg border overflow-hidden shrink-0 ${t.border} ${t.inputBg}`}
                                      >
                                        <button
                                          type="button"
                                          title="Deny"
                                          onClick={() =>
                                            setChannelOverride(
                                              selectedPermChannel,
                                              permTargetType,
                                              permTargetId,
                                              def.key,
                                              'deny'
                                            )
                                          }
                                          className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                                            val === 'deny'
                                              ? 'bg-[#E53935] text-white'
                                              : `${t.textMuted} hover:bg-[#E53935]/15 hover:text-[#EF4444]`
                                          }`}
                                        >
                                          ✕
                                        </button>
                                        <button
                                          type="button"
                                          title="Inherit from Role / Server"
                                          onClick={() =>
                                            setChannelOverride(
                                              selectedPermChannel,
                                              permTargetType,
                                              permTargetId,
                                              def.key,
                                              'inherit'
                                            )
                                          }
                                          className={`px-2.5 py-1.5 text-xs font-bold border-x ${t.border} transition-colors ${
                                            val === 'inherit'
                                              ? 'bg-[#4E5058] text-white'
                                              : `${t.textMuted} ${t.hoverBg}`
                                          }`}
                                        >
                                          /
                                        </button>
                                        <button
                                          type="button"
                                          title="Allow"
                                          onClick={() =>
                                            setChannelOverride(
                                              selectedPermChannel,
                                              permTargetType,
                                              permTargetId,
                                              def.key,
                                              'allow'
                                            )
                                          }
                                          className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                                            val === 'allow'
                                              ? 'bg-[#23A55A] text-white'
                                              : `${t.textMuted} hover:bg-[#23A55A]/15 hover:text-[#23A55A]`
                                          }`}
                                        >
                                          ✓
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-6 md:pr-12">
                <div>
                  <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                    Channels &amp; Channel Permissions ({serverChannels.length})
                  </h2>
                  <p className={`text-sm mt-1 ${t.textMuted}`}>
                    Add channels, edit topics &amp; categories, or click <strong>Permissions</strong> on any channel to configure private access, slowmode, and 20+ role/member overrides.
                  </p>
                </div>

                <form
                  onSubmit={handleAddChannelFromSettings}
                  className={`p-4 rounded-xl border space-y-3 ${t.sidebarBg} ${t.border}`}
                >
                  <div className={`text-sm font-display font-bold ${t.textPrimary}`}>
                    Add a New Channel
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      required
                      value={newChName}
                      onChange={(e) => setNewChName(e.target.value)}
                      placeholder={newChType === 'text' ? 'channel-name' : 'Voice Room'}
                      className={`px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    />
                    <select
                      value={newChType}
                      onChange={(e) => {
                        const val = e.target.value as 'text' | 'voice';
                        setNewChType(val);
                        setNewChCategory(val === 'voice' ? 'Voice Channels' : 'Community');
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    >
                      <option value="text">Text Channel (#)</option>
                      <option value="voice">Voice Channel</option>
                    </select>
                    <input
                      type="text"
                      value={newChCategory}
                      onChange={(e) => setNewChCategory(e.target.value)}
                      placeholder="Category"
                      className={`px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={newChTopic}
                      onChange={(e) => setNewChTopic(e.target.value)}
                      placeholder="Topic (optional)"
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Channel</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {serverChannels.map((ch) => {
                    const isEditing = editingChannelId === ch.id;
                    const overrideCount =
                      Object.keys(ch.roleOverrides || {}).length +
                      Object.keys(ch.memberOverrides || {}).length;
                    return (
                      <div
                        key={ch.id}
                        className={`p-3.5 rounded-lg border ${t.sidebarBg} ${t.border}`}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!editChName.trim() || !onUpdateChannel) return;
                              onUpdateChannel(ch.id, {
                                name:
                                  ch.type === 'text'
                                    ? editChName.trim().toLowerCase().replace(/\s+/g, '-')
                                    : editChName.trim(),
                                category: editChCategory.trim() || ch.category,
                                topic: editChTopic.trim() || undefined,
                              });
                              appendAudit(`Edited channel "${ch.name}"`);
                              setEditingChannelId(null);
                            }}
                            className="space-y-2.5"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={editChName}
                                onChange={(e) => setEditChName(e.target.value)}
                                className={`px-2.5 py-1.5 rounded-md border text-sm ${t.inputBg} ${t.border} ${t.textPrimary}`}
                              />
                              <input
                                type="text"
                                value={editChCategory}
                                onChange={(e) => setEditChCategory(e.target.value)}
                                placeholder="Category"
                                className={`px-2.5 py-1.5 rounded-md border text-sm ${t.inputBg} ${t.border} ${t.textPrimary}`}
                              />
                            </div>
                            <input
                              type="text"
                              value={editChTopic}
                              onChange={(e) => setEditChTopic(e.target.value)}
                              placeholder="Channel topic"
                              className={`w-full px-2.5 py-1.5 rounded-md border text-sm ${t.inputBg} ${t.border} ${t.textPrimary}`}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                className="px-3 py-1 rounded-md bg-[#E53935] text-white text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingChannelId(null)}
                                className={`px-3 py-1 rounded-md text-xs ${t.textMuted} ${t.hoverBg}`}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {ch.isPrivate ? (
                                <Lock className="w-4 h-4 text-[#EF4444] shrink-0" />
                              ) : ch.type === 'voice' ? (
                                <Volume2 className="w-4 h-4 text-[#EF4444] shrink-0" />
                              ) : (
                                <Hash className="w-4 h-4 text-[#EF4444] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-semibold truncate ${t.textPrimary}`}>
                                    {ch.name}
                                  </span>
                                  {ch.isPrivate && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#E53935]/15 text-[#EF4444] text-[10px] font-bold">
                                      PRIVATE
                                    </span>
                                  )}
                                  {Boolean(ch.slowmodeSeconds) && (
                                    <span className="px-1.5 py-0.5 rounded bg-black/20 text-[#949BA4] text-[10px] font-semibold">
                                      Slowmode {ch.slowmodeSeconds}s
                                    </span>
                                  )}
                                </div>
                                <div className={`text-xs truncate ${t.textMuted}`}>
                                  {ch.category}
                                  {ch.topic ? ` · ${ch.topic}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {onUpdateChannel && (
                                <button
                                  type="button"
                                  onClick={() => setPermChannelId(ch.id)}
                                  className="px-2.5 py-1.5 rounded-md bg-[#E53935]/15 hover:bg-[#E53935] text-[#EF4444] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                  <span>
                                    Permissions{overrideCount > 0 ? ` (${overrideCount})` : ''}
                                  </span>
                                </button>
                              )}
                              {onUpdateChannel && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChannelId(ch.id);
                                    setEditChName(ch.name);
                                    setEditChCategory(ch.category);
                                    setEditChTopic(ch.topic || '');
                                  }}
                                  aria-label={`Edit ${ch.name}`}
                                  title="Edit Channel"
                                  className={`p-1.5 rounded-md text-[#EF4444] ${t.hoverBg}`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {serverChannels.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteChannel(ch.id);
                                    appendAudit(`Deleted channel "${ch.name}"`);
                                  }}
                                  aria-label={`Delete ${ch.name}`}
                                  title="Delete Channel"
                                  className="p-1.5 rounded-md text-[#EF4444] hover:bg-[#E53935]/15 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: EMOJI & STICKERS */}
          {tab === 'expressions' && (
            <div className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                  Emoji & Expressions
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Every expression pack and external emoji option is free on Talkcob.
                </p>
              </div>

              <label
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 cursor-pointer ${t.sidebarBg} ${t.border}`}
              >
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>
                    Allow External Emojis
                  </div>
                  <div className={`text-xs ${t.textMuted}`}>
                    Members can use emojis from anywhere in {server.name} for free
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={server.allowExternalEmojis ?? true}
                  onChange={(e) =>
                    appendAudit(`Set external emojis to ${e.target.checked ? 'enabled' : 'disabled'}`, {
                      allowExternalEmojis: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-[#E53935]"
                />
              </label>

              <div className={`p-5 rounded-xl border space-y-3 ${t.sidebarBg} ${t.border}`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                  Built-In Quick Reactions (Free)
                </div>
                <div className="flex flex-wrap gap-2">
                  {['🌽', '🔥', '❤️', '🎙️', '👏', '😂', '🚀', '✨', '👍', '🎧'].map((emoji) => (
                    <div
                      key={emoji}
                      className={`px-3 py-2 rounded-lg border text-lg ${t.dockBg} ${t.border}`}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SAFETY SETUP */}
          {tab === 'safety' && (
            <form onSubmit={handleSaveSafety} className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>Safety Setup</h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Control member verification, media filtering, and default slowmode speed limits.
                </p>
              </div>

              <div className={`p-5 rounded-xl border space-y-3 ${t.sidebarBg} ${t.border}`}>
                <div className={`text-sm font-bold ${t.textPrimary}`}>Verification Level</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {([
                    { id: 'none', title: 'None', desc: 'Unrestricted access for any Talkcob user' },
                    { id: 'low', title: 'Low', desc: 'Must have a verified Talkcob account' },
                    { id: 'medium', title: 'Medium', desc: 'Registered on Talkcob for at least 5 minutes' },
                    { id: 'high', title: 'High', desc: 'Must be a member of the server for 10 minutes' },
                  ] as const).map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setVerificationLevel(lvl.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        verificationLevel === lvl.id
                          ? 'border-[#E53935] bg-[#E53935]/15'
                          : `${t.border} ${t.hoverBg}`
                      }`}
                    >
                      <div className={`text-sm font-bold ${t.textPrimary}`}>{lvl.title}</div>
                      <div className={`text-xs mt-0.5 ${t.textMuted}`}>{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-5 rounded-xl border space-y-3 ${t.sidebarBg} ${t.border}`}>
                <div className={`text-sm font-bold ${t.textPrimary}`}>
                  Explicit Media Content Filter
                </div>
                <div className="space-y-2">
                  {([
                    { id: 'disabled', label: 'Do not scan any media content' },
                    { id: 'no_role', label: 'Scan media from members without a role' },
                    { id: 'all_members', label: 'Scan media content from all members' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExplicitFilter(opt.id)}
                      className={`w-full p-3 rounded-lg border text-left text-sm font-medium flex items-center justify-between ${
                        explicitFilter === opt.id
                          ? 'border-[#E53935] bg-[#E53935]/15 text-[#EF4444]'
                          : `${t.border} ${t.textPrimary} ${t.hoverBg}`
                      }`}
                    >
                      <span>{opt.label}</span>
                      {explicitFilter === opt.id && <Check className="w-4 h-4 text-[#EF4444]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-5 rounded-xl border space-y-3 ${t.sidebarBg} ${t.border}`}>
                <div className={`text-sm font-bold ${t.textPrimary}`}>Default Message Slowmode</div>
                <select
                  value={slowmodeSeconds}
                  onChange={(e) =>
                    setSlowmodeSeconds(Number(e.target.value) as 0 | 5 | 10 | 30 | 60)
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                >
                  <option value={0}>Slowmode Off</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold"
                >
                  Save Safety Settings
                </button>
                {safetySaved && (
                  <span className="text-xs font-semibold text-[#23A55A] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB 6: AUTOMOD */}
          {tab === 'automod' && (
            <div className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>AutoMod Rules</h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Define custom blocked keywords to keep {server.name} friendly and spam-free.
                </p>
              </div>

              <form onSubmit={handleAddBlockedWord} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBlockedWord}
                  onChange={(e) => setNewBlockedWord(e.target.value)}
                  placeholder="Add a blocked keyword or phrase..."
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold whitespace-nowrap shrink-0"
                >
                  Add Word
                </button>
              </form>

              <div className={`p-5 rounded-xl border ${t.sidebarBg} ${t.border}`}>
                {blockedWords.length === 0 ? (
                  <p className={`text-sm ${t.textMuted}`}>
                    No blocked keywords configured yet. Add any words above to build your filter list.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {blockedWords.map((word) => (
                      <span
                        key={word}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${t.dockBg} ${t.border} ${t.textPrimary}`}
                      >
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockedWord(word)}
                          aria-label={`Remove ${word}`}
                          className="text-[#EF4444]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOG */}
          {tab === 'audit' && (
            <div className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>Audit Log</h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Recent Server Settings changes made by owners and members with the settings role.
                </p>
              </div>

              <div className={`rounded-xl border divide-y ${t.sidebarBg} ${t.border}`}>
                {auditEntries.length === 0 ? (
                  <div className={`p-8 text-center text-sm ${t.textMuted}`}>
                    No Server Settings changes recorded in this session yet.
                  </div>
                ) : (
                  auditEntries.map((entry) => (
                    <div key={entry.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${t.textPrimary}`}>{entry.action}</div>
                        <div className={`text-xs ${t.textMuted}`}>By {entry.actorName}</div>
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${t.textMuted}`}>
                        {entry.timestamp}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 8: MEMBERS */}
          {tab === 'members' && (
            <div className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                  Server Members ({members.length})
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Assign the <strong className="text-[#EF4444]">settings</strong> role, timeout or ban members, or switch accounts to test permissions.
                </p>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t.inputBg} ${t.border}`}>
                <Search className="w-4 h-4 text-[#EF4444]" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filter members by name or @username..."
                  className={`flex-1 bg-transparent text-sm focus:outline-none ${t.textPrimary}`}
                />
              </div>

              <div className="space-y-2.5">
                {filteredMembers.map((member) => {
                  const perms = getUserServerPermissions(server, member.id);
                  const settingsRole = server.roles.find(
                    (r) => r.name.toLowerCase() === 'settings'
                  );
                  const isCurrentActive = activeUserId === member.id;
                  const isMutedMember = mutedIds.includes(member.id);
                  const isBannedMember = (server.bannedUserIds || []).includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.sidebarBg} ${t.border}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={member.name}
                          src={member.avatar}
                          accentColor={member.accentColor}
                          size="md"
                          status={member.status}
                          showStatus
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-display font-bold text-sm truncate ${t.textPrimary}`}>
                              {member.name}
                            </span>
                            {perms.isOwner && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#EF4444]">
                                <Crown className="w-3.5 h-3.5" /> Owner
                              </span>
                            )}
                            {isMutedMember && (
                              <span className="text-[11px] font-semibold text-[#F59E0B]">
                                Timed Out
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${t.textMuted}`}>
                            @{member.username} ·{' '}
                            {perms.canAccessServerSettings
                              ? 'Can access Server Settings & add channels'
                              : 'Standard member (no settings access)'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {settingsRole && !perms.isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              onToggleMemberRole(server.id, member.id, settingsRole.id);
                              appendAudit(`Toggled "settings" role for ${member.name}`);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              perms.hasSettingsRole
                                ? 'bg-[#E53935] border-[#E53935] text-white'
                                : `${t.dockBg} ${t.border} ${t.textSecondary} hover:border-[#E53935]`
                            }`}
                          >
                            {perms.hasSettingsRole ? 'Has "settings" role' : 'Give "settings" role'}
                          </button>
                        )}

                        {!perms.isOwner && !isCurrentActive && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleMuteMember(member.id, member.name)}
                              title={isMutedMember ? 'Remove timeout' : 'Timeout member'}
                              className={`p-1.5 rounded-lg border text-xs ${t.border} text-[#EF4444] ${t.hoverBg}`}
                            >
                              <VolumeX className="w-4 h-4" />
                            </button>
                            {!isBannedMember && (
                              <button
                                type="button"
                                onClick={() => handleBanMember(member.id, member.name)}
                                title={`Ban ${member.name}`}
                                className={`p-1.5 rounded-lg border text-xs ${t.border} text-[#EF4444] ${t.hoverBg}`}
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}

                        {member.isPlatformOwner || member.isPlatformAdmin ? (
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.activeBg} ${t.textMuted}`}>
                            {member.isPlatformOwner ? 'Talkcob Owner' : 'Platform Admin'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSwitchActiveUser(member.id)}
                            disabled={isCurrentActive}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isCurrentActive
                                ? `${t.activeBg} ${t.textMuted} cursor-default`
                                : 'bg-[#E53935]/15 text-[#EF4444] hover:bg-[#E53935] hover:text-white'
                            }`}
                          >
                            {isCurrentActive ? 'Active Account' : 'Switch to User'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 9: INVITES & VANITY */}
          {tab === 'invites' && (
            <div className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                  Server Invites & Vanity URL
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Share your invite link or claim a custom vanity URL for free.
                </p>
              </div>

              <div className={`p-5 rounded-xl border space-y-4 ${t.sidebarBg} ${t.border}`}>
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${t.inputBg} ${t.border}`}>
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className={`flex-1 bg-transparent text-sm font-mono focus:outline-none ${t.textPrimary}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(inviteUrl).catch(() => {});
                      setCopiedInvite(true);
                      setTimeout(() => setCopiedInvite(false), 1800);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInvite ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const suffix = Math.random().toString(36).slice(2, 6);
                    appendAudit('Regenerated server invite code', {
                      inviteCode: `${server.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${suffix}`,
                    });
                  }}
                  className="text-xs font-medium inline-flex items-center gap-1.5 text-[#EF4444] hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate New Invite Code</span>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = vanityDraft.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
                  appendAudit(
                    clean ? `Set vanity invite URL to /${clean}` : 'Cleared custom vanity URL',
                    { vanityCode: clean || undefined }
                  );
                  setVanityDraft(clean);
                  setVanitySaved(true);
                  setTimeout(() => setVanitySaved(false), 1800);
                }}
                className={`p-5 rounded-xl border space-y-3 ${t.sidebarBg} ${t.border}`}
              >
                <div className={`text-sm font-bold ${t.textPrimary}`}>
                  Custom Vanity URL (Free)
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className={`flex-1 flex items-center px-3 py-2 rounded-lg border ${t.inputBg} ${t.border}`}>
                    <span className={`text-xs font-mono mr-1 ${t.textMuted}`}>talkcob.app/invite/</span>
                    <input
                      type="text"
                      value={vanityDraft}
                      onChange={(e) => setVanityDraft(e.target.value)}
                      placeholder="talkcob-hq"
                      className={`flex-1 bg-transparent text-sm font-mono focus:outline-none ${t.textPrimary}`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold"
                  >
                    Save Vanity URL
                  </button>
                </div>
                {vanitySaved && (
                  <span className="text-xs font-semibold text-[#23A55A]">Vanity URL saved!</span>
                )}
              </form>
            </div>
          )}

          {/* TAB 10: BANS */}
          {tab === 'bans' && (
            <div className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                  Banned Users ({bannedUsers.length})
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Manage users restricted from {server.name}. You can ban members from the Members tab.
                </p>
              </div>

              {bannedUsers.length === 0 ? (
                <div className={`p-8 rounded-xl border text-center text-sm ${t.sidebarBg} ${t.border} ${t.textMuted}`}>
                  <Ban className="w-8 h-8 mx-auto mb-2 text-[#EF4444] opacity-80" />
                  No banned users in {server.name}.
                </div>
              ) : (
                <div className="space-y-2">
                  {bannedUsers.map((bu) => (
                    <div
                      key={bu.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${t.sidebarBg} ${t.border}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={bu.name}
                          src={bu.avatar}
                          accentColor={bu.accentColor}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className={`text-sm font-bold truncate ${t.textPrimary}`}>
                            {bu.name}
                          </div>
                          <div className={`text-xs ${t.textMuted}`}>@{bu.username}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnbanMember(bu.id, bu.name)}
                        className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold"
                      >
                        Revoke Ban
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 11: WELCOME & RULES */}
          {tab === 'welcome' && (
            <form onSubmit={handleSaveWelcome} className="space-y-6 md:pr-12">
              <div>
                <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                  Welcome Screen & Server Rules
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Greet newcomers and display your community guidelines when they join {server.name}.
                </p>
              </div>

              <div className={`p-5 rounded-xl border space-y-4 ${t.sidebarBg} ${t.border}`}>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className={`text-sm font-semibold ${t.textPrimary}`}>
                      Enable Welcome Greeting
                    </div>
                    <div className={`text-xs ${t.textMuted}`}>
                      Display a custom greeting banner for members
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={welcomeEnabled}
                    onChange={(e) => setWelcomeEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#E53935]"
                  />
                </label>

                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                />
              </div>

              <div className={`p-5 rounded-xl border space-y-4 ${t.sidebarBg} ${t.border}`}>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className={`text-sm font-semibold ${t.textPrimary}`}>
                      Community Rules Screening
                    </div>
                    <div className={`text-xs ${t.textMuted}`}>
                      Show server rules summary in Server Overview
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={rulesEnabled}
                    onChange={(e) => setRulesEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#E53935]"
                  />
                </label>

                <textarea
                  rows={3}
                  value={rulesSummary}
                  onChange={(e) => setRulesSummary(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold"
                >
                  Save Welcome & Rules
                </button>
                {welcomeSaved && (
                  <span className="text-xs font-semibold text-[#23A55A] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TAB: BOTS & INTEGRATIONS */}
          {tab === 'bots' && (
            <div className="space-y-6 md:pr-12">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                    Bots & Integrations ({bots.filter((b) => b.serverIds.includes(server.id)).length} active)
                  </h2>
                  <p className={`text-sm mt-1 ${t.textMuted}`}>
                    Manage bots you created in Bot Studio and toggle which ones run in {server.name}.
                  </p>
                </div>
                {onOpenBotStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBotStudio();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Open Bot Studio</span>
                  </button>
                )}
              </div>

              {bots.length === 0 ? (
                <div className={`p-8 rounded-xl border text-center space-y-3 ${t.sidebarBg} ${t.border}`}>
                  <Bot className="w-9 h-9 mx-auto text-[#EF4444]" />
                  <p className={`text-sm ${t.textMuted}`}>
                    You haven&apos;t created any bots yet. Open Bot Studio to build custom Discord-style bots and control what they do.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bots.map((bot) => {
                    const installed = bot.serverIds.includes(server.id);
                    return (
                      <div
                        key={bot.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${t.sidebarBg} ${t.border}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={bot.name}
                            src={bot.avatar}
                            accentColor={bot.accentColor}
                            size="md"
                            status={bot.enabled ? 'online' : 'offline'}
                            showStatus
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-display font-bold text-sm truncate ${t.textPrimary}`}>
                                {bot.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-bold uppercase">
                                BOT
                              </span>
                            </div>
                            <div className={`text-xs ${t.textMuted}`}>
                              Prefix <code className="font-mono">{bot.prefix}</code> · {bot.commands.length} commands ·{' '}
                              {bot.enabled ? 'Online' : 'Paused'}
                            </div>
                          </div>
                        </div>

                        {onToggleBotServer && (
                          <button
                            type="button"
                            onClick={() => onToggleBotServer(bot.id, server.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              installed
                                ? 'bg-[#E53935] hover:bg-[#C62828] text-white'
                                : 'bg-[#23A55A] hover:bg-[#1E8E4C] text-white'
                            }`}
                          >
                            {installed ? 'Remove from Server' : 'Add to Server'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 12: SERVER PERKS (FREE) */}
          {tab === 'perks' && (
            <div className="space-y-6 md:pr-12">
              <div className={`p-6 rounded-2xl border space-y-4 ${t.sidebarBg} ${t.border}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E53935]/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#EF4444]" />
                  </div>
                  <div>
                    <h2 className={`font-display font-bold text-lg ${t.textPrimary}`}>
                      All Server Perks Unlocked Free
                    </h2>
                    <p className={`text-xs ${t.textMuted}`}>
                      No Server Boost paywalls — {server.name} gets maximum customization at $0.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    'Custom croppable Server Profile Picture',
                    'Custom Server Banner Color',
                    'Free Custom Vanity Invite URL',
                    'Unlimited Text & Voice Channels',
                    'Role-based "settings" permissions',
                    'AutoMod Keyword Filtering & Audit Log',
                  ].map((perk) => (
                    <div key={perk} className={`p-3 rounded-xl border flex items-center gap-2 ${t.dockBg} ${t.border}`}>
                      <Check className="w-4 h-4 text-[#23A55A] shrink-0" />
                      <span className={t.textPrimary}>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Circular Image Cropper for Server Profile Picture */}
      {cropSourceSrc && (
        <AvatarCropModal
          imageSrc={cropSourceSrc}
          theme={theme}
          onCancel={() => setCropSourceSrc(null)}
          onApply={(croppedDataUrl) => {
            appendAudit('Updated and cropped server profile picture', {
              iconUrl: croppedDataUrl,
            });
            setCropSourceSrc(null);
          }}
        />
      )}
    </div>
  );
};
