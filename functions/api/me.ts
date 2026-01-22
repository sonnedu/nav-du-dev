import { jsonResponse } from './_util';
import { requireAdmin } from './_session';

type Env = {
  SESSION_SECRET?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAdmin(context.request, context.env as unknown as Record<string, unknown>);
  if (auth instanceof Response) {
    // Treat unauthenticated as a normal "not logged in" state.
    // This avoids surfacing expected 401s through global error interceptors.
    if (auth.status === 401) return jsonResponse({ username: null });
    return auth;
  }
  return jsonResponse({ username: auth.username });
};
