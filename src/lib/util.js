import { API_URL } from '../config';

export const cx = (...a) => a.filter(Boolean).join(' ');

// Spring serialises LocalDateTime as an ISO string (or an array if the
// backend is configured with timestamps). Handle both.
export function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (Array.isArray(v)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = v;
    return new Date(y, mo - 1, d, h, mi, s);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();

export function timeLabel(v) {
  const d = parseDate(v);
  return d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

export function dayLabel(v) {
  const d = parseDate(v);
  if (!d) return '';
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export function shortWhen(v) {
  const d = parseDate(v);
  if (!d) return '';
  return sameDay(d, new Date())
    ? timeLabel(d)
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function fullWhen(v) {
  const d = parseDate(v);
  return d ? d.toLocaleString() : '';
}

export const displayName = (u) => u?.fullName?.trim() || u?.username || 'Unknown user';

export function initials(u) {
  const parts = displayName(u).split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Uploaded files come back as "/api/files/..." — make them absolute.
export function fileUrl(u) {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : API_URL + u;
}

export function jwtExp(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).exp * 1000;
  } catch {
    return 0;
  }
}

// Lombok turns `boolean isPrivate` into the JSON property "private" (not
// "isPrivate"), while `Boolean isPrivate` stays "isPrivate". Read either.
export const isPriv = (o) => !!(o && (o.private ?? o.isPrivate));

export function attachmentType(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'IMAGE';
  if (['mp4', 'mov'].includes(ext)) return 'VIDEO';
  if (['mp3'].includes(ext)) return 'AUDIO';
  return 'FILE';
}

// Insert a new item, or merge into an existing one with the same id
// (used for live edits/deletes and to de-duplicate REST + WebSocket echoes).
export function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = [...list];
  copy[i] = { ...copy[i], ...item };
  return copy;
}

export const errorText = (e) => e?.message || 'Something went wrong';

export const ROLE_LABEL = { OWNER: 'Owner', ADMIN: 'Admin', MODERATOR: 'Moderator', MEMBER: 'Member' };
export const STATUS_COLOR = {
  ONLINE: '#2FA36B',
  AWAY: '#E9B02C',
  DO_NOT_DISTURB: '#C2452D',
  OFFLINE: '#A7B0AA',
};
