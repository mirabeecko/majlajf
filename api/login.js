/**
 * POST /api/login — ověří heslo a nastaví podepsanou cookie na 90 dní.
 * Heslo a tajemství jdou z ENV Vercelu (PANEL_AUTH_PASSWORD / PANEL_AUTH_SECRET),
 * nikdy nejsou v kódu ani v prohlížeči.
 */
const crypto = require('crypto');

const COOKIE = 'mf_panel';
const DAYS = 90;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Použij POST.' });
    return;
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  const params = new URLSearchParams(raw);
  const password = params.get('password') || '';
  let next = params.get('next') || '/';
  if (!next.startsWith('/') || next.startsWith('//')) next = '/';

  const expected = process.env.PANEL_AUTH_PASSWORD || '';
  const secret = process.env.PANEL_AUTH_SECRET || '';
  if (!expected || !secret) {
    res.status(503).send('Přihlášení není nastavené (chybí ENV PANEL_AUTH_PASSWORD / PANEL_AUTH_SECRET).');
    return;
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // zpomalení hádání
    res.writeHead(303, { Location: '/login?e=1' + (next !== '/' ? '&next=' + encodeURIComponent(next) : '') });
    res.end();
    return;
  }

  const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;
  const sig = crypto.createHmac('sha256', secret).update(String(exp)).digest('hex');
  res.writeHead(303, {
    'Set-Cookie': `${COOKIE}=${exp}.${sig}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
    Location: next,
    'Cache-Control': 'no-store',
  });
  res.end();
};
