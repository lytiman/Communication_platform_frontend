import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Avatar, Badge, ErrorBox, Icon, Modal, Spinner } from './ui.jsx';
import { ROLE_LABEL, displayName, errorText, isPriv } from '../lib/util';

function Actions({ onClose, busy, form, label }) {
  return (
    <>
      <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
      <button form={form} className="btn-primary" disabled={busy}>
        {busy && <Spinner className="!h-4 !w-4 !border-white/40 !border-t-white" />}
        {label}
      </button>
    </>
  );
}

function copyText(text, toast) {
  navigator.clipboard?.writeText(text).then(
    () => toast({ title: 'Copied to clipboard' }),
    () => toast({ tone: 'error', title: 'Could not copy', body: 'Copy it manually instead.' }),
  );
}

/* ---------- Create group ---------- */
export function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setErr('Give the group a name.');
    setBusy(true);
    setErr('');
    try {
      onCreated(await api.groups.create({ name: name.trim(), description: description.trim() || null, isPrivate: priv }));
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title="Create a group" onClose={onClose} footer={<Actions onClose={onClose} busy={busy} form="cg" label="Create group" />}>
      <form id="cg" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="gname">Group name</label>
          <input id="gname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="gdesc">Description <span className="font-normal text-mute">(optional)</span></label>
          <textarea id="gdesc" className="input" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
          <span>
            Private group
            <span className="block text-xs text-mute">Only members can view it.</span>
          </span>
        </label>
        <ErrorBox>{err}</ErrorBox>
      </form>
    </Modal>
  );
}

