const { get, strip } = require('./http');

const attr = (tag, name) => { const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', 'i')); return m ? m[1] : ''; };

function parsePage(html, pageUrl, origin) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const metas = html.match(/<meta[^>]*>/gi) || [];
  const meta = (n) => { const t = metas.find((m) => attr(m, 'name').toLowerCase() === n); return t ? attr(t, 'content') : ''; };
  const description = meta('description');
  const robots = meta('robots').toLowerCase();
  const canonicalTag = (html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i) || [''])[0];
  const h1s = (html.match(/<h1[\s\S]*?<\/h1>/gi) || []).map(strip);
  const imgs = html.match(/<img[^>]*>/gi) || [];
  const noAlt = imgs.filter((i) => !/\balt\s*=\s*["'][^"']+["']/i.test(i)).length;
  const links = [];
  for (const a of html.match(/<a\s[^>]*href=["'][^"']+["'][^>]*>/gi) || []) {
    try {
      const u = new URL(attr(a, 'href'), pageUrl); u.hash = '';
      if (u.origin === origin && /^https?:$/.test(u.protocol) && !/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js|ico|xml)$/i.test(u.pathname)) links.push(u.href);
    } catch {}
  }
  return {
    title, description, h1s, noindex: /noindex/.test(robots),
    canonical: canonicalTag ? attr(canonicalTag, 'href') : '',
    viewport: metas.some((m) => attr(m, 'name').toLowerCase() === 'viewport'),
    lang: /<html[^>]*\blang=/i.test(html),
    og: metas.some((m) => /^og:/i.test(attr(m, 'property'))),
    schema: /application\/ld\+json/i.test(html),
    images: imgs.length, imagesNoAlt: noAlt,
    words: strip(html).split(' ').filter(Boolean).length,
    links: [...new Set(links)],
  };
}

function issuesFor(p, r) {
  const out = [];
  const add = (sev, msg) => out.push({ sev, msg });
  if (r.status >= 400 || r.status === 0) add('high', `Page returns ${r.status || r.error}`);
  if (r.status >= 400 || r.status === 0) return out;
  if (!p.title) add('high', 'Missing <title>');
  else if (p.title.length < 25) add('med', `Title too short (${p.title.length} chars)`);
  else if (p.title.length > 62) add('low', `Title may be truncated in results (${p.title.length} chars)`);
  if (!p.description) add('high', 'Missing meta description');
  else if (p.description.length < 70) add('low', `Meta description short (${p.description.length})`);
  else if (p.description.length > 165) add('low', `Meta description long (${p.description.length})`);
  if (p.h1s.length === 0) add('high', 'No <h1> heading');
  if (p.h1s.length > 1) add('low', `${p.h1s.length} <h1> headings`);
  if (p.noindex) add('high', 'Page is set to noindex');
  if (!p.canonical) add('low', 'No canonical tag');
  if (!p.viewport) add('med', 'No mobile viewport meta tag');
  if (!p.lang) add('low', 'No lang attribute on <html>');
  if (p.imagesNoAlt) add('med', `${p.imagesNoAlt} of ${p.images} images missing alt text`);
  if (p.words < 250) add('med', `Thin content (${p.words} words)`);
  if (!p.schema) add('low', 'No structured data (JSON-LD)');
  if (!p.og) add('low', 'No Open Graph tags');
  if (r.ms > 2500) add('med', `Slow response (${r.ms} ms)`);
  return out;
}

async function audit(input, maxPages = 25) {
  const start = new URL(/^https?:/i.test(input) ? input : 'https://' + input);
  const origin = start.origin;
  const queue = [start.href], seen = new Set(queue), pages = [];
  const site = [];
  const robots = await get(origin + '/robots.txt');
  if (!robots.ok) site.push({ sev: 'med', msg: 'robots.txt not found' });
  else if (/^\s*disallow:\s*\/\s*$/im.test(robots.body)) site.push({ sev: 'high', msg: 'robots.txt blocks the whole site' });
  const sm = await get(origin + '/sitemap.xml');
  if (!sm.ok || !/<urlset|<sitemapindex/i.test(sm.body)) site.push({ sev: 'med', msg: 'sitemap.xml not found (submit one in Search Console)' });
  if (start.protocol !== 'https:') site.push({ sev: 'high', msg: 'Site is not served over HTTPS' });

  while (queue.length && pages.length < maxPages) {
    const batch = queue.splice(0, 4);
    const results = await Promise.all(batch.map((u) => get(u)));
    results.forEach((r, i) => {
      const url = batch[i];
      const p = r.ok && /<html|<head|<body/i.test(r.body) ? parsePage(r.body, r.url, origin) : null;
      pages.push({ url, status: r.status, ms: r.ms, title: p?.title || '', words: p?.words || 0, issues: p ? issuesFor(p, r) : (r.ok ? [] : issuesFor({}, r)) });
      if (p) for (const l of p.links) if (!seen.has(l) && seen.size < maxPages * 3) { seen.add(l); queue.push(l); }
    });
  }
  // duplicate titles
  const byTitle = {};
  pages.forEach((p) => p.title && (byTitle[p.title] ||= []).push(p));
  Object.values(byTitle).filter((g) => g.length > 1).forEach((g) => g.forEach((p) => p.issues.push({ sev: 'med', msg: 'Duplicate title used on ' + g.length + ' pages' })));

  const all = [...site, ...pages.flatMap((p) => p.issues)];
  const count = (s) => all.filter((i) => i.sev === s).length;
  const score = Math.max(0, Math.round(100 - count('high') * 4 - count('med') * 1.5 - count('low') * 0.4));
  return { origin, score, high: count('high'), med: count('med'), low: count('low'), site, pages };
}
module.exports = { audit };
