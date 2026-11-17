import { AppTheme } from '../types/talkcob';

export interface ThemeTokens {
  railBg: string;
  sidebarBg: string;
  sidebarSecondaryBg: string;
  chatBg: string;
  headerBg: string;
  composerBg: string;
  dockBg: string;
  hoverBg: string;
  activeBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  modalBg: string;
  inputBg: string;
  pillBorder: string;
}

export const THEME_TOKENS: Record<AppTheme, ThemeTokens> = {
  dark: {
    railBg: 'bg-[#1E1F22]',
    sidebarBg: 'bg-[#2B2D31]',
    sidebarSecondaryBg: 'bg-[#2B2D31]',
    chatBg: 'bg-[#313338]',
    headerBg: 'bg-[#313338]',
    composerBg: 'bg-[#383A40]',
    dockBg: 'bg-[#232428]',
    hoverBg: 'hover:bg-[#35373C]',
    activeBg: 'bg-[#404249]',
    border: 'border-[#3F4147]',
    textPrimary: 'text-[#F2F3F5]',
    textSecondary: 'text-[#DBDEE1]',
    textMuted: 'text-[#949BA4]',
    modalBg: 'bg-[#313338]',
    inputBg: 'bg-[#1E1F22]',
    pillBorder: 'border-[#1E1F22]',
  },
  obsidian: {
    railBg: 'bg-[#090B0E]',
    sidebarBg: 'bg-[#111318]',
    sidebarSecondaryBg: 'bg-[#111318]',
    chatBg: 'bg-[#161920]',
    headerBg: 'bg-[#161920]',
    composerBg: 'bg-[#1E222B]',
    dockBg: 'bg-[#0D0F14]',
    hoverBg: 'hover:bg-[#1D2029]',
    activeBg: 'bg-[#252A36]',
    border: 'border-[#252932]',
    textPrimary: 'text-[#F8FAFC]',
    textSecondary: 'text-[#CBD5E1]',
    textMuted: 'text-[#7E899B]',
    modalBg: 'bg-[#161920]',
    inputBg: 'bg-[#0B0D11]',
    pillBorder: 'border-[#090B0E]',
  },
  light: {
    railBg: 'bg-[#E3E5E8]',
    sidebarBg: 'bg-[#F2F3F5]',
    sidebarSecondaryBg: 'bg-[#F2F3F5]',
    chatBg: 'bg-[#FFFFFF]',
    headerBg: 'bg-[#FFFFFF]',
    composerBg: 'bg-[#EBEDEF]',
    dockBg: 'bg-[#E9EBEF]',
    hoverBg: 'hover:bg-[#E3E5E8]',
    activeBg: 'bg-[#D7D9DE]',
    border: 'border-[#E1E3E6]',
    textPrimary: 'text-[#060607]',
    textSecondary: 'text-[#313338]',
    textMuted: 'text-[#5C5E66]',
    modalBg: 'bg-[#FFFFFF]',
    inputBg: 'bg-[#F2F3F5]',
    pillBorder: 'border-[#FFFFFF]',
  },
};
