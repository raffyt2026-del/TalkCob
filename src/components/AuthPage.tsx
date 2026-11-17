import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Coffee,
  Crop,
  Eye,
  EyeOff,
  Gamepad2,
  Headphones,
  ImagePlus,
  LogIn,
  Mic,
  Music,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { User } from '../types/talkcob';
import { Avatar } from './Avatar';
import { AvatarCropModal } from './AvatarCropModal';
import { TalkcobIcon, TalkcobWordmark } from './TalkcobIcon';

export interface SignUpPayload {
  displayName: string;
  username: string;
  password: string;
  bio: string;
  avatar?: string;
  accentColor: string;
}

interface AuthPageProps {
  initialMode: 'signup' | 'login';
  users: Record<string, User>;
  savedAccountIds: string[];
  banNotice?: string | null;
  onDismissBanNotice?: () => void;
  onSignUp: (payload: SignUpPayload) => Promise<string | null>;
  onLogIn: (
    usernameOrId: string,
    password: string,
    skipPasswordForSaved?: boolean
  ) => Promise<string | null>;
}

type CaptchaChallengeKind = 'corn' | 'headphones' | 'mic';

interface CaptchaTile {
  id: string;
  kind: CaptchaChallengeKind | 'coffee' | 'gamepad' | 'music' | 'sparkles';
}

const CHALLENGE_PROMPTS: Record<CaptchaChallengeKind, string> = {
  corn: 'Corn on the Cob',
  headphones: 'Headphones',
  mic: 'Microphones',
};

function createCaptchaGrid(): { target: CaptchaChallengeKind; tiles: CaptchaTile[] } {
  const targets: CaptchaChallengeKind[] = ['corn', 'headphones', 'mic'];
  const target = targets[Math.floor(Math.random() * targets.length)];
  const distractors: Array<CaptchaTile['kind']> = (
    ['corn', 'headphones', 'mic', 'coffee', 'gamepad', 'music', 'sparkles'] as Array<
      CaptchaTile['kind']
    >
  ).filter((k) => k !== target);

  const pool: CaptchaTile['kind'][] = [
    target,
    target,
    target,
    distractors[0],
    distractors[1],
    distractors[2],
    distractors[3],
    distractors[4],
    distractors[5],
  ];

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return {
    target,
    tiles: pool.map((kind, idx) => ({ id: `tile-${idx}-${Date.now()}`, kind })),
  };
}

const CornIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <path
      d="M7 22C8.5 18 11.5 16.5 14 18L11 26L7 22Z"
      fill="#22C55E"
      stroke="#14532D"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M14 29C18 28 20.5 25 19.5 22L11 26L14 29Z"
      fill="#16A34A"
      stroke="#14532D"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <g transform="translate(18 17) rotate(-42)">
      <rect
        x="-10"
        y="-4.6"
        width="19"
        height="9.2"
        rx="4.6"
        fill="#FACC15"
        stroke="#854D0E"
        strokeWidth="1.5"
      />
      <path d="M-7 0H6.5M-5 -4V4M-0.5 -4V4M4 -4V4" stroke="#CA8A04" strokeWidth="1.1" />
    </g>
  </svg>
);

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode,
  users,
  savedAccountIds,
  banNotice,
  onDismissBanNotice,
  onSignUp,
  onLogIn,
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);

  // Sign-Up fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [accentColor, setAccentColor] = useState('#E53935');
  const [cropSourceSrc, setCropSourceSrc] = useState<string | null>(null);
  const pfpInputRef = useRef<HTMLInputElement>(null);

  // CAPTCHA state ("Verify you're not a robot")
  const [captchaExpanded, setCaptchaExpanded] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaGrid, setCaptchaGrid] = useState(() => createCaptchaGrid());
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Log-In fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9._]/g, '');

  const usernameTaken = useMemo(() => {
    if (!normalizedUsername) return false;
    return Object.values(users).some(
      (u) => u.username.toLowerCase() === normalizedUsername
    );
  }, [normalizedUsername, users]);

  const savedAccounts = useMemo(
    () =>
      savedAccountIds
        .map((id) => users[id])
        .filter((u): u is User => Boolean(u)),
    [savedAccountIds, users]
  );

  const colorChoices = ['#E53935', '#DC2626', '#F97316', '#16A34A', '#2563EB', '#7C3AED'];

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropSourceSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRefreshCaptcha = () => {
    setCaptchaGrid(createCaptchaGrid());
    setSelectedTileIds([]);
    setCaptchaError(null);
    setCaptchaVerified(false);
  };

  const toggleCaptchaTile = (id: string) => {
    if (captchaVerified) return;
    setCaptchaError(null);
    setSelectedTileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleVerifyCaptcha = () => {
    const expectedIds = captchaGrid.tiles
      .filter((tile) => tile.kind === captchaGrid.target)
      .map((tile) => tile.id);

    const exactMatch =
      selectedTileIds.length === expectedIds.length &&
      expectedIds.every((id) => selectedTileIds.includes(id));

    if (exactMatch) {
      setCaptchaVerified(true);
      setCaptchaExpanded(false);
      setCaptchaError(null);
    } else {
      setCaptchaError(
        `Please select every tile showing ${CHALLENGE_PROMPTS[captchaGrid.target]} and no extra tiles.`
      );
      setCaptchaGrid(createCaptchaGrid());
      setSelectedTileIds([]);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!displayName.trim()) {
      setFormError('Please enter a display name.');
      return;
    }
    if (normalizedUsername.length < 2) {
      setFormError('Username must be at least 2 letters or numbers.');
      return;
    }
    if (usernameTaken) {
      setFormError('That username is already taken. Try a slightly different handle.');
      return;
    }
    if (password.length < 4) {
      setFormError('Please choose a password (at least 4 characters) so you can log back in later.');
      return;
    }
    if (!captchaVerified) {
      setCaptchaExpanded(true);
      setFormError('Please complete the "I am not a robot" verification challenge below.');
      return;
    }

    setSubmitting(true);
    try {
      const err = await onSignUp({
        displayName: displayName.trim(),
        username: normalizedUsername,
        password,
        bio: bio.trim() || 'New member on Talkcob!',
        avatar,
        accentColor,
      });
      if (err) setFormError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const clean = loginUsername.trim();
    if (!clean) {
      setFormError('Enter your username to log in.');
      return;
    }
    setSubmitting(true);
    try {
      const err = await onLogIn(clean, loginPassword, false);
      if (err) setFormError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTileIcon = (kind: CaptchaTile['kind']) => {
    switch (kind) {
      case 'corn':
        return <CornIcon className="w-8 h-8" />;
      case 'headphones':
        return <Headphones className="w-7 h-7 text-[#F8FAFC]" />;
      case 'mic':
        return <Mic className="w-7 h-7 text-[#EF4444]" />;
      case 'coffee':
        return <Coffee className="w-7 h-7 text-[#FDBA74]" />;
      case 'gamepad':
        return <Gamepad2 className="w-7 h-7 text-[#A5B4FC]" />;
      case 'music':
        return <Music className="w-7 h-7 text-[#F472B6]" />;
      case 'sparkles':
        return <Sparkles className="w-7 h-7 text-[#FDE047]" />;
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-y-auto talkcob-scroll bg-[#111215] text-[#F2F3F5] flex flex-col justify-between p-4 sm:p-8">
      {/* Discord-inspired deep red/obsidian atmospheric backdrop */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(229, 57, 53, 0.24) 0%, transparent 45%), radial-gradient(circle at 84% 78%, rgba(185, 28, 28, 0.22) 0%, transparent 48%), linear-gradient(155deg, #161113 0%, #111215 55%, #181316 100%)',
          }}
        />
        <svg
          className="absolute -bottom-24 -left-24 w-[460px] h-[460px] opacity-[0.06]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="85" stroke="#EF4444" strokeWidth="2" />
          <circle cx="100" cy="100" r="58" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="6 6" />
        </svg>
        <div className="hidden lg:block absolute right-10 bottom-10 opacity-15">
          <TalkcobIcon size={150} variant="mark" mascotColor="#EF4444" />
        </div>
      </div>

      {/* Top brand bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-1">
        <TalkcobWordmark size="md" />
        <div className="text-xs font-medium text-[#B5BAC1]">
          100% Free Voice &amp; Community Chat
        </div>
      </header>

      {/* Main Discord-style centered auth card */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-[540px] rounded-xl bg-[#2B2D31] border border-[#3F4147] shadow-2xl p-6 sm:p-8">
          {banNotice && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/50 flex items-start justify-between gap-3 text-xs text-[#FCA5A5]"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Access Blocked</div>
                  <div className="mt-0.5">{banNotice}</div>
                </div>
              </div>
              {onDismissBanNotice && (
                <button
                  type="button"
                  onClick={onDismissBanNotice}
                  className="text-[#EF4444] hover:text-white text-xs font-bold shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
          {mode === 'signup' ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center mb-2">
                  <TalkcobIcon size={44} variant="badge" />
                </div>
                <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
                  Create an account
                </h1>
                <p className="text-xs sm:text-sm text-[#B5BAC1] mt-1">
                  Customize your profile picture, handle, and description. Your account stays saved when you come back.
                </p>
              </div>

              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Hidden file input */}
                <input
                  ref={pfpInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />

                {/* Profile Picture + Accent Swatch Picker */}
                <div className="p-3.5 rounded-lg bg-[#1E1F22] border border-[#383A40] flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="button"
                    onClick={() => pfpInputRef.current?.click()}
                    title="Upload and crop profile picture"
                    className="group relative w-20 h-20 rounded-full shrink-0 overflow-hidden flex items-center justify-center border-2 border-[#E53935]/70 bg-[#2B2D31] focus:outline-none focus:ring-2 focus:ring-[#E53935]"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="w-full h-full flex items-center justify-center font-display font-bold text-2xl text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {(displayName.trim() || username.trim() || 'TC')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-0.5">
                      <Camera className="w-4 h-4 text-[#EF4444]" />
                      <span>Upload</span>
                    </div>
                  </button>

                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1]">
                      PROFILE PICTURE (PFP)
                    </div>
                    <p className="text-xs text-[#949BA4] mt-0.5">
                      Pick a photo from your files or photos and crop it to fit.
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => pfpInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold transition-colors"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>{avatar ? 'Change PFP' : 'Upload PFP'}</span>
                      </button>

                      {avatar && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCropSourceSrc(avatar)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#2B2D31] hover:bg-[#383A40] border border-[#3F4147] text-xs font-semibold text-white transition-colors"
                          >
                            <Crop className="w-3.5 h-3.5 text-[#EF4444]" />
                            <span>Crop</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatar(undefined)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#2B2D31] hover:bg-[#383A40] border border-[#3F4147] text-xs font-semibold text-[#F87171] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </>
                      )}

                      <div className="flex items-center gap-1.5 ml-1">
                        {colorChoices.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setAccentColor(c)}
                            aria-label={`Select accent color ${c}`}
                            className={`w-4 h-4 rounded-full transition-transform ${
                              accentColor === c ? 'ring-2 ring-white scale-110' : 'opacity-75 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="signup-display-name"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1] mb-1.5"
                    >
                      DISPLAY NAME <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      id="signup-display-name"
                      type="text"
                      required
                      maxLength={32}
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="How others see you"
                      className="w-full px-3 py-2.5 rounded-md bg-[#1E1F22] border border-[#383A40] text-sm text-white placeholder:text-[#6D727D] focus:outline-none focus:ring-2 focus:ring-[#E53935]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signup-username"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1] mb-1.5"
                    >
                      USERNAME <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#80848E]">
                        @
                      </span>
                      <input
                        id="signup-username"
                        type="text"
                        required
                        maxLength={24}
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''));
                          setFormError(null);
                        }}
                        placeholder="your_handle"
                        className="w-full pl-7 pr-3 py-2.5 rounded-md bg-[#1E1F22] border border-[#383A40] text-sm text-white placeholder:text-[#6D727D] focus:outline-none focus:ring-2 focus:ring-[#E53935]"
                      />
                    </div>
                    {normalizedUsername.length >= 2 && (
                      <p
                        className={`text-[11px] mt-1 font-medium ${
                          usernameTaken ? 'text-[#F87171]' : 'text-[#23A55A]'
                        }`}
                      >
                        {usernameTaken ? 'Username is already taken' : `@${normalizedUsername} is available`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1] mb-1.5"
                  >
                    PASSWORD <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Create a password to sign back in later"
                      className="w-full px-3 py-2.5 pr-10 rounded-md bg-[#1E1F22] border border-[#383A40] text-sm text-white placeholder:text-[#6D727D] focus:outline-none focus:ring-2 focus:ring-[#E53935]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#949BA4] hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Description / Bio */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="signup-description"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1]"
                    >
                      DESCRIPTION
                    </label>
                    <span className="text-[11px] text-[#80848E] tabular-nums">
                      {bio.length}/190
                    </span>
                  </div>
                  <textarea
                    id="signup-description"
                    rows={2}
                    maxLength={190}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell friends and servers about yourself..."
                    className="w-full px-3 py-2 rounded-md bg-[#1E1F22] border border-[#383A40] text-sm text-white placeholder:text-[#6D727D] focus:outline-none focus:ring-2 focus:ring-[#E53935] resize-none"
                  />
                </div>

                {/* Human Verification CAPTCHA */}
                <div className="rounded-lg bg-[#1E1F22] border border-[#383A40] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!captchaVerified) {
                          setCaptchaExpanded((prev) => !prev);
                          setCaptchaError(null);
                        }
                      }}
                      className="flex items-center gap-3 text-left flex-1 focus:outline-none"
                    >
                      <span
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                          captchaVerified
                            ? 'bg-[#23A55A] border-[#23A55A] text-white'
                            : captchaExpanded
                            ? 'border-[#EF4444] bg-[#2B2D31]'
                            : 'border-[#6D727D] bg-[#2B2D31] hover:border-[#EF4444]'
                        }`}
                      >
                        {captchaVerified && <Check className="w-4 h-4 stroke-[3]" />}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {captchaVerified ? 'Verified: You are not a robot' : 'I am not a robot'}
                        </div>
                        <div className="text-[11px] text-[#949BA4]">
                          {captchaVerified
                            ? 'Human check passed — ready to create your account'
                            : 'Click to solve the quick visual verification'}
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-col items-end shrink-0">
                      <ShieldCheck
                        className={`w-6 h-6 ${
                          captchaVerified ? 'text-[#23A55A]' : 'text-[#EF4444]'
                        }`}
                      />
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#80848E] mt-0.5">
                        Talkcob Check
                      </span>
                    </div>
                  </div>

                  {captchaExpanded && !captchaVerified && (
                    <div className="mt-3.5 pt-3.5 border-t border-[#383A40]">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="text-xs font-semibold text-white">
                          Select all tiles with{' '}
                          <span className="text-[#FACC15] font-bold">
                            {CHALLENGE_PROMPTS[captchaGrid.target]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRefreshCaptcha}
                          title="New challenge"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B5BAC1] hover:text-white px-2 py-1 rounded bg-[#2B2D31] border border-[#3F4147]"
                        >
                          <RefreshCw className="w-3 h-3 text-[#EF4444]" />
                          <span>New</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {captchaGrid.tiles.map((tile) => {
                          const isSelected = selectedTileIds.includes(tile.id);
                          return (
                            <button
                              key={tile.id}
                              type="button"
                              onClick={() => toggleCaptchaTile(tile.id)}
                              className={`h-14 rounded-lg border flex items-center justify-center relative transition-all ${
                                isSelected
                                  ? 'bg-[#E53935]/20 border-[#EF4444] ring-2 ring-[#EF4444]/60 scale-[0.97]'
                                  : 'bg-[#2B2D31] border-[#3F4147] hover:border-[#6D727D]'
                              }`}
                            >
                              {renderTileIcon(tile.kind)}
                              {isSelected && (
                                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {captchaError && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#F87171] font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{captchaError}</span>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleVerifyCaptcha}
                          className="px-4 py-1.5 rounded-md bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="p-2.5 rounded-md bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center gap-2 text-xs text-[#FCA5A5] font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-md bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#E53935]/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{submitting ? 'Creating Account...' : 'Continue & Create Account'}</span>
                </button>

                <div className="pt-1 text-center text-xs text-[#949BA4]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFormError(null);
                    }}
                    className="text-[#EF4444] hover:underline font-semibold"
                  >
                    Log In
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center mb-2">
                  <TalkcobIcon size={44} variant="badge" />
                </div>
                <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
                  Welcome back!
                </h1>
                <p className="text-xs sm:text-sm text-[#B5BAC1] mt-1">
                  We&rsquo;re so excited to see you again on Talkcob!
                </p>
              </div>

              {savedAccounts.length > 0 && (
                <div className="mb-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1] mb-2">
                    SAVED ACCOUNTS ON THIS DEVICE
                  </div>
                  <div className="space-y-2">
                    {savedAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-lg bg-[#1E1F22] border border-[#383A40] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={acc.name}
                            src={acc.avatar}
                            accentColor={acc.accentColor}
                            size="md"
                            status="online"
                            showStatus
                            statusBorderClass="border-[#1E1F22]"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">
                              {acc.name}
                            </div>
                            <div className="text-xs text-[#949BA4] truncate">
                              @{acc.username}
                              {acc.bio ? ` · ${acc.bio}` : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={async () => {
                            if (acc.isPlatformOwner || acc.isPlatformAdmin) {
                              setLoginUsername(acc.username);
                              setFormError(
                                `Enter the password for @${acc.username} below to sign in.`
                              );
                              return;
                            }
                            setSubmitting(true);
                            try {
                              const err = await onLogIn(acc.id, '', true);
                              if (err) setFormError(err);
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-md bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                        >
                          {acc.isPlatformOwner || acc.isPlatformAdmin ? 'Enter Password' : 'Continue'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleLogInSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1] mb-1.5"
                  >
                    USERNAME <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="Enter your @username"
                    className="w-full px-3 py-2.5 rounded-md bg-[#1E1F22] border border-[#383A40] text-sm text-white placeholder:text-[#6D727D] focus:outline-none focus:ring-2 focus:ring-[#E53935]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1] mb-1.5"
                  >
                    PASSWORD <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2.5 pr-10 rounded-md bg-[#1E1F22] border border-[#383A40] text-sm text-white placeholder:text-[#6D727D] focus:outline-none focus:ring-2 focus:ring-[#E53935]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#949BA4] hover:text-white p-1"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-md bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center gap-2 text-xs text-[#FCA5A5] font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-md bg-[#E53935] hover:bg-[#C62828] disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#E53935]/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{submitting ? 'Logging In...' : 'Log In'}</span>
                </button>

                <div className="pt-1 text-center text-xs text-[#949BA4]">
                  Need an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setFormError(null);
                    }}
                    className="text-[#EF4444] hover:underline font-semibold"
                  >
                    Register
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="relative z-10 text-center text-[11px] text-[#80848E] flex items-center justify-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#23A55A]" />
        <span>Accounts are saved locally so your profile, PFP, servers, and bots stay ready when you return.</span>
      </footer>

      {cropSourceSrc && (
        <AvatarCropModal
          imageSrc={cropSourceSrc}
          theme="dark"
          onCancel={() => setCropSourceSrc(null)}
          onApply={(croppedDataUrl) => {
            setAvatar(croppedDataUrl);
            setCropSourceSrc(null);
          }}
        />
      )}
    </div>
  );
};
