/* ═══════════════════════════════════════════════════════════════════
   REGISTR WEBŮ V SYSTÉMU — jediné místo, kde se přidává web do
   monitoringu (propojeni-systemu.html) a do přehledu webů
   (Mission Control → /websites, DataHub → /dh-api/weby).
   Nový web = přidat záznam → automaticky se objeví v mapě, v auditu
   i v přehledu služeb. ŽÁDNÁ další změna kódu.

   Pole záznamu webu:
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
   svc     – DEKLAROVANÉ služby, které nejdou odvodit zvenčí.
             Živé hodnoty (hosting, DNS/Cloudflare, MX, TLS cert) měří
             DataHub sám a deklaraci přepíšou. Klíče:
             hosting, dns, email  – výchozí hodnota, když měření selže
             forms                – kam chodí formuláře (TURBOW / API…)
             db                   – databáze za webem (Supabase…)
             analytics            – GA4 property / měření
             portal               – kam vede zákazník (login.<značka>)

   Doplňkové exporty (sdílí je stránka i DataHub):
   SYSTEM_SERVICES – platformní služby, které audit kontroluje jako uzly
   SYSTEM_PROCESS  – proces 1) weby → 2) TURBOW → 3) WIN/CP → 4) portál
   SYSTEM_UPDATES  – poslední úpravy systému (nový záznam na začátek)
   ═══════════════════════════════════════════════════════════════════ */
