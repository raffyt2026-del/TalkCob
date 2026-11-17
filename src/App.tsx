import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, PhoneCall, PhoneOff, UserPlus, X } from 'lucide-react';
import { AuthPage, SignUpPayload } from './components/AuthPage';
import { AdminPanelView } from './components/AdminPanelView';
import { AiHelpView } from './components/AiHelpView';
import { Avatar } from './components/Avatar';
import { BotStudioView } from './components/BotStudioView';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { DiscoverView } from './components/DiscoverView';
import { FriendsView } from './components/FriendsView';
import { MemberSidebar } from './components/MemberSidebar';
import {
  CreateChannelModal,
  CreateServerModal,
  InviteModal,
  QuickSwitcherModal,
  UserProfileModal,
} from './components/Modals';
import { ServerRail } from './components/ServerRail';
import { ScreenOverlayMode, ScreenShareOverlay } from './components/ScreenShareOverlay';
import { ServerSettingsModal, ServerSettingsTab } from './components/ServerSettingsModal';
import { StickerItem } from './components/StickerPicker';
import { UserSettingsModal } from './components/UserSettingsModal';
import { RemoteAudioMount, RtcSignalMessage, useVoiceRtc } from './hooks/useVoiceRtc';
import {
  CURRENT_USER_ID,
  DEFAULT_SERVER_ROLES,
  HOME_SERVER_ID,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_SERVERS,
  INITIAL_USERS,
  PLATFORM_OWNER_ID,
} from './data/seedData';
import {
  AppTheme,
  Attachment,
  AvatarDecorationId,
  Channel,
  CustomBot,
  CustomBotLogEntry,
  DirectMessageThread,
  FriendRequest,
  Message,
  PinnedSticker,
  ProfileEffectId,
  Server,
  ServerRole,
  SocialLink,
  User,
  UserStatus,
} from './types/talkcob';
import { getDmThreadId, getPeerIdFromDmThread } from './utils/dm';
import { getUserServerPermissions, resolveChannelPermissions } from './utils/permissions';
import { soundEngine } from './utils/sound';

const AUTH_STORAGE_KEY = 'talkcob_auth_v1';
const PREFS_STORAGE_KEY = 'talkcob_prefs_v1';

interface PersistedAuth {
  signedInUserId: string | null;
  savedAccountIds: string[];
  hasSignedUpBefore: boolean;
}

interface SharedWorkspacePayload {
  users: Record<string, User>;
  servers: Server[];
  channels: Channel[];
  messages: Message[];
  bots: CustomBot[];
  friendships: Array<[string, string]>;
  friendRequests: FriendRequest[];
  dmPinnedStickers?: Record<string, PinnedSticker[]>;
}

function loadLocalAuth(): PersistedAuth {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedAuth>;
      return {
        signedInUserId: parsed.signedInUserId || null,
        savedAccountIds: Array.isArray(parsed.savedAccountIds) ? parsed.savedAccountIds : [],
        hasSignedUpBefore: Boolean(parsed.hasSignedUpBefore),
      };
    }
  } catch {
    // Fallback
  }
  return {
    signedInUserId: null,
    savedAccountIds: [],
    hasSignedUpBefore: false,
  };
}

function loadLocalPrefs(): { theme: AppTheme; soundEnabled: boolean } {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { theme?: AppTheme; soundEnabled?: boolean };
      return {
        theme: parsed.theme || 'dark',
        soundEnabled: parsed.soundEnabled !== undefined ? parsed.soundEnabled : true,
      };
    }
  } catch {
    // Fallback
  }
  return { theme: 'dark', soundEnabled: true };
}

function deriveDmThreadsFromMessages(
  messages: Message[],
  currentUserId: string,
  existingThreads: DirectMessageThread[]
): DirectMessageThread[] {
  const map = new Map<string, DirectMessageThread>();
  for (const t of existingThreads) {
    const parsedPeer = getPeerIdFromDmThread(t.id, currentUserId);
    if (parsedPeer && parsedPeer !== currentUserId) {
      const canonicalId = getDmThreadId(currentUserId, parsedPeer);
      map.set(canonicalId, { ...t, id: canonicalId, participantId: parsedPeer });
    }
  }
  for (const msg of messages) {
    const peerId = getPeerIdFromDmThread(msg.channelId, currentUserId);
    if (!peerId) continue;
    const canonicalId = getDmThreadId(currentUserId, peerId);
    const prev = map.get(canonicalId);
    map.set(canonicalId, {
      id: canonicalId,
      participantId: peerId,
      unreadCount: prev?.unreadCount || 0,
      lastActivity: msg.timestamp || prev?.lastActivity || 'Just now',
    });
  }
  return Array.from(map.values());
}

