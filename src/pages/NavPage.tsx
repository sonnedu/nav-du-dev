import { useEffect, useMemo, useRef, useState } from 'react';

import { applyDefaultIconOnError, getLinkIconUrl } from '../lib/favicon';
import { useI18n } from '../lib/useI18n';
import { createNavFuseIndexes, indexNavLinks, searchNavByPriority } from '../lib/search';
import type { IndexedNavLink, NavCategory, NavConfig } from '../lib/navTypes';
import { useScrollProgress, scrollToTop } from '../lib/useScrollProgress';

import { getCategoryIcon } from '../lib/navIcons';

function IconSearch() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.2a8.2 8.2 0 0 1-10.2-10 9 9 0 1 0 10.2 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArrowUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5l-6 6M12 5l6 6M12 5v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHamburger() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPanelLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 5v14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function sectionId(categoryId: string): string {
  return `cat-${categoryId}`;
}


function useActiveCategoryObserver(categories: NavCategory[], onActive: (categoryId: string) => void): void {
  const onActiveRef = useRef(onActive);

  useEffect(() => {
    onActiveRef.current = onActive;
  }, [onActive]);

  useEffect(() => {
    const elements = categories
      .map((c) => document.getElementById(sectionId(c.id)))
      .filter((el): el is HTMLElement => !!el);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));

        const first = visible[0];
        const id = first?.target?.id;
        if (!id) return;

        const categoryId = id.replace(/^cat-/, '');
        if (categoryId) onActiveRef.current(categoryId);
      },
      {
        root: null,
        threshold: 0.2,
        rootMargin: '-10% 0px -70% 0px',
      },
    );

    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, [categories]);
}

