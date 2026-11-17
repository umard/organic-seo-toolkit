const { get } = require('./http');
const MODS = ['how', 'what', 'why', 'best', 'vs', 'for', 'near me', 'free', 'cheap', 'alternative', 'review', 'guide'];

async function suggest(q, hl = 'en') {
  const r = await get(`https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&q=${encodeURIComponent(q)}`);
  try { return JSON.parse(r.body)[1] || []; } catch { return []; }
}

async function ideas(seed, hl = 'en') {
  const queries = [seed, ...MODS.map((m) => ['how','what','why','best'].includes(m) ? `${m} ${seed}` : `${seed} ${m}`),
    ...'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => `${seed} ${c}`)];
  const out = new Map();
  for (let i = 0; i < queries.length; i += 6) {
    const res = await Promise.all(queries.slice(i, i + 6).map((q) => suggest(q, hl)));
    res.forEach((list, j) => list.forEach((k, pos) => { if (!out.has(k)) out.set(k, { keyword: k, source: queries[i + j], pos }); }));
  }
  const list = [...out.values()].map((o) => ({
    keyword: o.keyword,
    words: o.keyword.split(' ').length,
    type: /^(how|what|why|when|where|can|is|does|do|which)\b/.test(o.keyword) ? 'question' : /\b(best|vs|review|alternative|top)\b/.test(o.keyword) ? 'comparison' : /\b(buy|price|cheap|near me|free)\b/.test(o.keyword) ? 'commercial' : 'general',
  }));
  // long-tail (3+ words) first: usually easier to rank for
  return list.sort((a, b) => b.words - a.words || a.keyword.localeCompare(b.keyword));
}
module.exports = { ideas };
