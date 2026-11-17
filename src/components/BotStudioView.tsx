import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Crop,
  Eye,
  EyeOff,
  Hash,
  ImagePlus,
  Menu,
  Play,
  Plus,
  Power,
  RefreshCw,
  ScrollText,
  Server as ServerIcon,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { AppTheme, CustomBot, CustomBotCommand, Server } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';
import { AvatarCropModal } from './AvatarCropModal';

type BotTab = 'profile' | 'commands' | 'behaviors' | 'servers';

interface BotStudioViewProps {
  bots: CustomBot[];
  servers: Server[];
  onCreateBot: (bot: CustomBot) => void;
  onUpdateBot: (botId: string, updates: Partial<CustomBot>) => void;
  onDeleteBot: (botId: string) => void;
  onOpenServer: (serverId: string) => void;
  onOpenMobileMenu: () => void;
  theme: AppTheme;
}

function generateBotToken(): string {
  const seg = () => Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TCB.${seg()}.${seg()}.${seg()}`;
}

export const BotStudioView: React.FC<BotStudioViewProps> = ({
  bots,
  servers,
  onCreateBot,
  onUpdateBot,
  onDeleteBot,
  onOpenServer,
  onOpenMobileMenu,
  theme,
}) => {
  const t = THEME_TOKENS[theme];
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || '');
  const [tab, setTab] = useState<BotTab>('profile');
  const [creatingNew, setCreatingNew] = useState<boolean>(false);

  // Create New Bot state
  const [newBotName, setNewBotName] = useState('');
  const [newBotPrefix, setNewBotPrefix] = useState('!');
  const [newBotColor, setNewBotColor] = useState('#E53935');
  const [newBotInstallAll, setNewBotInstallAll] = useState(true);

  // Token reveal / copy state
  const [revealToken, setRevealToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Cropper for Bot PFP
  const botPfpInputRef = useRef<HTMLInputElement>(null);
  const [cropSourceSrc, setCropSourceSrc] = useState<string | null>(null);

  // New Command Form state
  const [cmdType, setCmdType] = useState<'command' | 'keyword'>('command');
  const [cmdTrigger, setCmdTrigger] = useState('');
  const [cmdResponse, setCmdResponse] = useState('');
  const [cmdReactEmoji, setCmdReactEmoji] = useState('');
  const [cmdPin, setCmdPin] = useState(false);

  // Sandbox Test input
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);

  // Blocked word input
  const [blockedWordInput, setBlockedWordInput] = useState('');

  useEffect(() => {
    if (!bots.some((b) => b.id === selectedBotId)) {
      setSelectedBotId(bots[0]?.id || '');
    }
  }, [bots, selectedBotId]);

  const activeBot = bots.find((b) => b.id === selectedBotId) || bots[0];
  const colorChoices = ['#E53935', '#DC2626', '#F97316', '#16A34A', '#2563EB', '#7C3AED'];
  const quickReactionOptions = ['', '🌽', '🔥', '❤️', '👏', '✨', '👍', '🤖'];

  const handleCreateBotSubmit = (e: React.FormEvent, preset?: 'greeter' | 'mod') => {
    e.preventDefault();
    const cleanName =
      newBotName.trim() ||
      (preset === 'greeter' ? 'CornBot' : preset === 'mod' ? 'ShieldBot' : 'MyTalkcobBot');
    const cleanHandle =
      cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '') || `bot${Date.now().toString().slice(-4)}`;
    const prefix = newBotPrefix.trim() || '!';
    const botId = `bot-${Date.now()}`;

    const starterCommands: CustomBotCommand[] =
      preset === 'greeter'
        ? [
            {
              id: `cmd-${Date.now()}-1`,
              triggerType: 'command',
              trigger: `${prefix}hello`,
              response: 'Hey {user}! Welcome to {server} — everything here is 100% free!',
              reactEmoji: '🌽',
              enabled: true,
            },
            {
              id: `cmd-${Date.now()}-2`,
              triggerType: 'keyword',
              trigger: 'corn',
              response: 'Did someone say corn on the cob, {user}? 🌽',
              reactEmoji: '🌽',
              enabled: true,
            },
          ]
        : preset === 'mod'
        ? [
            {
              id: `cmd-${Date.now()}-1`,
              triggerType: 'command',
              trigger: `${prefix}rules`,
              response: 'Be respectful, keep channels welcoming, and have fun in {server}!',
              enabled: true,
            },
          ]
        : [
            {
              id: `cmd-${Date.now()}-1`,
              triggerType: 'command',
              trigger: `${prefix}ping`,
              response: 'Pong! {user} is online in {channel}.',
              reactEmoji: '🔥',
              enabled: true,
            },
          ];

    const created: CustomBot = {
      id: botId,
      name: cleanName,
      username: cleanHandle,
      accentColor: newBotColor,
      bio: `Custom Talkcob bot built in Bot Studio.`,
      statusText: `Listening for ${prefix} commands`,
      token: generateBotToken(),
      prefix,
      enabled: true,
      serverIds: newBotInstallAll ? servers.map((s) => s.id) : [],
      autoReplyOnMention: true,
      mentionReplyText: `Hi {user}! Type \`${prefix}${starterCommands[0]?.trigger.replace(/^[!/?.]+/, '') || 'ping'}\` to run my command.`,
      moderateBlockedWords: preset === 'mod',
      blockedWords: preset === 'mod' ? ['spam', 'scam'] : [],
      moderationWarningText: '{user}, your message matched a blocked keyword and was removed.',
      commands: starterCommands,
      createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      logs: [],
    };

    onCreateBot(created);
    setSelectedBotId(botId);
    setCreatingNew(false);
    setNewBotName('');
    setTab('commands');
  };

  const handleAddCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBot || !cmdTrigger.trim()) return;
    const rawTrig = cmdTrigger.trim();
    const formattedTrigger =
      cmdType === 'command' && !rawTrig.startsWith(activeBot.prefix) && !rawTrig.startsWith('/')
        ? `${activeBot.prefix}${rawTrig}`
        : rawTrig;

    const newCmd: CustomBotCommand = {
      id: `cmd-${Date.now()}`,
      triggerType: cmdType,
      trigger: formattedTrigger,
      response: cmdResponse.trim(),
      reactEmoji: cmdReactEmoji.trim() || undefined,
      pinTriggerMessage: cmdPin,
      enabled: true,
    };

    onUpdateBot(activeBot.id, {
      commands: [...activeBot.commands, newCmd],
    });
    setCmdTrigger('');
    setCmdResponse('');
    setCmdReactEmoji('');
    setCmdPin(false);
  };

  const handleRunSandbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBot || !sandboxInput.trim()) return;
    const msg = sandboxInput.trim();
    const lower = msg.toLowerCase();

    if (!activeBot.enabled) {
      setSandboxOutput('Bot is currently paused. Toggle Online to let it respond.');
      return;
    }

    if (
      activeBot.moderateBlockedWords &&
      activeBot.blockedWords.some((w) => lower.includes(w.toLowerCase()))
    ) {
      setSandboxOutput(
        `[Auto-Deleted User Message] Bot replied: "${activeBot.moderationWarningText
          .replace(/\{user\}/g, '@you')
          .replace(/\{name\}/g, 'You')
          .replace(/\{server\}/g, servers[0]?.name || 'Talkcob HQ')
          .replace(/\{channel\}/g, '#general')}"`
      );
      return;
    }

    const matchedCmd = activeBot.commands.find((c) => {
      if (!c.enabled) return false;
      if (c.triggerType === 'command') {
        const tLower = c.trigger.toLowerCase();
        return lower === tLower || lower.startsWith(`${tLower} `);
      }
      return lower.includes(c.trigger.toLowerCase());
    });

    if (matchedCmd) {
      const parts: string[] = [];
      if (matchedCmd.reactEmoji) parts.push(`Reacted ${matchedCmd.reactEmoji}`);
      if (matchedCmd.pinTriggerMessage) parts.push('Pinned message');
      if (matchedCmd.response.trim()) {
        const rendered = matchedCmd.response
          .replace(/\{user\}/g, '@you')
          .replace(/\{name\}/g, 'You')
          .replace(/\{server\}/g, servers[0]?.name || 'Talkcob HQ')
          .replace(/\{channel\}/g, '#general');
        parts.push(`Replied: "${rendered}"`);
      }
      setSandboxOutput(parts.join(' · ') || 'Matched trigger with no output action.');
      return;
    }

    if (
      activeBot.autoReplyOnMention &&
      (lower.includes(`@${activeBot.username.toLowerCase()}`) ||
        lower.includes(`@${activeBot.name.toLowerCase()}`))
    ) {
      const rendered = activeBot.mentionReplyText
        .replace(/\{user\}/g, '@you')
        .replace(/\{name\}/g, 'You')
        .replace(/\{server\}/g, servers[0]?.name || 'Talkcob HQ')
        .replace(/\{channel\}/g, '#general');
      setSandboxOutput(`Mention Reply: "${rendered}"`);
      return;
    }

    if (activeBot.autoReactEmoji) {
      setSandboxOutput(`Auto-reacted ${activeBot.autoReactEmoji} to your message.`);
      return;
    }

    setSandboxOutput('No matching command or keyword rule triggered for that test input.');
  };

  const handleBotIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropSourceSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <main className={`flex-1 min-w-0 h-full flex flex-col ${t.chatBg}`}>
      <input
        ref={botPfpInputRef}
        type="file"
        accept="image/*"
        onChange={handleBotIconSelect}
        className="hidden"
      />

      {/* Top Header */}
      <header
        className={`h-12 px-4 shrink-0 flex items-center justify-between gap-3 border-b ${t.headerBg} ${t.border}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation sidebar"
            className={`md:hidden p-1.5 rounded-md text-[#EF4444] ${t.hoverBg}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <Bot className="w-5 h-5 text-[#EF4444] shrink-0" />
          <h1 className={`font-display font-bold text-[15px] truncate ${t.textPrimary}`}>
            Bot Studio
          </h1>
          <span className={`hidden sm:inline text-xs ${t.textMuted}`}>
            · Build Discord-style bots & control what they do (100% Free)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCreatingNew(true)}
          className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Bot</span>
        </button>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left List: Your Bot Applications */}
        <aside
          className={`w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r p-3.5 overflow-y-auto talkcob-scroll space-y-2 ${t.sidebarBg} ${t.border}`}
        >
          <div className={`text-[11px] font-bold uppercase tracking-wider px-1 ${t.textMuted}`}>
            Your Applications ({bots.length})
          </div>

          {bots.length === 0 ? (
            <div className={`p-4 rounded-xl border text-center space-y-2.5 ${t.dockBg} ${t.border}`}>
              <Bot className="w-8 h-8 mx-auto text-[#EF4444]" />
              <p className={`text-xs ${t.textMuted}`}>
                No bots created yet. Servers stay completely bot-free unless you create and add one here.
              </p>
              <button
                type="button"
                onClick={() => setCreatingNew(true)}
                className="w-full py-1.5 px-3 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold"
              >
                Create Your First Bot
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {bots.map((bot) => {
                const isSelected = activeBot?.id === bot.id && !creatingNew;
                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => {
                      setCreatingNew(false);
                      setSelectedBotId(bot.id);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'border-[#E53935] bg-[#E53935]/15'
                        : `${t.border} ${t.dockBg} ${t.hoverBg}`
                    }`}
                  >
                    <Avatar
                      name={bot.name}
                      src={bot.avatar}
                      accentColor={bot.accentColor}
                      size="sm"
                      status={bot.enabled ? 'online' : 'offline'}
                      showStatus
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold truncate ${t.textPrimary}`}>
                          {bot.name}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-[#E53935] text-white text-[9px] font-bold uppercase shrink-0">
                          BOT
                        </span>
                      </div>
                      <div className={`text-[11px] truncate ${t.textMuted}`}>
                        {bot.commands.length} commands · {bot.serverIds.length} servers
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Workspace: Create New Bot Form OR Active Bot Studio */}
        <section className="flex-1 min-w-0 overflow-y-auto talkcob-scroll p-5 sm:p-8">
          <div className="max-w-3xl mx-auto">
            {creatingNew || !activeBot ? (
              <div className={`rounded-2xl border p-6 space-y-6 ${t.sidebarBg} ${t.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className={`font-display font-bold text-xl ${t.textPrimary}`}>
                      Create a Talkcob Bot
                    </h2>
                    <p className={`text-sm mt-1 ${t.textMuted}`}>
                      Build a custom bot just like Discord Developer Portal, control its commands, auto-reactions, and moderation rules, and choose which servers it joins.
                    </p>
                  </div>
                  {bots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCreatingNew(false)}
                      className={`p-1.5 rounded-lg text-[#EF4444] ${t.hoverBg}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <form onSubmit={(e) => handleCreateBotSubmit(e)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                        Bot Name
                      </label>
                      <input
                        type="text"
                        value={newBotName}
                        onChange={(e) => setNewBotName(e.target.value)}
                        placeholder="e.g. CornBot, HelperBot, ModGuard"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                        Command Prefix
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={newBotPrefix}
                        onChange={(e) => setNewBotPrefix(e.target.value)}
                        placeholder="!"
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${t.textSecondary}`}>
                      Bot Badge Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorChoices.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewBotColor(c)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            newBotColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2B2D31]' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Choose color ${c}`}
                        >
                          {newBotColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBotInstallAll}
                      onChange={(e) => setNewBotInstallAll(e.target.checked)}
                      className="w-4 h-4 accent-[#E53935]"
                    />
                    <span className={t.textPrimary}>
                      Automatically add this bot to Talkcob HQ & your servers
                    </span>
                  </label>

                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-sm font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Bot</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCreateBotSubmit(e, 'greeter')}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                    >
                      Quick Template: Greeter & Corn Bot
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCreateBotSubmit(e, 'mod')}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                    >
                      Quick Template: AutoMod Bot
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Bot Header Bar */}
                <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.sidebarBg} ${t.border}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar
                      name={activeBot.name}
                      src={activeBot.avatar}
                      accentColor={activeBot.accentColor}
                      size="lg"
                      status={activeBot.enabled ? 'online' : 'offline'}
                      showStatus
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className={`font-display font-bold text-lg truncate ${t.textPrimary}`}>
                          {activeBot.name}
                        </h2>
                        <span className="px-1.5 py-0.5 rounded bg-[#E53935] text-white text-[10px] font-bold uppercase">
                          BOT
                        </span>
                      </div>
                      <p className={`text-xs truncate ${t.textMuted}`}>
                        @{activeBot.username} · Prefix <code className="text-[#EF4444] font-mono">{activeBot.prefix}</code> ·{' '}
                        {activeBot.enabled ? 'Online & Listening' : 'Paused'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBot(activeBot.id, { enabled: !activeBot.enabled })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        activeBot.enabled
                          ? 'bg-[#23A55A] hover:bg-[#1E8E4C] text-white'
                          : `border ${t.border} ${t.textSecondary} ${t.hoverBg}`
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{activeBot.enabled ? 'Online' : 'Paused'}</span>
                    </button>

                    {activeBot.serverIds[0] && (
                      <button
                        type="button"
                        onClick={() => onOpenServer(activeBot.serverIds[0])}
                        className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <span>Test in Server</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Editor Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { id: 'profile', label: 'Bot Profile & Token', icon: Bot },
                    { id: 'commands', label: `Commands & Triggers (${activeBot.commands.length})`, icon: Terminal },
                    { id: 'behaviors', label: 'Auto-Behaviors & Mod', icon: ShieldAlert },
                    { id: 'servers', label: `Servers & Logs (${activeBot.serverIds.length})`, icon: ServerIcon },
                  ] as const).map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                          active
                            ? 'bg-[#E53935] text-white'
                            : `border ${t.border} ${t.sidebarBg} ${t.textSecondary} ${t.hoverBg}`
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SUB-TAB 1: PROFILE & TOKEN */}
                {tab === 'profile' && (
                  <div className="space-y-5">
                    <div className={`rounded-2xl border p-5 space-y-5 ${t.sidebarBg} ${t.border}`}>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className={`font-display font-bold text-base ${t.textPrimary}`}>
                            Bot Avatar & Identity
                          </h3>
                          <p className={`text-xs ${t.textMuted}`}>
                            Upload and crop a custom picture for your bot.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => botPfpInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            <span>Upload & Crop PFP</span>
                          </button>
                          {activeBot.avatar && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCropSourceSrc(activeBot.avatar || null)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                              >
                                <Crop className="w-3.5 h-3.5 text-[#EF4444]" />
                                <span>Re-Crop</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateBot(activeBot.id, { avatar: undefined })}
                                className={`p-1.5 rounded-lg border text-[#EF4444] ${t.border} hover:bg-[#E53935]/15`}
                                title="Remove bot picture"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                            Bot Name
                          </label>
                          <input
                            type="text"
                            value={activeBot.name}
                            onChange={(e) => onUpdateBot(activeBot.id, { name: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                            Bot Handle
                          </label>
                          <input
                            type="text"
                            value={activeBot.username}
                            onChange={(e) =>
                              onUpdateBot(activeBot.id, {
                                username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase(),
                              })
                            }
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                            Command Prefix
                          </label>
                          <input
                            type="text"
                            maxLength={3}
                            value={activeBot.prefix}
                            onChange={(e) => onUpdateBot(activeBot.id, { prefix: e.target.value || '!' })}
                            className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                          Custom Status Text (shown in Member List)
                        </label>
                        <input
                          type="text"
                          value={activeBot.statusText}
                          onChange={(e) => onUpdateBot(activeBot.id, { statusText: e.target.value })}
                          placeholder="Playing Talkcob Games"
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                          Bot Bio / Description
                        </label>
                        <textarea
                          rows={2}
                          value={activeBot.bio}
                          onChange={(e) => onUpdateBot(activeBot.id, { bio: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                        />
                      </div>
                    </div>

                    {/* Developer Bot Token Card */}
                    <div className={`rounded-2xl border p-5 space-y-3 ${t.sidebarBg} ${t.border}`}>
                      <div className={`text-sm font-bold ${t.textPrimary}`}>Bot Developer Token</div>
                      <div className={`flex flex-wrap items-center gap-2 p-2.5 rounded-lg border ${t.inputBg} ${t.border}`}>
                        <code className={`flex-1 text-xs font-mono truncate ${t.textPrimary}`}>
                          {revealToken
                            ? activeBot.token
                            : `${activeBot.token.slice(0, 8)}••••••••••••••••••••`}
                        </code>
                        <button
                          type="button"
                          onClick={() => setRevealToken((p) => !p)}
                          className={`p-1.5 rounded-md text-[#EF4444] ${t.hoverBg}`}
                          title={revealToken ? 'Hide token' : 'Reveal token'}
                        >
                          {revealToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(activeBot.token).catch(() => {});
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 1500);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#E53935] text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBot(activeBot.id, { token: generateBotToken() })}
                          className={`px-2.5 py-1 rounded-md border text-xs font-semibold inline-flex items-center gap-1 ${t.border} ${t.textSecondary} ${t.hoverBg}`}
                        >
                          <RefreshCw className="w-3 h-3 text-[#EF4444]" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onDeleteBot(activeBot.id)}
                        className="px-4 py-2 rounded-lg border border-[#E53935]/50 text-[#EF4444] hover:bg-[#E53935] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Bot Application</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: COMMANDS & TRIGGERS */}
                {tab === 'commands' && (
                  <div className="space-y-6">
                    {/* Add Command Form */}
                    <form
                      onSubmit={handleAddCommand}
                      className={`rounded-2xl border p-5 space-y-4 ${t.sidebarBg} ${t.border}`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#EF4444]" />
                        <h3 className={`font-display font-bold text-base ${t.textPrimary}`}>
                          Add Command or Trigger
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                            Trigger Type
                          </label>
                          <select
                            value={cmdType}
                            onChange={(e) => setCmdType(e.target.value as 'command' | 'keyword')}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                          >
                            <option value="command">Command ({activeBot.prefix} or /)</option>
                            <option value="keyword">Contains Keyword</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                            {cmdType === 'command' ? 'Command Name' : 'Keyword to Match'}
                          </label>
                          <input
                            type="text"
                            required
                            value={cmdTrigger}
                            onChange={(e) => setCmdTrigger(e.target.value)}
                            placeholder={cmdType === 'command' ? `${activeBot.prefix}hello` : 'corn'}
                            className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <label className={`text-xs font-semibold ${t.textSecondary}`}>
                            Bot Reply Message
                          </label>
                          <div className="flex items-center gap-1">
                            {['{user}', '{name}', '{server}', '{channel}'].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() =>
                                  setCmdResponse((prev) => (prev ? `${prev} ${tag}` : tag))
                                }
                                className="px-1.5 py-0.5 rounded bg-[#E53935]/15 text-[#EF4444] text-[11px] font-mono hover:bg-[#E53935] hover:text-white transition-colors"
                              >
                                +{tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={cmdResponse}
                          onChange={(e) => setCmdResponse(e.target.value)}
                          placeholder="Hey {user}, welcome to {server}!"
                          className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${t.textSecondary}`}>
                            Auto-React Emoji:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {quickReactionOptions.map((em) => (
                              <button
                                key={em || 'none'}
                                type="button"
                                onClick={() => setCmdReactEmoji(em)}
                                className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                                  cmdReactEmoji === em
                                    ? 'border-[#E53935] bg-[#E53935]/15 text-[#EF4444]'
                                    : `${t.border} ${t.textMuted} ${t.hoverBg}`
                                }`}
                              >
                                {em || 'None'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cmdPin}
                            onChange={(e) => setCmdPin(e.target.checked)}
                            className="w-4 h-4 accent-[#E53935]"
                          />
                          <span className={t.textPrimary}>Pin trigger message</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Command</span>
                      </button>
                    </form>

                    {/* Existing Commands List */}
                    <div className="space-y-2.5">
                      {activeBot.commands.length === 0 ? (
                        <div className={`p-6 rounded-xl border text-center text-sm ${t.sidebarBg} ${t.border} ${t.textMuted}`}>
                          No commands added yet. Add one above!
                        </div>
                      ) : (
                        activeBot.commands.map((cmd) => (
                          <div
                            key={cmd.id}
                            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${t.sidebarBg} ${t.border}`}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <code className="px-2 py-0.5 rounded bg-[#E53935]/15 text-[#EF4444] text-xs font-mono font-bold">
                                  {cmd.trigger}
                                </code>
                                <span className={`text-[11px] uppercase font-semibold ${t.textMuted}`}>
                                  {cmd.triggerType}
                                </span>
                                {cmd.reactEmoji && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.dockBg}`}>
                                    React {cmd.reactEmoji}
                                  </span>
                                )}
                                {cmd.pinTriggerMessage && (
                                  <span className="text-[11px] text-[#EF4444] font-semibold">
                                    Auto-Pin
                                  </span>
                                )}
                              </div>
                              {cmd.response && (
                                <p className={`text-xs ${t.textSecondary} break-words`}>
                                  &ldquo;{cmd.response}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateBot(activeBot.id, {
                                    commands: activeBot.commands.map((c) =>
                                      c.id === cmd.id ? { ...c, enabled: !c.enabled } : c
                                    ),
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                  cmd.enabled
                                    ? 'bg-[#23A55A]/15 text-[#23A55A]'
                                    : `border ${t.border} ${t.textMuted}`
                                }`}
                              >
                                {cmd.enabled ? 'Enabled' : 'Disabled'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateBot(activeBot.id, {
                                    commands: activeBot.commands.filter((c) => c.id !== cmd.id),
                                  })
                                }
                                aria-label={`Delete command ${cmd.trigger}`}
                                className="p-1.5 rounded-md text-[#EF4444] hover:bg-[#E53935]/15"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Sandbox Simulator */}
                    <form
                      onSubmit={handleRunSandbox}
                      className={`rounded-2xl border p-5 space-y-3 ${t.sidebarBg} ${t.border}`}
                    >
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-[#EF4444]" />
                        <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                          Test Bot Behavior (Sandbox)
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={sandboxInput}
                          onChange={(e) => setSandboxInput(e.target.value)}
                          placeholder={`Type a test message (e.g. ${
                            activeBot.commands[0]?.trigger || `${activeBot.prefix}ping`
                          })`}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold whitespace-nowrap shrink-0"
                        >
                          Simulate
                        </button>
                      </div>
                      {sandboxOutput && (
                        <div className={`p-3 rounded-lg border text-xs font-mono ${t.dockBg} ${t.border} ${t.textPrimary}`}>
                          {sandboxOutput}
                        </div>
                      )}
                    </form>
                  </div>
                )}

                {/* SUB-TAB 3: AUTO-BEHAVIORS & MODERATION */}
                {tab === 'behaviors' && (
                  <div className="space-y-5">
                    {/* Auto-React on Every Message */}
                    <div className={`rounded-2xl border p-5 space-y-3 ${t.sidebarBg} ${t.border}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className={`text-sm font-bold ${t.textPrimary}`}>
                            Auto-React to Every Message
                          </div>
                          <div className={`text-xs ${t.textMuted}`}>
                            Automatically react with an emoji whenever someone sends a message in an active server.
                          </div>
                        </div>
                        <span className="text-lg">{activeBot.autoReactEmoji || 'Off'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {quickReactionOptions.map((em) => (
                          <button
                            key={em || 'off'}
                            type="button"
                            onClick={() =>
                              onUpdateBot(activeBot.id, { autoReactEmoji: em || undefined })
                            }
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              (activeBot.autoReactEmoji || '') === em
                                ? 'border-[#E53935] bg-[#E53935]/15 text-[#EF4444]'
                                : `${t.border} ${t.textSecondary} ${t.hoverBg}`
                            }`}
                          >
                            {em || 'Off'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto-Reply on @Mention */}
                    <div className={`rounded-2xl border p-5 space-y-3 ${t.sidebarBg} ${t.border}`}>
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                          <div className={`text-sm font-bold ${t.textPrimary}`}>
                            Reply When Mentioned (@{activeBot.username})
                          </div>
                          <div className={`text-xs ${t.textMuted}`}>
                            Send an automatic response whenever a member tags this bot in a channel.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={activeBot.autoReplyOnMention}
                          onChange={(e) =>
                            onUpdateBot(activeBot.id, { autoReplyOnMention: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#E53935]"
                        />
                      </label>
                      <input
                        type="text"
                        value={activeBot.mentionReplyText}
                        onChange={(e) =>
                          onUpdateBot(activeBot.id, { mentionReplyText: e.target.value })
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                    </div>

                    {/* Auto-Moderation Blocked Words */}
                    <div className={`rounded-2xl border p-5 space-y-4 ${t.sidebarBg} ${t.border}`}>
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                          <div className={`text-sm font-bold ${t.textPrimary}`}>
                            Moderation: Auto-Delete Blocked Words
                          </div>
                          <div className={`text-xs ${t.textMuted}`}>
                            Automatically delete messages containing blocked words and post a warning notice.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={activeBot.moderateBlockedWords}
                          onChange={(e) =>
                            onUpdateBot(activeBot.id, { moderateBlockedWords: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#E53935]"
                        />
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={blockedWordInput}
                          onChange={(e) => setBlockedWordInput(e.target.value)}
                          placeholder="Add word for this bot to block..."
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const clean = blockedWordInput.trim().toLowerCase();
                            if (!clean || activeBot.blockedWords.includes(clean)) return;
                            onUpdateBot(activeBot.id, {
                              blockedWords: [...activeBot.blockedWords, clean],
                            });
                            setBlockedWordInput('');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#E53935] text-white text-xs font-semibold"
                        >
                          Add Word
                        </button>
                      </div>

                      {activeBot.blockedWords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {activeBot.blockedWords.map((w) => (
                            <span
                              key={w}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold ${t.dockBg} ${t.border} ${t.textPrimary}`}
                            >
                              <span>{w}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateBot(activeBot.id, {
                                    blockedWords: activeBot.blockedWords.filter((item) => item !== w),
                                  })
                                }
                                className="text-[#EF4444]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>
                          Warning Message Posted When Triggered
                        </label>
                        <input
                          type="text"
                          value={activeBot.moderationWarningText}
                          onChange={(e) =>
                            onUpdateBot(activeBot.id, { moderationWarningText: e.target.value })
                          }
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary}`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 4: SERVERS & EXECUTION LOG */}
                {tab === 'servers' && (
                  <div className="space-y-5">
                    <div className={`rounded-2xl border p-5 space-y-3 ${t.sidebarBg} ${t.border}`}>
                      <h3 className={`font-display font-bold text-base ${t.textPrimary}`}>
                        Installed Servers
                      </h3>
                      <p className={`text-xs ${t.textMuted}`}>
                        Choose which servers {activeBot.name} is allowed to operate in. Direct Messages always remain bot-free.
                      </p>

                      <div className="space-y-2">
                        {servers.map((srv) => {
                          const installed = activeBot.serverIds.includes(srv.id);
                          return (
                            <div
                              key={srv.id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${t.dockBg} ${t.border}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-xs text-white shrink-0 overflow-hidden"
                                  style={{ backgroundColor: srv.iconUrl ? undefined : srv.accentColor }}
                                >
                                  {srv.iconUrl ? (
                                    <img
                                      src={srv.iconUrl}
                                      alt={srv.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    srv.shortName
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-sm font-bold truncate ${t.textPrimary}`}>
                                    {srv.name}
                                  </div>
                                  <div className={`text-xs ${t.textMuted}`}>
                                    {installed ? 'Bot active in channels' : 'Not added to this server'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {installed && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenServer(srv.id)}
                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${t.border} ${t.textPrimary} ${t.hoverBg}`}
                                  >
                                    <Hash className="w-3.5 h-3.5 text-[#EF4444]" />
                                    <span>Open</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextIds = installed
                                      ? activeBot.serverIds.filter((id) => id !== srv.id)
                                      : [...activeBot.serverIds, srv.id];
                                    onUpdateBot(activeBot.id, { serverIds: nextIds });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    installed
                                      ? 'bg-[#E53935] text-white hover:bg-[#C62828]'
                                      : 'bg-[#23A55A] text-white hover:bg-[#1E8E4C]'
                                  }`}
                                >
                                  {installed ? 'Remove' : 'Add to Server'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bot Execution Log */}
                    <div className={`rounded-2xl border p-5 space-y-3 ${t.sidebarBg} ${t.border}`}>
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-[#EF4444]" />
                        <h3 className={`font-display font-bold text-base ${t.textPrimary}`}>
                          Recent Bot Actions ({activeBot.logs.length})
                        </h3>
                      </div>

                      {activeBot.logs.length === 0 ? (
                        <p className={`text-xs ${t.textMuted}`}>
                          No actions triggered yet. Type a command in any channel where this bot is installed!
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {activeBot.logs.map((entry) => (
                            <div
                              key={entry.id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${t.dockBg} ${t.border}`}
                            >
                              <span className={t.textPrimary}>{entry.summary}</span>
                              <span className={`font-mono shrink-0 ${t.textMuted}`}>
                                {entry.timestamp}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {cropSourceSrc && activeBot && (
        <AvatarCropModal
          imageSrc={cropSourceSrc}
          theme={theme}
          onCancel={() => setCropSourceSrc(null)}
          onApply={(croppedDataUrl) => {
            onUpdateBot(activeBot.id, { avatar: croppedDataUrl });
            setCropSourceSrc(null);
          }}
        />
      )}
    </main>
  );
};
