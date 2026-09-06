/* ═══════════════════════════════════════════════════════════════════
   REGISTR WEBŮ V SYSTÉMU — jediné místo, kde se přidává web do
   monitoringu (propojeni-systemu.html). Nový web = přidat záznam →
   automaticky se objeví v mapě i v auditu. ŽÁDNÁ další změna kódu.

   Pole:
   id      – stabilní klíč (site-<id>)
   name    – zobrazované jméno
   www     – doména (bez https://)
   url     – plná URL pro audit (nepovinné, default https://<www>/)
   group   – 'web' vlastní web (zdroj poptávek) | 'portal' login.<znacka>
             | 'customer' zákaznický web připojený k CP
   mx      – true = audit kontroluje MX (e-maily); false = nedávat smysl
             (subdomény login.* / vercel.app nemívají MX)
   expect  – 'live' má běžet | 'wip' rozpracováno (sledovat!) | 'planned' plán
   acc     – barva fallback loga
   mono    – písmeno fallback loga
   icon    – pole URL ikon (favicony), prázdné = monogram
   note    – poznámka (volitelné)
   ═══════════════════════════════════════════════════════════════════ */
window.SYSTEM_SITES = [
  /* ── VLASTNÍ WEBY (group:'web') — zdroje poptávek → TURBOW ── */
  { id:'wbp',  group:'web', mx:true,  expect:'live', name:'WebyProByznys',   www:'webyprobyznys.cz',   acc:'#3B82F6', mono:'P',
    icon:['https://webyprobyznys.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico','https://www.google.com/s2/favicons?sz=64&domain=webyprobyznys.cz'],
    note:'formulář → TURBOW (zdroj webyprobyznys)' },
  { id:'wbn',  group:'web', mx:true,  expect:'live', name:'WebyBudoucnosti', www:'webybudoucnosti.cz', acc:'#14B8A6', mono:'W',
    icon:['https://webybudoucnosti.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico','https://www.google.com/s2/favicons?sz=64&domain=webybudoucnosti.cz'],
    note:'formulář → TURBOW (zdroj webybudoucnosti)' },
  { id:'mrb',  group:'web', mx:true,  expect:'live', name:'Mirabee.cz',      www:'mirabee.cz',         acc:'#FF4A00', mono:'M',
    icon:["data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 fill=%27%2317140D%27/%3E%3Crect x=%2710%27 y=%2742%27 width=%2744%27 height=%278%27 fill=%27%23FF4A00%27/%3E%3Crect x=%2710%27 y=%2714%27 width=%2730%27 height=%278%27 fill=%27%23F3F0E8%27/%3E%3C/svg%3E",'https://www.google.com/s2/favicons?sz=64&domain=mirabee.cz'],
    note:'agentura — e-maily značky (MX Cloudflare)' },
  { id:'wd24', group:'web', mx:true,  expect:'live', name:'WebDo24.cz',      www:'webdo24.cz',         acc:'#00e5ff', mono:'W',
    icon:['https://www.google.com/s2/favicons?sz=64&domain=webdo24.cz'],
    note:'vlajková služba (web jako služba)' },
  { id:'shs',  group:'web', mx:true,  expect:'live', name:'SheSkates',       www:'sheskates.cz',       acc:'#0f172a', mono:'S',
    icon:['https://www.google.com/s2/favicons?sz=64&domain=sheskates.cz','https://sheskates.cz/assets/favicon.png'] },
  { id:'njd',  group:'web', mx:true,  expect:'live', name:'Ninja Týden',     www:'ninja-tyden.cz',     acc:'#f59e0b', mono:'N',
    icon:['https://ninja-tyden.cz/favicon/apple-touch-icon.png','https://www.google.com/s2/favicons?sz=64&domain=ninja-tyden.cz'] },
  { id:'tjk',  group:'web', mx:true,  expect:'live', name:'TJ Krupka',       www:'tjkrupka.cz',        acc:'#16a34a', mono:'T',
    icon:['https://www.google.com/s2/favicons?sz=64&domain=tjkrupka.cz'] },
  { id:'tjka', group:'web', mx:true,  expect:'live', name:'TJ Krupka App',   www:'app.tjkrupka.cz',    acc:'#16a34a', mono:'A',
    icon:['https://app.tjkrupka.cz/apple-touch-icon.png','https://www.google.com/s2/favicons?sz=64&domain=app.tjkrupka.cz'] },
  { id:'b24',  group:'web', mx:true,  expect:'live', name:'Brožek24',        www:'brozek24.cz',        acc:'#060606', mono:'B',
    icon:[] },

  /* ── PORTÁLY (group:'portal') — login.<značka>, kam vede WIN ── */
  { id:'p-wbn', group:'portal', mx:false, expect:'live', name:'Portál WebyBudoucnosti', www:'login.webybudoucnosti.cz',
    acc:'#14B8A6', mono:'P', icon:['https://webybudoucnosti.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico'],
    note:'zákaznický portál (dnes branding „Webdo24 Portál")' },
  { id:'p-wd24', group:'portal', mx:false, expect:'live', name:'Portál WebDo24', www:'login.webdo24.cz',
    acc:'#00e5ff', mono:'P', icon:['https://www.google.com/s2/favicons?sz=64&domain=webdo24.cz'],
    note:'zákaznický portál WebDo24' },
  { id:'p-mrb', group:'portal', mx:false, expect:'wip', name:'Portál Mirabee', www:'login.mirabee.cz',
    acc:'#FF4A00', mono:'P', icon:['https://www.google.com/s2/favicons?sz=64&domain=mirabee.cz'],
    note:'rozpracováno — nyní Cloudflare 525 (SŘEDOVAT!)' },
  { id:'p-wbp', group:'portal', mx:false, expect:'planned', name:'Portál WebyProByznys', www:'login.webyprobyznys.cz',
    acc:'#3B82F6', mono:'P', icon:['https://www.google.com/s2/favicons?sz=64&domain=webyprobyznys.cz'],
    note:'plán (MULTI-SOURCE-PORTALS) — DNS zatím chybí' },

  /* ── ZÁKAZNICKÉ WEBY (group:'customer') — připojené k CP ── */
  { id:'c-hrz', group:'customer', mx:false, expect:'live', name:'Horizont (zákazník)', www:'studio-horizont.vercel.app',
    acc:'#39ff14', mono:'H', icon:['https://www.google.com/s2/favicons?sz=64&domain=studio-horizont.vercel.app'],
    note:'CONNECTED k CP (content_hub) — první produkční zákazník' }
];