window.SYSTEM_SITES = [
  /* ── VLASTNÍ WEBY (group:'web') — zdroje poptávek → TURBOW ── */
  { id:'wbp',  group:'web', mx:true,  expect:'live', name:'WebyProByznys',   www:'webyprobyznys.cz',   acc:'#3B82F6', mono:'P',
    icon:['https://webyprobyznys.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico','https://www.google.com/s2/favicons?sz=64&domain=webyprobyznys.cz'],
    note:'formulář → TURBOW (zdroj webyprobyznys)',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'žádný', forms:'TURBOW (/api/lead)', db:null, analytics:'GA4 552768005', portal:'login.webyprobyznys.cz' } },
  { id:'wbn',  group:'web', mx:true,  expect:'live', name:'WebyBudoucnosti', www:'webybudoucnosti.cz', acc:'#14B8A6', mono:'W',
    icon:['https://webybudoucnosti.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico','https://www.google.com/s2/favicons?sz=64&domain=webybudoucnosti.cz'],
    note:'formulář → TURBOW (zdroj webybudoucnosti)',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'žádný', forms:'TURBOW (/api/lead)', db:null, analytics:'GA4 552512090', portal:'login.webybudoucnosti.cz' } },
  { id:'mrb',  group:'web', mx:true,  expect:'live', name:'Mirabee.cz',      www:'mirabee.cz',         acc:'#FF4A00', mono:'M',
    icon:["data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 fill=%27%2317140D%27/%3E%3Crect x=%2710%27 y=%2742%27 width=%2744%27 height=%278%27 fill=%27%23FF4A00%27/%3E%3Crect x=%2710%27 y=%2714%27 width=%2730%27 height=%278%27 fill=%27%23F3F0E8%27/%3E%3C/svg%3E",'https://www.google.com/s2/favicons?sz=64&domain=mirabee.cz'],
    note:'agentura — e-maily značky (MX Cloudflare)',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'Cloudflare Routing', forms:'TURBOW (intake)', db:null, analytics:'GA4 222057102', portal:'login.mirabee.cz' } },
  { id:'wd24', group:'web', mx:true,  expect:'live', name:'WebDo24.cz',      www:'webdo24.cz',         acc:'#00e5ff', mono:'W',
    icon:['https://www.google.com/s2/favicons?sz=64&domain=webdo24.cz'],
    note:'vlajková služba (web jako služba)',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'Cloudflare Routing', forms:'—', db:'Supabase', analytics:'GA4 530284583', portal:'login.webdo24.cz' } },
  { id:'shs',  group:'web', mx:true,  expect:'live', name:'SheSkates',       www:'sheskates.cz',       acc:'#0f172a', mono:'S',
    icon:['https://www.google.com/s2/favicons?sz=64&domain=sheskates.cz','https://sheskates.cz/assets/favicon.png'],
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'Cloudflare Routing', forms:'—', db:null, analytics:'GA4 540216883', portal:null } },
  { id:'njd',  group:'web', mx:true,  expect:'live', name:'Ninja Týden',     www:'ninja-tyden.cz',     acc:'#f59e0b', mono:'N',
    icon:['https://ninja-tyden.cz/favicon/apple-touch-icon.png','https://www.google.com/s2/favicons?sz=64&domain=ninja-tyden.cz'],
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'Cloudflare Routing', forms:'—', db:null, analytics:'GA4 539768933', portal:null } },
  { id:'tjk',  group:'web', mx:true,  expect:'live', name:'TJ Krupka',       www:'tjkrupka.cz',        acc:'#16a34a', mono:'T',
    icon:['https://www.google.com/s2/favicons?sz=64&domain=tjkrupka.cz'],
    svc:{ hosting:'Vercel', dns:'Wedos', email:'AWS SES', forms:'TJK app', db:'Supabase (TJK app)', analytics:'GA4 511361257', portal:null } },
  { id:'tjka', group:'web', mx:false,  expect:'live', name:'TJ Krupka App',   www:'app.tjkrupka.cz',    acc:'#16a34a', mono:'A',
    icon:['https://app.tjkrupka.cz/apple-touch-icon.png','https://www.google.com/s2/favicons?sz=64&domain=app.tjkrupka.cz'],
    svc:{ hosting:'Vercel', dns:'Wedos', email:'—', forms:'TJK app (registrace)', db:'Supabase (TJK app)', analytics:'GA4 487037538 (tag chybí)', portal:null } },
  { id:'b24',  group:'web', mx:true,  expect:'live', name:'Brožek24',        www:'brozek24.cz',        acc:'#060606', mono:'B',
    icon:[],
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'Cloudflare Routing', forms:'—', db:null, analytics:null, portal:null } },
  { id:'abg',  group:'web', mx:false,  expect:'live', name:'Airbag Komárka',  www:'airbag-komarka-web.vercel.app', acc:'#ffb428', mono:'K',
    icon:['https://airbag-komarka-web.vercel.app/assets/znak-192.png'],
    note:'WEB SLUŽBY (ne kampaň) — skákání na dopadové matraci v areálu Komárka; termíny a ceny z app.tjkrupka.cz, registrace tamtéž; bez vlastní domény (e-mail na doméně zatím neexistuje)',
    svc:{ hosting:'Vercel', dns:'Vercel', email:'žádný', forms:'TJK app API (/api/terminy)', db:'Supabase (TJK app)', analytics:null, portal:null } },

  /* ── PORTÁLY (group:'portal') — login.<značka>, kam vede WIN ── */
  { id:'p-wbn', group:'portal', mx:false, expect:'live', name:'Portál WebyBudoucnosti', www:'login.webybudoucnosti.cz',
    acc:'#14B8A6', mono:'P', icon:['https://webybudoucnosti.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico'],
    note:'zákaznický portál (dnes branding „Webdo24 Portál")',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'—', forms:'—', db:'Supabase (GoTrue)', analytics:null, portal:null } },
  { id:'p-wd24', group:'portal', mx:false, expect:'live', name:'Portál WebDo24', www:'login.webdo24.cz',
    acc:'#00e5ff', mono:'P', icon:['https://www.google.com/s2/favicons?sz=64&domain=webdo24.cz'],
    note:'zákaznický portál WebDo24',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'—', forms:'—', db:'Supabase (GoTrue)', analytics:null, portal:null } },
  { id:'p-mrb', group:'portal', mx:false, expect:'wip', name:'Portál Mirabee', www:'login.mirabee.cz',
    acc:'#FF4A00', mono:'P', icon:['https://www.google.com/s2/favicons?sz=64&domain=mirabee.cz'],
    note:'rozpracováno — nyní Cloudflare 525 (SŘEDOVAT!)',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'—', forms:'—', db:'Supabase (GoTrue)', analytics:null, portal:null } },
  { id:'p-wbp', group:'portal', mx:false, expect:'live', name:'Portál WebyProByznys', www:'login.webyprobyznys.cz',
    acc:'#3B82F6', mono:'P', icon:['https://webyprobyznys.cz/favicon.ico?favicon.3fpu2ql9ns1a0.ico'],
    note:'DNS už funguje a portál odpovídá (ověřeno 2026-10-27) — branding podle domény',
    svc:{ hosting:'Vercel', dns:'Cloudflare', email:'—', forms:'—', db:'Supabase (GoTrue)', analytics:null, portal:null } },

  /* ── ZÁKAZNICKÉ WEBY (group:'customer') — připojené k CP ── */
  { id:'c-hrz', group:'customer', mx:false, expect:'live', name:'Horizont (zákazník)', www:'studio-horizont.vercel.app',
    acc:'#39ff14', mono:'H', icon:['https://www.google.com/s2/favicons?sz=64&domain=studio-horizont.vercel.app'],
    note:'CONNECTED k CP (content_hub) — první produkční zákazník',
    svc:{ hosting:'Vercel', dns:'Vercel', email:'—', forms:'Customer Platform', db:'Supabase (CP)', analytics:null, portal:null } }
];

