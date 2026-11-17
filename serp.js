// SERP provider: Serper.dev (https://serper.dev, free credits on signup).
async function search(apiKey, q, { gl = 'us', hl = 'en', num = 100 } = {}) {
  if (!apiKey) throw new Error('No SERP API key set. Add one in Settings.');
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST', headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, gl, hl, num }),
  });
  if (!res.ok) throw new Error(`SERP API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
function findRank(data, domain) {
  const d = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const hit = (data.organic || []).find((o) => host(o.link) === d || host(o.link).endsWith('.' + d));
  return hit ? { position: hit.position, url: hit.link, title: hit.title } : { position: null };
}
module.exports = { search, findRank, host };
