import { AvatarDecorationId, ProfileEffectId } from '../types/talkcob';

export const AVATAR_DECORATIONS: Array<{
  id: AvatarDecorationId;
  name: string;
  previewClass: string;
  ringStyle: string;
  badgeText?: string;
}> = [
  {
    id: 'none',
    name: 'None',
    previewClass: 'border border-dashed border-[#4E5058]',
    ringStyle: '',
  },
  {
    id: 'crimson-flame',
    name: 'Crimson Flame',
    previewClass: 'ring-2 ring-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.85)]',
    ringStyle:
      'ring-[3px] ring-[#EF4444] shadow-[0_0_14px_rgba(239,68,68,0.8)] animate-pulse',
    badgeText: '🔥',
  },
  {
    id: 'gold-crown',
    name: 'Royal Gold',
    previewClass: 'ring-2 ring-[#FACC15] shadow-[0_0_12px_rgba(250,204,21,0.85)]',
    ringStyle: 'ring-[3px] ring-[#FACC15] shadow-[0_0_14px_rgba(250,204,21,0.75)]',
    badgeText: '👑',
  },
  {
    id: 'cyber-prism',
    name: 'Cyber Neon',
    previewClass: 'ring-2 ring-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.85)]',
    ringStyle: 'ring-[3px] ring-[#38BDF8] shadow-[0_0_14px_rgba(56,189,248,0.8)]',
    badgeText: '⚡',
  },
  {
    id: 'emerald-pulse',
    name: 'Emerald Aura',
    previewClass: 'ring-2 ring-[#23A55A] shadow-[0_0_12px_rgba(35,165,90,0.85)]',
    ringStyle: 'ring-[3px] ring-[#23A55A] shadow-[0_0_14px_rgba(35,165,90,0.8)]',
    badgeText: '💎',
  },
  {
    id: 'starlight',
    name: 'Starlight Violet',
    previewClass: 'ring-2 ring-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.85)]',
    ringStyle: 'ring-[3px] ring-[#A855F7] shadow-[0_0_14px_rgba(168,85,247,0.85)]',
    badgeText: '✨',
  },
  {
    id: 'rainbow-aura',
    name: 'Prismatic Nitro',
    previewClass: 'ring-2 ring-[#EC4899] shadow-[0_0_14px_rgba(236,72,153,0.85)]',
    ringStyle: 'ring-[3px] ring-[#EC4899] shadow-[0_0_16px_rgba(236,72,153,0.85)]',
    badgeText: '🌈',
  },
];

export const PROFILE_EFFECTS: Array<{
  id: ProfileEffectId;
  name: string;
  description: string;
  overlayGradient: string;
}> = [
  {
    id: 'none',
    name: 'None',
    description: 'Clean banner with no overlay effect',
    overlayGradient: '',
  },
  {
    id: 'aurora',
    name: 'Northern Aurora',
    description: 'Shifting cyan & violet glow over your profile banner',
    overlayGradient:
      'linear-gradient(120deg, rgba(56,189,248,0.45), rgba(168,85,247,0.45), rgba(35,165,90,0.35))',
  },
  {
    id: 'ember-sparks',
    name: 'Crimson Embers',
    description: 'Warm red & gold nitro flare',
    overlayGradient:
      'linear-gradient(135deg, rgba(229,57,53,0.6), rgba(250,204,21,0.35), rgba(153,27,27,0.5))',
  },
  {
    id: 'confetti',
    name: 'Party Confetti',
    description: 'Bright pink, gold & cyan celebratory gradient',
    overlayGradient:
      'linear-gradient(135deg, rgba(236,72,153,0.5), rgba(250,204,21,0.4), rgba(56,189,248,0.45))',
  },
  {
    id: 'cyber-grid',
    name: 'Synthwave Neon',
    description: 'Deep purple & magenta studio sheen',
    overlayGradient:
      'linear-gradient(135deg, rgba(139,92,246,0.55), rgba(236,72,153,0.45), rgba(15,23,42,0.5))',
  },
];