/* ── PLATFORMNÍ SLUŽBY — audit je kontroluje jako samostatné uzly ──
   local:true = měřitelné jen z localhostu (TURBOW na Macu) */
window.SYSTEM_SERVICES = [
  { key:'api',  name:'Customer Platform API', tag:'FastAPI · Vercel', cls:'ic-cyan', url:'https://customer-platform-chi.vercel.app/health/ready', local:false },
  { key:'sup',  name:'Supabase',              tag:'Postgres + GoTrue', cls:'ic-pink', url:'https://mljqltwcdqknezuqpisb.supabase.co/auth/v1/health', local:false },
  { key:'por',  name:'Portál login.webybudoucnosti.cz', tag:'Next.js', cls:'ic-lime', url:'https://login.webybudoucnosti.cz/', local:false },
  { key:'run',  name:'Site runtime',          tag:'náhledy + live obsah', cls:'ic-amber', url:'https://customer-site-runtime.vercel.app/', local:false, okStatus:[200,404], note:'root vrací 404 — deployment běží, obsah dodává per web' },
  { key:'trb',  name:'TURBOW',                tag:'lokální :8877', cls:'ic-pink', url:'http://localhost:8877/', local:true }
];

/* ── PROCES SYSTÉMU (1 → 4) — co se s webem / leadem děje ── */
window.SYSTEM_PROCESS = [
  { n:1, key:'weby',  color:'#22D3EE', title:'WEBY V SYSTÉMU',
    sub:'Vlastní weby sbírají poptávky → TURBOW. Portály login.* obsluhují zákazníky po WIN. Zákaznické weby jsou připojené k Customer Platform.',
    href:'https://majlajf.vercel.app/propojeni-systemu.html' },
  { n:2, key:'turbow', color:'#F43F5E', title:'TURBOW — zpracovávám já',
    sub:'Leady z webů se sbíhají v TURBOW: poptávka → kvalifikace → nabídka (podepsaná značkou zdroje) → WIN.',
    href:'http://127.0.0.1:8877/' },
  { n:3, key:'win',   color:'#34D399', title:'WIN → Customer Platform',
    sub:'Z WIN vznikne profil zákazníka (workspace, objednávka, entitlementy) a přístup na portál login.<značka> podle domény, ze které přišel.',
    href:'https://customer-platform-chi.vercel.app/health/ready' },
  { n:4, key:'portal', color:'#FB923C', title:'PORTÁL ZÁKAZNÍKA',
    sub:'Zákazník spravuje svůj web bez tebe — obsah, poptávky, publikace, AI správa. Ty vidíš provoz, domény a statistiky.',
    href:'https://login.webybudoucnosti.cz/' }
];

