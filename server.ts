/// <reference types="node" />
import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createHttpServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

interface SocialLink {
  id: string;
  label: string;
  url: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  pronouns?: string;
  avatar?: string;
  accentColor: string;
  bannerColor: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  bio: string;
  socialLinks?: SocialLink[];
  role: 'Founder' | 'Audio Lead' | 'Moderator' | 'Member' | 'Bot';
  isBot?: boolean;
  isPlatformOwner?: boolean;
  isPlatformAdmin?: boolean;
  isBanned?: boolean;
  banReason?: string;
  joinedAt: string;
  hasFreeNitro?: boolean;
  avatarDecoration?: string;
  profileEffect?: string;
  nameplateGradient?: string;
  customBannerUrl?: string;
  streamQuality?: '720p30' | '1080p60' | 'source';
  entranceSound?: string;
  serverNicknames?: Record<string, string>;
}

interface BannedAccountRecord {
  userId: string;
  username: string;
  name: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

interface BannedIpRecord {
  id: string;
  ip: string;
  targetUserId?: string;
  targetUsername?: string;
  deletedUsernames?: string[];
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

interface RolePermissions {
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

interface ServerRole {
  id: string;
  name: string;
  color: string;
  canAccessServerSettings: boolean;
  canCreateChannels: boolean;
  permissions?: RolePermissions;
}

interface Server {
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
  [key: string]: unknown;
}

interface PinnedSticker {
  id: string;
  title: string;
  url: string;
  pinnedByUserId: string;
  pinnedAt: string;
}

interface Channel {
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
  roleOverrides?: Record<string, Record<string, string>>;
  memberOverrides?: Record<string, Record<string, string>>;
  pinnedStickers?: PinnedSticker[];
}

interface Reaction {
  emoji: string;
  userIds: string[];
  superUserIds?: string[];
}

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  timestamp: string;
  edited?: boolean;
  pinned?: boolean;
  replyToId?: string;
  reactions: Reaction[];
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: 'image' | 'video' | 'sticker';
    mimeType?: string;
    size?: number;
  }>;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

interface CustomBotLogEntry {
  id: string;
  summary: string;
  timestamp: string;
}

interface CustomBot {
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
  commands: unknown[];
  createdAt: string;
  logs: CustomBotLogEntry[];
}

interface WorkspaceStore {
  users: Record<string, User>;
  passwordsByUserId: Record<string, string>;
  servers: Server[];
  channels: Channel[];
  messages: Message[];
  bots: CustomBot[];
  friendships: Array<[string, string]>;
  friendRequests: FriendRequest[];
  dmPinnedStickers: Record<string, PinnedSticker[]>;
  bannedAccounts: BannedAccountRecord[];
  bannedIps: BannedIpRecord[];
  userIpsByUserId: Record<string, string[]>;
  hqDeletedByAdmin?: boolean;
}

const HOME_SERVER_ID = 'srv-hq';
const CURRENT_USER_ID = 'user-you';
const PLATFORM_OWNER_ID = 'user-reallyraff';
const PLATFORM_OWNER_NAME = 'ReallyRaff_YT';
const PLATFORM_OWNER_PASSWORD = 'HAPPYGreyRaffie26??';

const DEFAULT_SETTINGS_PERMISSIONS: RolePermissions = {
  administrator: false,
  manageServer: true,
  manageRoles: true,
  manageChannels: true,
  kickMembers: true,
  banMembers: false,
  manageMessages: true,
  sendMessages: true,
  attachFiles: true,
  addReactions: true,
  mentionEveryone: true,
  connectVoice: true,
  speakVoice: true,
  shareScreen: true,
  muteMembers: true,
  manageBots: true,
};

const DEFAULT_MEMBER_PERMISSIONS: RolePermissions = {
  administrator: false,
  manageServer: false,
  manageRoles: false,
  manageChannels: false,
  kickMembers: false,
  banMembers: false,
  manageMessages: false,
  sendMessages: true,
  attachFiles: true,
  addReactions: true,
  mentionEveryone: false,
  connectVoice: true,
  speakVoice: true,
  shareScreen: true,
  muteMembers: false,
  manageBots: false,
};

const DEFAULT_SERVER_ROLES: ServerRole[] = [
  {
    id: 'role-settings',
    name: 'settings',
    color: '#E53935',
    canAccessServerSettings: true,
    canCreateChannels: true,
    permissions: DEFAULT_SETTINGS_PERMISSIONS,
  },
  {
    id: 'role-member',
    name: 'member',
    color: '#949BA4',
    canAccessServerSettings: false,
    canCreateChannels: false,
    permissions: DEFAULT_MEMBER_PERMISSIONS,
  },
];

function createSeedStore(): WorkspaceStore {
  const users: Record<string, User> = {
    'user-reallyraff': {
      id: PLATFORM_OWNER_ID,
      name: PLATFORM_OWNER_NAME,
      username: PLATFORM_OWNER_NAME,
      accentColor: '#E53935',
      bannerColor: '#991B1B',
      status: 'online',
      customStatus: 'Owner of Talkcob',
      bio: 'Founder & Owner of Talkcob.',
      socialLinks: [],
      role: 'Founder',
      isPlatformOwner: true,
      isPlatformAdmin: true,
      joinedAt: 'Jan 2024',
    },
    'user-you': {
      id: 'user-you',
      name: 'Alex Mercer',
      username: 'alexm',
      accentColor: '#E53935',
      bannerColor: '#C62828',
      status: 'online',
      customStatus: 'Hanging out in Talkcob HQ',
      bio: 'Product designer & voice room host. Always down to talk audio gear or side projects.',
      socialLinks: [],
      role: 'Audio Lead',
      joinedAt: 'Jan 2024',
    },
    'user-maya': {
      id: 'user-maya',
      name: 'Maya Lin',
      username: 'mayasound',
      avatar: '/src/assets/images/avatar_maya_1794519710483.jpg',
      accentColor: '#E53935',
      bannerColor: '#B91C1C',
      status: 'online',
      customStatus: 'Mixing stems in studio',
      bio: 'Sound designer & spatial audio nerd. Ask me about field microphones or modular synths.',
      socialLinks: [],
      role: 'Audio Lead',
      joinedAt: 'Feb 2024',
    },
    'user-leo': {
      id: 'user-leo',
      name: 'Leo Vance',
      username: 'leobuilds',
      avatar: '/src/assets/images/avatar_leo_1794519711489.jpg',
      accentColor: '#DC2626',
      bannerColor: '#991B1B',
      status: 'online',
      customStatus: 'Working on indie projects',
      bio: 'Indie game dev and TypeScript tinkerer.',
      socialLinks: [],
      role: 'Moderator',
      joinedAt: 'Mar 2024',
    },
    'user-sam': {
      id: 'user-sam',
      name: 'Samira Cruz',
      username: 'samdraw',
      avatar: '/src/assets/images/avatar_sam_1794519711272.jpg',
      accentColor: '#EF4444',
      bannerColor: '#B91C1C',
      status: 'idle',
      customStatus: 'Sketching UI icons',
      bio: 'Illustrator and brand systems designer.',
      socialLinks: [],
      role: 'Moderator',
      joinedAt: 'Apr 2024',
    },
    'user-noah': {
      id: 'user-noah',
      name: 'Noah Park',
      username: 'noahp',
      accentColor: '#DC2626',
      bannerColor: '#7F1D1D',
      status: 'dnd',
      customStatus: 'Deep work',
      bio: 'Systems engineer working on low-latency WebRTC pipelines.',
      socialLinks: [],
      role: 'Member',
      joinedAt: 'Jun 2024',
    },
    'user-chloe': {
      id: 'user-chloe',
      name: 'Chloe Brooks',
      username: 'chloeb',
      accentColor: '#E53935',
      bannerColor: '#991B1B',
      status: 'offline',
      bio: 'Community organizer and weekend co-op gamer.',
      socialLinks: [],
      role: 'Member',
      joinedAt: 'Aug 2024',
    },
  };

  const servers: Server[] = [
    {
      id: HOME_SERVER_ID,
      name: 'Talkcob HQ',
      shortName: 'TH',
      description: 'The permanent home of Talkcob — community chat, feedback, and free live voice lounges.',
      accentColor: '#E53935',
      ownerId: PLATFORM_OWNER_ID,
      memberIds: Object.keys(users),
      roles: DEFAULT_SERVER_ROLES,
      memberRoles: {
        'user-reallyraff': ['role-settings'],
        'user-maya': ['role-settings'],
        'user-leo': ['role-member'],
        'user-sam': ['role-member'],
        'user-noah': ['role-member'],
        'user-chloe': ['role-member'],
      },
      inviteCode: 'talkcob-hq',
    },
  ];

  const channels: Channel[] = [
    { id: 'ch-hq-announcements', serverId: HOME_SERVER_ID, name: 'announcements', type: 'text', category: 'Information', topic: 'Community updates and open notes.' },
    { id: 'ch-hq-rules', serverId: HOME_SERVER_ID, name: 'rules-and-welcome', type: 'text', category: 'Information', topic: 'Community guidelines and how Talkcob HQ works.' },
    { id: 'ch-hq-feedback', serverId: HOME_SERVER_ID, name: 'feedback-and-ideas', type: 'text', category: 'Information', topic: 'Suggest features, channel ideas, and improvements.' },
    { id: 'ch-hq-general', serverId: HOME_SERVER_ID, name: 'general', type: 'text', category: 'Community', topic: 'Casual chat, introductions, and everything happening around Talkcob HQ.' },
    { id: 'ch-hq-intros', serverId: HOME_SERVER_ID, name: 'introductions', type: 'text', category: 'Community', topic: 'Say hello and tell everyone what you are into.' },
    { id: 'ch-hq-design', serverId: HOME_SERVER_ID, name: 'brand-and-icons', type: 'text', category: 'Community', topic: 'Share custom artwork, icons, and layout ideas.' },
    { id: 'ch-hq-media', serverId: HOME_SERVER_ID, name: 'media-and-clips', type: 'text', category: 'Community', topic: 'Drop screenshots, photos, and favorite clips.' },
    { id: 'ch-hq-offtopic', serverId: HOME_SERVER_ID, name: 'off-topic', type: 'text', category: 'Community', topic: 'Food, pets, movies, and random late-night thoughts.' },
    { id: 'ch-hq-tech', serverId: HOME_SERVER_ID, name: 'tech-and-code', type: 'text', category: 'Builders & Audio', topic: 'Programming, web projects, and open-source discussion.' },
    { id: 'ch-hq-music', serverId: HOME_SERVER_ID, name: 'music-and-gear', type: 'text', category: 'Builders & Audio', topic: 'Microphones, synths, headphones, and playlists.' },
    { id: 'ch-hq-lounge', serverId: HOME_SERVER_ID, name: 'Voice Lounge', type: 'voice', category: 'Voice Channels', topic: 'Free HD voice room — drop in anytime to talk or test your mic.', voiceParticipantIds: [] },
    { id: 'ch-hq-stage', serverId: HOME_SERVER_ID, name: 'Town Hall Stage', type: 'voice', category: 'Voice Channels', topic: 'Open voice stage for group sessions.', voiceParticipantIds: [] },
    { id: 'ch-hq-chill-vc', serverId: HOME_SERVER_ID, name: 'Chill Music Room', type: 'voice', category: 'Voice Channels', topic: 'Hang out, listen together, and chat.', voiceParticipantIds: [] },
    { id: 'ch-hq-gaming-vc', serverId: HOME_SERVER_ID, name: 'Gaming Squad', type: 'voice', category: 'Voice Channels', topic: 'Co-op comms and squad voice chat.', voiceParticipantIds: [] },
    { id: 'ch-hq-cowork-vc', serverId: HOME_SERVER_ID, name: 'Study & Co-Work', type: 'voice', category: 'Voice Channels', topic: 'Quiet focus room for getting things done together.', voiceParticipantIds: [] },
  ];

  return {
    users,
    passwordsByUserId: {
      [PLATFORM_OWNER_ID]: PLATFORM_OWNER_PASSWORD,
    },
    servers,
    channels,
    messages: [],
    bots: [],
    friendships: [],
    friendRequests: [],
    dmPinnedStickers: {},
    bannedAccounts: [],
    bannedIps: [],
    userIpsByUserId: {},
    hqDeletedByAdmin: false,
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '.talkcob-data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'workspace.json');

function loadStore(): WorkspaceStore {
  const seed = createSeedStore();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<WorkspaceStore>;
      const users = { ...seed.users, ...(parsed.users || {}) };

      // Ensure ReallyRaff_YT exists as Platform Owner with password HAPPYGreyRaffie26??
      const existingOwner = users[PLATFORM_OWNER_ID];
      users[PLATFORM_OWNER_ID] = {
        ...seed.users[PLATFORM_OWNER_ID],
        ...(existingOwner || {}),
        id: PLATFORM_OWNER_ID,
        name: existingOwner?.name || PLATFORM_OWNER_NAME,
        username: existingOwner?.username || PLATFORM_OWNER_NAME,
        role: 'Founder',
        isPlatformOwner: true,
        isPlatformAdmin: true,
        isBanned: false,
      };

      const passwordsByUserId: Record<string, string> = {
        ...(parsed.passwordsByUserId || {}),
      };
      if (!passwordsByUserId[PLATFORM_OWNER_ID]) {
        passwordsByUserId[PLATFORM_OWNER_ID] = PLATFORM_OWNER_PASSWORD;
      }

      const hqDeletedByAdmin = Boolean(parsed.hqDeletedByAdmin);
      const parsedServers = Array.isArray(parsed.servers) ? parsed.servers : seed.servers;
      const hasHq = parsedServers.some((s) => s.id === HOME_SERVER_ID);
      const baseServers =
        hasHq || hqDeletedByAdmin ? parsedServers : [...seed.servers, ...parsedServers];

      const servers = baseServers.map((srv) => {
        const isHq = srv.id === HOME_SERVER_ID;
        const nextMemberIds = Array.from(
          new Set([...(srv.memberIds || []), ...(isHq ? Object.keys(users) : [PLATFORM_OWNER_ID])])
        );
        const nextMemberRoles = { ...(srv.memberRoles || {}) };
        if (isHq) {
          nextMemberRoles[PLATFORM_OWNER_ID] = Array.from(
            new Set([...(nextMemberRoles[PLATFORM_OWNER_ID] || []), 'role-settings'])
          );
        }
        return {
          ...srv,
          ownerId: isHq ? PLATFORM_OWNER_ID : srv.ownerId || PLATFORM_OWNER_ID,
          roles: srv.roles && srv.roles.length > 0 ? srv.roles : DEFAULT_SERVER_ROLES,
          memberRoles: nextMemberRoles,
          memberIds: nextMemberIds,
        };
      });

      const parsedChannels = Array.isArray(parsed.channels) ? parsed.channels : seed.channels;
      const channelIds = new Set(parsedChannels.map((c) => c.id));
      const mergedChannels = hqDeletedByAdmin
        ? parsedChannels
        : [...parsedChannels, ...seed.channels.filter((c) => !channelIds.has(c.id))];

      return {
        users,
        passwordsByUserId,
        servers,
        channels: mergedChannels,
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        bots: Array.isArray(parsed.bots) ? parsed.bots : [],
        friendships: Array.isArray(parsed.friendships) ? parsed.friendships : [],
        friendRequests: Array.isArray(parsed.friendRequests) ? parsed.friendRequests : [],
        dmPinnedStickers: parsed.dmPinnedStickers || {},
        bannedAccounts: Array.isArray(parsed.bannedAccounts) ? parsed.bannedAccounts : [],
        bannedIps: Array.isArray(parsed.bannedIps) ? parsed.bannedIps : [],
        userIpsByUserId: parsed.userIpsByUserId || {},
        hqDeletedByAdmin,
      };
    }
  } catch (err) {
    console.error('Failed to load Talkcob store, using seed:', err);
  }
  return seed;
}

const store: WorkspaceStore = loadStore();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist Talkcob workspace:', err);
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    flushSave();
  }, 150);
}

