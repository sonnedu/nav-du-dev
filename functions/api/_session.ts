import { hmacSignBase64Url, hmacVerifyBase64Url, jsonResponse, parseCookie } from './_util';

const COOKIE_NAME = 'nav_admin';

type SessionPayload = {
  u: string;
  exp: number;
};

function base64UrlEncodeJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  const bin = String.fromCharCode(...bytes);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeJson<T>(input: string): T | null {
  try {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function createSessionToken(secret: string, payload: SessionPayload): Promise<string> {
  const body = base64UrlEncodeJson(payload);
  const sig = await hmacSignBase64Url(secret, body);
  return `${body}.${sig}`;
}

export async function verifySessionToken(secret: string, token: string): Promise<SessionPayload | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const ok = await hmacVerifyBase64Url(secret, body, sig);
  if (!ok) return null;

  const payload = base64UrlDecodeJson<SessionPayload>(body);
  if (!payload || typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null;
  if (Date.now() > payload.exp) return null;

  return payload;
}

export async function requireAdmin(request: Request, env: Record<string, unknown>): Promise<{ username: string } | Response> {
  const secret = env.SESSION_SECRET;
  if (typeof secret !== 'string' || !secret) {
    return jsonResponse({ error: 'SESSION_SECRET not configured' }, 500);
  }

  const cookie = parseCookie(request.headers.get('cookie'), COOKIE_NAME);
  if (!cookie) return jsonResponse({ error: 'unauthorized' }, 401);

  const payload = await verifySessionToken(secret, cookie);
  if (!payload) return jsonResponse({ error: 'unauthorized' }, 401);

  return { username: payload.u };
}

export const sessionCookieName = COOKIE_NAME;
