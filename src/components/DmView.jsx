import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocket, useTopic } from '../context/SocketContext.jsx';
import { PAGE_SIZE } from '../config';
import { Avatar, Icon } from './ui.jsx';
import MessageList from './MessageList.jsx';
import Composer from './Composer.jsx';
import { attachmentType, displayName, errorText, upsert } from '../lib/util';

export default function DmView({ peer, chatId, onChatChanged, onMenu }) {
  const { user } = useAuth();
  const toast = useToast();
  const { statusOf } = useSocket();
  const [cid, setCid] = useState(chatId || null);
  const known = useRef(null); // chat id we created locally — no need to refetch its history
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(!!chatId);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reply, setReply] = useState(null);

  useEffect(() => {
    if (chatId && !cid) setCid(chatId);
  }, [chatId, cid]);

  useEffect(() => {
    if (!cid) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }
    if (known.current === cid) {
      setLoading(false);
      return undefined;
    }
    let live = true;
    setLoading(true);
    api.chats
      .messages(cid, 0, PAGE_SIZE)
      .then((list) => {
        if (!live) return;
        setMessages([...list].reverse());
        setHasMore(list.length === PAGE_SIZE);
        setPage(0);
        api.chats.read(cid).then(onChatChanged).catch(() => {});
      })
      .catch((e) => toast({ tone: 'error', title: 'Could not load messages', body: errorText(e) }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [cid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Incoming private messages are pushed to /user/queue/messages.
  useTopic('/user/queue/messages', (m) => {
    if (m.sender?.id !== peer.id) return;
    const id = cid || m.privateChatId;
    if (!cid && id) {
      known.current = id;
      setCid(id);
    }
    setMessages((p) => upsert(p, m));
    if (id) api.chats.read(id).then(onChatChanged).catch(() => {});
  });

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const list = await api.chats.messages(cid, next, PAGE_SIZE);
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
      let type = 'TEXT';
      let attachmentUrl = null;
      let content = text;
      if (file) {
        const { url } = await api.files.upload('attachments', file);
        attachmentUrl = url;
        type = attachmentType(file.name);
        if (type !== 'IMAGE' && !content) content = file.name;
      }
      const m = await api.chats.send({
        recipientId: peer.id,
        content,
        type,
        attachmentUrl,
        replyToId: reply?.id || null,
      });
      if (!cid && m.privateChatId) {
        known.current = m.privateChatId;
        setCid(m.privateChatId);
      }
      setMessages((p) => upsert(p, m));
      setReply(null);
      onChatChanged();
    } catch (e) {
      toast({ tone: 'error', title: 'Message not sent', body: errorText(e) });
      throw e;
    }
  }

  async function remove(m) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.chats.remove(m.id);
      setMessages((p) => upsert(p, { id: m.id, status: 'DELETED', content: null, attachmentUrl: null }));
      onChatChanged();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not delete message', body: errorText(e) });
    }
  }

  const status = statusOf(peer);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button className="btn-ghost !p-2 md:hidden" onClick={onMenu} aria-label="Open navigation">
          <Icon name="menu" />
        </button>
        <Avatar user={peer} size={36} status={status} />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-semibold leading-tight">{displayName(peer)}</h1>
          <p className="truncate text-xs text-mute">
            @{peer.username} · {status.replace(/_/g, ' ').toLowerCase()}
          </p>
        </div>
      </header>
      <MessageList
        messages={messages}
        meId={user.id}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        onReply={setReply}
        onDelete={remove}
        emptyHint={`This is the beginning of your conversation with ${displayName(peer)}.`}
      />
      <Composer
        placeholder={`Message ${displayName(peer)}`}
        onSend={send}
        reply={reply}
        onCancelReply={() => setReply(null)}
      />
    </div>
  );
}