function getPublicState() {
  return {
    users: store.users,
    servers: store.servers,
    channels: store.channels,
    messages: store.messages,
    bots: store.bots,
    friendships: store.friendships,
    friendRequests: store.friendRequests,
    dmPinnedStickers: store.dmPinnedStickers,
  };
}

function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const xff = req.headers['x-forwarded-for'];
  const firstHop = Array.isArray(xff)
    ? xff[0]
    : typeof xff === 'string'
    ? xff.split(',')[0]
    : '';
  const candidate = (firstHop || req.socket?.remoteAddress || '127.0.0.1').trim();
  if (candidate === '::1') return '127.0.0.1';
  if (candidate.startsWith('::ffff:')) return candidate.slice(7);
  return candidate || '127.0.0.1';
}

function recordUserIp(userId: string, ip: string) {
  if (!userId || !ip) return;
  const existing = store.userIpsByUserId[userId] || [];
  const next = [ip, ...existing.filter((item) => item !== ip)].slice(0, 10);
  store.userIpsByUserId[userId] = next;
  scheduleSave();
}

function checkAccessBlock(
  userId?: string,
  ip?: string
): { blocked: true; type: 'account' | 'ip'; message: string } | { blocked: false } {
  const user = userId ? store.users[userId] : undefined;
  if (userId === PLATFORM_OWNER_ID || user?.isPlatformOwner) {
    return { blocked: false };
  }
  const accountBan = userId
    ? store.bannedAccounts.find((b) => b.userId === userId)
    : undefined;
  if (user?.isBanned || accountBan) {
    const reason = accountBan?.reason || user?.banReason || 'Violating Talkcob rules.';
    return {
      blocked: true,
      type: 'account',
      message: `Your account has been banned from Talkcob. Reason: ${reason}`,
    };
  }
  const ipBan = ip ? store.bannedIps.find((b) => b.ip === ip) : undefined;
  if (ipBan) {
    return {
      blocked: true,
      type: 'ip',
      message: `Your IP address (${ipBan.ip}) is permanently IP banned from Talkcob. All associated accounts were deleted and creating new accounts is blocked. Reason: ${ipBan.reason}`,
    };
  }
  return { blocked: false };
}

function isAuthorizedAdmin(actorUserId?: string): boolean {
  if (!actorUserId) return false;
  const actor = store.users[actorUserId];
  return Boolean(
    actor &&
      !actor.isBanned &&
      (actor.isPlatformOwner || actor.isPlatformAdmin || actor.id === PLATFORM_OWNER_ID)
  );
}

function purgeAccountsForBannedIps(
  ips: string[],
  explicitTargetUserId?: string
): { purgedUserIds: string[]; deletedUsernames: string[] } {
  const ipSet = new Set(ips.map((item) => item.trim()).filter(Boolean));
  const purgedIds: string[] = [];
  const deletedUsernames: string[] = [];

  for (const [uid, u] of Object.entries(store.users)) {
    if (!u || uid === PLATFORM_OWNER_ID || u.isPlatformOwner || u.isBot) continue;
    const recordedIps = store.userIpsByUserId[uid] || [];
    const matchesIp = recordedIps.some((rip) => ipSet.has(rip));
    const matchesExplicit = Boolean(explicitTargetUserId && uid === explicitTargetUserId);
    if (matchesIp || matchesExplicit) {
      purgedIds.push(uid);
      deletedUsernames.push(u.username);
    }
  }

  if (purgedIds.length === 0) {
    return { purgedUserIds: [], deletedUsernames: [] };
  }

  const purgedSet = new Set(purgedIds);
  for (const uid of purgedIds) {
    delete store.users[uid];
    delete store.passwordsByUserId[uid];
    delete store.userIpsByUserId[uid];
  }

  store.bannedAccounts = store.bannedAccounts.filter((b) => !purgedSet.has(b.userId));

  store.servers = store.servers.map((srv) => {
    const nextMemberRoles: Record<string, string[]> = {};
    for (const [uid, roles] of Object.entries(srv.memberRoles || {})) {
      if (!purgedSet.has(uid)) {
        nextMemberRoles[uid] = roles;
      }
    }
    return {
      ...srv,
      memberIds: (srv.memberIds || []).filter((id) => !purgedSet.has(id)),
      memberRoles: nextMemberRoles,
    };
  });

  store.channels = store.channels.map((ch) =>
    ch.type === 'voice'
      ? {
          ...ch,
          voiceParticipantIds: (ch.voiceParticipantIds || []).filter((id) => !purgedSet.has(id)),
        }
      : ch
  );

  store.friendships = store.friendships.filter(
    ([a, b]) => !purgedSet.has(a) && !purgedSet.has(b)
  );
  store.friendRequests = store.friendRequests.filter(
    (r) => !purgedSet.has(r.fromUserId) && !purgedSet.has(r.toUserId)
  );

  store.messages = store.messages
    .filter((m) => {
      if (purgedSet.has(m.authorId)) return false;
      if (m.channelId.startsWith('dm__')) {
        const parts = m.channelId.split('__');
        if (parts.length === 3 && (purgedSet.has(parts[1]) || purgedSet.has(parts[2]))) {
          return false;
        }
      }
      return true;
    })
    .map((m) => ({
      ...m,
      reactions: (m.reactions || [])
        .map((r) => ({
          ...r,
          userIds: r.userIds.filter((id) => !purgedSet.has(id)),
        }))
        .filter((r) => r.userIds.length > 0),
    }));

  return { purgedUserIds: purgedIds, deletedUsernames };
}

interface GifCatalogItem {
  id: string;
  slug: string;
  title: string;
  category: 'Reactions' | 'Hype' | 'Funny' | 'Gaming' | 'Love';
  label: string;
  bg1: [number, number, number];
  bg2: [number, number, number];
  accent: [number, number, number];
  style: 'pulse' | 'bars' | 'confetti' | 'hearts' | 'matrix' | 'flash';
}

