import { createContext, useCallback, useContext, useState } from 'react';
import { cx } from '../lib/util';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((p) => [...p.slice(-3), { id, tone: 'info', ...t }]);
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), t.duration || 4500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((i) => (
          <div
            key={i.id}
            role={i.onClick ? 'button' : undefined}
            onClick={() => {
              i.onClick?.();
              setItems((p) => p.filter((x) => x.id !== i.id));
            }}
            className={cx(
              'pointer-events-auto rounded-lg border-l-4 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5',
              i.tone === 'error' ? 'border-brick' : 'border-sun',
              i.onClick && 'cursor-pointer',
            )}
          >
            {i.title && <p className="text-sm font-semibold">{i.title}</p>}
            {i.body && <p className="line-clamp-3 whitespace-pre-line text-sm text-mute">{i.body}</p>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
