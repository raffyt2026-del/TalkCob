import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckSquare,
  CornerUpLeft,
  Edit3,
  Film,
  Hash,
  HeadphoneOff,
  Headphones,
  ImagePlus,
  Loader2,
  Lock,
  Menu,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Pin,
  Radio,
  Search,
  Send,
  Smile,
  Sparkles,
  Square,
  Sticker,
  Trash2,
  Users,
  Video,
  VideoOff,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { QUICK_EMOJIS } from '../data/seedData';
import {
  AppTheme,
  Attachment,
  Channel,
  Message,
  PinnedSticker,
  ResolvedChannelPermissions,
  RolePermissions,
  Server,
  User,
} from '../types/talkcob';
import { SOUNDBOARD_CLIPS } from '../utils/nitro';
import { soundEngine } from '../utils/sound';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';
import { GifItem, GifPicker } from './GifPicker';
import { InlineScreenShareFrame, ScreenOverlayMode } from './ScreenShareOverlay';
import { StickerItem, StickerPicker } from './StickerPicker';
import { TalkcobIcon } from './TalkcobIcon';
import { TalkcobVideoPlayer } from './TalkcobVideoPlayer';

interface ChatAreaProps {
  channel?: Channel;
  activeServer?: Server;
  dmPeer?: User;
  messages: Message[];
  allChannelMessages: Message[];
  users: Record<string, User>;
  currentUser: User;
  pinnedStickers?: PinnedSticker[];
  onPinSticker?: (sticker: StickerItem) => void;
  onUnpinSticker?: (stickerUrlOrId: string) => void;
  showMemberList: boolean;
  onToggleMemberList: () => void;
  onSendMessage: (content: string, replyToId?: string, attachments?: Attachment[]) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onBulkDeleteMessages?: (messageIds: string[]) => void;
  onToggleReaction: (messageId: string, emoji: string, isSuper?: boolean) => void;
  onTogglePin: (messageId: string) => void;
  onPlaySoundboard?: (clipId: string) => void;
  onSelectUser: (user: User) => void;
  onTyping?: () => void;
  connectedVoiceChannel?: Channel;
  showingVoiceStage: boolean;
  onToggleVoiceStage: () => void;
  onLeaveVoice: () => void;
  activeDmCallPeer?: User;
  showingDmCallStage: boolean;
  onStartDmCall: (peerId: string, withScreenShare?: boolean) => void;
  onToggleDmCallStage: () => void;
  onLeaveDmCall: () => void;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  screenShareLabel?: string | null;
  screenShareNotice?: string | null;
  remoteScreenStreams?: Record<string, MediaStream>;
  cameraStream?: MediaStream | null;
  cameraEnabled?: boolean;
  cameraError?: string | null;
  onToggleCamera?: () => void;
  remoteCameraStreams?: Record<string, MediaStream>;
  peerConnectionStates?: Record<string, RTCPeerConnectionState>;
  dmCallStatus?: 'ringing' | 'connected' | 'declined' | null;
  micError?: string | null;
  audioPlayBlocked?: boolean;
  onUnlockAudio?: () => void;
  onToggleScreenShare: () => void;
  onOpenScreenOverlay?: (mode: ScreenOverlayMode) => void;
  onDismissScreenShareNotice?: () => void;
  serverPermissions?: RolePermissions;
  channelPermissions?: ResolvedChannelPermissions;
  voiceChannelPermissions?: ResolvedChannelPermissions;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  speakingUserIds: string[];
  micEnabled: boolean;
  micLevel: number;
  onToggleRealMic: () => void;
  onSimulateSpeak: (active: boolean) => void;
  typingUserName?: string | null;
  isHomeEmpty?: boolean;
  onReturnToHq?: () => void;
  onOpenMobileMenu: () => void;
  theme: AppTheme;
}

