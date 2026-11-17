// Local server: node server.js  ->  http://localhost:3000
const http = require('http'), fs = require('fs'), path = require('path');
const handlers = require('./handlers');
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
  const fn = req.method === 'POST' && handlers[url.pathname.replace(/^\/api\//, '')];
  if (fn) {
    let raw = ''; for await (const c of req) raw += c;
    try { send(200, await fn(raw ? JSON.parse(raw) : {})); } catch (e) { send(400, { error: e.message }); }
  } else if (req.method === 'GET') {
    const f = path.join(__dirname, 'index.html');
    fs.readFile(f, (err, d) => err ? send(404, 'Not found', 'text/plain') : send(200, d, 'text/html'));
  } else send(404, { error: 'Not found' });
}).listen(PORT, '127.0.0.1', () => console.log(`Organic SEO Toolkit running at http://localhost:${PORT}`));
