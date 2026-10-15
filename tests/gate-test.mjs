// Test brány majlajf (middleware + /api/login) bez nasazení.
// Spouštět:  node /tmp/gate-test/test.mjs
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';

const SECRET = process.env.TEST_SECRET;
const PASSWORD = 'test-heslo-123';
process.env.PANEL_AUTH_SECRET = SECRET;
process.env.PANEL_AUTH_PASSWORD = PASSWORD;

mkdirSync('/tmp/gate-test', { recursive: true });
copyFileSync('/Users/mb/dev/web/majlajf/middleware.js', '/tmp/gate-test/middleware.mjs');
const mw = (await import('/tmp/gate-test/middleware.mjs')).default;

const require = createRequire(import.meta.url);
const login = require('/Users/mb/dev/web/majlajf/api/login.js');

const BASE = 'https://majlajf.vercel.app';
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? '  (' + detail + ')' : ''}`);
  ok ? pass++ : fail++;
};

// ── 1) middleware: bez cookie → přesměrování na /login?next=…
{
  const res = await mw(new Request(BASE + '/ppc-generator/'));
  const loc = res && res.headers.get('location');
  check('bez cookie → 302 na /login s next',
    res && res.status === 302 && loc && loc.includes('/login') && loc.includes('next'),
    (res && res.status) + ' ' + loc);
}
// ── 2) middleware: platná cookie → pustí dál (undefined = next)
{
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', SECRET).update(String(exp)).digest('hex');
  const req = new Request(BASE + '/', { headers: { cookie: `mf_panel=${exp}.${sig}` } });
  const res = await mw(req);
  check('platná cookie → pustí dál', res === undefined, String(res && res.status));
}
// ── 3) middleware: podvržená cookie → přesměruje
{
  const req = new Request(BASE + '/', { headers: { cookie: 'mf_panel=9999999999.deadbeef' } });
  const res = await mw(req);
  check('podvržená cookie → 302 na /login', res && res.status === 302);
}
// ── 4) middleware: propadlá cookie → přesměruje
{
  const exp = Math.floor(Date.now() / 1000) - 10;
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', SECRET).update(String(exp)).digest('hex');
  const req = new Request(BASE + '/', { headers: { cookie: `mf_panel=${exp}.${sig}` } });
  const res = await mw(req);
  check('propadlá cookie → 302 na /login', res && res.status === 302);
}
// ── 5) /api/login: správné heslo → cookie
async function postLogin(password) {
  const body = `password=${encodeURIComponent(password)}&next=%2Fdatahub%2F`;
  const req = (async function* () { yield Buffer.from(body); })();
  req.method = 'POST';
  let status = null, headers = null, out = '';
  const res = {
    set statusCode(v) {}, get statusCode() { return status; },
    writeHead(code, h) { status = code; headers = h; },
    setHeader() {}, end(chunk) { if (chunk) out += chunk; },
    status(c) { status = c; return this; },
    send(c) { out += c; },
    json(o) { out += JSON.stringify(o); },
  };
  await login(req, res);
  return { status, headers, out };
}
{
  const r = await postLogin(PASSWORD);
  const cookie = r.headers && r.headers['Set-Cookie'];
  check('/api/login správné heslo → 303 + cookie',
    r.status === 303 && cookie && cookie.includes('mf_panel=') && cookie.includes('HttpOnly'),
    r.status + ' ' + String(cookie).slice(0, 40));
  globalThis.__cookie = cookie;
}
{
  const r = await postLogin('spatne');
  check('/api/login špatné heslo → 303 na /login?e=1 a BEZ cookie',
    r.status === 303 && !(r.headers && r.headers['Set-Cookie']),
    String(r.headers && r.headers.Location));
}
// ── 6) end-to-end: cookie z loginu projde middlewarem
{
  const token = globalThis.__cookie.split('mf_panel=')[1].split(';')[0];
  const res = await mw(new Request(BASE + '/', { headers: { cookie: `mf_panel=${token}` } }));
  check('cookie z /api/login pustí middleware dál', res === undefined);
}
console.log(`\n  ${pass} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
