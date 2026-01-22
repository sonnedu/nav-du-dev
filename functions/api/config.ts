import { isJsonRequest, jsonResponse, sha256Hex, textResponse } from './_util';
import { requireAdmin } from './_session';

type Env = {
  NAV_CONFIG_KV?: KVNamespace;
  SESSION_SECRET?: string;
  ALLOW_DEV_DEFAULT_ADMIN?: string;
  DEV_SESSION_SECRET?: string;
};

const CONFIG_KEY = 'nav_config_v1';

type DevConfigStore = {
  json: string | null;
};

const devGlobal = globalThis as unknown as { __navDuDevConfigStore?: DevConfigStore };

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function isLocalhostRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function canUseDevStore(request: Request, env: Env): boolean {
  return isTruthyEnv(env.ALLOW_DEV_DEFAULT_ADMIN) && isLocalhostRequest(request);
}

function getDevStore(): DevConfigStore {
  if (!devGlobal.__navDuDevConfigStore) devGlobal.__navDuDevConfigStore = { json: null };
  return devGlobal.__navDuDevConfigStore;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isNavLink(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isString(value.id) || !isString(value.name) || !isString(value.url)) return false;
  if ('desc' in value && value.desc !== undefined && !isString(value.desc)) return false;
  if ('tags' in value && value.tags !== undefined && !isStringArray(value.tags)) return false;
  return true;
}

function isNavCategory(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isString(value.id) || !isString(value.name)) return false;
  if ('order' in value && value.order !== undefined && typeof value.order !== 'number') return false;
  if (!Array.isArray(value.items) || !value.items.every(isNavLink)) return false;
  return true;
}

function isNavConfig(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isRecord(value.site) || !isString(value.site.title)) return false;

  const s = value.site;
  if ('sidebarTitle' in s && s.sidebarTitle !== undefined && !isString(s.sidebarTitle)) return false;
  if ('bannerTitle' in s && s.bannerTitle !== undefined && !isString(s.bannerTitle)) return false;
  if ('description' in s && s.description !== undefined && !isString(s.description)) return false;
  if ('defaultTheme' in s && s.defaultTheme !== undefined && !isString(s.defaultTheme)) return false;
  if ('timeZone' in s && s.timeZone !== undefined && !isString(s.timeZone)) return false;
  if ('sidebarAvatarSrc' in s && s.sidebarAvatarSrc !== undefined && !isString(s.sidebarAvatarSrc)) return false;
  if ('deployedDomain' in s && s.deployedDomain !== undefined && !isString(s.deployedDomain)) return false;
  if ('faviconProxyBase' in s && s.faviconProxyBase !== undefined && !isString(s.faviconProxyBase)) return false;
  if ('adminPath' in s && s.adminPath !== undefined && !isString(s.adminPath)) return false;

  if (!Array.isArray(value.categories) || !value.categories.every(isNavCategory)) return false;
  return true;
}

function parseIfMatchEtag(request: Request): string | null {
  const raw = request.headers.get('if-match');
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

async function computeWeakEtagFromJson(json: string): Promise<string> {
  const hash = await sha256Hex(json);
  return `W/"${hash}"`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const kv = context.env.NAV_CONFIG_KV;

  if (!kv && canUseDevStore(context.request, context.env)) {
    const raw = getDevStore().json;
    if (!raw) return jsonResponse({ error: 'not found' }, 404);

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isNavConfig(parsed)) return jsonResponse({ error: 'invalid stored config' }, 500);
      const etag = await computeWeakEtagFromJson(raw);
      return jsonResponse(parsed, 200, { etag, 'cache-control': 'no-store, max-age=0' });
    } catch {
      return jsonResponse({ error: 'invalid stored config' }, 500);
    }
  }

  if (!kv) return jsonResponse({ error: 'NAV_CONFIG_KV not configured' }, 404);

  const raw = await kv.get(CONFIG_KEY);
  if (!raw) return jsonResponse({ error: 'not found' }, 404);

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isNavConfig(parsed)) return jsonResponse({ error: 'invalid stored config' }, 500);
    const etag = await computeWeakEtagFromJson(raw);
    return jsonResponse(parsed, 200, { etag, 'cache-control': 'no-store, max-age=0' });
  } catch {
    return jsonResponse({ error: 'invalid stored config' }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const auth = await requireAdmin(context.request, context.env as unknown as Record<string, unknown>);
  if (auth instanceof Response) return auth;

  const { request } = context;
  if (!isJsonRequest(request)) return textResponse('Expected application/json', 415);

  const body = (await request.json()) as unknown;
  if (!isNavConfig(body)) return jsonResponse({ error: 'invalid config' }, 400);

  const json = JSON.stringify(body);
  const desiredIfMatch = parseIfMatchEtag(request);

  const kv = context.env.NAV_CONFIG_KV;
  if (!kv && canUseDevStore(context.request, context.env)) {
    const store = getDevStore();
    const existing = store.json;

    if (desiredIfMatch) {
      if (!existing) return jsonResponse({ error: 'conflict', etag: null }, 409);
      const existingEtag = await computeWeakEtagFromJson(existing);
      if (existingEtag !== desiredIfMatch) return jsonResponse({ error: 'conflict', etag: existingEtag }, 409, { etag: existingEtag });
    }

    store.json = json;
    const etag = await computeWeakEtagFromJson(json);
    return jsonResponse({ ok: true, username: auth.username }, 200, { etag });
  }

  if (!kv) return jsonResponse({ error: 'NAV_CONFIG_KV not configured' }, 500);

  if (desiredIfMatch) {
    const existing = await kv.get(CONFIG_KEY);
    if (!existing) return jsonResponse({ error: 'conflict', etag: null }, 409);
    const existingEtag = await computeWeakEtagFromJson(existing);
    if (existingEtag !== desiredIfMatch) return jsonResponse({ error: 'conflict', etag: existingEtag }, 409, { etag: existingEtag });
  }

  await kv.put(CONFIG_KEY, json);
  const etag = await computeWeakEtagFromJson(json);
  return jsonResponse({ ok: true, username: auth.username }, 200, { etag });
};