/* ── POSLEDNÍ ÚPRAVY SYSTÉMU (nový záznam na začátek) ── */
window.SYSTEM_UPDATES = [
  { date:'2026-10-27', repo:'majlajf · datahub · mission-control', commit:'—', kind:'feat',
    title:'Web Airbag Komárka v registru + přehled webů se službami v Mission Control', status:'NASAZENO',
    changed:[
      'Registr system-sites.js: nový web airbag-komarka-web.vercel.app (web služby, ne kampaň) + pole svc (formuláře, DB, analytika, portál) u každého webu.',
      'DataHub: nový canonical kontrakt /dh-api/weby — živé ověření dostupnosti, hostingu, Cloudflare, MX a TLS certifikátu + deklarované služby z registru.',
      'Mission Control: /websites zobrazuje všechny weby s ukazateli služeb; /propojeni-systemu má nativní mapu procesu, stav platformních služeb a poslední úpravy.'
    ],
    meaning:'Přehled webů a jejich služeb je na jednom místě a vychází z jednoho registru — nový web se přidává jedním záznamem.',
    impact:'Bez dopadu na produkční weby; jde o čtení a zobrazení (read-only).' },
  { date:'2026-09-06', repo:'customers-portal', commit:'c781432', kind:'navrh',
    title:'Návrh multi-značkového portálu — login.webyprobyznys.cz (registry zdrojů)', status:'NÁVRH',
    changed:[
      'Dokument MULTI-SOURCE-PORTALS.md: jedna aplikace portálu, branding podle domény (hostname).',
      'Definice registru zdrojů: webybudoucnosti (teal), webyprobyznys (modrá), unknown (neutrální fallback).',
      'Plán: source_key v Workspace.settings → bootstrap vrací jen workspaces dané značky.'
    ],
    meaning:'Zákazník z webyprobyznys.cz dnes v portálu vidí branding „Webdo24 Portál“ — návrh oddělí značky, e-maily i nabídky tak, aby se nikdy nesmíchaly.',
    impact:'Zatím žádná změna provozu. TURBOW část je na nepublikované větvi (viz další záznam).' },
  { date:'2026-09-06', repo:'turbow', commit:'081f916', kind:'feat',
    title:'Registr zdrojů zákazníků v TURBOW — barevné rozlišení + brand odpovědí', status:'LOKÁLNĚ · NEPUBLIKOVÁNO',
    changed:[
      'app/sources.py — registry (key, barvy, e-mail, portál) + resolvery podle domény / source_detail.',
      'Lead i customer nesou source_key; UI ukazuje barevný štítek zdroje.',
      'Nabídky (quotes + public offer) používají e-mail a patičku ZDROJE — pryč pevné „WebyBudoucnosti“.',
      'Migrace customers.source_key (aditivní) + 23 testů.'
    ],
    meaning:'Zákazník z webyprobyznys.cz už nedostane nabídku podepsanou jako WebyBudoucnosti.cz — podepíše se správná značka.',
    impact:'Větev feature/first-customer-e2e (7 commitů před origin/main) — čeká na merge a publikaci.' },
  { date:'2026-09-05', repo:'customers-portal', commit:'5247fd6', kind:'feat',
    title:'AI správa webu v portálu — příkazy mění obsah webu (change set + publish)', status:'NASAZENO',
    changed:[
      'Nový režim: napíšeš příkaz česky → AI navrhne změny obsahu (propose).',
      'Změny se seskupí do change setu, který publikuješ / zahodíš / rollback.',
      'Editor sekcí ukazuje skutečný text z obsahu; náhled otevírá skutečný web.'
    ],
    meaning:'Úprava webu už není „najdi políčko a přepiš“ — AI připraví změnu a ty ji jedním klikem schválíš.',
    impact:'Volá nové API /api/v1/.../websites/{id}/ai/* (viz další záznam).' },
  { date:'2026-09-05', repo:'customers-platform', commit:'1013b80', kind:'feat',
    title:'AI správa obsahu webu — propose → change set → publish (SDK pipeline)', status:'NASAZENO',
    changed:[
      'Nová doména ai_content: propose, change sets, publish, rollback, history, fields.',
      'Stejná pipeline dostupná i mimo portál (SDK) — základ pro automatické AI úpravy.',
      'Nové endpointy: /websites/{id}/ai/propose, /ai/change-sets, /ai/history, /ai/fields.'
    ],
    meaning:'Obsah webu je strojově čitelný/zapisovatelný — AI může web upravovat konzistentně jako člověk v portálu.',
    impact:'Produkční API má 155 endpointů; change setů zatím 0 (feature čerstvě nasazená).' },
  { date:'2026-09-02', repo:'customers-platform', commit:'2e72756', kind:'fix',
    title:'Stabilizace produkce — DB pooler, connect přes worker, opravy importu', status:'NASAZENO',
    changed:[
      'Supabase transaction pooler (:6543) + malý pool + statement_cache_size=0 — konec odpojování v serverless.',
      'Connect webu: import obsahu přes worker job (site_connect.import) místo sync requestu (60s limit).',
      'Validátor: prázdná sekce OK při capabilities false; intake neblokuje osiřelý draft.',
      'Import zachovává kategorie (category/categoryLabel) u produktů a služeb.'
    ],
    meaning:'Připojení většího webu už nepadá na limitu serverless requestu a databáze drží spojení.',
    impact:'Běžný provoz; souvisí s prvním produkčním CONNECTED webem (Horizont).' }
];