/* ---------- Create channel ---------- */
export function CreateChannelModal({ group, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setErr('Give the channel a name.');
    setBusy(true);
    setErr('');
    try {
      onCreated(
        await api.channels.create({
          groupId: group.id,
          name: name.trim(),
          description: description.trim() || null,
          isPrivate: priv,
        }),
      );
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title={`New channel in ${group.name}`} onClose={onClose} footer={<Actions onClose={onClose} busy={busy} form="cc" label="Create channel" />}>
      <form id="cc" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="cname">Channel name</label>
          <input id="cname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="general" autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="cdesc">Description <span className="font-normal text-mute">(optional)</span></label>
          <input id="cdesc" className="input" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
          <span>
            Private channel
            <span className="block text-xs text-mute">People join with an invite code and the channel is hidden from everyone else.</span>
          </span>
        </label>
        <ErrorBox>{err}</ErrorBox>
      </form>
    </Modal>
  );
}

/* ---------- Join a private channel ---------- */
export function JoinChannelModal({ onClose, onJoined }) {
  const [channelId, setChannelId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!channelId) return setErr('Enter the channel ID.');
    setBusy(true);
    setErr('');
    try {
      await api.channels.join({ channelId: Number(channelId), inviteCode: inviteCode.trim() || null });
      const ch = await api.channels.get(Number(channelId)).catch(() => ({ id: Number(channelId) }));
      onJoined(ch);
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title="Join a private channel" onClose={onClose} footer={<Actions onClose={onClose} busy={busy} form="jc" label="Join channel" />}>
      <form id="jc" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-mute">
          Ask a channel admin for the channel ID and invite code. You must already be a member of the channel's group.
        </p>
        <div>
          <label className="label" htmlFor="jid">Channel ID</label>
          <input id="jid" type="number" min="1" className="input" value={channelId} onChange={(e) => setChannelId(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="jcode">Invite code</label>
          <input id="jcode" className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoComplete="off" />
        </div>
        <ErrorBox>{err}</ErrorBox>
      </form>
    </Modal>
  );
}

/* ---------- User search (used by "new message" and "add member") ---------- */
function UserSearch({ onPick, exclude = [], actionLabel }) {
  const { user } = useAuth();
  const { statusOf } = useSocket();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = query.trim();
    if (t.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    let live = true;
    setLoading(true);
    const h = setTimeout(() => {
      api.users
        .search(t)
        .then((r) => live && (setResults(r), setErr('')))
        .catch((e) => live && setErr(errorText(e)))
        .finally(() => live && setLoading(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(h);
    };
  }, [query]);

  const visible = results.filter((u) => u.id !== user.id && !exclude.includes(u.id));

  return (
    <div>
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input className="input !pl-9" placeholder="Search by name or username" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Search people" />
      </div>
      <ErrorBox>{err}</ErrorBox>
      <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
        {loading && (
          <li className="flex justify-center py-4">
            <Spinner />
          </li>
        )}
        {!loading && query.trim().length >= 2 && visible.length === 0 && <li className="px-2 py-3 text-sm text-mute">No one found.</li>}
        {visible.map((u) => (
          <li key={u.id}>
            <button type="button" className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-paper" onClick={() => onPick(u)}>
              <Avatar user={u} size={34} status={statusOf(u)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{displayName(u)}</span>
                <span className="block truncate text-xs text-mute">@{u.username}</span>
              </span>
              <span className="text-xs font-medium text-pine-700">{actionLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- New direct message ---------- */
export function NewDmModal({ onClose, onPick }) {
  return (
    <Modal title="New message" onClose={onClose}>
      <UserSearch onPick={onPick} actionLabel="Message" />
    </Modal>
  );
}

/* ---------- Edit profile ---------- */
export function ProfileModal({ onClose }) {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setErr('Profile pictures can be up to 5 MB.');
    setUploading(true);
    setErr('');
    try {
      const { url } = await api.files.upload('avatars', f);
      setAvatarUrl(url);
    } catch (x) {
      setErr(errorText(x));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api.users.updateMe({ fullName: fullName.trim(), avatarUrl: avatarUrl || null });
      await refreshMe();
      toast({ title: 'Profile saved' });
      onClose();
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit profile" onClose={onClose} footer={<Actions onClose={onClose} busy={busy} form="pf" label="Save changes" />}>
      <form id="pf" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar user={{ ...user, fullName, avatarUrl }} size={64} />
          <div>
            <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading && <Spinner className="!h-4 !w-4" />}
              Upload picture
            </button>
            {avatarUrl && (
              <button type="button" className="btn-ghost ml-1" onClick={() => setAvatarUrl('')}>Remove</button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={pick} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pname">Full name</label>
          <input id="pname" className="input" maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="label">Username</p>
            <p className="rounded-md bg-paper px-3 py-2 text-mute">@{user.username}</p>
          </div>
          <div>
            <p className="label">Email</p>
            <p className="truncate rounded-md bg-paper px-3 py-2 text-mute">{user.email}</p>
          </div>
        </div>
        <ErrorBox>{err}</ErrorBox>
      </form>
    </Modal>
  );
}

/* ---------- Group people ---------- */
export function GroupPeopleModal({ group, onClose, onChanged, onLeft }) {
  const { user } = useAuth();
  const toast = useToast();
  const { statusOf } = useSocket();
  const [members, setMembers] = useState(null);
  const [role, setRole] = useState('MEMBER');
  const canManage = ['OWNER', 'ADMIN'].includes(group.currentUserRole);
  const isOwner = group.currentUserRole === 'OWNER';

  const load = () => api.groups.members(group.id).then(setMembers).catch((e) => { setMembers([]); toast({ tone: 'error', title: 'Could not load members', body: errorText(e) }); });
  useEffect(() => { load(); }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(u) {
    try {
      await api.groups.addMember(group.id, { userId: u.id, role });
      toast({ title: `${displayName(u)} added` });
      load();
      onChanged();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not add member', body: errorText(e) });
    }
  }

  async function remove(m) {
    if (!window.confirm(`Remove ${displayName(m.user)} from ${group.name}?`)) return;
    try {
      await api.groups.removeMember(group.id, m.user.id);
      load();
      onChanged();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not remove member', body: errorText(e) });
    }
  }

  async function leave() {
    if (!window.confirm(`Leave ${group.name}?`)) return;
    try {
      await api.groups.leave(group.id);
      onLeft();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not leave group', body: errorText(e) });
    }
  }

  async function destroy() {
    if (!window.confirm(`Delete ${group.name} and everything in it? This cannot be undone.`)) return;
    try {
      await api.groups.remove(group.id);
      onLeft();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not delete group', body: errorText(e) });
    }
  }

  return (
    <Modal
      title={`People in ${group.name}`}
      onClose={onClose}
      wide
      footer={
        isOwner ? (
          <button className="btn-danger" onClick={destroy}><Icon name="trash" size={16} /> Delete group</button>
        ) : (
          <button className="btn-outline text-brick" onClick={leave}><Icon name="logout" size={16} /> Leave group</button>
        )
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Members {members && <span className="font-normal text-mute">({members.length})</span>}</h3>
          <ul className="max-h-80 space-y-0.5 overflow-y-auto">
            {!members && <li className="flex justify-center py-6"><Spinner /></li>}
            {members?.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                <Avatar user={m.user} size={34} status={statusOf(m.user)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName(m.user)}</p>
                  <p className="truncate text-xs text-mute">@{m.user?.username}</p>
                </div>
                <Badge tone={m.role === 'OWNER' ? 'sun' : m.role === 'ADMIN' ? 'pine' : 'plain'}>{ROLE_LABEL[m.role] || m.role}</Badge>
                {canManage && m.role !== 'OWNER' && m.user?.id !== user.id && (
                  <button className="btn-ghost !p-1.5 hover:!text-brick" onClick={() => remove(m)} aria-label={`Remove ${displayName(m.user)}`}>
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        {canManage && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add people</h3>
              <select className="input !w-auto !py-1 text-xs" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role for new members">
                <option value="MEMBER">As member</option>
                <option value="ADMIN">As admin</option>
              </select>
            </div>
            <UserSearch onPick={add} exclude={(members || []).map((m) => m.user?.id)} actionLabel="Add" />
          </section>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Channel settings ---------- */
export function ChannelSettingsModal({ channel, group, onClose, onChanged, onGone }) {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = channel.currentUserRole === 'ADMIN' || ['OWNER', 'ADMIN'].includes(group.currentUserRole);
  const joined = !!channel.currentUserRole;
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [priv, setPriv] = useState(isPriv(channel));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [members, setMembers] = useState(null);

  const loadMembers = () => api.channels.members(channel.id).then(setMembers).catch(() => setMembers([]));
  useEffect(() => { if (joined) loadMembers(); else setMembers([]); }, [channel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return setErr('The channel needs a name.');
    setBusy(true);
    setErr('');
    try {
      await api.channels.update(channel.id, { name: name.trim(), description: description.trim(), isPrivate: priv });
      toast({ title: 'Channel updated' });
      onChanged();
    } catch (x) {
      setErr(errorText(x));
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    if (!window.confirm('Replace the invite code? The old code will stop working.')) return;
    try {
      await api.channels.regenerateCode(channel.id);
      toast({ title: 'New invite code created' });
      onChanged();
    } catch (x) {
      toast({ tone: 'error', title: 'Could not regenerate code', body: errorText(x) });
    }
  }

  async function removeMember(m) {
    if (!window.confirm(`Remove ${displayName(m.user)} from #${channel.name}?`)) return;
    try {
      await api.channels.removeMember(channel.id, m.user.id);
      loadMembers();
      onChanged();
    } catch (x) {
      toast({ tone: 'error', title: 'Could not remove member', body: errorText(x) });
    }
  }

  async function leave() {
    if (!window.confirm(`Leave #${channel.name}?`)) return;
    try {
      await api.channels.leave(channel.id);
      onGone('left');
    } catch (x) {
      toast({ tone: 'error', title: 'Could not leave channel', body: errorText(x) });
    }
  }

  async function destroy() {
    if (!window.confirm(`Delete #${channel.name} and all of its messages?`)) return;
    try {
      await api.channels.remove(channel.id);
      onGone('deleted');
    } catch (x) {
      toast({ tone: 'error', title: 'Could not delete channel', body: errorText(x) });
    }
  }

  return (
    <Modal title={`#${channel.name}`} onClose={onClose} wide>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-paper px-4 py-3 text-sm">
          <span>
            Channel ID <strong className="font-semibold">{channel.id}</strong>
            <button className="btn-ghost ml-1 !p-1" onClick={() => copyText(String(channel.id), toast)} aria-label="Copy channel ID">
              <Icon name="copy" size={14} />
            </button>
          </span>
          {isPriv(channel) && channel.inviteCode && (
            <span className="flex items-center">
              Invite code <code className="mx-1.5 rounded bg-white px-2 py-0.5 font-mono text-[13px] ring-1 ring-line">{channel.inviteCode}</code>
              <button className="btn-ghost !p-1" onClick={() => copyText(channel.inviteCode, toast)} aria-label="Copy invite code">
                <Icon name="copy" size={14} />
              </button>
              <button className="btn-ghost !p-1" onClick={regenerate} aria-label="Regenerate invite code" title="Regenerate invite code">
                <Icon name="refresh" size={14} />
              </button>
            </span>
          )}
        </div>

        {canManage && (
          <form onSubmit={save} className="space-y-4">
            <h3 className="text-sm font-semibold">Details</h3>
            <div>
              <label className="label" htmlFor="sname">Name</label>
              <input id="sname" className="input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="sdesc">Description</label>
              <input id="sdesc" className="input" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
              Private channel (invite code required)
            </label>
            <ErrorBox>{err}</ErrorBox>
            <button className="btn-primary" disabled={busy}>
              {busy && <Spinner className="!h-4 !w-4 !border-white/40 !border-t-white" />}
              Save changes
            </button>
          </form>
        )}

        {joined && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Members {members && <span className="font-normal text-mute">({members.length})</span>}</h3>
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {!members && <li className="flex justify-center py-4"><Spinner /></li>}
              {members?.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <Avatar user={m.user} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm">{displayName(m.user)}</span>
                  {m.role !== 'MEMBER' && <Badge tone="pine">{ROLE_LABEL[m.role] || m.role}</Badge>}
                  {canManage && m.user?.id !== user.id && (
                    <button className="btn-ghost !p-1.5 hover:!text-brick" onClick={() => removeMember(m)} aria-label={`Remove ${displayName(m.user)}`}>
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {joined && (
            <button className="btn-outline text-brick" onClick={leave}><Icon name="logout" size={16} /> Leave channel</button>
          )}
          {canManage && (
            <button className="btn-danger" onClick={destroy}><Icon name="trash" size={16} /> Delete channel</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
