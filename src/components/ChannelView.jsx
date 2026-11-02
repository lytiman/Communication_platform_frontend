import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocket, useTopic } from '../context/SocketContext.jsx';
import { PAGE_SIZE } from '../config';
import { Avatar, Badge, Empty, Icon, Spinner } from './ui.jsx';
import MessageList from './MessageList.jsx';
import Composer from './Composer.jsx';
import { ROLE_LABEL, attachmentType, displayName, errorText, isPriv, upsert } from '../lib/util';

function MembersPanel({ channel, onClose }) {
  const { statusOf } = useSocket();
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    api.channels.members(channel.id).then((m) => live && setList(m)).catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, [channel.id, channel.memberCount]);

  return (
    <aside className="fixed right-0 top-0 z-30 flex h-full w-72 flex-col border-l border-line bg-white shadow-xl lg:static lg:z-auto lg:shadow-none">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="font-serif text-base font-semibold">Members</h3>
        <button className="btn-ghost !p-1.5" onClick={onClose} aria-label="Close members">
          <Icon name="x" />
        </button>
      </div>
      <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto p-3">
        {!list && (
          <li className="flex justify-center py-6">
            <Spinner />
          </li>
        )}
        {list?.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <Avatar user={m.user} size={32} status={statusOf(m.user)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName(m.user)}</p>
              <p className="truncate text-xs text-mute">@{m.user?.username}</p>
            </div>
            {m.role !== 'MEMBER' && <Badge tone="pine">{ROLE_LABEL[m.role] || m.role}</Badge>}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function ChannelView({ channel, group, onMenu, onSettings, onJoined }) {
  const { user } = useAuth();
  const toast = useToast();
  const { status } = useSocket();
  const joined = !!channel.currentUserRole;
  const canModerate =
    channel.currentUserRole === 'ADMIN' || ['OWNER', 'ADMIN'].includes(group?.currentUserRole);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(joined);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reply, setReply] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!joined) return undefined;
    let live = true;
    setLoading(true);
    api.messages
      .list(channel.id, 0, PAGE_SIZE)
      .then((list) => {
        if (!live) return;
        setMessages([...list].reverse()); // server sends newest first
        setHasMore(list.length === PAGE_SIZE);
        setPage(0);
      })
      .catch((e) => toast({ tone: 'error', title: 'Could not load messages', body: errorText(e) }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [channel.id, joined]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live feed: new messages, edits and deletions all arrive here.
  useTopic(joined ? `/topic/channel.${channel.id}` : null, (m) => setMessages((p) => upsert(p, m)));

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const list = await api.messages.list(channel.id, next, PAGE_SIZE);
      const older = [...list].reverse();
      setMessages((p) => {
        const ids = new Set(p.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...p];
      });
      setPage(next);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e) {
      toast({ tone: 'error', title: 'Could not load earlier messages', body: errorText(e) });
    } finally {
      setLoadingMore(false);
    }
  }

  async function send({ text, file }) {
    try {
      if (editing) {
        const m = await api.messages.edit(editing.id, text);
        setMessages((p) => upsert(p, m));
        setEditing(null);
        return;
      }
      let type = 'TEXT';
      let attachmentUrl = null;
      let content = text;
      if (file) {
        const { url } = await api.files.upload('attachments', file);
        attachmentUrl = url;
        type = attachmentType(file.name);
        if (type !== 'IMAGE' && !content) content = file.name;
      }
      const m = await api.messages.send({
        channelId: channel.id,
        content,
        type,
        attachmentUrl,
        replyToId: reply?.id || null,
      });
      setMessages((p) => upsert(p, m));
      setReply(null);
    } catch (e) {
      toast({ tone: 'error', title: editing ? 'Edit not saved' : 'Message not sent', body: errorText(e) });
      throw e;
    }
  }

  async function remove(m) {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    try {
      await api.messages.remove(m.id);
      setMessages((p) => upsert(p, { id: m.id, status: 'DELETED', content: null, attachmentUrl: null }));
    } catch (e) {
      toast({ tone: 'error', title: 'Could not delete message', body: errorText(e) });
    }
  }

  async function join() {
    setJoining(true);
    try {
      await api.channels.join({ channelId: channel.id });
      onJoined();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not join channel', body: errorText(e) });
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <button className="btn-ghost !p-2 md:hidden" onClick={onMenu} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <Icon name={isPriv(channel) ? 'lock' : 'hash'} className="shrink-0 text-mute" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-lg font-semibold leading-tight">{channel.name}</h1>
            {channel.description && <p className="truncate text-xs text-mute">{channel.description}</p>}
          </div>
          {status !== 'connected' && (
            <span className="hidden items-center gap-1.5 rounded-full bg-sun-soft px-2.5 py-1 text-xs text-sun-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun" />
              {status === 'connecting' ? 'Connecting' : 'Reconnecting'}
            </span>
          )}
          {joined && (
            <button className="btn-ghost" onClick={() => setShowMembers((s) => !s)} aria-pressed={showMembers}>
              <Icon name="users" />
              <span className="text-xs">{channel.memberCount}</span>
            </button>
          )}
          <button className="btn-ghost !p-2" onClick={onSettings} aria-label="Channel settings">
            <Icon name="sliders" />
          </button>
        </header>

        {joined ? (
          <>
            <MessageList
              messages={messages}
              meId={user.id}
              loading={loading}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              canModerate={canModerate}
              onReply={(m) => {
                setEditing(null);
                setReply(m);
              }}
              onEdit={(m) => {
                setReply(null);
                setEditing(m);
              }}
              onDelete={remove}
              emptyHint={`This is the start of #${channel.name}. Say hello.`}
            />
            <Composer
              placeholder={`Message #${channel.name}`}
              onSend={send}
              reply={reply}
              onCancelReply={() => setReply(null)}
              editing={editing}
              onCancelEdit={() => setEditing(null)}
            />
          </>
        ) : (
          <Empty
            className="flex-1"
            title={`Join #${channel.name}`}
            hint="Joining lets you read the history and take part in the conversation."
            action={
              <button className="btn-primary" onClick={join} disabled={joining}>
                {joining && <Spinner className="!h-4 !w-4 !border-white/40 !border-t-white" />}
                Join channel
              </button>
            }
          />
        )}
      </div>
      {showMembers && joined && <MembersPanel channel={channel} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
