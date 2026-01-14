import { jsonResponse } from './_util';
import { requireAdmin } from './_session';

type Env = {
  SESSION_SECRET?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAdmin(context.request, context.env as unknown as Record<string, unknown>);
  if (auth instanceof Response) return auth;
  return jsonResponse({ username: auth.username });
};
