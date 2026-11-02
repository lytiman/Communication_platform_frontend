import { Fragment, useLayoutEffect, useMemo, useRef } from 'react';
import { Avatar, Empty, Icon, Spinner } from './ui.jsx';
import { cx, dayLabel, displayName, fileUrl, fullWhen, parseDate, timeLabel } from '../lib/util';

// Text with clickable links. split() with a capture group puts URLs at odd indexes.
function Linkified({ text }) {
  return text.split(/(https?:\/\/[^\s<]+)/g).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="text-pine-700 underline underline-offset-2">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function Attachment({ m }) {
  const url = fileUrl(m.attachmentUrl);
  if (!url) return null;
  if (m.type === 'IMAGE')
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={m.content || 'Image attachment'} loading="lazy" className="mt-1 max-h-72 max-w-full rounded-lg border border-line" />
      </a>
    );
  if (m.type === 'VIDEO') return <video src={url} controls className="mt-1 max-h-72 max-w-full rounded-lg" />;
  if (m.type === 'AUDIO') return <audio src={url} controls className="mt-1" />;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-paper"
    >
      <Icon name="file" />
      <span className="truncate">{m.content || 'Download file'}</span>
    </a>
  );
}

export default function MessageList({
  messages,
  meId,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  emptyHint = 'Say hello.',
}) {
  const ref = useRef(null);
  const prev = useRef({ init: false, first: null, last: null, h: 0 });
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  // Scroll behaviour: jump to the bottom on first load, keep position when
  // older messages are prepended, follow new messages only when already near
  // the bottom (or when I sent them).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = prev.current;
    const first = messages[0]?.id ?? null;
    const lastMsg = messages[messages.length - 1];
    const last = lastMsg?.id ?? null;
    if (!p.init) {
      if (messages.length) {
        el.scrollTop = el.scrollHeight;
        p.init = true;
      }
    } else if (first !== p.first && last === p.last) {
      el.scrollTop += el.scrollHeight - p.h;
    } else if (last !== p.last) {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (near || lastMsg?.sender?.id === meId) el.scrollTop = el.scrollHeight;
    }
    p.first = first;
    p.last = last;
    p.h = el.scrollHeight;
  }, [messages, meId]);

  let lastDay = '';
  let lastSender = null;
  let lastTime = 0;

  return (
    <div ref={ref} className="scroll-thin flex-1 overflow-y-auto py-3">
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {!loading && hasMore && (
        <div className="flex justify-center pb-3">
          <button className="btn-outline !py-1 text-xs" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Spinner className="!h-3.5 !w-3.5" /> : <Icon name="refresh" size={14} />}
            Load earlier messages
          </button>
        </div>
      )}
      {!loading && messages.length === 0 && <Empty title="No messages yet" hint={emptyHint} className="py-16" />}

      {messages.map((m) => {
        const d = parseDate(m.createdAt);
        const day = dayLabel(d);
        const newDay = day !== lastDay;
        const compact = !newDay && lastSender === m.sender?.id && d && d.getTime() - lastTime < 5 * 60000;
        lastDay = day;
        lastSender = m.sender?.id;
        lastTime = d ? d.getTime() : 0;

        const deleted = m.status === 'DELETED';
        const mine = m.sender?.id === meId;
        const canEdit = mine && !deleted && m.type === 'TEXT' && onEdit;
        const canDelete = (mine || canModerate) && !deleted && onDelete;
        const parent = m.replyToId ? byId.get(m.replyToId) : null;

        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="my-3 flex items-center gap-3 px-5">
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs font-medium text-mute">{day}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            )}

            {m.type === 'SYSTEM' ? (
              <p className="px-5 py-1 text-center text-xs italic text-mute">{m.content}</p>
            ) : (
              <div className={cx('group relative flex gap-3 px-5 py-0.5 hover:bg-paper/80', !compact && 'mt-2')}>
                {compact ? (
                  <span className="w-9 shrink-0 select-none pt-1 text-right text-[10px] text-mute opacity-0 group-hover:opacity-100" title={fullWhen(d)}>
                    {timeLabel(d)}
                  </span>
                ) : (
                  <Avatar user={m.sender} size={36} />
                )}
                <div className="min-w-0 flex-1">
                  {!compact && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{displayName(m.sender)}</span>
                      <span className="text-xs text-mute" title={fullWhen(d)}>
                        {timeLabel(d)}
                      </span>
                    </div>
                  )}
                  {m.replyToId && !deleted && (
                    <p className="mb-0.5 flex items-center gap-1.5 truncate border-l-2 border-sun pl-2 text-xs text-mute">
                      <Icon name="reply" size={12} />
                      {parent
                        ? `${displayName(parent.sender)}: ${parent.status === 'DELETED' ? 'deleted message' : parent.content || 'attachment'}`
                        : 'Earlier message'}
                    </p>
                  )}
                  {deleted ? (
                    <p className="text-sm italic text-mute">This message was deleted.</p>
                  ) : (
                    <>
                      {m.content && m.type !== 'FILE' && (
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                          <Linkified text={m.content} />
                          {m.edited && <span className="ml-1 text-xs text-mute">(edited)</span>}
                        </p>
                      )}
                      <Attachment m={m} />
                    </>
                  )}
                </div>

                {!deleted && (onReply || canEdit || canDelete) && (
                  <div className="absolute -top-3 right-4 hidden items-center rounded-md border border-line bg-white shadow-sm group-hover:flex group-focus-within:flex">
                    {onReply && (
                      <button className="btn-ghost !p-1.5" title="Reply" aria-label="Reply" onClick={() => onReply(m)}>
                        <Icon name="reply" size={15} />
                      </button>
                    )}
                    {canEdit && (
                      <button className="btn-ghost !p-1.5" title="Edit" aria-label="Edit message" onClick={() => onEdit(m)}>
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button className="btn-ghost !p-1.5 hover:!text-brick" title="Delete" aria-label="Delete message" onClick={() => onDelete(m)}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
