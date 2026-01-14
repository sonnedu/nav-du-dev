import { buildSetCookie, clearCookie, isSecureRequest, jsonResponse } from './_util';
import { sessionCookieName } from './_session';

type Env = Record<string, never>;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return jsonResponse({ ok: true }, 200, buildSetCookie(clearCookie(sessionCookieName, isSecureRequest(context.request))));
};
