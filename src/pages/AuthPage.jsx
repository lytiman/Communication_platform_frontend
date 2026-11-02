import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { APP_NAME } from '../config';
import { Spinner, ErrorBox } from '../components/ui.jsx';
import { cx, errorText } from '../lib/util';

export default function AuthPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({ usernameOrEmail: '', password: '', username: '', email: '', fullName: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const isLogin = mode === 'login';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!isLogin) {
      if (f.username.trim().length < 3) return setError('Username must be at least 3 characters.');
      if (f.password.length < 8) return setError('Password must be at least 8 characters.');
    }
    setBusy(true);
    try {
      if (isLogin) await login({ usernameOrEmail: f.usernameOrEmail.trim(), password: f.password });
      else
        await register({
          username: f.username.trim(),
          email: f.email.trim(),
          password: f.password,
          fullName: f.fullName.trim() || null,
        });
      nav(loc.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full md:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-pine-900 p-12 text-white md:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun font-serif text-xl font-bold text-pine-900">
            {APP_NAME[0]}
          </span>
          <span className="font-serif text-2xl font-semibold">{APP_NAME}</span>
        </div>
        <div>
          <h1 className="max-w-md font-serif text-5xl font-semibold leading-[1.1]">
            One place for every team conversation.
          </h1>
          <p className="mt-5 max-w-sm text-pine-100/80">
            Groups, channels and direct messages, delivered the moment they are sent.
          </p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-16 rounded-full bg-sun" />
          <span className="h-1.5 w-8 rounded-full bg-leaf" />
          <span className="h-1.5 w-4 rounded-full bg-brick" />
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
          <div className="md:hidden">
            <span className="font-serif text-2xl font-semibold">{APP_NAME}</span>
          </div>
          <div>
            <h2 className="font-serif text-3xl font-semibold">{isLogin ? 'Sign in' : 'Create your account'}</h2>
            <p className="mt-1 text-sm text-mute">
              {isLogin ? 'Use your username or email.' : 'It takes a few seconds.'}
            </p>
          </div>

          {isLogin ? (
            <div>
              <label className="label" htmlFor="ue">Username or email</label>
              <input id="ue" className="input" autoComplete="username" value={f.usernameOrEmail} onChange={set('usernameOrEmail')} required autoFocus />
            </div>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="fn">Full name</label>
                <input id="fn" className="input" autoComplete="name" value={f.fullName} onChange={set('fullName')} />
              </div>
              <div>
                <label className="label" htmlFor="un">Username</label>
                <input id="un" className="input" autoComplete="username" value={f.username} onChange={set('username')} required />
              </div>
              <div>
                <label className="label" htmlFor="em">Email</label>
                <input id="em" type="email" className="input" autoComplete="email" value={f.email} onChange={set('email')} required />
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              className="input"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={f.password}
              onChange={set('password')}
              required
            />
            {!isLogin && <p className="mt-1 text-xs text-mute">At least 8 characters.</p>}
          </div>

          <ErrorBox>{error}</ErrorBox>

          <button className="btn-primary w-full !py-2.5" disabled={busy}>
            {busy && <Spinner className="!h-4 !w-4 !border-white/40 !border-t-white" />}
            {isLogin ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-center text-sm text-mute">
            {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              type="button"
              className={cx('font-medium text-pine-700 underline-offset-2 hover:underline')}
              onClick={() => {
                setMode(isLogin ? 'register' : 'login');
                setError('');
              }}
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
