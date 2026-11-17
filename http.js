const UA = 'Mozilla/5.0 (compatible; OrganicSEOToolkit/1.0)';
const PRIVATE = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1)/i;
async function get(url, timeout = 12000) {
  if (process.env.VERCEL) { try { if (PRIVATE.test(new URL(url).hostname)) return { ok: false, status: 0, url, body: '', ms: 0, error: 'blocked' }; } catch {} }
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: ctl.signal });
    const ct = res.headers.get('content-type') || '';
    const body = /text|xml|json/.test(ct) || !ct ? await res.text() : '';
    return { ok: res.ok, status: res.status, url: res.url, body, ms: Date.now() - t0, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, url, body: '', ms: Date.now() - t0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally { clearTimeout(timer); }
}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
module.exports = { get, strip };
