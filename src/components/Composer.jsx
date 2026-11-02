import { useEffect, useRef, useState } from 'react';
import { Icon, Spinner } from './ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { MAX_ATTACHMENT_MB } from '../config';
import { displayName } from '../lib/util';

// onSend({ text, file }) must return a promise; the box is cleared only if it resolves.
export default function Composer({ placeholder, onSend, reply, onCancelReply, editing, onCancelEdit }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setText(editing.content || '');
      setFile(null);
      requestAnimationFrame(() => taRef.current?.focus());
    } else {
      setText('');
    }
  }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reply) taRef.current?.focus();
  }, [reply?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      toast({ tone: 'error', title: 'File too large', body: `Attachments can be up to ${MAX_ATTACHMENT_MB} MB.` });
      return;
    }
    setFile(f);
  }

  async function submit() {
    const body = text.trim();
    if (busy || (!body && !file) || (editing && !body)) return;
    setBusy(true);
    try {
      await onSend({ text: body, file });
      setText('');
      setFile(null);
    } catch {
      /* the caller already showed the error */
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      if (editing) onCancelEdit?.();
      else if (reply) onCancelReply?.();
    }
  }

  const banner = editing
    ? 'Editing message'
    : reply
      ? `Replying to ${displayName(reply.sender)}: ${reply.content || 'attachment'}`
      : null;

  return (
    <div className="border-t border-line bg-white px-4 pb-4 pt-3">
      {banner && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-paper px-3 py-1.5 text-sm text-mute">
          <Icon name={editing ? 'edit' : 'reply'} size={14} />
          <span className="min-w-0 flex-1 truncate">{banner}</span>
          <button className="hover:text-ink" onClick={editing ? onCancelEdit : onCancelReply} aria-label="Cancel">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {file && (
        <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 text-sm">
          <Icon name="file" size={15} />
          <span className="truncate">{file.name}</span>
          <button className="text-mute hover:text-brick" onClick={() => setFile(null)} aria-label="Remove attachment">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-2 focus-within:border-pine-600 focus-within:ring-2 focus-within:ring-pine-600/20">
        {!editing && (
          <>
            <button type="button" className="btn-ghost !p-2" onClick={() => fileRef.current?.click()} aria-label="Attach a file">
              <Icon name="clip" />
            </button>
            <input ref={fileRef} type="file" hidden onChange={pick} />
          </>
        )}
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Message"
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-mute/70"
        />
        <button type="button" className="btn-primary !p-2" onClick={submit} disabled={busy} aria-label={editing ? 'Save edit' : 'Send'}>
          {busy ? <Spinner className="!h-[18px] !w-[18px] !border-white/40 !border-t-white" /> : <Icon name={editing ? 'check' : 'send'} />}
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-mute">Enter to send, Shift+Enter for a new line.</p>
    </div>
  );
}