const GIF_CATALOG: GifCatalogItem[] = [
  { id: 'gif-gg', slug: 'gg-victory', title: 'GG Victory', category: 'Gaming', label: 'GG!', bg1: [20, 22, 34], bg2: [38, 22, 54], accent: [35, 165, 90], style: 'confetti' },
  { id: 'gif-hype', slug: 'lets-go-hype', title: 'Hype Train', category: 'Hype', label: 'HYPE!', bg1: [42, 12, 16], bg2: [90, 20, 24], accent: [229, 57, 53], style: 'bars' },
  { id: 'gif-fire', slug: 'pure-fire', title: 'Absolute Fire', category: 'Hype', label: 'FIRE', bg1: [48, 16, 8], bg2: [95, 34, 12], accent: [249, 115, 22], style: 'flash' },
  { id: 'gif-w', slug: 'big-w', title: 'Huge W', category: 'Gaming', label: 'BIG W', bg1: [16, 36, 26], bg2: [24, 62, 42], accent: [74, 222, 128], style: 'pulse' },
  { id: 'gif-lol', slug: 'lol-laughing', title: 'LOL', category: 'Funny', label: 'LOL', bg1: [44, 34, 10], bg2: [80, 58, 12], accent: [250, 204, 21], style: 'confetti' },
  { id: 'gif-lmao', slug: 'lmao-chaos', title: 'LMAO', category: 'Funny', label: 'LMAO', bg1: [48, 20, 44], bg2: [84, 28, 72], accent: [244, 114, 182], style: 'flash' },
  { id: 'gif-bruh', slug: 'bruh-moment', title: 'Bruh Moment', category: 'Funny', label: 'BRUH', bg1: [24, 26, 32], bg2: [45, 48, 60], accent: [148, 163, 184], style: 'bars' },
  { id: 'gif-ok', slug: 'ok-cool', title: 'OK Bet', category: 'Reactions', label: 'BET', bg1: [16, 30, 48], bg2: [24, 52, 84], accent: [56, 189, 248], style: 'pulse' },
  { id: 'gif-yes', slug: 'yes-sir', title: 'YES!', category: 'Reactions', label: 'YES!', bg1: [14, 40, 26], bg2: [20, 74, 46], accent: [34, 197, 94], style: 'confetti' },
  { id: 'gif-nope', slug: 'nope-out', title: 'NOPE', category: 'Reactions', label: 'NOPE', bg1: [52, 14, 18], bg2: [96, 18, 24], accent: [239, 68, 68], style: 'flash' },
  { id: 'gif-wow', slug: 'mind-blown', title: 'Mind Blown', category: 'Reactions', label: 'WHOA', bg1: [30, 18, 56], bg2: [60, 26, 104], accent: [192, 132, 252], style: 'pulse' },
  { id: 'gif-clap', slug: 'applause', title: 'Applause', category: 'Reactions', label: 'CLAP', bg1: [38, 26, 12], bg2: [72, 46, 18], accent: [251, 191, 36], style: 'confetti' },
  { id: 'gif-love', slug: 'heart-eyes', title: 'Sending Love', category: 'Love', label: 'LOVE', bg1: [54, 14, 30], bg2: [96, 20, 50], accent: [244, 63, 94], style: 'hearts' },
  { id: 'gif-ty', slug: 'thank-you', title: 'Thank You', category: 'Love', label: 'TY!', bg1: [44, 18, 42], bg2: [76, 28, 72], accent: [251, 113, 133], style: 'hearts' },
  { id: 'gif-clutch', slug: 'clutch-play', title: 'Clutch Play', category: 'Gaming', label: 'CLUTCH', bg1: [14, 24, 44], bg2: [24, 44, 86], accent: [96, 165, 250], style: 'flash' },
  { id: 'gif-afk', slug: 'brb-afk', title: 'BRB / AFK', category: 'Gaming', label: 'BRB', bg1: [26, 28, 36], bg2: [42, 46, 62], accent: [167, 139, 250], style: 'bars' },
  { id: 'gif-vibing', slug: 'vibing-beats', title: 'Vibing', category: 'Hype', label: 'VIBES', bg1: [22, 18, 46], bg2: [52, 24, 88], accent: [236, 72, 153], style: 'bars' },
  { id: 'gif-party', slug: 'party-time', title: 'Party Time', category: 'Hype', label: 'PARTY', bg1: [36, 18, 46], bg2: [68, 24, 84], accent: [250, 204, 21], style: 'confetti' },
  { id: 'gif-rip', slug: 'rip-chat', title: 'RIP', category: 'Funny', label: 'RIP', bg1: [22, 22, 28], bg2: [42, 22, 28], accent: [248, 113, 113], style: 'matrix' },
  { id: 'gif-hacker', slug: 'code-matrix', title: 'Hacker Mode', category: 'Gaming', label: 'CODE', bg1: [8, 24, 16], bg2: [14, 48, 28], accent: [52, 211, 153], style: 'matrix' },
  { id: 'gif-hug', slug: 'big-hug', title: 'Big Hug', category: 'Love', label: 'HUG', bg1: [52, 20, 34], bg2: [88, 32, 54], accent: [253, 164, 175], style: 'hearts' },
  { id: 'gif-peak', slug: 'peak-cinema', title: 'Absolute Peak', category: 'Hype', label: 'PEAK', bg1: [42, 14, 14], bg2: [78, 20, 20], accent: [250, 204, 21], style: 'pulse' },
];

const BITMAP_FONT_3X5: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '111', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  '!': ['010', '010', '010', '000', '010'],
  '?': ['110', '001', '010', '000', '010'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['110', '001', '010', '100', '111'],
  '3': ['110', '001', '010', '001', '110'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '110', '001', '110'],
  '6': ['011', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '110'],
  ' ': ['000', '000', '000', '000', '000'],
};

function encodeAnimatedGif89a(item: GifCatalogItem): Buffer {
  const width = 144;
  const height = 84;
  const frameCount = 8;
  const delayCs = 11;

  const palette: Array<[number, number, number]> = [
    item.bg1,
    item.bg2,
    item.accent,
    [255, 255, 255],
    [250, 204, 21],
    [56, 189, 248],
    [244, 63, 94],
    [74, 222, 128],
    [12, 13, 18],
    [34, 36, 44],
    [168, 85, 247],
    [249, 115, 22],
    [200, 208, 220],
    [90, 96, 110],
    [229, 57, 53],
    [0, 0, 0],
  ];

  const out: number[] = [];
  const pushBytes = (...bytes: number[]) => out.push(...bytes);
  const pushU16 = (val: number) => out.push(val & 0xff, (val >> 8) & 0xff);
  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  };

  // GIF89a Header
  pushStr('GIF89a');
  pushU16(width);
  pushU16(height);
  pushBytes(0xb3, 0x00, 0x00); // Global color table, 4-bit (16 colors)

  for (const [r, g, b] of palette) {
    pushBytes(r & 0xff, g & 0xff, b & 0xff);
  }

  // Netscape 2.0 loop forever extension
  pushBytes(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  pushBytes(0x03, 0x01, 0x00, 0x00, 0x00);

  const encodeLzw5 = (pixels: Uint8Array): number[] => {
    const minCodeSize = 4;
    const clearCode = 16;
    const eoiCode = 17;
    const bytes: number[] = [minCodeSize];
    const bitChunks: number[] = [];
    let bitAcc = 0;
    let bitLen = 0;

    const writeCode5 = (code: number) => {
      bitAcc |= (code & 0x1f) << bitLen;
      bitLen += 5;
      while (bitLen >= 8) {
        bitChunks.push(bitAcc & 0xff);
        bitAcc >>= 8;
        bitLen -= 8;
      }
    };

    writeCode5(clearCode);
    for (let i = 0; i < pixels.length; i++) {
      writeCode5(pixels[i] & 0x0f);
      if ((i + 1) % 12 === 0 && i + 1 < pixels.length) {
        writeCode5(clearCode);
      }
    }
    writeCode5(eoiCode);
    if (bitLen > 0) {
      bitChunks.push(bitAcc & 0xff);
    }

    for (let i = 0; i < bitChunks.length; i += 250) {
      const slice = bitChunks.slice(i, i + 250);
      bytes.push(slice.length, ...slice);
    }
    bytes.push(0x00);
    return bytes;
  };

  const label = item.label.toUpperCase().slice(0, 7);

  for (let f = 0; f < frameCount; f++) {
    const pixels = new Uint8Array(width * height);
    const phase = (f / frameCount) * Math.PI * 2;

    // Background gradient + animated wave stripes
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const diag = (x + y + f * 6) % 24 < 12;
        pixels[idx] = diag ? 0 : 1;
        if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
          pixels[idx] = 2;
        }
      }
    }

    const fillRect = (rx: number, ry: number, rw: number, rh: number, colorIdx: number) => {
      const x0 = Math.max(2, Math.floor(rx));
      const y0 = Math.max(2, Math.floor(ry));
      const x1 = Math.min(width - 2, Math.floor(rx + rw));
      const y1 = Math.min(height - 2, Math.floor(ry + rh));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          pixels[y * width + x] = colorIdx;
        }
      }
    };

    // Style-specific background motion
    if (item.style === 'bars') {
      for (let i = 0; i < 12; i++) {
        const h = 14 + Math.round(Math.abs(Math.sin(phase + i * 0.65)) * 46);
        fillRect(10 + i * 11, height - 6 - h, 7, h, i % 2 === 0 ? 2 : 4);
      }
    } else if (item.style === 'confetti') {
      for (let i = 0; i < 18; i++) {
        const cx = (12 + i * 19 + f * (i % 3 === 0 ? 7 : 4)) % (width - 12);
        const cy = (8 + i * 13 + f * 9) % (height - 12);
        fillRect(cx, cy, 4, 4, [2, 3, 4, 5, 6, 7][i % 6]);
      }
    } else if (item.style === 'hearts') {
      for (let i = 0; i < 7; i++) {
        const hx = 14 + i * 19;
        const hy = height - ((16 + i * 11 + f * 8) % (height - 14));
        const col = i % 2 === 0 ? 6 : 2;
        fillRect(hx - 3, hy, 2, 2, col);
        fillRect(hx + 1, hy, 2, 2, col);
        fillRect(hx - 4, hy + 2, 8, 2, col);
        fillRect(hx - 2, hy + 4, 4, 2, col);
        fillRect(hx - 1, hy + 6, 2, 1, col);
      }
    } else if (item.style === 'matrix') {
      for (let i = 0; i < 14; i++) {
        const mx = 8 + i * 10;
        const my = (i * 15 + f * 10) % (height - 18);
        fillRect(mx, my, 3, 14, i % 3 === 0 ? 3 : 7);
      }
    } else if (item.style === 'flash') {
      const ring = 4 + (f % 4) * 4;
      fillRect(ring, ring, width - ring * 2, 3, 4);
      fillRect(ring, height - ring - 3, width - ring * 2, 3, 2);
    } else {
      const pad = 6 + Math.round(Math.sin(phase) * 3);
      fillRect(pad, pad, width - pad * 2, 3, 2);
      fillRect(pad, height - pad - 3, width - pad * 2, 3, 5);
    }

    // Center badge & bouncing bitmap text
    const scale = label.length >= 6 ? 3 : 4;
    const charW = 3 * scale;
    const gap = scale;
    const textW = label.length * (charW + gap) - gap;
    const textH = 5 * scale;
    const bounceY = Math.round(Math.sin(phase) * 3);
    const startX = Math.floor((width - textW) / 2);
    const startY = Math.floor((height - textH) / 2) + bounceY;

    // Dark pill behind label for legibility
    fillRect(startX - 8, startY - 6, textW + 16, textH + 12, 8);
    fillRect(startX - 8, startY - 6, textW + 16, 2, 2);
    fillRect(startX - 8, startY + textH + 4, textW + 16, 2, 2);

    // Render label
    for (let ci = 0; ci < label.length; ci++) {
      const ch = label[ci];
      const glyph = BITMAP_FONT_3X5[ch] || BITMAP_FONT_3X5['!'];
      const gx = startX + ci * (charW + gap);
      for (let gy = 0; gy < 5; gy++) {
        for (let bx = 0; bx < 3; bx++) {
          if (glyph[gy][bx] === '1') {
            fillRect(gx + bx * scale + 1, startY + gy * scale + 1, scale, scale, 14);
            fillRect(gx + bx * scale, startY + gy * scale, scale, scale, 3);
          }
        }
      }
    }

    // Graphic Control Extension
    pushBytes(0x21, 0xf9, 0x04, 0x04);
    pushU16(delayCs);
    pushBytes(0x00, 0x00);

    // Image Descriptor
    pushBytes(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    pushBytes(0x00);

    out.push(...encodeLzw5(pixels));
  }

  pushBytes(0x3b);
  return Buffer.from(out);
}

