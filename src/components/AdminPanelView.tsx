import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Crown,
  Globe,
  Menu,
  RefreshCw,
  Search,
  Server as ServerIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { HOME_SERVER_ID } from '../data/seedData';
import { AdminOverviewData, AppTheme, Channel, Server, User } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';

type AdminTab = 'users' | 'bans' | 'servers' | 'admins';

interface AdminPanelViewProps {
  currentUser: User;
  users: Record<string, User>;
  servers: Server[];
  channels: Channel[];
  onOpenServer: (serverId: string) => void;
  onOpenMobileMenu: () => void;
  refreshSignal: number;
  theme: AppTheme;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  users,
  servers,
  channels,
  onOpenServer,
  onOpenMobileMenu,
  refreshSignal,
  theme,
}) => {
  const t = THEME_TOKENS[theme];
  const [tab, setTab] = useState<AdminTab>('users');
  const [search, setSearch] = useState('');
  const [overview, setOverview] = useState<AdminOverviewData>({
    bannedAccounts: [],
    bannedIps: [],
    userIpsByUserId: {},
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Per-user ban composer
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banAlsoIp, setBanAlsoIp] = useState(false);

  // Manual IP ban form
  const [manualIp, setManualIp] = useState('');
  const [manualIpReason, setManualIpReason] = useState('');

  // Server add member & delete confirm state
  const [serverAddInput, setServerAddInput] = useState<Record<string, string>>({});
  const [confirmDeleteServerId, setConfirmDeleteServerId] = useState<string | null>(null);

  // Admin panel add person state
  const [addAdminInput, setAddAdminInput] = useState('');

  const cardSurface =
    theme === 'light'
      ? 'bg-white border-[#E1E3E6]'
      : theme === 'obsidian'
      ? 'bg-[#161920] border-[#242834]'
      : 'bg-[#2B2D31] border-[#3F4147]';

  const nestedSurface =
    theme === 'light'
      ? 'bg-[#F6F7F9] border-[#E1E3E6]'
      : theme === 'obsidian'
      ? 'bg-[#0F1218] border-[#1E222D]'
      : 'bg-[#1E1F22] border-[#383A40]';

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/overview?actorUserId=${encodeURIComponent(currentUser.id)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        bannedAccounts?: AdminOverviewData['bannedAccounts'];
        bannedIps?: AdminOverviewData['bannedIps'];
        userIpsByUserId?: AdminOverviewData['userIpsByUserId'];
      };
      if (res.ok && data.ok) {
        setOverview({
          bannedAccounts: data.bannedAccounts || [],
          bannedIps: data.bannedIps || [],
          userIpsByUserId: data.userIpsByUserId || {},
        });
      }
    } catch {
      // Ignore network blip
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview, refreshSignal]);

  const humanUsers = useMemo(
    () =>
      Object.values(users)
        .filter((u) => !u.isBot && u.role !== 'Bot')
        .sort((a, b) => {
          if (a.isPlatformOwner && !b.isPlatformOwner) return -1;
          if (!a.isPlatformOwner && b.isPlatformOwner) return 1;
          if (a.isPlatformAdmin && !b.isPlatformAdmin) return -1;
          if (!a.isPlatformAdmin && b.isPlatformAdmin) return 1;
          return a.name.localeCompare(b.name);
        }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return humanUsers;
    return humanUsers.filter((u) => {
      const ips = (overview.userIpsByUserId[u.id] || []).join(' ').toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        ips.includes(q)
      );
    });
  }, [humanUsers, overview.userIpsByUserId, search]);

  const adminUsers = useMemo(
    () => humanUsers.filter((u) => u.isPlatformOwner || u.isPlatformAdmin),
    [humanUsers]
  );

  const nonAdminActiveUsers = useMemo(
    () => humanUsers.filter((u) => !u.isPlatformOwner && !u.isPlatformAdmin && !u.isBanned),
    [humanUsers]
  );

  const showStatusMsg = (ok: boolean, text: string) => {
    setFeedback({ ok, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleBanUser = async (targetUser: User) => {
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          targetUserId: targetUser.id,
          reason: banReason.trim() || 'Banned from Talkcob via Admin Panel.',
          alsoIpBan: banAlsoIp,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        deletedUsernames?: string[];
        bannedAccounts?: AdminOverviewData['bannedAccounts'];
        bannedIps?: AdminOverviewData['bannedIps'];
        userIpsByUserId?: AdminOverviewData['userIpsByUserId'];
      };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Could not ban user.');
        return;
      }
      setOverview({
        bannedAccounts: data.bannedAccounts || [],
        bannedIps: data.bannedIps || [],
        userIpsByUserId: data.userIpsByUserId || overview.userIpsByUserId,
      });
      setBanTargetId(null);
      setBanReason('');
      setBanAlsoIp(false);
      const deletedCount = data.deletedUsernames?.length || 0;
      showStatusMsg(
        true,
        banAlsoIp
          ? `@${targetUser.username} was IP banned. Deleted ${deletedCount} account${deletedCount === 1 ? '' : 's'} on that IP and blocked new signups.`
          : `@${targetUser.username} was banned from Talkcob.`
      );
    } catch {
      showStatusMsg(false, 'Network error while banning user.');
    }
  };

  const handleUnbanUser = async (targetUserId: string, label: string) => {
    try {
      const res = await fetch('/api/admin/unban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          targetUserId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        bannedAccounts?: AdminOverviewData['bannedAccounts'];
        bannedIps?: AdminOverviewData['bannedIps'];
        userIpsByUserId?: AdminOverviewData['userIpsByUserId'];
      };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Failed to unban user.');
        return;
      }
      setOverview({
        bannedAccounts: data.bannedAccounts || [],
        bannedIps: data.bannedIps || [],
        userIpsByUserId: data.userIpsByUserId || overview.userIpsByUserId,
      });
      showStatusMsg(true, `${label} has been unbanned.`);
    } catch {
      showStatusMsg(false, 'Network error while unbanning user.');
    }
  };

  const handleBanIp = async (ipValue: string, targetUser?: User, reasonValue?: string) => {
    try {
      const res = await fetch('/api/admin/ban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          ip: ipValue.trim(),
          targetUserId: targetUser?.id,
          reason: (reasonValue || '').trim() || 'IP banned from Talkcob via Admin Panel.',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        deletedUsernames?: string[];
        bannedAccounts?: AdminOverviewData['bannedAccounts'];
        bannedIps?: AdminOverviewData['bannedIps'];
        userIpsByUserId?: AdminOverviewData['userIpsByUserId'];
      };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Could not apply IP ban.');
        return;
      }
      setOverview({
        bannedAccounts: data.bannedAccounts || [],
        bannedIps: data.bannedIps || [],
        userIpsByUserId: data.userIpsByUserId || overview.userIpsByUserId,
      });
      setManualIp('');
      setManualIpReason('');
      const purgedCount = data.deletedUsernames?.length || 0;
      showStatusMsg(
        true,
        purgedCount > 0
          ? `IP ${ipValue || 'address'} banned: deleted ${purgedCount} account${purgedCount === 1 ? '' : 's'} (${data.deletedUsernames!.map((u) => `@${u}`).join(', ')}) and blocked new account creation.`
          : `IP address ${ipValue} banned from Talkcob. New account creation from this IP is blocked.`
      );
    } catch {
      showStatusMsg(false, 'Network error while applying IP ban.');
    }
  };

  const handleUnbanIp = async (idOrIp: string, ipLabel: string) => {
    try {
      const res = await fetch('/api/admin/unban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          idOrIp,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        bannedAccounts?: AdminOverviewData['bannedAccounts'];
        bannedIps?: AdminOverviewData['bannedIps'];
        userIpsByUserId?: AdminOverviewData['userIpsByUserId'];
      };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Could not remove IP ban.');
        return;
      }
      setOverview({
        bannedAccounts: data.bannedAccounts || [],
        bannedIps: data.bannedIps || [],
        userIpsByUserId: data.userIpsByUserId || overview.userIpsByUserId,
      });
      showStatusMsg(true, `IP ban removed for ${ipLabel}.`);
    } catch {
      showStatusMsg(false, 'Network error while removing IP ban.');
    }
  };

  const handleDeleteServer = async (srv: Server) => {
    try {
      const res = await fetch('/api/admin/servers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          serverId: srv.id,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Failed to delete server.');
        return;
      }
      setConfirmDeleteServerId(null);
      showStatusMsg(true, `Server "${srv.name}" has been deleted.`);
    } catch {
      showStatusMsg(false, 'Network error while deleting server.');
    }
  };

  const handleAddPersonToServer = async (srv: Server) => {
    const query = (serverAddInput[srv.id] || '').trim();
    if (!query) return;
    try {
      const res = await fetch('/api/admin/servers/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          serverId: srv.id,
          targetUserIdOrUsername: query,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        addedUser?: User;
      };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Could not add user to server.');
        return;
      }
      setServerAddInput((prev) => ({ ...prev, [srv.id]: '' }));
      showStatusMsg(
        true,
        `Added @${data.addedUser?.username || query} to ${srv.name}.`
      );
    } catch {
      showStatusMsg(false, 'Network error while adding user to server.');
    }
  };

  const handleAddAdmin = async (targetQuery: string) => {
    const clean = targetQuery.trim();
    if (!clean) return;
    try {
      const res = await fetch('/api/admin/admins/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          targetUserIdOrUsername: clean,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; user?: User };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Could not add person to Admin Panel.');
        return;
      }
      setAddAdminInput('');
      showStatusMsg(
        true,
        `@${data.user?.username || clean} now has Admin Panel access.`
      );
    } catch {
      showStatusMsg(false, 'Network error while updating admin access.');
    }
  };

  const handleRemoveAdmin = async (target: User) => {
    try {
      const res = await fetch('/api/admin/admins/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          targetUserId: target.id,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        showStatusMsg(false, data.error || 'Could not remove admin.');
        return;
      }
      showStatusMsg(true, `Removed Admin Panel access from @${target.username}.`);
    } catch {
      showStatusMsg(false, 'Network error while removing admin.');
    }
  };

  return (
    <main className={`flex-1 min-w-0 h-full flex flex-col ${t.chatBg}`}>
      {/* Header */}
      <header className={`h-14 px-4 sm:px-6 flex items-center justify-between border-b ${t.border} shrink-0`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className={`md:hidden p-1.5 rounded-md ${t.hoverBg} ${t.textPrimary}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-[#E53935] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#E53935]/25">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`font-display font-bold text-base sm:text-lg truncate ${t.textPrimary}`}>
                Talkcob Admin Panel
              </h1>
              {currentUser.isPlatformOwner ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15] text-[10px] font-bold uppercase tracking-wide shrink-0">
                  <Crown className="w-3 h-3" />
                  <span>Owner</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E53935]/15 border border-[#E53935]/40 text-[#EF4444] text-[10px] font-bold uppercase tracking-wide shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </span>
              )}
            </div>
            <p className={`text-xs truncate ${t.textMuted}`}>
              Manage user bans, IP bans, server deletion, server members, and Admin Panel access
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchOverview()}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textSecondary} ${t.hoverBg} transition-colors shrink-0`}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#EF4444] ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto talkcob-scroll p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Quick Status Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${cardSurface}`}>
              <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                Accounts
              </div>
              <div className={`mt-1 text-2xl font-display font-extrabold tabular-nums ${t.textPrimary}`}>
                {humanUsers.length}
              </div>
            </div>
            <div className={`p-3.5 rounded-xl border ${cardSurface}`}>
              <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                Account & IP Bans
              </div>
              <div className="mt-1 text-2xl font-display font-extrabold tabular-nums text-[#EF4444]">
                {overview.bannedAccounts.length} / {overview.bannedIps.length}
              </div>
            </div>
            <div className={`p-3.5 rounded-xl border ${cardSurface}`}>
              <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                Servers
              </div>
              <div className={`mt-1 text-2xl font-display font-extrabold tabular-nums ${t.textPrimary}`}>
                {servers.length}
              </div>
            </div>
            <div className={`p-3.5 rounded-xl border ${cardSurface}`}>
              <div className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                Admin Panel Team
              </div>
              <div className="mt-1 text-2xl font-display font-extrabold tabular-nums text-[#23A55A]">
                {adminUsers.length}
              </div>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
                feedback.ok
                  ? 'bg-[#23A55A]/15 border-[#23A55A]/40 text-[#4ADE80]'
                  : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#FCA5A5]'
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className={`flex flex-wrap gap-1.5 p-1.5 rounded-xl border ${nestedSurface}`}>
            {[
              { id: 'users' as const, label: 'Users & Ban Controls', icon: Users },
              {
                id: 'bans' as const,
                label: `Bans & IP Bans (${overview.bannedAccounts.length + overview.bannedIps.length})`,
                icon: Ban,
              },
              { id: 'servers' as const, label: `Servers (${servers.length})`, icon: ServerIcon },
              { id: 'admins' as const, label: `Admin Team (${adminUsers.length})`, icon: Shield },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                    active
                      ? 'bg-[#E53935] text-white shadow-sm'
                      : `${t.textSecondary} ${t.hoverBg}`
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: USERS & BAN CONTROLS */}
          {tab === 'users' && (
            <div className="space-y-4">
              {/* Direct IP Ban Card */}
              <div className={`p-4 rounded-xl border space-y-3 ${cardSurface}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#EF4444]" />
                    <h2 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                      Quick IP Ban (Deletes All Accounts on IP &amp; Blocks Signups)
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-[#FCA5A5]">
                    Non-owner accounts on the banned IP are permanently deleted
                  </span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualIp.trim()) return;
                    void handleBanIp(manualIp, undefined, manualIpReason);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5"
                >
                  <input
                    type="text"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    placeholder="IP address (e.g. 203.0.113.45)"
                    className={`px-3 py-2 rounded-lg border text-sm font-mono ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                  <input
                    type="text"
                    value={manualIpReason}
                    onChange={(e) => setManualIpReason(e.target.value)}
                    placeholder="Ban reason (optional)"
                    className={`px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                  <button
                    type="submit"
                    disabled={!manualIp.trim()}
                    className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] disabled:opacity-45 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>IP Ban</span>
                  </button>
                </form>
              </div>

              {/* Search Bar */}
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${cardSurface}`}>
                <Search className="w-4 h-4 text-[#EF4444] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people by name, @username, or IP address..."
                  className={`flex-1 bg-transparent text-sm focus:outline-none ${t.textPrimary} placeholder:text-[#80848E]`}
                />
              </div>

              {/* Users List */}
              <div className="space-y-2.5">
                {filteredUsers.map((user) => {
                  const userIps = overview.userIpsByUserId[user.id] || [];
                  const latestIp = userIps[0];
                  const isBanningThis = banTargetId === user.id;
                  const isIpAlreadyBanned = Boolean(
                    latestIp && overview.bannedIps.some((b) => b.ip === latestIp)
                  );

                  return (
                    <div key={user.id} className={`p-4 rounded-xl border space-y-3 ${cardSurface}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={user.name}
                            src={user.avatar}
                            accentColor={user.accentColor}
                            size="md"
                            status={user.status}
                            showStatus
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`font-display font-bold text-sm truncate ${t.textPrimary}`}>
                                {user.name}
                              </span>
                              {user.isPlatformOwner && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15] text-[10px] font-bold uppercase">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>Talkcob Owner</span>
                                </span>
                              )}
                              {!user.isPlatformOwner && user.isPlatformAdmin && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E53935]/15 border border-[#E53935]/40 text-[#EF4444] text-[10px] font-bold uppercase">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  <span>Admin</span>
                                </span>
                              )}
                              {user.isBanned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EF4444] text-white text-[10px] font-bold uppercase">
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>Banned</span>
                                </span>
                              )}
                            </div>
                            <div className={`text-xs flex flex-wrap items-center gap-2 mt-0.5 ${t.textMuted}`}>
                              <span>@{user.username}</span>
                              <span>·</span>
                              <span className="font-mono">
                                IP: {latestIp || 'Not connected yet'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {!user.isPlatformOwner && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {!user.isPlatformAdmin && !user.isBanned && (
                              <button
                                type="button"
                                onClick={() => void handleAddAdmin(user.id)}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${t.border} ${t.textSecondary} ${t.hoverBg} transition-colors`}
                              >
                                <UserPlus className="w-3.5 h-3.5 text-[#23A55A]" />
                                <span>Add to Admin</span>
                              </button>
                            )}

                            {user.isBanned ? (
                              <button
                                type="button"
                                onClick={() => void handleUnbanUser(user.id, `@${user.username}`)}
                                className="px-3 py-1.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-bold inline-flex items-center gap-1 transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Unban</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBanTargetId(isBanningThis ? null : user.id);
                                    setBanReason('');
                                    setBanAlsoIp(false);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Ban</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={!latestIp || isIpAlreadyBanned}
                                  title={
                                    !latestIp
                                      ? 'User has no recorded IP yet — use Quick IP Ban above to ban a custom IP'
                                      : isIpAlreadyBanned
                                      ? 'Latest IP is already banned'
                                      : `IP Ban ${latestIp}`
                                  }
                                  onClick={() => {
                                    if (latestIp) {
                                      void handleBanIp(
                                        latestIp,
                                        user,
                                        `IP banned @${user.username} (${latestIp})`
                                      );
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-40 ${
                                    isIpAlreadyBanned
                                      ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#FCA5A5]'
                                      : 'border-[#E53935]/50 text-[#EF4444] hover:bg-[#E53935] hover:text-white'
                                  }`}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  <span>{isIpAlreadyBanned ? 'IP Banned' : 'IP Ban'}</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {isBanningThis && (
                        <div className={`p-3 rounded-lg border space-y-2.5 ${nestedSurface}`}>
                          <div className={`text-xs font-bold ${t.textPrimary}`}>
                            Ban @{user.username} from Talkcob
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              placeholder="Reason for ban (shown to user)..."
                              className={`flex-1 px-3 py-1.5 rounded-lg border text-xs ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                            />
                            <button
                              type="button"
                              onClick={() => void handleBanUser(user)}
                              className="px-4 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold whitespace-nowrap"
                            >
                              Confirm Ban
                            </button>
                            <button
                              type="button"
                              onClick={() => setBanTargetId(null)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${t.textMuted} ${t.hoverBg}`}
                            >
                              Cancel
                            </button>
                          </div>
                          {latestIp && (
                            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={banAlsoIp}
                                onChange={(e) => setBanAlsoIp(e.target.checked)}
                                className="accent-[#E53935] w-3.5 h-3.5"
                              />
                              <span className={t.textSecondary}>
                                Also IP Ban <span className="font-mono">{latestIp}</span> (deletes all accounts on this IP &amp; blocks new signups)
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BANS & IP BANS */}
          {tab === 'bans' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Account Bans */}
              <div className={`p-4 rounded-xl border space-y-3 ${cardSurface}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`font-display font-bold text-sm flex items-center gap-2 ${t.textPrimary}`}>
                    <Ban className="w-4 h-4 text-[#EF4444]" />
                    <span>Banned Accounts ({overview.bannedAccounts.length})</span>
                  </h2>
                </div>

                {overview.bannedAccounts.length === 0 ? (
                  <p className={`text-xs py-6 text-center ${t.textMuted}`}>
                    No accounts are currently banned from Talkcob.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {overview.bannedAccounts.map((ban) => (
                      <div
                        key={ban.userId}
                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${nestedSurface}`}
                      >
                        <div className="min-w-0">
                          <div className={`text-sm font-bold truncate ${t.textPrimary}`}>
                            {ban.name}{' '}
                            <span className={`text-xs font-normal ${t.textMuted}`}>
                              @{ban.username}
                            </span>
                          </div>
                          <p className="text-xs text-[#FCA5A5] mt-0.5">{ban.reason}</p>
                          <p className={`text-[11px] mt-1 ${t.textMuted}`}>
                            By {ban.bannedBy} · {ban.bannedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleUnbanUser(ban.userId, `@${ban.username}`)}
                          className="px-2.5 py-1 rounded-md bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-bold shrink-0"
                        >
                          Unban
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* IP Bans */}
              <div className={`p-4 rounded-xl border space-y-3 ${cardSurface}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`font-display font-bold text-sm flex items-center gap-2 ${t.textPrimary}`}>
                    <Globe className="w-4 h-4 text-[#EF4444]" />
                    <span>IP Bans ({overview.bannedIps.length})</span>
                  </h2>
                </div>

                {overview.bannedIps.length === 0 ? (
                  <p className={`text-xs py-6 text-center ${t.textMuted}`}>
                    No IP addresses are currently banned.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {overview.bannedIps.map((ipBan) => (
                      <div
                        key={ipBan.id}
                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${nestedSurface}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-mono font-bold ${t.textPrimary}`}>
                              {ipBan.ip}
                            </span>
                            {ipBan.targetUsername && (
                              <span className={`text-xs ${t.textMuted}`}>
                                (@{ipBan.targetUsername})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#FCA5A5] mt-0.5">{ipBan.reason}</p>
                          {ipBan.deletedUsernames && ipBan.deletedUsernames.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <span className={`text-[11px] font-semibold ${t.textMuted}`}>
                                Deleted accounts:
                              </span>
                              {ipBan.deletedUsernames.map((uname) => (
                                <span
                                  key={uname}
                                  className="px-1.5 py-0.5 rounded bg-[#E53935]/15 border border-[#E53935]/30 text-[#FCA5A5] text-[10px] font-mono"
                                >
                                  @{uname}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className={`text-[11px] mt-1 ${t.textMuted}`}>
                            By {ipBan.bannedBy} · {ipBan.bannedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleUnbanIp(ipBan.id, ipBan.ip)}
                          className="px-2.5 py-1 rounded-md bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-bold shrink-0"
                        >
                          Unban IP
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SERVERS (DELETE SERVERS & ADD PEOPLE TO SERVERS) */}
          {tab === 'servers' && (
            <div className="space-y-3">
              {servers.map((srv) => {
                const owner = users[srv.ownerId];
                const srvChannels = channels.filter((c) => c.serverId === srv.id);
                const nonMembers = humanUsers.filter(
                  (u) => !srv.memberIds.includes(u.id) && !u.isBanned
                );
                const isConfirming = confirmDeleteServerId === srv.id;

                return (
                  <div key={srv.id} className={`p-4 rounded-xl border space-y-3 ${cardSurface}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-white overflow-hidden shrink-0"
                          style={{ backgroundColor: srv.accentColor }}
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
                          <div className="flex items-center gap-2">
                            <span className={`font-display font-bold text-base truncate ${t.textPrimary}`}>
                              {srv.name}
                            </span>
                            {srv.id === HOME_SERVER_ID && (
                              <span className="px-1.5 py-0.5 rounded bg-[#E53935]/15 border border-[#E53935]/40 text-[#EF4444] text-[10px] font-bold uppercase">
                                Talkcob HQ
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${t.textMuted}`}>
                            Owner: {owner ? `@${owner.username}` : srv.ownerId} ·{' '}
                            {srv.memberIds.length} members · {srvChannels.length} channels
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenServer(srv.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${t.border} ${t.textSecondary} ${t.hoverBg} transition-colors`}
                        >
                          Open
                        </button>

                        {!isConfirming ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteServerId(srv.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Server</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDeleteServer(srv)}
                              className="px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#991B1B] text-white text-xs font-bold"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteServerId(null)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${t.textMuted} ${t.hoverBg}`}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Person to this Server */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleAddPersonToServer(srv);
                      }}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${nestedSurface}`}
                    >
                      <span className={`text-xs font-semibold shrink-0 ${t.textSecondary}`}>
                        Add Person to Server:
                      </span>
                      <input
                        type="text"
                        list={`srv-users-${srv.id}`}
                        value={serverAddInput[srv.id] || ''}
                        onChange={(e) =>
                          setServerAddInput((prev) => ({ ...prev, [srv.id]: e.target.value }))
                        }
                        placeholder={
                          nonMembers.length > 0
                            ? 'Pick or type @username...'
                            : 'Type @username (all users already in server)...'
                        }
                        className={`flex-1 px-2.5 py-1.5 rounded-md border text-xs ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                      />
                      <datalist id={`srv-users-${srv.id}`}>
                        {nonMembers.map((u) => (
                          <option key={u.id} value={u.username}>
                            {u.name} (@{u.username})
                          </option>
                        ))}
                      </datalist>
                      <button
                        type="submit"
                        disabled={!(serverAddInput[srv.id] || '').trim()}
                        className="px-3 py-1.5 rounded-md bg-[#23A55A] hover:bg-[#1E8E4C] disabled:opacity-45 text-white text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Person</span>
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: ADMIN TEAM (ADD PEOPLE TO ADMIN PANEL) */}
          {tab === 'admins' && (
            <div className="space-y-4">
              {/* Add Person to Admin Panel */}
              <div className={`p-4 rounded-xl border space-y-3 ${cardSurface}`}>
                <div>
                  <h2 className={`font-display font-bold text-sm flex items-center gap-2 ${t.textPrimary}`}>
                    <UserPlus className="w-4 h-4 text-[#EF4444]" />
                    <span>Add Person to Admin Panel</span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                    People added here get access to the Talkcob Admin Panel to ban/IP ban users, delete servers, and manage server members.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAddAdmin(addAdminInput);
                  }}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="text"
                    list="talkcob-non-admin-users"
                    value={addAdminInput}
                    onChange={(e) => setAddAdminInput(e.target.value)}
                    placeholder="Enter or pick @username to add to Admin Panel..."
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${t.inputBg} ${t.border} ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-[#E53935]`}
                  />
                  <datalist id="talkcob-non-admin-users">
                    {nonAdminActiveUsers.map((u) => (
                      <option key={u.id} value={u.username}>
                        {u.name} (@{u.username})
                      </option>
                    ))}
                  </datalist>
                  <button
                    type="submit"
                    disabled={!addAdminInput.trim()}
                    className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] disabled:opacity-45 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Add to Admin Panel</span>
                  </button>
                </form>

                {nonAdminActiveUsers.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {nonAdminActiveUsers.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => void handleAddAdmin(u.id)}
                        className={`px-2.5 py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 ${nestedSurface} ${t.textSecondary} ${t.hoverBg} transition-colors`}
                      >
                        <UserPlus className="w-3 h-3 text-[#23A55A]" />
                        <span>{u.name}</span>
                        <span className={t.textMuted}>@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Admin Team */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${cardSurface}`}>
                <h3 className={`font-display font-bold text-sm ${t.textPrimary}`}>
                  Current Admin Panel Members ({adminUsers.length})
                </h3>
                {adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${nestedSurface}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={admin.name}
                        src={admin.avatar}
                        accentColor={admin.accentColor}
                        size="sm"
                        status={admin.status}
                        showStatus
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold truncate ${t.textPrimary}`}>
                            {admin.name}
                          </span>
                          {admin.isPlatformOwner ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15] text-[10px] font-bold uppercase">
                              <Crown className="w-2.5 h-2.5" />
                              <span>Talkcob Owner</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E53935]/15 border border-[#E53935]/40 text-[#EF4444] text-[10px] font-bold uppercase">
                              <Check className="w-2.5 h-2.5" />
                              <span>Admin Panel Access</span>
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${t.textMuted}`}>@{admin.username}</p>
                      </div>
                    </div>

                    {!admin.isPlatformOwner && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveAdmin(admin)}
                        className="px-3 py-1.5 rounded-lg border border-[#E53935]/40 text-[#EF4444] hover:bg-[#E53935] hover:text-white text-xs font-semibold transition-colors shrink-0"
                      >
                        Remove Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
