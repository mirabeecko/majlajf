// MAJLAJF — audit dostupnosti + hosting (Vercel/VPS/Cloudflare) + e-maily (MX)
// Volá se z propojeni-systemu.html (same-origin, žádná tajemství).
// GET /api/audit?urls=<url1>,<url2>,...   → HTTP probe s hlavičkami (server-side fetch = plný přístup)
// MX lookupy dělá klient přímo přes dns.google (CORS povolen) — endpoint zůstává rychlý.
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const u = new URL(req.url, 'http://localhost');
  const urlsParam = u.searchParams.get('urls') || '';
  const urls = urlsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
  if (!urls.length) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'missing urls' }));
    return;
  }

  const probe = async (url) => {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const resp = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'majlajf-audit/1.0' },
      });
      clearTimeout(timer);
      const h = {};
      resp.headers.forEach((v, k) => { h[k] = v; });
      return { url, status: resp.status, finalUrl: resp.url || url, ms: Date.now() - t0, headers: h };
    } catch (e) {
      return { url, error: e.name === 'AbortError' ? 'timeout' : 'unreachable', ms: Date.now() - t0 };
    }
  };

  const results = await Promise.all(urls.map(probe));

  const classifyHosting = (p) => {
    if (p.error) return '—';
    const h = p.headers || {};
    const server = (h['server'] || '').toLowerCase();
    const via = (h['via'] || '').toLowerCase();
    if (h['cf-ray'] || server.includes('cloudflare')) return 'Cloudflare';
    if (h['x-vercel-id'] || server.includes('vercel') || via.includes('vercel')) return 'Vercel';
    if (server.includes('nginx')) return 'VPS · nginx';
    if (server.includes('openresty')) return 'VPS · openresty';
    if (server.includes('apache')) return 'VPS · apache';
    if (server.includes('caddy')) return 'VPS · caddy';
    if (server.includes('github')) return 'GitHub Pages';
    if (server.includes('netlify')) return 'Netlify';
    if (server) return server.slice(0, 24);
    return 'VPS/other';
  };

  const out = results.map(p => ({
    url: p.url,
    status: p.status ?? null,
    error: p.error ?? null,
    ms: p.ms,
    hosting: classifyHosting(p),
    server: (p.headers && p.headers['server']) || null,
    xvercel: (p.headers && p.headers['x-vercel-id']) ? true : false,
    cfray: (p.headers && p.headers['cf-ray']) ? true : false,
  }));

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, ts: new Date().toISOString(), probes: out }));
};
