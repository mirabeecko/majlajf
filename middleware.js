/**
 * Přihlášení pro celý majlajf (Edge Middleware).
 *
 * Proč: majlajf.vercel.app je rozcestník k interním věcem (Mission Control,
 * DataHub se snapshotem e-mailů a kalendáře, Paperclip, PPC generator…).
 * Nemá být veřejný. Po přihlášení se heslo neptá 90 dní (cookie), takže to neotravuje.
 *
 * Cookie `mf_panel` = "<expirace>.<HMAC(secret, expirace)>" — jen podpis, žádné heslo.
 * Heslo a tajemství jsou v ENV Vercelu: PANEL_AUTH_PASSWORD, PANEL_AUTH_SECRET.
 */

const COOKIE = 'mf_panel';

export const config = {
  // vše kromě přihlášení a pár drobností
  matcher: ['/((?!login|login\\.html|api/login|favicon\\.ico|robots\\.txt).*)'],
};

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

async function valid(secret, token) {
  if (!secret || !token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) * 1000 < Date.now()) return false;
  const expected = await sign(secret, exp);
  // konstantní čas (délky jsou stejné, jde o hex)
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export default async function middleware(request) {
  const secret = process.env.PANEL_AUTH_SECRET || '';
  const url = new URL(request.url);

  if (!secret) {
    // bez tajemství radši nikoho nepouštět (fail-closed), ale ať je vidět proč
    return new Response('Chybí PANEL_AUTH_SECRET — přihlášení není nastavené.', { status: 503 });
  }

  // /logout = smazat cookie (jinak se přihlášení drží 90 dní)
  if (url.pathname === '/logout') {
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/login',
        'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  const token = readCookie(request.headers.get('cookie'), COOKIE);
  if (await valid(secret, token)) return; // pokračuj na stránku

  const next = url.pathname + url.search;
  const login = new URL('/login', url.origin);
  if (next && next !== '/') login.searchParams.set('next', next);
  return Response.redirect(login.toString(), 302);
}