export const NAMEPLATE_GRADIENTS: Array<{
  id: string;
  label: string;
  cssGradient: string;
}> = [
  { id: '', label: 'Default', cssGradient: '' },
  {
    id: 'linear-gradient(90deg, #FF512F, #F09819)',
    label: 'Solar Flare',
    cssGradient: 'linear-gradient(90deg, #FF512F, #F09819)',
  },
  {
    id: 'linear-gradient(90deg, #EC4899, #8B5CF6, #38BDF8)',
    label: 'Nitro Prism',
    cssGradient: 'linear-gradient(90deg, #EC4899, #8B5CF6, #38BDF8)',
  },
  {
    id: 'linear-gradient(90deg, #23A55A, #38BDF8)',
    label: 'Mint Cyber',
    cssGradient: 'linear-gradient(90deg, #23A55A, #38BDF8)',
  },
  {
    id: 'linear-gradient(90deg, #FACC15, #F97316, #EF4444)',
    label: 'Royal Blaze',
    cssGradient: 'linear-gradient(90deg, #FACC15, #F97316, #EF4444)',
  },
  {
    id: 'linear-gradient(90deg, #A855F7, #EC4899)',
    label: 'Nebula Glow',
    cssGradient: 'linear-gradient(90deg, #A855F7, #EC4899)',
  },
];

export const SOUNDBOARD_CLIPS: Array<{
  id: string;
  label: string;
  emoji: string;
}> = [
  { id: 'airhorn', label: 'Airhorn', emoji: '📣' },
  { id: 'gg', label: 'GG Fanfare', emoji: '🏆' },
  { id: 'drumroll', label: 'Drumroll', emoji: '🥁' },
  { id: 'trombone', label: 'Sad Trombone', emoji: '🎺' },
  { id: 'laser', label: 'Hyper Laser', emoji: '⚡' },
  { id: 'levelup', label: 'Level Up', emoji: '🎮' },
  { id: 'boost', label: 'Nitro Boost', emoji: '🚀' },
  { id: 'chime', label: 'Sparkle', emoji: '✨' },
];

export const ENTRANCE_SOUNDS: Array<{
  id: string;
  name: string;
  description: string;
}> = [
  { id: 'default', name: 'Classic Talkcob Join', description: 'Standard voice channel join chime' },
  { id: 'boost', name: 'Nitro Boost Fanfare', description: 'Rising holographic chord on join' },
  { id: 'levelup', name: '8-Bit Level Up', description: 'Retro arcade power-up melody' },
  { id: 'gg', name: 'GG Victory', description: 'Bright 4-note champion entrance' },
  { id: 'laser', name: 'Cyber Laser', description: 'Futuristic sci-fi entrance sweep' },
];

export const STREAM_QUALITIES: Array<{
  id: '720p30' | '1080p60' | 'source';
  label: string;
  detail: string;
}> = [
  { id: '720p30', label: '720p · 30fps', detail: 'Standard bandwidth' },
  { id: '1080p60', label: '1080p · 60fps HD', detail: 'Unlocked Free Nitro HD' },
  { id: 'source', label: 'Source · 60fps Ultra', detail: 'Max clarity & bitrate' },
];

export const NITRO_PERKS_LIST: Array<{
  title: string;
  detail: string;
}> = [
  { title: '4,000-Character Messages', detail: 'Double the standard 2,000-character message cap' },
  { title: '500 MB Large File Uploads', detail: 'Send bigger clips, GIFs, and high-res photos free' },
  { title: 'HD 1080p 60fps / Source Streaming', detail: 'Crisp 60fps webcam & screen share in VC and calls' },
  { title: 'Unlimited Free Server Boosts', detail: 'Boost servers to Level 1, 2 & 3 at $0 cost' },
  { title: 'Custom Stickers Anywhere', detail: 'Send & pin KLIPY animated stickers across all chats' },
  { title: 'Voice Soundboard & Entrance Sounds', detail: 'Play live soundboard clips & custom join audio in VC' },
  { title: 'Super Reactions & Unlimited Reactions', detail: 'Drop glowing Nitro ⚡ Super Reactions on any message' },
  { title: 'Animated Avatars, Decorations & Profile Effects', detail: 'Custom GIF PFPs, banner effects & gradient nameplates' },
  { title: 'Per-Server Nicknames & Profiles', detail: 'Set custom server nicknames & join up to 200 servers' },
];

export function getAvatarDecorationMeta(id?: AvatarDecorationId) {
  return AVATAR_DECORATIONS.find((d) => d.id === id) || AVATAR_DECORATIONS[0];
}

export function getProfileEffectMeta(id?: ProfileEffectId) {
  return PROFILE_EFFECTS.find((e) => e.id === id) || PROFILE_EFFECTS[0];
}
