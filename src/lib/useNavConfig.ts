import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import navYaml from '../data/nav.yaml?raw';

import { parseNavConfigFromYaml, sortCategories } from './navLoad';
import type { NavConfig } from './navTypes';
import { isNavConfig } from './navValidate';
import { apiGetNavConfigWithMeta, apiPutNavConfigWithMeta } from './navApi';

type CachedNavConfig = {
  json: string;
  etag: string | null;
  mutatedAtMs: number | null;
};

const NAV_CONFIG_CACHE_KEY = 'navDu_config_cache_v1';

function isCachedNavConfig(value: unknown): value is CachedNavConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.json !== 'string') return false;
  if (r.etag !== null && r.etag !== undefined && typeof r.etag !== 'string') return false;
  if (r.mutatedAtMs !== null && r.mutatedAtMs !== undefined && typeof r.mutatedAtMs !== 'number') return false;
  return true;
}

function readCachedNavConfig(): { config: NavConfig; etag: string | null; mutatedAtMs: number | null } | null {
  try {
    const raw = localStorage.getItem(NAV_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isCachedNavConfig(parsed)) return null;

    const configUnknown = JSON.parse(parsed.json) as unknown;
    if (!isNavConfig(configUnknown)) return null;

    return {
      config: sortCategories(configUnknown),
      etag: parsed.etag ?? null,
      mutatedAtMs: parsed.mutatedAtMs ?? null,
    };
  } catch {
    return null;
  }
}

function writeCachedNavConfig(next: { config: NavConfig; etag: string | null; mutatedAtMs: number | null }): void {
  try {
    const payload: CachedNavConfig = {
      json: JSON.stringify(next.config),
      etag: next.etag,
      mutatedAtMs: next.mutatedAtMs,
    };
    localStorage.setItem(NAV_CONFIG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function loadBaseConfig(): NavConfig {
  return sortCategories(parseNavConfigFromYaml(navYaml));
}

type SaveConfigResult = { ok: true } | { ok: false; reason: 'conflict' | 'other' };

export function useNavConfig(): {
  baseConfig: NavConfig;
  config: NavConfig;
  isRemoteLoaded: boolean;
  saveConfigRemote: (next: NavConfig) => Promise<SaveConfigResult>;
  resetRemoteToBase: () => Promise<boolean>;
  reloadRemote: () => Promise<void>;
} {
  const baseConfig = useMemo(() => loadBaseConfig(), []);
  const cached = useMemo(() => readCachedNavConfig(), []);

  const [config, setConfig] = useState<NavConfig>(() => cached?.config ?? baseConfig);
  const [remoteEtag, setRemoteEtag] = useState<string | null>(() => cached?.etag ?? null);
  const [mutatedAtMs, setMutatedAtMs] = useState<number | null>(() => cached?.mutatedAtMs ?? null);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);

  const reloadRemoteRef = useRef<(() => void) | null>(null);

  const applyRemoteConfig = useCallback(
    (remote: { config: NavConfig; etag: string | null }) => {
      const sorted = sortCategories(remote.config);
      setConfig(sorted);
      setRemoteEtag(remote.etag);

      writeCachedNavConfig({ config: sorted, etag: remote.etag, mutatedAtMs });
    },
    [mutatedAtMs],
  );

  const shouldIgnoreRemoteBecauseLikelyStale = useCallback(
    (nextEtag: string | null): boolean => {
      if (!mutatedAtMs) return false;
      if (!remoteEtag || !nextEtag) return false;
      if (remoteEtag === nextEtag) return false;

      const ageMs = Date.now() - mutatedAtMs;
      return ageMs >= 0 && ageMs < 60_000;
    },
    [mutatedAtMs, remoteEtag],
  );

  const reloadRemote = useCallback(async () => {
    const remote = await apiGetNavConfigWithMeta();
    if (remote && isNavConfig(remote.config)) {
      if (shouldIgnoreRemoteBecauseLikelyStale(remote.etag)) {
        setIsRemoteLoaded(true);
        setTimeout(() => reloadRemoteRef.current?.(), 2000);
        return;
      }

      applyRemoteConfig({ config: remote.config, etag: remote.etag });
    }
    setIsRemoteLoaded(true);
  }, [applyRemoteConfig, shouldIgnoreRemoteBecauseLikelyStale]);

  useEffect(() => {
    reloadRemoteRef.current = () => {
      void reloadRemote();
    };

    let cancelled = false;

    apiGetNavConfigWithMeta()
      .then((remote) => {
        if (cancelled) return;
        if (remote && isNavConfig(remote.config)) {
          if (shouldIgnoreRemoteBecauseLikelyStale(remote.etag)) {
            setTimeout(() => reloadRemoteRef.current?.(), 2000);
            return;
          }

          applyRemoteConfig({ config: remote.config, etag: remote.etag });
        }
      })
      .finally(() => {
        if (!cancelled) setIsRemoteLoaded(true);
      });

    const onStorage = (e: StorageEvent) => {
      if (e.key !== NAV_CONFIG_CACHE_KEY) return;
      if (!e.newValue) return;

      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (!isCachedNavConfig(parsed)) return;

        const configUnknown = JSON.parse(parsed.json) as unknown;
        if (!isNavConfig(configUnknown)) return;

        setConfig(sortCategories(configUnknown));
        setRemoteEtag(parsed.etag ?? null);
        setMutatedAtMs(parsed.mutatedAtMs ?? null);
      } catch {
        return;
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [applyRemoteConfig, reloadRemote, shouldIgnoreRemoteBecauseLikelyStale]);

  const saveConfigRemote = async (next: NavConfig): Promise<SaveConfigResult> => {
    const sorted = sortCategories(next);
    const result = await apiPutNavConfigWithMeta(sorted, remoteEtag);

    if (result.ok) {
      const nextEtag = result.etag ?? remoteEtag;
      const nextMutatedAtMs = Date.now();

      setConfig(sorted);
      setRemoteEtag(nextEtag ?? null);
      setMutatedAtMs(nextMutatedAtMs);

      writeCachedNavConfig({ config: sorted, etag: nextEtag ?? null, mutatedAtMs: nextMutatedAtMs });

      return { ok: true };
    }

    if (result.error === 'conflict') return { ok: false, reason: 'conflict' };

    return { ok: false, reason: 'other' };
  };

  const resetRemoteToBase = async () => {
    const result = await saveConfigRemote(baseConfig);
    return result.ok;
  };

  return { baseConfig, config, isRemoteLoaded, saveConfigRemote, resetRemoteToBase, reloadRemote };
}
