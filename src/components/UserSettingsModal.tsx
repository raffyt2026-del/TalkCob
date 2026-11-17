import React, { useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  Check,
  Code2,
  Crop,
  ExternalLink,
  Globe,
  Headphones,
  ImagePlus,
  Keyboard,
  Lightbulb,
  Link as LinkIcon,
  LogOut,
  MessageSquare,
  Palette,
  Plus,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User as UserIcon,
  UserCog,
  Users,
  Video,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  AppTheme,
  AvatarDecorationId,
  ProfileEffectId,
  Server,
  SocialLink,
  User,
  UserStatus,
} from '../types/talkcob';
import { getDomainLabel, normalizeSocialUrl } from '../utils/dm';
import {
  AVATAR_DECORATIONS,
  ENTRANCE_SOUNDS,
  NAMEPLATE_GRADIENTS,
  NITRO_PERKS_LIST,
  PROFILE_EFFECTS,
  SOUNDBOARD_CLIPS,
  STREAM_QUALITIES,
  getProfileEffectMeta,
} from '../utils/nitro';
import { soundEngine } from '../utils/sound';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';
import { AvatarCropModal } from './AvatarCropModal';

type UserSettingsTab =
  | 'account'
  | 'profile'
  | 'appearance'
  | 'chat'
  | 'language'
  | 'voice'
  | 'sounds'
  | 'notifications'
  | 'keybinds'
  | 'tips'
  | 'advanced'
  | 'developer'
  | 'free';

