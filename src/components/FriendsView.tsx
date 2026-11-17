import React, { useState } from 'react';
import {
  Check,
  Menu,
  MessageSquare,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AppTheme, FriendRequest, User } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';
import { Avatar } from './Avatar';

type FriendsTab = 'online' | 'all' | 'pending' | 'add';

interface FriendsViewProps {
  currentUser: User;
  users: Record<string, User>;
  friendIds: string[];
  friendRequests: FriendRequest[];
  onSendFriendRequest: (usernameOrName: string) => Promise<{ ok: boolean; message: string }>;
  onAcceptRequest: (requestId: string) => void;
  onRemoveRequest: (requestId: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onMessageFriend: (friendId: string) => void;
  onOpenMobileMenu: () => void;
  theme: AppTheme;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  users,
  friendIds,
  friendRequests,
  onSendFriendRequest,
  onAcceptRequest,
  onRemoveRequest,
  onRemoveFriend,
  onMessageFriend,
  onOpenMobileMenu,
  theme,
}) => {
  const t = THEME_TOKENS[theme];
  const incomingRequests = friendRequests.filter((r) => r.toUserId === currentUser.id);
  const outgoingRequests = friendRequests.filter((r) => r.fromUserId === currentUser.id);
  const [tab, setTab] = useState<FriendsTab>(incomingRequests.length > 0 ? 'pending' : 'add');
  const [searchQuery, setSearchQuery] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const friends = friendIds.map((id) => users[id]).filter(Boolean);
  const onlineFriends = friends.filter((f) => f.status !== 'offline');

  const filterList = (list: User[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  };

  const displayedFriends = tab === 'online' ? filterList(onlineFriends) : filterList(friends);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || sending) return;
    setSending(true);
    try {
      const result = await onSendFriendRequest(usernameInput.trim());
      setFeedback(result);
      if (result.ok) {
        setUsernameInput('');
      }
    } finally {
      setSending(false);
    }
  };

  // Users who are not yet friends and have no active request with currentUser
  const suggestedUsers = Object.values(users).filter((u) => {
    if (u.id === currentUser.id) return false;
    if (friendIds.includes(u.id)) return false;
    const hasPending = friendRequests.some(
      (r) =>
        (r.fromUserId === currentUser.id && r.toUserId === u.id) ||
        (r.toUserId === currentUser.id && r.fromUserId === u.id)
    );
    return !hasPending;
  });

  return (
    <main className={`flex-1 min-w-0 h-full flex flex-col ${t.chatBg}`}>
      {/* Top Friends Header Bar */}
      <header
        className={`h-12 px-4 shrink-0 flex items-center justify-between gap-4 border-b overflow-x-auto talkcob-scroll-thin ${t.headerBg} ${t.border}`}
      >
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation sidebar"
            className={`md:hidden p-1.5 rounded-md text-[#EF4444] ${t.hoverBg}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <Users className="w-5 h-5 text-[#EF4444]" />
            <h1 className={`font-display font-bold text-[15px] whitespace-nowrap ${t.textPrimary}`}>
              Friends
            </h1>
          </div>

          <div className={`h-5 w-[1px] ${theme === 'light' ? 'bg-[#E1E3E6]' : 'bg-[#3F4147]'}`} />

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab('online')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'online'
                  ? `${t.activeBg} ${t.textPrimary}`
                  : `${t.textSecondary} ${t.hoverBg}`
              }`}
            >
              Online ({onlineFriends.length})
            </button>

            <button
              onClick={() => setTab('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'all'
                  ? `${t.activeBg} ${t.textPrimary}`
                  : `${t.textSecondary} ${t.hoverBg}`
              }`}
            >
              All ({friends.length})
            </button>

            <button
              onClick={() => setTab('pending')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                tab === 'pending'
                  ? `${t.activeBg} ${t.textPrimary}`
                  : `${t.textSecondary} ${t.hoverBg}`
              }`}
            >
              <span>Pending</span>
              {incomingRequests.length + outgoingRequests.length > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                  {incomingRequests.length + outgoingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setTab('add');
                setFeedback(null);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === 'add'
                  ? 'bg-[#E53935]/15 text-[#EF4444]'
                  : 'bg-[#E53935] hover:bg-[#C62828] text-white'
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto talkcob-scroll p-6">
        <div className="max-w-3xl mx-auto">
          {tab !== 'pending' && incomingRequests.length > 0 && (
            <div className="mb-5 p-3.5 rounded-xl border border-[#23A55A]/45 bg-[#23A55A]/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-semibold text-[#23A55A]">
                You have {incomingRequests.length} incoming friend{' '}
                {incomingRequests.length === 1 ? 'request' : 'requests'} waiting for you to accept!
              </div>
              <button
                onClick={() => setTab('pending')}
                className="px-3 py-1.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-semibold transition-colors"
              >
                View & Accept
              </button>
            </div>
          )}

          {/* ADD FRIEND TAB */}
          {tab === 'add' && (
            <div className="space-y-6">
              <div>
                <h2 className={`font-display font-bold text-lg uppercase tracking-wide ${t.textPrimary}`}>
                  Add Friend
                </h2>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Enter someone&rsquo;s Talkcob username. They will receive your request and need to accept it before you become friends.
                </p>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-2.5">
                <div
                  className={`flex items-center gap-2 p-2 rounded-xl border ${t.inputBg} ${
                    feedback
                      ? feedback.ok
                        ? 'border-[#23A55A]'
                        : 'border-[#E53935]'
                      : t.border
                  } focus-within:ring-2 focus-within:ring-[#E53935]`}
                >
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (feedback) setFeedback(null);
                    }}
                    placeholder="Enter a Talkcob username (e.g. mayasound)"
                    className={`flex-1 px-2 py-1.5 bg-transparent text-sm focus:outline-none ${t.textPrimary} placeholder:text-[#80848E]`}
                  />
                  <button
                    type="submit"
                    disabled={!usernameInput.trim() || sending}
                    className="px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] disabled:opacity-40 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send Friend Request'}
                  </button>
                </div>

                {feedback && (
                  <p
                    className={`text-xs font-medium ${
                      feedback.ok ? 'text-[#23A55A]' : 'text-[#EF4444]'
                    }`}
                  >
                    {feedback.message}
                  </p>
                )}
              </form>

              {/* Quick-add list of Talkcob HQ members */}
              {suggestedUsers.length > 0 && (
                <div className={`pt-4 border-t ${t.border} space-y-3`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>
                    People in Talkcob HQ
                  </h3>
                  <div className="space-y-2">
                    {suggestedUsers.map((person) => (
                      <div
                        key={person.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${t.sidebarBg} ${t.border}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={person.name}
                            src={person.avatar}
                            accentColor={person.accentColor}
                            size="sm"
                            status={person.status}
                            showStatus
                          />
                          <div className="min-w-0">
                            <div className={`text-sm font-semibold truncate ${t.textPrimary}`}>
                              {person.name}
                            </div>
                            <div className={`text-xs truncate ${t.textMuted}`}>
                              @{person.username}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            const res = await onSendFriendRequest(person.username);
                            setFeedback(res);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PENDING TAB */}
          {tab === 'pending' && (
            <div className="space-y-6">
              {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <div className={`py-16 text-center ${t.textMuted}`}>
                  <UserPlus className="w-10 h-10 mx-auto mb-3 text-[#EF4444] opacity-80" />
                  <p className="text-sm font-medium">No pending friend requests right now.</p>
                </div>
              ) : (
                <>
                  {incomingRequests.length > 0 && (
                    <div className="space-y-2.5">
                      <h2 className={`text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>
                        Incoming Friend Requests — {incomingRequests.length}
                      </h2>
                      {incomingRequests.map((req) => {
                        const sender = users[req.fromUserId];
                        if (!sender) return null;
                        return (
                          <div
                            key={req.id}
                            className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${t.sidebarBg} ${t.border}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                name={sender.name}
                                src={sender.avatar}
                                accentColor={sender.accentColor}
                                size="md"
                                status={sender.status}
                                showStatus
                              />
                              <div className="min-w-0">
                                <div className={`text-sm font-bold truncate ${t.textPrimary}`}>
                                  {sender.name}
                                </div>
                                <div className={`text-xs ${t.textMuted}`}>
                                  @{sender.username} · Incoming Friend Request
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => onAcceptRequest(req.id)}
                                aria-label={`Accept friend request from ${sender.name}`}
                                title="Accept"
                                className="px-3 py-1.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => onRemoveRequest(req.id)}
                                aria-label={`Decline friend request from ${sender.name}`}
                                title="Decline"
                                className={`p-2 rounded-lg border ${t.border} text-[#EF4444] hover:bg-[#E53935]/15 transition-colors`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {outgoingRequests.length > 0 && (
                    <div className="space-y-2.5">
                      <h2 className={`text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>
                        Outgoing Friend Requests — {outgoingRequests.length}
                      </h2>
                      {outgoingRequests.map((req) => {
                        const recipient = users[req.toUserId];
                        if (!recipient) return null;
                        return (
                          <div
                            key={req.id}
                            className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${t.sidebarBg} ${t.border}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                name={recipient.name}
                                src={recipient.avatar}
                                accentColor={recipient.accentColor}
                                size="md"
                                status={recipient.status}
                                showStatus
                              />
                              <div className="min-w-0">
                                <div className={`text-sm font-bold truncate ${t.textPrimary}`}>
                                  {recipient.name}
                                </div>
                                <div className={`text-xs ${t.textMuted}`}>
                                  @{recipient.username} · Outgoing Friend Request
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border ${t.border} ${t.textMuted} whitespace-nowrap`}
                              >
                                Waiting for acceptance
                              </span>
                              <button
                                onClick={() => onRemoveRequest(req.id)}
                                aria-label={`Cancel friend request to ${recipient.name}`}
                                title="Cancel Request"
                                className={`p-2 rounded-lg border ${t.border} text-[#EF4444] hover:bg-[#E53935]/15 transition-colors`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ONLINE & ALL FRIENDS TABS */}
          {(tab === 'online' || tab === 'all') && (
            <div className="space-y-4">
              {friends.length > 0 && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t.inputBg} ${t.border}`}>
                  <Search className="w-4 h-4 text-[#EF4444]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search friends"
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${t.textPrimary}`}
                  />
                </div>
              )}

              {displayedFriends.length === 0 ? (
                <div className={`py-16 text-center ${t.textMuted}`}>
                  <UserCheck className="w-10 h-10 mx-auto mb-3 text-[#EF4444] opacity-80" />
                  <p className="text-sm font-medium">
                    {friends.length === 0
                      ? 'You have not added any friends yet.'
                      : 'No matching friends online right now.'}
                  </p>
                  {friends.length === 0 && (
                    <button
                      onClick={() => setTab('add')}
                      className="mt-4 px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold transition-colors"
                    >
                      Add a Friend
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>
                    {tab === 'online' ? 'Online' : 'All Friends'} — {displayedFriends.length}
                  </div>
                  {displayedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${t.sidebarBg} ${t.border}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={friend.name}
                          src={friend.avatar}
                          accentColor={friend.accentColor}
                          size="md"
                          status={friend.status}
                          showStatus
                        />
                        <div className="min-w-0">
                          <div className={`text-sm font-bold truncate ${t.textPrimary}`}>
                            {friend.name}
                          </div>
                          <div className={`text-xs truncate ${t.textMuted}`}>
                            @{friend.username} · {friend.customStatus || friend.status}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onMessageFriend(friend.id)}
                          aria-label={`Message ${friend.name}`}
                          title="Message"
                          className="px-3 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>

                        <button
                          onClick={() => onRemoveFriend(friend.id)}
                          aria-label={`Remove ${friend.name}`}
                          title="Remove Friend"
                          className={`p-2 rounded-lg border ${t.border} text-[#EF4444] hover:bg-[#E53935]/15 transition-colors`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