const gifBufferCache = new Map<string, Buffer>();

interface KlipyMediaRendition {
  url?: string;
  width?: number;
  height?: number;
  size?: number;
}

interface KlipyGifItem {
  id?: string | number;
  uuid?: string;
  slug?: string;
  title?: string;
  tags?: string[];
  file?: {
    hd?: { gif?: KlipyMediaRendition; webp?: KlipyMediaRendition; png?: KlipyMediaRendition };
    md?: { gif?: KlipyMediaRendition; webp?: KlipyMediaRendition; png?: KlipyMediaRendition };
    sm?: { gif?: KlipyMediaRendition; webp?: KlipyMediaRendition; png?: KlipyMediaRendition };
    xs?: { gif?: KlipyMediaRendition; webp?: KlipyMediaRendition; png?: KlipyMediaRendition };
  };
}

interface FallbackStickerItem {
  id: string;
  slug: string;
  title: string;
  category: 'Reactions' | 'Cute' | 'Funny' | 'Hype' | 'Gaming' | 'Love';
  emoji: string;
  label: string;
  accent: string;
}

const STICKER_CATALOG: FallbackStickerItem[] = [
  { id: 'stk-wave', slug: 'wave-hi', title: 'Wave Hi', category: 'Cute', emoji: '👋', label: 'HI!', accent: '#38BDF8' },
  { id: 'stk-gg', slug: 'gg-star', title: 'GG Sticker', category: 'Gaming', emoji: '🏆', label: 'GG!', accent: '#23A55A' },
  { id: 'stk-fire', slug: 'hype-fire', title: 'Pure Fire', category: 'Hype', emoji: '🔥', label: 'FIRE', accent: '#F97316' },
  { id: 'stk-lol', slug: 'lol-laugh', title: 'LOL Sticker', category: 'Funny', emoji: '😂', label: 'LOL!', accent: '#FACC15' },
  { id: 'stk-heart', slug: 'big-love', title: 'Big Love', category: 'Love', emoji: '💖', label: 'LOVE', accent: '#EC4899' },
  { id: 'stk-cool', slug: 'too-cool', title: 'Too Cool', category: 'Reactions', emoji: '😎', label: 'COOL', accent: '#A855F7' },
  { id: 'stk-party', slug: 'party-confetti', title: 'Party Pop', category: 'Hype', emoji: '🎉', label: 'WOO!', accent: '#E53935' },
  { id: 'stk-pog', slug: 'mind-blown', title: 'Mind Blown', category: 'Reactions', emoji: '🤯', label: 'WHOA', accent: '#F43F5E' },
  { id: 'stk-cat', slug: 'cute-cat', title: 'Happy Cat', category: 'Cute', emoji: '🐱', label: 'MEOW', accent: '#FB7185' },
  { id: 'stk-clutch', slug: 'clutch-win', title: 'Clutch Win', category: 'Gaming', emoji: '🎮', label: 'WIN!', accent: '#60A5FA' },
  { id: 'stk-100', slug: 'one-hundred', title: '100 Percent', category: 'Reactions', emoji: '💯', label: '100!', accent: '#EF4444' },
  { id: 'stk-hug', slug: 'warm-hug', title: 'Warm Hug', category: 'Love', emoji: '🫂', label: 'HUGS', accent: '#F472B6' },
];

