/* skms-backend client. Every admin call carries the session token; a 401 means it expired, and onExpired (set by
   App) brings the login back over the dashboard without throwing away unsaved edits. */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const SITE_URL = (import.meta.env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const SESSION_KEY = 'skm_admin_session';

export const session = {
  get() { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); return s?.exp > Date.now() ? s : null; } catch { return null; } },
  set(s) { try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {} },
};
export const events = { onExpired: () => {} };

/* { ok, status, data }; a network failure (the Render service asleep or down) comes back as status 0 */
export async function api(path, { method = 'GET', body, timeout = 70_000 } = {}) {
  const token = session.get()?.token;
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) events.onExpired();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Could not reach the server — it may be waking up. Try again in a minute.' } };
  }
}

/* built-in images are paths on the public site ("img/hero.jpg"); uploads are data: URLs */
export const siteUrl = u => !u ? '' : /^(data:image\/|https?:)/i.test(u) ? u : `${SITE_URL}/${String(u).replace(/^\/+/, '')}`;

export const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