const CameraVideoSurface: React.FC<{ stream: MediaStream; mirrored?: boolean }> = ({
  stream,
  mirrored = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-40 sm:h-44 object-cover rounded-lg bg-black ${
        mirrored ? '-scale-x-100' : ''
      }`}
    />
  );
};

const RemoteScreenTile: React.FC<{ stream: MediaStream; sharer?: User }> = ({
  stream,
  sharer,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#E53935]/50 bg-black shadow-xl">
      <div className="px-3 py-1.5 bg-[#18191D] border-b border-[#2E3035] flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#E53935] text-[9px] font-bold uppercase tracking-wider">
            LIVE SCREEN
          </span>
          <span className="font-semibold">{sharer?.name || 'Member'} is sharing their screen</span>
        </div>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full max-h-[380px] object-contain bg-black"
      />
    </div>
  );
};

function renderFormattedText(text: string, theme: AppTheme): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 rounded font-mono text-[13px] ${
            theme === 'light'
              ? 'bg-black/10 text-[#0F172A]'
              : 'bg-black/30 text-[#F1F5F9]'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  activeServer,
  dmPeer,
  messages,
  allChannelMessages,
  users,
  currentUser,
  pinnedStickers = [],
  onPinSticker,
  onUnpinSticker,
  showMemberList,
  onToggleMemberList,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onBulkDeleteMessages,
  onToggleReaction,
  onTogglePin,
  onPlaySoundboard,
  onSelectUser,
  onTyping,
  connectedVoiceChannel,
  showingVoiceStage,
  onToggleVoiceStage,
  onLeaveVoice,
  activeDmCallPeer,
  showingDmCallStage,
  onStartDmCall,
  onToggleDmCallStage,
  onLeaveDmCall,
  isScreenSharing,
  screenStream,
  screenShareLabel,
  screenShareNotice,
  remoteScreenStreams = {},
  cameraStream = null,
  cameraEnabled = false,
  cameraError = null,
  onToggleCamera,
  remoteCameraStreams = {},
  peerConnectionStates = {},
  dmCallStatus = null,
  micError,
  audioPlayBlocked = false,
  onUnlockAudio,
  onToggleScreenShare,
  onOpenScreenOverlay,
  onDismissScreenShareNotice,
  serverPermissions,
  channelPermissions,
  voiceChannelPermissions,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  speakingUserIds,
  micEnabled,
  micLevel,
  onToggleRealMic,
  onSimulateSpeak,
  typingUserName,
  isHomeEmpty = false,
  onReturnToHq,
  onOpenMobileMenu,
  theme,
}) => {
  const t = THEME_TOKENS[theme] || THEME_TOKENS.dark;
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState<Message | null>(null);
  const [selectDeleteMode, setSelectDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [soundboardOpen, setSoundboardOpen] = useState(false);
  const [emojiMenuForMessage, setEmojiMenuForMessage] = useState<string | null>(null);
  const [superReactMode, setSuperReactMode] = useState(false);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slowmodeRemaining, setSlowmodeRemaining] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef<number>(0);

  const inServerChannel = !dmPeer && !isHomeEmpty;
  const canViewChannel = inServerChannel && channelPermissions ? channelPermissions.viewChannel : true;
  const canReadHistory =
    inServerChannel && channelPermissions ? channelPermissions.readMessageHistory : true;
  const canSend =
    inServerChannel && channelPermissions
      ? channelPermissions.sendMessages
      : inServerChannel && serverPermissions
      ? serverPermissions.sendMessages
      : true;
  const canAttach =
    inServerChannel && channelPermissions
      ? channelPermissions.attachFiles
      : inServerChannel && serverPermissions
      ? serverPermissions.attachFiles
      : true;
  const canReact =
    inServerChannel && channelPermissions
      ? channelPermissions.addReactions
      : inServerChannel && serverPermissions
      ? serverPermissions.addReactions
      : true;
  const canManageMessages =
    inServerChannel && channelPermissions
      ? channelPermissions.manageMessages
      : inServerChannel && serverPermissions
      ? serverPermissions.manageMessages
      : false;
  const canReply =
    inServerChannel && channelPermissions ? channelPermissions.sendMessagesInThreads : true;
  const canShareScreenInVc = connectedVoiceChannel
    ? voiceChannelPermissions
      ? voiceChannelPermissions.streamVideo
      : serverPermissions
      ? serverPermissions.shareScreen
      : true
    : true;
  const canSpeakInVc = connectedVoiceChannel
    ? voiceChannelPermissions
      ? voiceChannelPermissions.speak
      : serverPermissions
      ? serverPermissions.speakVoice
      : true
    : true;

  useEffect(() => {
    if (slowmodeRemaining <= 0) return;
    const timer = setInterval(() => {
      setSlowmodeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [slowmodeRemaining]);

  useEffect(() => {
    setSlowmodeRemaining(0);
    setSelectDeleteMode(false);
    setSelectedDeleteIds([]);
    setConfirmDeleteMsg(null);
    setGifPickerOpen(false);
    setStickerPickerOpen(false);
    setSoundboardOpen(false);
  }, [channel?.id, dmPeer?.id]);

  const isCallingCurrentDm = Boolean(dmPeer && activeDmCallPeer && activeDmCallPeer.id === dmPeer.id);

  const activeTitle = isHomeEmpty
    ? 'Direct Messages'
    : dmPeer
    ? dmPeer.name
    : channel
    ? channel.name
    : 'general';
  const activeTopic = isHomeEmpty
    ? 'Your direct conversations'
    : dmPeer
    ? dmPeer.customStatus || `Direct conversation with @${dmPeer.username}`
    : channel?.topic || '';

  const pinnedMessages = allChannelMessages.filter((m) => m.pinned);

  const filteredMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          users[m.authorId]?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, channel?.id, dmPeer?.id]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend || !canViewChannel) return;
    if (slowmodeRemaining > 0 && !canManageMessages) return;
    if (!draft.trim() && pendingAttachments.length === 0) return;
    onSendMessage(draft.trim(), replyTo?.id, pendingAttachments);
    setDraft('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setReplyTo(null);
    setPendingAttachments([]);
    setComposerEmojiOpen(false);
    if (inServerChannel && channel?.slowmodeSeconds && !canManageMessages) {
      setSlowmodeRemaining(channel.slowmodeSeconds);
    }
  };

  const processSelectedFile = async (file: File, forceType?: 'image' | 'video' | 'sticker') => {
    setUploadError(null);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      setUploadError('Please select a valid image or video file.');
      return;
    }
    const maxBytes = 500 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('File is too large (max 500 MB with Free Nitro).');
      return;
    }

    if (isVideo) {
      setUploadingMedia(true);
      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'video/mp4',
            'X-File-Name': encodeURIComponent(file.name || 'video.mp4'),
          },
          body: file,
        });
        const data = (await res.json()) as {
          url?: string;
          name?: string;
          mimeType?: string;
          size?: number;
          error?: string;
        };
        if (!res.ok || !data.url) {
          setUploadError(data.error || 'Could not upload video.');
          return;
        }
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: data.name || file.name,
            url: data.url!,
            type: 'video',
            mimeType: data.mimeType || file.type,
            size: data.size || file.size,
          },
        ]);
      } catch {
        setUploadError('Video upload failed. Please try again.');
      } finally {
        setUploadingMedia(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (forceType === 'sticker') {
          onSendMessage('', replyTo?.id, [
            {
              id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              url: reader.result as string,
              type: 'sticker',
              mimeType: file.type,
              size: file.size,
            },
          ]);
          setReplyTo(null);
          return;
        }
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            url: reader.result as string,
            type: 'image',
            mimeType: file.type,
            size: file.size,
          },
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
    e.target.value = '';
  };

  const voiceParticipants = (connectedVoiceChannel?.voiceParticipantIds || [])
    .map((id) => users[id])
    .filter(Boolean);

  const remoteScreenEntries = Object.entries(remoteScreenStreams);

  return (
    <main className={`flex-1 min-w-0 min-h-0 h-full flex flex-col ${t.chatBg} ${t.textPrimary}`}>
      {/* Header Bar */}
      <header
        className={`h-12 px-4 shrink-0 flex items-center justify-between gap-4 border-b ${t.headerBg} ${t.border}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation sidebar"
            className={`md:hidden p-1.5 rounded-md text-[#EF4444] ${t.hoverBg}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          {dmPeer ? (
            <Avatar
              name={dmPeer.name}
              src={dmPeer.avatar}
              accentColor={dmPeer.accentColor}
              size="xs"
              status={dmPeer.status}
              showStatus
              statusBorderClass={
                theme === 'light'
                  ? 'border-white'
                  : theme === 'obsidian'
                  ? 'border-[#161920]'
                  : 'border-[#313338]'
              }
            />
          ) : (
            <Hash className="w-5 h-5 shrink-0 text-[#EF4444]" />
          )}

          <h1 className={`font-display font-bold text-[15px] whitespace-nowrap shrink-0 ${t.textPrimary}`}>
            {activeTitle}
          </h1>

          {activeTopic && (
            <>
              <span className={`hidden sm:inline ${t.textMuted}`} aria-hidden="true">
                ·
              </span>
              <p className={`hidden sm:block text-xs truncate ${t.textMuted}`}>
                {activeTopic}
              </p>
            </>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {dmPeer && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => {
                  if (isCallingCurrentDm) {
                    onToggleDmCallStage();
                  } else {
                    onStartDmCall(dmPeer.id, false);
                  }
                }}
                title={isCallingCurrentDm ? 'Toggle Call View' : `Start Voice Call with ${dmPeer.name}`}
                aria-label={isCallingCurrentDm ? 'Toggle DM call stage' : `Start voice call with ${dmPeer.name}`}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  isCallingCurrentDm
                    ? 'bg-[#23A55A] text-white'
                    : `text-[#EF4444] ${t.hoverBg}`
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isCallingCurrentDm ? 'In Call' : 'Call'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isCallingCurrentDm) {
                    onToggleScreenShare();
                  } else {
                    onStartDmCall(dmPeer.id, true);
                  }
                }}
                title={
                  isCallingCurrentDm && isScreenSharing
                    ? 'Stop sharing screen'
                    : `Share Screen with ${dmPeer.name}`
                }
                aria-label="Share screen in direct message call"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  isCallingCurrentDm && isScreenSharing
                    ? 'bg-[#E53935] text-white'
                    : `text-[#EF4444] ${t.hoverBg}`
                }`}
              >
                {isCallingCurrentDm && isScreenSharing ? (
                  <MonitorOff className="w-3.5 h-3.5" />
                ) : (
                  <MonitorUp className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">
                  {isCallingCurrentDm && isScreenSharing ? 'Stop Share' : 'Share Screen'}
                </span>
              </button>
            </div>
          )}

          {connectedVoiceChannel && (
            <button
              onClick={onToggleVoiceStage}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                showingVoiceStage
                  ? 'bg-[#E53935] text-white'
                  : 'bg-[#E53935]/15 text-[#EF4444] hover:bg-[#E53935]/25'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{showingVoiceStage ? 'Back to Chat' : 'Voice Stage'}</span>
            </button>
          )}

          {!isHomeEmpty && !(showingVoiceStage && connectedVoiceChannel) && (
            <button
              type="button"
              onClick={() => {
                setSelectDeleteMode((prev) => !prev);
                setSelectedDeleteIds([]);
              }}
              title="Select messages to delete"
              aria-label="Bulk select messages to delete"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                selectDeleteMode
                  ? 'bg-[#E53935] text-white'
                  : `text-[#EF4444] ${t.hoverBg}`
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{selectDeleteMode ? 'Done' : 'Delete Mode'}</span>
            </button>
          )}

          <div className="relative hidden sm:flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none text-[#EF4444]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages"
              aria-label="Search messages in channel"
              className={`w-40 focus:w-52 transition-all duration-150 h-7 pl-8 pr-6 rounded-md text-xs ${t.inputBg} ${t.textPrimary} placeholder:text-[#80848E] focus:outline-none focus:ring-1 focus:ring-[#E53935]`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 text-[#EF4444] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPins((prev) => !prev)}
              aria-label="Pinned messages"
              title="Pinned Messages"
              className={`p-1.5 rounded-md transition-colors relative text-[#EF4444] ${
                showPins ? t.activeBg : t.hoverBg
              }`}
            >
              <Pin className="w-4 h-4" />
              {pinnedMessages.length + pinnedStickers.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E53935]" />
              )}
            </button>

            {showPins && (
              <div
                className={`absolute right-0 top-10 w-80 max-h-96 overflow-y-auto talkcob-scroll rounded-lg border p-3 shadow-xl z-30 ${t.modalBg} ${t.border}`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-inherit">
                  <span className={`font-display font-bold text-sm ${t.textPrimary}`}>
                    Pinned ({pinnedMessages.length + pinnedStickers.length})
                  </span>
                  <button
                    onClick={() => setShowPins(false)}
                    className="text-[#EF4444] hover:opacity-80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {pinnedStickers.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-inherit">
                    <div className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${t.textMuted}`}>
                      Pinned Stickers ({pinnedStickers.length})
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {pinnedStickers.map((stk) => (
                        <div
                          key={stk.id}
                          className={`group relative rounded-lg border p-1 flex items-center justify-center ${t.border} ${t.dockBg}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSendMessage('', replyTo?.id, [
                                {
                                  id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                  name: stk.title,
                                  url: stk.url,
                                  type: 'sticker',
                                },
                              ]);
                              setShowPins(false);
                            }}
                            title={`Send pinned sticker: ${stk.title}`}
                            className="w-12 h-12 flex items-center justify-center"
                          >
                            <img
                              src={stk.url}
                              alt={stk.title}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 object-contain"
                            />
                          </button>
                          {onUnpinSticker && (
                            <button
                              type="button"
                              onClick={() => onUnpinSticker(stk.url)}
                              title="Unpin sticker"
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E53935] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pinnedMessages.length === 0 && pinnedStickers.length === 0 ? (
                  <p className={`text-xs py-4 text-center ${t.textMuted}`}>
                    No pinned messages or stickers yet. Hover any message and click Pin, or pin stickers in the Sticker Picker.
                  </p>
                ) : pinnedMessages.length > 0 ? (
                  <div className="space-y-2.5">
                    {pinnedMessages.map((pm) => {
                      const author = users[pm.authorId];
                      return (
                        <div key={pm.id} className={`p-2.5 rounded-md border ${t.border} ${t.dockBg}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-xs font-semibold ${t.textPrimary}`}>
                              {author?.name || 'Member'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] ${t.textMuted} tabular-nums`}>
                                {pm.timestamp}
                              </span>
                              <button
                                type="button"
                                onClick={() => onTogglePin(pm.id)}
                                title="Unpin message"
                                className="text-[#EF4444] hover:opacity-80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {pm.content && (
                            <p className={`text-xs leading-relaxed ${t.textSecondary}`}>{pm.content}</p>
                          )}
                          {pm.attachments && pm.attachments.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {pm.attachments.map((att) =>
                                att.type === 'video' ? (
                                  <span key={att.id} className="text-[11px] text-[#EF4444] font-semibold">
                                    🎬 {att.name}
                                  </span>
                                ) : (
                                  <img
                                    key={att.id}
                                    src={att.url}
                                    alt={att.name}
                                    referrerPolicy="no-referrer"
                                    className="h-12 w-12 rounded object-contain bg-black/20"
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {!dmPeer && (
            <button
              onClick={onToggleMemberList}
              aria-label="Toggle member list"
              title="Toggle Member List"
              className={`hidden lg:flex p-1.5 rounded-md transition-colors text-[#EF4444] ${
                showMemberList ? t.activeBg : t.hoverBg
              }`}
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Voice Stage Viewport (if active) */}
      {showingVoiceStage && connectedVoiceChannel ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-between p-5 sm:p-6 overflow-y-auto talkcob-scroll bg-[#111214] text-white gap-4">
          <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E53935]/20 text-[#EF4444] flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">{connectedVoiceChannel.name}</h2>
                <p className="text-xs text-[#949BA4]">
                  {voiceParticipants.length} in room ·{' '}
                  {voiceParticipants.length <= 1
                    ? 'Waiting for others to join'
                    : Object.values(peerConnectionStates).some((st) => st === 'connected')
                    ? 'Two-Way Live WebRTC Audio Connected'
                    : 'Connecting Live Audio...'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {audioPlayBlocked && onUnlockAudio && (
                <button
                  type="button"
                  onClick={onUnlockAudio}
                  className="px-3 py-1.5 rounded-md text-xs font-bold bg-[#23A55A] hover:bg-[#1E8E4C] text-white animate-pulse"
                >
                  Click to Hear Call Audio
                </button>
              )}
              <button
                onClick={onToggleRealMic}
                disabled={!canSpeakInVc}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors disabled:opacity-40 ${
                  micEnabled
                    ? 'bg-[#23A55A] text-white'
                    : 'bg-[#E53935] text-white hover:bg-[#C62828]'
                }`}
              >
                {micEnabled ? 'Mic Live' : 'Enable Microphone'}
              </button>
              <button
                type="button"
                onClick={onToggleVoiceStage}
                className="px-3 py-1.5 rounded-md bg-[#2B2D31] hover:bg-[#383A40] text-xs font-semibold text-white"
              >
                Open Text Chat
              </button>
            </div>
          </div>

          {micError && (
            <div className="w-full max-w-5xl px-4 py-2 rounded-lg bg-[#E53935]/15 border border-[#E53935]/40 text-xs text-[#FCA5A5] flex items-center justify-between gap-3">
              <span>{micError}</span>
              <button
                type="button"
                onClick={onToggleRealMic}
                className="px-2.5 py-1 rounded bg-[#E53935] text-white font-semibold shrink-0"
              >
                Retry Mic
              </button>
            </div>
          )}

          {cameraError && (
            <div className="w-full max-w-5xl px-4 py-2 rounded-lg bg-[#E53935]/15 border border-[#E53935]/40 text-xs text-[#FCA5A5] flex items-center justify-between gap-3">
              <span>{cameraError}</span>
              {onToggleCamera && (
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="px-2.5 py-1 rounded bg-[#E53935] text-white font-semibold shrink-0"
                >
                  Retry Camera
                </button>
              )}
            </div>
          )}

          {/* Live Screen Share Stage inside VC with Talkcob Overlay HUD */}
          {isScreenSharing && screenStream && (
            <div className="w-full max-w-5xl">
              <InlineScreenShareFrame
                stream={screenStream}
                sharer={currentUser}
                roomLabel={`Voice: ${connectedVoiceChannel.name}`}
                shareLabel={screenShareLabel}
                heightClass="h-[320px] sm:h-[380px]"
                onOpenTheaterOverlay={() => onOpenScreenOverlay?.('theater')}
                onOpenFloatingOverlay={() => onOpenScreenOverlay?.('floating')}
                onStopShare={onToggleScreenShare}
              />
            </div>
          )}

          {/* Incoming Screen Shares from Remote Peers in VC */}
          {remoteScreenEntries.length > 0 && (
            <div className="w-full max-w-5xl grid grid-cols-1 gap-3">
              {remoteScreenEntries.map(([peerId, stream]) => (
                <RemoteScreenTile key={peerId} stream={stream} sharer={users[peerId]} />
              ))}
            </div>
          )}

          {/* Participant Tiles (with Live Camera Feed when enabled) */}
          <div className="w-full max-w-5xl my-auto py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {voiceParticipants.map((participant) => {
              const isYou = participant.id === currentUser.id;
              const isSpeaking = speakingUserIds.includes(participant.id);
              const tileMuted = isYou && isMuted;
              const connState = !isYou ? peerConnectionStates[participant.id] : undefined;
              const tileCameraStream = isYou
                ? cameraStream
                : remoteCameraStreams[participant.id];

              return (
                <div
                  key={participant.id}
                  className={`relative rounded-xl p-5 flex flex-col items-center justify-center gap-3 border transition-all duration-150 bg-[#1E1F22] ${
                    isSpeaking && !tileMuted
                      ? 'border-[#23A55A] ring-2 ring-[#23A55A]/40'
                      : 'border-[#2E3035]'
                  }`}
                >
                  {tileCameraStream ? (
                    <div className="w-full relative">
                      <CameraVideoSurface stream={tileCameraStream} mirrored={isYou} />
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[#4ADE80] text-[10px] font-bold flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span>CAM LIVE</span>
                      </span>
                    </div>
                  ) : (
                    <Avatar
                      name={participant.name}
                      src={participant.avatar}
                      accentColor={participant.accentColor}
                      size="xl"
                      speaking={isSpeaking && !tileMuted}
                      decoration={participant.avatarDecoration}
                      isCurrentUser={isYou}
                    />
                  )}

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-display font-semibold text-sm text-white">
                        {participant.name}
                      </span>
                      {isYou && <span className="text-xs text-[#949BA4]">(You)</span>}
                      {isYou && isScreenSharing && (
                        <span className="px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-bold">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#949BA4] mt-0.5">
                      {tileMuted
                        ? 'Muted'
                        : tileCameraStream
                        ? 'Camera On'
                        : isYou && isScreenSharing
                        ? 'Sharing Screen'
                        : isSpeaking
                        ? 'Speaking'
                        : !isYou && connState === 'connected'
                        ? 'Audio Connected'
                        : !isYou
                        ? 'Connecting audio...'
                        : micEnabled
                        ? 'Mic Active · Listening'
                        : 'Mic Off · Click Enable Microphone'}
                    </p>
                  </div>

                  {/* Real-time Audio Level Bar for current user */}
                  {isYou && (
                    <div className="w-32 h-1.5 rounded-full bg-[#2B2D31] overflow-hidden">
                      <div
                        className="h-full bg-[#E53935] transition-all duration-75"
                        style={{ width: `${tileMuted ? 0 : Math.min(100, micLevel)}%` }}
                      />
                    </div>
                  )}

                  {tileMuted && (
                    <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#E53935] text-white flex items-center justify-center">
                      <MicOff className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {screenShareNotice && (
            <div className="w-full max-w-xl px-4 py-2 rounded-lg bg-[#E53935]/15 border border-[#E53935]/40 text-xs text-[#FCA5A5] flex items-center justify-between gap-3">
              <span>{screenShareNotice}</span>
              {onDismissScreenShareNotice && (
                <button
                  type="button"
                  onClick={onDismissScreenShareNotice}
                  className="text-white hover:opacity-80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Voice Stage Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onMouseDown={() => onSimulateSpeak(true)}
              onMouseUp={() => onSimulateSpeak(false)}
              onMouseLeave={() => onSimulateSpeak(false)}
              onTouchStart={() => onSimulateSpeak(true)}
              onTouchEnd={() => onSimulateSpeak(false)}
              disabled={isMuted || !canSpeakInVc}
              className="px-4 py-2.5 rounded-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              Hold to Test Voice
            </button>

            <button
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : 'Mute'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={onToggleDeafen}
              aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                isDeafened ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
              }`}
            >
              {isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
            </button>

            {onToggleCamera && (
              <button
                onClick={onToggleCamera}
                disabled={!canShareScreenInVc}
                aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                title={
                  !canShareScreenInVc
                    ? 'Your server role does not have Video permission'
                    : cameraEnabled
                    ? 'Turn Off Camera'
                    : 'Turn On Camera'
                }
                className={`px-4 h-11 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  cameraEnabled
                    ? 'bg-[#23A55A] text-white'
                    : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
                }`}
              >
                {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span>{cameraEnabled ? 'Cam On' : 'Camera'}</span>
              </button>
            )}

            <button
              onClick={onToggleScreenShare}
              disabled={!canShareScreenInVc}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
              title={
                !canShareScreenInVc
                  ? 'Your server role does not have Video & Share Screen permission'
                  : isScreenSharing
                  ? 'Stop Sharing Screen'
                  : 'Share Your Screen'
              }
              className={`px-4 h-11 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                isScreenSharing
                  ? 'bg-white text-[#E53935]'
                  : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
              }`}
            >
              {isScreenSharing ? (
                <>
                  <MonitorOff className="w-4 h-4" />
                  <span>Stop Share</span>
                </>
              ) : (
                <>
                  <MonitorUp className="w-4 h-4" />
                  <span>Share Screen ({currentUser.streamQuality === 'source' ? 'Source 60fps' : currentUser.streamQuality === '720p30' ? '720p' : '1080p 60fps'})</span>
                </>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setSoundboardOpen((prev) => !prev)}
                aria-label="Open Voice Soundboard"
                title="Free Nitro Soundboard"
                className={`px-3.5 h-11 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  soundboardOpen
                    ? 'bg-gradient-to-r from-[#EC4899] to-[#E53935] text-white'
                    : 'bg-[#2B2D31] text-[#F472B6] hover:bg-[#383A40]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Soundboard</span>
              </button>

              {soundboardOpen && (
                <div className="absolute bottom-13 right-0 w-72 rounded-xl border border-[#2E3035] bg-[#18191D] p-3 shadow-2xl z-30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#F472B6]" />
                      <span>Soundboard (Free Nitro)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSoundboardOpen(false)}
                      className="text-[#949BA4] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SOUNDBOARD_CLIPS.map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playSoundboard(clip.id);
                          onPlaySoundboard?.(clip.id);
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#2B2D31] hover:bg-[#383A40] border border-white/10 text-left text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                      >
                        <span>{clip.emoji}</span>
                        <span className="truncate">{clip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onLeaveVoice}
              aria-label="Disconnect from voice"
              title="Disconnect"
              className="w-11 h-11 rounded-full bg-[#E53935] hover:bg-[#C62828] text-white flex items-center justify-center transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : isHomeEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E53935]/15 text-[#E53935] flex items-center justify-center mb-4">
            <TalkcobIcon size={44} mascotColor="#E53935" animated />
          </div>
          <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
            No Direct Messages Yet
          </h2>
          <p className={`text-sm mt-1.5 max-w-sm leading-relaxed ${t.textMuted}`}>
            Direct Messages are completely clean with zero bots. Head into Talkcob HQ to chat in channels or message any server member.
          </p>
          {onReturnToHq && (
            <button
              onClick={onReturnToHq}
              className="mt-5 px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold transition-colors"
            >
              Open Talkcob HQ
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active Direct Message Call Dock / Screen Share Stage */}
          {isCallingCurrentDm && dmPeer && (
            <div className="shrink-0 bg-[#111214] text-white border-b border-[#2E3035] px-4 py-4">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        peerConnectionStates[dmPeer.id] === 'connected'
                          ? 'bg-[#23A55A]'
                          : 'bg-[#FACC15] animate-pulse'
                      }`}
                    />
                    <span className="font-display font-bold text-sm">
                      DM Call with {dmPeer.name}
                    </span>
                    <span className="text-xs text-[#949BA4]">
                      ·{' '}
                      {peerConnectionStates[dmPeer.id] === 'connected'
                        ? 'Live Two-Way Audio Connected'
                        : dmCallStatus === 'ringing'
                        ? `Ringing ${dmPeer.name}...`
                        : 'Connecting Live Audio...'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {audioPlayBlocked && onUnlockAudio && (
                      <button
                        type="button"
                        onClick={onUnlockAudio}
                        className="px-2.5 py-1 rounded-md bg-[#23A55A] hover:bg-[#1E8E4C] text-xs font-bold text-white animate-pulse"
                      >
                        Hear Call Audio
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onToggleRealMic}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        micEnabled
                          ? 'bg-[#23A55A] text-white'
                          : 'bg-[#E53935] text-white hover:bg-[#C62828]'
                      }`}
                    >
                      {micEnabled ? 'Mic Live' : 'Enable Microphone'}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleDmCallStage}
                      className="px-2.5 py-1 rounded-md bg-[#2B2D31] hover:bg-[#383A40] text-xs font-semibold text-[#DBDEE1]"
                    >
                      {showingDmCallStage ? 'Compact' : 'Expand'}
                    </button>
                  </div>
                </div>

                {micError && (
                  <div className="px-3.5 py-2 rounded-lg bg-[#E53935]/15 border border-[#E53935]/40 text-xs text-[#FCA5A5] flex items-center justify-between gap-2">
                    <span>{micError}</span>
                    <button
                      type="button"
                      onClick={onToggleRealMic}
                      className="px-2 py-0.5 rounded bg-[#E53935] text-white font-semibold shrink-0"
                    >
                      Retry Mic
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="px-3.5 py-2 rounded-lg bg-[#E53935]/15 border border-[#E53935]/40 text-xs text-[#FCA5A5] flex items-center justify-between gap-2">
                    <span>{cameraError}</span>
                    {onToggleCamera && (
                      <button
                        type="button"
                        onClick={onToggleCamera}
                        className="px-2 py-0.5 rounded bg-[#E53935] text-white font-semibold shrink-0"
                      >
                        Retry Camera
                      </button>
                    )}
                  </div>
                )}

                {/* Live Screen Share inside DM Call with Talkcob Overlay HUD */}
                {isScreenSharing && screenStream && (
                  <InlineScreenShareFrame
                    stream={screenStream}
                    sharer={currentUser}
                    roomLabel={`DM Call · ${dmPeer.name}`}
                    shareLabel={screenShareLabel}
                    heightClass={showingDmCallStage ? 'h-72 sm:h-96' : 'h-48 sm:h-60'}
                    onOpenTheaterOverlay={() => onOpenScreenOverlay?.('theater')}
                    onOpenFloatingOverlay={() => onOpenScreenOverlay?.('floating')}
                    onStopShare={onToggleScreenShare}
                  />
                )}

                {remoteScreenStreams[dmPeer.id] && (
                  <RemoteScreenTile stream={remoteScreenStreams[dmPeer.id]} sharer={dmPeer} />
                )}

                {showingDmCallStage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {[currentUser, dmPeer].map((participant) => {
                      const isYou = participant.id === currentUser.id;
                      const isSpeaking = speakingUserIds.includes(participant.id);
                      const tileMuted = isYou && isMuted;
                      const tileCameraStream = isYou
                        ? cameraStream
                        : remoteCameraStreams[participant.id];
                      return (
                        <div
                          key={participant.id}
                          className={`rounded-xl p-4 bg-[#1E1F22] border flex flex-col items-center gap-2 ${
                            isSpeaking && !tileMuted
                              ? 'border-[#23A55A] ring-2 ring-[#23A55A]/40'
                              : 'border-[#2E3035]'
                          }`}
                        >
                          {tileCameraStream ? (
                            <div className="w-full relative">
                              <CameraVideoSurface stream={tileCameraStream} mirrored={isYou} />
                              <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[#4ADE80] text-[10px] font-bold flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                <span>CAM LIVE</span>
                              </span>
                            </div>
                          ) : (
                            <Avatar
                              name={participant.name}
                              src={participant.avatar}
                              accentColor={participant.accentColor}
                              size="lg"
                              speaking={isSpeaking && !tileMuted}
                              decoration={participant.avatarDecoration}
                              isCurrentUser={isYou}
                            />
                          )}
                          <div className="text-center">
                            <div className="text-xs font-semibold text-white">
                              {participant.name} {isYou ? '(You)' : ''}
                            </div>
                            <div className="text-[11px] text-[#949BA4]">
                              {tileMuted
                                ? 'Muted'
                                : tileCameraStream
                                ? 'Camera On'
                                : isYou && isScreenSharing
                                ? 'Sharing Screen'
                                : 'Connected'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {screenShareNotice && (
                  <div className="px-3.5 py-2 rounded-lg bg-[#E53935]/15 border border-[#E53935]/40 text-xs text-[#FCA5A5] flex items-center justify-between gap-2">
                    <span>{screenShareNotice}</span>
                    {onDismissScreenShareNotice && (
                      <button type="button" onClick={onDismissScreenShareNotice}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onMouseDown={() => onSimulateSpeak(true)}
                    onMouseUp={() => onSimulateSpeak(false)}
                    onMouseLeave={() => onSimulateSpeak(false)}
                    onTouchStart={() => onSimulateSpeak(true)}
                    onTouchEnd={() => onSimulateSpeak(false)}
                    disabled={isMuted}
                    className="px-3.5 py-2 rounded-full bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                  >
                    Hold to Test Voice
                  </button>

                  <button
                    onClick={onToggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isMuted ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={onToggleDeafen}
                    aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isDeafened ? 'bg-white text-[#E53935]' : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
                    }`}
                  >
                    {isDeafened ? (
                      <HeadphoneOff className="w-4 h-4" />
                    ) : (
                      <Headphones className="w-4 h-4" />
                    )}
                  </button>

                  {onToggleCamera && (
                    <button
                      type="button"
                      onClick={onToggleCamera}
                      aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                      className={`px-3.5 h-9 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        cameraEnabled
                          ? 'bg-[#23A55A] text-white'
                          : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
                      }`}
                    >
                      {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      <span>{cameraEnabled ? 'Cam On' : 'Camera'}</span>
                    </button>
                  )}

                  <button
                    onClick={onToggleScreenShare}
                    className={`px-3.5 h-9 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      isScreenSharing
                        ? 'bg-white text-[#E53935]'
                        : 'bg-[#2B2D31] text-[#EF4444] hover:bg-[#383A40]'
                    }`}
                  >
                    {isScreenSharing ? (
                      <>
                        <MonitorOff className="w-4 h-4" />
                        <span>Stop Share</span>
                      </>
                    ) : (
                      <>
                        <MonitorUp className="w-4 h-4" />
                        <span>Share Screen</span>
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSoundboardOpen((prev) => !prev)}
                      title="Free Nitro Soundboard"
                      className={`px-3 h-9 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        soundboardOpen
                          ? 'bg-gradient-to-r from-[#EC4899] to-[#E53935] text-white'
                          : 'bg-[#2B2D31] text-[#F472B6] hover:bg-[#383A40]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Soundboard</span>
                    </button>

                    {soundboardOpen && (
                      <div className="absolute bottom-11 right-0 w-72 rounded-xl border border-[#2E3035] bg-[#18191D] p-3 shadow-2xl z-30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#F472B6]" />
                            <span>DM Call Soundboard</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSoundboardOpen(false)}
                            className="text-[#949BA4] hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SOUNDBOARD_CLIPS.map((clip) => (
                            <button
                              key={clip.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playSoundboard(clip.id);
                                onPlaySoundboard?.(clip.id);
                              }}
                              className="px-2.5 py-2 rounded-lg bg-[#2B2D31] hover:bg-[#383A40] border border-white/10 text-left text-xs font-semibold text-white flex items-center gap-1.5"
                            >
                              <span>{clip.emoji}</span>
                              <span className="truncate">{clip.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onLeaveDmCall}
                    aria-label="End DM call"
                    className="w-9 h-9 rounded-full bg-[#E53935] hover:bg-[#C62828] text-white flex items-center justify-center transition-colors"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pinned Stickers Bar directly in the Message Area */}
          {pinnedStickers.length > 0 && !isHomeEmpty && (
            <div className={`shrink-0 px-4 py-2 border-b flex items-center gap-2 overflow-x-auto talkcob-scroll-thin ${t.dockBg} ${t.border}`}>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EF4444] shrink-0 mr-1">
                <Pin className="w-3.5 h-3.5" />
                <span>Pinned Stickers</span>
              </span>
              {pinnedStickers.map((stk) => (
                <div
                  key={stk.id}
                  className={`group relative shrink-0 rounded-lg border px-1.5 py-1 flex items-center gap-1.5 ${t.modalBg} ${t.border} hover:border-[#E53935] transition-colors`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSend || !canViewChannel) return;
                      onSendMessage('', replyTo?.id, [
                        {
                          id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          name: stk.title,
                          url: stk.url,
                          type: 'sticker',
                        },
                      ]);
                      setReplyTo(null);
                    }}
                    title={`Click to send pinned sticker: ${stk.title}`}
                    className="flex items-center gap-1.5"
                  >
                    <img
                      src={stk.url}
                      alt={stk.title}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 object-contain"
                    />
                    <span className={`text-[11px] font-medium max-w-[90px] truncate hidden sm:inline ${t.textSecondary}`}>
                      {stk.title}
                    </span>
                  </button>
                  {onUnpinSticker && (
                    <button
                      type="button"
                      onClick={() => onUnpinSticker(stk.url)}
                      aria-label={`Unpin ${stk.title}`}
                      title="Unpin sticker"
                      className="p-0.5 rounded text-[#949BA4] hover:text-[#EF4444] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text Message Feed */}
          <div className={`flex-1 min-h-0 overflow-y-auto talkcob-scroll px-4 pt-6 pb-4 ${t.textPrimary}`}>
            {selectDeleteMode && (
              <div
                className={`sticky top-0 z-20 mb-4 rounded-xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg ${t.modalBg} border-[#E53935]/50`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Trash2 className="w-4 h-4 text-[#EF4444]" />
                  <span className="font-semibold">
                    Delete Mode · {selectedDeleteIds.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const deletableIds = filteredMessages
                        .filter((m) => m.authorId === currentUser.id || canManageMessages)
                        .map((m) => m.id);
                      setSelectedDeleteIds(deletableIds);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${t.border} ${t.hoverBg}`}
                  >
                    Select All Deletable
                  </button>
                  <button
                    type="button"
                    disabled={selectedDeleteIds.length === 0}
                    onClick={() => {
                      if (selectedDeleteIds.length === 0) return;
                      if (onBulkDeleteMessages) {
                        onBulkDeleteMessages(selectedDeleteIds);
                      } else {
                        selectedDeleteIds.forEach((id) => onDeleteMessage(id));
                      }
                      setSelectedDeleteIds([]);
                      setSelectDeleteMode(false);
                    }}
                    className="px-3 py-1 rounded-md bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white text-xs font-bold"
                  >
                    Delete Selected ({selectedDeleteIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectDeleteMode(false);
                      setSelectedDeleteIds([]);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${t.textMuted} ${t.hoverBg}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Channel / DM Welcome Hero */}
            {!searchQuery && (
              <div className={`pb-6 mb-4 border-b ${t.border}`}>
                <div className="w-14 h-14 rounded-2xl bg-[#E53935]/15 text-[#E53935] flex items-center justify-center mb-3">
                  {dmPeer ? (
                    <Avatar
                      name={dmPeer.name}
                      src={dmPeer.avatar}
                      accentColor={dmPeer.accentColor}
                      size="lg"
                    />
                  ) : (
                    <TalkcobIcon size={40} mascotColor="#E53935" animated />
                  )}
                </div>
                <h2 className={`font-display font-bold text-2xl ${t.textPrimary}`}>
                  {dmPeer ? dmPeer.name : `Welcome to #${activeTitle}`}
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  {dmPeer
                    ? `This is the beginning of your direct message history with ${dmPeer.name}.`
                    : activeTopic || `This is the start of the #${activeTitle} channel.`}
                </p>
              </div>
            )}

            {!canViewChannel || !canReadHistory ? (
              <div className={`py-14 text-center space-y-2 ${t.textMuted}`}>
                <Lock className="w-8 h-8 mx-auto text-[#EF4444]" />
                <p className={`text-sm font-semibold ${t.textPrimary}`}>
                  {!canViewChannel
                    ? 'Private Channel'
                    : 'Message History Restricted'}
                </p>
                <p className="text-xs max-w-sm mx-auto">
                  {!canViewChannel
                    ? 'You do not have permission to view this private channel.'
                    : 'Your permissions in this channel do not allow reading past message history.'}
                </p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className={`py-12 text-center ${t.textMuted}`}>
                <p className="text-sm font-medium">
                  {searchQuery
                    ? `No messages matching "${searchQuery}"`
                    : 'No messages yet. Type below to send the first message.'}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredMessages.map((msg, index) => {
                  const author = users[msg.authorId] || {
                    id: msg.authorId,
                    name: 'Member',
                    username: 'member',
                    accentColor: '#E53935',
                    bannerColor: '#C62828',
                    status: 'online' as const,
                    bio: '',
                    role: 'Member' as const,
                    joinedAt: '2024',
                  };

                  const prev = index > 0 ? filteredMessages[index - 1] : null;
                  const isGrouped =
                    prev && prev.authorId === msg.authorId && !msg.replyToId && !prev.pinned;
                  const repliedMessage = msg.replyToId
                    ? allChannelMessages.find((m) => m.id === msg.replyToId)
                    : undefined;
                  const repliedAuthor = repliedMessage ? users[repliedMessage.authorId] : undefined;
                  const isOwn = msg.authorId === currentUser.id;
                  const canDeleteMsg = isOwn || canManageMessages;
                  const isSelectedForDelete = selectedDeleteIds.includes(msg.id);
                  const authorHasNitroNameplate = Boolean(
                    author.hasFreeNitro && author.nameplateGradient
                  );

                  return (
                    <div
                      key={msg.id}
                      className={`group relative rounded-md px-2 py-1 ${t.hoverBg} ${
                        isSelectedForDelete ? 'bg-[#E53935]/10 ring-1 ring-[#E53935]/40' : ''
                      } ${isGrouped ? 'mt-0.5' : 'mt-3.5 pt-1.5'}`}
                    >
                      {/* Reply Reference Line */}
                      {repliedMessage && (
                        <div className={`flex items-center gap-2 ml-12 mb-1 text-xs ${t.textMuted}`}>
                          <CornerUpLeft className="w-3 h-3 shrink-0 text-[#EF4444]" />
                          <span className="font-semibold">{repliedAuthor?.name || 'Member'}</span>
                          <span className="truncate max-w-md opacity-85">
                            {repliedMessage.content}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-3.5">
                        {selectDeleteMode && canDeleteMsg && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDeleteIds((prev) =>
                                prev.includes(msg.id)
                                  ? prev.filter((id) => id !== msg.id)
                                  : [...prev, msg.id]
                              )
                            }
                            aria-label={isSelectedForDelete ? 'Deselect message' : 'Select message'}
                            className="mt-1 text-[#EF4444] shrink-0"
                          >
                            {isSelectedForDelete ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {isGrouped ? (
                          <div className="w-10 shrink-0 text-right pt-0.5">
                            <span
                              className={`opacity-0 group-hover:opacity-100 text-[10px] tabular-nums ${t.textMuted}`}
                            >
                              {msg.timestamp.replace('Today at ', '')}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectUser(author)}
                            className="shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] rounded-full"
                          >
                            <Avatar
                              name={author.name}
                              src={author.avatar}
                              accentColor={author.accentColor}
                              size="md"
                              decoration={author.avatarDecoration}
                              isCurrentUser={isOwn}
                            />
                          </button>
                        )}

                        <div className="min-w-0 flex-1">
                          {!isGrouped && (
                            <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                              <button
                                onClick={() => onSelectUser(author)}
                                style={
                                  authorHasNitroNameplate
                                    ? { backgroundImage: author.nameplateGradient }
                                    : undefined
                                }
                                className={`font-display font-semibold text-[15px] hover:underline ${
                                  authorHasNitroNameplate
                                    ? 'bg-clip-text text-transparent'
                                    : author.role === 'Founder'
                                    ? 'text-[#EF4444]'
                                    : author.role === 'Audio Lead'
                                    ? 'text-[#F87171]'
                                    : t.textPrimary
                                }`}
                              >
                                  {inServerChannel && activeServer?.id && author.serverNicknames?.[activeServer.id]?.trim()
                                    ? author.serverNicknames[activeServer.id]
                                    : author.name}
                              </button>
                              {author.hasFreeNitro && (
                                <span
                                  title="Talkcob Free Nitro"
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-fuchsia-500/20 to-amber-500/20 border border-fuchsia-500/35 text-fuchsia-300 text-[9px] font-bold uppercase tracking-wide"
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>NITRO</span>
                                </span>
                              )}
                              {(author.isBot || author.role === 'Bot') && (
                                <span className="px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-bold uppercase tracking-wide">
                                  BOT
                                </span>
                              )}
                              <span className={`text-xs tabular-nums ${t.textMuted}`}>
                                {msg.timestamp}
                              </span>
                              {msg.pinned && (
                                <span className="text-[11px] text-[#EF4444] font-medium">
                                  · Pinned
                                </span>
                              )}
                            </div>
                          )}

                          {editingId === msg.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (editingDraft.trim()) {
                                  onEditMessage(msg.id, editingDraft.trim());
                                }
                                setEditingId(null);
                              }}
                              className="mt-1 space-y-1.5"
                            >
                              <input
                                type="text"
                                value={editingDraft}
                                onChange={(e) => setEditingDraft(e.target.value)}
                                autoFocus
                                className={`w-full px-3 py-1.5 rounded-md text-sm ${t.composerBg} ${t.textPrimary} focus:outline-none focus:ring-1 focus:ring-[#E53935]`}
                              />
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  type="submit"
                                  className="text-[#EF4444] font-medium hover:underline flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className={`${t.textMuted} hover:underline`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p
                              className={`text-[15px] leading-[1.45] whitespace-pre-wrap break-words ${t.textPrimary}`}
                            >
                              {msg.content ? renderFormattedText(msg.content, theme) : null}
                              {msg.edited && (
                                <span className={`ml-1.5 text-[11px] ${t.textMuted}`}>(edited)</span>
                              )}
                            </p>
                          )}

                          {/* Attachments (Stickers, Images, Custom Talkcob Video Player) */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 flex flex-col gap-2.5 items-start">
                              {msg.attachments.map((att) =>
                                att.type === 'video' ? (
                                  <TalkcobVideoPlayer
                                    key={att.id}
                                    src={att.url}
                                    name={att.name}
                                    size={att.size}
                                  />
                                ) : att.type === 'sticker' ? (
                                  <div key={att.id} className="group/stk relative inline-block">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      referrerPolicy="no-referrer"
                                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-md transition-transform hover:scale-105"
                                    />
                                    {onPinSticker && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const isAlreadyPinned = pinnedStickers.some((s) => s.url === att.url);
                                          if (isAlreadyPinned && onUnpinSticker) {
                                            onUnpinSticker(att.url);
                                          } else {
                                            onPinSticker({
                                              id: att.id,
                                              title: att.name || 'Sticker',
                                              url: att.url,
                                              previewUrl: att.url,
                                              category: 'Pinned',
                                            });
                                          }
                                        }}
                                        title={
                                          pinnedStickers.some((s) => s.url === att.url)
                                            ? 'Unpin sticker from message area'
                                            : 'Pin sticker to message area'
                                        }
                                        className="opacity-0 group-hover/stk:opacity-100 transition-opacity absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold flex items-center gap-1"
                                      >
                                        <Pin className="w-2.5 h-2.5 text-[#EF4444]" />
                                        <span>
                                          {pinnedStickers.some((s) => s.url === att.url) ? 'Pinned' : 'Pin'}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <img
                                    key={att.id}
                                    src={att.url}
                                    alt={att.name}
                                    referrerPolicy="no-referrer"
                                    className="max-h-72 rounded-lg border border-black/15 object-cover"
                                  />
                                )
                              )}
                            </div>
                          )}

                          {/* Reactions (with Nitro Super Reaction glow!) */}
                          {msg.reactions.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {msg.reactions.map((r) => {
                                const userReacted = r.userIds.includes(currentUser.id);
                                const isSuper = (r.superUserIds?.length || 0) > 0;
                                return (
                                  <button
                                    key={r.emoji}
                                    onClick={() => onToggleReaction(msg.id, r.emoji, isSuper)}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-all tabular-nums ${
                                      isSuper
                                        ? 'bg-gradient-to-r from-[#EC4899]/25 via-[#A855F7]/25 to-[#FACC15]/20 border-[#F472B6] text-white shadow-[0_0_10px_rgba(236,72,153,0.35)]'
                                        : userReacted
                                        ? 'bg-[#E53935]/20 border-[#E53935] text-[#EF4444]'
                                        : `${t.dockBg} ${t.border} ${t.textSecondary} hover:border-[#E53935]/50`
                                    }`}
                                  >
                                    {isSuper && <Zap className="w-3 h-3 text-[#FACC15]" />}
                                    <span>{r.emoji}</span>
                                    <span>{r.userIds.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Floating Message Hover Toolbar */}
                      <div
                        className={`opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity absolute -top-3 right-3 flex items-center gap-0.5 rounded-md border px-1 py-0.5 shadow-md z-10 ${t.modalBg} ${t.border}`}
                      >
                        {canReact &&
                          ['👍', '🔥', '❤️'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => onToggleReaction(msg.id, emoji)}
                              className={`p-1 rounded text-xs ${t.hoverBg}`}
                              title={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        {canReact && (
                          <button
                            onClick={() => {
                              soundEngine.playSuperReact();
                              onToggleReaction(msg.id, '⚡', true);
                            }}
                            title="Nitro Super Reaction (Free)"
                            aria-label="Super reaction"
                            className="p-1 rounded text-[#F472B6] hover:bg-[#EC4899]/20"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canReact && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setEmojiMenuForMessage((prev) => (prev === msg.id ? null : msg.id))
                              }
                              aria-label="Add reaction"
                              title="Add Reaction"
                              className={`p-1 rounded text-[#EF4444] ${t.hoverBg}`}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {emojiMenuForMessage === msg.id && (
                              <div
                                className={`absolute right-0 top-8 w-48 p-2 rounded-lg border shadow-xl z-20 space-y-2 ${t.modalBg} ${t.border}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSuperReactMode((prev) => !prev)}
                                  className={`w-full px-2 py-1 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                                    superReactMode
                                      ? 'bg-gradient-to-r from-[#EC4899] to-[#A855F7] text-white'
                                      : `${t.dockBg} ${t.textSecondary} ${t.hoverBg}`
                                  }`}
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>{superReactMode ? 'Super React: ON' : 'Super React Mode'}</span>
                                </button>
                                <div className="grid grid-cols-4 gap-1">
                                  {QUICK_EMOJIS.map((em) => (
                                    <button
                                      key={em}
                                      onClick={() => {
                                        if (superReactMode) {
                                          soundEngine.playSuperReact();
                                        }
                                        onToggleReaction(msg.id, em, superReactMode);
                                        setEmojiMenuForMessage(null);
                                      }}
                                      className={`p-1 rounded text-base ${t.hoverBg}`}
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {canReply && (
                          <button
                            onClick={() => setReplyTo(msg)}
                            aria-label="Reply"
                            title="Reply"
                            className={`p-1 rounded text-[#EF4444] ${t.hoverBg}`}
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isOwn || canManageMessages || !inServerChannel) && (
                          <button
                            onClick={() => onTogglePin(msg.id)}
                            aria-label={msg.pinned ? 'Unpin message' : 'Pin message'}
                            title={msg.pinned ? 'Unpin' : 'Pin'}
                            className={`p-1 rounded text-[#EF4444] ${t.hoverBg}`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOwn && (
                          <button
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditingDraft(msg.content);
                            }}
                            aria-label="Edit message"
                            title="Edit"
                            className={`p-1 rounded text-[#EF4444] ${t.hoverBg}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDeleteMsg && (
                          <button
                            onClick={(e) => {
                              if (e.shiftKey) {
                                onDeleteMessage(msg.id);
                              } else {
                                setConfirmDeleteMsg(msg);
                              }
                            }}
                            aria-label="Delete message"
                            title="Delete (Hold Shift to skip confirm)"
                            className="p-1 rounded text-[#EF4444] hover:bg-[#E53935]/15"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Typing Indicator */}
          <div className="h-5 px-5 flex items-center">
            {typingUserName && (
              <p className={`text-xs ${t.textMuted}`}>
                <span className="font-semibold">{typingUserName}</span> is typing...
              </p>
            )}
          </div>

          {/* Composer */}
          <div className="px-4 pb-4 pt-1 shrink-0">
            {replyTo && (
              <div
                className={`flex items-center justify-between px-3 py-1.5 rounded-t-lg text-xs border-b ${t.dockBg} ${t.border} ${t.textSecondary}`}
              >
                <span>
                  Replying to{' '}
                  <strong className={t.textPrimary}>
                    {users[replyTo.authorId]?.name || 'Member'}
                  </strong>
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-[#EF4444] hover:opacity-80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {(pendingAttachments.length > 0 || uploadingMedia) && (
              <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b ${t.dockBg} ${t.border}`}>
                {pendingAttachments.map((att) => (
                  <div key={att.id} className="relative">
                    {att.type === 'video' ? (
                      <div className="h-16 px-3 rounded-lg bg-[#18191D] border border-[#E53935]/50 flex items-center gap-2 text-white max-w-[200px]">
                        <Film className="w-5 h-5 text-[#EF4444] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{att.name}</div>
                          <div className="text-[10px] text-[#949BA4]">Ready to send</div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={att.url}
                        alt={att.name}
                        className="h-16 w-16 rounded-md object-cover border border-black/20"
                      />
                    )}
                    <button
                      onClick={() =>
                        setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))
                      }
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E53935] text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {uploadingMedia && (
                  <div className="h-16 px-3 rounded-lg border border-dashed border-[#E53935]/60 flex items-center gap-2 text-xs text-[#EF4444] font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading video...</span>
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <div className="px-3 py-1.5 text-xs font-medium text-[#EF4444] flex items-center justify-between gap-2">
                <span>{uploadError}</span>
                <button type="button" onClick={() => setUploadError(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!canSend || !canViewChannel ? (
              <div
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-sm ${t.composerBg} ${t.textMuted}`}
              >
                <Lock className="w-4 h-4 text-[#EF4444] shrink-0" />
                <span>
                  {!canViewChannel
                    ? 'This channel is private.'
                    : 'You do not have permission to send messages in this channel.'}
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                onDragOver={(e) => {
                  if (canAttach) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!canAttach) return;
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) void processSelectedFile(file);
                }}
                className={`relative flex items-center gap-1.5 px-3 py-2 ${
                  replyTo || pendingAttachments.length > 0 || uploadingMedia
                    ? 'rounded-b-lg'
                    : 'rounded-lg'
                } ${t.composerBg}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {canAttach && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach image or photo"
                      title="Attach Image (Free)"
                      className="p-1.5 rounded-md transition-colors text-[#EF4444] hover:bg-[#E53935]/15"
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      aria-label="Send video in chat"
                      title="Send Video (MP4, WebM, MOV — Free)"
                      className="p-1.5 rounded-md transition-colors text-[#EF4444] hover:bg-[#E53935]/15"
                    >
                      <Film className="w-5 h-5" />
                    </button>
                  </>
                )}

                <textarea
                  ref={textareaRef}
                  rows={1}
                  maxLength={4000}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(144, Math.max(24, el.scrollHeight))}px`;
                    const now = Date.now();
                    if (onTyping && now - lastTypingSentRef.current > 1800) {
                      lastTypingSentRef.current = now;
                      onTyping();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    slowmodeRemaining > 0 && !canManageMessages
                      ? `Slowmode active · wait ${slowmodeRemaining}s`
                      : dmPeer
                      ? `Message @${dmPeer.username} (4,000 char Free Nitro)`
                      : `Message #${activeTitle} (4,000 char Free Nitro)`
                  }
                  className={`flex-1 min-w-0 min-h-[24px] max-h-36 overflow-y-auto bg-transparent resize-none text-[15px] leading-6 py-1 focus:outline-none caret-[#EF4444] ${t.textPrimary} placeholder:text-[#80848E]`}
                />

                {draft.length > 500 && (
                  <span
                    title="Free Nitro 4,000-character message limit"
                    className={`text-[10px] font-mono font-bold px-1.5 tabular-nums shrink-0 ${
                      draft.length > 3800 ? 'text-[#EF4444]' : 'text-[#F472B6]'
                    }`}
                  >
                    {draft.length}/4000
                  </span>
                )}

                {slowmodeRemaining > 0 && !canManageMessages && (
                  <span className="text-[11px] font-mono font-bold text-[#EF4444] px-1.5 tabular-nums shrink-0">
                    {slowmodeRemaining}s
                  </span>
                )}

                <div className="relative flex items-center gap-1">
                  {canAttach && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setStickerPickerOpen((prev) => !prev);
                          setGifPickerOpen(false);
                          setComposerEmojiOpen(false);
                        }}
                        aria-label="Open Sticker Picker"
                        title="Popular Stickers (Pin to message area · Free Nitro)"
                        className={`p-1.5 rounded-md transition-colors ${
                          stickerPickerOpen
                            ? 'bg-gradient-to-r from-[#EC4899] to-[#E53935] text-white'
                            : 'text-[#F472B6] hover:bg-[#EC4899]/15'
                        }`}
                      >
                        <Sticker className="w-5 h-5" />
                      </button>
                      {stickerPickerOpen && (
                        <div className="absolute bottom-11 right-0 z-30">
                          <StickerPicker
                            theme={theme}
                            pinnedStickerUrls={pinnedStickers.map((s) => s.url)}
                            onClose={() => setStickerPickerOpen(false)}
                            onUploadStickerFile={(file) => {
                              void processSelectedFile(file, 'sticker');
                              setStickerPickerOpen(false);
                            }}
                            onPinSticker={(stk) => onPinSticker?.(stk)}
                            onUnpinSticker={(url) => onUnpinSticker?.(url)}
                            onSelectSticker={(stk: StickerItem) => {
                              const stickerAttachment: Attachment = {
                                id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                name: stk.title || 'Sticker',
                                url: stk.url,
                                type: 'sticker',
                                mimeType: 'image/webp',
                              };
                              onSendMessage('', replyTo?.id, [stickerAttachment]);
                              setReplyTo(null);
                              setStickerPickerOpen(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {canAttach && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setGifPickerOpen((prev) => !prev);
                          setStickerPickerOpen(false);
                          setComposerEmojiOpen(false);
                        }}
                        aria-label="Send GIF"
                        title="Send GIF (Free)"
                        className={`px-2 py-1 rounded-md text-[11px] font-extrabold tracking-wide border transition-colors ${
                          gifPickerOpen
                            ? 'bg-[#E53935] border-[#E53935] text-white'
                            : 'border-[#E53935]/40 text-[#EF4444] hover:bg-[#E53935]/15'
                        }`}
                      >
                        GIF
                      </button>
                      {gifPickerOpen && (
                        <div className="absolute bottom-11 right-0 z-30">
                          <GifPicker
                            theme={theme}
                            onClose={() => setGifPickerOpen(false)}
                            onUploadGifFile={(file) => {
                              void processSelectedFile(file);
                              setGifPickerOpen(false);
                            }}
                            onSelectGif={(gif: GifItem) => {
                              const gifAttachment: Attachment = {
                                id: `gif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                name: gif.title || 'animated.gif',
                                url: gif.url,
                                type: 'image',
                                mimeType: 'image/gif',
                              };
                              onSendMessage('', replyTo?.id, [gifAttachment]);
                              setReplyTo(null);
                              setGifPickerOpen(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setComposerEmojiOpen((prev) => !prev);
                      setGifPickerOpen(false);
                      setStickerPickerOpen(false);
                    }}
                    aria-label="Insert emoji"
                    title="Emoji"
                    className="p-1.5 rounded-md transition-colors text-[#EF4444] hover:bg-[#E53935]/15"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {composerEmojiOpen && (
                    <div
                      className={`absolute bottom-11 right-0 w-52 p-2.5 rounded-lg border shadow-xl grid grid-cols-4 gap-1 z-30 ${t.modalBg} ${t.border}`}
                    >
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setDraft((prev) => prev + em);
                            setComposerEmojiOpen(false);
                          }}
                          className={`p-1.5 rounded text-lg ${t.hoverBg}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!draft.trim() && pendingAttachments.length === 0}
                    aria-label="Send message"
                    className="p-1.5 rounded-md bg-[#E53935] hover:bg-[#C62828] disabled:opacity-35 text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {/* Delete Message Confirmation Modal */}
      {confirmDeleteMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteMsg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-xl border p-5 shadow-2xl space-y-4 ${t.modalBg} ${t.border} ${t.textPrimary}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-lg">Delete Message</h3>
                <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                  Are you sure you want to delete this message? This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteMsg(null)}
                className={`p-1 rounded-md ${t.hoverBg}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`rounded-lg border p-3 text-sm ${t.dockBg} ${t.border}`}>
              <div className="text-xs font-semibold mb-1">
                {users[confirmDeleteMsg.authorId]?.name || 'Member'}{' '}
                <span className={`font-normal ${t.textMuted}`}>
                  · {confirmDeleteMsg.timestamp}
                </span>
              </div>
              <p className="text-xs break-words line-clamp-4 opacity-90">
                {confirmDeleteMsg.content ||
                  (confirmDeleteMsg.attachments?.length
                    ? `[${confirmDeleteMsg.attachments.length} attachment(s)]`
                    : 'Message')}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteMsg(null)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold ${t.hoverBg}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMessage(confirmDeleteMsg.id);
                  setConfirmDeleteMsg(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
