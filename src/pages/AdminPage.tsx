import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useI18n } from '../lib/useI18n';
import type { NavCategory, NavConfig, NavLink } from '../lib/navTypes';

const CATEGORY_ICON_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '💻', value: '💻' },
  { label: '🤖', value: '🤖' },
  { label: '🧰', value: '🧰' },
  { label: '📚', value: '📚' },
  { label: '🔎', value: '🔎' },
  { label: '✅', value: '✅' },
  { label: '🎨', value: '🎨' },
  { label: '☁️', value: '☁️' },
  { label: '⚙️', value: '⚙️' },
  { label: '📰', value: '📰' },
  { label: '🎬', value: '🎬' },
  { label: '🛒', value: '🛒' },
  { label: '💰', value: '💰' },
  { label: '📌', value: '📌' },
];

function resolveCategoryIcon(category: NavCategory): string {
  if (typeof category.icon === 'string' && category.icon.trim()) return category.icon.trim();
  return '📌';
}

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

type ModalName = 'none' | 'add' | 'edit' | 'import' | 'export' | 'categories';

function Modal(props: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={props.onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{props.title}</h3>
          <button className="icon-btn" onClick={props.onClose} aria-label={props.closeLabel}>
            {props.closeLabel}
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
  const { m } = useI18n();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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

  const [categoryDraft, setCategoryDraft] = useState<NavCategory[]>([]);
  const [groupRenameDrafts, setGroupRenameDrafts] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📌');

  const openCategoryModal = () => {
    setCategoryDraft(props.config.categories);
    setGroupRenameDrafts({});
    setNewCategoryName('');
    setNewCategoryGroup('');
    setNewCategoryOrder('');
    setNewCategoryIcon('📌');
    setModal('categories');
  };

  const categoryGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const c of categoryDraft) {
      const g = c.group?.trim();
      if (g) groups.add(g);
    }
    return [...groups].sort((a, b) => a.localeCompare(b));
  }, [categoryDraft]);

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

    const idBase = slugifyId(name);
    const existing = props.config.categories.find((c) => c.id === effectiveAddCategoryId);
    const exists = new Set((existing?.items ?? []).map((i) => i.id));
    const id = exists.has(idBase) ? `${idBase}-${Date.now().toString(36)}` : idBase;

    const link: NavLink = {
      id,
      name,
      url,
      desc: desc || undefined,
      tags: tags.length ? tags : undefined,
    };

    const next = upsertLink(props.config, effectiveAddCategoryId, link);
    const ok = await props.onSaveConfig(next);

    if (!ok) {
      setSaveError(m.admin.saveFailedNeedKv);
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
      setSaveError(m.admin.saveFailedNeedKv);
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
      setSaveError(m.admin.saveFailedNeedKv);
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
        setImportError(m.admin.importSavedButFailed);
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

  const onLogin = async () => {
    setLoginError('');
    try {
      await apiLogin(loginUser, loginPass);
      const u = await apiGetMe();
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

  if (!authChecked) {
    return (
      <div className="app-shell">
        <main className="main admin-auth">
          <div className="admin-auth-inner">
            <div className="admin-auth-header">
          <h1 className="admin-auth-title">{props.title} {m.app.adminTitleSuffix}</h1>
          <p className="admin-auth-sub">{m.admin.currentlyCheckingAuth}</p>

            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <main className="main admin-auth">
          <div className="admin-auth-inner">
            <div className="admin-auth-header">
              <h1 className="admin-auth-title">{props.title} {m.app.adminTitleSuffix}</h1>
            </div>

            <div className="modal admin-auth-card">
              <form className="modal-body" onSubmit={onLoginSubmit}>
                {saveError ? <div style={{ color: 'var(--primary)', fontSize: 12 }}>{saveError}</div> : null}
                <div className="form-row">
                  <label>{m.admin.username}</label>
                  <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} autoComplete="username" />
                </div>
                <div className="form-row">
                  <label>{m.admin.password}</label>
                  <div className="admin-password-row">
                    <input
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="admin-password-toggle"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? m.admin.hidePassword : m.admin.showPassword}
                      aria-pressed={showLoginPassword}
                    >
                      {showLoginPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                {loginError ? <div style={{ color: 'var(--primary)', fontSize: 12 }}>{loginError}</div> : null}
                <div className="modal-actions" style={{ padding: 0, borderTop: 'none' }}>
                  <button className="btn btn-primary" type="submit" disabled={!loginUser.trim() || !loginPass.trim()}>
                    {m.admin.login}
                  </button>
                  <a className="btn" href="/">
                    {m.admin.backHome}
                  </a>
                </div>
              </form>
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
            <div className="sidebar-title">{m.app.adminTitleSuffix}</div>
            <div className="sidebar-subtitle">{user.username}</div>
          </div>
        </div>
        <div className="sidebar-list">
          <button className="sidebar-item" onClick={() => setModal('add')}>
            <span>{m.admin.add}</span>
          </button>
          <button className="sidebar-item" onClick={openCategoryModal}>
            <span>{m.admin.categoriesAndGroups}</span>
          </button>
          <button className="sidebar-item" onClick={() => setModal('import')}>
            <span>{m.admin.import}</span>
          </button>
          <button className="sidebar-item" onClick={() => setModal('export')}>
            <span>{m.admin.export}</span>
          </button>
          <button
            className="sidebar-item"
            onClick={async () => {
              const ok = await props.onResetConfig();
              if (!ok) setSaveError(m.admin.resetFailedNeedKv);
              else setSaveError('');
            }}
          >
            <span>{m.admin.reset}</span>
          </button>
          <a className="sidebar-item" href="/">
            <span>{m.admin.backHome}</span>
          </a>
          <button className="sidebar-item" onClick={onLogout}>
            <span>{m.admin.logout}</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="banner">
          <div className="banner-row">
            <h1 className="banner-title">{m.admin.links}</h1>
            <div className="banner-tools" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setModal('add')}>
                {m.admin.add}
              </button>
              <button className="btn" onClick={openCategoryModal}>
                {m.admin.categoriesAndGroups}
              </button>
              <button className="btn" onClick={() => setModal('import')}>
                {m.admin.import}
              </button>
              <button className="btn" onClick={() => setModal('export')}>
                {m.admin.export}
              </button>
            </div>
          </div>
          {saveError ? <div style={{ marginTop: 10, color: 'var(--primary)', fontSize: 12 }}>{saveError}</div> : null}
        </header>

        <section className="content">
          {props.config.categories.map((category) => (
            <div key={category.id} style={{ marginBottom: 18 }}>
              <div className="section-title">
                <h2>{category.name}</h2>
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
          title={m.admin.addSiteTitle}
          onClose={() => setModal('none')}
          closeLabel={m.admin.close}
          actions={
            <>
              <button className="btn" onClick={() => setModal('none')}>
                {m.admin.cancel}
              </button>
              <button className="btn btn-primary" onClick={onAddSubmit} disabled={!addName.trim() || !addUrl.trim()}>
                {m.admin.save}
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>{m.admin.category}</label>
            <select value={effectiveAddCategoryId} onChange={(e) => setAddCategoryId(e.target.value)}>
              {props.config.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>{m.admin.siteName}</label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{m.admin.url}</label>
            <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{m.admin.descriptionOptional}</label>
            <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{m.admin.tagsOptional}</label>
            <input value={addTags} onChange={(e) => setAddTags(e.target.value)} />
          </div>
        </Modal>
      ) : null}

      {modal === 'edit' ? (
        <Modal
          title={m.admin.editSiteTitle}
          onClose={() => setModal('none')}
          closeLabel={m.admin.close}
          actions={
            <>
              <button className="btn" onClick={onEditDelete} disabled={!editId}>
                {m.admin.delete}
              </button>
              <button className="btn" onClick={() => setModal('none')}>
                {m.admin.cancel}
              </button>
              <button className="btn btn-primary" onClick={onEditSubmit} disabled={!editName.trim() || !editUrl.trim()}>
                {m.admin.save}
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>{m.admin.category}</label>
            <select value={effectiveEditCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
              {props.config.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>{m.admin.siteName}</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{m.admin.url}</label>
            <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{m.admin.descriptionOptional}</label>
            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>

          <div className="form-row">
            <label>{m.admin.tagsOptional}</label>
            <input value={editTags} onChange={(e) => setEditTags(e.target.value)} />
          </div>
        </Modal>
      ) : null}

      {modal === 'categories' ? (
        <Modal
          title={m.admin.categoriesGroupsTitle}
          onClose={() => setModal('none')}
          closeLabel={m.admin.close}
          actions={
            <>
              <button className="btn" onClick={() => setModal('none')}>
                {m.admin.cancel}
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const next = sortCategories({ ...props.config, categories: categoryDraft });
                  const ok = await props.onSaveConfig(next);
                  if (!ok) {
                    setSaveError(m.admin.saveFailedNeedKv);
                    return;
                  }
                  setSaveError('');
                  setModal('none');
                }}
              >
                {m.admin.save}
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>{m.admin.group}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categoryGroups.length === 0 ? <div style={{ color: 'var(--text-sub)', fontSize: 12 }}>{m.admin.noGroups}</div> : null}              {categoryGroups.map((g) => {
                const draft = groupRenameDrafts[g] ?? '';
                const normalized = draft.trim();
                const canApply = normalized.length > 0 && normalized !== g;

                return (
                  <div key={g} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={g}
                      readOnly
                      style={{ width: 140, color: 'var(--text-sub)' }}
                      aria-label={`${m.admin.group}: ${g}`}
                    />
                    <input
                      value={draft}
                      placeholder={m.admin.newGroupNamePlaceholder}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setGroupRenameDrafts((prev) => ({ ...prev, [g]: nextName }));
                      }}
                      aria-label={`${m.admin.categoriesGroupsTitle}: ${g}`}
                    />
                    <button
                      className="btn"
                      onClick={() => {
                        if (!canApply) return;
                        setCategoryDraft((prev) =>
                          prev.map((c) => ((c.group ?? '').trim() === g ? { ...c, group: normalized } : c)),
                        );
                        setGroupRenameDrafts((prev) => {
                          const next = { ...prev };
                          delete next[g];
                          return next;
                        });
                      }}
                      disabled={!canApply}
                    >
                      {m.admin.apply}
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        if (!confirm(m.admin.confirmDeleteGroup(g))) return;
                        setCategoryDraft((prev) => prev.map((c) => ((c.group ?? '').trim() === g ? { ...c, group: undefined } : c)));
                        setGroupRenameDrafts((prev) => {
                          const next = { ...prev };
                          delete next[g];
                          return next;
                        });
                      }}
                    >
                      {m.admin.delete}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-row">
            <label>{m.admin.categories}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {categoryDraft.map((c) => (
                <div key={c.id} className="modal" style={{ width: '100%', margin: 0 }}>
                  <div className="modal-body" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ minWidth: 160, fontWeight: 800 }}>{c.id}</div>
                      <input
                        value={c.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCategoryDraft((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: v } : x)));
                        }}
                        placeholder={m.admin.categoryNamePlaceholder}
                        aria-label={`${c.id} ${m.admin.categoryNamePlaceholder}`}
                        style={{ flex: '1 1 200px' }}
                      />
                      <input
                        value={c.group ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const normalized = v.trim();
                          setCategoryDraft((prev) => prev.map((x) => (x.id === c.id ? { ...x, group: normalized || undefined } : x)));
                        }}
                        placeholder={m.admin.groupOptionalPlaceholder}
                        aria-label={`${c.id} ${m.admin.group}`}
                        style={{ width: 160 }}
                      />
                      <input
                        value={c.order ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = raw.trim() ? Number(raw) : undefined;
                          setCategoryDraft((prev) => prev.map((x) => (x.id === c.id ? { ...x, order: Number.isFinite(n) ? n : undefined } : x)));
                        }}
                        placeholder={m.admin.orderPlaceholder}
                        inputMode="numeric"
                        aria-label={`${c.id} ${m.admin.orderPlaceholder}`}
                        style={{ width: 90 }}
                      />
                      <select
                        value={resolveCategoryIcon(c)}
                        onChange={(e) => {
                          const nextIcon = e.target.value;
                          setCategoryDraft((prev) => prev.map((x) => (x.id === c.id ? { ...x, icon: nextIcon } : x)));
                        }}
                        aria-label={`${c.id} ${m.admin.icon}`}
                        style={{ width: 150 }}
                      >
                        {CATEGORY_ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn"
                        onClick={() => {
                          if (c.items.length > 0) {
                            if (!confirm(m.admin.confirmDeleteCategoryWithLinks(c.name, c.items.length))) return;
                          }
                          setCategoryDraft((prev) => prev.filter((x) => x.id !== c.id));
                        }}
                      >
                        {m.admin.deleteCategory}
                      </button>
                    </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-sub)' }}>
                        {m.admin.linkCount(c.items.length)}
                      </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>{m.admin.newCategory}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={m.admin.categoryNamePlaceholder}
                aria-label={m.admin.newCategory}
                style={{ flex: '1 1 200px' }}
              />
              <input
                value={newCategoryGroup}
                onChange={(e) => setNewCategoryGroup(e.target.value)}
                placeholder={m.admin.groupOptionalPlaceholder}
                aria-label={m.admin.group}
                style={{ width: 160 }}
              />
              <input
                value={newCategoryOrder}
                onChange={(e) => setNewCategoryOrder(e.target.value)}
                placeholder={m.admin.orderPlaceholder}
                aria-label={m.admin.orderPlaceholder}

                style={{ width: 90 }}
              />
              <select value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} aria-label={m.admin.icon} style={{ width: 150 }}>
                {CATEGORY_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;

                  const idBase = slugifyId(name);
                  const exists = new Set(categoryDraft.map((c) => c.id));
                  const id = exists.has(idBase) ? `${idBase}-${Date.now().toString(36)}` : idBase;

                  const group = newCategoryGroup.trim() || undefined;
                  const order = newCategoryOrder.trim() ? Number(newCategoryOrder.trim()) : undefined;

                  const next: NavCategory = {
                    id,
                    name,
                    group,
                    icon: newCategoryIcon,
                    order: Number.isFinite(order) ? order : undefined,
                    items: [],
                  };

                  setCategoryDraft((prev) => [...prev, next]);
                  setNewCategoryName('');
                  setNewCategoryGroup('');
                  setNewCategoryOrder('');
                  setNewCategoryIcon('📌');
                }}
                disabled={!newCategoryName.trim()}
              >
                {m.admin.addCategory}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === 'export' ? (
        <Modal
          title={m.admin.exportTitle}
          onClose={() => setModal('none')}
          closeLabel={m.admin.close}
          actions={
            <>
              <button className="btn" onClick={() => copyToClipboard(exportJson)}>
                {m.admin.copy}
              </button>
              <button className="btn btn-primary" onClick={() => setModal('none')}>
                {m.admin.close}
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>{m.admin.exportHint}</label>
            <textarea value={exportJson} readOnly />
          </div>
        </Modal>
      ) : null}

      {modal === 'import' ? (
        <Modal
          title={m.admin.importTitle}
          onClose={() => setModal('none')}
          closeLabel={m.admin.close}
          actions={
            <>
              <button className="btn" onClick={() => setModal('none')}>
                {m.admin.cancel}
              </button>
              <button className="btn btn-primary" onClick={onImportApply} disabled={!importText.trim()}>
                {m.admin.apply}
              </button>
            </>
          }
        >
          <div className="form-row">
            <label>{m.admin.pasteJsonYaml}</label>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} />
          </div>
          {importError ? <div style={{ color: 'var(--primary)', fontSize: 12 }}>{importError}</div> : null}
        </Modal>
      ) : null}
    </div>
  );
}
