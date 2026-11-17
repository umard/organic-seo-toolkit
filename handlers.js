const { audit } = require('./audit');
const { ideas } = require('./keywords');
const { search, findRank } = require('./serp');
const { brief } = require('./brief');

const need = (v, n) => { if (!v || !String(v).trim()) throw new Error(n + ' is required'); return String(v).trim(); };

module.exports = {
  audit: (b) => audit(need(b.domain, 'Domain'), Math.min(+b.pages || 12, 40)),
  ideas: async (b) => ({ ideas: await ideas(need(b.seed, 'Seed keyword'), b.lang || 'en') }),
  brief: (b) => brief(need(b.apiKey, 'SERP API key'), need(b.keyword, 'Keyword'), b.country || 'us'),
  rank: async (b) => {
    const data = await search(need(b.apiKey, 'SERP API key'), need(b.keyword, 'Keyword'), { gl: b.country || 'us' });
    return findRank(data, need(b.domain, 'Domain'));
  },
};
