import { isJsonRequest, jsonResponse, textResponse } from './_util';
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
  if (!Array.isArray(value.categories) || !value.categories.every(isNavCategory)) return false;
  return true;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const kv = context.env.NAV_CONFIG_KV;

  if (!kv && canUseDevStore(context.request, context.env)) {
    const raw = getDevStore().json;
    if (!raw) return jsonResponse({ error: 'not found' }, 404);

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isNavConfig(parsed)) return jsonResponse({ error: 'invalid stored config' }, 500);
      return jsonResponse(parsed);
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
    return jsonResponse(parsed);
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

  const kv = context.env.NAV_CONFIG_KV;
  if (!kv && canUseDevStore(context.request, context.env)) {
    getDevStore().json = json;
    return jsonResponse({ ok: true, username: auth.username });
  }

  if (!kv) return jsonResponse({ error: 'NAV_CONFIG_KV not configured' }, 500);

  await kv.put(CONFIG_KEY, json);
  return jsonResponse({ ok: true, username: auth.username });
};
