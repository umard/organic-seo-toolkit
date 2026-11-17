const { get, strip } = require('./http');
const { search, host } = require('./serp');

async function brief(apiKey, keyword, gl = 'us') {
  const data = await search(apiKey, keyword, { gl, num: 10 });
  const top = (data.organic || []).slice(0, 6);
  const pages = await Promise.all(top.map(async (o) => {
    const r = await get(o.link);
    const h = (tag) => (r.body.match(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi')) || []).map(strip).filter((t) => t.length > 3 && t.length < 120);
    return { url: o.link, host: host(o.link), title: o.title, words: strip(r.body).split(' ').length, h2: h('h2').slice(0, 14), h3: h('h3').slice(0, 10) };
  }));
  const counts = {};
  pages.forEach((p) => p.h2.forEach((t) => { const k = t.toLowerCase(); counts[k] = (counts[k] || 0) + 1; }));
  const words = pages.map((p) => p.words).filter((w) => w > 200).sort((a, b) => a - b);
  return {
    keyword,
    targetWords: words.length ? Math.round(words[Math.floor(words.length / 2)] * 1.1) : null,
    questions: (data.peopleAlsoAsk || []).map((q) => q.question),
    related: (data.relatedSearches || []).map((r) => r.query),
    commonHeadings: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t, n]) => ({ heading: t, pages: n })),
    competitors: pages,
  };
}
module.exports = { brief };