export function NavPage(props: {
  config: NavConfig;
  sidebarTitle: string;
  sidebarAvatarSrc: string;
  bannerTitle: string;
  subtitle: string;
  timeZone: string;
  faviconProxyBase: string;
  resolvedTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const { config } = props;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(() => config.categories[0]?.id ?? '');

  const orderedCategories = useMemo(() => {
    const order = config.site.groupOrder ?? [];
    const groupIndex = new Map<string, number>();
    for (let i = 0; i < order.length; i += 1) groupIndex.set(order[i], i);

    const groupKeyOf = (c: NavCategory): string => (c.group?.trim() ? c.group.trim() : '');

    return [...config.categories].sort((a, b) => {
      const ga = groupKeyOf(a);
      const gb = groupKeyOf(b);

      if (ga !== gb) {
        if (!ga && gb) return -1;
        if (ga && !gb) return 1;

        const ia = ga ? groupIndex.get(ga) : undefined;
        const ib = gb ? groupIndex.get(gb) : undefined;

        const ha = ia !== undefined;
        const hb = ib !== undefined;
        if (ha && hb) return ia - ib;
        if (ha) return -1;
        if (hb) return 1;

        return ga.localeCompare(gb);
      }

      const oa = a.order ?? 0;
      const ob = b.order ?? 0;
      if (oa !== ob) return oa - ob;

      return a.name.localeCompare(b.name);
    });
  }, [config.categories, config.site.groupOrder]);

  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 860px)').matches;
  });

  useActiveCategoryObserver(orderedCategories, (categoryId) => {
    setActiveCategoryId(categoryId);
  });

  const effectiveActiveCategoryId = useMemo(() => {
    if (orderedCategories.length === 0) return activeCategoryId;
    const exists = orderedCategories.some((c) => c.id === activeCategoryId);
    return exists ? activeCategoryId : orderedCategories[0].id;
  }, [activeCategoryId, orderedCategories]);

  const sidebarGroups = useMemo(() => {
    const byGroup = new Map<string, NavCategory[]>();
    for (const c of orderedCategories) {
      const key = c.group?.trim() || '';
      const existing = byGroup.get(key);
      if (existing) existing.push(c);
      else byGroup.set(key, [c]);
    }

    const order = config.site.groupOrder ?? [];

    const entries = [...byGroup.entries()].map(([group, categories]) => ({ group, categories }));
    entries.sort((a, b) => {
      if (!a.group && b.group) return -1;
      if (a.group && !b.group) return 1;

      const ia = a.group ? order.indexOf(a.group) : -1;
      const ib = b.group ? order.indexOf(b.group) : -1;

      const inA = ia >= 0;
      const inB = ib >= 0;
      if (inA && inB) return ia - ib;
      if (inA) return -1;
      if (inB) return 1;

      return a.group.localeCompare(b.group);
    });

    return entries;
  }, [orderedCategories, config.site.groupOrder]);

  const [query, setQuery] = useState('');
  const indexedLinks = useMemo(() => indexNavLinks(config), [config]);
  const fuses = useMemo(() => createNavFuseIndexes(indexedLinks), [indexedLinks]);
  const searchResults = useMemo(() => searchNavByPriority(fuses, query), [fuses, query]);

  const groupedSearch = useMemo(() => {
    const q = query.trim();
    if (!q) return null;

    const byCategory = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        bestScore: number;
        bestPriority: 0 | 1 | 2;
        links: IndexedNavLink[];
      }
    >();

    for (const r of searchResults) {
      const id = r.link.categoryId;
      const existing = byCategory.get(id);
      if (!existing) {
        byCategory.set(id, {
          categoryId: id,
          categoryName: r.link.categoryName,
          bestScore: r.score,
          bestPriority: r.priority,
          links: [r.link],
        });
        continue;
      }

      existing.bestScore = Math.min(existing.bestScore, r.score);
      existing.bestPriority = Math.min(existing.bestPriority, r.priority) as 0 | 1 | 2;
      existing.links.push(r.link);
    }

    const resultByKey = new Map<string, { priority: 0 | 1 | 2; score: number }>();
    for (const r of searchResults) resultByKey.set(`${r.link.categoryId}:${r.link.id}`, { priority: r.priority, score: r.score });

    const groups = [...byCategory.values()];
    groups.sort((a, b) => a.bestPriority - b.bestPriority || a.bestScore - b.bestScore);

    for (const g of groups) {
      g.links.sort((la, lb) => {
        const ra = resultByKey.get(`${la.categoryId}:${la.id}`);
        const rb = resultByKey.get(`${lb.categoryId}:${lb.id}`);
        const pa = ra?.priority ?? 2;
        const pb = rb?.priority ?? 2;
        const sa = ra?.score ?? 1;
        const sb = rb?.score ?? 1;
        return pa - pb || sa - sb;
      });
    }

    return groups;
  }, [query, searchResults]);

  const progress = useScrollProgress();
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);

  const { m, isZh } = useI18n();

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 860px)');

    const onChange = () => setIsMobileLayout(mq.matches);
    onChange();

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dateText = useMemo(() => {
    if (isZh) {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: props.timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'long',
      })
        .format(now)
        .replace('星期', '  星期');
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: props.timeZone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
      .format(now)
      .replace(',', '  ');
  }, [isZh, now, props.timeZone]);

  const timeText = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: props.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
  }, [now, props.timeZone]);

  const sidebarToggleLabel = m.nav.toggleSidebar;
  const sidebarToggleText = sidebarHidden ? m.nav.showSidebar : m.nav.hideSidebar;
  const themeToggleText = m.nav.toggleTheme;
  const backToTopText = m.nav.backToTop;

  return (
    <div className={`app-shell app-shell--with-sidebar ${sidebarHidden ? 'app-shell--sidebar-hidden' : ''}`}>
      {sidebarOpen ? <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          {props.sidebarAvatarSrc ? (
            <img className="sidebar-avatar" src={props.sidebarAvatarSrc} alt="avatar" loading="lazy" />
          ) : null}

          <div className="sidebar-brand">
            <div className="sidebar-title">{props.sidebarTitle}</div>
            {props.subtitle ? <div className="sidebar-subtitle">{props.subtitle}</div> : null}
          </div>
        </div>

        <div className="sidebar-list">
          {sidebarGroups.map((g) => (
            <div key={g.group || 'default'} className="sidebar-group">
              {g.group ? <div className="sidebar-group-title">{g.group}</div> : null}
              {g.categories.map((c) => (
                <button
                  key={c.id}
                  className={`sidebar-item ${c.id === effectiveActiveCategoryId ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveCategoryId(c.id);
                    document.getElementById(sectionId(c.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setSidebarOpen(false);
                  }}
                  title={c.name}
                >
                  <span className="category-icon" aria-hidden="true">{getCategoryIcon(c)}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button
            className="sidebar-hide-btn"
            onClick={() => {
              setSidebarHidden((v) => !v);
              setSidebarOpen(false);
            }}
            aria-label={sidebarToggleLabel}
            title={sidebarToggleText}
          >
            <IconPanelLeft />
            <span>{sidebarToggleText}</span>
          </button>

          {(() => {
            const match = __APP_VERSION__.match(/\bv\d+\.\d+\.\d+\b/);
            const version = match?.[0] ?? __APP_VERSION__;
            const commit = __APP_COMMIT__ ? __APP_COMMIT__.slice(0, 7) : '';
            const title = `© ${new Date().getFullYear()} du.dev · ${version}${commit ? ` · ${commit}` : ''}`;

            return (
              <div className="sidebar-footer" title={title}>
                © {new Date().getFullYear()}{' '}
                <a href="https://du.dev" target="_blank" rel="noreferrer">
                  du.dev
                </a>
                {' · '}
                {version}
                {commit ? (
                  <span className="sidebar-footer-commit">{' · '}{commit}</span>
                ) : null}
              </div>
            );
          })()}
        </div>
      </aside>


      <main className="main">
        <header className="banner">
          <div className="banner-row">
            <div className="banner-left">
              <div className="mobile-topbar">
                <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label={m.nav.openMenu}
              >
                  <IconHamburger />
                </button>
                <div>
                  <div className="banner-title">👋 {props.bannerTitle}</div>
                </div>
              </div>

              {!isMobileLayout ? <h1 className="banner-title">👋 {props.bannerTitle}</h1> : null}

              <div className="search">
                <IconSearch />
                <input
                  className="search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={m.nav.searchPlaceholder}
                  inputMode="search"
                />
              </div>
            </div>

            <div className="banner-tools">
              <div className="banner-time" aria-label={m.nav.currentTime}>
                <div className="banner-time-main">{timeText}</div>
                <div className="banner-time-sub">{dateText}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="content">
          {groupedSearch ? (
            groupedSearch.map((g) => (
              <div key={g.categoryId} className="section-block">
                <div className="section-title">
                  <h2>{g.categoryName}</h2>
                </div>

                <div className="grid">
                  {g.links.map((link) => (
                    <a key={`${link.categoryId}:${link.id}`} className="card" href={link.url} target="_blank" rel="noreferrer">
                      <div className="card-icon">
                        <img
                          src={getLinkIconUrl(link, props.faviconProxyBase)}
                          alt=""
                          loading="lazy"
                          onError={(e) => applyDefaultIconOnError(e.currentTarget)}
                        />
                      </div>
                      <div className="card-body">
                        <p className="card-title">{link.name}</p>
                        <p className="card-desc">{link.desc ?? link.url}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))
          ) : (
            orderedCategories.map((category) => (
              <div key={category.id} id={sectionId(category.id)} className="section-block" style={{ scrollMarginTop: 12 }}>
                <div className="section-title">
                  <h2>
                    <span className="category-icon" aria-hidden="true">{getCategoryIcon(category)}</span>
                    {category.name}
                  </h2>
                </div>
                <div className="grid">
                  {category.items.map((link) => (
                    <a
                      key={`${category.id}:${link.id}`}
                      className="card"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="card-icon">
                        <img
                          src={getLinkIconUrl(link, props.faviconProxyBase)}
                          alt=""
                          loading="lazy"
                          onError={(e) => applyDefaultIconOnError(e.currentTarget)}
                        />
                      </div>
                      <div className="card-body">
                        <p className="card-title">{link.name}</p>
                        <p className="card-desc">{link.desc ?? link.url}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        <div className="fab">
          <button
            className={`fab-btn fab-btn-sidebar-toggle ${sidebarHidden ? 'is-active' : ''}`}
            onClick={() => {
              setSidebarHidden((v) => !v);
              setSidebarOpen(false);
            }}
            aria-label={sidebarToggleLabel}
            data-tooltip={sidebarToggleText}
          >
            <IconPanelLeft />
          </button>

          <button
            className="fab-btn fab-btn-theme-toggle"
            onClick={props.onToggleTheme}
            aria-label={themeToggleText}
            data-tooltip={themeToggleText}
          >
            {props.resolvedTheme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>

          <div className="fab-btn-wrap">
            <svg className="fab-progress" viewBox="0 0 48 48" aria-hidden="true">
              <circle
                cx="24"
                cy="24"
                r={ringRadius}
                fill="none"
                stroke="color-mix(in srgb, var(--border) 85%, transparent)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r={ringRadius}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 24 24)"
              />
            </svg>

            <button
              className="fab-btn"
              onClick={scrollToTop}
              aria-label={backToTopText}
              data-tooltip={backToTopText}
            >
              <IconArrowUp />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
