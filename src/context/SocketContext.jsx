import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_URL } from '../config';
import { validToken } from '../api/http';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useSocket = () => useContext(Ctx);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState('disconnected');
  const [presence, setPresence] = useState({}); // userId -> OnlineStatus
  const clientRef = useRef(null);
  // destination -> { handlers:Set<fn>, sub: StompSubscription|null }
  // Components subscribe by destination; this registry re-attaches every
  // subscription automatically after a reconnect.
  const registry = useRef(new Map());

  const attach = (dest, entry) => {
    const client = clientRef.current;
    if (!client?.connected || entry.sub) return;
    entry.sub = client.subscribe(dest, (frame) => {
      let body;
      try {
        body = JSON.parse(frame.body);
      } catch {
        return;
      }
      entry.handlers.forEach((h) => h(body));
    });
  };

  const subscribe = useCallback((dest, handler) => {
    let entry = registry.current.get(dest);
    if (!entry) {
      entry = { handlers: new Set(), sub: null };
      registry.current.set(dest, entry);
    }
    entry.handlers.add(handler);
    attach(dest, entry);
    return () => {
      entry.handlers.delete(handler);
      if (entry.handlers.size === 0) {
        try {
          entry.sub?.unsubscribe();
        } catch {
          /* connection already closed */
        }
        registry.current.delete(dest);
      }
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Fresh token on every (re)connect — the access token lives only 15 minutes.
      beforeConnect: async () => {
        const token = await validToken();
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      onConnect: () => {
        setStatus('connected');
        registry.current.forEach((entry, dest) => {
          entry.sub = null;
          attach(dest, entry);
        });
      },
      onWebSocketClose: () => setStatus('reconnecting'),
      onStompError: () => setStatus('reconnecting'),
    });
    clientRef.current = client;
    setStatus('connecting');
    client.activate();
    return () => {
      client.deactivate();
      clientRef.current = null;
      registry.current.forEach((entry) => {
        entry.sub = null;
      });
      setStatus('disconnected');
    };
  }, [userId]);

  // Global presence feed: {userId, username, status}
  useEffect(
    () => subscribe('/topic/presence', (p) => setPresence((prev) => ({ ...prev, [p.userId]: p.status }))),
    [subscribe],
  );

  const value = useMemo(
    () => ({
      status,
      subscribe,
      // Latest known status for a user summary (live value wins over the REST snapshot).
      statusOf: (u) => (u ? presence[u.id] || u.onlineStatus || 'OFFLINE' : 'OFFLINE'),
    }),
    [status, subscribe, presence],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Subscribe to a STOMP destination for the lifetime of the component.
// The handler may change every render without causing a resubscribe.
export function useTopic(dest, handler) {
  const { subscribe } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!dest) return undefined;
    return subscribe(dest, (msg) => ref.current(msg));
  }, [dest, subscribe]);
}
