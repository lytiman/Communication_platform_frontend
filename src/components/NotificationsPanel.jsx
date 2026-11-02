import { useEffect } from 'react';
import { Avatar, Icon } from './ui.jsx';
import { cx, displayName, shortWhen } from '../lib/util';

export default function NotificationsPanel({ items, onClose, onOpen, onReadAll }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-40 bg-pine-900/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl" role="dialog" aria-label="Notifications">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-serif text-lg font-semibold">Notifications</h2>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button className="btn-ghost !py-1 text-xs" onClick={onReadAll}>
                <Icon name="check" size={14} /> Mark all read
              </button>
            )}
            <button className="btn-ghost !p-1.5" onClick={onClose} aria-label="Close notifications">
              <Icon name="x" />
            </button>
          </div>
        </div>
        <ul className="scroll-thin flex-1 overflow-y-auto">
          {items.length === 0 && (
            <li className="px-6 py-16 text-center">
              <p className="font-serif text-lg font-semibold">You're all caught up</p>
              <p className="mt-1 text-sm text-mute">New messages, invites and mentions will show up here.</p>
            </li>
          )}
          {items.map((n) => (
            <li key={n.id}>
              <button
                className={cx('flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left hover:bg-paper', !n.read && 'bg-sun-soft/50')}
                onClick={() => onOpen(n)}
              >
                <Avatar user={n.actor} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{n.actor ? displayName(n.actor) : 'System'}</span>{' '}
                    <span className="text-mute">{n.content}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-mute">{shortWhen(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sun" aria-label="Unread" />}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
