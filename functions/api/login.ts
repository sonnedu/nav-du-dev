import {
  buildCookie,
  buildSetCookie,
  constantTimeEqual,
  isJsonRequest,
  isSecureRequest,
  jsonResponse,
  sha256Hex,
  textResponse,
} from './_util';
import { createSessionToken, sessionCookieName } from './_session';

type Env = {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_SHA256?: string;
  SESSION_SECRET?: string;
  SESSION_TTL_SECONDS?: string;
};

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

function getTtlSeconds(env: Env): number {
  const raw = env.SESSION_TTL_SECONDS;
  if (!raw) return 60 * 60 * 24;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 60 * 60 * 24;
  return Math.floor(n);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!isJsonRequest(request)) return textResponse('Expected application/json', 415);

  const adminUser = env.ADMIN_USERNAME;
  const adminHash = env.ADMIN_PASSWORD_SHA256;
  const secret = env.SESSION_SECRET;

  if (!adminUser || !adminHash || !secret) {
    return jsonResponse({ error: 'admin not configured' }, 500);
  }

  const data = (await request.json()) as LoginBody;
  const username = typeof data.username === 'string' ? data.username : '';
  const password = typeof data.password === 'string' ? data.password : '';

  const userBytes = new TextEncoder().encode(username);
  const adminBytes = new TextEncoder().encode(adminUser);
  if (!constantTimeEqual(userBytes, adminBytes)) {
    return jsonResponse({ error: 'invalid credentials' }, 401);
  }

  const computed = await sha256Hex(password);
  const computedBytes = new TextEncoder().encode(computed);
  const expectedBytes = new TextEncoder().encode(adminHash.toLowerCase());

  if (!constantTimeEqual(computedBytes, expectedBytes)) {
    return jsonResponse({ error: 'invalid credentials' }, 401);
  }

  const ttl = getTtlSeconds(env);
  const exp = Date.now() + ttl * 1000;

  const token = await createSessionToken(secret, { u: username, exp });
  const cookie = buildCookie(sessionCookieName, token, ttl, isSecureRequest(request));

  return jsonResponse({ ok: true, username }, 200, buildSetCookie(cookie));
};
