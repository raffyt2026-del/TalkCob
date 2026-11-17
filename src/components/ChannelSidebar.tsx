import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Headphones,
  HeadphoneOff,
  Lock,
  LogOut,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Plus,
  Rocket,
  Search,
  Settings,
  UserPlus,
  Users,
  Volume2,
  Radio,
} from 'lucide-react';
import { HOME_SERVER_ID } from '../data/seedData';
import { AppTheme, Channel, DirectMessageThread, Server, User, UserStatus } from '../types/talkcob';
import { getUserServerPermissions, resolveChannelPermissions } from '../utils/permissions';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';
import { TalkcobIcon } from './TalkcobIcon';

interface ChannelSidebarProps {
  mode: 'home' | 'server' | 'discover' | 'bots' | 'ai' | 'admin';
  server?: Server;
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  onJoinVoiceChannel: (channelId: string) => void;
  dmThreads: DirectMessageThread[];
  activeDmId: string;
  homeSubView: 'friends' | 'dm';
  onSelectFriends: () => void;
  pendingIncomingCount: number;
  onSelectDm: (dmId: string) => void;
  users: Record<string, User>;
  currentUser: User;
  connectedVoiceChannel?: Channel;
  activeDmCallPeer?: User;
  onLeaveVoice: () => void;
  onFocusVoiceStage: () => void;
  onLeaveDmCall: () => void;
  onFocusDmCall: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings: () => void;
  onOpenServerSettings: () => void;
  onOpenChannelPermissions?: (channelId: string) => void;
  onOpenQuickSwitcher: () => void;
  onOpenCreateChannel: (defaultType?: 'text' | 'voice') => void;
  onOpenInvite: () => void;
  onLeaveServer: (serverId: string) => void;
  onToggleServerBoost?: (serverId: string) => void;
  onChangeStatus: (status: UserStatus) => void;
  speakingUserIds: string[];
  theme: AppTheme;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  mode,
  server,
  channels,
  activeChannelId,
  onSelectChannel,
  onJoinVoiceChannel,
  dmThreads,
  activeDmId,
  homeSubView,
  onSelectFriends,
  pendingIncomingCount,
  onSelectDm,
  users,
  currentUser,
  connectedVoiceChannel,
  activeDmCallPeer,
  onLeaveVoice,
  onFocusVoiceStage,
  onLeaveDmCall,
  onFocusDmCall,
  isScreenSharing,
  onToggleScreenShare,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onOpenServerSettings,
  onOpenChannelPermissions,
  onOpenQuickSwitcher,
  onOpenCreateChannel,
  onOpenInvite,
  onLeaveServer,
  onToggleServerBoost,
  onChangeStatus,
  speakingUserIds,
  theme,
}) => {
  const t = THEME_TOKENS[theme];
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories = Array.from(new Set(channels.map((c) => c.category)));

  const statusBorder =
    theme === 'light'
      ? 'border-[#E9EBEF]'
      : theme === 'obsidian'
      ? 'border-[#0D0F14]'
      : 'border-[#232428]';

  const isPermanentHq = server?.id === HOME_SERVER_ID;
  const perms = getUserServerPermissions(server, currentUser.id);
  const boostCount = server?.boostUserIds?.length || 0;
  const boostLevel = boostCount >= 14 ? 3 : boostCount >= 7 ? 2 : boostCount >= 2 ? 1 : 0;
  const hasBoosted = Boolean(server?.boostUserIds?.includes(currentUser.id));

  return (
    <aside
      aria-label="Channels and Direct Messages"
      className={`w-[248px] shrink-0 h-full flex flex-col border-r ${t.sidebarBg} ${t.border} select-none`}
    >
      {/* Top Sidebar Header */}
      {mode === 'server' && server ? (
        <div className="relative">
          <button
            onClick={() => setServerMenuOpen((prev) => !prev)}
            className={`w-full h-12 px-4 flex items-center justify-between gap-2 border-b ${t.border} ${t.hoverBg} transition-colors`}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              {boostCount > 0 && (
                <span
                  title={`Server Boost Level ${boostLevel} (${boostCount} Free Boost${boostCount === 1 ? '' : 's'})`}
                  className="shrink-0 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#EC4899]/25 to-[#A855F7]/25 border border-[#F472B6]/40 text-[#F472B6] text-[10px] font-extrabold inline-flex items-center gap-0.5"
                >
                  <Rocket className="w-2.5 h-2.5" />
                  <span>{boostLevel > 0 ? `L${boostLevel}` : boostCount}</span>
                </span>
              )}
              <span className={`font-display font-bold text-[15px] truncate ${t.textPrimary}`}>
                {server.name}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 text-[#EF4444] transition-transform duration-150 ${
                serverMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {serverMenuOpen && (
            <div
              className={`absolute left-2 right-2 top-13 z-30 rounded-lg border p-1.5 shadow-xl ${t.modalBg} ${t.border}`}
            >
              {onToggleServerBoost && (
                <button
                  onClick={() => {
                    onToggleServerBoost(server.id);
                    setServerMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-colors ${
                    hasBoosted
                      ? 'bg-[#EC4899]/15 text-[#F472B6] hover:bg-[#EC4899]/25'
                      : 'text-[#F472B6] hover:bg-[#EC4899]/15'
                  }`}
                >
                  <span>{hasBoosted ? `Boosted (${boostCount}) · Remove` : 'Boost Server (Free $0)'}</span>
                  <Rocket className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => {
                  setServerMenuOpen(false);
                  onOpenInvite();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-medium text-[#EF4444] hover:bg-[#E53935] hover:text-white transition-colors"
              >
                <span>Invite People</span>
                <UserPlus className="w-4 h-4" />
              </button>

              {perms.canAccessServerSettings && (
                <button
                  onClick={() => {
                    setServerMenuOpen(false);
                    onOpenServerSettings();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm ${t.textSecondary} ${t.hoverBg} transition-colors`}
                >
                  <span>Server Settings</span>
                  <Settings className="w-4 h-4 text-[#EF4444]" />
                </button>
              )}

              {perms.canAddChannels && (
                <button
                  onClick={() => {
                    setServerMenuOpen(false);
                    onOpenCreateChannel('text');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm ${t.textSecondary} ${t.hoverBg} transition-colors`}
                >
                  <span>Create Channel</span>
                  <Plus className="w-4 h-4 text-[#EF4444]" />
                </button>
              )}

              <div className={`my-1 border-t ${t.border}`} />

              {isPermanentHq ? (
                <div
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs ${t.textMuted}`}
                  title="Talkcob HQ is your permanent home server and cannot be left"
                >
                  <span>Permanent Home Server</span>
                  <Lock className="w-3.5 h-3.5 text-[#EF4444]" />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setServerMenuOpen(false);
                    onLeaveServer(server.id);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm text-[#EF4444] hover:bg-[#E53935]/15 transition-colors"
                >
                  <span>Leave Server</span>
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={`h-12 px-3 flex items-center border-b ${t.border}`}>
          <button
            onClick={onOpenQuickSwitcher}
            className={`w-full h-7 px-2.5 rounded-md flex items-center justify-between text-xs ${t.inputBg} ${t.textMuted} hover:opacity-90 transition-opacity`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Search className="w-3.5 h-3.5 shrink-0 text-[#EF4444]" />
              <span className="truncate">Find conversation</span>
            </span>
            <kbd className="font-mono text-[10px] opacity-75 shrink-0">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Main Scrollable List */}
      <div className="flex-1 overflow-y-auto talkcob-scroll px-2 py-3 space-y-4">
        {mode === 'home' || mode === 'discover' || mode === 'bots' || mode === 'admin' ? (
          <div className="space-y-4">
            <button
              onClick={onSelectFriends}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-sm font-semibold transition-colors ${
                mode === 'home' && homeSubView === 'friends'
                  ? `${t.activeBg} ${t.textPrimary}`
                  : `${t.textSecondary} ${t.hoverBg}`
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#EF4444]" />
                <span>Friends</span>
              </span>
              {pendingIncomingCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                  {pendingIncomingCount}
                </span>
              )}
            </button>

            <div>
              <div className="px-2 mb-2 flex items-center justify-between">
                <span className={`text-xs font-semibold tracking-wide ${t.textMuted}`}>
                  Direct Messages
                </span>
                <button
                  onClick={onSelectFriends}
                  title="Add Friend or Message"
                  aria-label="Add friend or start a direct message"
                  className="text-[#EF4444] hover:text-[#DC2626] p-0.5 rounded"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {dmThreads.length === 0 ? (
                  <div className={`px-2 py-3 text-xs leading-relaxed ${t.textMuted}`}>
                    No direct messages yet. Add a friend above to start chatting.
                  </div>
                ) : (
                  dmThreads.map((dm) => {
                    const peer = users[dm.participantId];
                    if (!peer) return null;
                    const isActive = mode === 'home' && homeSubView === 'dm' && activeDmId === dm.id;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => onSelectDm(dm.id)}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors ${
                          isActive ? t.activeBg : t.hoverBg
                        }`}
                      >
                        <Avatar
                          name={peer.name}
                          src={peer.avatar}
                          accentColor={peer.accentColor}
                          size="sm"
                          status={peer.status}
                          showStatus
                          statusBorderClass={
                            theme === 'light'
                              ? 'border-[#F2F3F5]'
                              : theme === 'obsidian'
                              ? 'border-[#111318]'
                              : 'border-[#2B2D31]'
                          }
                        />
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isActive ? t.textPrimary : t.textSecondary
                              }`}
                            >
                              {peer.name}
                            </span>
                            {dm.unreadCount && dm.unreadCount > 0 ? (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                                {dm.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          {peer.customStatus && (
                            <p className={`text-xs truncate ${t.textMuted}`}>{peer.customStatus}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          categories.map((category) => {
            const catChannels = channels.filter((c) => {
              if (c.category !== category) return false;
              const cp = resolveChannelPermissions(server, c, currentUser.id);
              return cp.viewChannel || cp.manageChannel || cp.managePermissions || perms.canAddChannels;
            });
            if (catChannels.length === 0) return null;
            const isCollapsed = collapsedCategories[category];
            const hasVoice = catChannels.some((c) => c.type === 'voice');

            return (
              <div key={category}>
                <div className="flex items-center justify-between px-1 mb-1 group">
                  <button
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-1 text-xs font-semibold tracking-wide ${t.textMuted} hover:opacity-100 transition-opacity`}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-[#EF4444]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-[#EF4444]" />
                    )}
                    <span>{category}</span>
                  </button>
                  {perms.canAddChannels && (
                    <button
                      onClick={() => onOpenCreateChannel(hasVoice ? 'voice' : 'text')}
                      title={`Add channel in ${category}`}
                      aria-label={`Add channel in ${category}`}
                      className="opacity-70 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded text-[#EF4444] hover:bg-[#E53935]/15 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {catChannels.map((channel) => {
                      const isActive = activeChannelId === channel.id;
                      const isConnectedHere = connectedVoiceChannel?.id === channel.id;
                      const chPerms = resolveChannelPermissions(server, channel, currentUser.id);
                      const canEditChPerms =
                        perms.canAccessServerSettings ||
                        perms.canAddChannels ||
                        chPerms.manageChannel ||
                        chPerms.managePermissions;
                      const participants = (channel.voiceParticipantIds || [])
                        .map((uid) => users[uid])
                        .filter(Boolean);
                      const isVoiceFull =
                        channel.type === 'voice' &&
                        Boolean(channel.userLimit && channel.userLimit > 0) &&
                        participants.length >= (channel.userLimit || 0) &&
                        !isConnectedHere &&
                        !chPerms.moveMembers &&
                        !perms.isOwner;
                      const voiceBlocked =
                        channel.type === 'voice' && (!chPerms.connect || isVoiceFull);

                      return (
                        <div key={channel.id} className="group/ch">
                          <div
                            className={`w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-md transition-colors ${
                              isActive || isConnectedHere ? t.activeBg : t.hoverBg
                            }`}
                          >
                            <button
                              onClick={() => {
                                if (channel.type === 'voice') {
                                  if (voiceBlocked) return;
                                  onJoinVoiceChannel(channel.id);
                                } else {
                                  onSelectChannel(channel.id);
                                }
                              }}
                              disabled={voiceBlocked}
                              title={
                                channel.type === 'voice' && !chPerms.connect
                                  ? 'You do not have permission to connect to this voice channel'
                                  : isVoiceFull
                                  ? `Voice channel is full (${participants.length}/${channel.userLimit})`
                                  : undefined
                              }
                              className="flex-1 min-w-0 flex items-center gap-2 text-left disabled:opacity-50"
                            >
                              {channel.type === 'text' ? (
                                channel.isPrivate ? (
                                  <Lock
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isActive ? 'text-[#EF4444]' : 'text-[#EF4444]/75'
                                    }`}
                                  />
                                ) : (
                                  <Hash
                                    className={`w-4 h-4 shrink-0 ${
                                      isActive ? 'text-[#EF4444]' : 'text-[#EF4444]/75'
                                    }`}
                                  />
                                )
                              ) : voiceBlocked ? (
                                <Lock className="w-4 h-4 shrink-0 text-[#80848E]" />
                              ) : (
                                <Volume2
                                  className={`w-4 h-4 shrink-0 ${
                                    isConnectedHere ? 'text-[#EF4444]' : 'text-[#EF4444]/75'
                                  }`}
                                />
                              )}
                              <span
                                className={`text-sm font-medium truncate ${
                                  isConnectedHere
                                    ? 'text-[#EF4444]'
                                    : isActive || (channel.unreadCount && channel.unreadCount > 0)
                                    ? t.textPrimary
                                    : t.textSecondary
                                }`}
                              >
                                {channel.name}
                              </span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              {channel.type === 'voice' && channel.userLimit ? (
                                <span className={`text-[10px] font-mono tabular-nums ${t.textMuted}`}>
                                  {participants.length}/{channel.userLimit}
                                </span>
                              ) : null}

                              {canEditChPerms && onOpenChannelPermissions && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenChannelPermissions(channel.id);
                                  }}
                                  title={`Edit #${channel.name} permissions`}
                                  aria-label={`Edit ${channel.name} permissions`}
                                  className="opacity-0 group-hover/ch:opacity-100 focus:opacity-100 p-0.5 rounded text-[#949BA4] hover:text-[#EF4444] transition-opacity"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {channel.unreadCount && channel.unreadCount > 0 && !isActive ? (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                                  {channel.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Live Voice Participants nested under Voice Channel */}
                          {channel.type === 'voice' && participants.length > 0 && (
                            <div className="pl-7 pr-2 py-1 space-y-1">
                              {participants.map((p) => {
                                const isYou = p.id === currentUser.id;
                                const isSpeaking = speakingUserIds.includes(p.id);
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between gap-2 py-0.5"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Avatar
                                        name={p.name}
                                        src={p.avatar}
                                        accentColor={p.accentColor}
                                        size="xs"
                                        speaking={isSpeaking}
                                        isCurrentUser={isYou}
                                      />
                                      <span
                                        className={`text-xs truncate ${
                                          isSpeaking ? 'text-[#23A55A] font-medium' : t.textSecondary
                                        }`}
                                      >
                                        {p.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {isYou && isScreenSharing && (
                                        <span className="px-1 py-0.5 rounded bg-[#E53935] text-white text-[9px] font-bold tracking-wider">
                                          LIVE
                                        </span>
                                      )}
                                      {isYou && isMuted && (
                                        <MicOff className="w-3 h-3 text-[#EF4444]" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Voice Connected / DM Call Connected Dock */}
      {(connectedVoiceChannel || activeDmCallPeer) && (
        <div className={`px-3 py-2 border-t ${t.border} ${t.dockBg} space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={connectedVoiceChannel ? onFocusVoiceStage : onFocusDmCall}
              className="min-w-0 text-left group flex-1"
              title={connectedVoiceChannel ? 'Open Voice Stage' : 'Focus DM Call'}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#23A55A]">
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span>{connectedVoiceChannel ? 'Voice Connected' : 'DM Call Connected'}</span>
              </div>
              <p className={`text-xs truncate ${t.textMuted} group-hover:underline`}>
                {connectedVoiceChannel
                  ? connectedVoiceChannel.name
                  : `Call with ${activeDmCallPeer?.name}`}
              </p>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onToggleScreenShare}
                disabled={Boolean(connectedVoiceChannel) && !perms.permissions.shareScreen}
                title={
                  Boolean(connectedVoiceChannel) && !perms.permissions.shareScreen
                    ? 'Your role does not allow screen sharing in this server'
                    : isScreenSharing
                    ? 'Stop sharing screen'
                    : 'Share Your Screen'
                }
                aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
                className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                  isScreenSharing
                    ? 'bg-[#E53935] text-white'
                    : 'text-[#EF4444] hover:bg-[#E53935]/15'
                }`}
              >
                {isScreenSharing ? (
                  <MonitorOff className="w-4 h-4" />
                ) : (
                  <MonitorUp className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={connectedVoiceChannel ? onLeaveVoice : onLeaveDmCall}
                title="Disconnect"
                aria-label="Disconnect call"
                className="p-1.5 rounded-md text-[#EF4444] hover:bg-[#E53935]/15 transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Control Dock */}
      <div className={`relative px-2.5 py-2 border-t ${t.border} ${t.dockBg} flex items-center justify-between gap-1`}>
        <button
          onClick={() => setStatusMenuOpen((prev) => !prev)}
          className={`flex items-center gap-2 min-w-0 flex-1 p-1 rounded-md text-left ${t.hoverBg} transition-colors`}
          title="Change status"
        >
          <div className="relative shrink-0">
            <Avatar
              name={currentUser.name}
              src={currentUser.avatar}
              accentColor={currentUser.accentColor}
              size="sm"
              status={currentUser.status}
              showStatus
              speaking={speakingUserIds.includes(currentUser.id)}
              statusBorderClass={statusBorder}
              isCurrentUser
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-semibold truncate flex items-center gap-1 ${t.textPrimary}`}>
              <span className="truncate">{currentUser.name}</span>
            </div>
            <p className={`text-[11px] truncate ${t.textMuted}`}>
              {currentUser.customStatus || `@${currentUser.username}`}
            </p>
          </div>
        </button>

        {statusMenuOpen && (
          <div
            className={`absolute bottom-14 left-2 right-2 z-30 rounded-lg border p-1.5 shadow-xl ${t.modalBg} ${t.border}`}
          >
            <div className={`px-2 py-1 text-[11px] font-semibold ${t.textMuted}`}>
              Set Status
            </div>
            {([
              { id: 'online', label: 'Online', dot: 'bg-[#23A55A]' },
              { id: 'idle', label: 'Idle', dot: 'bg-[#F0B232]' },
              { id: 'dnd', label: 'Do Not Disturb', dot: 'bg-[#E53935]' },
              { id: 'offline', label: 'Invisible', dot: 'bg-[#80848E]' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChangeStatus(opt.id);
                  setStatusMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${t.textPrimary} ${t.hoverBg}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center shrink-0">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`p-1.5 rounded-md transition-colors ${
              isMuted
                ? 'text-[#EF4444] bg-[#E53935]/15 hover:bg-[#E53935]/25'
                : `text-[#EF4444] ${t.hoverBg}`
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleDeafen}
            aria-label={isDeafened ? 'Undeafen audio' : 'Deafen audio'}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
            className={`p-1.5 rounded-md transition-colors ${
              isDeafened
                ? 'text-[#EF4444] bg-[#E53935]/15 hover:bg-[#E53935]/25'
                : `text-[#EF4444] ${t.hoverBg}`
            }`}
          >
            {isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="User Settings"
            title="User Settings"
            className={`p-1.5 rounded-md transition-colors text-[#EF4444] ${t.hoverBg}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle brand footer */}
      <div className={`px-3 py-1.5 border-t ${t.border} ${t.dockBg} flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <TalkcobIcon size={16} variant="mark" mascotColor="#E53935" animated={Boolean(connectedVoiceChannel)} />
          <span className={`text-[11px] font-display font-semibold ${t.textMuted}`}>
            Talkcob · Free
          </span>
        </div>
        <span className={`text-[11px] ${t.textMuted} tabular-nums`}>
          {Object.values(users).filter((u) => u.status !== 'offline').length} online
        </span>
      </div>
    </aside>
  );
};
