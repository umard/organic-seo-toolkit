// Vercel serverless entry: POST /api/<name>
const handlers = require('../handlers');
module.exports = async (req, res) => {
  const name = new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '');
  const fn = handlers[name];
  if (req.method !== 'POST' || !fn) return res.status(404).json({ error: 'Not found' });
  try { res.status(200).json(await fn(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