interface UserSettingsModalProps {
  currentUser: User;
  allUsers: Record<string, User>;
  servers?: Server[];
  friendCount: number;
  serverCount: number;
  theme: AppTheme;
  soundEnabled: boolean;
  onChangeTheme: (theme: AppTheme) => void;
  onToggleSound: () => void;
  onSwitchActiveUser: (userId: string) => void;
  onToggleServerBoost?: (serverId: string) => void;
  onSaveProfile: (updates: {
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
  }) => void;
  onOpenFriends: () => void;
  onOpenAdminPanel?: () => void;
  onOpenAiHelp?: () => void;
  onLogOut: () => void;
  onResetData: () => void;
  onClose: () => void;
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  const visible = local.slice(0, 1) || 'u';
  return `${visible}***@${domain}`;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  currentUser,
  allUsers,
  servers = [],
  friendCount,
  serverCount,
  theme,
  soundEnabled,
  onChangeTheme,
  onToggleSound,
  onSwitchActiveUser,
  onToggleServerBoost,
  onSaveProfile,
  onOpenFriends,
  onOpenAdminPanel,
  onOpenAiHelp,
  onLogOut,
  onResetData,
  onClose,
}) => {
  const t = THEME_TOKENS[theme];
  const [activeTab, setActiveTab] = useState<UserSettingsTab>('account');
  const [searchQuery, setSearchQuery] = useState('');

  // Account inline edits
  const [editingField, setEditingField] = useState<'name' | 'username' | 'email' | null>(null);
  const [fieldDraft, setFieldDraft] = useState('');
  const [revealEmail, setRevealEmail] = useState(false);

  // Password section
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSavedNotice, setPwSavedNotice] = useState(false);

  // Profile editor state
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [pronouns, setPronouns] = useState(currentUser.pronouns || 'They/Them');
  const [customStatus, setCustomStatus] = useState(currentUser.customStatus || '');
  const [bio, setBio] = useState(currentUser.bio);
  const [status, setStatus] = useState<UserStatus>(currentUser.status);
  const [avatar, setAvatar] = useState<string | undefined>(currentUser.avatar);
  const [cropSourceSrc, setCropSourceSrc] = useState<string | null>(null);
  const [bannerColor, setBannerColor] = useState(currentUser.bannerColor || '#E53935');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(currentUser.socialLinks || []);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // App preferences state
  const [language, setLanguage] = useState('English (US)');
  const [compactChat, setCompactChat] = useState(false);
  const [showMarkdownTips, setShowMarkdownTips] = useState(true);
  const [inputVolume, setInputVolume] = useState(85);
  const [outputVolume, setOutputVolume] = useState(90);
  const [notifyDms, setNotifyDms] = useState(true);
  const [notifyFriends, setNotifyFriends] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [nickServerId, setNickServerId] = useState<string>(servers[0]?.id || '');
  const [nickDraft, setNickDraft] = useState<string>(
    (servers[0]?.id && currentUser.serverNicknames?.[servers[0].id]) || ''
  );

  const pfpInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const effectiveEmail = currentUser.email || `${currentUser.username.toLowerCase()}@talkcob.app`;
  const effectivePronouns = currentUser.pronouns || 'They/Them';

  const navSections = useMemo<
    Array<{
      title: string;
      items: Array<{
        id: UserSettingsTab;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        highlight?: boolean;
      }>;
    }>
  >(
    () => [
      {
        title: 'USER SETTINGS',
        items: [
          { id: 'account', label: 'My Account', icon: UserIcon },
          { id: 'profile', label: 'My Profile', icon: UserCog },
        ],
      },
      {
        title: 'APP SETTINGS',
        items: [
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'language', label: 'Language', icon: Globe },
          { id: 'voice', label: 'Voice & Audio', icon: Headphones },
          { id: 'sounds', label: 'Sounds', icon: Volume2 },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
          { id: 'tips', label: 'Tips', icon: Lightbulb },
          { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
          { id: 'developer', label: 'Developer', icon: Code2 },
          { id: 'free', label: 'Talkcob Nitro (FREE)', icon: Sparkles, highlight: true },
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

  const activeLabel =
    navSections.flatMap((s) => s.items).find((i) => i.id === activeTab)?.label || 'My Account';

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setCropSourceSrc(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const beginInlineEdit = (field: 'name' | 'username' | 'email') => {
    setEditingField(field);
    if (field === 'name') setFieldDraft(currentUser.name);
    if (field === 'username') setFieldDraft(currentUser.username);
    if (field === 'email') setFieldDraft(effectiveEmail);
  };

  const commitInlineEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = fieldDraft.trim();
    if (!clean || !editingField) return;
    if (editingField === 'name') {
      setName(clean);
      onSaveProfile({ name: clean });
    } else if (editingField === 'username') {
      const handle = clean.replace(/^@/, '').replace(/\s+/g, '');
      if (handle) {
        setUsername(handle);
        onSaveProfile({ username: handle });
      }
    } else if (editingField === 'email') {
      onSaveProfile({ email: clean });
    }
    setEditingField(null);
  };

  const handleAddSocialLink = () => {
    const cleanLabel = newLinkLabel.trim();
    const cleanUrl = normalizeSocialUrl(newLinkUrl);
    if (!cleanLabel) {
      setLinkError('Give your link a name (e.g. YouTube, Twitch, Website).');
      return;
    }
    if (!cleanUrl || cleanUrl === '#') {
      setLinkError('Enter a valid URL (e.g. https://youtube.com/@yourname).');
      return;
    }
    const created: SocialLink = {
      id: `slink-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: cleanLabel,
      url: cleanUrl,
    };
    const nextLinks = [...socialLinks, created];
    setSocialLinks(nextLinks);
    setNewLinkLabel('');
    setNewLinkUrl('');
    setLinkError(null);
    onSaveProfile({ socialLinks: nextLinks });
  };

  const handleUpdateSocialLink = (linkId: string, patch: Partial<SocialLink>) => {
    const nextLinks = socialLinks.map((l) => (l.id === linkId ? { ...l, ...patch } : l));
    setSocialLinks(nextLinks);
  };

  const handleRemoveSocialLink = (linkId: string) => {
    const nextLinks = socialLinks.filter((l) => l.id !== linkId);
    setSocialLinks(nextLinks);
    onSaveProfile({ socialLinks: nextLinks });
  };

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanHandle = username.trim().replace(/^@/, '').replace(/\s+/g, '') || currentUser.username;
    const cleanedLinks = socialLinks
      .filter((l) => l.label.trim() && l.url.trim())
      .map((l) => ({
        ...l,
        label: l.label.trim(),
        url: normalizeSocialUrl(l.url),
      }));
    setSocialLinks(cleanedLinks);
    onSaveProfile({
      name: name.trim(),
      username: cleanHandle,
      pronouns: pronouns.trim() || 'They/Them',
      customStatus: customStatus.trim(),
      bio: bio.trim(),
      status,
      avatar,
      bannerColor,
      socialLinks: cleanedLinks,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1800);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw) return;
    setCurrentPw('');
    setNewPw('');
    setChangingPassword(false);
    setPwSavedNotice(true);
    setTimeout(() => setPwSavedNotice(false), 2500);
  };

  const cardSurface =
    theme === 'light'
      ? 'bg-white border-[#E1E3E6]'
      : theme === 'obsidian'
      ? 'bg-[#12151C] border-[#1F2430]'
      : 'bg-[#1A1A1E] border-[#2B2D31]';

  const nestedSurface =
    theme === 'light'
      ? 'bg-[#F2F3F5] border-[#E1E3E6]'
      : theme === 'obsidian'
      ? 'bg-[#0C0E13] border-[#1F2430]'
      : 'bg-[#121215] border-[#26272B]';

  const bannerColors = ['#E53935', '#B91C1C', '#F97316', '#0D9488', '#4F46E5', '#27272A'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="User Settings"
      className={`fixed inset-0 z-50 flex flex-col md:flex-row ${t.chatBg}`}
    >
      {/* Hidden global file input for uploading PFP from local files or photos */}
      <input
        ref={pfpInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* Left Sidebar (matching screenshot layout) */}
      <aside
        className={`w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r flex flex-col ${t.railBg} ${t.border}`}
      >
        <div className="p-3.5 pb-2 flex items-center gap-2">
          <div
            className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E53935]/70 ${t.inputBg}`}
          >
            <Search className="w-4 h-4 text-[#EF4444] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings"
              className={`w-full bg-transparent text-xs focus:outline-none ${t.textPrimary} placeholder:text-[#80848E]`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear settings search"
                className="text-[#EF4444]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close user settings"
            className={`md:hidden p-1.5 rounded-lg text-[#EF4444] ${t.hoverBg}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop vertical menu / Mobile horizontal wrap */}
        <nav className="flex-1 overflow-x-auto md:overflow-y-auto talkcob-scroll px-2.5 pb-4 flex md:block gap-1">
          {filteredSections.map((sec, idx) => (
            <div key={sec.title} className={idx > 0 ? 'md:mt-4 flex md:block gap-1' : 'flex md:block gap-1'}>
              <div
                className={`hidden md:block px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}
              >
                {sec.title}
              </div>
              <div className="flex md:block gap-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isHighlight = 'highlight' in item && item.highlight;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-auto md:w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${
                        isActive
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

          <div className={`hidden md:block my-3 border-t ${t.border}`} />
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogOut();
            }}
            className={`w-auto md:w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-semibold text-[#F87171] hover:bg-[#E53935]/15 whitespace-nowrap transition-colors`}
          >
            <span>Log Out</span>
            <LogOut className="w-4 h-4 text-[#EF4444] shrink-0" />
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 h-full overflow-y-auto talkcob-scroll ${t.chatBg}`}>
        {/* Top bar with section title and top-right X */}
        <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-5 pb-3 flex items-center justify-between">
          <h1 className={`font-display font-bold text-xl ${t.textPrimary}`}>{activeLabel}</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close user settings"
            title="Close (Esc)"
            className={`hidden md:flex items-center justify-center w-9 h-9 rounded-full border ${t.border} text-[#EF4444] ${t.hoverBg} transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-5 sm:px-8 pb-12 space-y-6">
          {/* 1. MY ACCOUNT (matches the user's screenshot) */}
          {activeTab === 'account' && (
            <>
              {/* Hero Card + Credentials Card */}
              <div className={`rounded-2xl border overflow-hidden shadow-lg ${cardSurface}`}>
                {/* Top Hero Showcase Area */}
                <div
                  className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative"
                  style={{
                    background:
                      theme === 'light'
                        ? `linear-gradient(135deg, ${currentUser.bannerColor}18 0%, #F8F9FA 100%)`
                        : `linear-gradient(135deg, ${currentUser.bannerColor}38 0%, #101012 75%)`,
                  }}
                >
                  {/* Large circular PFP showcase matching screenshot hero */}
                  <button
                    type="button"
                    onClick={() => pfpInputRef.current?.click()}
                    title="Click to upload a new profile photo"
                    className="group relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0 ring-2 ring-[#E53935]/60 shadow-xl flex items-center justify-center bg-[#1E1F22]"
                  >
                    {avatar || currentUser.avatar ? (
                      <img
                        src={avatar || currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="w-full h-full flex items-center justify-center font-display font-extrabold text-3xl text-white"
                        style={{ backgroundColor: currentUser.accentColor }}
                      >
                        {currentUser.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
                      <ImagePlus className="w-5 h-5 text-[#EF4444]" />
                      <span>Change PFP</span>
                    </div>
                  </button>

                  {/* Hero Identity + Quick Action Pills */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h2 className={`font-display font-extrabold text-2xl sm:text-3xl tracking-tight truncate ${t.textPrimary}`}>
                      {currentUser.name}
                    </h2>
                    <p className={`text-xs sm:text-sm mt-1 ${t.textSecondary}`}>
                      @{currentUser.username} · {friendCount} {friendCount === 1 ? 'friend' : 'friends'} · {serverCount} {serverCount === 1 ? 'server' : 'servers'}
                    </p>
                    <p className={`text-xs sm:text-sm mt-2 line-clamp-2 ${t.textPrimary}`}>
                      {currentUser.bio}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                        <span className="text-[#EF4444] font-semibold">Talkcob HQ</span>
                      </span>
                      {(currentUser.socialLinks || []).map((link) => (
                        <a
                          key={link.id}
                          href={normalizeSocialUrl(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${t.border} ${
                            theme === 'light'
                              ? 'bg-white text-[#1E1F22] hover:bg-[#F2F3F5]'
                              : 'bg-[#27272A]/85 text-white hover:bg-[#323236]'
                          } font-medium transition-colors`}
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3 text-[#EF4444]" />
                        </a>
                      ))}
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="text-[#EF4444] hover:underline font-semibold"
                      >
                        {(currentUser.socialLinks || []).length > 0 ? 'Edit social links' : '+ Add social links'}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${t.border} ${
                          theme === 'light'
                            ? 'bg-white text-[#1E1F22] hover:bg-[#F2F3F5]'
                            : 'bg-[#27272A] text-white hover:bg-[#323236]'
                        } transition-colors`}
                      >
                        Customize profile
                      </button>
                      <button
                        type="button"
                        onClick={() => pfpInputRef.current?.click()}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${t.border} ${
                          theme === 'light'
                            ? 'bg-white text-[#1E1F22] hover:bg-[#F2F3F5]'
                            : 'bg-[#27272A] text-white hover:bg-[#323236]'
                        } transition-colors`}
                      >
                        Change PFP
                      </button>
                      {(avatar || currentUser.avatar) && (
                        <button
                          type="button"
                          onClick={() => setCropSourceSrc(avatar || currentUser.avatar || null)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${t.border} inline-flex items-center gap-1.5 ${
                            theme === 'light'
                              ? 'bg-white text-[#1E1F22] hover:bg-[#F2F3F5]'
                              : 'bg-[#27272A] text-white hover:bg-[#323236]'
                          } transition-colors`}
                        >
                          <Crop className="w-3.5 h-3.5 text-[#EF4444]" />
                          <span>Crop PFP</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenFriends();
                          onClose();
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${t.border} inline-flex items-center gap-1.5 ${
                          theme === 'light'
                            ? 'bg-white text-[#1E1F22] hover:bg-[#F2F3F5]'
                            : 'bg-[#27272A] text-white hover:bg-[#323236]'
                        } transition-colors`}
                      >
                        <Users className="w-3.5 h-3.5 text-[#EF4444]" />
                        <span>Community</span>
                      </button>
                      {(currentUser.isPlatformOwner || currentUser.isPlatformAdmin) && onOpenAdminPanel && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAdminPanel();
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E53935] hover:bg-[#C62828] text-white inline-flex items-center gap-1.5 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#FACC15]" />
                          <span>Admin Panel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overlapping Avatar + Display Name + Edit profile button */}
                <div className="px-6 pb-5 pt-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="-mt-10 relative">
                      <Avatar
                        name={currentUser.name}
                        src={avatar || currentUser.avatar}
                        accentColor={currentUser.accentColor}
                        size="lg"
                        status={currentUser.status}
                        showStatus
                        statusBorderClass={theme === 'light' ? 'border-white' : 'border-[#1A1A1E]'}
                        isCurrentUser
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-display font-bold text-base truncate ${t.textPrimary}`}>
                          {currentUser.name}
                        </span>
                        <BadgeCheck className="w-4 h-4 text-[#EF4444] shrink-0" />
                      </div>
                      <div className={`text-xs truncate ${t.textMuted}`}>
                        @{currentUser.username} · {effectivePronouns}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="px-4 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Edit profile
                  </button>
                </div>

                {/* Nested Credentials Box: DISPLAY NAME / USERNAME / EMAIL */}
                <div className="px-6 pb-6">
                  <div className={`rounded-xl border p-4 space-y-4 ${nestedSurface}`}>
                    {/* DISPLAY NAME */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                          DISPLAY NAME
                        </div>
                        {editingField === 'name' ? (
                          <form onSubmit={commitInlineEdit} className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={fieldDraft}
                              onChange={(e) => setFieldDraft(e.target.value)}
                              className={`px-2.5 py-1 rounded-md border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 rounded-md bg-[#E53935] text-white text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingField(null)}
                              className={`px-2.5 py-1 rounded-md text-xs ${t.textMuted} ${t.hoverBg}`}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div className={`text-sm font-medium mt-0.5 truncate ${t.textPrimary}`}>
                            {currentUser.name}
                          </div>
                        )}
                      </div>
                      {editingField !== 'name' && (
                        <button
                          type="button"
                          onClick={() => beginInlineEdit('name')}
                          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            theme === 'light'
                              ? 'bg-[#E3E5E8] text-[#1E1F22] hover:bg-[#D4D7DC]'
                              : 'bg-[#2B2D31] text-white hover:bg-[#383A40]'
                          }`}
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {/* USERNAME */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                          USERNAME
                        </div>
                        {editingField === 'username' ? (
                          <form onSubmit={commitInlineEdit} className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={fieldDraft}
                              onChange={(e) => setFieldDraft(e.target.value)}
                              className={`px-2.5 py-1 rounded-md border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 rounded-md bg-[#E53935] text-white text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingField(null)}
                              className={`px-2.5 py-1 rounded-md text-xs ${t.textMuted} ${t.hoverBg}`}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div className={`text-sm font-medium mt-0.5 truncate ${t.textPrimary}`}>
                            {currentUser.username}
                          </div>
                        )}
                      </div>
                      {editingField !== 'username' && (
                        <button
                          type="button"
                          onClick={() => beginInlineEdit('username')}
                          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            theme === 'light'
                              ? 'bg-[#E3E5E8] text-[#1E1F22] hover:bg-[#D4D7DC]'
                              : 'bg-[#2B2D31] text-white hover:bg-[#383A40]'
                          }`}
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {/* EMAIL */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                          EMAIL
                        </div>
                        {editingField === 'email' ? (
                          <form onSubmit={commitInlineEdit} className="mt-1 flex items-center gap-2">
                            <input
                              type="email"
                              autoFocus
                              value={fieldDraft}
                              onChange={(e) => setFieldDraft(e.target.value)}
                              className={`px-2.5 py-1 rounded-md border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 rounded-md bg-[#E53935] text-white text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingField(null)}
                              className={`px-2.5 py-1 rounded-md text-xs ${t.textMuted} ${t.hoverBg}`}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div className={`text-sm font-medium mt-0.5 flex items-center gap-2 ${t.textPrimary}`}>
                            <span>{revealEmail ? effectiveEmail : maskEmail(effectiveEmail)}</span>
                            <button
                              type="button"
                              onClick={() => setRevealEmail((prev) => !prev)}
                              className="text-xs font-semibold text-[#EF4444] hover:underline"
                            >
                              {revealEmail ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                        )}
                      </div>
                      {editingField !== 'email' && (
                        <button
                          type="button"
                          onClick={() => beginInlineEdit('email')}
                          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            theme === 'light'
                              ? 'bg-[#E3E5E8] text-[#1E1F22] hover:bg-[#D4D7DC]'
                              : 'bg-[#2B2D31] text-white hover:bg-[#383A40]'
                          }`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* PASSWORD AND AUTHENTICATION */}
              <div className="space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                  PASSWORD AND AUTHENTICATION
                </h3>

                {!changingPassword ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChangingPassword(true)}
                      className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold transition-colors"
                    >
                      Change password
                    </button>
                    {pwSavedNotice && (
                      <span className="text-xs font-semibold text-[#23A55A]">
                        Password updated cleanly.
                      </span>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={handlePasswordSubmit}
                    className={`p-4 rounded-xl border space-y-3 max-w-md ${cardSurface}`}
                  >
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textSecondary}`}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textSecondary}`}>
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold"
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangingPassword(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${t.textMuted} ${t.hoverBg}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ACCOUNT STANDING CARD (matches bottom of screenshot) */}
              <div className={`rounded-2xl border p-5 space-y-5 ${cardSurface}`}>
                <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                  Account standing
                </h3>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#23A55A]/15 border border-[#23A55A]/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#23A55A]" />
                  </div>
                  <div>
                    <div className={`font-display font-bold text-base ${t.textPrimary}`}>
                      Your account is all good
                    </div>
                    <div className={`text-xs ${t.textMuted}`}>
                      Everything works normally.
                    </div>
                  </div>
                </div>

                {/* 4-step standing progress bar */}
                <div className="pt-1">
                  <div className="relative flex items-center justify-between">
                    <div
                      className={`absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 ${
                        theme === 'light' ? 'bg-[#E1E3E6]' : 'bg-[#2E3035]'
                      }`}
                    />
                    <div className="relative z-10 w-4 h-4 rounded-full bg-[#23A55A] ring-4 ring-[#23A55A]/30" />
                    <div className="relative z-10 w-3 h-3 rounded-full bg-[#3F4147]" />
                    <div className="relative z-10 w-3 h-3 rounded-full bg-[#3F4147]" />
                    <div className="relative z-10 w-3 h-3 rounded-full bg-[#3F4147]" />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={`font-semibold ${t.textPrimary}`}>All good</span>
                    <span className={t.textMuted}>Limited</span>
                    <span className={t.textMuted}>Very limited</span>
                    <span className={t.textMuted}>Suspended</span>
                  </div>
                </div>

                <div className={`pt-3 border-t text-xs space-y-1 ${t.border} ${t.textMuted}`}>
                  <p>• Warnings from Talkcob staff count for 3 days.</p>
                  <p>• All Talkcob features, PFP uploads, roles, and voice rooms are 100% free.</p>
                </div>
              </div>
            </>
          )}

          {/* 2. MY PROFILE (PFP upload from files/photos + profile editing) */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfileForm} className="space-y-6">
              <div className={`rounded-2xl border p-5 space-y-5 ${cardSurface}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar
                      name={name || currentUser.name}
                      src={avatar}
                      accentColor={currentUser.accentColor}
                      size="xl"
                      status={status}
                      showStatus
                      isCurrentUser
                    />
                    <div className="min-w-0">
                      <div className={`font-display font-bold text-lg truncate ${t.textPrimary}`}>
                        {name || currentUser.name}
                      </div>
                      <div className={`text-xs ${t.textMuted}`}>
                        @{username || currentUser.username} · {pronouns || 'They/Them'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => pfpInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ImagePlus className="w-4 h-4" />
                      <span>Upload PFP from Files / Photos</span>
                    </button>
                    {avatar && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCropSourceSrc(avatar)}
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textPrimary} ${t.hoverBg} transition-colors`}
                        >
                          <Crop className="w-3.5 h-3.5 text-[#EF4444]" />
                          <span>Crop / Adjust</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAvatar(undefined);
                            onSaveProfile({ avatar: undefined });
                          }}
                          title="Remove profile photo"
                          aria-label="Remove profile photo"
                          className={`p-2 rounded-lg border text-[#EF4444] ${t.border} hover:bg-[#E53935]/15 transition-colors`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                      Display Name
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
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                      Pronouns
                    </label>
                    <input
                      type="text"
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      placeholder="e.g. He/Him, She/Her, They/Them"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                      Availability
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as UserStatus)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                    >
                      <option value="online">Online</option>
                      <option value="idle">Idle</option>
                      <option value="dnd">Do Not Disturb</option>
                      <option value="offline">Invisible</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                    Custom Status
                  </label>
                  <input
                    type="text"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    placeholder="What are you up to?"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                    About Me
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>
                    Banner Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    {bannerColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBannerColor(c)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                          bannerColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1E]' : ''
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select banner color ${c}`}
                      >
                        {bannerColor === c && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Named Social Links Section */}
                <div className={`pt-4 border-t ${t.border} space-y-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider ${t.textPrimary}`}>
                        Social Links
                      </label>
                      <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                        Add links to your YouTube, Twitch, Discord, portfolio, or any site and give each link its own name.
                      </p>
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${t.textMuted}`}>
                      {socialLinks.length} {socialLinks.length === 1 ? 'link' : 'links'}
                    </span>
                  </div>

                  {socialLinks.length > 0 && (
                    <div className="space-y-2">
                      {socialLinks.map((link) => (
                        <div
                          key={link.id}
                          className={`p-3 rounded-xl border ${nestedSurface} grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 items-center`}
                        >
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => handleUpdateSocialLink(link.id, { label: e.target.value })}
                            placeholder="Link name (e.g. YouTube)"
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                          />
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => handleUpdateSocialLink(link.id, { url: e.target.value })}
                              placeholder="https://..."
                              className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                            />
                            <a
                              href={normalizeSocialUrl(link.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open ${link.label} (${getDomainLabel(link.url)})`}
                              className={`p-1.5 rounded-lg border ${t.border} text-[#EF4444] ${t.hoverBg} shrink-0`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSocialLink(link.id)}
                            aria-label={`Remove ${link.label}`}
                            title="Remove link"
                            className={`p-1.5 rounded-lg border ${t.border} text-[#EF4444] hover:bg-[#E53935]/15 transition-colors justify-self-end`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick-add social link builder */}
                  <div className={`p-3.5 rounded-xl border ${nestedSurface} space-y-2.5`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[11px] font-semibold mr-1 ${t.textMuted}`}>Quick names:</span>
                      {['YouTube', 'Twitch', 'Discord', 'TikTok', 'GitHub', 'Instagram', 'X', 'Website'].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setNewLinkLabel(preset);
                              setLinkError(null);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                              newLinkLabel === preset
                                ? 'border-[#E53935] bg-[#E53935]/15 text-[#EF4444]'
                                : `${t.border} ${t.textSecondary} ${t.hoverBg}`
                            }`}
                          >
                            {preset}
                          </button>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={(e) => {
                          setNewLinkLabel(e.target.value);
                          setLinkError(null);
                        }}
                        placeholder="Name this link (e.g. My YouTube)"
                        className={`px-3 py-2 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                      <input
                        type="text"
                        value={newLinkUrl}
                        onChange={(e) => {
                          setNewLinkUrl(e.target.value);
                          setLinkError(null);
                        }}
                        placeholder="URL (e.g. https://youtube.com/@you)"
                        className={`px-3 py-2 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                      <button
                        type="button"
                        onClick={handleAddSocialLink}
                        className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Link</span>
                      </button>
                    </div>

                    {linkError && (
                      <p className="text-xs font-medium text-[#EF4444]">{linkError}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  {profileSaved ? (
                    <span className="text-xs font-semibold text-[#23A55A]">
                      Profile changes saved!
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 3. APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
              <div>
                <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Theme</h2>
                <p className={`text-xs mt-1 ${t.textMuted}`}>
                  Choose your Talkcob look — every theme is unlocked and 100% free.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { id: 'dark', label: 'Classic Dark', desc: 'Balanced charcoal surface', bg: '#313338' },
                  { id: 'obsidian', label: 'Obsidian', desc: 'Deep high-contrast midnight', bg: '#161920' },
                  { id: 'light', label: 'Clean Light', desc: 'Crisp bright daylight theme', bg: '#F2F3F5' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeTheme(opt.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      theme === opt.id
                        ? 'border-[#E53935] bg-[#E53935]/15'
                        : `${t.border} ${t.hoverBg}`
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-black/20 mb-2.5"
                      style={{ backgroundColor: opt.bg }}
                    />
                    <div className={`text-sm font-bold ${t.textPrimary}`}>{opt.label}</div>
                    <div className={`text-xs mt-0.5 ${t.textMuted}`}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. CHAT */}
          {activeTab === 'chat' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
              <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Chat Display</h2>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>Compact Message Spacing</div>
                  <div className={`text-xs ${t.textMuted}`}>Fit more messages vertically in channels and DMs</div>
                </div>
                <input
                  type="checkbox"
                  checked={compactChat}
                  onChange={(e) => setCompactChat(e.target.checked)}
                  className="accent-[#E53935] w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>Markdown Text Formatting</div>
                  <div className={`text-xs ${t.textMuted}`}>Render **bold**, *italic*, and `inline code` in messages</div>
                </div>
                <input
                  type="checkbox"
                  checked={showMarkdownTips}
                  onChange={(e) => setShowMarkdownTips(e.target.checked)}
                  className="accent-[#E53935] w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* 5. LANGUAGE */}
          {activeTab === 'language' && (
            <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
              <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Select a Language</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['English (US)', 'English (UK)', 'Español', 'Français', 'Deutsch', '日本語'].map(
                  (lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium flex items-center justify-between ${
                        language === lang
                          ? 'border-[#E53935] bg-[#E53935]/15 text-[#EF4444]'
                          : `${t.border} ${t.textPrimary} ${t.hoverBg}`
                      }`}
                    >
                      <span>{lang}</span>
                      {language === lang && <Check className="w-4 h-4 text-[#EF4444]" />}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* 6. VOICE & AUDIO */}
          {activeTab === 'voice' && (
            <div className={`rounded-2xl border p-5 space-y-5 ${cardSurface}`}>
              <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Voice & Audio</h2>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className={t.textSecondary}>Input Volume</span>
                  <span className="text-[#EF4444]">{inputVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={inputVolume}
                  onChange={(e) => setInputVolume(Number(e.target.value))}
                  className="w-full accent-[#E53935]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className={t.textSecondary}>Output Volume</span>
                  <span className="text-[#EF4444]">{outputVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={outputVolume}
                  onChange={(e) => setOutputVolume(Number(e.target.value))}
                  className="w-full accent-[#E53935]"
                />
              </div>
              <p className={`text-xs ${t.textMuted}`}>
                Join any Voice Channel in Talkcob HQ and click Enable Mic to test live browser microphone levels.
              </p>
            </div>
          )}

          {/* 7. SOUNDS */}
          {activeTab === 'sounds' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Sound Effects</h2>
                  <p className={`text-xs ${t.textMuted}`}>
                    Synthesized Web Audio chimes for voice join, leave, mute, and sending messages.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                    soundEnabled ? 'bg-[#E53935] text-white' : `border ${t.border} ${t.textSecondary}`
                  }`}
                >
                  {soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => soundEngine.playVoiceJoin()}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                >
                  Test Join Voice
                </button>
                <button
                  type="button"
                  onClick={() => soundEngine.playVoiceLeave()}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                >
                  Test Leave Voice
                </button>
                <button
                  type="button"
                  onClick={() => soundEngine.playMessageSend()}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                >
                  Test Message Chime
                </button>
              </div>
            </div>
          )}

          {/* 8. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
              <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Notifications</h2>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>Direct Message Badges</div>
                  <div className={`text-xs ${t.textMuted}`}>Highlight the Talkcob Home icon on unread DMs</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyDms}
                  onChange={(e) => setNotifyDms(e.target.checked)}
                  className="accent-[#E53935] w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>Friend Request Alerts</div>
                  <div className={`text-xs ${t.textMuted}`}>Show pending request counters in Friends</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyFriends}
                  onChange={(e) => setNotifyFriends(e.target.checked)}
                  className="accent-[#E53935] w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* 9. KEYBINDS */}
          {activeTab === 'keybinds' && (
            <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
              <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Keyboard Shortcuts</h2>
              <div className="space-y-2 text-sm">
                {[
                  { action: 'Open Quick Switcher', keys: 'Ctrl / Cmd + K' },
                  { action: 'Close Active Modal or Settings', keys: 'Esc' },
                  { action: 'Send Message', keys: 'Enter' },
                  { action: 'Insert New Line', keys: 'Shift + Enter' },
                ].map((kb) => (
                  <div
                    key={kb.action}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${nestedSurface}`}
                  >
                    <span className={t.textPrimary}>{kb.action}</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#E53935]/15 text-[#EF4444] text-xs font-mono font-semibold">
                      {kb.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. TIPS */}
          {activeTab === 'tips' && (
            <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
              <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>Talkcob Tips</h2>
              <ul className={`space-y-2 text-sm ${t.textSecondary}`}>
                <li>• Assign the <strong className="text-[#EF4444]">settings</strong> role to any member in Server Settings to grant them Server Settings and channel creation access.</li>
                <li>• Use the <strong className="text-[#EF4444]">Friends</strong> screen to send requests, accept incoming requests, or switch accounts to test two-way friendships.</li>
                <li>• Talkcob HQ is your permanent home server and cannot be left or deleted.</li>
              </ul>
            </div>
          )}

          {/* 11. ADVANCED (Account Switcher + Workspace Reset) */}
          {activeTab === 'advanced' && (
            <div className={`rounded-2xl border p-5 space-y-5 ${cardSurface}`}>
              <div>
                <h2 className={`font-display font-bold text-base ${t.textPrimary}`}>
                  Active Account Switcher
                </h2>
                <p className={`text-xs mt-1 ${t.textMuted}`}>
                  Switch between Talkcob HQ accounts to test server ownership, the &ldquo;settings&rdquo; role, or pending friend requests.
                </p>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    onSwitchActiveUser(e.target.value);
                    onClose();
                  }}
                  className={`mt-3 w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                >
                  {Object.values(allUsers)
                    .filter((u) => u.id === currentUser.id || (!u.isPlatformOwner && !u.isPlatformAdmin && !u.isBanned))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username})
                      </option>
                    ))}
                </select>
              </div>

              <div className={`pt-4 border-t ${t.border} flex items-center justify-between gap-3`}>
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>Reset Local Workspace</div>
                  <div className={`text-xs ${t.textMuted}`}>
                    Restore default Talkcob HQ channels and clear saved messages.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Reset Workspace
                </button>
              </div>
            </div>
          )}

          {/* 12. DEVELOPER */}
          {activeTab === 'developer' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className={`text-sm font-semibold ${t.textPrimary}`}>Developer Mode</div>
                  <div className={`text-xs ${t.textMuted}`}>Show internal user identifiers for inspection</div>
                </div>
                <input
                  type="checkbox"
                  checked={devMode}
                  onChange={(e) => setDevMode(e.target.checked)}
                  className="accent-[#E53935] w-4 h-4"
                />
              </label>

              {devMode && (
                <div className={`p-3 rounded-lg border flex items-center justify-between ${nestedSurface}`}>
                  <span className={`text-xs font-mono ${t.textSecondary}`}>
                    Current Account Handle: @{currentUser.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`@${currentUser.username}`).catch(() => {});
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 1500);
                    }}
                    className="text-xs font-semibold text-[#EF4444]"
                  >
                    {copiedId ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 13. TALKCOB NITRO — ALWAYS 100% FREE ($0) */}
          {activeTab === 'free' && (
            <div className="space-y-5">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      onSaveProfile({
                        hasFreeNitro: true,
                        customBannerUrl: reader.result,
                      });
                    }
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* Nitro Hero Card */}
              <div className="rounded-2xl border border-[#EC4899]/40 overflow-hidden shadow-xl bg-gradient-to-br from-[#231228] via-[#1C1426] to-[#121622] text-white p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EC4899] via-[#A855F7] to-[#E53935] flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display font-extrabold text-xl">
                          Talkcob Nitro
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#23A55A] text-white text-[11px] font-extrabold uppercase tracking-wider">
                          $0 FOREVER · FREE
                        </span>
                      </div>
                      <p className="text-xs text-[#D8B4FE] mt-0.5">
                        All Nitro cosmetics — avatar decorations, animated profile effects, gradient nameplates, custom banners &amp; HD streaming — unlocked free for everyone.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onSaveProfile({ hasFreeNitro: !currentUser.hasFreeNitro })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                      currentUser.hasFreeNitro
                        ? 'bg-[#23A55A] hover:bg-[#1E8E4C] text-white shadow-md'
                        : 'bg-gradient-to-r from-[#EC4899] to-[#E53935] hover:opacity-95 text-white shadow-md'
                    }`}
                  >
                    {currentUser.hasFreeNitro ? 'Free Nitro Active ✓' : 'Activate Free Nitro ($0)'}
                  </button>
                </div>

                {/* Live Mini Preview */}
                <div className="rounded-xl border border-white/15 overflow-hidden bg-[#18191D]">
                  <div
                    className="h-20 relative bg-cover bg-center"
                    style={{
                      backgroundColor: currentUser.bannerColor,
                      backgroundImage: currentUser.customBannerUrl
                        ? `url(${currentUser.customBannerUrl})`
                        : undefined,
                    }}
                  >
                    {(() => {
                      const fx = getProfileEffectMeta(currentUser.profileEffect);
                      return fx && fx.overlayGradient ? (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: fx.overlayGradient }}
                        />
                      ) : null;
                    })()}
                  </div>
                  <div className="px-4 pb-4 flex items-center gap-3 -mt-7 relative">
                    <Avatar
                      name={currentUser.name}
                      src={avatar || currentUser.avatar}
                      accentColor={currentUser.accentColor}
                      size="lg"
                      status={currentUser.status}
                      showStatus
                      decoration={currentUser.avatarDecoration}
                      statusBorderClass="border-[#18191D]"
                      isCurrentUser
                    />
                    <div className="pt-6 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-display font-bold text-base truncate ${
                            currentUser.hasFreeNitro && currentUser.nameplateGradient
                              ? 'bg-clip-text text-transparent'
                              : 'text-white'
                          }`}
                          style={
                            currentUser.hasFreeNitro && currentUser.nameplateGradient
                              ? { backgroundImage: currentUser.nameplateGradient }
                              : undefined
                          }
                        >
                          {currentUser.name}
                        </span>
                        {currentUser.hasFreeNitro && (
                          <span className="px-1.5 py-0.5 rounded bg-[#EC4899]/25 border border-[#F472B6]/40 text-[#F472B6] text-[10px] font-bold">
                            NITRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#949BA4] truncate">
                        @{currentUser.username} · Live Preview
                      </p>
                    </div>
                  </div>
                </div>

                {/* All Free Nitro Perks Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {NITRO_PERKS_LIST.map((perk) => (
                    <div
                      key={perk.title}
                      title={perk.detail}
                      className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 text-[11px] font-semibold text-[#F5E1FF] flex items-start gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-[#4ADE80] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="truncate font-bold">{perk.title}</div>
                        <div className="text-[10px] text-[#D8B4FE]/80 truncate">{perk.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* HD Video & Screen Stream Quality */}
              <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#EC4899]" />
                  <div>
                    <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                      HD Streaming &amp; Camera Quality (Free)
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Stream screen shares and webcam video up to Source resolution &amp; 60fps at $0.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {STREAM_QUALITIES.map((sq) => {
                    const selected = (currentUser.streamQuality || '1080p60') === sq.id;
                    return (
                      <button
                        key={sq.id}
                        type="button"
                        onClick={() =>
                          onSaveProfile({
                            hasFreeNitro: true,
                            streamQuality: sq.id,
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#EC4899] bg-[#EC4899]/15'
                            : `${t.border} ${t.hoverBg}`
                        }`}
                      >
                        <div className={`text-xs font-bold ${t.textPrimary}`}>{sq.label}</div>
                        <div className={`text-[11px] mt-0.5 ${t.textMuted}`}>{sq.detail}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Entrance Sound & Soundboard Preview */}
              <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#EC4899]" />
                  <div>
                    <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                      Custom Voice Entrance Sound &amp; Soundboard (Free)
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Play a custom chime whenever you join a Voice Channel, plus trigger live Soundboard effects in calls.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ENTRANCE_SOUNDS.map((es) => {
                    const selected = (currentUser.entranceSound || 'default') === es.id;
                    return (
                      <button
                        key={es.id}
                        type="button"
                        onClick={() => {
                          onSaveProfile({
                            hasFreeNitro: true,
                            entranceSound: es.id,
                          });
                          soundEngine.playEntranceSound(es.id);
                        }}
                        className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#EC4899] bg-[#EC4899]/15'
                            : `${t.border} ${t.hoverBg}`
                        }`}
                      >
                        <div className={`text-xs font-bold ${t.textPrimary}`}>{es.name}</div>
                        <div className={`text-[11px] mt-0.5 truncate ${t.textMuted}`}>
                          {es.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className={`pt-3 border-t ${t.border} space-y-2`}>
                  <div className={`text-xs font-semibold ${t.textSecondary}`}>
                    Preview Voice Soundboard Clips (use live in any VC or DM Call)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SOUNDBOARD_CLIPS.map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => soundEngine.playSoundboard(clip.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.dockBg} ${t.textPrimary} ${t.hoverBg}`}
                      >
                        <span>{clip.emoji}</span>
                        <span>{clip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unlimited Free Server Boosts */}
              {servers.length > 0 && onToggleServerBoost && (
                <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-[#EC4899]" />
                    <div>
                      <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                        Unlimited Server Boosts (Free $0)
                      </h3>
                      <p className={`text-xs ${t.textMuted}`}>
                        Boost as many servers as you want for free to unlock Server Boost levels and badges.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {servers.map((srv) => {
                      const boosts = srv.boostUserIds || [];
                      const isBoosted = boosts.includes(currentUser.id);
                      const level = boosts.length >= 14 ? 3 : boosts.length >= 7 ? 2 : boosts.length >= 2 ? 1 : 0;
                      return (
                        <div
                          key={srv.id}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${nestedSurface}`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold truncate ${t.textPrimary}`}>
                                {srv.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#EC4899]/20 text-[#F472B6] text-[10px] font-bold">
                                Level {level} · {boosts.length} Boost{boosts.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleServerBoost(srv.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition-colors ${
                              isBoosted
                                ? 'bg-[#23A55A] hover:bg-[#1E8E4C] text-white'
                                : 'bg-gradient-to-r from-[#EC4899] to-[#E53935] text-white'
                            }`}
                          >
                            <Rocket className="w-3.5 h-3.5" />
                            <span>{isBoosted ? 'Boosted ✓' : 'Boost Server (Free)'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-Server Nicknames */}
              {servers.length > 0 && (
                <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#EC4899]" />
                    <div>
                      <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                        Per-Server Nicknames (Free)
                      </h3>
                      <p className={`text-xs ${t.textMuted}`}>
                        Set a unique display name in each server without changing your global Talkcob name.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={nickServerId || servers[0]?.id || ''}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setNickServerId(sid);
                        setNickDraft(currentUser.serverNicknames?.[sid] || '');
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold ${t.inputBg} ${t.border} ${t.textPrimary}`}
                    >
                      {servers.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={nickDraft}
                      onChange={(e) => setNickDraft(e.target.value)}
                      placeholder={`Nickname (default: ${currentUser.name})`}
                      maxLength={32}
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sid = nickServerId || servers[0]?.id;
                        if (!sid) return;
                        const nextMap = { ...(currentUser.serverNicknames || {}) };
                        if (nickDraft.trim()) {
                          nextMap[sid] = nickDraft.trim();
                        } else {
                          delete nextMap[sid];
                        }
                        onSaveProfile({
                          hasFreeNitro: true,
                          serverNicknames: nextMap,
                        });
                      }}
                      className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold shrink-0"
                    >
                      Save Nickname
                    </button>
                  </div>
                </div>
              )}

              {/* Avatar Decorations */}
              <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                      Avatar Decorations (Free)
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Add an animated glowing frame and badge around your profile picture.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {AVATAR_DECORATIONS.map((dec) => {
                    const selected = (currentUser.avatarDecoration || 'none') === dec.id;
                    return (
                      <button
                        key={dec.id}
                        type="button"
                        onClick={() =>
                          onSaveProfile({
                            hasFreeNitro: true,
                            avatarDecoration: dec.id,
                          })
                        }
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                          selected
                            ? 'border-[#EC4899] bg-[#EC4899]/15'
                            : `${t.border} ${t.hoverBg}`
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm bg-[#2B2D31] ${dec.previewClass}`}>
                          {dec.badgeText || '—'}
                        </div>
                        <span className={`text-xs font-semibold ${t.textPrimary}`}>
                          {dec.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile Banner Effects & Custom Banner */}
              <div className={`rounded-2xl border p-5 space-y-4 ${cardSurface}`}>
                <div>
                  <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                    Profile Effects &amp; Custom Banner (Free)
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Customize your profile card overlay and upload any custom banner photo or GIF.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROFILE_EFFECTS.map((fx) => {
                    const selected = (currentUser.profileEffect || 'none') === fx.id;
                    return (
                      <button
                        key={fx.id}
                        type="button"
                        onClick={() =>
                          onSaveProfile({
                            hasFreeNitro: true,
                            profileEffect: fx.id,
                          })
                        }
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          selected
                            ? 'border-[#EC4899] bg-[#EC4899]/15'
                            : `${t.border} ${t.hoverBg}`
                        }`}
                      >
                        <div
                          className="w-12 h-9 rounded-lg border border-white/15 shrink-0"
                          style={{
                            background: fx.overlayGradient || currentUser.bannerColor,
                          }}
                        />
                        <div className="min-w-0">
                          <div className={`text-xs font-bold ${t.textPrimary}`}>{fx.name}</div>
                          <div className={`text-[11px] truncate ${t.textMuted}`}>{fx.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Upload Custom Banner Image / GIF</span>
                  </button>
                  {currentUser.customBannerUrl && (
                    <button
                      type="button"
                      onClick={() => onSaveProfile({ customBannerUrl: undefined })}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold text-[#EF4444] ${t.border} ${t.hoverBg}`}
                    >
                      Remove Custom Banner
                    </button>
                  )}
                </div>
              </div>

              {/* Nameplate Gradients */}
              <div className={`rounded-2xl border p-5 space-y-3 ${cardSurface}`}>
                <div>
                  <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                    Glowing Nameplate Gradients (Free)
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Stand out in chat, member lists, and your profile with custom gradient display names.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {NAMEPLATE_GRADIENTS.map((grad) => {
                    const selected = (currentUser.nameplateGradient || '') === grad.id;
                    return (
                      <button
                        key={grad.label}
                        type="button"
                        onClick={() =>
                          onSaveProfile({
                            hasFreeNitro: true,
                            nameplateGradient: grad.id,
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#EC4899] bg-[#EC4899]/15'
                            : `${t.border} ${t.hoverBg}`
                        }`}
                      >
                        <div
                          className={`text-sm font-display font-extrabold truncate ${
                            grad.cssGradient ? 'bg-clip-text text-transparent' : t.textPrimary
                          }`}
                          style={grad.cssGradient ? { backgroundImage: grad.cssGradient } : undefined}
                        >
                          {currentUser.name}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${t.textMuted}`}>{grad.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick link to Talkcob AI Guide */}
              {onOpenAiHelp && (
                <div className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${cardSurface}`}>
                  <div>
                    <div className={`text-sm font-bold ${t.textPrimary}`}>
                      Want to learn more about Talkcob features?
                    </div>
                    <div className={`text-xs ${t.textMuted}`}>
                      Ask Talkcob AI anytime about voice/camera, bots, permissions, GIFs, stickers, soundboard, or admin tools.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAiHelp();
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#E53935] to-[#EC4899] text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask Talkcob AI</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {cropSourceSrc && (
        <AvatarCropModal
          imageSrc={cropSourceSrc}
          theme={theme}
          onCancel={() => setCropSourceSrc(null)}
          onApply={(croppedDataUrl) => {
            setAvatar(croppedDataUrl);
            onSaveProfile({ avatar: croppedDataUrl });
            setCropSourceSrc(null);
          }}
        />
      )}
    </div>
  );
};
