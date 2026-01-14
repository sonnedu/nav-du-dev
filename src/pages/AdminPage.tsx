import { useEffect, useMemo, useState } from 'react';

import type { NavConfig, NavLink } from '../lib/navTypes';
import { isNavConfig } from '../lib/navValidate';
import { parseNavConfigFromYaml, sortCategories } from '../lib/navLoad';

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function slugifyId(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base) return base;
  return `item-${Date.now().toString(36)}`;
}

type ModalName = 'none' | 'add' | 'edit' | 'import' | 'export';

function Modal(props: { title: string; onClose: () => void; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={props.onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{props.title}</h3>
          <button className="icon-btn" onClick={props.onClose} aria-label="关闭">
            关闭
          </button>
        </div>
        <div className="modal-body">{props.children}</div>
        {props.actions ? <div className="modal-actions">{props.actions}</div> : null}
      </div>
    </div>
  );
}

function buildExportJson(config: NavConfig): string {
  return JSON.stringify(config, null, 2);
}

function parseImportText(text: string): NavConfig {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty input');

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isNavConfig(parsed)) throw new Error('Invalid JSON config');
    return sortCategories(parsed);
  }

  const parsed = parseNavConfigFromYaml(trimmed) as unknown;
  if (!isNavConfig(parsed)) throw new Error('Invalid YAML config');
  return sortCategories(parsed);
}

function upsertLink(config: NavConfig, categoryId: string, link: NavLink): NavConfig {
  return {
    ...config,
    categories: config.categories.map((c) => {
      if (c.id !== categoryId) return c;
      const existingIndex = c.items.findIndex((i) => i.id === link.id);
      const items = [...c.items];
      if (existingIndex >= 0) items[existingIndex] = link;
      else items.push(link);
      return { ...c, items };
    }),
  };
}

function removeLink(config: NavConfig, categoryId: string, linkId: string): NavConfig {
  return {
    ...config,
    categories: config.categories.map((c) => {
      if (c.id !== categoryId) return c;
      return { ...c, items: c.items.filter((i) => i.id !== linkId) };
    }),
  };
}

function moveOrUpdateLink(config: NavConfig, fromCategoryId: string, toCategoryId: string, link: NavLink): NavConfig {
  const removed = removeLink(config, fromCategoryId, link.id);
  return upsertLink(removed, toCategoryId, link);
}

type AdminUser = {
  username: string;
};

