import { ALL_ROLE_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from '../data/seedData';
import {
  Channel,
  ChannelPermissionKey,
  ResolvedChannelPermissions,
  RolePermissions,
  Server,
  ServerRole,
} from '../types/talkcob';

export interface ServerPermissions {
  isOwner: boolean;
  hasSettingsRole: boolean;
  canAccessServerSettings: boolean;
  canAddChannels: boolean;
  assignedRoles: ServerRole[];
  permissions: RolePermissions;
}

export interface ChannelPermissionMeta {
  key: ChannelPermissionKey;
  label: string;
  description: string;
  category: 'General Channel Permissions' | 'Text Channel Permissions' | 'Voice Channel Permissions';
  channelScope: 'all' | 'text' | 'voice';
  danger?: boolean;
}

export const CHANNEL_PERMISSION_DEFINITIONS: ChannelPermissionMeta[] = [
  // General Channel Permissions
  {
    key: 'viewChannel',
    label: 'View Channel',
    description: 'Allows viewing this channel in the sidebar and reading its presence.',
    category: 'General Channel Permissions',
    channelScope: 'all',
  },
  {
    key: 'manageChannel',
    label: 'Manage Channel',
    description: 'Allows editing this channel name, topic, slowmode, user limit, or deleting it.',
    category: 'General Channel Permissions',
    channelScope: 'all',
  },
  {
    key: 'managePermissions',
    label: 'Manage Permissions',
    description: 'Allows editing role and member permission overrides for this channel.',
    category: 'General Channel Permissions',
    channelScope: 'all',
    danger: true,
  },
  {
    key: 'createInvite',
    label: 'Create Invite',
    description: 'Allows generating invites directly from this channel.',
    category: 'General Channel Permissions',
    channelScope: 'all',
  },

  // Text Channel Permissions
  {
    key: 'sendMessages',
    label: 'Send Messages',
    description: 'Allows posting new text messages in this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'sendMessagesInThreads',
    label: 'Reply & Send in Threads',
    description: 'Allows replying to messages and participating in channel threads.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'embedLinks',
    label: 'Embed Links',
    description: 'Allows links posted in this channel to show previews.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'attachFiles',
    label: 'Attach Images & Videos',
    description: 'Allows uploading photos, GIFs, and video clips into this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'addReactions',
    label: 'Add Reactions',
    description: 'Allows adding emoji reactions to messages in this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'useExternalEmojis',
    label: 'Use External Emojis',
    description: 'Allows using custom and external emojis in messages and reactions.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'mentionEveryone',
    label: 'Mention @everyone, @here & Roles',
    description: 'Allows notifying all members or all role holders in this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'manageMessages',
    label: 'Manage Messages',
    description: 'Allows deleting or pinning messages sent by any member in this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
    danger: true,
  },
  {
    key: 'readMessageHistory',
    label: 'Read Message History',
    description: 'Allows seeing previously sent messages when opening this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'sendTtsMessages',
    label: 'Send TTS Messages',
    description: 'Allows sending spoken text-to-speech announcements in this channel.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },
  {
    key: 'useApplicationCommands',
    label: 'Use Bot Commands',
    description: 'Allows triggering custom bots and slash/prefix commands here.',
    category: 'Text Channel Permissions',
    channelScope: 'text',
  },

  // Voice Channel Permissions
  {
    key: 'connect',
    label: 'Connect to Voice',
    description: 'Allows joining this voice channel.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
  },
  {
    key: 'speak',
    label: 'Speak in Voice',
    description: 'Allows transmitting microphone audio inside this voice channel.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
  },
  {
    key: 'streamVideo',
    label: 'Video & Share Screen',
    description: 'Allows streaming video or sharing your screen in this voice channel.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
  },
  {
    key: 'useVoiceActivity',
    label: 'Use Voice Activity Detection',
    description: 'Allows open-mic speaking without push-to-talk.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
  },
  {
    key: 'prioritySpeaker',
    label: 'Priority Speaker',
    description: 'Allows speaking clearly above other participants in busy voice rooms.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
  },
  {
    key: 'muteMembers',
    label: 'Mute Members',
    description: 'Allows muting other participants inside this voice channel.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
    danger: true,
  },
  {
    key: 'deafenMembers',
    label: 'Deafen Members',
    description: 'Allows deafening participants inside this voice channel.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
    danger: true,
  },
  {
    key: 'moveMembers',
    label: 'Move & Disconnect Members',
    description: 'Allows disconnecting or moving voice members between channels.',
    category: 'Voice Channel Permissions',
    channelScope: 'voice',
    danger: true,
  },
];

export const ALL_CHANNEL_PERMISSIONS: ResolvedChannelPermissions = {
  viewChannel: true,
  manageChannel: true,
  managePermissions: true,
  createInvite: true,
  sendMessages: true,
  sendMessagesInThreads: true,
  embedLinks: true,
  attachFiles: true,
  addReactions: true,
  useExternalEmojis: true,
  mentionEveryone: true,
  manageMessages: true,
  readMessageHistory: true,
  sendTtsMessages: true,
  useApplicationCommands: true,
  connect: true,
  speak: true,
  streamVideo: true,
  useVoiceActivity: true,
  prioritySpeaker: true,
  muteMembers: true,
  deafenMembers: true,
  moveMembers: true,
};

export function resolveRolePermissions(role: ServerRole): RolePermissions {
  const isSettings = role.name.trim().toLowerCase() === 'settings';
  const base: RolePermissions = {
    ...DEFAULT_MEMBER_PERMISSIONS,
    ...(role.permissions || {}),
    manageServer: Boolean(
      role.permissions?.manageServer ?? role.canAccessServerSettings
    ),
    manageChannels: Boolean(
      role.permissions?.manageChannels ?? role.canCreateChannels
    ),
  };

  if (isSettings) {
    base.manageServer = true;
    base.manageChannels = true;
  }

  return base;
}

export function getUserServerPermissions(
  server: Server | undefined,
  userId: string
): ServerPermissions {
  if (!server) {
    return {
      isOwner: false,
      hasSettingsRole: false,
      canAccessServerSettings: false,
      canAddChannels: false,
      assignedRoles: [],
      permissions: { ...DEFAULT_MEMBER_PERMISSIONS },
    };
  }

  const isOwner = server.ownerId === userId;
  const roleIds = server.memberRoles?.[userId] || [];
  const assignedRoles = (server.roles || []).filter((r) => roleIds.includes(r.id));

  // Anyone with a role named "settings" gets access to Server Settings & adding channels
  const hasSettingsRole = assignedRoles.some(
    (r) => r.name.trim().toLowerCase() === 'settings'
  );

  if (isOwner) {
    return {
      isOwner: true,
      hasSettingsRole,
      canAccessServerSettings: true,
      canAddChannels: true,
      assignedRoles,
      permissions: { ...ALL_ROLE_PERMISSIONS },
    };
  }

  const baseRole = (server.roles || []).find(
    (r) => r.name.trim().toLowerCase() === 'member'
  );

  // If user has no explicit roles assigned, inherit baseline 'member' role permissions (or default member perms)
  const effectiveSourceRoles =
    assignedRoles.length > 0
      ? assignedRoles
      : baseRole
      ? [baseRole]
      : [];

  if (effectiveSourceRoles.length === 0) {
    return {
      isOwner: false,
      hasSettingsRole,
      canAccessServerSettings: hasSettingsRole,
      canAddChannels: hasSettingsRole,
      assignedRoles,
      permissions: { ...DEFAULT_MEMBER_PERMISSIONS },
    };
  }

  const resolvedList = effectiveSourceRoles.map(resolveRolePermissions);
  const hasAdmin = resolvedList.some((p) => p.administrator);

  if (hasAdmin) {
    return {
      isOwner: false,
      hasSettingsRole,
      canAccessServerSettings: true,
      canAddChannels: true,
      assignedRoles,
      permissions: { ...ALL_ROLE_PERMISSIONS },
    };
  }

  const merged: RolePermissions = {
    administrator: false,
    manageServer: resolvedList.some((p) => p.manageServer) || hasSettingsRole,
    manageRoles: resolvedList.some((p) => p.manageRoles),
    manageChannels: resolvedList.some((p) => p.manageChannels) || hasSettingsRole,
    kickMembers: resolvedList.some((p) => p.kickMembers),
    banMembers: resolvedList.some((p) => p.banMembers),
    manageMessages: resolvedList.some((p) => p.manageMessages),
    sendMessages: resolvedList.some((p) => p.sendMessages),
    attachFiles: resolvedList.some((p) => p.attachFiles),
    addReactions: resolvedList.some((p) => p.addReactions),
    mentionEveryone: resolvedList.some((p) => p.mentionEveryone),
    connectVoice: resolvedList.some((p) => p.connectVoice),
    speakVoice: resolvedList.some((p) => p.speakVoice),
    shareScreen: resolvedList.some((p) => p.shareScreen),
    muteMembers: resolvedList.some((p) => p.muteMembers),
    manageBots: resolvedList.some((p) => p.manageBots),
  };

  return {
    isOwner: false,
    hasSettingsRole,
    canAccessServerSettings: merged.manageServer,
    canAddChannels: merged.manageChannels,
    assignedRoles,
    permissions: merged,
  };
}

export function resolveChannelPermissions(
  server: Server | undefined,
  channel: Channel | undefined,
  userId: string
): ResolvedChannelPermissions {
  const srv = getUserServerPermissions(server, userId);

  if (srv.isOwner || srv.permissions.administrator) {
    return { ...ALL_CHANNEL_PERMISSIONS };
  }

  const base: ResolvedChannelPermissions = {
    viewChannel: !channel?.isPrivate,
    manageChannel: srv.permissions.manageChannels,
    managePermissions: srv.permissions.manageRoles || srv.permissions.manageChannels,
    createInvite: true,
    sendMessages: srv.permissions.sendMessages,
    sendMessagesInThreads: srv.permissions.sendMessages,
    embedLinks: true,
    attachFiles: srv.permissions.attachFiles,
    addReactions: srv.permissions.addReactions,
    useExternalEmojis: server?.allowExternalEmojis ?? true,
    mentionEveryone: srv.permissions.mentionEveryone,
    manageMessages: srv.permissions.manageMessages,
    readMessageHistory: true,
    sendTtsMessages: srv.permissions.sendMessages,
    useApplicationCommands: true,
    connect: srv.permissions.connectVoice,
    speak: srv.permissions.speakVoice,
    streamVideo: srv.permissions.shareScreen,
    useVoiceActivity: srv.permissions.speakVoice,
    prioritySpeaker: srv.permissions.muteMembers,
    muteMembers: srv.permissions.muteMembers,
    deafenMembers: srv.permissions.muteMembers,
    moveMembers: srv.permissions.muteMembers,
  };

  if (!channel) return base;

  const roleOverrides = channel.roleOverrides || {};
  const memberRoleIds = server?.memberRoles?.[userId] || [];
  const defaultMemberRole = (server?.roles || []).find(
    (r) => r.name.trim().toLowerCase() === 'member'
  );
  const keys = Object.keys(base) as ChannelPermissionKey[];

  // 1. Baseline 'member' role (@everyone) overrides
  if (defaultMemberRole && roleOverrides[defaultMemberRole.id]) {
    const ov = roleOverrides[defaultMemberRole.id];
    for (const k of keys) {
      if (ov[k] === 'allow') base[k] = true;
      else if (ov[k] === 'deny') base[k] = false;
    }
  }

  // 2. User's specific assigned roles (any role 'allow' overrides any role 'deny')
  const nonBaseRoleIds = memberRoleIds.filter((id) => id !== defaultMemberRole?.id);
  if (nonBaseRoleIds.length > 0) {
    for (const k of keys) {
      let hasAllow = false;
      let hasDeny = false;
      for (const rId of nonBaseRoleIds) {
        const val = roleOverrides[rId]?.[k];
        if (val === 'allow') hasAllow = true;
        else if (val === 'deny') hasDeny = true;
      }
      if (hasAllow) base[k] = true;
      else if (hasDeny) base[k] = false;
    }
  }

  // 3. Per-member override (highest precedence below server owner/Admin)
  const memberOv = channel.memberOverrides?.[userId];
  if (memberOv) {
    for (const k of keys) {
      if (memberOv[k] === 'allow') base[k] = true;
      else if (memberOv[k] === 'deny') base[k] = false;
    }
  }

  // Note: settings role always keeps manageChannel & managePermissions unless server owner restricted via admin
  if (srv.hasSettingsRole) {
    base.viewChannel = true;
    base.manageChannel = true;
    base.managePermissions = true;
  }

  return base;
}
