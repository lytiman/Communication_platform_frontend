import { API_URL } from '../config';
import { jwtExp } from '../lib/util';

const KEY = 'relay.session';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

let session = load();
const listeners = new Set();

export const getSession = () => session;

export function setSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — keep the in-memory session */
  }
  listeners.forEach((fn) => fn(next));
}

export function onSession(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Only one refresh may run at a time: refresh tokens are single-use
// (the backend rotates them), so parallel refreshes would invalidate each other.
let refreshing = null;

export function refreshSession() {
  if (!session?.refreshToken) return Promise.reject(new ApiError(401, 'Session expired'));
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError(res.status, 'Session expired');
        const data = await res.json();
        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user || session?.user,
        });
        return data.accessToken;
      })
      .catch((err) => {
        setSession(null);
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// Returns a usable access token, refreshing it first if it is about to expire.
export async function validToken() {
  if (!session) return null;
  if (jwtExp(session.accessToken) - Date.now() < 30_000) {
    try {
      return await refreshSession();
    } catch {
      return null;
    }
  }
  return session.accessToken;
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request(path, { method = 'GET', body, form, auth = true, retry = true } = {}) {
  const headers = {};
  if (auth) {
    const token = await validToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let payload;
  if (form) {
    payload = form; // browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.');
  }

  const data = await parseBody(res);
  if (res.ok) return data;

  // The backend answers an expired/missing token with 401 or an empty 403;
  // its own permission errors are 403 *with* a JSON "message".
  const authFailure = res.status === 401 || (res.status === 403 && !(data && data.message));
  if (auth && authFailure && retry && session) {
    try {
      await refreshSession();
    } catch {
      throw new ApiError(401, 'Your session has expired. Sign in again.');
    }
    return request(path, { method, body, form, auth, retry: false });
  }

  const message = data?.validationErrors?.length
    ? data.validationErrors.join('\n')
    : data?.message || `Request failed (${res.status})`;
  throw new ApiError(res.status, message, data);
}