async function apiGetMe(): Promise<AdminUser> {
  const resp = await fetch('/api/me', { credentials: 'include' });
  if (!resp.ok) throw new Error('unauthorized');
  return (await resp.json()) as AdminUser;
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

export function AdminPage(props: {
  config: NavConfig;
  onSaveConfig: (next: NavConfig) => Promise<boolean>;
  onResetConfig: () => Promise<boolean>;
  title: string;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiGetMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [modal, setModal] = useState<ModalName>('none');

  const [addCategoryId, setAddCategoryId] = useState(() => props.config.categories[0]?.id ?? '');
  const effectiveAddCategoryId = useMemo(() => {
    if (props.config.categories.some((c) => c.id === addCategoryId)) return addCategoryId;
    return props.config.categories[0]?.id ?? '';
  }, [addCategoryId, props.config.categories]);

  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addTags, setAddTags] = useState('');

  const [editOriginalCategoryId, setEditOriginalCategoryId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');

  const effectiveEditCategoryId = useMemo(() => {
    if (props.config.categories.some((c) => c.id === editCategoryId)) return editCategoryId;
    return props.config.categories[0]?.id ?? '';
  }, [editCategoryId, props.config.categories]);

  const openEdit = (categoryId: string, link: NavLink) => {
    setEditOriginalCategoryId(categoryId);
    setEditCategoryId(categoryId);
    setEditId(link.id);
    setEditName(link.name);
    setEditUrl(link.url);
    setEditDesc(link.desc ?? '');
    setEditTags((link.tags ?? []).join(', '));
    setModal('edit');
  };

  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const [saveError, setSaveError] = useState('');
  const exportJson = useMemo(() => buildExportJson(props.config), [props.config]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
  };

  const onAddSubmit = async () => {
    const name = addName.trim();
    const url = normalizeUrl(addUrl);
    const desc = addDesc.trim();
    if (!name || !url) return;

    const tags = addTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const link: NavLink = {
      id: slugifyId(name),
      name,
      url,
      desc: desc || undefined,
      tags: tags.length ? tags : undefined,
    };

    const next = upsertLink(props.config, effectiveAddCategoryId, link);
    const ok = await props.onSaveConfig(next);

    if (!ok) {
      setSaveError('保存失败：请确认 Pages Functions 与 KV 已配置');
      return;
    }

    setSaveError('');
    setAddName('');
    setAddUrl('');
    setAddDesc('');
    setAddTags('');
    setModal('none');
  };

  const onEditSubmit = async () => {
    const name = editName.trim();
    const url = normalizeUrl(editUrl);
    const desc = editDesc.trim();

    if (!editId || !name || !url) return;

    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const link: NavLink = {
      id: editId,
      name,
      url,
      desc: desc || undefined,
      tags: tags.length ? tags : undefined,
    };

    const fromCategory = editOriginalCategoryId || effectiveEditCategoryId;
    const toCategory = effectiveEditCategoryId;

    const next = moveOrUpdateLink(props.config, fromCategory, toCategory, link);
    const ok = await props.onSaveConfig(next);
    if (!ok) {
      setSaveError('保存失败：请确认 Pages Functions 与 KV 已配置');
      return;
    }
    setSaveError('');
    setModal('none');
  };

  const onEditDelete = async () => {
    if (!editId) return;
    const fromCategory = editOriginalCategoryId || effectiveEditCategoryId;
    const next = removeLink(props.config, fromCategory, editId);
    const ok = await props.onSaveConfig(next);
    if (!ok) {
      setSaveError('保存失败：请确认 Pages Functions 与 KV 已配置');
      return;
    }
    setSaveError('');
    setModal('none');
  };

  const onImportApply = async () => {
    setImportError('');
    try {
      const parsed = parseImportText(importText);
      const ok = await props.onSaveConfig(parsed);
      if (!ok) {
        setImportError('导入成功但保存失败：请确认 Pages Functions 与 KV 已配置');
        return;
      }
      setImportError('');
      setModal('none');
      setImportText('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed';
      setImportError(message);
    }
  };

  const onLogout = async () => {
    await apiLogout();
    setUser(null);
  };

  if (!authChecked) {
    return (
      <div className="app-shell">
        <main className="main" style={{ padding: 24 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{props.title} 管理后台</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-sub)' }}>正在检查登录状态…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <main className="main" style={{ padding: 24 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{props.title} 管理后台</h1>
          <p style={{ margin: '8px 0 18px', color: 'var(--text-sub)' }}>登录后可添加/编辑/导入/导出链接</p>

          <div className="modal" style={{ maxWidth: 420, margin: 0, overflow: 'hidden' }}>
            <div className="modal-body">
              {saveError ? <div style={{ color: 'var(--primary)', fontSize: 12 }}>{saveError}</div> : null}
              <div className="form-row">
                <label>账号</label>
                <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} autoComplete="username" />
              </div>
              <div className="form-row">
                <label>密码</label>
                <input
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                />
              </div>
              {loginError ? <div style={{ color: 'var(--primary)', fontSize: 12 }}>{loginError}</div> : null}
              <div className="modal-actions" style={{ padding: 0, borderTop: 'none' }}>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    setLoginError('');
                    try {
                      await apiLogin(loginUser, loginPass);
                      const u = await apiGetMe();
                      setUser(u);
                    } catch {
                      setLoginError('登录失败');
                    }
                  }}
                  disabled={!loginUser.trim() || !loginPass.trim()}
                >
                  登录
                </button>
                <a className="btn" href="/">
                  返回首页
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell--with-sidebar">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-title">管理后台</div>
            <div className="sidebar-subtitle">{user.username}</div>
          </div>
        </div>
        <div className="sidebar-list">
          <button className="sidebar-item" onClick={() => setModal('add')}>
            <span>添加</span>
          </button>
          <button className="sidebar-item" onClick={() => setModal('import')}>
            <span>导入</span>
          </button>
          <button className="sidebar-item" onClick={() => setModal('export')}>
            <span>导出</span>
          </button>
          <button
            className="sidebar-item"
            onClick={async () => {
              const ok = await props.onResetConfig();
              if (!ok) setSaveError('重置失败：请确认 Pages Functions 与 KV 已配置');
              else setSaveError('');
            }}
          >
            <span>重置</span>
          </button>
          <a className="sidebar-item" href="/">
            <span>返回首页</span>
          </a>
          <button className="sidebar-item" onClick={onLogout}>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="banner">
          <div className="banner-row">
            <h1 className="banner-title">链接管理</h1>
            <div className="banner-tools" />
          </div>
          {saveError ? <div style={{ marginTop: 10, color: 'var(--primary)', fontSize: 12 }}>{saveError}</div> : null}
        </header>

        <section className="content">
          {props.config.categories.map((category) => (
            <div key={category.id} style={{ marginBottom: 18 }}>
              <div className="section-title">
                <h2>{category.name}</h2>
                <span>{category.items.length} 项</span>
              </div>
              <div className="grid">
                {category.items.map((link) => (
                  <button
                    key={`${category.id}:${link.id}`}
                    className="card"
                    style={{ cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => openEdit(category.id, link)}
                  >
                    <div className="card-body">
                      <p className="card-title">{link.name}</p>
                      <p className="card-desc">{link.desc ?? link.url}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {modal === 'add' ? (
        <Modal
          title="添加网站"
          onClose={() => setModal('none')}
          actions={
            <>
              <button className="btn" onClick={() => setModal('none')}>
                取消
              </button>
              <button className="btn btn-primary" onClick={onAddSubmit} disabled={!addName.trim() || !addUrl.trim()}>
                保存
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>分类</label>
            <select value={effectiveAddCategoryId} onChange={(e) => setAddCategoryId(e.target.value)}>
              {props.config.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>网站名称</label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} />
          </div>

          <div className="form-row">
            <label>网址</label>
            <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} />
          </div>

          <div className="form-row">
            <label>说明（可选）</label>
            <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
          </div>

          <div className="form-row">
            <label>标签（可选，逗号分隔）</label>
            <input value={addTags} onChange={(e) => setAddTags(e.target.value)} />
          </div>
        </Modal>
      ) : null}

      {modal === 'edit' ? (
        <Modal
          title="编辑网站"
          onClose={() => setModal('none')}
          actions={
            <>
              <button className="btn" onClick={onEditDelete} disabled={!editId}>
                删除
              </button>
              <button className="btn" onClick={() => setModal('none')}>
                取消
              </button>
              <button className="btn btn-primary" onClick={onEditSubmit} disabled={!editName.trim() || !editUrl.trim()}>
                保存
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>分类</label>
            <select value={effectiveEditCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
              {props.config.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>网站名称</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>

          <div className="form-row">
            <label>网址</label>
            <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
          </div>

          <div className="form-row">
            <label>说明（可选）</label>
            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>

          <div className="form-row">
            <label>标签（可选，逗号分隔）</label>
            <input value={editTags} onChange={(e) => setEditTags(e.target.value)} />
          </div>
        </Modal>
      ) : null}

      {modal === 'export' ? (
        <Modal
          title="导出配置（JSON）"
          onClose={() => setModal('none')}
          actions={
            <>
              <button className="btn" onClick={() => copyToClipboard(exportJson)}>
                复制
              </button>
              <button className="btn btn-primary" onClick={() => setModal('none')}>
                关闭
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>复制后可保存到仓库或备份</label>
            <textarea value={exportJson} readOnly />
          </div>
        </Modal>
      ) : null}

      {modal === 'import' ? (
        <Modal
          title="导入配置（JSON 或 YAML）"
          onClose={() => setModal('none')}
          actions={
            <>
              <button className="btn" onClick={() => setModal('none')}>
                取消
              </button>
              <button className="btn btn-primary" onClick={onImportApply} disabled={!importText.trim()}>
                应用
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>粘贴 JSON/YAML</label>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} />
          </div>
          {importError ? <div style={{ color: 'var(--primary)', fontSize: 12 }}>{importError}</div> : null}
        </Modal>
      ) : null}
    </div>
  );
}
