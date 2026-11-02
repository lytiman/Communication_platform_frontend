import { useEffect } from 'react';
import { STATUS_COLOR, cx, fileUrl, initials } from '../lib/util';

const PATHS = {
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  plus: 'M12 5v14M5 12h14',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  send: 'M22 2 11 13 M22 2l-7 20-4-9-9-4 20-7z',
  clip: 'm21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3',
  x: 'M18 6 6 18M6 6l12 12',
  reply: 'M9 17l-5-5 5-5 M4 12h11a5 5 0 0 1 5 5v2',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  check: 'M20 6 9 17l-5-5',
  copy: 'M9 9h11v11H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  refresh: 'M23 4v6h-6 M1 20v-6h6 M3.5 9a9 9 0 0 1 14.9-3.4L23 10 M1 14l4.6 4.4A9 9 0 0 0 20.5 15',
  userplus: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6',
  back: 'M15 18l-6-6 6-6',
  home: 'M3 11 12 3l9 8 M5 10v10h14V10',
};

export function Icon({ name, size = 18, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name] || ''} />
    </svg>
  );
}

const TONES = ['#1B4D3C', '#7A5C12', '#7C3A2D', '#2F5D7C', '#5B4B7A', '#3F6B3A'];

export function Avatar({ user, size = 36, status, ring = 'border-white', className }) {
  const url = fileUrl(user?.avatarUrl);
  return (
    <span className={cx('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-lg font-medium text-white"
          style={{ background: TONES[(user?.id || 0) % TONES.length], fontSize: size * 0.38 }}
        >
          {initials(user)}
        </span>
      )}
      {status && (
        <span
          className={cx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2', ring)}
          style={{ background: STATUS_COLOR[status] || STATUS_COLOR.OFFLINE }}
          title={status.replace(/_/g, ' ').toLowerCase()}
        />
      )}
    </span>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-pine-900/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cx(
          'flex max-h-[90vh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button className="btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-pine-700/25 border-t-pine-700', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Empty({ title, hint, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <p className="font-serif text-xl font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-mute">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'plain' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
        tone === 'sun' && 'bg-sun-soft text-sun-600',
        tone === 'pine' && 'bg-pine-100 text-pine-800',
        tone === 'brick' && 'bg-red-100 text-brick',
        tone === 'plain' && 'bg-black/5 text-mute',
      )}
    >
      {children}
    </span>
  );
}

export function CountBadge({ n }) {
  if (!n) return null;
  return (
    <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-sun px-1.5 text-[11px] font-semibold text-pine-900">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="whitespace-pre-line rounded-md border border-brick/30 bg-red-50 px-3 py-2 text-sm text-brick">
      {children}
    </p>
  );
}
