import { useEffect, useState, type FormEvent } from 'react';

import { useI18n } from '../lib/useI18n';
import type { NavConfig } from '../lib/navTypes';
import { AdminDashboard } from './admin/AdminDashboard';

type AdminUser = {
  username: string;
};

type MeResponse = {
  username: string | null;
};

async function apiGetMe(): Promise<AdminUser | null> {
  const resp = await fetch('/api/me', { credentials: 'include' });
  if (!resp.ok) throw new Error('me failed');
  const data = (await resp.json()) as MeResponse;
  if (!data.username) return null;
  return { username: data.username };
}

async function apiLogin(username: string, password: string): Promise<void> {
  const resp = await fetch('/api/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) throw new Error('login failed');
}

async function apiLogout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
}

type SaveConfigResult = { ok: true } | { ok: false; reason: 'conflict' | 'other' };

export function AdminPage(props: {
  config: NavConfig;
  onSaveConfig: (next: NavConfig) => Promise<SaveConfigResult>;
  onResetConfig: () => Promise<boolean>;
  onReload: () => Promise<void>;
  title: string;
}) {
  const { m } = useI18n();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiGetMe()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  const onLogout = async () => {
    await apiLogout();
    setUser(null);
  };

  const onLogin = async () => {
    setLoginError('');
    try {
      await apiLogin(loginUser, loginPass);
      const u = await apiGetMe();
      if (!u) throw new Error('login missing session');
      setUser(u);
    } catch {
      setLoginError(m.admin.loginFailed);
    }
  };

  const onLoginSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) return;
    void onLogin();
  };

  const handleSaveConfig = async (next: NavConfig) => {
    const result = await props.onSaveConfig(next);
    if (!result.ok) {
      setSaveError(result.reason === 'conflict' ? m.admin.conflictMessage : m.admin.saveFailedNeedKv);
      return false;
    }
    setSaveError('');
    return true;
  };

  if (!authChecked) {
    return (
      <div className="admin-layout admin-layout-center">
        <p>{m.admin.currentlyCheckingAuth}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-layout admin-layout-center">
        <div className="admin-modal admin-modal-sm">
          <div className="admin-modal-header">
            <h2 className="admin-modal-title">{props.title} {m.app.adminTitleSuffix}</h2>
          </div>
          <form onSubmit={onLoginSubmit}>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.username}</label>
                <input 
                  className="admin-input"
                  value={loginUser} 
                  onChange={(e) => setLoginUser(e.target.value)} 
                  autoComplete="username" 
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.password}</label>
                <div className="pos-relative">
                  <input
                    className="admin-input"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="admin-input-icon-btn"
                    onClick={() => setShowLoginPassword((v) => !v)}
                  >
                    {showLoginPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              {loginError && <p className="admin-error-text">{loginError}</p>}
            </div>
            <div className="admin-modal-footer">
              <a className="btn" href="/">{m.admin.backHome}</a>
              <button className="btn btn-primary" type="submit" disabled={!loginUser.trim() || !loginPass.trim()}>
                {m.admin.login}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard 
      config={props.config}
      onSaveConfig={handleSaveConfig}
      onResetConfig={props.onResetConfig}
      user={user}
      onLogout={onLogout}
      saveError={saveError}
      onClearSaveError={() => setSaveError('')}
      onReload={props.onReload}
    />
  );
}
