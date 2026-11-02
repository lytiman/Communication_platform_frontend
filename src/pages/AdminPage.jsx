import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, Badge, Empty, ErrorBox, Icon, Spinner } from '../components/ui.jsx';
import { displayName, errorText, shortWhen } from '../lib/util';

const ASSIGNABLE = ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'];

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    () =>
      api.admin
        .users()
        .then((u) => {
          setUsers(u);
          setError('');
        })
        .catch((e) => {
          setUsers([]);
          setError(errorText(e));
        }),
    [],
  );

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const shown = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!users) return [];
    return t
      ? users.filter((u) => [u.username, u.email, u.fullName].some((v) => v?.toLowerCase().includes(t)))
      : users;
  }, [users, query]);

  async function run(u, action, okMessage, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(u.id);
    try {
      await action();
      toast({ title: okMessage });
      await load();
    } catch (e) {
      toast({ tone: 'error', title: 'Action failed', body: errorText(e) });
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty
          title="Admins only"
          hint="Your account doesn't have the admin role."
          action={<Link to="/" className="btn-primary">Back to messages</Link>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link to="/" className="btn-ghost !p-2" aria-label="Back to messages"><Icon name="back" /></Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-semibold">Admin console</h1>
            <p className="text-sm text-mute">Manage accounts and roles.</p>
          </div>
          <button className="btn-outline" onClick={load}><Icon name="refresh" size={16} /> Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {error && (
          <div className="space-y-1">
            <ErrorBox>{error}</ErrorBox>
            <p className="text-xs text-mute">
              Admin actions need the MANAGE_USERS and BAN_USER privileges on the admin role in the database.
            </p>
          </div>
        )}
        <div className="relative max-w-sm">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="input !pl-9" placeholder="Filter by name, username or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter users" />
        </div>

        {!users ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs text-mute">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Roles</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const mine = u.id === user.id;
                  const missing = ASSIGNABLE.filter((r) => !u.roleNames?.includes(r));
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className="border-b border-line last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} size={36} status={u.onlineStatus} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{displayName(u)}{mine && <span className="ml-1 text-xs text-mute">(you)</span>}</p>
                            <p className="truncate text-xs text-mute">@{u.username} · {u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.roleNames?.map((r) => (
                            <span key={r} className="inline-flex items-center gap-1 rounded bg-pine-100 px-1.5 py-0.5 text-[11px] font-medium text-pine-800">
                              {r.replace('ROLE_', '')}
                              {!mine && (
                                <button
                                  className="hover:text-brick"
                                  aria-label={`Remove ${r} from ${u.username}`}
                                  disabled={busy}
                                  onClick={() => run(u, () => api.admin.removeRole(u.id, r), `${r} removed`, `Remove ${r} from ${u.username}?`)}
                                >
                                  <Icon name="x" size={11} />
                                </button>
                              )}
                            </span>
                          ))}
                          {missing.length > 0 && (
                            <select
                              className="rounded border border-line bg-white px-1.5 py-0.5 text-[11px]"
                              value=""
                              disabled={busy}
                              aria-label={`Add a role to ${u.username}`}
                              onChange={(e) => e.target.value && run(u, () => api.admin.assignRole(u.id, e.target.value), `${e.target.value} granted`)}
                            >
                              <option value="">+ role</option>
                              {missing.map((r) => <option key={r} value={r}>{r.replace('ROLE_', '')}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge tone={u.enabled ? 'pine' : 'brick'}>{u.enabled ? 'Active' : 'Disabled'}</Badge>
                          <p className="text-xs text-mute">
                            {u.onlineStatus === 'ONLINE' ? 'Online now' : u.lastSeenAt ? `Last seen ${shortWhen(u.lastSeenAt)}` : 'Never seen'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mine ? (
                          <span className="text-xs text-mute">This is you</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.enabled ? (
                              <button className="btn-outline !px-2.5 !py-1 text-xs" disabled={busy} onClick={() => run(u, () => api.admin.disable(u.id), 'Account disabled', `Disable ${u.username}?`)}>Disable</button>
                            ) : (
                              <button className="btn-outline !px-2.5 !py-1 text-xs" disabled={busy} onClick={() => run(u, () => api.admin.enable(u.id), 'Account enabled')}>Enable</button>
                            )}
                            <button className="btn-outline !px-2.5 !py-1 text-xs text-brick" disabled={busy} onClick={() => run(u, () => api.admin.ban(u.id), 'User banned', `Ban ${u.username}?`)}>Ban</button>
                            <button className="btn-outline !px-2.5 !py-1 text-xs" disabled={busy} onClick={() => run(u, () => api.admin.unban(u.id), 'User unbanned')}>Unban</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-mute">No users match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
