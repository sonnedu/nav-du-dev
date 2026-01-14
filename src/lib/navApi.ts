import type { NavConfig } from './navTypes';

export async function apiGetNavConfig(): Promise<NavConfig | null> {
  try {
    const resp = await fetch('/api/config', { method: 'GET' });
    if (!resp.ok) return null;
    return (await resp.json()) as NavConfig;
  } catch {
    return null;
  }
}

export async function apiPutNavConfig(config: NavConfig): Promise<boolean> {
  try {
    const resp = await fetch('/api/config', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
