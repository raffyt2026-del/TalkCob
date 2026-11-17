export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type AppTheme = 'dark' | 'obsidian' | 'light';

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export type AvatarDecorationId =
  | 'none'
  | 'crimson-flame'
  | 'gold-crown'
  | 'cyber-prism'
  | 'emerald-pulse'
  | 'starlight'
  | 'rainbow-aura';

export type ProfileEffectId =
  | 'none'
  | 'aurora'
  | 'ember-sparks'
  | 'confetti'
  | 'cyber-grid';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  pronouns?: string;
  avatar?: string;
  accentColor: string;
  bannerColor: string;
  status: UserStatus;
  customStatus?: string;
  bio: string;
  socialLinks?: SocialLink[];
  role: 'Founder' | 'Audio Lead' | 'Moderator' | 'Member' | 'Bot';
  isBot?: boolean;
  isPlatformOwner?: boolean;
  isPlatformAdmin?: boolean;
  isBanned?: boolean;
  banReason?: string;
  hasFreeNitro?: boolean;
  avatarDecoration?: AvatarDecorationId;
  profileEffect?: ProfileEffectId;
  nameplateGradient?: string;
  customBannerUrl?: string;
  streamQuality?: '720p30' | '1080p60' | 'source';
  entranceSound?: string;
  serverNicknames?: Record<string, string>;
  joinedAt: string;
}

export interface BannedAccountRecord {
  userId: string;
  username: string;
  name: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

export interface BannedIpRecord {
  id: string;
  ip: string;
  targetUserId?: string;
  targetUsername?: string;
  deletedUsernames?: string[];
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

export interface AdminOverviewData {
  bannedAccounts: BannedAccountRecord[];
  bannedIps: BannedIpRecord[];
  userIpsByUserId: Record<string, string[]>;
}

export interface RolePermissions {
  administrator: boolean;
  manageServer: boolean;
  manageRoles: boolean;
  manageChannels: boolean;
  kickMembers: boolean;
  banMembers: boolean;
  manageMessages: boolean;
  sendMessages: boolean;
  attachFiles: boolean;
  addReactions: boolean;
  mentionEveryone: boolean;
  connectVoice: boolean;
  speakVoice: boolean;
  shareScreen: boolean;
  muteMembers: boolean;
  manageBots: boolean;
}

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  canAccessServerSettings: boolean;
  canCreateChannels: boolean;
  permissions?: RolePermissions;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  superUserIds?: string[];
}

export interface PinnedSticker {
  id: string;
  title: string;
  url: string;
  pinnedByUserId: string;
  pinnedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'sticker';
  mimeType?: string;
  size?: number;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  timestamp: string;
  edited?: boolean;
  pinned?: boolean;
  replyToId?: string;
  reactions: Reaction[];
  attachments?: Attachment[];
}

export type PermissionOverrideValue = 'allow' | 'inherit' | 'deny';

export type ChannelPermissionKey =
  | 'viewChannel'
  | 'manageChannel'
  | 'managePermissions'
  | 'createInvite'
  | 'sendMessages'
  | 'sendMessagesInThreads'
  | 'embedLinks'
  | 'attachFiles'
  | 'addReactions'
  | 'useExternalEmojis'
  | 'mentionEveryone'
  | 'manageMessages'
  | 'readMessageHistory'
  | 'sendTtsMessages'
  | 'useApplicationCommands'
  | 'connect'
  | 'speak'
  | 'streamVideo'
  | 'useVoiceActivity'
  | 'prioritySpeaker'
  | 'muteMembers'
  | 'deafenMembers'
  | 'moveMembers';

export type ChannelPermissionOverrides = Partial<
  Record<ChannelPermissionKey, PermissionOverrideValue>
>;

export type ResolvedChannelPermissions = Record<ChannelPermissionKey, boolean>;

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: 'text' | 'voice';
  category: string;
  topic?: string;
  unreadCount?: number;
  voiceParticipantIds?: string[];
  isPrivate?: boolean;
  slowmodeSeconds?: 0 | 5 | 10 | 15 | 30 | 60;
  nsfw?: boolean;
  userLimit?: number;
  bitrateKbps?: number;
  roleOverrides?: Record<string, ChannelPermissionOverrides>;
  memberOverrides?: Record<string, ChannelPermissionOverrides>;
  pinnedStickers?: PinnedSticker[];
}

export interface ServerAuditEntry {
  id: string;
  action: string;
  actorName: string;
  timestamp: string;
}

export interface Server {
  id: string;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
  bannerColor?: string;
  iconUrl?: string;
  ownerId: string;
  memberIds: string[];
  roles: ServerRole[];
  memberRoles: Record<string, string[]>;
  inviteCode: string;
  boostUserIds?: string[];
  vanityCode?: string;
  verificationLevel?: 'none' | 'low' | 'medium' | 'high';
  explicitFilter?: 'disabled' | 'no_role' | 'all_members';
  defaultNotifications?: 'all' | 'mentions';
  afkChannelId?: string;
  afkTimeoutMinutes?: 1 | 5 | 15 | 30 | 60;
  systemChannelId?: string;
  welcomeMessageEnabled?: boolean;
  welcomeMessage?: string;
  slowmodeSeconds?: 0 | 5 | 10 | 30 | 60;
  allowExternalEmojis?: boolean;
  communityRulesEnabled?: boolean;
  rulesSummary?: string;
  blockedWords?: string[];
  bannedUserIds?: string[];
  mutedUserIds?: string[];
  auditLog?: ServerAuditEntry[];
}

export interface DirectMessageThread {
  id: string;
  participantId: string;
  unreadCount?: number;
  lastActivity: string;
}

export interface CustomBotCommand {
  id: string;
  triggerType: 'command' | 'keyword';
  trigger: string;
  response: string;
  reactEmoji?: string;
  pinTriggerMessage?: boolean;
  enabled: boolean;
}

export interface CustomBotLogEntry {
  id: string;
  summary: string;
  timestamp: string;
}

export interface CustomBot {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  accentColor: string;
  bio: string;
  statusText: string;
  token: string;
  prefix: string;
  enabled: boolean;
  serverIds: string[];
  autoReactEmoji?: string;
  autoReplyOnMention: boolean;
  mentionReplyText: string;
  moderateBlockedWords: boolean;
  blockedWords: string[];
  moderationWarningText: string;
  commands: CustomBotCommand[];
  createdAt: string;
  logs: CustomBotLogEntry[];
}

