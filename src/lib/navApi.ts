import type { NavConfig } from './navTypes';

type NavConfigWithMeta = {
  config: NavConfig;
  etag: string | null;
};

type PutNavConfigResult = {
  ok: boolean;
  status: number;
  etag: string | null;
  error: string | null;
};

export async function apiGetNavConfig(): Promise<NavConfig | null> {
  try {
    const resp = await fetch('/api/config', { method: 'GET', cache: 'no-store' });
    if (!resp.ok) return null;
    return (await resp.json()) as NavConfig;
  } catch {
    return null;
  }
}

export async function apiGetNavConfigWithMeta(): Promise<NavConfigWithMeta | null> {
  try {
    const resp = await fetch('/api/config', { method: 'GET', cache: 'no-store' });
    if (!resp.ok) return null;

    const config = (await resp.json()) as NavConfig;
    const etag = resp.headers.get('etag');
    return { config, etag };
  } catch {
    return null;
  }
}

export async function apiPutNavConfig(config: NavConfig): Promise<boolean> {
  const result = await apiPutNavConfigWithMeta(config, null);
  return result.ok;
}

export async function apiPutNavConfigWithMeta(config: NavConfig, ifMatchEtag: string | null): Promise<PutNavConfigResult> {
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (ifMatchEtag) headers['if-match'] = ifMatchEtag;

    const resp = await fetch('/api/config', {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(config),
    });

    const etag = resp.headers.get('etag');

    if (resp.ok) {
      return { ok: true, status: resp.status, etag, error: null };
    }

    if (resp.status === 409) {
      return { ok: false, status: resp.status, etag, error: 'conflict' };
    }

    return { ok: false, status: resp.status, etag, error: 'http_error' };
  } catch {
    return { ok: false, status: 0, etag: null, error: 'network_error' };
  }
}
