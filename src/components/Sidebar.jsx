import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';
import { useSocket } from '../context/SocketContext.jsx';
import { Avatar, CountBadge, Icon } from './ui.jsx';
import { cx, displayName, isPriv, parseDate, shortWhen } from '../lib/util';

function SectionHeader({ title, onAdd, addLabel }) {
  return (
    <div className="mb-1 mt-4 flex items-center justify-between px-2">
      <h3 className="section-title">{title}</h3>
      {onAdd && (
        <button className="rounded p-1 text-mute hover:bg-black/5 hover:text-ink" onClick={onAdd} aria-label={addLabel} title={addLabel}>
          <Icon name="plus" size={15} />
        </button>
      )}
    </div>
  );
}

export default function Sidebar({
  open,
  onClose,
  user,
  groups,
  group,
  groupId,
  channels,
  channelId,
  chats,
  dmUserId,
  unread,
  notifCount,
  isAdmin,
  onModal,
  onBell,
  onLogout,
  onLogoutAll,
}) {
  const { statusOf, status } = useSocket();
  const [menu, setMenu] = useState(false);
  const canCreateChannel = ['OWNER', 'ADMIN'].includes(group?.currentUserRole);
  const sortedChats = [...chats].sort(
    (a, b) => (parseDate(b.lastMessageAt)?.getTime() || 0) - (parseDate(a.lastMessageAt)?.getTime() || 0),
  );

  return (
    <div
      className={cx(
        'fixed inset-y-0 left-0 z-30 flex transition-transform duration-200 md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Rail: groups and personal actions */}
      <nav className="relative flex w-[68px] shrink-0 flex-col items-center gap-2 bg-pine-900 py-3" aria-label="Groups">
        <Link
          to="/dm"
          onClick={onClose}
          title="Direct messages"
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
            !groupId ? 'bg-sun text-pine-900' : 'bg-pine-700 text-white hover:bg-pine-600',
          )}
        >
          <Icon name="chat" size={20} />
        </Link>
        <span className="my-1 h-px w-8 bg-white/15" />
        <div className="scroll-thin flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
          {groups?.map((g) => (
            <Link
              key={g.id}
              to={`/g/${g.id}`}
              onClick={onClose}
              title={g.name}
              className={cx(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-serif text-lg font-semibold transition-colors',
                g.id === groupId ? 'bg-sun text-pine-900' : 'bg-pine-700 text-white hover:bg-pine-600',
              )}
            >
              {g.name?.[0]?.toUpperCase()}
              {g.id === groupId && <span className="absolute -left-[12px] h-6 w-1 rounded-r bg-sun" />}
            </Link>
          ))}
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/30 text-white/70 hover:border-white/60 hover:text-white"
            onClick={() => onModal('createGroup')}
            title="Create a group"
            aria-label="Create a group"
          >
            <Icon name="plus" size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button className="relative rounded-lg p-2.5 text-white/80 hover:bg-white/10 hover:text-white" onClick={onBell} aria-label="Notifications" title="Notifications">
            <Icon name="bell" size={20} />
            {notifCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sun px-1 text-[10px] font-bold text-pine-900">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          {isAdmin && (
            <Link to="/admin" className="rounded-lg p-2.5 text-white/80 hover:bg-white/10 hover:text-white" title="Admin console" aria-label="Admin console">
              <Icon name="shield" size={20} />
            </Link>
          )}
          <button onClick={() => setMenu((m) => !m)} aria-label="Account menu" aria-expanded={menu} className="rounded-lg">
            <Avatar user={user} size={38} status={status === 'connected' ? 'ONLINE' : 'OFFLINE'} ring="border-pine-900" />
          </button>
        </div>

        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute bottom-3 left-[76px] z-50 w-60 rounded-lg bg-white py-1 text-sm text-ink shadow-xl ring-1 ring-black/10">
              <div className="border-b border-line px-4 py-2.5">
                <p className="truncate font-medium">{displayName(user)}</p>
                <p className="truncate text-xs text-mute">@{user?.username}</p>
              </div>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-paper" onClick={() => { setMenu(false); onModal('profile'); }}>
                <Icon name="edit" size={16} /> Edit profile
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-paper" onClick={onLogout}>
                <Icon name="logout" size={16} /> Sign out
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-brick hover:bg-paper" onClick={onLogoutAll}>
                <Icon name="logout" size={16} /> Sign out on all devices
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Column: channels and direct messages */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-paper" aria-label={group ? group.name : APP_NAME}>
        <div className="flex h-[61px] items-center justify-between border-b border-line px-4">
          <h2 className="truncate font-serif text-lg font-semibold">{group ? group.name : 'Direct messages'}</h2>
          {group && (
            <button className="btn-ghost !p-1.5" onClick={() => onModal('people')} title="People in this group" aria-label="People in this group">
              <Icon name="users" size={18} />
            </button>
          )}
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
          {group && (
            <>
              <SectionHeader title="Channels" onAdd={canCreateChannel ? () => onModal('createChannel') : null} addLabel="Create a channel" />
              <ul>
                {channels.map((c) => {
                  const active = c.id === channelId;
                  const joined = !!c.currentUserRole;
                  return (
                    <li key={c.id}>
                      <Link
                        to={`/g/${groupId}/c/${c.id}`}
                        onClick={onClose}
                        className={cx(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                          active ? 'bg-pine-700 text-white' : joined ? 'hover:bg-black/5' : 'text-mute hover:bg-black/5',
                        )}
                      >
                        <Icon name={isPriv(c) ? 'lock' : 'hash'} size={15} className="shrink-0" />
                        <span className={cx('truncate', unread[c.id] && !active && 'font-semibold')}>{c.name}</span>
                        {!joined && <span className="ml-auto text-[10px] font-medium uppercase tracking-wide">Join</span>}
                        {!active && <CountBadge n={unread[c.id]} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {channels.length === 0 && <p className="px-2 py-1 text-sm text-mute">No channels yet.</p>}
              <button className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-mute hover:bg-black/5 hover:text-ink" onClick={() => onModal('joinChannel')}>
                Join a private channel
              </button>
            </>
          )}

          <SectionHeader title="Direct messages" onAdd={() => onModal('newDm')} addLabel="New message" />
          <ul>
            {sortedChats.map((c) => {
              const active = c.otherUser?.id === dmUserId;
              return (
                <li key={c.chatId}>
                  <Link
                    to={`/dm/${c.otherUser?.id}`}
                    onClick={onClose}
                    className={cx('flex items-center gap-2.5 rounded-md px-2 py-1.5', active ? 'bg-pine-700 text-white' : 'hover:bg-black/5')}
                  >
                    <Avatar user={c.otherUser} size={30} status={statusOf(c.otherUser)} ring={active ? 'border-pine-700' : 'border-paper'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cx('truncate text-sm', c.unreadCount > 0 && !active && 'font-semibold')}>{displayName(c.otherUser)}</span>
                        <span className={cx('shrink-0 text-[10px]', active ? 'text-white/70' : 'text-mute')}>{shortWhen(c.lastMessageAt)}</span>
                      </div>
                      <p className={cx('truncate text-xs', active ? 'text-white/70' : 'text-mute')}>{c.lastMessagePreview || 'No messages yet'}</p>
                    </div>
                    {!active && <CountBadge n={c.unreadCount} />}
                  </Link>
                </li>
              );
            })}
          </ul>
          {sortedChats.length === 0 && <p className="px-2 py-1 text-sm text-mute">No conversations yet.</p>}
        </div>
      </aside>
    </div>
  );
}