export default function App() {
  const initialAuth = useMemo(() => loadLocalAuth(), []);
  const initialPrefs = useMemo(() => loadLocalPrefs(), []);

  const [authState, setAuthState] = useState<PersistedAuth>(initialAuth);
  const [activeUserId, setActiveUserId] = useState<string>(
    initialAuth.signedInUserId || CURRENT_USER_ID
  );
  const [users, setUsers] = useState<Record<string, User>>(INITIAL_USERS);
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [dmThreads, setDmThreads] = useState<DirectMessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [bots, setBots] = useState<CustomBot[]>([]);
  const [friendships, setFriendships] = useState<Array<[string, string]>>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [dmPinnedStickers, setDmPinnedStickers] = useState<Record<string, PinnedSticker[]>>({});
  const [theme, setTheme] = useState<AppTheme>(initialPrefs.theme);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(initialPrefs.soundEnabled);

  // Navigation state
  const [viewMode, setViewMode] = useState<'home' | 'server' | 'discover' | 'bots' | 'ai' | 'admin'>('server');
  const [homeSubView, setHomeSubView] = useState<'friends' | 'dm'>('friends');
  const [activeServerId, setActiveServerId] = useState<string>(HOME_SERVER_ID);
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-hq-general');
  const [activeDmId, setActiveDmId] = useState<string>('');
  const [showMemberList, setShowMemberList] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Voice & Audio & Camera & Screen Share state
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [showingVoiceStage, setShowingVoiceStage] = useState<boolean>(false);
  const [activeDmCallPeerId, setActiveDmCallPeerId] = useState<string | null>(null);
  const [showingDmCallStage, setShowingDmCallStage] = useState<boolean>(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareLabel, setScreenShareLabel] = useState<string | null>(null);
  const [screenShareNotice, setScreenShareNotice] = useState<string | null>(null);
  const [screenOverlayMode, setScreenOverlayMode] = useState<ScreenOverlayMode>('inline');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [localMicStream, setLocalMicStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [simSpeaking, setSimSpeaking] = useState<boolean>(false);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [adminRefreshSignal, setAdminRefreshSignal] = useState<number>(0);
  const [banNotice, setBanNotice] = useState<string | null>(null);
  const [incomingDmCall, setIncomingDmCall] = useState<{
    fromUserId: string;
    callId: string;
    withScreenShare?: boolean;
  } | null>(null);
  const [dmCallStatus, setDmCallStatus] = useState<'ringing' | 'connected' | 'declined' | null>(null);
  const [remoteWsSpeakingIds, setRemoteWsSpeakingIds] = useState<string[]>([]);

  // Live incoming friend request toast
  const [incomingToastReq, setIncomingToastReq] = useState<FriendRequest | null>(null);

  // Modals
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState<'text' | 'voice' | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [serverSettingsInitialTab, setServerSettingsInitialTab] =
    useState<ServerSettingsTab>('overview');
  const [serverSettingsChannelId, setServerSettingsChannelId] = useState<string | null>(null);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  // Refs for audio/camera/screen & WebSocket synchronization
  const micStreamRef = useRef<MediaStream | null>(null);
  const micRafRef = useRef<number | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsQueueRef = useRef<string[]>([]);
  const activeUserIdRef = useRef<string>(activeUserId);
  const signedInUserIdRef = useRef<string | null>(authState.signedInUserId);
  const activeFeedRef = useRef<string>(activeChannelId);
  const activeDmCallPeerIdRef = useRef<string | null>(activeDmCallPeerId);
  const viewModeRef = useRef(viewMode);
  const homeSubViewRef = useRef(homeSubView);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rtcSignalHandlerRef = useRef<((msg: RtcSignalMessage) => void) | null>(null);
  const rtcRoomIdRef = useRef<string | null>(null);
  const remoteSpeakingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    signedInUserIdRef.current = authState.signedInUserId;
  }, [authState.signedInUserId]);

  useEffect(() => {
    activeDmCallPeerIdRef.current = activeDmCallPeerId;
  }, [activeDmCallPeerId]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    homeSubViewRef.current = homeSubView;
  }, [homeSubView]);

  const sendWs = useCallback((type: string, payload: Record<string, unknown>) => {
    const serialized = JSON.stringify({ type, payload });
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(serialized);
    } else {
      wsQueueRef.current.push(serialized);
    }
  }, []);

  const applySharedState = useCallback((shared: SharedWorkspacePayload) => {
    setUsers(shared.users);
    setServers(shared.servers);
    setChannels(shared.channels);
    setMessages(shared.messages);
    setBots(shared.bots || []);
    setFriendships(shared.friendships || []);
    setFriendRequests(shared.friendRequests || []);
    setDmPinnedStickers(shared.dmPinnedStickers || {});
    const uid = signedInUserIdRef.current || activeUserIdRef.current;
    if (uid) {
      setDmThreads((prev) => deriveDmThreadsFromMessages(shared.messages, uid, prev));
    }
  }, []);

  // Re-derive DM threads whenever activeUserId or messages change
  useEffect(() => {
    setDmThreads((prev) => deriveDmThreadsFromMessages(messages, activeUserId, prev));
  }, [activeUserId, messages]);

  // Connect to real-time WebSocket server + auto-reconnect + HTTP initial fallback
  useEffect(() => {
    let cancelled = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // HTTP initial state sync
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SharedWorkspacePayload | null) => {
        if (!cancelled && data && data.users && data.servers) {
          applySharedState(data);
        }
      })
      .catch(() => {});

    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt = 0;
        if (signedInUserIdRef.current) {
          socket.send(
            JSON.stringify({
              type: 'client:identify',
              payload: { userId: signedInUserIdRef.current },
            })
          );
        }
        while (wsQueueRef.current.length > 0 && socket.readyState === WebSocket.OPEN) {
          const next = wsQueueRef.current.shift();
          if (next) socket.send(next);
        }
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          const payload = parsed.payload || {};

          switch (parsed.type) {
            case 'sync:state': {
              applySharedState(payload as unknown as SharedWorkspacePayload);
              break;
            }

            case 'user:upsert': {
              const u = payload.user as User | undefined;
              if (u && u.id) {
                setUsers((prev) => ({ ...prev, [u.id]: u }));
                setProfileUser((prev) => (prev && prev.id === u.id ? u : prev));
                if (
                  u.id === signedInUserIdRef.current &&
                  u.isBanned &&
                  !u.isPlatformOwner &&
                  u.id !== PLATFORM_OWNER_ID
                ) {
                  setBanNotice(
                    `Your account has been banned from Talkcob. Reason: ${u.banReason || 'Violating Talkcob rules.'}`
                  );
                  setAuthState((prev) => ({ ...prev, signedInUserId: null }));
                }
              }
              break;
            }

            case 'admin:bansUpdated': {
              setAdminRefreshSignal((prev) => prev + 1);
              break;
            }

            case 'admin:forceLogout': {
              const targetUid = payload.userId as string | undefined;
              const reason =
                typeof payload.reason === 'string' && payload.reason
                  ? payload.reason
                  : 'You were banned from Talkcob.';
              const currentUid = signedInUserIdRef.current || activeUserIdRef.current;
              const isCurrentOwner = currentUid === PLATFORM_OWNER_ID;
              if (!isCurrentOwner && (!targetUid || targetUid === currentUid)) {
                setBanNotice(reason);
                setSettingsOpen(false);
                setServerSettingsOpen(false);
                setAuthState((prev) => ({ ...prev, signedInUserId: null }));
              }
              break;
            }

            case 'message:created': {
              const incoming = Array.isArray(payload.messages)
                ? (payload.messages as Message[])
                : [];
              const botLogs = payload.botLogs as Record<string, CustomBotLogEntry[]> | null;

              if (incoming.length > 0) {
                let addedFromOther = false;
                setMessages((prev) => {
                  const existingIds = new Set(prev.map((m) => m.id));
                  const toAdd = incoming.filter((m) => m && m.id && !existingIds.has(m.id));
                  if (toAdd.length === 0) return prev;
                  if (toAdd.some((m) => m.authorId !== activeUserIdRef.current)) {
                    addedFromOther = true;
                  }
                  return [...prev, ...toAdd];
                });

                const currentFeed = activeFeedRef.current;
                const uid = activeUserIdRef.current;
                for (const m of incoming) {
                  if (m.authorId === uid) continue;
                  const peerId = getPeerIdFromDmThread(m.channelId, uid);
                  if (peerId) {
                    const canonicalId = getDmThreadId(uid, peerId);
                    const isViewingThisDm =
                      viewModeRef.current === 'home' &&
                      homeSubViewRef.current === 'dm' &&
                      currentFeed === canonicalId;
                    setDmThreads((prev) => {
                      const existing = prev.find((d) => d.id === canonicalId);
                      if (existing) {
                        return prev.map((d) =>
                          d.id === canonicalId
                            ? {
                                ...d,
                                lastActivity: m.timestamp,
                                unreadCount: isViewingThisDm ? 0 : (d.unreadCount || 0) + 1,
                              }
                            : d
                        );
                      }
                      return [
                        {
                          id: canonicalId,
                          participantId: peerId,
                          lastActivity: m.timestamp,
                          unreadCount: isViewingThisDm ? 0 : 1,
                        },
                        ...prev,
                      ];
                    });
                  } else if (m.channelId !== currentFeed || viewModeRef.current !== 'server') {
                    setChannels((prev) =>
                      prev.map((c) =>
                        c.id === m.channelId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
                      )
                    );
                  }
                }

                if (addedFromOther) {
                  soundEngine.playMessageSend();
                }
              }

              if (botLogs && typeof botLogs === 'object') {
                setBots((prev) =>
                  prev.map((b) => {
                    const entries = botLogs[b.id];
                    if (!entries) return b;
                    const existingIds = new Set((b.logs || []).map((l) => l.id));
                    const fresh = entries.filter((e) => !existingIds.has(e.id));
                    if (fresh.length === 0) return b;
                    return { ...b, logs: [...fresh, ...(b.logs || [])].slice(0, 25) };
                  })
                );
              }
              break;
            }

            case 'message:updated': {
              const updated = payload.message as Message | undefined;
              if (updated && updated.id) {
                setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              }
              break;
            }

            case 'message:deleted': {
              const messageId = payload.messageId as string;
              if (messageId) {
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
              }
              break;
            }

            case 'message:bulkDeleted': {
              const messageIds = Array.isArray(payload.messageIds)
                ? (payload.messageIds as string[])
                : [];
              if (messageIds.length > 0) {
                const delSet = new Set(messageIds);
                setMessages((prev) => prev.filter((m) => !delSet.has(m.id)));
              }
              break;
            }

            case 'server:created': {
              const server = payload.server as Server | undefined;
              const newChannels = Array.isArray(payload.channels)
                ? (payload.channels as Channel[])
                : [];
              if (server && server.id) {
                setServers((prev) =>
                  prev.some((s) => s.id === server.id) ? prev : [...prev, server]
                );
              }
              if (newChannels.length > 0) {
                setChannels((prev) => {
                  const ids = new Set(prev.map((c) => c.id));
                  const fresh = newChannels.filter((c) => c && c.id && !ids.has(c.id));
                  return fresh.length > 0 ? [...prev, ...fresh] : prev;
                });
              }
              break;
            }

            case 'server:upsert': {
              const server = payload.server as Server | undefined;
              if (server && server.id) {
                setServers((prev) =>
                  prev.some((s) => s.id === server.id)
                    ? prev.map((s) => (s.id === server.id ? server : s))
                    : [...prev, server]
                );
              }
              break;
            }

            case 'server:deleted': {
              const serverId = payload.serverId as string;
              if (serverId) {
                setServers((prev) => {
                  const remaining = prev.filter((s) => s.id !== serverId);
                  setActiveServerId((curId) =>
                    curId === serverId ? remaining[0]?.id || HOME_SERVER_ID : curId
                  );
                  return remaining;
                });
                setChannels((prev) => prev.filter((c) => c.serverId !== serverId));
              }
              break;
            }

            case 'channel:upsert': {
              const ch = payload.channel as Channel | undefined;
              if (ch && ch.id) {
                setChannels((prev) =>
                  prev.some((c) => c.id === ch.id)
                    ? prev.map((c) => (c.id === ch.id ? ch : c))
                    : [...prev, ch]
                );
              }
              break;
            }

            case 'channel:deleted': {
              const channelId = payload.channelId as string;
              if (channelId) {
                setChannels((prev) => prev.filter((c) => c.id !== channelId));
              }
              break;
            }

            case 'channels:sync': {
              const nextChannels = payload.channels as Channel[] | undefined;
              if (Array.isArray(nextChannels)) {
                setChannels(nextChannels);
              }
              break;
            }

            case 'sticker:updated': {
              const feedId = payload.feedId as string;
              const nextPinned = Array.isArray(payload.pinnedStickers)
                ? (payload.pinnedStickers as PinnedSticker[])
                : [];
              if (feedId) {
                if (feedId.startsWith('dm-')) {
                  setDmPinnedStickers((prev) => ({ ...prev, [feedId]: nextPinned }));
                } else {
                  setChannels((prev) =>
                    prev.map((c) => (c.id === feedId ? { ...c, pinnedStickers: nextPinned } : c))
                  );
                }
              }
              break;
            }

            case 'voice:soundboardPlayed': {
              const fromUserId = payload.fromUserId as string;
              const roomId = payload.roomId as string;
              const clipId = payload.clipId as string;
              if (
                fromUserId !== activeUserIdRef.current &&
                roomId &&
                roomId === rtcRoomIdRef.current &&
                clipId
              ) {
                soundEngine.playSoundboard(clipId);
              }
              break;
            }

            case 'bot:upsert': {
              const bot = payload.bot as CustomBot | undefined;
              if (bot && bot.id) {
                setBots((prev) =>
                  prev.some((b) => b.id === bot.id)
                    ? prev.map((b) => (b.id === bot.id ? bot : b))
                    : [bot, ...prev]
                );
              }
              break;
            }

            case 'bot:deleted': {
              const botId = payload.botId as string;
              if (botId) {
                setBots((prev) => prev.filter((b) => b.id !== botId));
              }
              break;
            }

            case 'friendRequest:created': {
              const req = payload.request as FriendRequest | undefined;
              if (req && req.id) {
                setFriendRequests((prev) =>
                  prev.some((r) => r.id === req.id) ? prev : [...prev, req]
                );
                if (req.toUserId === activeUserIdRef.current) {
                  setIncomingToastReq(req);
                }
              }
              break;
            }

            case 'friendRequest:accepted': {
              const requestId = payload.requestId as string;
              const fromUserId = payload.fromUserId as string;
              const toUserId = payload.toUserId as string;
              setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
              setIncomingToastReq((prev) => (prev && prev.id === requestId ? null : prev));
              if (fromUserId && toUserId) {
                setFriendships((prev) => {
                  const exists = prev.some(
                    ([a, b]) =>
                      (a === fromUserId && b === toUserId) ||
                      (a === toUserId && b === fromUserId)
                  );
                  return exists ? prev : [...prev, [fromUserId, toUserId]];
                });
              }
              break;
            }

            case 'friendRequest:removed': {
              const requestId = payload.requestId as string;
              setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
              setIncomingToastReq((prev) => (prev && prev.id === requestId ? null : prev));
              break;
            }

            case 'friendship:removed': {
              const userId = payload.userId as string;
              const friendId = payload.friendId as string;
              setFriendships((prev) =>
                prev.filter(
                  ([a, b]) =>
                    !((a === userId && b === friendId) || (b === userId && a === friendId))
                )
              );
              break;
            }

            case 'typing:update': {
              const channelId = payload.channelId as string;
              const userName = payload.userName as string;
              if (channelId === activeFeedRef.current && userName) {
                setTypingUserName(userName);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingUserName(null), 2500);
              }
              break;
            }

            case 'rtc:offer':
            case 'rtc:answer':
            case 'rtc:ice':
            case 'rtc:mediaMeta': {
              const fromUserId = payload.fromUserId as string;
              if (fromUserId && rtcSignalHandlerRef.current) {
                rtcSignalHandlerRef.current({
                  type: parsed.type,
                  fromUserId,
                  roomId: payload.roomId as string | undefined,
                  sdp: payload.sdp as RTCSessionDescriptionInit | undefined,
                  candidate: payload.candidate as RTCIceCandidateInit | undefined,
                  cameraStreamId: payload.cameraStreamId as string | null | undefined,
                  screenStreamId: payload.screenStreamId as string | null | undefined,
                });
              }
              break;
            }

            case 'rtc:speakingUpdate': {
              const fromUserId = payload.fromUserId as string;
              const speaking = Boolean(payload.speaking);
              if (!fromUserId) break;
              if (remoteSpeakingTimersRef.current[fromUserId]) {
                clearTimeout(remoteSpeakingTimersRef.current[fromUserId]);
                delete remoteSpeakingTimersRef.current[fromUserId];
              }
              if (speaking) {
                setRemoteWsSpeakingIds((prev) =>
                  prev.includes(fromUserId) ? prev : [...prev, fromUserId]
                );
                remoteSpeakingTimersRef.current[fromUserId] = setTimeout(() => {
                  setRemoteWsSpeakingIds((prev) => prev.filter((id) => id !== fromUserId));
                  delete remoteSpeakingTimersRef.current[fromUserId];
                }, 2200);
              } else {
                setRemoteWsSpeakingIds((prev) => prev.filter((id) => id !== fromUserId));
              }
              break;
            }

            case 'dmcall:incoming': {
              const fromUserId = payload.fromUserId as string;
              const callId = (payload.callId as string) || `dmcall-${Date.now()}`;
              const withScreenShare = Boolean(payload.withScreenShare);
              if (fromUserId && fromUserId !== activeUserIdRef.current) {
                setIncomingDmCall({ fromUserId, callId, withScreenShare });
                soundEngine.playVoiceJoin();
              }
              break;
            }

            case 'dmcall:accepted': {
              const fromUserId = payload.fromUserId as string;
              if (fromUserId && activeDmCallPeerIdRef.current === fromUserId) {
                setDmCallStatus('connected');
              }
              break;
            }

            case 'dmcall:declined': {
              const fromUserId = payload.fromUserId as string;
              if (fromUserId && activeDmCallPeerIdRef.current === fromUserId) {
                setDmCallStatus('declined');
                soundEngine.playVoiceLeave();
                setTimeout(() => {
                  if (activeDmCallPeerIdRef.current === fromUserId) {
                    setActiveDmCallPeerId(null);
                    setShowingDmCallStage(false);
                    setDmCallStatus(null);
                  }
                }, 1800);
              }
              break;
            }

            case 'dmcall:ended': {
              const fromUserId = payload.fromUserId as string;
              setIncomingDmCall((prev) => (prev && prev.fromUserId === fromUserId ? null : prev));
              if (fromUserId && activeDmCallPeerIdRef.current === fromUserId) {
                if (micRafRef.current) {
                  cancelAnimationFrame(micRafRef.current);
                  micRafRef.current = null;
                }
                if (micStreamRef.current) {
                  micStreamRef.current.getTracks().forEach((tr) => tr.stop());
                  micStreamRef.current = null;
                }
                if (micAudioCtxRef.current) {
                  micAudioCtxRef.current.close().catch(() => {});
                  micAudioCtxRef.current = null;
                }
                setLocalMicStream(null);
                setMicEnabled(false);
                setMicLevel(0);
                if (previewRafRef.current) {
                  cancelAnimationFrame(previewRafRef.current);
                  previewRafRef.current = null;
                }
                if (screenStreamRef.current) {
                  screenStreamRef.current.getTracks().forEach((tr) => tr.stop());
                  screenStreamRef.current = null;
                }
                if (cameraStreamRef.current) {
                  cameraStreamRef.current.getTracks().forEach((tr) => tr.stop());
                  cameraStreamRef.current = null;
                }
                setCameraStream(null);
                setCameraEnabled(false);
                setCameraError(null);
                setScreenStream(null);
                setScreenShareLabel(null);
                setScreenOverlayMode('inline');
                setActiveDmCallPeerId(null);
                setShowingDmCallStage(false);
                setDmCallStatus(null);
                soundEngine.playVoiceLeave();
              }
              break;
            }
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };

      socket.onclose = () => {
        wsRef.current = null;
        if (!cancelled) {
          const delay = Math.min(4000, 1000 * Math.pow(2, reconnectAttempt));
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      for (const timer of Object.values(remoteSpeakingTimersRef.current)) {
        clearTimeout(timer);
      }
      remoteSpeakingTimersRef.current = {};
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [applySharedState]);

  // Identify active user to WebSocket when signedInUserId changes
  useEffect(() => {
    if (authState.signedInUserId) {
      sendWs('client:identify', { userId: authState.signedInUserId });
    }
  }, [authState.signedInUserId, sendWs]);

  // Verify stored session against server when app loads
  useEffect(() => {
    if (!authState.signedInUserId) return;
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authState.signedInUserId }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          user?: User;
          state?: SharedWorkspacePayload;
          error?: string;
          banned?: boolean;
        };
        if (res.status === 403 && data.banned) {
          setBanNotice(data.error || 'Your access to Talkcob has been banned.');
          setAuthState((prev) => ({ ...prev, signedInUserId: null }));
          return;
        }
        if (res.ok && data?.state) {
          applySharedState(data.state);
        }
      })
      .catch(() => {});
  }, [applySharedState, authState.signedInUserId]);

  // Sync theme to <html class="dark">
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  // Sync sound engine setting
  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  // Persist local device auth state
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } catch {
      // Ignore storage errors
    }
  }, [authState]);

  // Persist local device preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ theme, soundEnabled }));
    } catch {
      // Ignore storage errors
    }
  }, [theme, soundEnabled]);

  // Global Cmd+K / Ctrl+K shortcut for Quick Switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSwitcherOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setQuickSwitcherOpen(false);
        setCreateServerOpen(false);
        setCreateChannelType(null);
        setInviteOpen(false);
        setSettingsOpen(false);
        setServerSettingsOpen(false);
        setProfileUser(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real microphone capture & audio level polling
  const stopRealMic = useCallback(() => {
    if (micRafRef.current) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;
    }
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
    setLocalMicStream(null);
    setMicError(null);
    setMicEnabled(false);
    setMicLevel(0);
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((tr) => tr.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
    setCameraEnabled(false);
    setCameraError(null);
  }, []);

  const stopScreenShare = useCallback(() => {
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((tr) => tr.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setScreenShareLabel(null);
    setScreenOverlayMode('inline');
  }, []);

  useEffect(() => {
    return () => {
      stopRealMic();
      stopCamera();
      stopScreenShare();
    };
  }, [stopRealMic, stopCamera, stopScreenShare]);

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    setCameraError(null);
    if (cameraStreamRef.current) {
      const liveTrack = cameraStreamRef.current.getVideoTracks().find((tr) => tr.readyState === 'live');
      if (liveTrack) {
        setCameraEnabled(true);
        return cameraStreamRef.current;
      }
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError('Camera API is unavailable in this browser.');
      return null;
    }
    try {
      const quality = users[activeUserIdRef.current]?.streamQuality || '1080p60';
      const camWidth = quality === '720p30' ? 1280 : 1920;
      const camHeight = quality === '720p30' ? 720 : 1080;
      const camFps = quality === '720p30' ? 30 : 60;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: camWidth },
          height: { ideal: camHeight },
          frameRate: { ideal: camFps },
          facingMode: 'user',
        },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => {
          stopCamera();
        });
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(true);
      return stream;
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in your browser and click Retry Camera.'
          : 'Could not access your webcam. Make sure a camera is connected and allowed.';
      setCameraEnabled(false);
      setCameraError(msg);
      return null;
    }
  }, [stopCamera]);

  const handleToggleCamera = () => {
    if (cameraEnabled && cameraStreamRef.current) {
      stopCamera();
      return;
    }
    void startCamera();
  };

  const startRealMic = useCallback(async (): Promise<MediaStream | null> => {
    if (micStreamRef.current) {
      const liveTrack = micStreamRef.current.getAudioTracks().find((tr) => tr.readyState === 'live');
      if (liveTrack) {
        setMicEnabled(true);
        setMicError(null);
        return micStreamRef.current;
      }
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setMicError('Microphone API is unavailable in this browser.');
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (micAudioCtxRef.current) {
        micAudioCtxRef.current.close().catch(() => {});
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      micStreamRef.current = stream;
      micAudioCtxRef.current = ctx;
      setLocalMicStream(stream);
      setMicEnabled(true);
      setMicError(null);

      if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((acc, v) => acc + v, 0) / (data.length || 1);
        setMicLevel(Math.min(100, Math.round(avg * 2.2)));
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();
      return stream;
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission was blocked. Allow microphone access in your browser and click Retry Mic.'
          : 'Could not access your microphone. Make sure a microphone is connected and allowed.';
      setMicEnabled(false);
      setMicError(msg);
      return null;
    }
  }, []);

  const handleToggleRealMic = async () => {
    if (micEnabled) {
      stopRealMic();
      return;
    }
    setIsMuted(false);
    await startRealMic();
  };

  const currentUser = users[activeUserId] || users[CURRENT_USER_ID];
  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];
  const serverChannels = channels.filter((c) => c.serverId === activeServer?.id);
  const activeChannel =
    serverChannels.find((c) => c.id === activeChannelId) ||
    serverChannels.find((c) => c.type === 'text') ||
    serverChannels[0];
  const activeDm = dmThreads.find((d) => d.id === activeDmId);
  const dmPeer = viewMode === 'home' && activeDm ? users[activeDm.participantId] : undefined;
  const connectedVoiceChannel = channels.find((c) => c.id === connectedVoiceChannelId);
  const activeDmCallPeer = activeDmCallPeerId ? users[activeDmCallPeerId] : undefined;

  const isViewingInlineStage =
    (viewMode === 'server' && showingVoiceStage && Boolean(connectedVoiceChannelId)) ||
    (viewMode === 'home' &&
      homeSubView === 'dm' &&
      showingDmCallStage &&
      Boolean(activeDmCallPeerId) &&
      dmPeer?.id === activeDmCallPeerId);

  useEffect(() => {
    if (screenStream && !isViewingInlineStage && screenOverlayMode === 'inline') {
      setScreenOverlayMode('floating');
    }
  }, [screenStream, isViewingInlineStage, screenOverlayMode]);

  const handleChangeScreenOverlayMode = (nextMode: ScreenOverlayMode) => {
    setScreenOverlayMode(nextMode);
    if (nextMode === 'inline') {
      if (connectedVoiceChannelId) {
        const vc = channels.find((c) => c.id === connectedVoiceChannelId);
        if (vc) {
          setViewMode('server');
          setActiveServerId(vc.serverId);
        }
        setShowingVoiceStage(true);
      } else if (activeDmCallPeerId) {
        handleStartDmWithUser(activeDmCallPeerId);
        setShowingDmCallStage(true);
      }
    }
  };

  const activeServerPerms = getUserServerPermissions(activeServer, currentUser.id);
  const activeChannelPerms =
    viewMode === 'server' && activeServer && activeChannel
      ? resolveChannelPermissions(activeServer, activeChannel, currentUser.id)
      : undefined;
  const connectedVoiceChannelPerms =
    connectedVoiceChannel
      ? resolveChannelPermissions(
          servers.find((s) => s.id === connectedVoiceChannel.serverId) || activeServer,
          connectedVoiceChannel,
          currentUser.id
        )
      : undefined;

  const rtcRoomId = connectedVoiceChannelId
    ? connectedVoiceChannelId
    : activeDmCallPeerId
    ? getDmThreadId(currentUser.id, activeDmCallPeerId)
    : null;
  rtcRoomIdRef.current = rtcRoomId;

  const rtcPeerUserIds = useMemo(() => {
    if (connectedVoiceChannel) {
      return (connectedVoiceChannel.voiceParticipantIds || []).filter(
        (id) => id !== currentUser.id
      );
    }
    if (activeDmCallPeerId) {
      return [activeDmCallPeerId];
    }
    return [];
  }, [connectedVoiceChannel, activeDmCallPeerId, currentUser.id]);

  const canSpeakInRtc = connectedVoiceChannelId
    ? connectedVoiceChannelPerms?.speak ?? true
    : true;

  const {
    remoteAudioStreams,
    remoteCameraStreams,
    remoteScreenStreams,
    peerConnectionStates,
    remoteSpeakingIds,
    audioPlayBlocked,
    handleRtcSignal,
    registerAudioElement,
    unlockRemoteAudio,
  } = useVoiceRtc({
    currentUserId: currentUser.id,
    roomId: rtcRoomId,
    peerUserIds: rtcPeerUserIds,
    localMicStream,
    localCameraStream: cameraStream,
    localScreenStream: screenStream,
    isMuted,
    isDeafened,
    canSpeak: canSpeakInRtc,
    sendWs,
  });

  rtcSignalHandlerRef.current = handleRtcSignal;

  const isYouSpeaking =
    (Boolean(connectedVoiceChannelId) || Boolean(activeDmCallPeerId)) &&
    !isMuted &&
    !isDeafened &&
    canSpeakInRtc &&
    (simSpeaking || (micEnabled && micLevel > 14));

  useEffect(() => {
    if (!rtcRoomId) return;
    sendWs('rtc:speaking', {
      fromUserId: currentUser.id,
      roomId: rtcRoomId,
      speaking: isYouSpeaking,
    });
  }, [rtcRoomId, currentUser.id, isYouSpeaking, sendWs]);

  const speakingUserIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(isYouSpeaking ? [currentUser.id] : []),
          ...remoteSpeakingIds,
          ...remoteWsSpeakingIds,
        ])
      ),
    [isYouSpeaking, currentUser.id, remoteSpeakingIds, remoteWsSpeakingIds]
  );

  const activeFeedId = viewMode === 'home' ? activeDmId : activeChannel?.id || activeChannelId;
  useEffect(() => {
    activeFeedRef.current = activeFeedId;
  }, [activeFeedId]);

  const channelMessages = messages.filter((m) => m.channelId === activeFeedId);

  const unreadByServer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ch of channels) {
      if (ch.unreadCount && ch.unreadCount > 0) {
        map[ch.serverId] = (map[ch.serverId] || 0) + ch.unreadCount;
      }
    }
    return map;
  }, [channels]);

  const dmUnreadCount = dmThreads.reduce((acc, d) => acc + (d.unreadCount || 0), 0);

  const currentFriendIds = useMemo(() => {
    const ids: string[] = [];
    for (const [a, b] of friendships) {
      if (a === currentUser.id) ids.push(b);
      else if (b === currentUser.id) ids.push(a);
    }
    return ids;
  }, [friendships, currentUser.id]);

  const pendingIncomingCount = friendRequests.filter((r) => r.toUserId === currentUser.id).length;

  const getFriendStatus = (
    targetUserId: string
  ): 'none' | 'friends' | 'outgoing' | 'incoming' => {
    if (currentFriendIds.includes(targetUserId)) return 'friends';
    if (
      friendRequests.some(
        (r) => r.fromUserId === currentUser.id && r.toUserId === targetUserId
      )
    ) {
      return 'outgoing';
    }
    if (
      friendRequests.some(
        (r) => r.fromUserId === targetUserId && r.toUserId === currentUser.id
      )
    ) {
      return 'incoming';
    }
    return 'none';
  };

  const handleSendFriendRequest = async (
    usernameOrName: string
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUsernameOrId: usernameOrName,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message: string;
        request?: FriendRequest;
      };
      if (data.ok && data.request) {
        setFriendRequests((prev) =>
          prev.some((r) => r.id === data.request!.id) ? prev : [...prev, data.request!]
        );
      }
      return { ok: Boolean(data.ok), message: data.message || 'Done.' };
    } catch {
      return { ok: false, message: 'Could not reach server to send friend request.' };
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    setIncomingToastReq((prev) => (prev && prev.id === requestId ? null : prev));
    setFriendships((prev) => {
      const already = prev.some(
        ([a, b]) =>
          (a === req.fromUserId && b === req.toUserId) ||
          (a === req.toUserId && b === req.fromUserId)
      );
      return already ? prev : [...prev, [req.fromUserId, req.toUserId]];
    });
    await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, userId: currentUser.id }),
    }).catch(() => {});
  };

  const handleRemoveFriendRequest = async (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    setIncomingToastReq((prev) => (prev && prev.id === requestId ? null : prev));
    await fetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    }).catch(() => {});
  };

  const handleRemoveFriend = async (friendId: string) => {
    setFriendships((prev) =>
      prev.filter(
        ([a, b]) =>
          !(
            (a === currentUser.id && b === friendId) ||
            (b === currentUser.id && a === friendId)
          )
      )
    );
    await fetch('/api/friends/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, friendId }),
    }).catch(() => {});
  };

  // Navigation Handlers
  const handleSelectHome = () => {
    setViewMode('home');
    setHomeSubView('friends');
    setShowingVoiceStage(false);
    setDmThreads((prev) =>
      prev.map((d) => (d.id === activeDmId ? { ...d, unreadCount: 0 } : d))
    );
    setMobileMenuOpen(false);
  };

  const handleSelectServer = (serverId: string) => {
    setViewMode('server');
    setActiveServerId(serverId);
    setShowingVoiceStage(false);
    const firstText = channels.find((c) => c.serverId === serverId && c.type === 'text');
    if (firstText) {
      setActiveChannelId(firstText.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === firstText.id ? { ...c, unreadCount: 0 } : c))
      );
    }
    setMobileMenuOpen(false);
  };

  const handleSelectChannel = (channelId: string) => {
    setViewMode('server');
    setActiveChannelId(channelId);
    setShowingVoiceStage(false);
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c))
    );
    setMobileMenuOpen(false);
  };

  const handleSelectDm = (dmId: string) => {
    setViewMode('home');
    setHomeSubView('dm');
    setActiveDmId(dmId);
    setShowingVoiceStage(false);
    setDmThreads((prev) =>
      prev.map((d) => (d.id === dmId ? { ...d, unreadCount: 0 } : d))
    );
    setMobileMenuOpen(false);
  };

  const handleStartDmWithUser = (userId: string) => {
    if (userId === currentUser.id) return;
    const canonicalId = getDmThreadId(currentUser.id, userId);
    const existing = dmThreads.find((d) => d.id === canonicalId || d.participantId === userId);
    if (existing) {
      handleSelectDm(canonicalId);
      return;
    }
    const newThread: DirectMessageThread = {
      id: canonicalId,
      participantId: userId,
      lastActivity: 'Just now',
    };
    setDmThreads((prev) => [newThread, ...prev]);
    setViewMode('home');
    setHomeSubView('dm');
    setActiveDmId(canonicalId);
    setShowingVoiceStage(false);
  };

  const startCanvasPreviewScreen = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const draw = () => {
      if (!ctx) return;
      frame += 1;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#18181B');
      grad.addColorStop(1, '#261417');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.roundRect(48, 48, 86, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('LIVE SHARE', 58, 68);

      ctx.fillStyle = '#F2F3F5';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`${currentUser.name}'s Shared Screen Preview`, 48, 132);

      ctx.fillStyle = '#B5BAC1';
      ctx.font = '16px sans-serif';
      ctx.fillText(
        connectedVoiceChannel
          ? `Streaming in Voice Channel: ${connectedVoiceChannel.name}`
          : activeDmCallPeer
          ? `Streaming in DM Call with ${activeDmCallPeer.name}`
          : 'Talkcob Screen Stream Active',
        48,
        166
      );

      for (let i = 0; i < 14; i++) {
        const barH = 26 + Math.abs(Math.sin(frame * 0.08 + i * 0.6)) * 90;
        ctx.fillStyle = i % 2 === 0 ? '#E53935' : '#FACC15';
        ctx.beginPath();
        ctx.roundRect(52 + i * 56, 360 - barH, 34, barH, 6);
        ctx.fill();
      }

      ctx.fillStyle = '#949BA4';
      ctx.font = '14px monospace';
      ctx.fillText(
        `Preview Stream · 960x540 · ${new Date().toLocaleTimeString()}`,
        48,
        486
      );

      previewRafRef.current = requestAnimationFrame(draw);
    };

    draw();
    const captureFn = (canvas as unknown as { captureStream?: (fps?: number) => MediaStream })
      .captureStream;
    if (typeof captureFn === 'function') {
      const stream = captureFn.call(canvas, 15);
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setScreenShareLabel('Talkcob Preview Window');
    }
  };

  const startScreenShare = async (skipServerPermCheck = false) => {
    setScreenShareNotice(null);
    const canStreamScreen = connectedVoiceChannelPerms
      ? connectedVoiceChannelPerms.streamVideo
      : activeServerPerms.permissions.shareScreen;
    if (!skipServerPermCheck && connectedVoiceChannel && !canStreamScreen) {
      setScreenShareNotice('Your role or channel permissions do not allow streaming in this channel.');
      return;
    }

    stopScreenShare();

    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        const quality = currentUser?.streamQuality || '1080p60';
        const videoConstraints: MediaTrackConstraints =
          quality === '720p30'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
            : quality === 'source'
            ? { frameRate: { ideal: 60 } }
            : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } };
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
          audio: true,
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener('ended', () => {
            stopScreenShare();
          });
        }
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setScreenShareLabel(videoTrack?.label || 'Your Screen');
        return;
      }
      throw new Error('Display capture unavailable');
    } catch {
      startCanvasPreviewScreen();
      setScreenShareNotice(
        'Browser or embedded preview permissions blocked native screen capture, so Talkcob started an interactive live preview stream.'
      );
    }
  };

  const handleToggleScreenShare = () => {
    if (screenStream) {
      stopScreenShare();
      setScreenShareNotice(null);
      return;
    }
    void startScreenShare();
  };

  const handleStartDmCall = (peerId: string, withScreenShare = false) => {
    if (peerId === currentUser.id || !users[peerId]) return;
    if (connectedVoiceChannelId) {
      sendWs('voice:leave', { userId: currentUser.id });
      setChannels((prev) =>
        prev.map((c) =>
          c.type === 'voice'
            ? {
                ...c,
                voiceParticipantIds: (c.voiceParticipantIds || []).filter(
                  (id) => id !== currentUser.id
                ),
              }
            : c
        )
      );
      setConnectedVoiceChannelId(null);
      setShowingVoiceStage(false);
    }
    soundEngine.playVoiceJoin();
    const callId = `dmcall-${Date.now()}`;
    setIncomingDmCall(null);
    setActiveDmCallPeerId(peerId);
    setShowingDmCallStage(true);
    setDmCallStatus('ringing');
    handleStartDmWithUser(peerId);
    sendWs('dmcall:invite', {
      toUserId: peerId,
      callId,
      withScreenShare,
    });
    void startRealMic();
    unlockRemoteAudio();
    if (withScreenShare) {
      void startScreenShare(true);
    }
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingDmCall) return;
    const { fromUserId, callId, withScreenShare } = incomingDmCall;
    setIncomingDmCall(null);
    if (connectedVoiceChannelId) {
      sendWs('voice:leave', { userId: currentUser.id });
      setChannels((prev) =>
        prev.map((c) =>
          c.type === 'voice'
            ? {
                ...c,
                voiceParticipantIds: (c.voiceParticipantIds || []).filter(
                  (id) => id !== currentUser.id
                ),
              }
            : c
        )
      );
      setConnectedVoiceChannelId(null);
      setShowingVoiceStage(false);
    }
    soundEngine.playVoiceJoin();
    setActiveDmCallPeerId(fromUserId);
    setShowingDmCallStage(true);
    setDmCallStatus('connected');
    handleStartDmWithUser(fromUserId);
    sendWs('dmcall:accept', { toUserId: fromUserId, callId });
    void startRealMic();
    unlockRemoteAudio();
    if (withScreenShare) {
      // Peer is already sharing or about to share; keep audio open
    }
  };

  const handleDeclineIncomingCall = () => {
    if (!incomingDmCall) return;
    sendWs('dmcall:decline', {
      toUserId: incomingDmCall.fromUserId,
      callId: incomingDmCall.callId,
    });
    setIncomingDmCall(null);
  };

  const handleLeaveDmCall = () => {
    const prevPeer = activeDmCallPeerId;
    soundEngine.playVoiceLeave();
    stopRealMic();
    stopCamera();
    stopScreenShare();
    setScreenShareNotice(null);
    setActiveDmCallPeerId(null);
    setShowingDmCallStage(false);
    setDmCallStatus(null);
    if (prevPeer) {
      sendWs('dmcall:end', { toUserId: prevPeer });
    }
  };

  const handleJoinVoiceChannel = (channelId: string) => {
    const targetCh = channels.find((c) => c.id === channelId);
    const targetSrv = targetCh ? servers.find((s) => s.id === targetCh.serverId) || activeServer : activeServer;
    if (targetCh && targetSrv) {
      const chPerms = resolveChannelPermissions(targetSrv, targetCh, currentUser.id);
      if (!chPerms.connect) return;
      const participants = targetCh.voiceParticipantIds || [];
      if (
        targetCh.userLimit &&
        targetCh.userLimit > 0 &&
        participants.length >= targetCh.userLimit &&
        !participants.includes(currentUser.id)
      ) {
        return;
      }
    } else if (!activeServerPerms.permissions.connectVoice) {
      return;
    }

    if (activeDmCallPeerId) {
      sendWs('dmcall:end', { toUserId: activeDmCallPeerId });
      setActiveDmCallPeerId(null);
      setShowingDmCallStage(false);
      setDmCallStatus(null);
      stopCamera();
      stopScreenShare();
    }
    if (connectedVoiceChannelId === channelId) {
      setShowingVoiceStage(true);
      setMobileMenuOpen(false);
      void startRealMic();
      unlockRemoteAudio();
      return;
    }
    soundEngine.playVoiceJoin();
    if (currentUser.entranceSound && currentUser.entranceSound !== 'none') {
      soundEngine.playEntranceSound(currentUser.entranceSound);
    }
    setChannels((prev) =>
      prev.map((c) => {
        if (c.type !== 'voice') return c;
        const filtered = (c.voiceParticipantIds || []).filter((id) => id !== currentUser.id);
        if (c.id === channelId) {
          return { ...c, voiceParticipantIds: [...filtered, currentUser.id] };
        }
        return { ...c, voiceParticipantIds: filtered };
      })
    );
    sendWs('voice:join', { channelId, userId: currentUser.id });
    setConnectedVoiceChannelId(channelId);
    setShowingVoiceStage(true);
    setMobileMenuOpen(false);
    void startRealMic();
    unlockRemoteAudio();
  };

  const handleLeaveVoice = () => {
    soundEngine.playVoiceLeave();
    stopRealMic();
    stopCamera();
    stopScreenShare();
    setScreenShareNotice(null);
    setChannels((prev) =>
      prev.map((c) =>
        c.type === 'voice'
          ? {
              ...c,
              voiceParticipantIds: (c.voiceParticipantIds || []).filter(
                (id) => id !== currentUser.id
              ),
            }
          : c
      )
    );
    sendWs('voice:leave', { userId: currentUser.id });
    setConnectedVoiceChannelId(null);
    setShowingVoiceStage(false);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.playMute(next);
  };

  const handleToggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    if (next && !isMuted) {
      setIsMuted(true);
    }
    soundEngine.playMute(next);
  };

  const handleCreateBot = (bot: CustomBot) => {
    setBots((prev) => [bot, ...prev]);
    sendWs('bot:create', { bot });
  };

  const handleUpdateBot = (botId: string, updates: Partial<CustomBot>) => {
    setBots((prev) => prev.map((b) => (b.id === botId ? { ...b, ...updates } : b)));
    sendWs('bot:update', { botId, updates });
  };

  const handleDeleteBot = (botId: string) => {
    setBots((prev) => prev.filter((b) => b.id !== botId));
    sendWs('bot:delete', { botId });
  };

  const handleToggleBotServer = (botId: string, serverId: string) => {
    const target = bots.find((b) => b.id === botId);
    if (!target) return;
    const exists = target.serverIds.includes(serverId);
    const nextServerIds = exists
      ? target.serverIds.filter((id) => id !== serverId)
      : [...target.serverIds, serverId];
    handleUpdateBot(botId, { serverIds: nextServerIds });
  };

  const handleSendMessage = (content: string, replyToId?: string, attachments?: Attachment[]) => {
    const now = new Date();
    const timeStr = `Today at ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    let userMsg: Message = {
      id: msgId,
      channelId: activeFeedId,
      authorId: currentUser.id,
      content,
      timestamp: timeStr,
      replyToId,
      reactions: [],
      attachments,
    };

    const botFollowUps: Message[] = [];
    const logUpdates: Record<string, string[]> = {};
    let blockedByMod = false;

    if (viewMode === 'server' && activeServer) {
      const lower = content.toLowerCase();
      const serverName = activeServer.name;
      const channelName = activeChannel ? `#${activeChannel.name}` : '#general';

      const formatBotText = (tpl: string) =>
        tpl
          .replace(/\{user\}/g, `@${currentUser.username}`)
          .replace(/\{name\}/g, currentUser.name)
          .replace(/\{server\}/g, serverName)
          .replace(/\{channel\}/g, channelName);

      const addReactionFromBot = (emoji: string, botId: string) => {
        const existing = userMsg.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (!existing.userIds.includes(botId)) {
            userMsg = {
              ...userMsg,
              reactions: userMsg.reactions.map((r) =>
                r.emoji === emoji ? { ...r, userIds: [...r.userIds, botId] } : r
              ),
            };
          }
        } else {
          userMsg = {
            ...userMsg,
            reactions: [...userMsg.reactions, { emoji, userIds: [botId] }],
          };
        }
      };

      const activeBots = bots.filter((b) => b.enabled && b.serverIds.includes(activeServer.id));

      for (const bot of activeBots) {
        if (
          bot.moderateBlockedWords &&
          bot.blockedWords.some((w) => w && lower.includes(w.toLowerCase()))
        ) {
          blockedByMod = true;
          botFollowUps.push({
            id: `msg-${Date.now()}-${bot.id}-mod-${Math.random().toString(36).slice(2, 5)}`,
            channelId: activeFeedId,
            authorId: bot.id,
            content: formatBotText(bot.moderationWarningText),
            timestamp: timeStr,
            reactions: [],
          });
          logUpdates[bot.id] = [
            ...(logUpdates[bot.id] || []),
            `Removed blocked message by @${currentUser.username} in ${channelName}`,
          ];
          continue;
        }

        if (bot.autoReactEmoji) {
          addReactionFromBot(bot.autoReactEmoji, bot.id);
        }

        const matchedCmd = bot.commands.find((c) => {
          if (!c.enabled) return false;
          if (c.triggerType === 'command') {
            const tLower = c.trigger.toLowerCase();
            return lower.trim() === tLower || lower.trim().startsWith(`${tLower} `);
          }
          return lower.includes(c.trigger.toLowerCase());
        });

        if (matchedCmd) {
          if (matchedCmd.reactEmoji) {
            addReactionFromBot(matchedCmd.reactEmoji, bot.id);
          }
          if (matchedCmd.pinTriggerMessage) {
            userMsg = { ...userMsg, pinned: true };
          }
          if (matchedCmd.response.trim()) {
            botFollowUps.push({
              id: `msg-${Date.now()}-${bot.id}-${matchedCmd.id}-${Math.random().toString(36).slice(2, 5)}`,
              channelId: activeFeedId,
              authorId: bot.id,
              content: formatBotText(matchedCmd.response),
              timestamp: timeStr,
              replyToId: msgId,
              reactions: [],
            });
          }
          logUpdates[bot.id] = [
            ...(logUpdates[bot.id] || []),
            `Executed "${matchedCmd.trigger}" for @${currentUser.username} in ${channelName}`,
          ];
        } else if (
          bot.autoReplyOnMention &&
          (lower.includes(`@${bot.username.toLowerCase()}`) ||
            lower.includes(`@${bot.name.toLowerCase()}`))
        ) {
          botFollowUps.push({
            id: `msg-${Date.now()}-${bot.id}-mention-${Math.random().toString(36).slice(2, 5)}`,
            channelId: activeFeedId,
            authorId: bot.id,
            content: formatBotText(bot.mentionReplyText),
            timestamp: timeStr,
            replyToId: msgId,
            reactions: [],
          });
          logUpdates[bot.id] = [
            ...(logUpdates[bot.id] || []),
            `Replied to @mention by @${currentUser.username} in ${channelName}`,
          ];
        }
      }
    }

    const outgoingBatch = [...(blockedByMod ? [] : [userMsg]), ...botFollowUps];

    setMessages((prev) => [...prev, ...outgoingBatch]);

    const mappedLogs: Record<string, CustomBotLogEntry[]> = {};
    if (Object.keys(logUpdates).length > 0) {
      for (const [botId, entries] of Object.entries(logUpdates)) {
        mappedLogs[botId] = entries.map((summary, idx) => ({
          id: `blog-${Date.now()}-${idx}`,
          summary,
          timestamp: timeStr.replace('Today at ', ''),
        }));
      }
      setBots((prev) =>
        prev.map((b) => {
          const entries = mappedLogs[b.id];
          if (!entries) return b;
          return { ...b, logs: [...entries, ...b.logs].slice(0, 25) };
        })
      );
    }

    const msgPayload = {
      messages: outgoingBatch,
      botLogs: Object.keys(mappedLogs).length > 0 ? mappedLogs : undefined,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendWs('message:send', msgPayload);
    } else {
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload),
      }).catch(() => {});
    }

    soundEngine.playMessageSend();
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newContent, edited: true } : m))
    );
    sendWs('message:edit', { messageId, content: newContent });
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    sendWs('message:delete', { messageId });
  };

  const handleBulkDeleteMessages = (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    const delSet = new Set(messageIds);
    setMessages((prev) => prev.filter((m) => !delSet.has(m.id)));
    sendWs('message:bulkDelete', { messageIds });
  };

  const handleToggleReaction = (messageId: string, emoji: string, isSuper = false) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (!existing) {
          return {
            ...m,
            reactions: [
              ...m.reactions,
              {
                emoji,
                userIds: [currentUser.id],
                ...(isSuper ? { superUserIds: [currentUser.id] } : {}),
              },
            ],
          };
        }
        const hasReacted = existing.userIds.includes(currentUser.id);
        const nextUserIds = hasReacted
          ? existing.userIds.filter((id) => id !== currentUser.id)
          : [...existing.userIds, currentUser.id];
        const prevSuper = existing.superUserIds || [];
        const nextSuper = hasReacted
          ? prevSuper.filter((id) => id !== currentUser.id)
          : isSuper
          ? Array.from(new Set([...prevSuper, currentUser.id]))
          : prevSuper;

        return {
          ...m,
          reactions:
            nextUserIds.length === 0
              ? m.reactions.filter((r) => r.emoji !== emoji)
              : m.reactions.map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        userIds: nextUserIds,
                        ...(nextSuper.length > 0 ? { superUserIds: nextSuper } : { superUserIds: undefined }),
                      }
                    : r
                ),
        };
      })
    );
    sendWs('message:react', { messageId, emoji, userId: currentUser.id, isSuper });
  };

  const handleTogglePin = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, pinned: !m.pinned } : m))
    );
    sendWs('message:pin', { messageId });
  };

  const activePinnedStickers: PinnedSticker[] = useMemo(() => {
    if (!activeFeedId) return [];
    if (viewMode === 'home') {
      return dmPinnedStickers[activeFeedId] || [];
    }
    return activeChannel?.pinnedStickers || [];
  }, [activeFeedId, viewMode, dmPinnedStickers, activeChannel?.pinnedStickers]);

  const handlePinSticker = (sticker: StickerItem) => {
    if (!activeFeedId) return;
    const pinned: PinnedSticker = {
      id: `pstk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: sticker.title || 'Sticker',
      url: sticker.url,
      pinnedByUserId: currentUser.id,
      pinnedAt: 'Just now',
    };
    if (viewMode === 'home') {
      setDmPinnedStickers((prev) => {
        const cur = prev[activeFeedId] || [];
        return {
          ...prev,
          [activeFeedId]: [pinned, ...cur.filter((s) => s.url !== pinned.url)].slice(0, 24),
        };
      });
    } else {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeFeedId
            ? {
                ...c,
                pinnedStickers: [
                  pinned,
                  ...(c.pinnedStickers || []).filter((s) => s.url !== pinned.url),
                ].slice(0, 24),
              }
            : c
        )
      );
    }
    sendWs('sticker:pin', { feedId: activeFeedId, sticker: pinned });
  };

  const handleUnpinSticker = (stickerUrlOrId: string) => {
    if (!activeFeedId) return;
    if (viewMode === 'home') {
      setDmPinnedStickers((prev) => ({
        ...prev,
        [activeFeedId]: (prev[activeFeedId] || []).filter(
          (s) => s.url !== stickerUrlOrId && s.id !== stickerUrlOrId
        ),
      }));
    } else {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeFeedId
            ? {
                ...c,
                pinnedStickers: (c.pinnedStickers || []).filter(
                  (s) => s.url !== stickerUrlOrId && s.id !== stickerUrlOrId
                ),
              }
            : c
        )
      );
    }
    sendWs('sticker:unpin', { feedId: activeFeedId, stickerUrlOrId });
  };

  const handleToggleServerBoost = (serverId: string) => {
    setServers((prev) =>
      prev.map((s) => {
        if (s.id !== serverId) return s;
        const current = s.boostUserIds || [];
        const next = current.includes(currentUser.id)
          ? current.filter((id) => id !== currentUser.id)
          : [...current, currentUser.id];
        return { ...s, boostUserIds: next };
      })
    );
    sendWs('server:toggleBoost', { serverId, userId: currentUser.id });
  };

  const handlePlaySoundboard = (clipId: string) => {
    if (!rtcRoomId) return;
    sendWs('voice:soundboard', {
      fromUserId: currentUser.id,
      roomId: rtcRoomId,
      clipId,
    });
  };

  // Server & Channel & Role Management
  const handleCreateServer = (name: string, accentColor: string, description: string) => {
    const id = `srv-${Date.now()}`;
    const shortName = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const newServer: Server = {
      id,
      name,
      shortName: shortName || 'TC',
      description,
      accentColor,
      ownerId: currentUser.id,
      memberIds: Object.keys(users),
      roles: DEFAULT_SERVER_ROLES,
      memberRoles: {},
      inviteCode: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
    const generalId = `ch-${Date.now()}-gen`;
    const voiceId = `ch-${Date.now()}-vc`;
    const createdChannels: Channel[] = [
      {
        id: generalId,
        serverId: id,
        name: 'general',
        type: 'text',
        category: 'Community',
        topic: `Welcome to ${name}!`,
      },
      {
        id: voiceId,
        serverId: id,
        name: 'Voice Lounge',
        type: 'voice',
        category: 'Voice Channels',
        voiceParticipantIds: [],
      },
    ];

    setServers((prev) => [...prev, newServer]);
    setChannels((prev) => [...prev, ...createdChannels]);
    sendWs('server:create', { server: newServer, channels: createdChannels });
    setViewMode('server');
    setActiveServerId(id);
    setActiveChannelId(generalId);
  };

  const handleCreateChannel = (
    name: string,
    type: 'text' | 'voice',
    topic: string,
    category?: string
  ) => {
    if (!activeServer || !activeServerPerms.canAddChannels) return;
    const newChannel: Channel = {
      id: `ch-${Date.now()}`,
      serverId: activeServer.id,
      name,
      type,
      category: category || (type === 'voice' ? 'Voice Channels' : 'Community'),
      topic: topic || undefined,
      voiceParticipantIds: type === 'voice' ? [] : undefined,
    };
    setChannels((prev) => [...prev, newChannel]);
    sendWs('channel:create', { channel: newChannel });
    if (type === 'text') {
      setActiveChannelId(newChannel.id);
      setShowingVoiceStage(false);
    }
  };

  const handleDeleteChannel = (channelId: string) => {
    const targetCh = channels.find((c) => c.id === channelId);
    const chPerms =
      activeServer && targetCh ? resolveChannelPermissions(activeServer, targetCh, currentUser.id) : null;
    if (!activeServerPerms.canAddChannels && !chPerms?.manageChannel) return;
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    sendWs('channel:delete', { channelId });
    if (activeChannelId === channelId) {
      const remaining = serverChannels.find((c) => c.id !== channelId && c.type === 'text');
      if (remaining) setActiveChannelId(remaining.id);
    }
  };

  const handleUpdateChannel = (channelId: string, updates: Partial<Channel>) => {
    const targetCh = channels.find((c) => c.id === channelId);
    const chPerms =
      activeServer && targetCh ? resolveChannelPermissions(activeServer, targetCh, currentUser.id) : null;
    if (
      !activeServerPerms.canAddChannels &&
      !chPerms?.manageChannel &&
      !chPerms?.managePermissions
    ) {
      return;
    }
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c)));
    sendWs('channel:update', { channelId, updates });
  };

  const handleUpdateServer = (serverId: string, updates: Partial<Server>) => {
    setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, ...updates } : s)));
    sendWs('server:update', { serverId, updates });
  };

  const handleToggleMemberRole = (serverId: string, userId: string, roleId: string) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv) return;
    const currentRoles = srv.memberRoles[userId] || [];
    const exists = currentRoles.includes(roleId);
    const nextRoles = exists
      ? currentRoles.filter((id) => id !== roleId)
      : [...currentRoles, roleId];
    handleUpdateServer(serverId, {
      memberRoles: {
        ...srv.memberRoles,
        [userId]: nextRoles,
      },
    });
  };

  const handleCreateRole = (serverId: string, role: ServerRole) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv) return;
    handleUpdateServer(serverId, { roles: [...srv.roles, role] });
  };

  const handleUpdateRole = (serverId: string, roleId: string, updates: Partial<ServerRole>) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv) return;
    handleUpdateServer(serverId, {
      roles: srv.roles.map((r) => (r.id === roleId ? { ...r, ...updates } : r)),
    });
  };

  const handleDeleteRole = (serverId: string, roleId: string) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv) return;
    handleUpdateServer(serverId, {
      roles: srv.roles.filter((r) => r.id !== roleId),
    });
  };

  const handleLeaveServer = (serverId: string) => {
    if (serverId === HOME_SERVER_ID) return;
    setServers((prev) => prev.filter((s) => s.id !== serverId));
    setChannels((prev) => prev.filter((c) => c.serverId !== serverId));
    sendWs('server:delete', { serverId });
    setActiveServerId(HOME_SERVER_ID);
    setActiveChannelId('ch-hq-general');
    setViewMode('server');
  };

  const handleSaveUserProfile = (updates: {
    name?: string;
    username?: string;
    email?: string;
    pronouns?: string;
    customStatus?: string;
    bio?: string;
    status?: UserStatus;
    avatar?: string;
    bannerColor?: string;
    socialLinks?: SocialLink[];
    hasFreeNitro?: boolean;
    avatarDecoration?: AvatarDecorationId;
    profileEffect?: ProfileEffectId;
    nameplateGradient?: string;
    customBannerUrl?: string;
    streamQuality?: '720p30' | '1080p60' | 'source';
    entranceSound?: string;
    serverNicknames?: Record<string, string>;
  }) => {
    setUsers((prev) => ({
      ...prev,
      [currentUser.id]: { ...prev[currentUser.id], ...updates },
    }));
    sendWs('user:update', { userId: currentUser.id, updates });
  };

  const handleResetWorkspace = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PREFS_STORAGE_KEY);
    setAuthState({
      signedInUserId: null,
      savedAccountIds: [],
      hasSignedUpBefore: false,
    });
    setTheme('dark');
    setSoundEnabled(true);
    setConnectedVoiceChannelId(null);
    setShowingVoiceStage(false);
    setViewMode('server');
    setHomeSubView('friends');
    setActiveServerId(HOME_SERVER_ID);
    setActiveChannelId('ch-hq-general');
  };

  const switchActiveAccount = (uid: string) => {
    const target = users[uid];
    if (!target || target.isBanned) return;
    if (target.isPlatformOwner || target.isPlatformAdmin || target.id === PLATFORM_OWNER_ID) {
      return;
    }
    setActiveUserId(uid);
    setAuthState((prev) => ({
      ...prev,
      signedInUserId: uid,
      savedAccountIds: prev.savedAccountIds.includes(uid)
        ? prev.savedAccountIds
        : [...prev.savedAccountIds, uid],
    }));
    sendWs('client:identify', { userId: uid });
  };

  const handleSignUp = async (payload: SignUpPayload): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        user?: User;
        state?: SharedWorkspacePayload;
        error?: string;
      };
      if (!res.ok || !data.user) {
        return data.error || 'Could not create account.';
      }
      const newUserId = data.user.id;
      signedInUserIdRef.current = newUserId;
      activeUserIdRef.current = newUserId;
      setDmThreads([]);
      setActiveDmId('');
      if (data.state) {
        applySharedState(data.state);
      }
      setActiveUserId(newUserId);
      setAuthState((prev) => ({
        signedInUserId: newUserId,
        savedAccountIds: prev.savedAccountIds.includes(newUserId)
          ? prev.savedAccountIds
          : [...prev.savedAccountIds, newUserId],
        hasSignedUpBefore: true,
      }));
      sendWs('client:identify', { userId: newUserId });
      setViewMode('server');
      setActiveServerId(HOME_SERVER_ID);
      setActiveChannelId('ch-hq-general');
      return null;
    } catch {
      return 'Could not connect to Talkcob server.';
    }
  };

  const handleLogIn = async (
    usernameOrId: string,
    password: string,
    skipPasswordForSaved?: boolean
  ): Promise<string | null> => {
    try {
      const endpoint = skipPasswordForSaved ? '/api/auth/session' : '/api/auth/login';
      const body = skipPasswordForSaved
        ? { userId: usernameOrId }
        : { username: usernameOrId, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        user?: User;
        state?: SharedWorkspacePayload;
        error?: string;
      };
      if (!res.ok || !data.user) {
        return data.error || 'Invalid credentials.';
      }
      const matchedId = data.user.id;
      signedInUserIdRef.current = matchedId;
      activeUserIdRef.current = matchedId;
      setDmThreads([]);
      setActiveDmId('');
      if (data.state) {
        applySharedState(data.state);
      }
      setActiveUserId(matchedId);
      setAuthState((prev) => ({
        signedInUserId: matchedId,
        savedAccountIds: prev.savedAccountIds.includes(matchedId)
          ? prev.savedAccountIds
          : [...prev.savedAccountIds, matchedId],
        hasSignedUpBefore: true,
      }));
      sendWs('client:identify', { userId: matchedId });
      return null;
    } catch {
      return 'Could not connect to Talkcob server.';
    }
  };

  const handleLogOut = () => {
    if (activeDmCallPeerId) {
      sendWs('dmcall:end', { toUserId: activeDmCallPeerId });
    }
    stopRealMic();
    stopCamera();
    stopScreenShare();
    if (connectedVoiceChannelId) {
      handleLeaveVoice();
    }
    setIncomingDmCall(null);
    setDmCallStatus(null);
    setActiveDmCallPeerId(null);
    setShowingDmCallStage(false);
    setDmThreads([]);
    setActiveDmId('');
    setSettingsOpen(false);
    setServerSettingsOpen(false);
    setAuthState((prev) => ({
      ...prev,
      signedInUserId: null,
    }));
  };

  const usersWithBots = useMemo(() => {
    const combined: Record<string, User> = { ...users };
    for (const bot of bots) {
      combined[bot.id] = {
        id: bot.id,
        name: bot.name,
        username: bot.username,
        avatar: bot.avatar,
        accentColor: bot.accentColor,
        bannerColor: bot.accentColor,
        status: bot.enabled ? 'online' : 'offline',
        customStatus: bot.statusText,
        bio: bot.bio,
        role: 'Bot',
        isBot: true,
        joinedAt: bot.createdAt,
      };
    }
    return combined;
  }, [users, bots]);

  const activeServerBotsAsUsers = useMemo(
    () =>
      activeServer
        ? bots
            .filter((b) => b.serverIds.includes(activeServer.id))
            .map((b) => usersWithBots[b.id])
            .filter(Boolean)
        : [],
    [activeServer, bots, usersWithBots]
  );

  const serverMembers = activeServer
    ? [
        ...activeServer.memberIds.map((id) => users[id]).filter(Boolean),
        ...activeServerBotsAsUsers,
      ]
    : [];
  const serverCategories = Array.from(new Set(serverChannels.map((c) => c.category)));

  const canAccessAdminPanel = Boolean(
    currentUser.isPlatformOwner || currentUser.isPlatformAdmin || currentUser.id === PLATFORM_OWNER_ID
  );

  if (!authState.signedInUserId || !users[authState.signedInUserId] || users[authState.signedInUserId]?.isBanned) {
    return (
      <AuthPage
        initialMode={authState.hasSignedUpBefore ? 'login' : 'signup'}
        users={users}
        savedAccountIds={authState.savedAccountIds}
        banNotice={banNotice}
        onDismissBanNotice={() => setBanNotice(null)}
        onSignUp={handleSignUp}
        onLogIn={async (u, p, skip) => {
          const err = await handleLogIn(u, p, skip);
          if (!err) setBanNotice(null);
          return err;
        }}
      />
    );
  }

  const toastSender = incomingToastReq ? users[incomingToastReq.fromUserId] : undefined;
  const incomingCaller = incomingDmCall ? users[incomingDmCall.fromUserId] : undefined;
  const canOpenChannelSettingsModal = Boolean(
    activeServerPerms.canAccessServerSettings ||
      (serverSettingsInitialTab === 'channels' &&
        activeServer &&
        serverChannels.some((c) => {
          const p = resolveChannelPermissions(activeServer, c, currentUser.id);
          return p.manageChannel || p.managePermissions;
        }))
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex select-text relative">
      {/* Live Two-Way Remote Audio Engine */}
      <RemoteAudioMount
        remoteAudioStreams={remoteAudioStreams}
        isDeafened={isDeafened}
        registerAudioElement={registerAudioElement}
      />

      {/* Incoming DM Call Toast */}
      {incomingDmCall && incomingCaller && (
        <div
          role="status"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#23A55A] bg-[#18191D] text-white shadow-2xl p-3.5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Avatar
              name={incomingCaller.name}
              src={incomingCaller.avatar}
              accentColor={incomingCaller.accentColor}
              size="md"
              speaking
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#23A55A]">
                Incoming Voice Call
              </div>
              <div className="text-sm font-semibold truncate">{incomingCaller.name}</div>
              <div className="text-xs text-[#949BA4] truncate">@{incomingCaller.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAcceptIncomingCall}
              className="flex-1 py-2 px-3 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
            <button
              onClick={handleDeclineIncomingCall}
              className="flex-1 py-2 px-3 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Live incoming friend request toast banner */}
      {incomingToastReq && toastSender && (
        <div
          role="status"
          className="fixed top-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#23A55A]/50 bg-[#1E1F22] text-white shadow-2xl p-3.5 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={toastSender.name}
                src={toastSender.avatar}
                accentColor={toastSender.accentColor}
                size="sm"
                status={toastSender.status}
                showStatus
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#23A55A] flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Incoming Friend Request</span>
                </div>
                <div className="text-sm font-semibold truncate">
                  {toastSender.name}{' '}
                  <span className="text-xs text-[#949BA4] font-normal">
                    @{toastSender.username}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIncomingToastReq(null)}
              aria-label="Dismiss notification"
              className="text-[#949BA4] hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleAcceptFriendRequest(incomingToastReq.id)}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
            <button
              onClick={() => void handleRemoveFriendRequest(incomingToastReq.id)}
              className="py-1.5 px-2.5 rounded-lg bg-[#2B2D31] hover:bg-[#383A40] text-[#F87171] text-xs font-semibold"
            >
              Decline
            </button>
            <button
              onClick={() => {
                setIncomingToastReq(null);
                handleSelectHome();
              }}
              className="py-1.5 px-2.5 rounded-lg bg-[#2B2D31] hover:bg-[#383A40] text-[#B5BAC1] text-xs font-semibold"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Desktop Left Navigation (Server Rail + Channel Sidebar) */}
      <div className="hidden md:flex h-full shrink-0">
        <ServerRail
          servers={servers}
          activeServerId={
            viewMode === 'home'
              ? 'home'
              : viewMode === 'discover'
              ? 'discover'
              : viewMode === 'bots'
              ? 'bots'
              : viewMode === 'ai'
              ? 'ai'
              : viewMode === 'admin'
              ? 'admin'
              : activeServer?.id || 'home'
          }
          onSelectHome={handleSelectHome}
          onSelectServer={handleSelectServer}
          onSelectDiscover={() => {
            setViewMode('discover');
            setShowingVoiceStage(false);
          }}
          onSelectBots={() => {
            setViewMode('bots');
            setShowingVoiceStage(false);
          }}
          onSelectAi={() => {
            setViewMode('ai');
            setShowingVoiceStage(false);
          }}
          onSelectAdmin={() => {
            setViewMode('admin');
            setShowingVoiceStage(false);
          }}
          canAccessAdminPanel={canAccessAdminPanel}
          onOpenCreateServer={() => setCreateServerOpen(true)}
          unreadByServer={unreadByServer}
          dmUnreadCount={dmUnreadCount + pendingIncomingCount}
          inVoice={Boolean(connectedVoiceChannelId)}
          theme={theme}
        />

        <ChannelSidebar
          mode={viewMode}
          server={activeServer}
          channels={serverChannels}
          activeChannelId={activeChannel?.id || activeChannelId}
          onSelectChannel={handleSelectChannel}
          onJoinVoiceChannel={handleJoinVoiceChannel}
          dmThreads={dmThreads}
          activeDmId={activeDmId}
          homeSubView={homeSubView}
          onSelectFriends={() => {
            setViewMode('home');
            setHomeSubView('friends');
            setShowingVoiceStage(false);
            setMobileMenuOpen(false);
          }}
          pendingIncomingCount={pendingIncomingCount}
          onSelectDm={handleSelectDm}
          users={users}
          currentUser={currentUser}
          connectedVoiceChannel={connectedVoiceChannel}
          activeDmCallPeer={activeDmCallPeer}
          onLeaveVoice={handleLeaveVoice}
          onFocusVoiceStage={() => {
            if (connectedVoiceChannel) {
              setViewMode('server');
              setActiveServerId(connectedVoiceChannel.serverId);
              setShowingVoiceStage(true);
            }
          }}
          onLeaveDmCall={handleLeaveDmCall}
          onFocusDmCall={() => {
            if (activeDmCallPeerId) {
              handleStartDmWithUser(activeDmCallPeerId);
              setShowingDmCallStage(true);
            }
          }}
          isScreenSharing={Boolean(screenStream)}
          onToggleScreenShare={handleToggleScreenShare}
          isMuted={isMuted}
          isDeafened={isDeafened}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenServerSettings={() => {
            setServerSettingsInitialTab('overview');
            setServerSettingsChannelId(null);
            setServerSettingsOpen(true);
          }}
          onOpenChannelPermissions={(channelId) => {
            setServerSettingsInitialTab('channels');
            setServerSettingsChannelId(channelId);
            setServerSettingsOpen(true);
          }}
          onOpenQuickSwitcher={() => setQuickSwitcherOpen(true)}
          onOpenCreateChannel={(defType) => setCreateChannelType(defType || 'text')}
          onOpenInvite={() => setInviteOpen(true)}
          onLeaveServer={handleLeaveServer}
          onToggleServerBoost={handleToggleServerBoost}
          onChangeStatus={(status: UserStatus) => {
            handleSaveUserProfile({ status });
          }}
          speakingUserIds={speakingUserIds}
          theme={theme}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-full" onClick={(e) => e.stopPropagation()}>
            <ServerRail
              servers={servers}
              activeServerId={
                viewMode === 'home'
                  ? 'home'
                  : viewMode === 'discover'
                  ? 'discover'
                  : viewMode === 'bots'
                  ? 'bots'
                  : viewMode === 'ai'
                  ? 'ai'
                  : viewMode === 'admin'
                  ? 'admin'
                  : activeServer?.id || 'home'
              }
              onSelectHome={handleSelectHome}
              onSelectServer={handleSelectServer}
              onSelectDiscover={() => {
                setViewMode('discover');
                setShowingVoiceStage(false);
                setMobileMenuOpen(false);
              }}
              onSelectBots={() => {
                setViewMode('bots');
                setShowingVoiceStage(false);
                setMobileMenuOpen(false);
              }}
              onSelectAi={() => {
                setViewMode('ai');
                setShowingVoiceStage(false);
                setMobileMenuOpen(false);
              }}
              onSelectAdmin={() => {
                setViewMode('admin');
                setShowingVoiceStage(false);
                setMobileMenuOpen(false);
              }}
              canAccessAdminPanel={canAccessAdminPanel}
              onOpenCreateServer={() => {
                setMobileMenuOpen(false);
                setCreateServerOpen(true);
              }}
              unreadByServer={unreadByServer}
              dmUnreadCount={dmUnreadCount + pendingIncomingCount}
              inVoice={Boolean(connectedVoiceChannelId)}
              theme={theme}
            />
            <ChannelSidebar
              mode={viewMode}
              server={activeServer}
              channels={serverChannels}
              activeChannelId={activeChannel?.id || activeChannelId}
              onSelectChannel={handleSelectChannel}
              onJoinVoiceChannel={handleJoinVoiceChannel}
              dmThreads={dmThreads}
              activeDmId={activeDmId}
              homeSubView={homeSubView}
              onSelectFriends={() => {
                setViewMode('home');
                setHomeSubView('friends');
                setShowingVoiceStage(false);
                setMobileMenuOpen(false);
              }}
              pendingIncomingCount={pendingIncomingCount}
              onSelectDm={handleSelectDm}
              users={users}
              currentUser={currentUser}
              connectedVoiceChannel={connectedVoiceChannel}
              activeDmCallPeer={activeDmCallPeer}
              onLeaveVoice={handleLeaveVoice}
              onFocusVoiceStage={() => {
                if (connectedVoiceChannel) {
                  setViewMode('server');
                  setActiveServerId(connectedVoiceChannel.serverId);
                  setShowingVoiceStage(true);
                  setMobileMenuOpen(false);
                }
              }}
              onLeaveDmCall={handleLeaveDmCall}
              onFocusDmCall={() => {
                if (activeDmCallPeerId) {
                  handleStartDmWithUser(activeDmCallPeerId);
                  setShowingDmCallStage(true);
                  setMobileMenuOpen(false);
                }
              }}
              isScreenSharing={Boolean(screenStream)}
              onToggleScreenShare={handleToggleScreenShare}
              isMuted={isMuted}
              isDeafened={isDeafened}
              onToggleMute={handleToggleMute}
              onToggleDeafen={handleToggleDeafen}
              onOpenSettings={() => {
                setMobileMenuOpen(false);
                setSettingsOpen(true);
              }}
              onOpenServerSettings={() => {
                setMobileMenuOpen(false);
                setServerSettingsInitialTab('overview');
                setServerSettingsChannelId(null);
                setServerSettingsOpen(true);
              }}
              onOpenChannelPermissions={(channelId) => {
                setMobileMenuOpen(false);
                setServerSettingsInitialTab('channels');
                setServerSettingsChannelId(channelId);
                setServerSettingsOpen(true);
              }}
              onOpenQuickSwitcher={() => {
                setMobileMenuOpen(false);
                setQuickSwitcherOpen(true);
              }}
              onOpenCreateChannel={(defType) => {
                setMobileMenuOpen(false);
                setCreateChannelType(defType || 'text');
              }}
              onOpenInvite={() => {
                setMobileMenuOpen(false);
                setInviteOpen(true);
              }}
              onLeaveServer={handleLeaveServer}
              onToggleServerBoost={handleToggleServerBoost}
              onChangeStatus={(status: UserStatus) => {
                handleSaveUserProfile({ status });
              }}
              speakingUserIds={speakingUserIds}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* Center Content Viewport */}
      {viewMode === 'admin' && canAccessAdminPanel ? (
        <AdminPanelView
          currentUser={currentUser}
          users={users}
          servers={servers}
          channels={channels}
          onOpenServer={handleSelectServer}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          refreshSignal={adminRefreshSignal}
          theme={theme}
        />
      ) : viewMode === 'discover' ? (
        <DiscoverView
          existingServers={servers}
          onOpenServer={handleSelectServer}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          theme={theme}
        />
      ) : viewMode === 'ai' ? (
        <AiHelpView
          currentUser={currentUser}
          activeServerName={activeServer?.name}
          activeChannelName={activeChannel?.name}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          theme={theme}
        />
      ) : viewMode === 'bots' ? (
        <BotStudioView
          bots={bots}
          servers={servers}
          onCreateBot={handleCreateBot}
          onUpdateBot={handleUpdateBot}
          onDeleteBot={handleDeleteBot}
          onOpenServer={handleSelectServer}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          theme={theme}
        />
      ) : viewMode === 'home' && homeSubView === 'friends' && !showingVoiceStage ? (
        <FriendsView
          currentUser={currentUser}
          users={users}
          friendIds={currentFriendIds}
          friendRequests={friendRequests}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptRequest={handleAcceptFriendRequest}
          onRemoveRequest={handleRemoveFriendRequest}
          onRemoveFriend={handleRemoveFriend}
          onMessageFriend={handleStartDmWithUser}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          theme={theme}
        />
      ) : (
        <ChatArea
          channel={viewMode === 'server' ? activeChannel : undefined}
          activeServer={viewMode === 'server' ? activeServer : undefined}
          dmPeer={dmPeer}
          messages={channelMessages}
          allChannelMessages={channelMessages}
          users={usersWithBots}
          currentUser={currentUser}
          pinnedStickers={activePinnedStickers}
          onPinSticker={handlePinSticker}
          onUnpinSticker={handleUnpinSticker}
          showMemberList={showMemberList}
          onToggleMemberList={() => setShowMemberList((prev) => !prev)}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onBulkDeleteMessages={handleBulkDeleteMessages}
          onToggleReaction={handleToggleReaction}
          onTogglePin={handleTogglePin}
          onPlaySoundboard={handlePlaySoundboard}
          onSelectUser={(u) => setProfileUser(u)}
          onTyping={() => {
            if (activeFeedId) {
              sendWs('typing:start', {
                channelId: activeFeedId,
                userId: currentUser.id,
                userName: currentUser.name,
              });
            }
          }}
          connectedVoiceChannel={connectedVoiceChannel}
          showingVoiceStage={showingVoiceStage}
          onToggleVoiceStage={() => setShowingVoiceStage((prev) => !prev)}
          onLeaveVoice={handleLeaveVoice}
          activeDmCallPeer={activeDmCallPeer}
          showingDmCallStage={showingDmCallStage}
          onStartDmCall={handleStartDmCall}
          onToggleDmCallStage={() => setShowingDmCallStage((prev) => !prev)}
          onLeaveDmCall={handleLeaveDmCall}
          isScreenSharing={Boolean(screenStream)}
          screenStream={screenStream}
          screenShareLabel={screenShareLabel}
          screenShareNotice={screenShareNotice}
          remoteScreenStreams={remoteScreenStreams}
          cameraStream={cameraStream}
          cameraEnabled={cameraEnabled}
          cameraError={cameraError}
          onToggleCamera={handleToggleCamera}
          remoteCameraStreams={remoteCameraStreams}
          peerConnectionStates={peerConnectionStates}
          dmCallStatus={dmCallStatus}
          micError={micError}
          audioPlayBlocked={audioPlayBlocked}
          onUnlockAudio={unlockRemoteAudio}
          onToggleScreenShare={handleToggleScreenShare}
          onOpenScreenOverlay={handleChangeScreenOverlayMode}
          onDismissScreenShareNotice={() => setScreenShareNotice(null)}
          serverPermissions={viewMode === 'server' ? activeServerPerms.permissions : undefined}
          channelPermissions={activeChannelPerms}
          voiceChannelPermissions={connectedVoiceChannelPerms}
          isMuted={isMuted}
          isDeafened={isDeafened}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          speakingUserIds={speakingUserIds}
          micEnabled={micEnabled}
          micLevel={micLevel}
          onToggleRealMic={handleToggleRealMic}
          onSimulateSpeak={setSimSpeaking}
          typingUserName={typingUserName}
          isHomeEmpty={viewMode === 'home' && !dmPeer}
          onReturnToHq={() => handleSelectServer(HOME_SERVER_ID)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          theme={theme}
        />
      )}

      {/* Right Member Sidebar */}
      {viewMode === 'server' && showMemberList && !showingVoiceStage && (
        <MemberSidebar
          server={activeServer}
          members={serverMembers}
          currentUserId={currentUser.id}
          onSelectUser={(u) => setProfileUser(u)}
          theme={theme}
          speakingUserIds={speakingUserIds}
        />
      )}

      {/* Discord-style Full Server Settings Modal */}
      {serverSettingsOpen && activeServer && canOpenChannelSettingsModal && (
        <ServerSettingsModal
          server={activeServer}
          channels={channels}
          users={users}
          bots={bots}
          activeUserId={currentUser.id}
          theme={theme}
          initialTab={serverSettingsInitialTab}
          initialChannelId={serverSettingsChannelId}
          onClose={() => {
            setServerSettingsOpen(false);
            setServerSettingsInitialTab('overview');
            setServerSettingsChannelId(null);
          }}
          onUpdateServer={handleUpdateServer}
          onCreateChannel={handleCreateChannel}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
          onToggleMemberRole={handleToggleMemberRole}
          onCreateRole={handleCreateRole}
          onUpdateRole={handleUpdateRole}
          onDeleteRole={handleDeleteRole}
          onToggleBotServer={handleToggleBotServer}
          onOpenBotStudio={() => {
            setViewMode('bots');
            setShowingVoiceStage(false);
          }}
          onDeleteServer={handleLeaveServer}
          onSwitchActiveUser={switchActiveAccount}
        />
      )}

      {/* Modals */}
      {createServerOpen && (
        <CreateServerModal
          theme={theme}
          onClose={() => setCreateServerOpen(false)}
          onCreate={handleCreateServer}
        />
      )}

      {createChannelType && activeServerPerms.canAddChannels && (
        <CreateChannelModal
          theme={theme}
          defaultType={createChannelType}
          existingCategories={serverCategories}
          onClose={() => setCreateChannelType(null)}
          onCreate={handleCreateChannel}
        />
      )}

      {inviteOpen && activeServer && (
        <InviteModal
          server={activeServer}
          theme={theme}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {profileUser && (
        <UserProfileModal
          user={profileUser}
          server={viewMode === 'server' ? activeServer : undefined}
          isCurrentUser={profileUser.id === currentUser.id}
          canManageRoles={activeServerPerms.canAccessServerSettings}
          friendStatus={getFriendStatus(profileUser.id)}
          theme={theme}
          onClose={() => setProfileUser(null)}
          onStartDm={handleStartDmWithUser}
          onAddFriend={(uid) => {
            const target = users[uid];
            if (target) void handleSendFriendRequest(target.username);
          }}
          onAcceptFriend={(uid) => {
            const req = friendRequests.find(
              (r) => r.fromUserId === uid && r.toUserId === currentUser.id
            );
            if (req) void handleAcceptFriendRequest(req.id);
          }}
          onRemoveFriend={(uid) => void handleRemoveFriend(uid)}
          onToggleMemberRole={handleToggleMemberRole}
        />
      )}

      {quickSwitcherOpen && (
        <QuickSwitcherModal
          servers={servers}
          channels={channels}
          dmThreads={dmThreads}
          users={users}
          currentUserId={currentUser.id}
          theme={theme}
          onClose={() => setQuickSwitcherOpen(false)}
          onJumpChannel={(srvId, chId) => {
            setViewMode('server');
            setActiveServerId(srvId);
            setActiveChannelId(chId);
            setShowingVoiceStage(false);
          }}
          onJumpDm={handleStartDmWithUser}
        />
      )}

      {settingsOpen && (
        <UserSettingsModal
          currentUser={currentUser}
          allUsers={users}
          servers={servers}
          friendCount={currentFriendIds.length}
          serverCount={servers.length}
          theme={theme}
          soundEnabled={soundEnabled}
          onChangeTheme={setTheme}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          onSwitchActiveUser={switchActiveAccount}
          onToggleServerBoost={handleToggleServerBoost}
          onSaveProfile={handleSaveUserProfile}
          onOpenFriends={() => {
            setViewMode('home');
            setHomeSubView('friends');
            setShowingVoiceStage(false);
          }}
          onOpenAdminPanel={
            canAccessAdminPanel
              ? () => {
                  setViewMode('admin');
                  setShowingVoiceStage(false);
                }
              : undefined
          }
          onOpenAiHelp={() => {
            setViewMode('ai');
            setShowingVoiceStage(false);
          }}
          onLogOut={handleLogOut}
          onResetData={handleResetWorkspace}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {screenStream && (
        <ScreenShareOverlay
          stream={screenStream}
          sharer={currentUser}
          roomLabel={
            connectedVoiceChannel
              ? `Voice: ${connectedVoiceChannel.name}`
              : activeDmCallPeer
              ? `DM Call · ${activeDmCallPeer.name}`
              : 'Screen Share'
          }
          shareLabel={screenShareLabel}
          mode={screenOverlayMode}
          onChangeMode={handleChangeScreenOverlayMode}
          isMuted={isMuted}
          isDeafened={isDeafened}
          micLevel={micLevel}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
          onReshare={() => void startScreenShare(Boolean(activeDmCallPeerId))}
          onStopShare={handleToggleScreenShare}
          onDisconnectCall={
            connectedVoiceChannelId
              ? handleLeaveVoice
              : activeDmCallPeerId
              ? handleLeaveDmCall
              : undefined
          }
        />
      )}
    </div>
  );
}