async function fetchKlipyGifs(query: string, category: string) {
  const klipyKey = (process.env.KLIPY_API_KEY || 'web').trim() || 'web';
  const searchTerm = query.trim() || (category && category !== 'Trending' ? category.trim() : '');
  const endpoint = searchTerm
    ? `https://api.klipy.com/api/v1/${encodeURIComponent(klipyKey)}/gifs/search?q=${encodeURIComponent(searchTerm)}&page=1&per_page=24`
    : `https://api.klipy.com/api/v1/${encodeURIComponent(klipyKey)}/gifs/trending?page=1&per_page=24`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Talkcob/1.0 (+https://klipy.com)',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Klipy responded with ${res.status}`);
    }
    const json = (await res.json()) as {
      result?: boolean;
      data?: { data?: KlipyGifItem[] };
    };
    const rawItems = Array.isArray(json?.data?.data) ? json.data.data : [];
    const mapped = rawItems
      .map((item, idx) => {
        const gifUrl =
          item.file?.md?.gif?.url ||
          item.file?.hd?.gif?.url ||
          item.file?.sm?.gif?.url ||
          item.file?.xs?.gif?.url ||
          '';
        const previewUrl =
          item.file?.sm?.gif?.url ||
          item.file?.sm?.webp?.url ||
          item.file?.md?.webp?.url ||
          gifUrl;
        if (!gifUrl) return null;
        return {
          id: String(item.uuid || item.id || item.slug || `klipy-${idx}`),
          title: (item.title || item.slug || 'KLIPY GIF').replace(/-/g, ' '),
          category: searchTerm || 'Trending',
          url: gifUrl,
          previewUrl,
          source: 'klipy',
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return mapped;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchKlipyStickers(query: string, category: string) {
  const klipyKey = (process.env.KLIPY_API_KEY || 'web').trim() || 'web';
  const searchTerm = query.trim() || (category && category !== 'Popular' ? category.trim() : '');
  const endpoint = searchTerm
    ? `https://api.klipy.com/api/v1/${encodeURIComponent(klipyKey)}/stickers/search?q=${encodeURIComponent(searchTerm)}&page=1&per_page=24`
    : `https://api.klipy.com/api/v1/${encodeURIComponent(klipyKey)}/stickers/trending?page=1&per_page=24`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Talkcob/1.0 (+https://klipy.com)',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Klipy stickers responded with ${res.status}`);
    }
    const json = (await res.json()) as {
      result?: boolean;
      data?: { data?: KlipyGifItem[] };
    };
    const rawItems = Array.isArray(json?.data?.data) ? json.data.data : [];
    return rawItems
      .map((item, idx) => {
        const stickerUrl =
          item.file?.md?.webp?.url ||
          item.file?.md?.gif?.url ||
          item.file?.md?.png?.url ||
          item.file?.hd?.webp?.url ||
          item.file?.hd?.png?.url ||
          item.file?.sm?.webp?.url ||
          item.file?.sm?.gif?.url ||
          '';
        const previewUrl =
          item.file?.sm?.webp?.url ||
          item.file?.sm?.gif?.url ||
          item.file?.sm?.png?.url ||
          stickerUrl;
        if (!stickerUrl) return null;
        return {
          id: String(item.uuid || item.id || item.slug || `klipy-stk-${idx}`),
          title: (item.title || item.slug || 'Popular Sticker').replace(/-/g, ' '),
          category: searchTerm || 'Popular',
          url: stickerUrl,
          previewUrl,
          source: 'klipy',
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.post(
    '/api/uploads',
    express.raw({ type: '*/*', limit: '500mb' }),
    (req: Request, res: Response) => {
      try {
        const body = req.body as Buffer | undefined;
        if (!body || !Buffer.isBuffer(body) || body.length === 0) {
          res.status(400).json({ error: 'Empty upload body.' });
          return;
        }
        const rawNameHeader = req.headers['x-file-name'];
        const rawName = Array.isArray(rawNameHeader) ? rawNameHeader[0] : rawNameHeader || 'media';
        const decodedName = decodeURIComponent(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
        const mimeHeader = req.headers['content-type'];
        const mimeType = Array.isArray(mimeHeader) ? mimeHeader[0] : mimeHeader || 'application/octet-stream';

        let ext = path.extname(decodedName).toLowerCase();
        if (!ext || ext.length > 8) {
          if (mimeType.includes('mp4')) ext = '.mp4';
          else if (mimeType.includes('webm')) ext = '.webm';
          else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = '.mov';
          else if (mimeType.includes('ogg')) ext = '.ogv';
          else if (mimeType.includes('png')) ext = '.png';
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
          else if (mimeType.includes('gif')) ext = '.gif';
          else if (mimeType.includes('webp')) ext = '.webp';
          else ext = '.bin';
        }
        const baseName = path.basename(decodedName, path.extname(decodedName)).slice(0, 48) || 'clip';
        const storedFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${baseName}${ext}`;
        const destPath = path.join(UPLOADS_DIR, storedFilename);
        fs.writeFileSync(destPath, body);

        res.json({
          url: `/uploads/${storedFilename}`,
          name: decodeURIComponent(rawName),
          mimeType,
          size: body.length,
        });
      } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to save uploaded media.' });
      }
    }
  );

  app.use(express.json({ limit: '15mb' }));

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const clientUserMap = new Map<WebSocket, string>();
  const wsClientIpMap = new Map<WebSocket, string>();

  const broadcast = (event: { type: string; payload: unknown }, exclude?: WebSocket) => {
    const serialized = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  };

  const sendToUser = (
    targetUserId: string,
    event: { type: string; payload: unknown },
    exclude?: WebSocket
  ) => {
    if (!targetUserId) return;
    const serialized = JSON.stringify(event);
    for (const [client, uid] of clientUserMap.entries()) {
      if (client !== exclude && uid === targetUserId && client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  };

  const forceDisconnectBannedTargets = (opts: {
    targetUserId?: string;
    ip?: string;
    reason: string;
  }) => {
    const payload = JSON.stringify({
      type: 'admin:forceLogout',
      payload: {
        userId: opts.targetUserId,
        ip: opts.ip,
        reason: opts.reason,
      },
    });
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      const mappedUserId = clientUserMap.get(client);
      const mappedIp = wsClientIpMap.get(client);
      const isOwner =
        mappedUserId === PLATFORM_OWNER_ID || Boolean(mappedUserId && store.users[mappedUserId]?.isPlatformOwner);
      if (isOwner) continue;
      if (
        (opts.targetUserId && mappedUserId === opts.targetUserId) ||
        (opts.ip && mappedIp === opts.ip)
      ) {
        client.send(payload);
        clientUserMap.delete(client);
      }
    }
  };

  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url && req.url.split('?')[0] === '/ws') {
      const clientIp = getClientIp(req);
      wss.handleUpgrade(req, socket, head, (ws) => {
        wsClientIpMap.set(ws, clientIp);
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'sync:state', payload: getPublicState() }));

    ws.on('close', () => {
      const closedUserId = clientUserMap.get(ws);
      clientUserMap.delete(ws);
      wsClientIpMap.delete(ws);

      if (closedUserId) {
        let stillConnected = false;
        for (const [client, uid] of clientUserMap.entries()) {
          if (uid === closedUserId && client.readyState === WebSocket.OPEN) {
            stillConnected = true;
            break;
          }
        }
        if (!stillConnected) {
          let changed = false;
          store.channels = store.channels.map((c) => {
            if (c.type === 'voice' && (c.voiceParticipantIds || []).includes(closedUserId)) {
              changed = true;
              return {
                ...c,
                voiceParticipantIds: (c.voiceParticipantIds || []).filter((id) => id !== closedUserId),
              };
            }
            return c;
          });
          if (changed) {
            scheduleSave();
            broadcast({ type: 'channels:sync', payload: { channels: store.channels } });
          }
        }
      }
    });

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type: string; payload?: Record<string, unknown> };
        const payload = parsed.payload || {};

        switch (parsed.type) {
          case 'client:identify': {
            const userId = typeof payload.userId === 'string' ? payload.userId : '';
            const wsIp = wsClientIpMap.get(ws) || '127.0.0.1';
            if (userId) {
              const block = checkAccessBlock(userId, wsIp);
              if (block.blocked) {
                ws.send(
                  JSON.stringify({
                    type: 'admin:forceLogout',
                    payload: { userId, reason: block.message },
                  })
                );
                break;
              }
              if (store.users[userId]) {
                clientUserMap.set(ws, userId);
                recordUserIp(userId, wsIp);
                if (store.users[userId].status === 'offline') {
                  store.users[userId] = { ...store.users[userId], status: 'online' };
                  scheduleSave();
                  broadcast({ type: 'user:upsert', payload: { user: store.users[userId] } });
                }
              }
            }
            break;
          }

          case 'message:send': {
            const incoming = Array.isArray(payload.messages) ? (payload.messages as Message[]) : [];
            const added: Message[] = [];
            for (const msg of incoming) {
              if (!msg || !msg.id || store.messages.some((m) => m.id === msg.id)) continue;
              if (store.users[msg.authorId]?.isBanned) continue;
              store.messages.push(msg);
              added.push(msg);
            }
            if (store.messages.length > 2500) {
              store.messages = store.messages.slice(-2500);
            }

            const botLogs = payload.botLogs as Record<string, CustomBotLogEntry[]> | undefined;
            if (botLogs && typeof botLogs === 'object') {
              store.bots = store.bots.map((b) => {
                const entries = botLogs[b.id];
                if (!entries || !Array.isArray(entries)) return b;
                return { ...b, logs: [...entries, ...(b.logs || [])].slice(0, 25) };
              });
            }

            if (added.length > 0 || botLogs) {
              scheduleSave();
              broadcast({
                type: 'message:created',
                payload: { messages: added, botLogs: botLogs || null },
              });
            }
            break;
          }

          case 'message:edit': {
            const messageId = payload.messageId as string;
            const content = payload.content as string;
            const idx = store.messages.findIndex((m) => m.id === messageId);
            if (idx !== -1 && typeof content === 'string') {
              store.messages[idx] = { ...store.messages[idx], content, edited: true };
              scheduleSave();
              broadcast({ type: 'message:updated', payload: { message: store.messages[idx] } });
            }
            break;
          }

          case 'message:delete': {
            const messageId = payload.messageId as string;
            const before = store.messages.length;
            store.messages = store.messages.filter((m) => m.id !== messageId);
            if (store.messages.length !== before) {
              scheduleSave();
              broadcast({ type: 'message:deleted', payload: { messageId } });
            }
            break;
          }

          case 'message:bulkDelete': {
            const messageIds = Array.isArray(payload.messageIds)
              ? (payload.messageIds as string[]).filter((id) => typeof id === 'string')
              : [];
            if (messageIds.length > 0) {
              const idSet = new Set(messageIds);
              const before = store.messages.length;
              store.messages = store.messages.filter((m) => !idSet.has(m.id));
              if (store.messages.length !== before) {
                scheduleSave();
                broadcast({ type: 'message:bulkDeleted', payload: { messageIds } });
              }
            }
            break;
          }

          case 'message:react': {
            const messageId = payload.messageId as string;
            const emoji = payload.emoji as string;
            const userId = payload.userId as string;
            const isSuper = Boolean(payload.isSuper);
            const idx = store.messages.findIndex((m) => m.id === messageId);
            if (idx !== -1 && emoji && userId) {
              const msg = store.messages[idx];
              const existing = msg.reactions.find((r) => r.emoji === emoji);
              let nextReactions: Reaction[];
              if (!existing) {
                nextReactions = [
                  ...msg.reactions,
                  {
                    emoji,
                    userIds: [userId],
                    ...(isSuper ? { superUserIds: [userId] } : {}),
                  },
                ];
              } else {
                const hasReacted = existing.userIds.includes(userId);
                const nextUserIds = hasReacted
                  ? existing.userIds.filter((id) => id !== userId)
                  : [...existing.userIds, userId];
                const prevSuper = existing.superUserIds || [];
                const nextSuperUserIds = hasReacted
                  ? prevSuper.filter((id) => id !== userId)
                  : isSuper
                  ? Array.from(new Set([...prevSuper, userId]))
                  : prevSuper;
                nextReactions =
                  nextUserIds.length === 0
                    ? msg.reactions.filter((r) => r.emoji !== emoji)
                    : msg.reactions.map((r) =>
                        r.emoji === emoji
                          ? {
                              ...r,
                              userIds: nextUserIds,
                              ...(nextSuperUserIds.length > 0
                                ? { superUserIds: nextSuperUserIds }
                                : { superUserIds: undefined }),
                            }
                          : r
                      );
              }
              store.messages[idx] = { ...msg, reactions: nextReactions };
              scheduleSave();
              broadcast({ type: 'message:updated', payload: { message: store.messages[idx] } });
            }
            break;
          }

          case 'message:pin': {
            const messageId = payload.messageId as string;
            const idx = store.messages.findIndex((m) => m.id === messageId);
            if (idx !== -1) {
              store.messages[idx] = { ...store.messages[idx], pinned: !store.messages[idx].pinned };
              scheduleSave();
              broadcast({ type: 'message:updated', payload: { message: store.messages[idx] } });
            }
            break;
          }

          case 'sticker:pin': {
            const feedId = payload.feedId as string;
            const sticker = payload.sticker as PinnedSticker | undefined;
            if (feedId && sticker && sticker.url) {
              const chIdx = store.channels.findIndex((c) => c.id === feedId);
              if (chIdx !== -1) {
                const current = store.channels[chIdx].pinnedStickers || [];
                const next = [sticker, ...current.filter((s) => s.url !== sticker.url)].slice(0, 24);
                store.channels[chIdx] = { ...store.channels[chIdx], pinnedStickers: next };
                scheduleSave();
                broadcast({
                  type: 'sticker:updated',
                  payload: { feedId, pinnedStickers: next },
                });
              } else {
                const current = store.dmPinnedStickers[feedId] || [];
                const next = [sticker, ...current.filter((s) => s.url !== sticker.url)].slice(0, 24);
                store.dmPinnedStickers[feedId] = next;
                scheduleSave();
                broadcast({
                  type: 'sticker:updated',
                  payload: { feedId, pinnedStickers: next },
                });
              }
            }
            break;
          }

          case 'sticker:unpin': {
            const feedId = payload.feedId as string;
            const stickerUrlOrId = payload.stickerUrlOrId as string;
            if (feedId && stickerUrlOrId) {
              const chIdx = store.channels.findIndex((c) => c.id === feedId);
              if (chIdx !== -1) {
                const next = (store.channels[chIdx].pinnedStickers || []).filter(
                  (s) => s.url !== stickerUrlOrId && s.id !== stickerUrlOrId
                );
                store.channels[chIdx] = { ...store.channels[chIdx], pinnedStickers: next };
                scheduleSave();
                broadcast({
                  type: 'sticker:updated',
                  payload: { feedId, pinnedStickers: next },
                });
              } else {
                const next = (store.dmPinnedStickers[feedId] || []).filter(
                  (s) => s.url !== stickerUrlOrId && s.id !== stickerUrlOrId
                );
                store.dmPinnedStickers[feedId] = next;
                scheduleSave();
                broadcast({
                  type: 'sticker:updated',
                  payload: { feedId, pinnedStickers: next },
                });
              }
            }
            break;
          }

          case 'server:toggleBoost': {
            const serverId = payload.serverId as string;
            const userId = payload.userId as string;
            const idx = store.servers.findIndex((s) => s.id === serverId);
            if (idx !== -1 && userId) {
              const current = store.servers[idx].boostUserIds || [];
              const nextBoosts = current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId];
              store.servers[idx] = { ...store.servers[idx], boostUserIds: nextBoosts };
              scheduleSave();
              broadcast({ type: 'server:upsert', payload: { server: store.servers[idx] } });
            }
            break;
          }

          case 'voice:soundboard': {
            const fromUserId =
              clientUserMap.get(ws) ||
              (typeof payload.fromUserId === 'string' ? payload.fromUserId : '');
            const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
            const clipId = typeof payload.clipId === 'string' ? payload.clipId : '';
            if (fromUserId && roomId && clipId) {
              broadcast(
                {
                  type: 'voice:soundboardPlayed',
                  payload: { fromUserId, roomId, clipId },
                },
                ws
              );
            }
            break;
          }

          case 'user:update': {
            const userId = payload.userId as string;
            const updates = (payload.updates || {}) as Partial<User>;
            if (userId && store.users[userId]) {
              const nextUser: User = {
                ...store.users[userId],
                ...updates,
                id: userId,
              };
              store.users[userId] = nextUser;
              scheduleSave();
              broadcast({ type: 'user:upsert', payload: { user: nextUser } });
            }
            break;
          }

          case 'server:create': {
            const server = payload.server as Server | undefined;
            const newChannels = Array.isArray(payload.channels) ? (payload.channels as Channel[]) : [];
            if (server && server.id && !store.servers.some((s) => s.id === server.id)) {
              const normalized: Server = {
                ...server,
                memberIds: Array.from(new Set([...(server.memberIds || []), ...Object.keys(store.users)])),
              };
              store.servers.push(normalized);
              for (const ch of newChannels) {
                if (ch && ch.id && !store.channels.some((c) => c.id === ch.id)) {
                  store.channels.push(ch);
                }
              }
              scheduleSave();
              broadcast({ type: 'server:created', payload: { server: normalized, channels: newChannels } });
            }
            break;
          }

          case 'server:update': {
            const serverId = payload.serverId as string;
            const updates = (payload.updates || {}) as Partial<Server>;
            const idx = store.servers.findIndex((s) => s.id === serverId);
            if (idx !== -1) {
              store.servers[idx] = { ...store.servers[idx], ...updates, id: serverId };
              scheduleSave();
              broadcast({ type: 'server:upsert', payload: { server: store.servers[idx] } });
            }
            break;
          }

          case 'server:delete': {
            const serverId = payload.serverId as string;
            if (serverId && serverId !== HOME_SERVER_ID) {
              store.servers = store.servers.filter((s) => s.id !== serverId);
              store.channels = store.channels.filter((c) => c.serverId !== serverId);
              scheduleSave();
              broadcast({ type: 'server:deleted', payload: { serverId } });
            }
            break;
          }

          case 'channel:create': {
            const channel = payload.channel as Channel | undefined;
            if (channel && channel.id && !store.channels.some((c) => c.id === channel.id)) {
              store.channels.push(channel);
              scheduleSave();
              broadcast({ type: 'channel:upsert', payload: { channel } });
            }
            break;
          }

          case 'channel:update': {
            const channelId = payload.channelId as string;
            const updates = (payload.updates || {}) as Partial<Channel>;
            const idx = store.channels.findIndex((c) => c.id === channelId);
            if (idx !== -1) {
              store.channels[idx] = { ...store.channels[idx], ...updates, id: channelId };
              scheduleSave();
              broadcast({ type: 'channel:upsert', payload: { channel: store.channels[idx] } });
            }
            break;
          }

          case 'channel:delete': {
            const channelId = payload.channelId as string;
            const before = store.channels.length;
            store.channels = store.channels.filter((c) => c.id !== channelId);
            if (store.channels.length !== before) {
              scheduleSave();
              broadcast({ type: 'channel:deleted', payload: { channelId } });
            }
            break;
          }

          case 'voice:join': {
            const channelId = payload.channelId as string;
            const userId = payload.userId as string;
            if (channelId && userId) {
              store.channels = store.channels.map((c) => {
                if (c.type !== 'voice') return c;
                const filtered = (c.voiceParticipantIds || []).filter((id) => id !== userId);
                if (c.id === channelId) {
                  return { ...c, voiceParticipantIds: [...filtered, userId] };
                }
                return { ...c, voiceParticipantIds: filtered };
              });
              scheduleSave();
              broadcast({ type: 'channels:sync', payload: { channels: store.channels } });
            }
            break;
          }

          case 'voice:leave': {
            const userId = payload.userId as string;
            if (userId) {
              store.channels = store.channels.map((c) =>
                c.type === 'voice'
                  ? {
                      ...c,
                      voiceParticipantIds: (c.voiceParticipantIds || []).filter((id) => id !== userId),
                    }
                  : c
              );
              scheduleSave();
              broadcast({ type: 'channels:sync', payload: { channels: store.channels } });
            }
            break;
          }

          case 'bot:create': {
            const bot = payload.bot as CustomBot | undefined;
            if (bot && bot.id && !store.bots.some((b) => b.id === bot.id)) {
              store.bots = [bot, ...store.bots];
              scheduleSave();
              broadcast({ type: 'bot:upsert', payload: { bot } });
            }
            break;
          }

          case 'bot:update': {
            const botId = payload.botId as string;
            const updates = (payload.updates || {}) as Partial<CustomBot>;
            const idx = store.bots.findIndex((b) => b.id === botId);
            if (idx !== -1) {
              store.bots[idx] = { ...store.bots[idx], ...updates, id: botId };
              scheduleSave();
              broadcast({ type: 'bot:upsert', payload: { bot: store.bots[idx] } });
            }
            break;
          }

          case 'bot:delete': {
            const botId = payload.botId as string;
            const before = store.bots.length;
            store.bots = store.bots.filter((b) => b.id !== botId);
            if (store.bots.length !== before) {
              scheduleSave();
              broadcast({ type: 'bot:deleted', payload: { botId } });
            }
            break;
          }

          case 'typing:start': {
            broadcast(
              {
                type: 'typing:update',
                payload: {
                  channelId: payload.channelId,
                  userId: payload.userId,
                  userName: payload.userName,
                },
              },
              ws
            );
            break;
          }

          case 'rtc:offer':
          case 'rtc:answer':
          case 'rtc:ice':
          case 'rtc:mediaMeta': {
            const fromUserId =
              clientUserMap.get(ws) ||
              (typeof payload.fromUserId === 'string' ? payload.fromUserId : '');
            const toUserId = typeof payload.toUserId === 'string' ? payload.toUserId : '';
            if (fromUserId && toUserId) {
              sendToUser(
                toUserId,
                {
                  type: parsed.type,
                  payload: {
                    ...payload,
                    fromUserId,
                  },
                },
                ws
              );
            }
            break;
          }

          case 'rtc:speaking': {
            const fromUserId =
              clientUserMap.get(ws) ||
              (typeof payload.fromUserId === 'string' ? payload.fromUserId : '');
            if (fromUserId) {
              broadcast(
                {
                  type: 'rtc:speakingUpdate',
                  payload: {
                    fromUserId,
                    roomId: payload.roomId,
                    speaking: Boolean(payload.speaking),
                  },
                },
                ws
              );
            }
            break;
          }

          case 'dmcall:invite':
          case 'dmcall:accept':
          case 'dmcall:decline':
          case 'dmcall:end': {
            const fromUserId =
              clientUserMap.get(ws) ||
              (typeof payload.fromUserId === 'string' ? payload.fromUserId : '');
            const toUserId = typeof payload.toUserId === 'string' ? payload.toUserId : '';
            if (fromUserId && toUserId) {
              const relayType =
                parsed.type === 'dmcall:invite'
                  ? 'dmcall:incoming'
                  : parsed.type === 'dmcall:accept'
                  ? 'dmcall:accepted'
                  : parsed.type === 'dmcall:decline'
                  ? 'dmcall:declined'
                  : 'dmcall:ended';
              sendToUser(
                toUserId,
                {
                  type: relayType,
                  payload: {
                    ...payload,
                    fromUserId,
                  },
                },
                ws
              );
            }
            break;
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });
  });

  // REST API endpoints
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/state', (_req: Request, res: Response) => {
    res.json(getPublicState());
  });

  // GIF Search via Klipy (https://klipy.com/) with offline fallback
  app.get('/api/gifs/search', async (req: Request, res: Response) => {
    const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
    const cat = (typeof req.query.category === 'string' ? req.query.category : '').trim();

    try {
      const klipyGifs = await fetchKlipyGifs(q, cat);
      if (klipyGifs.length > 0) {
        res.json({
          ok: true,
          source: 'klipy',
          gifs: klipyGifs,
        });
        return;
      }
    } catch (err) {
      console.warn('Klipy GIF search fallback triggered:', err instanceof Error ? err.message : err);
    }

    const qLower = q.toLowerCase();
    let matches = GIF_CATALOG.filter((item) => {
      if (cat && cat !== 'Trending' && item.category !== cat) return false;
      if (!qLower) return true;
      return (
        item.title.toLowerCase().includes(qLower) ||
        item.label.toLowerCase().includes(qLower) ||
        item.category.toLowerCase().includes(qLower) ||
        item.slug.includes(qLower)
      );
    });

    if (qLower && matches.length === 0) {
      const safeLabel = qLower.replace(/[^a-zA-Z0-9!? ]/g, '').toUpperCase().slice(0, 7) || 'GIF!';
      const customSlug = `custom-${encodeURIComponent(safeLabel)}`;
      matches = [
        {
          id: `gif-custom-${safeLabel}`,
          slug: customSlug,
          title: `${safeLabel} Reaction`,
          category: 'Reactions',
          label: safeLabel,
          bg1: [24, 16, 36],
          bg2: [52, 22, 68],
          accent: [229, 57, 53],
          style: 'confetti',
        },
        ...GIF_CATALOG.slice(0, 7),
      ];
    }

    res.json({
      ok: true,
      source: 'fallback',
      gifs: matches.map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        url: `/api/gifs/render/${g.slug}.gif`,
        previewUrl: `/api/gifs/render/${g.slug}.gif`,
      })),
    });
  });

  app.get('/api/gifs/render/:slug.gif', (req: Request, res: Response) => {
    const rawSlug = String(req.params.slug || '');
    let item = GIF_CATALOG.find((g) => g.slug === rawSlug);
    if (!item && rawSlug.startsWith('custom-')) {
      const label = decodeURIComponent(rawSlug.slice(7)).replace(/[^a-zA-Z0-9!? ]/g, '').toUpperCase().slice(0, 7) || 'GIF!';
      item = {
        id: `gif-custom-${label}`,
        slug: rawSlug,
        title: label,
        category: 'Reactions',
        label,
        bg1: [24, 16, 36],
        bg2: [52, 22, 68],
        accent: [229, 57, 53],
        style: 'confetti',
      };
    }
    if (!item) {
      res.status(404).end();
      return;
    }
    let buf = gifBufferCache.get(item.slug);
    if (!buf) {
      buf = encodeAnimatedGif89a(item);
      gifBufferCache.set(item.slug, buf);
    }
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  });

  // Sticker Search via Klipy (https://klipy.com/) with SVG badge fallback
  app.get('/api/stickers/search', async (req: Request, res: Response) => {
    const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
    const cat = (typeof req.query.category === 'string' ? req.query.category : '').trim();

    try {
      const klipyStickers = await fetchKlipyStickers(q, cat);
      if (klipyStickers.length > 0) {
        res.json({
          ok: true,
          source: 'klipy',
          stickers: klipyStickers,
        });
        return;
      }
    } catch (err) {
      console.warn('Klipy sticker search fallback triggered:', err instanceof Error ? err.message : err);
    }

    const qLower = q.toLowerCase();
    const matches = STICKER_CATALOG.filter((item) => {
      if (cat && cat !== 'Popular' && item.category !== cat) return false;
      if (!qLower) return true;
      return (
        item.title.toLowerCase().includes(qLower) ||
        item.label.toLowerCase().includes(qLower) ||
        item.category.toLowerCase().includes(qLower)
      );
    });

    res.json({
      ok: true,
      source: 'fallback',
      stickers: (matches.length > 0 ? matches : STICKER_CATALOG).map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        url: `/api/stickers/render/${s.slug}.svg`,
        previewUrl: `/api/stickers/render/${s.slug}.svg`,
      })),
    });
  });

  app.get('/api/stickers/render/:slug.svg', (req: Request, res: Response) => {
    const rawSlug = String(req.params.slug || '');
    const item = STICKER_CATALOG.find((s) => s.slug === rawSlug) || STICKER_CATALOG[0];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${item.accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#18191D" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="140" height="140" rx="34" fill="url(#g)" stroke="#ffffff" stroke-width="5"/>
  <text x="80" y="88" font-size="62" text-anchor="middle" dominant-baseline="middle">${item.emoji}</text>
  <rect x="34" y="114" width="92" height="24" rx="12" fill="#111214" stroke="#ffffff" stroke-width="2"/>
  <text x="80" y="130" font-family="system-ui,sans-serif" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle">${item.label}</text>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  });

  // Server-side Talkcob AI Help Assistant (Gemini API)
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { messages: chatHistory } = req.body as {
        messages?: Array<{ role: 'user' | 'assistant' | 'model'; text: string }>;
      };
      if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
        res.status(400).json({ error: 'Please send a question for Talkcob AI.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server yet.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const contents = chatHistory.slice(-12).map((m) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.text || '').slice(0, 4000) }],
      }));

      const systemInstruction = `You are Talkcob AI, the built-in interactive help assistant inside Talkcob (a free community chat, voice, video, and bot platform).
Help users quickly and clearly learn how to use every Talkcob feature:
- Deleting Messages: Hover any message you own (or any message if you have Manage Messages permission) and click the Trash icon to confirm deletion (hold Shift + Trash to skip confirmation). Click "Select" in the top header to enter Bulk Delete mode, check multiple messages, or click "Select All" + "Delete Selected".
- Camera & Screen Share in VC and Calls: Join any Voice Channel or start a DM Call, click the Camera (Video) button to turn your webcam on/off, Enable Mic for two-way live WebRTC audio, and click Share Screen (with Inline, Theater, or Floating Talkcob Overlays).
- GIFs & Popular Stickers in Chat: Click the red "GIF" button for KLIPY GIFs or the "Sticker" button for popular KLIPY stickers. Users can pin favorite stickers directly to any channel or DM message area!
- Talkcob Nitro (Every Feature 100% Free Forever): Open User Settings -> "Talkcob Nitro (FREE)" tab for animated avatar decorations, profile banner effects, glowing gradient nameplates, custom banners, 4,000-character messages, 500 MB uploads, 1080p 60fps & Source video/screen streaming, free Server Boosts, Voice Soundboard, custom Voice Entrance Sounds, Super Reactions, and per-server nicknames.
- Channel Permissions & Server Roles: Click the Gear icon on a server channel or open Server Settings -> Roles / Channel Permissions to configure 23 granular Discord-style permissions (view channel, send messages, slowmode, NSFW, user limit, bitrate, stream video, manage messages, etc.).
- Bot Studio: Click the Bot icon on the left server rail to create custom bots with prefixes, auto-reactions, auto-replies on @mention, word moderation, and custom trigger commands, then toggle which servers each bot is active in.
- Friends & Social Links: Click the Talkcob home icon -> Friends to send/accept friend requests; go to User Settings -> My Profile to add named social links (YouTube, Twitch, GitHub, etc.) and upload/crop custom PFPs.
- Admin Panel (Owner/Admins): Available via the Shield icon on the left rail for the platform owner and added admins to ban accounts, issue IP bans (which delete all non-owner accounts tied to that IP and block new account creation), delete servers, add people to servers, and manage platform admins.
Keep answers concise, practical, step-by-step, and friendly.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'Talkcob AI returned an empty response.' });
        return;
      }

      res.json({ ok: true, reply: replyText });
    } catch (err) {
      console.error('Talkcob AI error:', err);
      const message =
        err instanceof Error ? err.message : 'Talkcob AI could not answer right now.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/messages', (req: Request, res: Response) => {
    const incoming = Array.isArray(req.body?.messages) ? (req.body.messages as Message[]) : [];
    const added: Message[] = [];
    for (const msg of incoming) {
      if (!msg || !msg.id || store.messages.some((m) => m.id === msg.id)) continue;
      if (store.users[msg.authorId]?.isBanned) continue;
      store.messages.push(msg);
      added.push(msg);
    }
    if (store.messages.length > 2500) {
      store.messages = store.messages.slice(-2500);
    }

    const botLogs = req.body?.botLogs as Record<string, CustomBotLogEntry[]> | undefined;
    if (botLogs && typeof botLogs === 'object') {
      store.bots = store.bots.map((b) => {
        const entries = botLogs[b.id];
        if (!entries || !Array.isArray(entries)) return b;
        return { ...b, logs: [...entries, ...(b.logs || [])].slice(0, 25) };
      });
    }

    if (added.length > 0 || botLogs) {
      scheduleSave();
      broadcast({
        type: 'message:created',
        payload: { messages: added, botLogs: botLogs || null },
      });
    }
    res.json({ ok: true, messages: added });
  });

  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const ipBlock = checkAccessBlock(undefined, clientIp);
    if (ipBlock.blocked) {
      res.status(403).json({ error: ipBlock.message, banned: true });
      return;
    }

    const { displayName, username, password, bio, avatar, accentColor } = req.body as {
      displayName?: string;
      username?: string;
      password?: string;
      bio?: string;
      avatar?: string;
      accentColor?: string;
    };

    const cleanName = (displayName || '').trim();
    const cleanHandle = (username || '').toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!cleanName || cleanHandle.length < 2) {
      res.status(400).json({ error: 'Display name and valid username (min 2 chars) are required.' });
      return;
    }
    if (!password || password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' });
      return;
    }

    const taken = Object.values(store.users).some(
      (u) => u.username.toLowerCase() === cleanHandle || u.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (taken) {
      res.status(409).json({ error: `Username "@${cleanHandle}" is already taken.` });
      return;
    }

    const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const joinedAt = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const newUser: User = {
      id: newUserId,
      name: cleanName,
      username: cleanHandle,
      avatar: avatar || undefined,
      accentColor: accentColor || '#E53935',
      bannerColor: accentColor || '#E53935',
      status: 'online',
      customStatus: 'Hanging out on Talkcob',
      bio: (bio || '').trim() || 'New member on Talkcob!',
      socialLinks: [],
      role: 'Member',
      joinedAt,
    };

    store.users[newUserId] = newUser;
    store.passwordsByUserId[newUserId] = password;
    recordUserIp(newUserId, clientIp);

    store.servers = store.servers.map((srv) => {
      const nextMembers = srv.memberIds.includes(newUserId)
        ? srv.memberIds
        : [...srv.memberIds, newUserId];
      if (srv.id === HOME_SERVER_ID) {
        const existingRoles = srv.memberRoles?.[newUserId] || [];
        return {
          ...srv,
          memberIds: nextMembers,
          memberRoles: {
            ...srv.memberRoles,
            [newUserId]: existingRoles.length > 0 ? existingRoles : ['role-member'],
          },
        };
      }
      return { ...srv, memberIds: nextMembers };
    });

    flushSave();
    broadcast({ type: 'user:upsert', payload: { user: newUser } });
    for (const srv of store.servers) {
      broadcast({ type: 'server:upsert', payload: { server: srv } });
    }

    res.json({ user: newUser, state: getPublicState() });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const { username, password } = req.body as { username?: string; password?: string };
    const clean = (username || '').trim().replace(/^@/, '').toLowerCase();
    const matched = Object.values(store.users).find(
      (u) => !u.isBot && (u.username.toLowerCase() === clean || u.name.toLowerCase() === clean)
    );
    if (!matched) {
      const ipBlock = checkAccessBlock(undefined, clientIp);
      if (ipBlock.blocked) {
        res.status(403).json({ error: ipBlock.message, banned: true });
        return;
      }
      res.status(404).json({ error: `No Talkcob account found for "@${clean}".` });
      return;
    }

    const storedPassword = store.passwordsByUserId[matched.id];
    if (storedPassword !== undefined && storedPassword !== password) {
      res.status(401).json({ error: 'Incorrect password. Please try again.' });
      return;
    }

    const block = checkAccessBlock(matched.id, clientIp);
    if (block.blocked) {
      res.status(403).json({ error: block.message, banned: true });
      return;
    }

    recordUserIp(matched.id, clientIp);

    if (matched.status === 'offline') {
      store.users[matched.id] = { ...matched, status: 'online' };
      scheduleSave();
      broadcast({ type: 'user:upsert', payload: { user: store.users[matched.id] } });
    }

    res.json({ user: store.users[matched.id], state: getPublicState() });
  });

  app.post('/api/auth/session', (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const { userId } = req.body as { userId?: string };
    const block = checkAccessBlock(userId, clientIp);
    if (block.blocked) {
      res.status(403).json({ error: block.message, banned: true });
      return;
    }
    if (!userId || !store.users[userId]) {
      res.status(404).json({ error: 'Account session not found.' });
      return;
    }
    recordUserIp(userId, clientIp);
    if (store.users[userId].status === 'offline') {
      store.users[userId] = { ...store.users[userId], status: 'online' };
      scheduleSave();
      broadcast({ type: 'user:upsert', payload: { user: store.users[userId] } });
    }
    res.json({ user: store.users[userId], state: getPublicState() });
  });

  app.post('/api/auth/change-password', (req: Request, res: Response) => {
    const { userId, currentPassword, newPassword } = req.body as {
      userId?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    if (!userId || !store.users[userId]) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const existing = store.passwordsByUserId[userId];
    if (existing !== undefined && existing !== currentPassword) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters.' });
      return;
    }
    store.passwordsByUserId[userId] = newPassword;
    flushSave();
    res.json({ ok: true });
  });

  app.post('/api/friends/request', (req: Request, res: Response) => {
    const { fromUserId, toUsernameOrId } = req.body as {
      fromUserId?: string;
      toUsernameOrId?: string;
    };
    const fromUser = fromUserId ? store.users[fromUserId] : undefined;
    if (!fromUser) {
      res.status(400).json({ ok: false, message: 'Invalid sender account.' });
      return;
    }

    const clean = (toUsernameOrId || '').trim().replace(/^@/, '');
    if (!clean) {
      res.json({ ok: false, message: 'Enter a username first.' });
      return;
    }
    const lower = clean.toLowerCase();

    if (
      lower === fromUser.username.toLowerCase() ||
      lower === fromUser.name.toLowerCase() ||
      clean === fromUser.id
    ) {
      res.json({ ok: false, message: 'You cannot send a friend request to yourself.' });
      return;
    }

    const target = Object.values(store.users).find(
      (u) =>
        !u.isBot &&
        (u.id === clean ||
          u.username.toLowerCase() === lower ||
          u.name.toLowerCase() === lower)
    );

    if (!target) {
      res.json({
        ok: false,
        message: `No Talkcob user found for "@${clean}". They need an account first before receiving your friend request.`,
      });
      return;
    }

    const alreadyFriends = store.friendships.some(
      ([a, b]) => (a === fromUser.id && b === target.id) || (a === target.id && b === fromUser.id)
    );
    if (alreadyFriends) {
      res.json({ ok: false, message: `You are already friends with @${target.username}.` });
      return;
    }

    const existingIncoming = store.friendRequests.find(
      (r) => r.fromUserId === target.id && r.toUserId === fromUser.id
    );
    if (existingIncoming) {
      res.json({
        ok: false,
        message: `@${target.username} already sent you a friend request! Open your Pending tab to accept it.`,
      });
      return;
    }

    const existingOutgoing = store.friendRequests.find(
      (r) => r.fromUserId === fromUser.id && r.toUserId === target.id
    );
    if (existingOutgoing) {
      res.json({
        ok: false,
        message: `Friend request to @${target.username} is already pending their acceptance.`,
      });
      return;
    }

    const newReq: FriendRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromUserId: fromUser.id,
      toUserId: target.id,
      createdAt: 'Just now',
    };
    store.friendRequests.push(newReq);
    flushSave();

    broadcast({ type: 'friendRequest:created', payload: { request: newReq } });
    res.json({
      ok: true,
      message: `Friend request sent to @${target.username}! They will see it in their Pending requests and can accept it.`,
      request: newReq,
    });
  });

  app.post('/api/friends/accept', (req: Request, res: Response) => {
    const { requestId, userId } = req.body as { requestId?: string; userId?: string };
    const found = store.friendRequests.find((r) => r.id === requestId);
    if (!found) {
      res.status(404).json({ ok: false, message: 'Friend request not found.' });
      return;
    }
    if (userId && found.toUserId !== userId) {
      res.status(403).json({ ok: false, message: 'Only the recipient can accept this friend request.' });
      return;
    }

    store.friendRequests = store.friendRequests.filter((r) => r.id !== requestId);
    const already = store.friendships.some(
      ([a, b]) =>
        (a === found.fromUserId && b === found.toUserId) ||
        (a === found.toUserId && b === found.fromUserId)
    );
    if (!already) {
      store.friendships.push([found.fromUserId, found.toUserId]);
    }
    flushSave();

    broadcast({
      type: 'friendRequest:accepted',
      payload: {
        requestId: found.id,
        fromUserId: found.fromUserId,
        toUserId: found.toUserId,
      },
    });
    res.json({ ok: true });
  });

  app.post('/api/friends/decline', (req: Request, res: Response) => {
    const { requestId } = req.body as { requestId?: string };
    const before = store.friendRequests.length;
    store.friendRequests = store.friendRequests.filter((r) => r.id !== requestId);
    if (store.friendRequests.length !== before) {
      flushSave();
      broadcast({ type: 'friendRequest:removed', payload: { requestId } });
    }
    res.json({ ok: true });
  });

  app.post('/api/friends/remove', (req: Request, res: Response) => {
    const { userId, friendId } = req.body as { userId?: string; friendId?: string };
    if (!userId || !friendId) {
      res.status(400).json({ ok: false });
      return;
    }
    store.friendships = store.friendships.filter(
      ([a, b]) => !((a === userId && b === friendId) || (b === userId && a === friendId))
    );
    flushSave();
    broadcast({ type: 'friendship:removed', payload: { userId, friendId } });
    res.json({ ok: true });
  });

  // Platform Owner / Admin Panel endpoints
  app.get('/api/admin/overview', (req: Request, res: Response) => {
    const actorUserId = typeof req.query.actorUserId === 'string' ? req.query.actorUserId : '';
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    res.json({
      ok: true,
      bannedAccounts: store.bannedAccounts,
      bannedIps: store.bannedIps,
      userIpsByUserId: store.userIpsByUserId,
    });
  });

  app.post('/api/admin/ban-user', (req: Request, res: Response) => {
    const { actorUserId, targetUserId, reason, alsoIpBan } = req.body as {
      actorUserId?: string;
      targetUserId?: string;
      reason?: string;
      alsoIpBan?: boolean;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    const actor = store.users[actorUserId!];
    const target = targetUserId ? store.users[targetUserId] : undefined;
    if (!target || target.isBot) {
      res.status(404).json({ ok: false, error: 'User not found.' });
      return;
    }
    if (target.id === PLATFORM_OWNER_ID || target.isPlatformOwner) {
      res.status(403).json({ ok: false, error: 'The Talkcob Owner account cannot be banned.' });
      return;
    }

    const cleanReason = (reason || '').trim() || 'Banned by Talkcob administration.';
    const bannedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    store.users[target.id] = {
      ...target,
      isBanned: true,
      isPlatformAdmin: false,
      banReason: cleanReason,
      status: 'offline',
    };

    store.bannedAccounts = [
      {
        userId: target.id,
        username: target.username,
        name: target.name,
        reason: cleanReason,
        bannedAt,
        bannedBy: actor.name,
      },
      ...store.bannedAccounts.filter((b) => b.userId !== target.id),
    ];

    // Remove banned user from voice channels
    store.channels = store.channels.map((c) =>
      c.type === 'voice'
        ? {
            ...c,
            voiceParticipantIds: (c.voiceParticipantIds || []).filter((id) => id !== target.id),
          }
        : c
    );

    const targetIps = store.userIpsByUserId[target.id] || [];
    const primaryIp = targetIps[0];
    if (alsoIpBan && primaryIp) {
      const { purgedUserIds, deletedUsernames } = purgeAccountsForBannedIps([primaryIp], target.id);
      const existsIp = store.bannedIps.some((b) => b.ip === primaryIp);
      if (!existsIp) {
        store.bannedIps = [
          {
            id: `ipban-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ip: primaryIp,
            targetUserId: target.id,
            targetUsername: target.username,
            deletedUsernames,
            reason: cleanReason,
            bannedAt,
            bannedBy: actor.name,
          },
          ...store.bannedIps,
        ];
      }
      flushSave();
      broadcast({ type: 'sync:state', payload: getPublicState() });
      broadcast({ type: 'admin:bansUpdated', payload: {} });
      for (const uid of purgedUserIds) {
        forceDisconnectBannedTargets({ targetUserId: uid, ip: primaryIp, reason: cleanReason });
      }
      forceDisconnectBannedTargets({ targetUserId: target.id, ip: primaryIp, reason: cleanReason });
      res.json({
        ok: true,
        deletedUsernames,
        bannedAccounts: store.bannedAccounts,
        bannedIps: store.bannedIps,
        userIpsByUserId: store.userIpsByUserId,
      });
      return;
    }

    flushSave();
    broadcast({ type: 'user:upsert', payload: { user: store.users[target.id] } });
    broadcast({ type: 'channels:sync', payload: { channels: store.channels } });
    broadcast({ type: 'admin:bansUpdated', payload: {} });
    forceDisconnectBannedTargets({
      targetUserId: target.id,
      reason: cleanReason,
    });

    res.json({
      ok: true,
      bannedAccounts: store.bannedAccounts,
      bannedIps: store.bannedIps,
      userIpsByUserId: store.userIpsByUserId,
    });
  });

  app.post('/api/admin/unban-user', (req: Request, res: Response) => {
    const { actorUserId, targetUserId } = req.body as {
      actorUserId?: string;
      targetUserId?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    const target = targetUserId ? store.users[targetUserId] : undefined;
    if (target) {
      store.users[target.id] = {
        ...target,
        isBanned: false,
        banReason: undefined,
      };
      broadcast({ type: 'user:upsert', payload: { user: store.users[target.id] } });
    }
    store.bannedAccounts = store.bannedAccounts.filter((b) => b.userId !== targetUserId);
    flushSave();
    broadcast({ type: 'admin:bansUpdated', payload: {} });
    res.json({
      ok: true,
      bannedAccounts: store.bannedAccounts,
      bannedIps: store.bannedIps,
      userIpsByUserId: store.userIpsByUserId,
    });
  });

  app.post('/api/admin/ban-ip', (req: Request, res: Response) => {
    const { actorUserId, ip, targetUserId, reason } = req.body as {
      actorUserId?: string;
      ip?: string;
      targetUserId?: string;
      reason?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    const actor = store.users[actorUserId!];
    const target = targetUserId ? store.users[targetUserId] : undefined;
    if (target && (target.id === PLATFORM_OWNER_ID || target.isPlatformOwner)) {
      res.status(403).json({ ok: false, error: 'Cannot IP ban the Talkcob Owner.' });
      return;
    }

    const resolvedIp =
      (ip || '').trim() || (target ? (store.userIpsByUserId[target.id] || [])[0] || '' : '');
    if (!resolvedIp) {
      res.status(400).json({
        ok: false,
        error: 'Enter an IP address or pick a user who has connected at least once.',
      });
      return;
    }

    const cleanReason = (reason || '').trim() || 'IP banned by Talkcob administration.';
    const bannedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    // Delete EVERY non-owner account associated with this IP (and explicit target user if given)
    const { purgedUserIds, deletedUsernames } = purgeAccountsForBannedIps([resolvedIp], target?.id);

    store.bannedIps = [
      {
        id: `ipban-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ip: resolvedIp,
        targetUserId: target?.id,
        targetUsername: target?.username,
        deletedUsernames,
        reason: cleanReason,
        bannedAt,
        bannedBy: actor.name,
      },
      ...store.bannedIps.filter((b) => b.ip !== resolvedIp),
    ];

    flushSave();
    broadcast({ type: 'sync:state', payload: getPublicState() });
    broadcast({ type: 'admin:bansUpdated', payload: {} });
    for (const uid of purgedUserIds) {
      forceDisconnectBannedTargets({
        targetUserId: uid,
        ip: resolvedIp,
        reason: cleanReason,
      });
    }
    forceDisconnectBannedTargets({
      targetUserId: target?.id,
      ip: resolvedIp,
      reason: cleanReason,
    });

    res.json({
      ok: true,
      deletedUsernames,
      bannedAccounts: store.bannedAccounts,
      bannedIps: store.bannedIps,
      userIpsByUserId: store.userIpsByUserId,
    });
  });

  app.post('/api/admin/unban-ip', (req: Request, res: Response) => {
    const { actorUserId, idOrIp } = req.body as {
      actorUserId?: string;
      idOrIp?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    store.bannedIps = store.bannedIps.filter((b) => b.id !== idOrIp && b.ip !== idOrIp);
    flushSave();
    broadcast({ type: 'admin:bansUpdated', payload: {} });
    res.json({
      ok: true,
      bannedAccounts: store.bannedAccounts,
      bannedIps: store.bannedIps,
      userIpsByUserId: store.userIpsByUserId,
    });
  });

  app.post('/api/admin/servers/delete', (req: Request, res: Response) => {
    const { actorUserId, serverId } = req.body as {
      actorUserId?: string;
      serverId?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    if (!serverId || !store.servers.some((s) => s.id === serverId)) {
      res.status(404).json({ ok: false, error: 'Server not found.' });
      return;
    }
    if (serverId === HOME_SERVER_ID) {
      store.hqDeletedByAdmin = true;
    }
    const deletedChannelIds = new Set(
      store.channels.filter((c) => c.serverId === serverId).map((c) => c.id)
    );
    store.servers = store.servers.filter((s) => s.id !== serverId);
    store.channels = store.channels.filter((c) => c.serverId !== serverId);
    store.messages = store.messages.filter((m) => !deletedChannelIds.has(m.channelId));
    flushSave();
    broadcast({ type: 'server:deleted', payload: { serverId } });
    res.json({ ok: true });
  });

  app.post('/api/admin/servers/add-member', (req: Request, res: Response) => {
    const { actorUserId, serverId, targetUserIdOrUsername } = req.body as {
      actorUserId?: string;
      serverId?: string;
      targetUserIdOrUsername?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    const srvIdx = store.servers.findIndex((s) => s.id === serverId);
    if (srvIdx === -1) {
      res.status(404).json({ ok: false, error: 'Server not found.' });
      return;
    }
    const clean = (targetUserIdOrUsername || '').trim().replace(/^@/, '').toLowerCase();
    const target = Object.values(store.users).find(
      (u) =>
        !u.isBot &&
        (u.id.toLowerCase() === clean ||
          u.username.toLowerCase() === clean ||
          u.name.toLowerCase() === clean)
    );
    if (!target) {
      res.status(404).json({ ok: false, error: `No user found for "@${clean}".` });
      return;
    }
    if (target.isBanned) {
      res.status(400).json({ ok: false, error: `@${target.username} is currently banned from Talkcob.` });
      return;
    }

    const srv = store.servers[srvIdx];
    const nextMembers = srv.memberIds.includes(target.id)
      ? srv.memberIds
      : [...srv.memberIds, target.id];
    const existingRoles = srv.memberRoles?.[target.id] || [];
    const nextSrv: Server = {
      ...srv,
      memberIds: nextMembers,
      memberRoles: {
        ...srv.memberRoles,
        [target.id]: existingRoles.length > 0 ? existingRoles : ['role-member'],
      },
    };
    store.servers[srvIdx] = nextSrv;
    flushSave();
    broadcast({ type: 'server:upsert', payload: { server: nextSrv } });
    res.json({ ok: true, server: nextSrv, addedUser: target });
  });

  app.post('/api/admin/admins/add', (req: Request, res: Response) => {
    const { actorUserId, targetUserIdOrUsername } = req.body as {
      actorUserId?: string;
      targetUserIdOrUsername?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    const clean = (targetUserIdOrUsername || '').trim().replace(/^@/, '').toLowerCase();
    const target = Object.values(store.users).find(
      (u) =>
        !u.isBot &&
        (u.id.toLowerCase() === clean ||
          u.username.toLowerCase() === clean ||
          u.name.toLowerCase() === clean)
    );
    if (!target) {
      res.status(404).json({ ok: false, error: `No Talkcob user found for "@${clean}".` });
      return;
    }
    if (target.isBanned) {
      res.status(400).json({ ok: false, error: `@${target.username} is currently banned. Unban them first.` });
      return;
    }

    const updated: User = { ...target, isPlatformAdmin: true };
    store.users[target.id] = updated;
    flushSave();
    broadcast({ type: 'user:upsert', payload: { user: updated } });
    res.json({ ok: true, user: updated });
  });

  app.post('/api/admin/admins/remove', (req: Request, res: Response) => {
    const { actorUserId, targetUserId } = req.body as {
      actorUserId?: string;
      targetUserId?: string;
    };
    if (!isAuthorizedAdmin(actorUserId)) {
      res.status(403).json({ ok: false, error: 'Platform Admin access required.' });
      return;
    }
    const target = targetUserId ? store.users[targetUserId] : undefined;
    if (!target) {
      res.status(404).json({ ok: false, error: 'User not found.' });
      return;
    }
    if (target.id === PLATFORM_OWNER_ID || target.isPlatformOwner) {
      res.status(403).json({ ok: false, error: 'Cannot remove the Talkcob Owner from the Admin Panel.' });
      return;
    }

    const updated: User = { ...target, isPlatformAdmin: false };
    store.users[target.id] = updated;
    flushSave();
    broadcast({ type: 'user:upsert', payload: { user: updated } });
    res.json({ ok: true, user: updated });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distDir, 'index.html'));
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && hasBuiltDist);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const seedImagesDir = path.resolve(__dirname, 'src/assets/images');
    if (fs.existsSync(seedImagesDir)) {
      app.use('/src/assets/images', express.static(seedImagesDir));
    }
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Talkcob server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });

  const gracefulShutdown = () => {
    flushSave();
    for (const client of wss.clients) {
      try {
        client.close();
      } catch {
        // Ignore socket close error during shutdown
      }
    }
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2500).unref();
  };

  process.once('SIGTERM', gracefulShutdown);
  process.once('SIGINT', gracefulShutdown);
}

startServer().catch((err) => {
  console.error('Failed to start Talkcob server:', err);
  process.exit(1);
});
