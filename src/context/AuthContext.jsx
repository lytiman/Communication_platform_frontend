import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/api';
import { getSession, onSession, setSession } from '../api/http';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSess] = useState(getSession());
  useEffect(() => onSession(setSess), []);

  const signedIn = !!session;
  const user = session?.user || null;

  const refreshMe = useCallback(async () => {
    const me = await api.users.me();
    const cur = getSession();
    if (cur) setSession({ ...cur, user: me });
    return me;
  }, []);

  // Pull the full profile (roles, status) once a session exists.
  useEffect(() => {
    if (signedIn) refreshMe().catch(() => {});
  }, [signedIn, refreshMe]);

  const start = (d) => setSession({ accessToken: d.accessToken, refreshToken: d.refreshToken, user: d.user });

  const value = useMemo(
    () => ({
      user,
      signedIn,
      isAdmin: !!user?.roleNames?.includes('ROLE_ADMIN'),
      refreshMe,
      login: async ({ usernameOrEmail, password }) =>
        start(await api.auth.login({ usernameOrEmail, password, deviceInfo: navigator.userAgent.slice(0, 120) })),
      register: async (form) => start(await api.auth.register(form)),
      logout: async () => {
        const s = getSession();
        setSession(null);
        if (s?.refreshToken) api.auth.logout(s.refreshToken).catch(() => {});
      },
      logoutEverywhere: async () => {
        await api.users.logoutAll().catch(() => {});
        setSession(null);
      },
    }),
    [user, signedIn, refreshMe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
