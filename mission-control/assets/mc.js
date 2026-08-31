/* ============================================================
   MISSION CONTROL — Application layer v3.0 (CS/EN)
   DATA: canonical kontrakty přes /mc-api/* (fasáda → DATAHUB).
   ------------------------------------------------------------
   UI se ptá CO potřebuje (getAttentionItems, getTasks, getActivity…),
   nikdy neřeší, ze kterého zdroje data jsou a jak se získávají.
   Provider-specific detaily vlastní DataHub (datahub/ projekt).

   JAZYK: výchozí čeština, přepínač CS/EN v topbaru (localStorage).
   ZDROJE: každá dlaždice ukazuje vpravo nahoře zdroj (src-chip).
   ============================================================ */
(function () {
  'use strict';

  /* Subpath support: online kopie běží na /mission-control (Vercel). */
  const MC_BASE = (location.pathname.indexOf('/mission-control') === 0) ? '/mission-control' : '';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kc = (n) => (n == null ? '—' : Number(n).toLocaleString('cs-CZ') + ' Kč');

  /* ---------- I18N (CS default, EN přepínač) ---------- */
  const LANG_KEY = 'mc.lang';
  let LANG = 'cs';
  try { LANG = localStorage.getItem(LANG_KEY) || 'cs'; } catch (e) { /* noop */ }
  function t(cs, en) { return LANG === 'en' ? (en != null && en !== '' ? en : cs) : cs; }
  function applyLang() {
    document.documentElement.lang = LANG;
    $$('[data-i18n]').forEach(el => {
      const pair = (el.dataset.i18n || '').split('|');
      el.textContent = t(pair[0], pair[1]);
    });
    const lt = $('#lang-toggle');
    if (lt) lt.textContent = LANG === 'cs' ? 'EN' : 'CS';
  }
  function toggleLang() {
    LANG = LANG === 'cs' ? 'en' : 'cs';
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* noop */ }
    applyLang();
    const vt = VIEW_TITLES[S.view] || [S.view, S.view];
    document.title = 'Mission Control — ' + t(vt[0], vt[1]);
    renderAll();
  }

  /* ---------- SOURCE CHIP (zdroj dlaždice, vpravo nahoře) ---------- */
  const SRC_LABEL = { paperclip: 'Paperclip', gmail: 'Gmail', calendar: 'Kalendář', isds: 'Datovka', turbow: 'TURBOW', ads: 'Google Ads', webanalytics: 'GA4', searchconsole: 'Search Console', core: 'Core', ai: 'AI' };
  function srcChip(src) { return src ? '<span class="src-chip">' + esc(SRC_LABEL[src] || src) + '</span>' : ''; }

  /* ---------- DATA (canonical kontrakty) ---------- */
  const Core = window.MCCore;

  /* ---------- ICONS ---------- */
  const I = {
    arrow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8h13M9 3l5 5-5 5"/></svg>',
    ext: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9"/></svg>',
    chat: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h12v9H6l-3 2.5V12H2z"/></svg>',
    phone: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h3l1.5 4L6 7.5a10 10 0 0 0 3 3L11 9l4 1.5v3a1.5 1.5 0 0 1-1.7 1.5C7.5 14.6 1.4 8.5.8 2.7A1.5 1.5 0 0 1 2.3 1z"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l3.5 3.5 7.5-8"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>',
    clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.5V8l2.5 1.8"/></svg>',
    spark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l1.7 4.8L14.5 8l-4.8 1.7L8 14.5l-1.7-4.8L1.5 8l4.8-1.7z"/></svg>',
    bell: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2a4.5 4.5 0 0 0-4.5 4.5v3l-1.2 2h11.4l-1.2-2v-3A4.5 4.5 0 0 0 8 2zM6.2 13a1.9 1.9 0 0 0 3.6 0"/></svg>',
    search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    doc: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.5h5.5L13 5v9.5H4zM9.5 1.5V5H13"/></svg>',
    lead: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5.5" r="2.5"/><path d="M2.5 14c.6-3 3-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/></svg>',
    mail: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M2 4.5l6 4.5 6-4.5"/></svg>',
    cal: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.5V4M10.5 1.5V4"/></svg>',
    ad: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h12v10H2zM5.5 10.5l2-3 1.5 2 1-1.5 1.5 2.5"/><circle cx="11" cy="6" r="1"/></svg>',
    globe: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6.2"/><path d="M2 8h12M8 1.8c2 1.8 3 3.9 3 6.2s-1 4.4-3 6.2c-2-1.8-3-3.9-3-6.2s1-4.4 3-6.2z"/></svg>',
    task: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M5.5 8l2 2 3.5-4"/></svg>',
    user: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="5.5" r="2.6"/><path d="M2.8 14c.7-3 2.8-4.5 5.2-4.5s4.5 1.5 5.2 4.5"/></svg>',
    zap: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5L3 9h4l-.8 5.5L12 7H7.8z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5.5 3v10M10.5 3v10"/></svg>',
    eye: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    folder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 3.5h4.5l2 2h6.5v7h-13z"/></svg>',
    chart: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 13.5h12M4 11V7M8 11V4M12 11V5.5"/></svg>',
    note: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h10v8.5L9.5 14H3zM9.5 14v-3.5H13"/></svg>',
    alert: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8L15 13.5H1zM8 6.5v3.2M8 11.6v.1"/></svg>',
    shield: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l5.5 2v4c0 3.6-2.3 6-5.5 7-3.2-1-5.5-3.4-5.5-7v-4z"/></svg>',
    home: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5L8 2.5l5.5 5v6.5a1 1 0 0 1-1 1H9.5V10h-3v5H3.5a1 1 0 0 1-1-1z"/></svg>',
    bot: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="10" height="8" rx="2"/><path d="M5.5 5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V5M6 9h.01M10 9h.01"/></svg>',
    chev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5L11 8l-5 4.5"/></svg>'
  };

  /* ---------- HELPERS ---------- */
  const fmtAgo = (iso) => {
    if (!iso) return '—';
    const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (sec < 60) return t('před ' + sec + ' s', sec + ' sec ago');
    if (sec < 3600) return t('před ' + Math.floor(sec / 60) + ' min', Math.floor(sec / 60) + ' min ago');
    if (sec < 86400) return t('před ' + Math.floor(sec / 3600) + ' h', Math.floor(sec / 3600) + ' h ago');
    return t('před ' + Math.floor(sec / 86400) + ' d', Math.floor(sec / 86400) + ' d ago');
  };
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }); };
  // datum z "20260817" (GA4) i "2026-08-17" (Paperclip) → "17.08."
  const fmtDay = (s) => {
    if (!s) return '';
    const str = String(s);
    if (/^\d{8}$/.test(str)) return str.slice(6, 8) + '.' + str.slice(4, 6) + '.';
    return str.slice(5);
  };
  const nowSec = () => Math.floor(Date.now() / 1000);
  const cleanErr = (s) => {
    if (!s) return '';
    const lines = String(s).split('\n').map(l => l.trim())
      .filter(l => l && !l.startsWith('Traceback') && !l.includes('File "') && !/^\^+$/.test(l) && !l.startsWith('raise ') && !l.includes('during handling') && !l.includes('Traceback'));
    if (!lines.length) return '';
    return lines[lines.length - 1].slice(0, 140);
  };
  const sid = (id) => (id || '').replace(/^mc:[a-z_]+:/, '');
  const companyName = () => (Core.state.company && Core.state.company.name) || 'Mission Control';

  /* ---------- TOASTS ---------- */
  function toast(title, desc, tone) {
    const box = $('#toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.innerHTML = '<div><div class="t-title">' + esc(title) + '</div>' + (desc ? '<div class="t-desc">' + esc(desc) + '</div>' : '') + '</div>';
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 4200);
  }

  /* ---------- STATE ---------- */
  const S = { view: 'home', sidebarCollapsed: false, railVisible: true, unreadNotifs: 0, loaded: false };

  /* ---------- ROUTER ---------- */
  const VIEW_TITLES = {
    home: ['Přehled', 'Today'], paperclip: ['Paperclip', 'Paperclip'], agents: ['Agenti', 'Agents'], tasks: ['Úkoly', 'Tasks'],
    decisions: ['Rozhodnutí', 'Decisions'], turbow: ['TURBOW', 'TURBOW'], pipeline: ['Pipeline', 'Pipeline'],
    companies: ['Firmy', 'Projects'], intelligence: ['Prodejní analýza', 'Sales Intelligence'],
    gmail: ['Gmail', 'Gmail'], isds: ['Datová schránka', 'Datová schránka'], calendar: ['Kalendář', 'Calendar'],
    ads: ['Google Ads', 'Google Ads'], websites: ['Weby', 'Websites'], analytics: ['Analytika', 'Analytics'],
    'search-console': ['Search Console', 'Search Console'], projects: ['Projekty', 'Projects'], 'tasks-work': ['Úkoly', 'Tasks'],
    documents: ['Dokumenty', 'Documents'], notes: ['Poznámky', 'Notes'], personal: ['Osobní přehled', 'Personal Overview'],
    integrations: ['Integrace', 'Integrations'], automations: ['Automatizace', 'Automations'], activity: ['Aktivita', 'Activity'],
    settings: ['Nastavení', 'Settings'], mobile: ['Mobile Command View', 'Mobile Command View'],
    notifications: ['Notifikace', 'Notifications'],
    decision: ['Rozhodnutí', 'Decision'], 'task-detail': ['Detail úkolu', 'Task detail'], 'lead-detail': ['Detail leadu', 'Lead detail'],
    'agent-detail': ['Detail agenta', 'Agent detail'], report: ['Report', 'Report viewer']
  };

  /* ---------- URL ROUTER (každá stránka má vlastní URL) ---------- */
  const VIEW_SLUGS = {
    home: '/', notifications: '/notifications', paperclip: '/paperclip', agents: '/agents',
    tasks: '/tasks', decisions: '/decisions', turbow: '/turbow', pipeline: '/pipeline',
    intelligence: '/intelligence', gmail: '/gmail', isds: '/isds', calendar: '/calendar',
    ads: '/ads', websites: '/websites', analytics: '/analytics', 'search-console': '/search-console',
    projects: '/projects', 'tasks-work': '/tasks-work', documents: '/documents', notes: '/notes',
    personal: '/personal', integrations: '/integrations', automations: '/automations',
    activity: '/activity', settings: '/settings', companies: '/companies', mobile: '/mobile'
  };
  const SLUG_TO_VIEW = Object.fromEntries(Object.entries(VIEW_SLUGS).map(([v, s]) => [s, v]));

  /** Detail views se adresují přes parametr v cestě: /tasks/123, /decisions/abc … */
  const DETAIL_SLUGS = {
    'decision': '/decisions/', 'task-detail': '/tasks/', 'lead-detail': '/leads/', 'agent-detail': '/agents/'
  };

  function urlForView(id, opts) {
    opts = opts || {};
    if (id === 'report') return MC_BASE + '/report';
    if (DETAIL_SLUGS[id] && opts.id) return MC_BASE + DETAIL_SLUGS[id] + encodeURIComponent(opts.id);
    return MC_BASE + (VIEW_SLUGS[id] || ('/' + id));
  }

  /** Z aktuální URL (location.pathname) odvodí zobrazovanou stránku. */
  function parseRoute() {
    const p = (MC_BASE && location.pathname.indexOf(MC_BASE) === 0) ? (location.pathname.slice(MC_BASE.length) || '/') : location.pathname;
    const seg = p.split('/').filter(Boolean).map(decodeURIComponent);
    if (!seg.length || seg[0] === 'index.html') return { id: 'home' };
    if (seg[0] === 'report') return { id: 'report' };
    for (const [view, prefix] of Object.entries(DETAIL_SLUGS)) {
      const base = prefix.replace(/\/+$/, '').replace(/^\//, '');
      if (seg[0] === base && seg[1]) return { id: view, opts: { id: seg[1] } };
    }
    const v = SLUG_TO_VIEW['/' + seg[0]];
    return v ? { id: v } : { id: 'home' };
  }

  /** Synchronizuje adresní řádek se zobrazenou stránkou (bez reloadu). */
  function syncUrl(id, opts) {
    const url = urlForView(id, opts);
    if (location.pathname === url) history.replaceState({ view: id, opts: opts || null }, '', url);
    else history.pushState({ view: id, opts: opts || null }, '', url);
  }

  function showView(id, opts) {
    opts = opts || {};
    S.view = id;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + id));
    $$('.sb-item').forEach(i => i.classList.toggle('active', i.dataset.view === id));
    const vt = VIEW_TITLES[id] || [id, id];
    document.title = 'Mission Control — ' + t(vt[0], vt[1]);
    const sc = $('.main-scroll'); if (sc) sc.scrollTop = 0;
    closeCmd();
    if (id === 'decision' && opts.id) renderDecision(opts.id);
    if (id === 'task-detail' && opts.id) renderTaskDetail(opts.id);
    if (id === 'lead-detail' && opts.id) renderLeadDetail(opts.id);
    if (id === 'agent-detail' && opts.id) renderAgentDetail(opts.id);
    if (id === 'notifications') { renderNotifications(); renderSettingsValues(); }
    if (id === 'settings') renderSettingsValues();
    if (id === 'personal') renderPersonal();
    updateBadges();
    syncUrl(id, opts);
    if (opts.notify) toast(opts.notify.title, opts.notify.desc, opts.notify.tone);
  }

  function updateBadges() {
    const openAppr = (Core.state.decisions.items || []).length;
    $$('[data-badge="decisions"]').forEach(b => { b.textContent = openAppr; b.style.display = openAppr ? '' : 'none'; });
    const actionable = (Core.state.leads.items || []).filter(l => ['READY_TO_CALL', 'AUDIT_FAILED', 'NEW', 'ENRICHING'].includes(l.status)).length;
    $$('[data-badge="leads"]').forEach(b => { b.textContent = actionable; b.style.display = actionable ? '' : 'none'; });
    $$('[data-badge="notif"]').forEach(b => { b.textContent = S.unreadNotifs; b.style.display = S.unreadNotifs ? '' : 'none'; });
    const isdsUnread = (Core.state.isdsMessages.items || []).filter(m => m.unread).length;
    $$('[data-badge="isds"]').forEach(b => { b.textContent = isdsUnread; b.style.display = isdsUnread ? '' : 'none'; });
    const gmailUnread = (Core.state.messages.items || []).filter(m => m.unread).length;
    $$('[data-badge="gmail"]').forEach(b => { b.textContent = gmailUnread; b.style.display = gmailUnread ? '' : 'none'; });
  }

  /* ---------- NOT CONNECTED / EMPTY / ERROR HELPERS ---------- */
  function notConnected(icon, title, desc, extra) {
    return '<div class="state"><div class="st-icon">' + (I[icon] || I.shield) + '</div>' +
      '<div class="st-title">' + esc(title) + '</div>' +
      '<div class="st-desc">' + esc(desc) + '</div>' +
      (extra || '') + '</div>';
  }
  function noData(title, desc) {
    return '<div class="state"><div class="st-icon">' + I.check + '</div><div class="st-title">' + esc(title) + '</div><div class="st-desc">' + esc(desc) + '</div></div>';
  }
  function paperclipError() {
    return notConnected('alert', t('Data nejsou dostupná', 'Data unavailable'),
      Core.state.error ? (t('Chyba: ', 'Error: ') + Core.state.error + '. ' + t('Spusť start.sh — Mission Control (5175) a DataHub (5180).', 'Run start.sh — Mission Control (5175) and DataHub (5180).')) :
      t('Spusť start.sh — Mission Control (5175) a DataHub (5180).', 'Run start.sh — Mission Control (5175) and DataHub (5180).'));
  }
  function loadingBlock() {
    return '<div class="card pad shimmer" style="height:90px;margin-bottom:10px"></div><div class="card pad shimmer" style="height:90px"></div>';
  }

  /* ============================================================
     RENDERERS — canonical data z DataHubu
     ============================================================ */

  /* ---------- RENDER: instrument strip ---------- */
  function instStatus(id) {
    return (Core.state.health || []).find(x => x.id === id) || null;
  }
  function renderInstrument() {
    const sync = $('#inst-sync');
    if (sync) {
      if (Core.state.connected) {
        sync.innerHTML = '<span class="dot live green"></span>' + t('Data', 'Data') + ' <b>' + t('připojeno', 'connected') + '</b> · ' + t('synced', 'synced') + ' ' + fmtAgo(Core.state.lastSyncAt) + (Core.state.stale ? ' · <b class="text-orange">' + t('zastaralé', 'stale') + '</b>' : '');
      } else {
        sync.innerHTML = '<span class="dot red"></span>' + t('Data', 'Data') + ' <b>' + t('offline', 'offline') + '</b>';
      }
    }
    const chips = { 'inst-cal': 'calendar', 'inst-ads': 'ads', 'inst-gmail': 'gmail', 'inst-isds': 'isds' };
    const labelMap = { connected: t('připojeno', 'connected'), offline: 'offline', degraded: 'degraded', not_connected: t('nepřipojen', 'not connected'), auth_expired: t('vypršela auth', 'auth expired') };
    const dotMap = { connected: 'green', offline: 'red', degraded: 'orange', not_connected: '', auth_expired: 'red' };
    Object.keys(chips).forEach(id => {
      const el = $('#' + id); if (!el) return;
      const h = instStatus(chips[id]);
      const label = h ? (labelMap[h.status] || h.status) : t('nepřipojen', 'not connected');
      const dot = h ? (dotMap[h.status] || '') : '';
      const name = h ? h.name : chips[id];
      el.innerHTML = '<span class="dot ' + (dot ? 'live ' + dot : '') + '"' + (dot ? '' : ' style="background:var(--text4)"') + '></span>' + esc(name) + ' <b>' + esc(label) + '</b>';
    });
    const topSync = $('#top-sync');
    if (topSync) {
      topSync.innerHTML = Core.state.connected
        ? '<span class="dot live green"></span>' + esc(companyName().toUpperCase())
        : '<span class="dot red"></span>OFFLINE';
    }
  }

  /* ---------- RENDER: briefing ---------- */
  const czPlural = (n, one, few, many) => { if (n === 1) return one; if (n >= 2 && n <= 4) return few; return many; };
  function renderBriefing() {
    const gr = $('#greet');
    if (gr) {
      const hour = new Date().getHours();
      const greet = hour < 5 ? t('DOBROU NOC', 'GOOD NIGHT') : hour < 12 ? t('DOBRÉ RÁNO', 'GOOD MORNING') : hour < 18 ? t('DOBRÉ ODPOLEDNE', 'GOOD AFTERNOON') : t('DOBRÝ VEČER', 'GOOD EVENING');
      gr.innerHTML = greet + ', <span class="grad">MÍRO</span>';
    }
    const host = $('#briefing');
    if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const d = Core.state.overview || {};
    const att = Core.state.attention;
    const errAgents = Core.state.agents.items.filter(a => a.status === 'error');
    const blocked = Core.state.tasks.items.filter(i => i.status === 'blocked');
    const inProg = Core.state.tasks.items.filter(i => i.status === 'in_progress');
    const lines = [];
    const attCount = att ? att.totalCount : 0;
    if (attCount) lines.push('<b class="text-red">' + attCount + ' ' + czPlural(attCount, t('věc potřebuje tvou pozornost', 'thing needs your attention'), t('věci potřebují tvou pozornost', 'things need your attention'), t('věcí potřebuje tvou pozornost', 'things need your attention')) + '</b> — ' + esc(((att.items || [])[0] || {}).title || ''));
    if (errAgents.length) lines.push(t('Agent', 'Agent') + ' <b class="text-red">' + esc(errAgents[0].name) + '</b> ' + t('je v erroru — ', 'is in error — ') + esc(cleanErr(errAgents[0].errorReason) || t('zkontroluj board', 'check the board')));
    if (blocked.length) lines.push('<b class="text-orange">' + blocked.length + ' ' + czPlural(blocked.length, t('úkol je blokovaný', 'task is blocked'), t('úkoly jsou blokované', 'tasks are blocked'), t('úkolů je blokovaných', 'tasks are blocked')) + '</b> — ' + esc(blocked[0].identifier) + ' ' + esc(blocked[0].title.slice(0, 40)));
    if (inProg.length) lines.push(t('Právě běží: ', 'Running now: ') + '<b>' + esc(inProg[0].identifier) + '</b> ' + esc(inProg[0].title.slice(0, 45)));
    const dTasks = d.tasks || {};
    if (dTasks.done) lines.push(t('Dokončeno', 'Completed') + ' <b class="text-green">' + dTasks.done + ' ' + t('úkolů', 'tasks') + '</b> ' + t('celkem', 'total') + ' · ' + t('otevřeno', 'open') + ' ' + dTasks.open + ' · ' + Core.state.agents.items.length + ' ' + t('agentů', 'agents'));
    if (!lines.length) lines.push(t('Vše je v pořádku — žádné úkoly nevyžadují pozornost.', 'All good — nothing needs your attention.'));
    host.innerHTML = lines.join(' ');
    const focus = $('#top-focus');
    if (focus) {
      const items = [];
      att && (att.items || []).slice(0, 2).forEach(a => items.push([a.type, a.title, t('pozornost', 'attention'), 'MC.showView(\'paperclip\')']));
      blocked.slice(0, 2).forEach(b => items.push(['BLOCKED', b.identifier + ' ' + b.title.slice(0, 40), t('pipeline', 'pipeline'), 'MC.showView(\'pipeline\')']));
      inProg.slice(0, 2).forEach(b => items.push(['IN PROGRESS', b.identifier + ' ' + b.title.slice(0, 40), t('úkoly', 'tasks'), 'MC.showView(\'tasks\')']));
      if (!items.length) items.push(['OK', t('Žádné priority — vše vyřízeno', 'No priorities — everything handled'), 'paperclip', 'MC.showView(\'home\')']);
      focus.innerHTML = items.map((f, i) =>
        '<div class="row" onclick="' + f[3] + '"><span class="num" style="color:var(--purple);font-weight:700;width:18px">' + (i + 1) + '</span>' +
        '<div class="row-main"><div class="row-title">' + esc(f[1]) + '</div><div class="row-sub">' + esc(f[2]) + '</div></div>' + I.chev + '</div>').join('');
    }
  }

  /* ---------- RENDER: home stats ---------- */
  function renderHomeStats() {
    if (!Core.state.connected) return;
    const d = Core.state.overview || {};
    const set = (id, v, sub) => { const el = $('#' + id); if (el) { el.innerHTML = v; if (sub) { const s = el.parentElement.querySelector('.stat-sub'); if (s) s.textContent = sub; } } };
    const ag = d.agents || {};
    set('stat-agents', ag.active + ' <span class="dot live green" style="display:inline-block;vertical-align:middle"></span>', ag.running + ' ' + t('běží', 'running') + ' · ' + ag.error + ' error · ' + ag.paused + ' paused');
    const tsk = d.tasks || {};
    set('stat-open', tsk.open, tsk.inProgress + ' ' + t('v řešení', 'in progress') + ' · ' + tsk.blocked + ' ' + t('blokované', 'blocked'));
    set('stat-done', tsk.done, t('dokončeno celkem', 'done total'));
    set('stat-cost', (d.costs && d.costs.monthSpendCents != null ? (d.costs.monthSpendCents / 100).toFixed(2) : '—'), t('náklady za měsíc (USD)', 'monthly cost (USD)'));
    const unread = (Core.state.messages.items || []).filter(m => m.unread).length;
    set('stat-gmail', unread, unread ? t('nepřečtené zprávy', 'unread messages') : t('vše přečteno', 'all read'));
    const items = (Core.state.agenda.items && Core.state.agenda.items.length ? Core.state.agenda.items : Core.state.events.items) || [];
    const next = items.slice().sort((a, b) => new Date((a.start && a.start.dateTime) || 0) - new Date((b.start && b.start.dateTime) || 0))[0];
    if (next && next.start && next.start.dateTime) {
      const tm = new Date(next.start.dateTime);
      set('stat-next', tm.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }), esc(next.title));
    } else {
      set('stat-next', '—', t('žádná nadcházející událost', 'no upcoming event'));
    }
  }

  /* ---------- RENDER: needs-you (jednotná attention napříč zdroji) ---------- */
  const ATT_TONE = { high: 'red', medium: 'orange', low: 'cyan' };
  const ATT_ICON = { approval_required: 'check', agent_error: 'alert', budget_alert: 'alert', failed_run: 'alert', blocked: 'clock', reply_required: 'mail', review: 'eye' };
  function renderNeedsYou() {
    const targets = ['#needs-you', '#needs-you-pc'].map(s => $(s)).filter(Boolean);
    if (!targets.length) return;
    if (!Core.state.connected) { targets.forEach(tg => { tg.innerHTML = paperclipError(); }); return; }
    const rows = [];
    const att = Core.state.attention;
    (att && att.items || []).forEach(a => {
      const tone = ATT_TONE[a.priority] || 'cyan';
      const ic = ATT_ICON[a.type] || 'clock';
      const href = a.sourceUrl || '';
      rows.push('<div class="attention-item entering rail-' + tone + '" onclick="MC.openBoardHref(\'' + href.replace(/'/g, '') + '\')">' +
        '<div class="attention-icon" style="background:var(--' + tone + '-soft);color:var(--' + tone + ')">' + (I[ic] || I.alert) + '</div>' +
        '<div class="attention-body">' +
        '<div class="attention-meta"><span class="badge ' + tone + '">' + esc(a.type.replace(/_/g, ' ').toUpperCase()) + '</span>' + srcChip(a.source) + '<span class="micro">' + (a.createdAt ? fmtAgo(a.createdAt) : '') + '</span></div>' +
        '<div class="attention-title">' + esc(a.title) + '</div>' +
        '<div class="attention-desc">' + esc(cleanErr(a.reason) || '') + '</div>' +
        '<div class="attention-actions">' +
        (href ? '<button class="btn btn-' + (tone === 'red' ? 'danger' : 'warn') + ' btn-sm" onclick="event.stopPropagation();MC.openBoardHref(\'' + href.replace(/'/g, '') + '\')">' + I.ext + ' ' + t('OTEVŘÍT ORIGINÁL', 'OPEN ORIGINAL') + '</button>' : '') +
        '<button class="btn btn-soft btn-sm" onclick="event.stopPropagation();MC.createTaskModal()">' + I.task + ' ' + t('VYTVOŘIT ÚKOL', 'CREATE TASK') + '</button>' +
        '</div></div></div>');
    });
    if (!rows.length) {
      targets.forEach(tg => { tg.innerHTML = '<div class="card pad" style="display:flex;align-items:center;gap:12px;color:var(--text2)"><span class="attention-icon" style="background:var(--green-soft);color:var(--green)">' + I.check + '</span><div><div style="font-weight:600;color:var(--text)">' + t('Nic nepotřebuje tvou pozornost.', 'Nothing needs your attention.') + '</div><div class="small muted2">' + t('Žádné chyby, blokace ani čekající rozhodnutí.', 'No errors, blocks or pending decisions.') + '</div></div></div>'; });
      return;
    }
    const html = rows.join('');
    targets.forEach(tg => { tg.innerHTML = html; });
  }

  /* ---------- RENDER: paperclip stats (view paperclip) ---------- */
  function renderPaperclipStats() {
    if (!Core.state.connected) return;
    const set = (id, v, sub) => {
      const el = $('#' + id); if (!el) return;
      el.innerHTML = v;
      const card = el.closest('.card'); if (card) { const s = card.querySelector('.stat-sub'); if (s && sub) s.textContent = sub; }
    };
    const appr = (Core.state.decisions.items || []).length;
    const running = Core.state.agents.items.filter(a => a.status === 'running').length;
    const err = Core.state.agents.items.filter(a => a.status === 'error').length;
    const done = (Core.state.overview && Core.state.overview.tasks && Core.state.overview.tasks.done) || Core.state.tasks.items.filter(i => i.status === 'done').length;
    const blocked = Core.state.tasks.items.filter(i => i.status === 'blocked').length;
    set('pc-stat-dec', appr, appr ? t('čeká na schválení', 'awaiting approval') : t('vše vyřízeno', 'all handled'));
    set('pc-stat-working', running + ' <span class="dot live green" style="display:inline-block;vertical-align:middle"></span>', running ? t('agenti běží', 'agents running') : t('žádný agent nepracuje', 'no agent working'));
    set('pc-stat-done', done, t('dokončeno celkem', 'done total'));
    set('pc-stat-blocked', blocked, blocked ? t('vyžaduje pozornost', 'needs attention') : t('žádné blokace', 'no blocks'));
  }

  /* ---------- RENDER: perf panel (home, reálný stav) ---------- */
  function renderPerf() {
    const host = $('#perf-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const d = Core.state.overview || {};
    const ag = d.agents || {};
    const att = Core.state.attention;
    const appr = (Core.state.decisions.items || []).length;
    host.innerHTML =
      '<div class="card pad" style="padding:12px 14px;margin-bottom:10px">' +
      '<div class="flex items-center gap-8"><span class="dot live green"></span><span class="h-sub" style="font-size:13px">' + t('Agenti', 'Agents') + '</span><span class="badge purple" style="margin-left:auto">' + (ag.active || Core.state.agents.items.length) + ' active</span></div>' +
      '<div class="flex items-center gap-8 mt-8 wrap">' +
      '<span class="chip">' + (ag.running || 0) + ' running</span><span class="chip">' + (ag.error || 0) + ' error</span><span class="chip">' + (ag.paused || 0) + ' paused</span></div></div>' +
      '<div class="card pad" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid var(--' + (att && att.totalCount ? 'red' : 'green') + ')">' +
      '<div class="flex items-center gap-8"><span class="dot ' + (att && att.totalCount ? 'red' : 'green') + '"></span><span class="h-sub" style="font-size:13px">' + t('Pozornost', 'Attention') + '</span><span class="badge ' + (att && att.totalCount ? 'red' : 'green') + '" style="margin-left:auto">' + (att ? att.totalCount : 0) + '</span></div>' +
      '<div class="small muted2 mt-8">' + (att && att.items && att.items[0] ? esc(att.items[0].title) : t('Žádná pozornost není potřeba.', 'No attention needed.')) + '</div></div>' +
      '<div class="card pad" style="padding:12px 14px">' +
      '<div class="flex items-center gap-8"><span class="dot orange"></span><span class="h-sub" style="font-size:13px">' + t('Schválení', 'Approvals') + '</span><span class="badge orange" style="margin-left:auto">' + appr + '</span></div>' +
      '<div class="small muted2 mt-8">' + (appr ? t('Čekají na tvé rozhodnutí.', 'Awaiting your decision.') : t('Žádná čekající schválení.', 'No pending approvals.')) + '</div></div>';
  }

  /* ---------- RENDER: decisions (reálné approvals) ---------- */
  function renderDecisionsView() {
    const host = $('#decisions-list'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const list = Core.state.decisions.items || [];
    if (!list.length) {
      host.innerHTML = noData(t('Žádná čekající rozhodnutí', 'No decisions waiting'), t('Rozhodnutí se tu zobrazí automaticky — včetně plného kontextu a schválení/zamítnutí přímo odsud.', 'Decisions appear here automatically — with full context and approve/reject right here.'));
      return;
    }
    host.innerHTML = list.map(d =>
      '<div class="card pad rail-orange hoverable" style="cursor:pointer;margin-bottom:12px" onclick="MC.showDecision(\'' + d.id + '\')">' +
      '<div class="flex items-center gap-12">' +
      '<div class="attention-icon" style="background:var(--orange-soft);color:var(--orange)">' + I.check + '</div>' +
      '<div class="grow">' +
      '<div class="attention-meta"><span class="badge orange">' + t('SCHVÁLENÍ', 'APPROVAL') + '</span><span class="micro">created ' + (d.createdAt ? fmtAgo(d.createdAt) : '') + '</span></div>' +
      '<div class="attention-title">' + esc(d.title || d.id.slice(0, 8)) + '</div>' +
      '<div class="attention-desc">' + esc((d.summary || '').slice(0, 140)) + '</div>' +
      '</div>' + I.chev + '</div>' +
      '<div class="btn-row mt-12">' +
      '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();MC.resolveDecision(\'' + d.id + '\',\'approve\')">' + I.check + ' ' + t('SCHVÁLIT', 'APPROVE') + '</button>' +
      '<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();MC.resolveDecision(\'' + d.id + '\',\'reject\')">' + I.x + ' ' + t('ZAMÍTNOUT', 'REJECT') + '</button>' +
      '</div></div>').join('');
  }

  /* ---------- RENDER: working now ---------- */
  function renderWorkingNow() {
    const targets = ['#working-now', '#working-now-pc'].map(s => $(s)).filter(Boolean);
    if (!targets.length) return;
    if (!Core.state.connected) { targets.forEach(tg => { tg.innerHTML = paperclipError(); }); return; }
    const running = Core.state.agents.items.filter(a => a.status === 'running');
    const inProg = Core.state.tasks.items.filter(i => i.status === 'in_progress');
    const html = [];
    running.forEach(a => {
      html.push('<div class="row">' +
        '<div class="avatar-wrap"><span class="avatar" style="background:var(--purple-soft);color:var(--purple)">' + esc(a.name.slice(0, 2).toUpperCase()) + '</span><span class="online-dot" style="background:var(--green)"></span></div>' +
        '<div class="row-main"><div class="row-title"><span class="dot live green"></span>' + esc(a.name) + '</div>' +
        '<div class="row-sub"><b style="color:var(--text2);font-weight:600">' + esc(a.title || a.role) + '</b> · ' + (a.model || '') + '</div>' +
        '<div class="row-sub">' + t('status: běží', 'status: running') + ' · heartbeat ' + (a.lastHeartbeatAt ? fmtAgo(a.lastHeartbeatAt) : '—') + '</div></div>' +
        '<div class="row-right"><button class="btn btn-ghost btn-sm" onclick="MC.openBoardHref(\'' + (a.sourceUrl || '').replace(/'/g, '') + '\')">' + t('OTEVŘÍT', 'OPEN') + '</button></div></div>');
    });
    inProg.forEach(b => {
      html.push('<div class="row" onclick="MC.showTask(\'' + b.id + '\')">' +
        '<div class="avatar" style="background:var(--purple-soft);color:var(--purple)">' + I.zap + '</div>' +
        '<div class="row-main"><div class="row-title"><span class="dot live purple"></span><span class="t task-title-main">' + esc(b.title.slice(0, 80)) + '</span> <span class="id-sm">' + esc(b.identifier) + '</span></div>' +
        '<div class="row-sub">' + t('v řešení', 'in progress') + ' · ' + t('začalo', 'started') + ' ' + (b.startedAt ? fmtAgo(b.startedAt) : '—') + '</div></div>' +
        '<div class="row-right"><button class="btn btn-ghost btn-sm">' + t('OTEVŘÍT ÚKOL', 'OPEN TASK') + '</button></div></div>');
    });
    if (!html.length) {
      targets.forEach(tg => { tg.innerHTML = '<div class="card pad" style="color:var(--text3);font-size:12.5px">' + t('Žádný agent právě nepracuje.', 'No agent is working right now.') + ' ' + t('Aktivní: ', 'Active: ') + (Core.state.overview && Core.state.overview.agents ? Core.state.overview.agents.active : Core.state.agents.items.length) + ' ' + t('agentů.', 'agents.') + '</div>'; });
      return;
    }
    const out = html.join('');
    targets.forEach(tg => { tg.innerHTML = out; });
  }

  /* ---------- RENDER: recent results (dokončené úkoly) ---------- */
  function renderRecentResults() {
    const targets = ['#recent-results', '#recent-results-pc'].map(s => $(s)).filter(Boolean);
    if (!targets.length) return;
    if (!Core.state.connected) { targets.forEach(tg => { tg.innerHTML = paperclipError(); }); return; }
    const done = Core.state.tasks.items.filter(i => i.status === 'done')
      .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt)).slice(0, 5);
    if (!done.length) { targets.forEach(tg => { tg.innerHTML = noData(t('Nic zatím dokončeno', 'Nothing completed yet'), t('Dokončené úkoly se objeví tady.', 'Completed tasks appear here.')); }); return; }
    const out = done.map(tk =>
      '<div class="row" onclick="MC.showTask(\'' + tk.id + '\')">' +
      '<div class="avatar"><span style="color:var(--green)">' + I.check + '</span></div>' +
      '<div class="row-main"><div class="row-title">' + esc(tk.identifier) + ' <span class="badge green">DONE</span></div>' +
      '<div class="row-sub">' + esc(tk.title.slice(0, 60)) + ' · ' + (tk.completedAt ? fmtAgo(tk.completedAt) : fmtAgo(tk.updatedAt)) + '</div></div>' +
      '<div class="row-right"><button class="btn btn-ghost btn-sm">' + t('OTEVŘÍT ÚKOL', 'OPEN TASK') + '</button></div></div>').join('');
    targets.forEach(tg => { tg.innerHTML = out; });
  }

  /* ---------- RENDER: recent activity feed ---------- */
  function renderLiveFeed() {
    const targets = ['#live-feed', '#live-feed-2'].map(s => $(s)).filter(Boolean);
    if (!targets.length) return;
    if (!Core.state.connected) { targets.forEach(tg => { tg.innerHTML = paperclipError(); }); return; }
    const recent = Core.state.tasks.items.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 6);
    if (!recent.length) { targets.forEach(tg => { tg.innerHTML = noData(t('Zatím žádné úkoly', 'No issues yet'), t('Poslední aktivita úkolů.', 'Latest task activity.')); }); return; }
    const stColor = { todo: 'gray', backlog: 'gray', in_progress: 'purple', blocked: 'red', done: 'green', cancelled: 'gray' };
    const out = recent.map(l =>
      '<div class="attention-item rail-blue" onclick="MC.showTask(\'' + l.id + '\')">' +
      '<div class="attention-body">' +
      '<div class="attention-meta"><span class="badge ' + (stColor[l.status] || 'gray') + '">' + esc((l.status || 'open').replace(/_/g, ' ').toUpperCase()) + '</span>' + srcChip(l.source) + '<span class="micro">' + t('aktualizováno', 'updated') + ' ' + fmtAgo(l.updatedAt || l.createdAt) + '</span></div>' +
      '<div class="attention-title"><span style="font-weight:600">' + esc(l.title.slice(0, 70)) + '</span> <span class="id-sm">' + esc(l.identifier) + '</span></div>' +
      '<div class="attention-desc">' + esc((l.description || '').replace(/\n/g, ' ').slice(0, 110)) + '</div>' +
      '<div class="attention-actions">' +
      '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();MC.showTask(\'' + l.id + '\')">' + t('OTEVŘÍT ÚKOL', 'OPEN TASK') + '</button>' +
      '<button class="btn btn-soft btn-sm" onclick="event.stopPropagation();MC.openBoardHref(\'/issues/' + l.identifier + '\')">' + I.ext + ' BOARD</button>' +
      '</div></div></div>').join('');
    targets.forEach(tg => { tg.innerHTML = out; });
  }

  /* ---------- RENDER: kanban (issues by status) — zachováno pro budoucí použití ---------- */
  function renderKanban() {
    const host = $('#kanban'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const cols = [
      ['BACKLOG', 'backlog', 'gray'], ['TODO', 'todo', 'cyan'], ['IN PROGRESS', 'in_progress', 'purple'],
      ['BLOCKED', 'blocked', 'red'], ['DONE', 'done', 'green'], ['CANCELLED', 'cancelled', 'gray']
    ];
    host.innerHTML = cols.map(([name, st, dot]) => {
      const list = Core.state.tasks.items.filter(i => i.status === st);
      const cards = list.slice(0, 8).map(l =>
        '<div class="kcard" onclick="MC.showTask(\'' + l.id + '\')">' +
        '<div class="kc-top"><span class="dot ' + dot + '"></span><span class="micro" style="margin-left:auto">' + (l.updatedAt ? fmtAgo(l.updatedAt) : '') + '</span></div>' +
        '<div class="kc-title">' + esc(l.identifier) + '</div>' +
        '<div class="kc-meta">' + esc(l.title.slice(0, 44)) + '</div>' +
        '<div class="kc-foot"><span class="micro">' + esc(sid(l.projectId)) + '</span>' + I.chev + '</div>' +
        '</div>').join('') || '<div class="state" style="padding:18px 10px"><div class="st-desc">' + t('Prázdné', 'Empty') + '</div></div>';
      return '<div class="kcol"><div class="kcol-head"><span class="dot ' + dot + '"></span>' + name + '<span class="cnt">' + list.length + '</span></div>' + cards + '</div>';
    }).join('');
  }

  /* ---------- RENDER: agents view (dlaždice: celkem úkolů, poslední běh, celá klikací → detail) ---------- */
  function renderAgentsView() {
    const host = $('#agents-grid'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const stColor = { idle: 'gray', running: 'green', paused: 'orange', error: 'red' };
    const agents = Core.state.agents.items;
    const tasks = Core.state.tasks.items;
    host.innerHTML = agents.map(a => {
      const myTasks = tasks.filter(tk => tk.assigneeAgentId === a.id);
      const openN = myTasks.filter(tk => ['todo', 'backlog', 'in_progress', 'blocked'].includes(tk.status)).length;
      const doneN = myTasks.filter(tk => tk.status === 'done').length;
      const lastRun = a.lastHeartbeatAt || (myTasks.length ? myTasks[0].updatedAt : null);
      const tone = a.status === 'error' ? 'red' : a.status === 'paused' ? 'orange' : a.status === 'running' ? 'green' : 'purple';
      return '<div class="card pad clickable agent-tile" onclick="MC.showAgent(\'' + a.id + '\')">' +
        '<div class="flex items-center gap-10 mb-8">' +
        '<span class="avatar lg" style="background:var(--' + tone + '-soft);color:var(--' + tone + ')">' + esc((a.name || '?').slice(0, 2).toUpperCase()) + '</span>' +
        '<div class="grow"><div class="h-sub">' + esc(a.name) + '</div><div class="micro">' + esc(a.title || a.role || '') + '</div></div>' +
        '<span class="badge ' + (stColor[a.status] || 'gray') + '">' + esc((a.status || 'idle').toUpperCase()) + '</span>' +
        srcChip(a.source) + '</div>' +
        (a.status === 'error' && a.errorReason ? '<div class="ai-note mt-8" style="border-color:rgba(248,113,113,.35);background:linear-gradient(160deg,rgba(248,113,113,.08),transparent 70%),var(--surface)"><div class="ai-mark" style="color:var(--red)">' + I.alert + ' ERROR</div>' + esc(cleanErr(a.errorReason)) + '</div>' : '') +
        '<div class="flex items-center gap-8 wrap mt-8">' +
        '<span class="chip">' + I.task + ' ' + t('celkem', 'total') + ': <b>' + myTasks.length + '</b></span>' +
        '<span class="chip">' + t('otevřeno', 'open') + ': <b>' + openN + '</b></span>' +
        '<span class="chip">' + t('hotovo', 'done') + ': <b>' + doneN + '</b></span>' +
        '<span class="chip">' + I.clock + ' ' + t('poslední běh', 'last run') + ': <b>' + (lastRun ? fmtAgo(lastRun) : '—') + '</b></span>' +
        '</div>' +
        '<div class="flex items-center gap-8 wrap mt-8">' +
        (a.model ? '<span class="chip">' + esc(a.model) + '</span>' : '') +
        (a.role ? '<span class="chip">' + esc(a.role) + '</span>' : '') +
        '<span class="micro" style="margin-left:auto;color:var(--text4)">' + t('detail', 'details') + ' ' + I.chev + '</span>' +
        '</div></div>';
    }).join('');
  }

  /* ---------- RENDER: agent detail ---------- */
  function renderAgentDetail(id) {
    const host = $('#agent-detail-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const a = Core.state.agents.items.find(x => x.id === id);
    if (!a) { host.innerHTML = noData(t('Agent nenalezen', 'Agent not found'), t('Tento agent není v aktuálních datech.', 'This agent is not in current data.')); return; }
    const myTasks = Core.state.tasks.items.filter(tk => tk.assigneeAgentId === a.id)
      .sort((x, y) => new Date(y.updatedAt || 0) - new Date(x.updatedAt || 0));
    const openN = myTasks.filter(tk => ['todo', 'backlog', 'in_progress', 'blocked'].includes(tk.status)).length;
    const doneN = myTasks.filter(tk => tk.status === 'done').length;
    const stBadge = { todo: ['gray', 'TODO'], backlog: ['gray', 'BACKLOG'], in_progress: ['purple', 'IN PROGRESS'], blocked: ['red', 'BLOCKED'], done: ['green', 'DONE'], cancelled: ['gray', 'CANCELLED'] };
    const tone = a.status === 'error' ? 'red' : a.status === 'paused' ? 'orange' : a.status === 'running' ? 'green' : 'purple';
    host.innerHTML =
      '<div class="flex items-center gap-12 mb-16">' +
      '<span class="avatar lg" style="width:52px;height:52px;font-size:18px;background:var(--' + tone + '-soft);color:var(--' + tone + ')">' + esc((a.name || '?').slice(0, 2).toUpperCase()) + '</span>' +
      '<div class="grow"><div class="h-display" style="font-size:24px">' + esc(a.name) + '</div>' +
      '<div class="muted small">' + esc(a.title || a.role || '') + (a.model ? ' · ' + esc(a.model) : '') + '</div></div>' +
      '<span class="badge ' + (a.status === 'error' ? 'red' : a.status === 'running' ? 'green' : a.status === 'paused' ? 'orange' : 'gray') + '">' + esc((a.status || 'idle').toUpperCase()) + '</span>' +
      srcChip(a.source) + '</div>' +
      (a.status === 'error' && a.errorReason ? '<div class="ai-note mb-16" style="border-color:rgba(248,113,113,.35);background:linear-gradient(160deg,rgba(248,113,113,.08),transparent 70%),var(--surface)"><div class="ai-mark" style="color:var(--red)">' + I.alert + ' ERROR</div>' + esc(cleanErr(a.errorReason)) + '</div>' : '') +
      '<div class="stat-row mb-16" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat card pad"><div class="stat-label">' + t('CELKEM ÚKOLŮ', 'TOTAL TASKS') + '</div><div class="stat-value num">' + myTasks.length + '</div><div class="stat-sub">' + t('přiřazeno agentovi', 'assigned to agent') + '</div></div>' +
      '<div class="stat card pad"><div class="stat-label">' + t('OTEVŘENO', 'OPEN') + '</div><div class="stat-value num" style="color:var(--orange)">' + openN + '</div><div class="stat-sub">' + t('v řešení', 'in progress') + '</div></div>' +
      '<div class="stat card pad"><div class="stat-label">' + t('HOTOVO', 'DONE') + '</div><div class="stat-value num" style="color:var(--green)">' + doneN + '</div><div class="stat-sub">' + t('dokončeno', 'completed') + '</div></div>' +
      '<div class="stat card pad"><div class="stat-label">' + t('POSLEDNÍ BĚH', 'LAST RUN') + '</div><div class="stat-value num" style="font-size:15px">' + (a.lastHeartbeatAt ? fmtAgo(a.lastHeartbeatAt) : '—') + '</div><div class="stat-sub">' + (a.lastHeartbeatAt ? fmtDate(a.lastHeartbeatAt) : t('bez běhu', 'no run yet')) + '</div></div>' +
      '</div>' +
      '<div class="card pad mb-16"><div class="eyebrow mb-8">' + t('ÚKOLY AGENTA', 'AGENT TASKS') + ' · ' + myTasks.length + '</div>' +
      (myTasks.length ? myTasks.slice(0, 25).map(tk =>
        '<div class="row" onclick="MC.showTask(\'' + tk.id + '\')">' +
        '<div class="avatar" style="background:var(--surface3);color:var(--purple)">' + I.task + '</div>' +
        '<div class="row-main"><div class="row-title"><span class="t task-title-main">' + esc(tk.title.slice(0, 80)) + '</span> <span class="id-sm">' + esc(tk.identifier) + '</span> ' +
        '<span class="badge ' + (stBadge[tk.status] || ['gray', tk.status])[0] + '" style="font-size:8.5px">' + (stBadge[tk.status] || ['gray', tk.status])[1] + '</span></div>' +
        '<div class="row-sub">' + srcChip(tk.source) + '<span class="micro">' + t('aktualizováno', 'updated') + ' ' + fmtAgo(tk.updatedAt) + '</span></div></div>' + I.chev + '</div>').join('')
        : '<div class="small muted2">' + t('Žádné úkoly.', 'No tasks.') + '</div>') + '</div>' +
      '<div class="btn-row">' +
      (a.sourceUrl ? '<button class="btn btn-ghost btn-sm" onclick="MC.openBoardHref(\'' + a.sourceUrl.replace(/'/g, '') + '\')">' + I.ext + ' ' + t('OTEVŘÍT ORIGINÁL', 'OPEN ORIGINAL') + '</button>' : '') +
      '<button class="btn btn-soft btn-sm" onclick="MC.openModal(\'task-modal\')">' + I.plus + ' ' + t('NOVÝ ÚKOL', 'NEW TASK') + '</button>' +
      '</div>';
  }

  /* ---------- RENDER: tasks view (otevřené úkoly — hlavně NÁZEV, DRE maličké) ---------- */
  function renderTasksView() {
    const host = $('#tasks-list'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const open = Core.state.tasks.items.filter(i => ['todo', 'backlog', 'in_progress', 'blocked'].includes(i.status))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!open.length) { host.innerHTML = noData(t('Žádné otevřené úkoly', 'No open tasks'), t('Všechny úkoly jsou hotové.', 'All tasks are done.')); return; }
    const stBadge = { todo: ['gray', 'TODO'], backlog: ['gray', 'BACKLOG'], in_progress: ['purple', 'IN PROGRESS'], blocked: ['red', 'BLOCKED'] };
    host.innerHTML = open.map(tk =>
      '<div class="row" onclick="MC.showTask(\'' + tk.id + '\')">' +
      '<div class="avatar" style="background:var(--surface3);color:var(--purple)">' + I.task + '</div>' +
      '<div class="row-main">' +
      '<div class="row-title"><span class="t task-title-main">' + esc(tk.title.slice(0, 90)) + '</span> <span class="id-sm">' + esc(tk.identifier) + '</span> ' +
      '<span class="badge ' + (stBadge[tk.status] || ['gray', tk.status])[0] + '" style="font-size:8.5px">' + (stBadge[tk.status] || ['gray', tk.status])[1] + '</span></div>' +
      '<div class="row-sub">' + srcChip(tk.source) + '<span class="micro">' + t('aktualizováno', 'updated') + ' ' + fmtAgo(tk.updatedAt) + '</span></div></div>' +
      '<div class="row-right">' + I.chev + '</div></div>').join('');
  }

  /* ---------- RENDER: projects view ---------- */
  function renderProjectsView() {
    const targets = ['#projects-grid', '#companies-grid'].map(s => $(s)).filter(Boolean);
    if (!targets.length) return;
    if (!Core.state.connected) { targets.forEach(tg => { tg.innerHTML = paperclipError(); }); return; }
    const ps = Core.state.projects.items;
    if (!ps.length) { targets.forEach(tg => { tg.innerHTML = noData(t('Žádné projekty', 'No projects'), t('Zatím nejsou žádné projekty.', 'No projects yet.')); }); return; }
    const stColor = { in_progress: 'green', planned: 'blue', backlog: 'gray', archived: 'gray' };
    const html = ps.map(p => {
      const issues = Core.state.tasks.items.filter(i => i.projectId === p.id);
      const openN = issues.filter(i => ['todo', 'backlog', 'in_progress', 'blocked'].includes(i.status)).length;
      const doneN = issues.filter(i => i.status === 'done').length;
      return '<div class="card pad rail-' + (stColor[p.status] || 'green') + '">' +
        '<div class="flex items-center gap-8 mb-8"><span class="h-sub" style="font-size:13.5px">' + esc(p.name) + '</span>' +
        '<span class="badge ' + (stColor[p.status] || 'green') + '" style="margin-left:auto;font-size:9px">' + esc((p.status || 'planned').replace(/_/g, ' ').toUpperCase()) + '</span>' + srcChip(p.source) + '</div>' +
        '<div class="row-sub mb-8"><b style="color:var(--text2)">' + issues.length + ' ' + t('úkolů', 'tasks') + '</b> · ' + openN + ' ' + t('otevřeno', 'open') + ' · ' + doneN + ' ' + t('hotovo', 'done') + '</div>' +
        '<div class="flex items-center gap-8 wrap mb-8">' +
        (p.goals && p.goals[0] ? '<span class="chip">' + esc(p.goals[0].title.slice(0, 24)) + '</span>' : '') +
        '<span class="chip">' + esc(p.urlKey || '') + '</span></div>' +
        '<div class="btn-row mt-8"><button class="btn btn-ghost btn-sm" onclick="MC.openBoardHref(\'' + (p.sourceUrl || '').replace(/'/g, '') + '\')">' + t('OTEVŘÍT ORIGINÁL', 'OPEN ORIGINAL') + '</button></div>' +
        '</div>';
    }).join('');
    targets.forEach(tg => { tg.innerHTML = html; });
  }

  /* ---------- RENDER: TURBOW view ---------- */
  function renderTurbow() {
    const host = $('#turbow-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const tw = Core.state.turbow.root;
    if (!tw) { host.innerHTML = noData(t('TURBOW projekt nenalezen', 'TURBOW project not found'), t('Zatím neexistuje žádný TURBOW projekt.', 'No TURBOW project yet.')); return; }
    const subtree = Core.state.turbow.subtree || [];
    const kids = subtree.filter(i => i.parentId === tw.id);
    const doneN = subtree.filter(i => i.status === 'done').length;
    const openN = subtree.length - doneN;
    const statusBadge = { done: 'green', in_progress: 'purple', blocked: 'red', todo: 'gray', backlog: 'gray' };
    host.innerHTML =
      '<div class="card pad mb-16" style="border-color:rgba(139,92,246,.3)">' +
      '<div class="flex items-center gap-10 wrap mb-8">' +
      '<span class="badge ' + (statusBadge[tw.status] || 'gray') + '">' + esc(tw.status.toUpperCase()) + '</span>' +
      '<span class="badge purple">' + esc(tw.identifier) + '</span>' +
      '<span class="micro">' + (tw.updatedAt ? 'updated ' + fmtAgo(tw.updatedAt) : '') + '</span>' +
      '<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="MC.openBoardHref(\'' + (tw.sourceUrl || '').replace(/'/g, '') + '\')">' + I.ext + ' ' + t('OTEVŘÍT ORIGINÁL', 'OPEN ORIGINAL') + '</button></div>' +
      '<div class="h-display" style="font-size:24px">' + esc(tw.title) + '</div>' +
      '<div class="small muted mt-8" style="max-width:900px;white-space:pre-line">' + esc((tw.description || '').slice(0, 900)) + '</div>' +
      '</div>' +
      '<div class="stat-row mb-16" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat card pad"><div class="stat-label">SUBTREE</div><div class="stat-value num">' + subtree.length + '</div><div class="stat-sub">' + t('úkolů včetně podúkolů', 'tasks including subtasks') + '</div></div>' +
      '<div class="stat card pad"><div class="stat-label">DONE</div><div class="stat-value num" style="color:var(--green)">' + doneN + '</div><div class="stat-sub">' + t('dokončeno', 'completed') + '</div></div>' +
      '<div class="stat card pad"><div class="stat-label">OPEN</div><div class="stat-value num" style="color:var(--orange)">' + openN + '</div><div class="stat-sub">' + t('otevřeno', 'open') + '</div></div>' +
      '<div class="stat card pad"><div class="stat-label">TOP CHILDREN</div><div class="stat-value num">' + kids.length + '</div><div class="stat-sub">' + t('přímí potomci', 'direct children') + '</div></div>' +
      '</div>' +
      '<div class="card pad" style="padding:8px 12px"><div class="eyebrow mb-8">' + t('STRUKTURA — TOP LEVEL', 'STRUCTURE — TOP LEVEL') + '</div>' +
      (kids.length ? kids.slice(0, 8).map(k =>
        '<div class="row" onclick="MC.showTask(\'' + k.id + '\')">' +
        '<div class="avatar" style="background:var(--surface3);color:var(--' + (statusBadge[k.status] === 'green' ? 'green' : 'purple') + ')">' + I.task + '</div>' +
        '<div class="row-main"><div class="row-title">' + esc(k.identifier) + '</div><div class="row-sub">' + esc(k.title.slice(0, 70)) + '</div></div>' +
        '<span class="badge ' + (statusBadge[k.status] || 'gray') + '" style="font-size:8.5px">' + esc(k.status.toUpperCase()) + '</span>' + I.chev + '</div>').join('')
        : '<div class="small muted2">' + t('Žádní přímí potomci.', 'No direct children.') + '</div>') + '</div>';
  }

  /* ---------- RENDER: activity view ---------- */
  function renderActivity() {
    const host = $('#activity-stream'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const acts = Core.state.activity.items;
    if (!acts.length) { host.innerHTML = noData(t('Zatím žádná aktivita', 'No activity yet'), t('Zatím žádná aktivita.', 'No activity yet.')); return; }
    const tone = (a) => a.type && (a.type.includes('failed') || a.type.includes('error')) ? 'red' : a.type && (a.type.includes('created') || a.type.includes('completed') || a.type.includes('done')) ? 'green' : a.type && a.type.includes('approval') ? 'orange' : 'purple';
    host.innerHTML = '<div class="timeline">' + acts.slice(0, 30).map(a =>
      '<div class="tl-item ' + tone(a) + '"><div class="tl-time">' + (a.occurredAt ? fmtDate(a.occurredAt) : '') + '</div>' +
      '<div class="tl-title">' + esc(a.title || a.type || 'event') + '</div>' +
      '<div class="tl-desc">' + esc(((a.description) || '').slice(0, 120)) + ' · ' + esc((a.actorType || '') + (a.actorId ? ' ' + String(a.actorId).slice(0, 8) : '')) + '</div></div>').join('') + '</div>';
  }

  /* ---------- RENDER: not connected sections ---------- */
  function renderNotConnectedSections() {
    const map = {
      'websites-grid': ['globe', t('Weby nejsou připojeny', 'Websites not connected'), t('Žádná data. Web analytics / Search Console / TURBOW API integrace zatím nejsou napojené.', 'No data. Web analytics / Search Console / TURBOW API integrations are not connected yet.')],
      'documents-list': ['doc', t('Dokumenty nejsou připojeny', 'Documents not connected'), t('Žádná data — file-resources integrace není napojená.', 'No data — file-resources integration is not connected.')],
      'notes-list': ['note', t('Poznámky nejsou připojeny', 'Notes not connected'), t('Žádná data.', 'No data.')],
      'automations-list': ['zap', t('Automatizace nejsou připojeny', 'Automations not connected'), t('Žádná data — automatizace se zobrazí, až bude integrace hotová.', 'No data — automations will appear when the integration is ready.')]
    };
    Object.keys(map).forEach(id => {
      const el = $('#' + id); if (!el) return;
      el.innerHTML = notConnected(map[id][0], map[id][1], map[id][2]);
    });
  }

  /* ---------- RENDER: osobní přehled (PREMIUM) ---------- */
  function renderPersonal() {
    const gr = $('#p-greet');
    if (gr) {
      const hour = new Date().getHours();
      const greet = hour < 5 ? t('DOBROU NOC', 'GOOD NIGHT') : hour < 12 ? t('DOBRÉ RÁNO', 'GOOD MORNING') : hour < 18 ? t('DOBRÉ ODPOLEDNE', 'GOOD AFTERNOON') : t('DOBRÝ VEČER', 'GOOD EVENING');
      gr.innerHTML = greet + ', <span class="grad">MÍRO</span>';
    }
    const pd = $('#p-date'); if (pd) pd.textContent = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
    const sub = $('#p-sub');
    if (sub) {
      if (!Core.state.connected) { sub.innerHTML = paperclipError(); }
      else {
        const att = Core.state.attention ? Core.state.attention.totalCount : 0;
        const unread = (Core.state.messages.items || []).filter(m => m.unread).length;
        const blocked = Core.state.tasks.items.filter(i => i.status === 'blocked').length;
        const running = Core.state.agents.items.filter(a => a.status === 'running').length;
        const parts = [];
        if (att) parts.push('<b class="text-red">' + att + '</b> ' + t('k pozornosti', 'needs attention'));
        if (unread) parts.push('<b>' + unread + '</b> ' + t('nepřečtených e-mailů', 'unread emails'));
        if (blocked) parts.push('<b class="text-orange">' + blocked + '</b> ' + t('blokovaných úkolů', 'blocked tasks'));
        if (running) parts.push('<b class="text-green">' + running + '</b> ' + t('agentů běží', 'agents running'));
        sub.innerHTML = parts.length ? t('Dnes: ', 'Today: ') + parts.join(' · ') : t('Vše v pořádku — žádné urgentní věci.', 'All good — nothing urgent.');
      }
    }
    // hero staty
    const stats = $('#p-stats');
    if (stats) {
      const d = Core.state.overview || {};
      const tsk = d.tasks || {};
      const ag = d.agents || {};
      const unread = (Core.state.messages.items || []).filter(m => m.unread).length;
      const items = (Core.state.agenda.items && Core.state.agenda.items.length ? Core.state.agenda.items : Core.state.events.items) || [];
      const next = items.slice().sort((a, b) => new Date((a.start && a.start.dateTime) || 0) - new Date((b.start && b.start.dateTime) || 0))[0];
      const cost = d.costs && d.costs.monthSpendCents != null ? (d.costs.monthSpendCents / 100).toFixed(2) : '—';
      const tile = (label, value, subv, tone) =>
        '<div class="p-stat card pad"><div class="stat-label">' + label + '</div><div class="stat-value ' + (tone || '') + '">' + value + '</div><div class="stat-sub">' + subv + '</div></div>';
      stats.innerHTML =
        tile(t('OTEVŘENÉ ÚKOLY', 'OPEN TASKS'), tsk.open != null ? tsk.open : '—', (tsk.inProgress || 0) + ' ' + t('v řešení', 'in progress'), 'text-cyan') +
        tile(t('NEPŘEČTENÉ', 'UNREAD'), unread, t('e-mailů v Gmailu', 'emails in Gmail'), 'text-orange') +
        tile(t('PŘÍŠTÍ UDÁLOST', 'NEXT EVENT'), (next && next.start && next.start.dateTime) ? new Date(next.start.dateTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—', next ? esc(next.title) : t('žádná', 'none'), 'text-purple') +
        tile(t('NÁKLADY MĚSÍC', 'MONTHLY COST'), cost, t('USD za měsíc', 'USD per month'), 'text-green') +
        tile(t('AGENTI', 'AGENTS'), ag.active != null ? ag.active : Core.state.agents.items.length, (ag.running || 0) + ' ' + t('běží', 'running') + ' · ' + (ag.error || 0) + ' error', '') +
        tile(t('HOTOVO CELKEM', 'DONE TOTAL'), tsk.done != null ? tsk.done : '—', t('úkolů', 'tasks'), 'text-green');
    }
    // agenda
    const agenda = $('#p-agenda');
    if (agenda) {
      if (!Core.state.connected) agenda.innerHTML = paperclipError();
      else {
        const items = (Core.state.agenda.items && Core.state.agenda.items.length ? Core.state.agenda.items : Core.state.events.items) || [];
        agenda.innerHTML = items.length
          ? items.slice(0, 5).map(e =>
              '<div class="row" style="cursor:pointer" onclick="MC.openBoardHref(\'' + (e.sourceUrl || '').replace(/'/g, '') + '\')">' +
              '<span class="num p-time">' + (e.start && e.start.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : t('celý den', 'all day')) + '</span>' +
              '<div class="row-main"><div class="row-title" style="font-size:12.5px">' + esc(e.title) + '</div>' +
              '<div class="row-sub">' + (e.location ? esc(e.location) + ' · ' : '') + (e.start && e.start.dateTime ? fmtAgo(e.start.dateTime) : '') + '</div></div></div>').join('')
          : '<div class="small muted2" style="padding:8px 2px">' + t('Žádné nadcházející události.', 'No upcoming events.') + '</div>';
      }
    }
    // e-maily
    const mail = $('#p-mail');
    if (mail) {
      if (!Core.state.connected) mail.innerHTML = paperclipError();
      else {
        const msgs = (Core.state.messages.items || []).slice().sort((a, b) => (b.unread - a.unread) || (new Date(b.date || 0) - new Date(a.date || 0)));
        mail.innerHTML = msgs.length
          ? msgs.slice(0, 5).map(m =>
              '<div class="row" style="cursor:pointer;' + (m.unread ? 'background:var(--surface-soft);border-left:3px solid var(--orange)' : '') + '" onclick="MC.openMail(\'' + m.id + '\')">' +
              '<span class="num" style="width:14px">' + (m.unread ? '<span class="dot live orange"></span>' : '') + '</span>' +
              '<div class="row-main"><div class="row-title" style="font-size:12.5px">' + esc(m.subject) + '</div>' +
              '<div class="row-sub">' + esc(m.fromName || m.fromEmail || '?') + ' · ' + (m.date ? fmtAgo(m.date) : '') + '</div></div></div>').join('')
          : '<div class="small muted2" style="padding:8px 2px">' + t('Žádné zprávy.', 'No messages.') + '</div>';
      }
    }
    // úkoly
    const tasks = $('#p-tasks');
    if (tasks) {
      if (!Core.state.connected) tasks.innerHTML = paperclipError();
      else {
        const open = Core.state.tasks.items.filter(i => ['todo', 'backlog', 'in_progress', 'blocked'].includes(i.status)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
        const stBadge = { todo: ['gray', 'TODO'], backlog: ['gray', 'BACKLOG'], in_progress: ['purple', 'IN PROGRESS'], blocked: ['red', 'BLOCKED'] };
        tasks.innerHTML = open.length
          ? open.map(tk =>
              '<div class="row" onclick="MC.showTask(\'' + tk.id + '\')">' +
              '<div class="row-main"><div class="row-title"><span class="t task-title-main" style="font-size:12.5px">' + esc(tk.title.slice(0, 70)) + '</span> <span class="id-sm">' + esc(tk.identifier) + '</span></div>' +
              '<div class="row-sub"><span class="badge ' + (stBadge[tk.status] || ['gray', tk.status])[0] + '" style="font-size:8px">' + (stBadge[tk.status] || ['gray', tk.status])[1] + '</span><span class="micro">' + t('aktualizováno', 'updated') + ' ' + fmtAgo(tk.updatedAt) + '</span></div></div>' + I.chev + '</div>').join('')
          : '<div class="small muted2" style="padding:8px 2px">' + t('Žádné otevřené úkoly.', 'No open tasks.') + '</div>';
      }
    }
    // pozornost
    const attHost = $('#p-attention');
    if (attHost) {
      if (!Core.state.connected) attHost.innerHTML = paperclipError();
      else {
        const list = (Core.state.attention && Core.state.attention.items) || [];
        attHost.innerHTML = list.length
          ? list.slice(0, 4).map(a => {
              const tone = ATT_TONE[a.priority] || 'cyan';
              return '<div class="attention-item entering rail-' + tone + '" style="padding:10px 12px" onclick="MC.openBoardHref(\'' + (a.sourceUrl || '').replace(/'/g, '') + '\')">' +
                '<div class="attention-icon" style="width:30px;height:30px;background:var(--' + tone + '-soft);color:var(--' + tone + ')">' + (I[ATT_ICON[a.type] || 'clock'] || I.alert) + '</div>' +
                '<div class="attention-body"><div class="attention-title" style="font-size:12.5px">' + esc(a.title) + '</div>' +
                '<div class="attention-desc">' + esc(cleanErr(a.reason) || '') + '</div></div></div>';
            }).join('')
          : '<div class="small muted2" style="padding:8px 2px">' + t('Nic nepotřebuje tvou pozornost.', 'Nothing needs your attention.') + '</div>';
      }
    }
    // ANALYTIKA (kompaktní: run aktivita + náklady + GA4)
    const pan = $('#p-analytics');
    if (pan) {
      if (!Core.state.connected) { pan.innerHTML = paperclipError(); }
      else {
        const d = Core.state.overview;
        let html = '';
        if (d && d.runActivity) {
          const ra = d.runActivity.slice(-14);
          const max = Math.max(1, ...ra.map(r => r.total));
          html += '<div class="flex items-end gap-6" style="height:80px;align-items:flex-end">' +
            ra.map(r => '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">' +
              '<span class="micro num">' + r.total + '</span>' +
              '<div style="width:100%;background:var(--purple);opacity:.55;border-radius:3px 3px 0 0;height:' + Math.max(2, Math.round(r.total / max * 100)) + '%"></div>' +
              '<span class="micro" style="color:var(--text4)">' + fmtDay(r.date) + '</span></div>').join('') + '</div>';
        }
        const costCard = '<div class="card pad" style="padding:12px"><div class="eyebrow mb-6">' + t('NÁKLADY MĚSÍC', 'MONTHLY COST') + '</div><div class="stat-value num" style="font-size:20px">' + (d && d.costs && d.costs.monthSpendCents != null ? (d.costs.monthSpendCents / 100).toFixed(2) : '—') + ' <span style="font-size:11px;color:var(--text3)">USD</span></div>' +
          '<div class="small muted2 mt-6">' + (d && d.costs ? t('Využití rozpočtu: ', 'Budget utilization: ') + (d.costs.monthUtilizationPercent || 0) + ' %' : '') + '</div></div>';
        const ga = Core.state.analytics || {};
        if (ga.daily && ga.daily.length) {
          const mx = Math.max(1, ...ga.daily.map(x => x.sessions));
          const gaCard = '<div class="card pad" style="padding:12px"><div class="eyebrow mb-6">' + t('WEB GA4', 'WEB GA4') + ' · ' + fmtDay(ga.daily[0].date) + ' → ' + fmtDay(ga.daily[ga.daily.length - 1].date) + '</div>' +
            '<div class="flex items-end gap-4" style="height:54px;align-items:flex-end">' +
            ga.daily.map(x => '<div style="flex:1;background:var(--cyan);opacity:.6;border-radius:3px 3px 0 0;height:' + Math.max(2, Math.round(x.sessions / mx * 100)) + '%" title="' + fmtDay(x.date) + ': ' + x.sessions + ' sessions"></div>').join('') + '</div>' +
            '<div class="small muted2 mt-6">sessions ' + ga.totals.sessions + ' · users ' + ga.totals.users + ' · pageviews ' + ga.totals.pageviews + '</div></div>';
          html += '<div class="grid cols-2 section-gap">' + costCard + gaCard + '</div>';
        } else if (d && d.costs) {
          html += '<div class="grid cols-2 section-gap">' + costCard + '<div class="card pad" style="padding:12px"><div class="eyebrow mb-6">' + t('WEB GA4', 'WEB GA4') + '</div><div class="small muted2">' + t('Zatím žádná GA4 data.', 'No GA4 data yet.') + '</div></div></div>';
        }
        pan.innerHTML = html || '<div class="small muted2">' + t('Žádná analytická data.', 'No analytics data.') + '</div>';
      }
    }
  }

  /* ---------- RENDER: Gmail ---------- */
  function renderGmail() {
    const host = $('#gmail-list'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const msgs = Core.state.messages.items || [];
    if (!msgs.length) { host.innerHTML = noData(t('Žádné zprávy', 'No messages'), t('Gmail je připojen — žádné zprávy v cache, počkej na synchronizaci.', 'Gmail is connected — no messages in cache, wait for sync.')); return; }
    const sorted = msgs.slice().sort((a, b) => (b.unread - a.unread) || (new Date(b.date || 0) - new Date(a.date || 0)));
    const row = (m) => '<div class="row" style="' + (m.unread ? 'background:var(--surface-soft);border-left:3px solid var(--orange)' : '') + '">' +
      '<span class="num" style="width:20px">' + (m.unread ? '<span class="dot live orange"></span>' : '') + '</span>' +
      '<div class="row-main" style="cursor:pointer" onclick="MC.openMail(\'' + m.id + '\')">' +
      '<div class="row-title">' + esc(m.subject) + '</div>' +
      '<div class="row-sub">' + esc(m.fromName || m.fromEmail || '?') + ' · ' + (m.date ? fmtAgo(m.date) : '') + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="MC.archiveMail(\'' + m.id + '\')">' + t('ARCHIV', 'ARCHIVE') + '</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="MC.replyMail(\'' + esc(m.fromEmail || '').replace(/'/g, '') + '\',\'' + esc(m.subject).replace(/'/g, '') + '\')">' + t('ODPOVĚDĚT', 'REPLY') + '</button>' +
      '</div>';
    host.innerHTML = sorted.slice(0, 30).map(row).join('');
    const prev = $('#gmail-preview');
    if (prev) {
      prev.innerHTML = sorted.slice(0, 5).map(m =>
        '<div class="row" style="padding:8px 10px">' +
        '<span class="num" style="width:14px">' + (m.unread ? '<span class="dot live orange"></span>' : '') + '</span>' +
        '<div class="row-main" style="cursor:pointer" onclick="MC.openMail(\'' + m.id + '\')">' +
        '<div class="row-title" style="font-size:12.5px">' + esc(m.subject) + '</div>' +
        '<div class="row-sub">' + esc(m.fromName || m.fromEmail || '?') + ' · ' + (m.date ? fmtAgo(m.date) : '') + '</div></div></div>').join('') ||
        '<div class="small muted2" style="padding:8px 10px">' + t('Žádné zprávy.', 'No messages.') + '</div>';
    }
  }

  /* ---------- RENDER: Datová schránka (ISDS) ---------- */
  function renderIsds() {
    const host = $('#isds-list'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const msgs = Core.state.isdsMessages.items || [];
    const st = $('#isds-status');
    if (st) {
      const h = (Core.state.health || []).find(x => x.id === 'isds');
      st.innerHTML = '<div class="eyebrow mb-8">ISDS STATUS</div>' +
        '<div class="small muted">' + esc((h && h.detail) || 'Datová schránka') + (msgs.length ? ' · ' + msgs.length + ' ' + t('zpráv v cache', 'messages in cache') : '') + '</div>' +
        '<div class="micro mt-8" style="color:var(--text4)">' + t('Lokální read-only čtečka — přihlas se v Datovce a synchronizuj, pak se tu objeví zprávy.', 'Local read-only reader — sign in to Datovka and sync, then messages appear here.') + '</div>';
    }
    if (!msgs.length) { host.innerHTML = noData(t('Žádné zprávy', 'No messages'), t('Žádné zprávy v lokální Datovka DB.', 'No messages in the local Datovka DB.')); return; }
    host.innerHTML = '<div class="card pad" style="padding:8px 12px">' + msgs.slice(0, 25).map(m =>
      '<div class="row"><span class="num" style="width:20px">' + (m.unread ? '<span class="dot live red"></span>' : '') + '</span>' +
      '<div class="row-main"><div class="row-title">' + esc(m.subject) + '</div>' +
      '<div class="row-sub">' + esc(m.fromName || m.fromEmail || '?') + ' · ' + (m.date ? fmtDate(m.date) : '') +
      (m.hasAttachments ? ' · ' + (m.attachmentSize || 0) + ' B ' + t('příloh', 'attachments') : '') + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="MC.openIsds()">' + I.ext + ' ' + t('OTEVŘÍT', 'OPEN') + '</button></div>').join('') + '</div>';
  }

  /* ---------- RENDER: Calendar (den / týden / měsíc) ---------- */
  const CAL = { mode: 'week', anchor: new Date() };

  function calStartOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function calAddDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function calWeekStart(d) { const x = calStartOfDay(d); return calAddDays(x, -((x.getDay() + 6) % 7)); } // pondělí
  function calDayKey(d) { const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function calSameDay(a, b) { return calDayKey(a) === calDayKey(b); }
  function calEventsAll() { return (Core.state.events && Core.state.events.items) || []; }
  function calStartVal(e) {
    if (e && e.start) {
      if (e.start.dateTime) return new Date(e.start.dateTime);
      if (e.start.date) return new Date(e.start.date + 'T00:00:00');
    }
    return null;
  }
  function calEndVal(e) {
    if (e && e.end) {
      if (e.end.dateTime) return new Date(e.end.dateTime);
      if (e.end.date) return new Date(e.end.date + 'T23:59:59');
    }
    return calStartVal(e);
  }
  function calIsAllDay(e) { return !!(e && e.allDay); }
  function calEventsOnDay(day) {
    const ds = calStartOfDay(day), de = calAddDays(ds, 1);
    return calEventsAll().filter(e => {
      const s = calStartVal(e); if (!s) return false;
      if (calIsAllDay(e)) return calDayKey(s) === calDayKey(ds);
      const end = calEndVal(e) || s;
      return s < de && end > ds;
    }).sort((a, b) => (calStartVal(a) - calStartVal(b)));
  }
  function calPeriodLabel(anchor) {
    if (CAL.mode === 'month') return anchor.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
    if (CAL.mode === 'week') {
      const ws = calWeekStart(anchor), we = calAddDays(ws, 6);
      const fmt = (d) => d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
      return fmt(ws) + ' – ' + fmt(we) + ' · ' + anchor.getFullYear();
    }
    return anchor.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function calEventChip(e) {
    const s = calStartVal(e);
    const time = (s && !calIsAllDay(e)) ? s.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="cal-evt' + (calIsAllDay(e) ? ' allday' : '') + '" onclick="MC.openBoardHref(\'' + (e.sourceUrl || '').replace(/'/g, '') + '\')">' +
      (time ? '<div class="tt">' + time + '</div>' : '') + '<div class="t">' + esc(e.title) + '</div></div>';
  }

  function calMonthGrid() {
    const anchor = CAL.anchor;
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = calWeekStart(first);
    const today = calStartOfDay(new Date());
    const dows = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
    let html = '<div class="cal-scroll"><div class="cal-month-grid">' + dows.map(d => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < 42; i++) {
      const day = calAddDays(start, i);
      const out = day.getMonth() !== anchor.getMonth() ? ' out' : '';
      const todayCls = calSameDay(day, today) ? ' today' : '';
      const evs = calEventsOnDay(day);
      html += '<div class="cal-cell' + out + todayCls + '" onclick="MC.calGo(\'' + calDayKey(day) + '\')">' +
        '<div class="cal-daynum">' + day.getDate() + '</div>' +
        evs.slice(0, 3).map(e => '<div class="cal-chip' + (calIsAllDay(e) ? ' allday' : '') + '" onclick="event.stopPropagation();MC.openBoardHref(\'' + (e.sourceUrl || '').replace(/'/g, '') + '\')">' + esc(e.title) + '</div>').join('') +
        (evs.length > 3 ? '<div class="micro" style="margin-top:2px">+' + (evs.length - 3) + '</div>' : '') + '</div>';
    }
    return html + '</div></div>';
  }

  function calWeekGrid() {
    const ws = calWeekStart(CAL.anchor);
    const today = calStartOfDay(new Date());
    const dows = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
    let html = '<div class="cal-week-grid">';
    for (let i = 0; i < 7; i++) {
      const day = calAddDays(ws, i);
      const todayCls = calSameDay(day, today) ? ' style="border-color:var(--purple)"' : '';
      const evs = calEventsOnDay(day);
      html += '<div class="cal-col"' + todayCls + '><div class="cal-col-head"><div class="dow">' + dows[i] + '</div><div class="dnum">' + day.getDate() + '</div></div>' +
        (evs.length ? evs.map(calEventChip).join('') : '<div class="micro" style="color:var(--text4);text-align:center;padding-top:12px">—</div>') + '</div>';
    }
    return html + '</div>';
  }

  function calDayView() {
    const day = calStartOfDay(CAL.anchor);
    const evs = calEventsOnDay(day);
    if (!evs.length) return noData(t('Žádné události', 'No events'), t('Na tento den žádné události. Přidej jednu tlačítkem výše.', 'No events on this day. Add one with the button above.'));
    let html = '<div class="cal-day-view">';
    evs.forEach(e => {
      const s = calStartVal(e), eEnd = calEndVal(e);
      const time = (s && !calIsAllDay(e)) ? s.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : t('celý den', 'all day');
      const range = (s && eEnd && !calIsAllDay(e) && !calSameDay(s, eEnd)) ? time + ' – ' + eEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ' ' + eEnd.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : time;
      html += '<div class="cal-hour" onclick="MC.openBoardHref(\'' + (e.sourceUrl || '').replace(/'/g, '') + '\')">' +
        '<div class="ht">' + range + '</div>' +
        '<div class="hb"><div class="bt">' + esc(e.title) + '</div>' +
        (e.location ? '<div class="bs">' + esc(e.location) + '</div>' : '') +
        (e.description ? '<div class="bs">' + esc(e.description.slice(0, 80)) + '</div>' : '') + '</div></div>';
    });
    return html + '</div>';
  }

  function calLocalInput(d) {
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderCalendar() {
    const host = $('#cal-grid'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const items = calEventsAll();
    const insight = $('#cal-insight');
    if (insight) {
      const h = (Core.state.health || []).find(x => x.id === 'calendar');
      insight.innerHTML = '<div class="ai-mark">KALENDÁŘ</div>' + esc((h && h.detail) || 'Google Calendar') + (items.length ? ' · ' + items.length + ' ' + t('událostí v okně', 'events in window') : ' · ' + t('zatím žádné události', 'no events yet'));
    }
    const title = $('#cal-title');
    if (title) title.textContent = calPeriodLabel(CAL.anchor);
    const sub = $('#cal-sub');
    if (sub) sub.textContent = t('Připojeno přes Google Calendar API · ' + items.length + ' událostí v okně', 'Connected via Google Calendar API · ' + items.length + ' events in window');
    const next = $('#next-event-card');
    if (next) {
      const todayStart = calStartOfDay(new Date());
      const sorted = items.slice().sort((a, b) => (calStartVal(a) - calStartVal(b))).filter(e => ((calStartVal(e) || new Date(0)) >= todayStart));
      const ev = sorted[0];
      if (ev) {
        const s = calStartVal(ev);
        next.innerHTML = '<div class="eyebrow mb-8">' + t('PŘÍŠTÍ UDÁLOST', 'NEXT EVENT') + '</div>' +
          '<div class="h-display num" style="font-size:30px">' + (s && !calIsAllDay(ev) ? s.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : t('celý den', 'all day')) + '</div>' +
          '<div class="h-sub mt-8">' + esc(ev.title) + '</div>' +
          '<div class="muted small mt-8">' + (ev.location ? esc(ev.location) + ' · ' : '') + (s ? s.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) : '') + '</div>';
      } else {
        next.innerHTML = '<div class="eyebrow mb-8">' + t('PŘÍŠTÍ UDÁLOST', 'NEXT EVENT') + '</div><div class="small muted">' + t('Žádná nadcházející událost.', 'No upcoming event.') + '</div>';
      }
    }
    $$('#cal-tabs .tab').forEach(tab => tab.classList.toggle('active', tab.dataset.calMode === CAL.mode));
    host.innerHTML = CAL.mode === 'month' ? calMonthGrid() : CAL.mode === 'week' ? calWeekGrid() : calDayView();
  }

  function calNav(delta) {
    const a = new Date(CAL.anchor);
    if (CAL.mode === 'month') a.setMonth(a.getMonth() + delta);
    else if (CAL.mode === 'week') a.setDate(a.getDate() + delta * 7);
    else a.setDate(a.getDate() + delta);
    CAL.anchor = a; renderCalendar();
  }
  function calToday() { CAL.anchor = new Date(); renderCalendar(); }
  function calSetMode(mode) { CAL.mode = mode; renderCalendar(); }
  function calGo(dayKey) { CAL.anchor = new Date(dayKey + 'T12:00:00'); CAL.mode = 'day'; renderCalendar(); }
  function openEventModal(dayKey) {
    let start;
    if (dayKey) { start = new Date(dayKey + 'T09:00:00'); }
    else { start = new Date(); start.setSeconds(0, 0); start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30); }
    const end = new Date(start); end.setHours(end.getHours() + 1);
    const st = $('#ev-start'); if (st) st.value = calLocalInput(start);
    const en = $('#ev-end'); if (en) en.value = calLocalInput(end);
    const tit = $('#ev-title'); if (tit) tit.value = '';
    const loc = $('#ev-location'); if (loc) loc.value = '';
    const desc = $('#ev-desc'); if (desc) desc.value = '';
    const ad = $('#ev-allday'); if (ad) ad.checked = false;
    openModal('event-modal');
  }
  async function submitEvent() {
    const title = ($('#ev-title') && $('#ev-title').value.trim()) || '';
    const startRaw = ($('#ev-start') && $('#ev-start').value) || '';
    const endRaw = ($('#ev-end') && $('#ev-end').value) || '';
    const allDay = !!($('#ev-allday') && $('#ev-allday').checked);
    if (!title) { toast(t('Chyba', 'Error'), t('Zadej název události.', 'Enter the event title.'), 'red'); return; }
    if (!startRaw) { toast(t('Chyba', 'Error'), t('Zadej začátek (Od).', 'Enter the start time.'), 'red'); return; }
    const norm = (v) => v + (v.length === 16 ? ':00' : '');
    let start, end;
    if (allDay) {
      const d = startRaw.slice(0, 10);
      const de = (endRaw && endRaw.slice(0, 10)) ? endRaw.slice(0, 10) : d;
      start = d + 'T00:00:00'; end = de + 'T00:00:00'; // Google all-day: end je vyloučené
    } else {
      start = norm(startRaw); end = norm(endRaw || startRaw);
    }
    const location = ($('#ev-location') && $('#ev-location').value.trim()) || undefined;
    const description = ($('#ev-desc') && $('#ev-desc').value.trim()) || undefined;
    closeModal('event-modal');
    if (!Core.state.connected) { toast(t('Data offline', 'Data offline'), t('Nelze vytvořit událost.', 'Cannot create event.'), 'red'); return; }
    try {
      const res = await Core.createEvent({ title, start, end, allDay, timeZone: 'Europe/Prague', location, description });
      const r = res && res.result;
      toast(t('Událost vytvořena', 'Event created'), (r && (r.htmlLink || r.eventId)) || title, 'green');
      await Core.refresh(true);
      renderAll();
    } catch (e) { toast(t('Chyba', 'Error'), t('Vytvoření události selhalo: ', 'Event creation failed: ') + e.message, 'red'); }
  }

  /* ---------- RENDER: Google Ads ---------- */
  function renderAds() {
    const host = $('#ads-grid'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const h = (Core.state.health || []).find(x => x.id === 'ads');
    const campaigns = Core.state.campaigns.items || [];
    const spend = (Core.state.spend && Core.state.spend.data) || null;
    let html = '';
    if (spend && spend.costMicros != null) {
      html += '<div class="card pad"><div class="eyebrow mb-8">SPEND · customer 9691511833</div>' +
        '<div class="flex items-center gap-8 wrap">' +
        '<span class="chip">' + (spend.costMicros != null ? (spend.costMicros / 1e6).toFixed(2) + ' Kč' : '—') + ' ' + t('útrata', 'spend') + '</span>' +
        '<span class="chip">' + (spend.clicks || 0) + ' ' + t('kliků', 'clicks') + '</span>' +
        '<span class="chip">' + (spend.impressions || 0) + ' ' + t('zobrazení', 'impressions') + '</span>' +
        '<span class="chip">' + (spend.conversions || 0) + ' ' + t('konverzí', 'conversions') + '</span>' +
        '<span class="chip">' + (spend.campaigns || 0) + ' ' + t('kampaní', 'campaigns') + '</span></div></div>';
    }
    if (campaigns.length) {
      html += '<div class="card pad mt-12" style="padding:8px 12px"><div class="eyebrow mb-8">' + t('KAMPANĚ', 'CAMPAIGNS') + ' · ' + campaigns.length + '</div><table class="tbl">' +
        '<thead><tr><th>' + t('Kampaň', 'Campaign') + '</th><th>Status</th><th>' + t('Denní rozpočet', 'Daily budget') + '</th><th>' + t('Útrata', 'Spend') + '</th><th>' + t('Kliky', 'Clicks') + '</th><th></th></tr></thead><tbody>' +
        campaigns.map(c =>
          '<tr><td><b>' + esc(c.name) + '</b></td>' +
          '<td><span class="badge ' + (c.status === 'enabled' ? 'green' : c.status === 'paused' ? 'orange' : 'gray') + '">' + esc(c.status) + '</span></td>' +
          '<td class="num">' + (c.budgetMicros != null ? (c.budgetMicros / 1e6).toFixed(0) + ' Kč' : '—') + '</td>' +
          '<td class="num">' + (c.costMicros != null ? (c.costMicros / 1e6).toFixed(2) + ' Kč' : '—') + '</td>' +
          '<td class="num">' + (c.clicks || 0) + '</td>' +
          '<td>' + (c.status === 'enabled' ? '<button class="btn btn-ghost btn-sm" onclick="MC.pauseCampaign(\'' + c.id + '\')">PAUSE</button>' : '') +
          '<button class="btn btn-ghost btn-sm" onclick="MC.updateBudget(\'' + c.id + '\')">' + t('ROZPOČET', 'BUDGET') + '</button></td></tr>').join('') +
        '</tbody></table></div>';
    }
    const statusTxt = (h && ((h.lastError && h.lastError.message) || (typeof h.detail === 'string' ? h.detail : (h.detail && h.detail.operation ? t('chyba při ', 'error during ') + h.detail.operation : '')))) || t('Není připojeno', 'Not connected');
    html += '<div class="card pad mt-12"><div class="eyebrow mb-8">' + t('STAV INTEGRACE', 'INTEGRATION STATUS') + '</div>' +
      '<div class="small muted">' + esc(statusTxt) + '</div></div>';
    host.innerHTML = html;
  }

  /* ---------- RENDER: Search Console ---------- */
  function renderSearchConsole() {
    const host = $('#sc-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const sc = Core.state.searchconsole || {};
    const daily = sc.daily || [];
    if (!daily.length) {
      const h = (Core.state.health || []).find(x => x.id === 'searchconsole');
      const statusTxt = (h && ((h.lastError && h.lastError.message) || (typeof h.detail === 'string' ? h.detail : ''))) || '';
      host.innerHTML = '<div class="card pad"><div class="eyebrow mb-8">SEARCH CONSOLE</div>' +
        '<div class="small muted">' + esc(statusTxt || t('Není připojeno', 'Not connected')) + '</div>' +
        '<div class="micro mt-12" style="color:var(--text4)">' + t('Pro připojení je nutný souhlas se scope webmasters.readonly — URL: /Users/mb/dev/datahub/data/searchconsole-consent-url.txt', 'To connect, consent for scope webmasters.readonly is needed — URL: /Users/mb/dev/datahub/data/searchconsole-consent-url.txt') + '</div></div>';
      return;
    }
    const mx = Math.max(1, ...daily.map(d => d.clicks));
    host.innerHTML = '<div class="card pad"><div class="eyebrow mb-8">SEARCH CONSOLE · ' + esc(sc.siteUrl || '') + '</div>' +
      '<div class="flex items-center gap-8 wrap">' +
      '<span class="chip">clicks ' + sc.totals.clicks + '</span>' +
      '<span class="chip">impressions ' + sc.totals.impressions + '</span>' +
      '<span class="chip">CTR ' + (sc.totals.ctr ? (sc.totals.ctr * 100).toFixed(1) + ' %' : '0 %') + '</span>' +
      '<span class="chip">pozice ' + (sc.totals.position ? sc.totals.position.toFixed(1) : '—') + '</span></div>' +
      '<div class="flex items-end gap-6" style="height:90px;align-items:flex-end;margin-top:10px">' +
      daily.map(d => '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">' +
        '<span class="micro num">' + d.clicks + '</span>' +
        '<div style="width:100%;background:var(--green);opacity:.6;border-radius:3px 3px 0 0;height:' + Math.max(2, Math.round(d.clicks / mx * 100)) + '%"></div>' +
        '<span class="micro" style="color:var(--text4)">' + fmtDay(d.date) + '</span></div>').join('') + '</div></div>';
  }

  /* ---------- RENDER: TURBOW leads (view-turbow) ---------- */
  function renderTurbowLeads() {
    const host = $('#turbow-leads'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = ''; return; }
    const leads = Core.state.leads.items || [];
    host.innerHTML = '<div class="eyebrow mb-8">TURBOW LEADS · ' + leads.length + '</div>' +
      (leads.length ? leads.slice(0, 12).map(leadRow).join('') : '<div class="small muted">' + t('Žádné leady.', 'No leads.') + '</div>');
  }
  function leadRow(l) {
    return '<div class="row"><span class="badge ' + (l.status === 'READY_TO_CALL' ? 'red' : l.status === 'NEW' ? 'orange' : 'gray') + '" style="font-size:8.5px">' + esc(l.status) + '</span>' +
      '<div class="row-main"><div class="row-title">' + esc(l.companyName || l.contactName || l.email || '?') + '</div>' +
      '<div class="row-sub">' + esc([l.contactName, l.email, l.phone, l.website].filter(Boolean).join(' · ')) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="MC.showLead(\'' + l.id + '\')">' + t('DETAIL', 'DETAIL') + '</button></div>';
  }

  /* ---------- RENDER: TURBOW lead pipeline (view-pipeline) ---------- */
  function renderLeadsPipeline() {
    const host = $('#leads-kanban'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = ''; return; }
    const leads = Core.state.leads.items || [];
    if (!leads.length) { host.innerHTML = '<div class="eyebrow mb-8">TURBOW LEADS PIPELINE</div><div class="small muted">' + t('Žádné leady.', 'No leads.') + '</div>'; return; }
    const order = ['NEW', 'ENRICHING', 'AUDIT_RUNNING', 'READY_TO_CALL', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'AUDIT_FAILED'];
    const by = {};
    leads.forEach(l => { (by[l.status] = by[l.status] || []).push(l); });
    host.innerHTML = '<div class="eyebrow mb-8">TURBOW LEADS PIPELINE · ' + leads.length + ' <span class="src-chip" style="vertical-align:2px">TURBOW</span></div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">' +
      order.filter(s => by[s]).map(s =>
        '<div class="card pad" style="padding:8px 10px"><div class="micro" style="color:var(--text4)">' + esc(s) + ' · ' + by[s].length + '</div>' +
        by[s].slice(0, 8).map(l => '<div class="small mt-4 pl-lead" onclick="MC.showLead(\'' + l.id + '\')">' + esc(l.companyName || l.contactName || l.email || l.id.slice(0, 8)) + '</div>').join('') + '</div>').join('') + '</div>';
  }

  /* ---------- RENDER: lead detail ---------- */
  function renderLeadDetail(id) {
    const host = $('#lead-detail-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const l = (Core.state.leads.items || []).find(x => x.id === id);
    if (!l) { host.innerHTML = noData(t('Lead nenalezen', 'Lead not found'), t('Tento lead není v cache.', 'This lead is not in cache.')); return; }
    const statuses = ['NEW', 'ENRICHING', 'AUDIT_RUNNING', 'READY_TO_CALL', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'AUDIT_FAILED'];
    host.innerHTML =
      '<div class="flex items-center gap-10 mb-12 wrap"><span class="badge ' + (l.status === 'READY_TO_CALL' ? 'red' : 'orange') + '">' + esc(l.status) + '</span>' +
      '<span class="micro">' + (l.createdAt ? t('vytvořen ', 'created ') + fmtDate(l.createdAt) : '') + '</span>' + srcChip('turbow') + '</div>' +
      '<div class="flex items-center gap-12 mb-16"><div class="attention-icon" style="width:44px;height:44px;background:var(--orange-soft);color:var(--orange)">' + I.lead + '</div>' +
      '<div><div class="h-sub">' + esc(l.companyName || l.contactName || 'Lead') + '</div>' +
      '<div class="muted small">' + esc([l.contactName, l.email, l.phone, l.website].filter(Boolean).join(' · ')) + '</div></div></div>' +
      '<div class="card pad mb-16"><div class="eyebrow mb-8">' + t('ZMĚNIT STATUS', 'CHANGE STATUS') + '</div>' +
      '<div class="btn-row wrap">' + statuses.map(s =>
        '<button class="btn btn-soft btn-sm" style="' + (s === l.status ? 'border-color:var(--orange);color:var(--orange)' : '') + '" onclick="MC.changeLeadStatus(\'' + l.id + '\',\'' + s + '\')">' + s + '</button>').join('') + '</div></div>' +
      (l.sourceUrl ? '<button class="btn btn-ghost btn-sm" onclick="MC.openBoardHref(\'' + l.sourceUrl.replace(/'/g, '') + '\')">' + I.ext + ' ' + t('OTEVŘÍT TURBOW', 'OPEN TURBOW') + '</button>' : '');
  }

  /* ---------- RENDER: analytics view ---------- */
  function renderAnalytics() {
    const host = $('#analytics-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const d = Core.state.overview;
    let html = '';
    if (d && d.runActivity) {
      const ra = d.runActivity.slice(-14);
      const max = Math.max(1, ...ra.map(r => r.total));
      html +=
        '<div class="card pad">' +
        '<div class="eyebrow mb-8">' + t('RUN AKTIVITA — PAPERCLIP · 14 DNÍ', 'RUN ACTIVITY — PAPERCLIP · 14 DAYS') + '</div>' +
        '<div class="flex items-end gap-6" style="height:140px;align-items:flex-end">' +
        ra.map(r => '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">' +
          '<span class="micro num">' + r.total + '</span>' +
          '<div style="width:100%;background:var(--purple);opacity:.55;border-radius:4px 4px 0 0;height:' + Math.max(3, Math.round(r.total / max * 100)) + '%"></div>' +
          '<span class="micro" style="color:var(--text4)">' + fmtDay(r.date) + '</span></div>').join('') + '</div>' +
        '<div class="flex items-center gap-8 mt-8 wrap">' +
        '<span class="chip">succeeded ' + ra.reduce((s, r) => s + r.succeeded, 0) + '</span>' +
        '<span class="chip">failed ' + ra.reduce((s, r) => s + r.failed, 0) + '</span>' +
        '<span class="chip">recovered ' + ra.reduce((s, r) => s + r.recovered, 0) + '</span>' +
        '<span class="chip">other ' + ra.reduce((s, r) => s + r.other, 0) + '</span></div></div>' +
        '<div class="card pad mt-12"><div class="eyebrow mb-8">' + t('MĚSÍČNÍ NÁKLADY', 'MONTHLY COST') + '</div>' +
        '<div class="stat-value num" style="font-size:24px">' + (d.costs && d.costs.monthSpendCents != null ? (d.costs.monthSpendCents / 100).toFixed(2) : '—') + ' <span style="font-size:13px;color:var(--text3)">USD</span></div>' +
        '<div class="small muted mt-8">' + (d.costs ? t('Využití rozpočtu: ', 'Budget utilization: ') + (d.costs.monthUtilizationPercent || 0) + ' %' : '') + '</div></div>';
    } else {
      html += '<div class="card pad">' + noData(t('Žádná data', 'No data'), t('Zatím není žádná run aktivita.', 'No run activity yet.')) + '</div>';
    }
    // GA4 web traffic
    const ga = Core.state.analytics || {};
    const wa = (Core.state.health || []).find(x => x.id === 'webanalytics');
    if (ga.daily && ga.daily.length) {
      const mx = Math.max(1, ...ga.daily.map(x => x.sessions));
      html += '<div class="card pad mt-12"><div class="eyebrow mb-8">' + t('WEBOVÝ TRAFFIC — GA4', 'WEB TRAFFIC — GA4') + ' · ' + fmtDay(ga.daily[0].date) + ' → ' + fmtDay(ga.daily[ga.daily.length - 1].date) + '</div>' +
        '<div class="flex items-center gap-8 wrap"><span class="chip">sessions ' + ga.totals.sessions + '</span>' +
        '<span class="chip">users ' + ga.totals.users + '</span>' +
        '<span class="chip">pageviews ' + ga.totals.pageviews + '</span></div>' +
        '<div class="flex items-end gap-6" style="height:100px;align-items:flex-end;margin-top:10px">' +
        ga.daily.map(x => '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">' +
          '<span class="micro num">' + x.sessions + '</span>' +
          '<div style="width:100%;background:var(--cyan);opacity:.6;border-radius:3px 3px 0 0;height:' + Math.max(2, Math.round(x.sessions / mx * 100)) + '%"></div>' +
          '<span class="micro" style="color:var(--text4)">' + fmtDay(x.date) + '</span></div>').join('') + '</div></div>';
    } else {
      html += '<div class="card pad mt-12"><div class="eyebrow mb-8">' + t('WEBOVÝ TRAFFIC — GA4', 'WEB TRAFFIC — GA4') + '</div>' +
        '<div class="small muted">' + esc((wa && (wa.detail || (wa.lastError && wa.lastError.message))) || t('GA4 není připojeno', 'GA4 not connected')) + '</div></div>';
    }
    host.innerHTML = html;
  }

  /* ---------- RENDER: integrations ---------- */
  const INT_STATUS_TONE = { connected: 'green', offline: 'red', degraded: 'orange', not_connected: 'gray', auth_expired: 'red' };
  const intLabel = (st) => ({ connected: t('PŘIPOJENO', 'CONNECTED'), offline: 'OFFLINE', degraded: 'DEGRADED', not_connected: t('NEPŘIPOJENO', 'NOT CONNECTED'), auth_expired: t('VYPRŠELA AUTH', 'AUTH EXPIRED') }[st] || (st || '').toUpperCase());
  function renderIntegrations() {
    const host = $('#integrations-list'); if (!host) return;
    const hs = Core.state.health || [];
    const rows = hs.map(h => ({
      name: h.name,
      label: intLabel(h.status),
      tone: INT_STATUS_TONE[h.status] || 'gray',
      sync: h.lastSyncAt ? t('synced ', 'synced ') + fmtAgo(h.lastSyncAt) : '—',
      auth: (h.detail || '') + (h.lastError ? ' · ' + h.lastError.message : '')
    }));
    if (!rows.length) {
      rows.push({
        name: t('Data', 'Data'),
        label: Core.state.connected ? t('PŘIPOJENO', 'CONNECTED') : 'OFFLINE',
        tone: Core.state.connected ? 'green' : 'red',
        sync: Core.state.lastSyncAt ? t('synced ', 'synced ') + fmtAgo(Core.state.lastSyncAt) : '—',
        auth: ''
      });
    }
    host.innerHTML = '<div class="card pad" style="padding:8px 12px"><table class="tbl">' +
      '<thead><tr><th>' + t('Integrace', 'Integration') + '</th><th>Status</th><th>' + t('Poslední sync', 'Last sync') + '</th><th>Auth</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td><b>' + esc(r.name) + '</b></td><td><span class="badge ' + r.tone + '">' + esc(r.label) + '</span></td><td class="num">' + esc(r.sync) + '</td><td><span class="micro">' + esc(r.auth) + '</span></td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="micro mt-12" style="color:var(--text4)">' + t('Žádný mock — nepropojené integrace zůstávají prázdné. Stará data zůstávají viditelná s označením poslední synchronizace (stale).', 'No mock — unconnected integrations stay empty. Old data stays visible marked with last sync (stale).') + '</div>';
  }

  /* ---------- RENDER: tasks-work (všechny otevřené úkoly — identifikátor první) ---------- */
  function renderTasksWork() {
    const host = $('#tasks-work-list'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const open = Core.state.tasks.items.filter(i => ['todo', 'backlog', 'in_progress', 'blocked'].includes(i.status))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!open.length) { host.innerHTML = noData(t('Žádné otevřené úkoly', 'No open tasks'), t('Všechny úkoly jsou hotové.', 'All tasks are done.')); return; }
    const stBadge = { todo: ['gray', 'TODO'], backlog: ['gray', 'BACKLOG'], in_progress: ['purple', 'IN PROGRESS'], blocked: ['red', 'BLOCKED'] };
    host.innerHTML = '<div class="card pad" style="padding:8px 12px"><table class="tbl">' +
      '<thead><tr><th>' + t('Úkol', 'Task') + '</th><th>Status</th><th>' + t('Aktualizováno', 'Updated') + '</th><th></th></tr></thead><tbody>' +
      open.map(tk =>
        '<tr style="cursor:pointer" onclick="MC.showTask(\'' + tk.id + '\')"><td><span class="t" style="font-weight:600">' + esc(tk.title.slice(0, 60)) + '</span> <span class="id-sm">' + esc(tk.identifier) + '</span></td>' +
        '<td><span class="badge ' + (stBadge[tk.status] || ['gray', tk.status])[0] + '" style="font-size:8.5px">' + (stBadge[tk.status] || ['gray', tk.status])[1] + '</span></td>' +
        '<td class="num">' + fmtAgo(tk.updatedAt) + '</td>' +
        '<td><button class="btn btn-ghost btn-sm">' + t('OTEVŘÍT', 'OPEN') + '</button></td></tr>').join('') +
      '</tbody></table></div>';
  }

  /* ---------- RENDER: rail insight ---------- */
  function renderRailInsight() {
    const host = $('#rail-insight'); if (!host) return;
    if (!Core.state.connected) {
      host.innerHTML = '<div class="ai-note"><div class="ai-mark">AI INSIGHT</div>' + t('Data offline — žádný insight.', 'Data offline — no insight.') + '</div>';
      return;
    }
    const att = Core.state.attention;
    const errAgents = Core.state.agents.items.filter(a => a.status === 'error');
    const blocked = Core.state.tasks.items.filter(i => i.status === 'blocked');
    const running = Core.state.agents.items.filter(a => a.status === 'running').length;
    const openN = Core.state.tasks.items.filter(i => ['todo', 'backlog', 'in_progress', 'blocked'].includes(i.status)).length;
    const html = [];
    if (att && att.totalCount) {
      html.push('<div class="ai-note"><div class="ai-mark">AI INSIGHT — ' + t('POZORNOST', 'ATTENTION') + '</div>' +
        esc((att.items || [])[0].title || t('Něco vyžaduje pozornost', 'Something needs attention')) + ' — ' + esc(cleanErr((att.items || [])[0].reason)) + '</div>');
    }
    if (errAgents.length) {
      html.push('<div class="ai-note" style="border-color:rgba(248,113,113,.35);background:linear-gradient(160deg,rgba(248,113,113,.08),transparent 70%),var(--surface)"><div class="ai-mark" style="color:var(--red)">ERROR</div>' +
        esc(errAgents[0].name) + ' ' + t('je v chybovém stavu — otevři originál a zkontroluj ho.', 'is in error state — open the original and check it.') + '</div>');
    }
    if (blocked.length) {
      html.push('<div class="ai-note" style="border-color:rgba(251,146,60,.3)"><div class="ai-mark" style="color:var(--orange)">BLOCKED</div>' +
        esc(blocked[0].identifier) + ' ' + t('je blokovaný — ', 'is blocked — ') + esc(blocked[0].title.slice(0, 50)) + '.</div>');
    }
    html.push('<div class="ai-note" style="border-color:rgba(52,211,153,.25)"><div class="ai-mark" style="color:var(--green)">STAV</div>' +
      openN + ' ' + t('otevřených úkolů', 'open tasks') + ' · ' + (running ? running + ' ' + t('agentů běží', 'agents running') : t('žádný agent nepracuje', 'no agent working')) + ' · ' + Core.state.agents.items.length + ' ' + t('agentů celkem', 'agents total') + '.</div>');
    host.innerHTML = html.join('');
  }

  /* ---------- RENDER: notifications (společný builder + pop/rail/home) ---------- */
  function buildNotifs() {
    const notifs = [];
    const att = Core.state.attention;
    (att && att.items || []).forEach(a => notifs.push({ cat: a.priority === 'high' ? 'critical' : 'action', source: a.source, title: (a.title || a.type), desc: cleanErr(a.reason), href: a.sourceUrl || '', kind: 'attention', id: a.entityId || null }));
    Core.state.agents.items.filter(a => a.status === 'error').forEach(a => notifs.push({ cat: 'critical', source: a.source, title: t('Agent ', 'Agent ') + a.name + ' ' + t('je v erroru', 'is in error'), desc: cleanErr(a.errorReason), href: a.sourceUrl || '', kind: 'agent', id: a.id }));
    Core.state.tasks.items.filter(i => i.status === 'blocked').forEach(b => notifs.push({ cat: 'action', source: b.source, title: b.identifier + ' ' + t('je blokovaný', 'is blocked'), desc: b.title.slice(0, 70), href: b.sourceUrl || '', kind: 'task', id: b.id }));
    (Core.state.decisions.items || []).forEach(d => notifs.push({ cat: 'action', source: 'paperclip', title: t('Čeká na schválení', 'Awaiting approval'), desc: (d.title || d.id).slice(0, 80), href: '', kind: 'decision', id: d.id }));
    const recentDone = Core.state.tasks.items.filter(i => i.status === 'done').sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt)).slice(0, 2);
    recentDone.forEach(d => notifs.push({ cat: 'info', source: d.source, title: d.identifier + ' ' + t('dokončeno', 'completed'), desc: d.title.slice(0, 60), href: d.sourceUrl || '', kind: 'task', id: d.id }));
    return notifs;
  }
  function notifCatsEnabled() {
    const d = { critical: true, action: true, info: true };
    try {
      const saved = JSON.parse(localStorage.getItem('mc.notifCats') || 'null');
      if (saved) Object.assign(d, saved);
    } catch (e) { /* default */ }
    return d;
  }
  function setNotifCats(cats) {
    try { localStorage.setItem('mc.notifCats', JSON.stringify(cats)); } catch (e) { /* noop */ }
    renderNotifStrip(); renderNotifications();
  }
  function notifOpen(kind, id, href, title) {
    const n = { kind: kind || '', id: id || null, href: href || '', title: title || '' };
    if (n.href) { openBoardHref(n.href); return; }
    if (n.kind === 'decision' && n.id) { showDecision(n.id); return; }
    if (n.kind === 'task' && n.id) { showTask(n.id); return; }
    if (n.kind === 'agent' && n.id) { showAgent(n.id); return; }
    toast(t('Notifikace', 'Notification'), n.title, '');
  }
  function renderNotifs() {
    const host = $('#notif-list'); if (!host) return;
    const notifs = buildNotifs();
    S.unreadNotifs = notifs.length;
    const rail = $('#rail-notifs');
    if (rail) {
      if (!Core.state.connected) rail.innerHTML = '<div class="small muted2" style="padding:6px 2px">' + t('Data offline — žádné notifikace.', 'Data offline — no notifications.') + '</div>';
      else if (!notifs.length) rail.innerHTML = '<div class="small muted2" style="padding:6px 2px">' + t('Nic nového.', 'Nothing new.') + '</div>';
      else rail.innerHTML = notifs.slice(0, 4).map(n =>
        '<div class="notif ' + n.cat + '" style="border-left-color:var(--' + (n.cat === 'critical' ? 'red' : n.cat === 'action' ? 'orange' : 'cyan') + ');border-radius:8px;background:var(--surface);border:1px solid var(--line);cursor:pointer" onclick="MC.notifOpen(\'' + n.kind + '\',\'' + esc(String(n.id || '')).replace(/'/g, '') + '\',\'' + esc(n.href || '').replace(/'/g, '') + '\',\'' + esc(n.title).replace(/'/g, '') + '\')">' +
        '<div class="n-title">' + esc(n.title) + '</div><div class="n-desc">' + esc(n.desc) + '</div></div>').join('');
    }
    const home = $('#home-notifs');
    if (home) {
      if (!Core.state.connected) home.innerHTML = '<div class="small muted2" style="padding:6px 2px">' + t('Data offline — žádné notifikace.', 'Data offline — no notifications.') + '</div>';
      else if (!notifs.length) home.innerHTML = '<div class="small muted2" style="padding:6px 2px">' + t('Nic nového.', 'Nothing new.') + '</div>';
      else home.innerHTML = notifs.slice(0, 5).map(n =>
        '<div class="notif ' + n.cat + '" style="padding:8px 10px;border-left-width:3px;cursor:pointer" onclick="MC.notifOpen(\'' + n.kind + '\',\'' + esc(String(n.id || '')).replace(/'/g, '') + '\',\'' + esc(n.href || '').replace(/'/g, '') + '\',\'' + esc(n.title).replace(/'/g, '') + '\')">' +
        '<div class="n-title"><span class="dot ' + (n.cat === 'critical' ? 'red' : n.cat === 'action' ? 'orange' : 'cyan') + '"></span>' + esc(n.title) + '</div>' +
        '<div class="n-desc">' + esc(n.desc) + '</div></div>').join('');
    }
    if (!Core.state.connected) { host.innerHTML = notConnected('bell', t('Data offline', 'Data offline'), t('Žádné notifikace — integrační vrstva nedostupná.', 'No notifications — integration layer unavailable.')); S.unreadNotifs = 0; updateBadges(); return; }
    if (!notifs.length) { host.innerHTML = noData(t('Nic nového', 'Nothing new'), t('Žádné notifikace.', 'No notifications.')); updateBadges(); return; }
    host.innerHTML = notifs.slice(0, 12).map(n =>
      '<div class="notif ' + n.cat + '" onclick="MC.notifOpen(\'' + n.kind + '\',\'' + esc(String(n.id || '')).replace(/'/g, '') + '\',\'' + esc(n.href || '').replace(/'/g, '') + '\',\'' + esc(n.title).replace(/'/g, '') + '\')">' +
      '<div class="n-title"><span class="dot ' + (n.cat === 'critical' ? 'red' : n.cat === 'action' ? 'orange' : 'cyan') + '"></span>' + esc(n.title) + '</div>' +
      '<div class="n-desc">' + esc(n.desc) + '</div></div>').join('');
    updateBadges();
  }

  /* ---------- RENDER: stránka notifikací (všechny, filtry) ---------- */
  function renderNotifications() {
    const host = $('#notifications-list'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const cats = notifCatsEnabled();
    let list = buildNotifs();
    list = list.filter(n => cats[n.cat] !== false);
    const tab = S.notifTab || 'all';
    if (tab !== 'all') list = list.filter(n => n.cat === tab);
    $$('#notif-tabs .tab').forEach(el => el.classList.toggle('active', el.dataset.ntab === tab));
    if (!list.length) {
      host.innerHTML = noData(t('Žádné notifikace', 'No notifications'), t('Vše je vyřízeno — nic nevyžaduje pozornost.', 'All handled — nothing needs attention.'));
      return;
    }
    const CAT_LABEL = { critical: t('KRITICKÉ', 'CRITICAL'), action: t('AKCE', 'ACTION'), info: 'INFO' };
    const TONE = { critical: 'red', action: 'orange', info: 'cyan' };
    host.innerHTML = list.map(n =>
      '<div class="row" style="cursor:pointer" onclick="MC.notifOpen(\'' + n.kind + '\',\'' + esc(String(n.id || '')).replace(/'/g, '') + '\',\'' + esc(n.href || '').replace(/'/g, '') + '\',\'' + esc(n.title).replace(/'/g, '') + '\')">' +
      '<span class="badge ' + TONE[n.cat] + '" style="min-width:70px;justify-content:center">' + CAT_LABEL[n.cat] + '</span>' +
      '<div class="row-main">' +
      '<div class="row-title">' + esc(n.title) + '</div>' +
      '<div class="row-sub">' + (n.desc ? esc(n.desc.slice(0, 120)) : '') + '</div></div>' +
      srcChip(n.source) + I.chev + '</div>').join('');
  }
  function setNotifTab(tab) { S.notifTab = tab; renderNotifications(); }

  /* ---------- RENDER: globální notifikační pruh (všechny stránky) ---------- */
  function renderNotifStrip() {
    const strip = $('#notif-strip'); if (!strip) return;
    const catsHost = $('#ns-cats');
    const watchHost = $('#ns-watch');
    const cats = notifCatsEnabled();
    const notifs = buildNotifs().filter(n => cats[n.cat] !== false);
    const counts = { critical: 0, action: 0, info: 0 };
    notifs.forEach(n => { counts[n.cat] = (counts[n.cat] || 0) + 1; });
    const CAT_LABEL = { critical: t('KRITICKÉ', 'CRITICAL'), action: t('AKCE', 'ACTION'), info: 'INFO' };
    const TONE = { critical: 'red', action: 'orange', info: 'cyan' };
    let html = '';
    ['critical', 'action', 'info'].forEach(c => {
      if (counts[c]) html += '<button class="ns-cat ' + c + '" onclick="MC.setNotifTab(\'' + c + '\');MC.showView(\'notifications\')"><span class="dot ' + TONE[c] + '"></span>' + CAT_LABEL[c] + ' ' + counts[c] + '</button>';
    });
    if (catsHost) catsHost.innerHTML = html;
    // sledované položky
    const wl = getWatch();
    if (watchHost) {
      if (!wl.length) { watchHost.innerHTML = ''; }
      else {
        watchHost.innerHTML = '<span class="ns-watch-label">' + t('SLEDUJI', 'WATCHING') + '</span>' + wl.map(w => {
          const r = resolveWatch(w);
          if (!r.item) {
            return '<span class="ns-w-item missing" title="' + esc(t('nenalezeno', 'not found')) + '">' + esc(r.label) + '</span>';
          }
          return '<span class="ns-w-item" onclick="' + r.open + '" title="' + esc(r.sub || '') + '"><span class="dot ' + r.tone + '"></span>' + esc(r.label) + ' <em>' + esc(r.statusLabel) + '</em></span>';
        }).join('');
      }
    }
    strip.style.display = (notifs.length || wl.length) ? 'flex' : 'none';
  }

  /* ---------- SLEDOVANÉ POLOŽKY (watchlist, localStorage) ---------- */
  function getWatch() {
    try { return JSON.parse(localStorage.getItem('mc.watch') || '[]'); } catch (e) { return []; }
  }
  function setWatch(list) {
    try { localStorage.setItem('mc.watch', JSON.stringify(list)); } catch (e) { /* noop */ }
    renderNotifStrip(); renderWatchList();
  }
  function watchAdd(type, key) {
    key = String(key || '').trim();
    if (!key) return;
    const list = getWatch();
    if (list.some(w => w.type === type && w.key === key)) { toast(t('Sledované', 'Watchlist'), key + ' ' + t('už je sledované.', 'is already watched.'), ''); return; }
    list.push({ type, key, addedAt: new Date().toISOString() });
    setWatch(list);
    toast(t('Sledované', 'Watchlist'), key + ' ' + t('přidáno — stav uvidíš v pruhu nahoře.', 'added — status shows in the top strip.'), 'green');
  }
  function watchRemove(key) {
    setWatch(getWatch().filter(w => w.type + ':' + w.key !== key));
  }
  function watchAddAuto() {
    const inp = $('#watch-input'); if (!inp) return;
    const v = inp.value.trim();
    if (!v) { toast(t('Chyba', 'Error'), t('Zadej DRE-xxxxx, jméno agenta nebo firmu.', 'Enter DRE-xxxxx, agent name or company.'), 'red'); return; }
    inp.value = '';
    if (/^DRE-\d+/i.test(v) || Core.state.tasks.items.some(tk => tk.identifier === v)) { watchAdd('task', v); return; }
    if (Core.state.agents.items.some(a => a.name === v)) { watchAdd('agent', v); return; }
    if (Core.state.leads.items.some(l => l.companyName === v || l.contactName === v)) { watchAdd('lead', v); return; }
    // neznámé → zkus jako úkol
    watchAdd('task', v);
  }
  function resolveWatch(w) {
    let item = null, label = w.key, sub = '', status = null, statusLabel = '—', tone = 'gray', open = '';
    if (w.type === 'task') {
      item = Core.state.tasks.items.find(tk => tk.identifier === w.key || tk.id === w.key);
      if (item) {
        label = item.title.slice(0, 30); sub = item.title; status = item.status;
        statusLabel = (item.status || '').replace(/_/g, ' ').toUpperCase();
        tone = { in_progress: 'purple', blocked: 'red', done: 'green', todo: 'gray', backlog: 'gray', cancelled: 'gray' }[item.status] || 'gray';
        open = "MC.showTask('" + item.id + "')";
      }
    } else if (w.type === 'agent') {
      item = Core.state.agents.items.find(a => a.id === w.key || a.name === w.key);
      if (item) {
        label = item.name; sub = item.title || item.role || ''; status = item.status;
        statusLabel = (item.status || '').toUpperCase();
        tone = { running: 'green', error: 'red', paused: 'orange', idle: 'gray' }[item.status] || 'gray';
        open = "MC.showAgent('" + item.id + "')";
      }
    } else if (w.type === 'lead') {
      item = Core.state.leads.items.find(l => l.id === w.key || l.companyName === w.key || l.contactName === w.key);
      if (item) {
        label = item.companyName || item.contactName || '?'; sub = item.status; status = item.status;
        statusLabel = item.status || '—';
        tone = item.status === 'READY_TO_CALL' ? 'red' : item.status === 'WON' ? 'green' : 'orange';
        open = "MC.showLead('" + item.id + "')";
      }
    }
    return { w, item, label, sub, status, statusLabel, tone, open };
  }
  function renderWatchList() {
    const host = $('#watch-list'); if (!host) return;
    const wl = getWatch();
    if (!wl.length) { host.innerHTML = '<div class="small muted2">' + t('Zatím nic nesleduješ.', 'Nothing watched yet.') + '</div>'; return; }
    host.innerHTML = wl.map(w => {
      const r = resolveWatch(w);
      return '<span class="watch-chip"><span class="dot ' + (r.item ? r.tone : 'gray') + '"></span>' +
        esc(r.label) + ' <em>' + esc(r.statusLabel) + '</em>' +
        '<button class="watch-x" onclick="MC.watchRemove(\'' + w.type + ':' + esc(w.key).replace(/'/g, '') + '\')" title="' + t('Odebrat', 'Remove') + '">×</button></span>';
    }).join('');
  }
  function watchStatusWatchdog() {
    // změna stavu sledované položky → toast + ticker (spouští se z renderNotifStrip)
    const wl = getWatch();
    if (!wl.length) return;
    if (!S.watchPrev) S.watchPrev = {};
    wl.forEach(w => {
      const r = resolveWatch(w);
      const k = w.type + ':' + w.key;
      if (!r.item) { S.watchPrev[k] = null; return; }
      const prev = S.watchPrev[k];
      if (prev !== undefined && prev !== r.status) {
        toast(t('Sledované', 'Watchlist'), r.label + ': ' + (prev || '—') + ' → ' + r.statusLabel, r.tone === 'red' ? 'red' : r.tone === 'green' ? 'green' : '');
        tickerPush(r.tone === 'red' ? 'isds' : 'done', r.label + ' → ' + r.statusLabel);
      }
      S.watchPrev[k] = r.status;
    });
  }

  /* ---------- NASTAVENÍ: vzhled / jazyk / obnovování / účet ---------- */
  function applyTheme() {
    let mode = 'dark';
    try { mode = localStorage.getItem('mc.theme') || 'dark'; } catch (e) { /* default */ }
    let theme = mode;
    if (mode === 'system') {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    const sel = $('#set-theme'); if (sel) sel.value = mode;
  }
  function setTheme(mode) {
    try { localStorage.setItem('mc.theme', mode); } catch (e) { /* noop */ }
    applyTheme();
  }
  function applyDensity() {
    let d = 'comfortable';
    try { d = localStorage.getItem('mc.density') || 'comfortable'; } catch (e) { /* default */ }
    document.documentElement.setAttribute('data-density', d);
    const sel = $('#set-density'); if (sel) sel.value = d;
  }
  function setDensity(d) {
    try { localStorage.setItem('mc.density', d); } catch (e) { /* noop */ }
    applyDensity();
  }
  function setLangFromSettings(lang) {
    LANG = lang === 'en' ? 'en' : 'cs';
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* noop */ }
    applyLang();
    const vt = VIEW_TITLES[S.view] || [S.view, S.view];
    document.title = 'Mission Control — ' + t(vt[0], vt[1]);
    renderAll();
  }
  function setPollFromSettings(ms) {
    const v = Core.setPollInterval(Number(ms) || 30000);
    toast(t('Obnovování', 'Refresh'), t('Interval: ', 'Interval: ') + Math.round(v / 1000) + ' s', '');
  }
  function renderSettingsAccount() {
    const host = $('#set-gmail-account'); if (!host) return;
    const h = (Core.state.health || []).find(x => x.id === 'gmail');
    if (!h) { host.innerHTML = '<div class="small muted2">' + t('Stav účtu nedostupný.', 'Account status unavailable.') + '</div>'; return; }
    const ok = h.status === 'connected';
    const detail = (typeof h.detail === 'string' ? h.detail : (h.lastError && h.lastError.message) || '') || '';
    // detail obsahuje "účet: xxx@gmail.com" z checkHealth
    const m = detail.match(/účet:\s*([^\s·]+)/);
    const email = m ? m[1] : null;
    host.innerHTML =
      '<div class="acc-row">' +
      '<span class="avatar sm" style="background:' + (ok ? 'var(--green-soft);color:var(--green)' : 'var(--red-soft);color:var(--red)') + '">' + (email ? esc(email[0].toUpperCase()) : (ok ? I.check : I.alert)) + '</span>' +
      '<div class="grow"><div class="h-sub" style="font-size:13px">' + (email ? esc(email) : t('Gmail účet', 'Gmail account')) + '</div>' +
      '<div class="micro">' + esc(detail) + (h.lastSyncAt ? ' · ' + t('sync ', 'sync ') + fmtAgo(h.lastSyncAt) : '') + '</div></div>' +
      '<span class="badge ' + (ok ? 'green' : 'red') + '">' + (ok ? t('PŘIPOJENO', 'CONNECTED') : t('NEPŘIPOJENO', 'NOT CONNECTED')) + '</span>' +
      '</div>';
  }
  let consentUrl = null;
  async function googleConsent() {
    try {
      const r = await Core.fetchJson('/auth/consent');
      if (r && r.url) {
        consentUrl = r.url;
        window.open(r.url, '_blank');
        toast(t('Google přihlášení', 'Google sign-in'), t('Otevřel se souhlas Google — po schválení zkopíruj kód z adresy prohlížeče (http://localhost:8080/?code=...) a vlož ho do pole níže.', 'Google consent opened — after approving, copy the code from the browser address (http://localhost:8080/?code=...) and paste it below.'), '');
      } else {
        toast(t('Chyba', 'Error'), t('Consent URL se nepodařilo získat.', 'Failed to get consent URL.'), 'red');
      }
    } catch (e) {
      toast(t('Chyba', 'Error'), e.message, 'red');
    }
  }
  async function googleExchange() {
    const inp = $('#set-auth-code'); if (!inp) return;
    const code = inp.value.trim();
    if (!code) { toast(t('Chyba', 'Error'), t('Vlož autorizační kód z adresy prohlížeče.', 'Paste the auth code from the browser address.'), 'red'); return; }
    inp.value = '';
    try {
      const r = await Core.fetchJson('/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      toast(t('Účet připojen', 'Account connected'), t('Gmail/Kalendář se přepnuly na nový účet — data se obnovují.', 'Gmail/Calendar switched to the new account — data is refreshing.'), 'green');
      await Core.refresh(true);
      renderAll();
      showView('settings');
    } catch (e) {
      toast(t('Chyba', 'Error'), t('Výměna kódu selhala: ', 'Code exchange failed: ') + e.message, 'red');
    }
  }
  function renderSettingsValues() {
    const langSel = $('#set-lang'); if (langSel) langSel.value = LANG;
    applyTheme();
    applyDensity();
    renderSettingsAccount();
    renderWatchList();
  }
  function initSettingsListeners() {
    const themeSel = $('#set-theme'); if (themeSel) themeSel.addEventListener('change', () => setTheme(themeSel.value));
    const denSel = $('#set-density'); if (denSel) denSel.addEventListener('change', () => setDensity(denSel.value));
    const langSel = $('#set-lang'); if (langSel) langSel.addEventListener('change', () => setLangFromSettings(langSel.value));
    const pollSel = $('#set-poll'); if (pollSel) pollSel.addEventListener('change', () => setPollFromSettings(pollSel.value));
    ['set-ncat-critical', 'set-ncat-action', 'set-ncat-info'].forEach(id => {
      const el = $('#' + id); if (!el) return;
      el.addEventListener('change', () => {
        const cats = {
          critical: $('#set-ncat-critical') && $('#set-ncat-critical').checked,
          action: $('#set-ncat-action') && $('#set-ncat-action').checked,
          info: $('#set-ncat-info') && $('#set-ncat-info').checked,
        };
        setNotifCats(cats);
      });
    });
    // výchozí hodnoty checkboxů z uložených kategorií
    const cats = notifCatsEnabled();
    if ($('#set-ncat-critical')) $('#set-ncat-critical').checked = cats.critical !== false;
    if ($('#set-ncat-action')) $('#set-ncat-action').checked = cats.action !== false;
    if ($('#set-ncat-info')) $('#set-ncat-info').checked = cats.info !== false;
  }

  /* ---------- RENDER: next event / rail ---------- */
  function renderNextEvent() {
    const host = $('#next-event'); if (!host) return;
    const items = (Core.state.agenda.items && Core.state.agenda.items.length ? Core.state.agenda.items : Core.state.events.items) || [];
    const next = items.slice().sort((a, b) => new Date((a.start && a.start.dateTime) || 0) - new Date((b.start && b.start.dateTime) || 0))[0];
    if (next && next.start && next.start.dateTime) {
      const tm = new Date(next.start.dateTime);
      host.innerHTML = '<div class="state" style="padding:14px 10px"><div class="st-title" style="font-size:13px">' + esc(next.title) + '</div>' +
        '<div class="st-desc" style="font-size:12px">' + tm.toLocaleString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) +
        (next.location ? ' · ' + esc(next.location) : '') + '</div></div>';
    } else {
      const cal = (Core.state.health || []).find(h => h.id === 'calendar');
      host.innerHTML = '<div class="state" style="padding:14px 10px"><div class="st-desc" style="font-size:12px">' +
        (cal && cal.status === 'connected' ? t('Žádné nadcházející události.', 'No upcoming events.') : t('Kalendář není připojen.', 'Calendar not connected.')) + ' · ' +
        (Core.state.connected ? Core.state.agents.items.filter(a => a.status !== 'idle' && a.status !== 'paused').length + ' ' + t('agentů aktivních', 'agents active') : t('data offline', 'data offline')) + '.</div></div>';
    }
  }

  /* ---------- RENDER: ticker ---------- */
  let tickerBuf = [];
  function tickerPush(type, text) {
    tickerBuf.unshift({ type, text, t: nowSec() });
    if (tickerBuf.length > 6) tickerBuf.pop();
    const host = $('#ticker-stream'); if (!host) return;
    const map = { lead: 'var(--orange)', agent: 'var(--purple)', ads: 'var(--cyan)', isds: 'var(--red)', done: 'var(--green)', sys: 'var(--text3)' };
    const last = tickerBuf[0];
    const el = document.createElement('span');
    el.className = 'ticker-event';
    el.innerHTML = '<span class="te-time">' + fmtAgo(nowSec() - last.t) + '</span><span class="dot" style="background:' + (map[last.type] || 'var(--text3)') + '"></span><span>' + esc(text) + '</span>';
    host.prepend(el);
    while (host.children.length > 4) host.lastChild.remove();
  }
  function initTicker() {
    const host = $('#ticker-stream'); if (!host) return;
    host.innerHTML = '';
    tickerBuf = [];
    if (!Core.state.connected) { tickerPush('sys', t('Data offline — spusť start.sh', 'Data offline — run start.sh')); return; }
    tickerPush('sys', t('Data připojena — ', 'Data connected — ') + companyName());
    const acts = Core.state.activity.items || [];
    acts.slice(0, 3).forEach(a => tickerPush(a.type && a.type.includes('fail') ? 'isds' : a.type && a.type.includes('done') ? 'done' : 'agent', (a.title || 'event') + ' · ' + String(a.entityId || '').slice(0, 8)));
  }

  /* ============================================================
     DETAIL VIEWS
     ============================================================ */

  /* ---------- DECISION DETAIL ---------- */
  function renderDecision(id) {
    const host = $('#decision-body'); if (!host) return;
    if (!Core.state.connected) { host.innerHTML = paperclipError(); return; }
    const d = (Core.state.decisions.items || []).find(x => x.id === id);
    if (!d) {
      host.innerHTML = noData(t('Schválení nenalezeno', 'Approval not found'), t('Toto schválení už není aktivní, nebo bylo vyřízeno. Zkontroluj Decision Inbox.', 'This approval is no longer active or was resolved. Check the Decision Inbox.'));
      return;
    }
    host.innerHTML =
      '<div class="flex items-center gap-10 mb-12 wrap"><span class="badge orange">' + t('VYŽADUJE AKCI', 'ACTION REQUIRED') + '</span>' +
      '<span class="micro">created ' + (d.createdAt ? fmtAgo(d.createdAt) : '—') + ' · decision</span></div>' +
      '<div class="flex items-center gap-12 mb-16">' +
      '<div class="attention-icon" style="width:44px;height:44px;background:var(--orange-soft);color:var(--orange)">' + I.check + '</div>' +
      '<div><div class="h-sub">' + esc(d.title || d.id.slice(0, 8)) + '</div><div class="muted small">' + esc(d.status || 'pending') + '</div></div></div>' +
      '<div class="card pad mb-16"><div class="eyebrow mb-8">' + t('POŽADAVEK', 'REQUEST') + '</div><div class="small muted">' + esc((d.summary || t('Žádný popis.', 'No description.')).slice(0, 600)) + '</div></div>' +
      '<div class="card pad mb-16"><div class="eyebrow mb-8">' + t('SOUVISLOSTI', 'RELATED') + '</div>' +
      '<div class="btn-row">' + (d.sourceUrl ? '<button class="btn btn-ghost btn-sm" onclick="MC.openBoardHref(\'' + d.sourceUrl.replace(/'/g, '') + '\')">' + I.ext + ' ' + t('OTEVŘÍT ORIGINÁL', 'OPEN ORIGINAL') + '</button>' : '') +
      '<button class="btn btn-soft btn-sm" onclick="MC.createTaskModal()">' + t('VYTVOŘIT ÚKOL', 'CREATE TASK') + '</button></div></div>' +
      '<div class="btn-row mt-16" style="position:sticky;bottom:0;background:var(--bg1);padding:12px 0;border-top:1px solid var(--line)">' +
      '<button class="btn btn-primary btn-lg" onclick="MC.resolveDecision(\'' + d.id + '\',\'approve\')">' + I.check + ' ' + t('SCHVÁLIT', 'APPROVE') + '</button>' +
      '<button class="btn btn-danger btn-lg" onclick="MC.resolveDecision(\'' + d.id + '\',\'reject\')">' + I.x + ' ' + t('ZAMÍTNOUT', 'REJECT') + '</button>' +
      '</div>';
  }

  /* ---------- TASK DETAIL ---------- */
  async function renderTaskDetail(id) {
    const targets = ['#task-detail-body', '#lead-detail-body'].map(s => $(s)).filter(Boolean);
    if (!targets.length) return;
    if (!Core.state.connected) { targets.forEach(tg => { tg.innerHTML = paperclipError(); }); return; }
    const tk = Core.state.tasks.items.find(x => x.id === id);
    if (!tk) { targets.forEach(h => { h.innerHTML = noData(t('Úkol nenalezen', 'Task not found'), t('Tento úkol neexistuje v aktuálních datech.', 'This task does not exist in current data.')); }); return; }
    const stBadge = { todo: ['gray', 'TODO'], backlog: ['gray', 'BACKLOG'], in_progress: ['purple', 'IN PROGRESS'], blocked: ['red', 'BLOCKED'], done: ['green', 'DONE'], cancelled: ['gray', 'CANCELLED'] };
    const kids = Core.state.tasks.items.filter(i => i.parentId === tk.id);
    const parent = tk.parentId ? Core.state.tasks.items.find(x => x.id === tk.parentId) : null;
    const agent = tk.assigneeAgentId ? Core.state.agents.items.find(a => a.id === tk.assigneeAgentId) : null;
    const host = targets[0];
    const srcBtn = tk.sourceUrl
      ? '<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="MC.openBoardHref(\'' + tk.sourceUrl.replace(/'/g, '') + '\')">' + I.ext + ' ' + t('OTEVŘÍT ORIGINÁL', 'OPEN ORIGINAL') + '</button>'
      : '';
    host.innerHTML =
      '<div class="flex items-center gap-10 mb-12 wrap"><span class="badge ' + (stBadge[tk.status] || ['gray', tk.status])[0] + '">' + (stBadge[tk.status] || ['gray', tk.status])[1] + '</span>' +
      srcChip(tk.source) +
      '<span class="micro">' + (tk.updatedAt ? t('aktualizováno ', 'updated ') + fmtAgo(tk.updatedAt) : '') + '</span>' +
      srcBtn + '</div>' +
      '<div class="flex items-center gap-12 mb-16">' +
      '<div class="attention-icon" style="width:44px;height:44px;background:var(--purple-soft);color:var(--purple)">' + I.bot + '</div>' +
      '<div><div class="h-sub"><b class="num" style="color:var(--cyan)">' + esc(tk.identifier) + '</b> — ' + esc(tk.title) + '</div>' +
      '<div class="muted small">' + (agent ? t('Agent: ', 'Agent: ') + esc(agent.name) : t('Přiřazeno: ', 'Assignee: ') + esc(tk.assigneeUserId || '—')) + ' · ' + t('projekt: ', 'project: ') + esc(sid(tk.projectId)) + '</div></div></div>' +
      '<div class="stat-row mb-16" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat card pad" style="padding:12px 14px"><div class="stat-label">CREATED</div><div class="stat-value num" style="font-size:13px;font-weight:600">' + fmtDate(tk.createdAt) + '</div></div>' +
      '<div class="stat card pad" style="padding:12px 14px"><div class="stat-label">STARTED</div><div class="stat-value num" style="font-size:13px;font-weight:600">' + fmtDate(tk.startedAt) + '</div></div>' +
      '<div class="stat card pad" style="padding:12px 14px"><div class="stat-label">COMPLETED</div><div class="stat-value num" style="font-size:13px;font-weight:600">' + fmtDate(tk.completedAt) + '</div></div>' +
      '<div class="stat card pad" style="padding:12px 14px"><div class="stat-label">PRIORITY</div><div class="stat-value" style="font-size:15px">' + esc(tk.priority || '—') + '</div></div>' +
      '</div>' +
      '<div class="grid cols-2 mb-16">' +
      '<div class="card pad"><div class="eyebrow mb-8">' + t('CÍL', 'OBJECTIVE') + '</div><div class="small muted" style="white-space:pre-line">' + esc((tk.description || '—').slice(0, 900)) + '</div>' +
      (tk.labels && tk.labels.length ? '<div class="eyebrow mb-8 mt-12">LABELS</div><div class="flex gap-6 wrap">' + tk.labels.map(l => '<span class="chip">' + esc(l) + '</span>').join('') + '</div>' : '') + '</div>' +
      '<div class="card pad"><div class="eyebrow mb-8">' + t('HIERARCHIE', 'HIERARCHY') + '</div>' +
      (parent ? '<div class="row-sub mb-8">PARENT: <button class="btn btn-soft btn-sm" onclick="MC.showTask(\'' + parent.id + '\')">' + esc(parent.identifier) + ' — ' + esc(parent.title.slice(0, 40)) + '</button></div>' : '<div class="row-sub mb-8">PARENT: — (root task)</div>') +
      '<div class="row-sub mb-8">CURRENT: <span class="badge purple">' + esc(tk.identifier) + '</span></div>' +
      (kids.length ? '<div class="row-sub">CHILDREN: ' + kids.slice(0, 6).map(k => '<button class="btn btn-soft btn-sm" style="margin-right:6px" onclick="MC.showTask(\'' + k.id + '\')">' + esc(k.identifier) + '</button>').join('') + '</div>' : '<div class="row-sub">CHILDREN: —</div>') +
      '</div></div>' +
      '<div class="card pad"><div class="eyebrow mb-8">' + t('AKTUÁLNÍ PRÁCE', 'CURRENT WORK') + '</div><div class="small muted">' +
      (tk.activeRunId ? t('Aktivní run: ', 'Active run: ') + esc(tk.activeRunId) : tk.status === 'in_progress' ? t('Úkol je v řešení.', 'Task is in progress.') : tk.status === 'blocked' ? t('Úkol je blokovaný — vyžaduje pozornost.', 'Task is blocked — needs attention.') : t('Úkol čeká na zpracování.', 'Task is waiting to be processed.')) + '</div>' +
      '<div class="eyebrow mb-8 mt-12">' + t('DALŠÍ KROK', 'NEXT STEP') + '</div><div class="small muted">' + t('Otevři úkol u zdroje pro komentáře, runy a workflow.', 'Open the task at the source for comments, runs and workflow.') + '</div>' +
      '<div class="btn-row mt-12">' + (srcBtn || '') + '</div></div>';
    targets.forEach(h => { h.innerHTML = host.innerHTML; });
  }

  /* ============================================================
     ACTIONS
     ============================================================ */
  async function resolveDecision(id, how) {
    if (!Core.state.connected) { toast(t('Data offline', 'Data offline'), t('Nelze rozhodnout — integrační vrstva nedostupná.', 'Cannot decide — integration layer unavailable.'), 'red'); return; }
    try {
      const res = how === 'reject' ? await Core.rejectTask(id) : await Core.approveTask(id);
      const done = !res || res.ok !== false;
      toast(how === 'reject' ? t('Zamítnuto', 'Rejected') : t('Schváleno', 'Approved'), done ? t('Rozhodnutí bylo odesláno (', 'Decision sent (') + id.slice(0, 8) + ').' : t('Rozhodnutí se nepodařilo odeslat.', 'Failed to send decision.'), how === 'reject' ? 'red' : 'green');
      await Core.refresh(true);
      renderNeedsYou(); renderDecisionsView(); renderNotifs(); updateBadges(); renderBriefing();
      tickerPush('done', 'Decision ' + id.slice(0, 8) + ' ' + (how === 'reject' ? 'rejected' : 'approved'));
      setTimeout(() => showView('decisions'), 600);
    } catch (e) {
      toast(t('Chyba', 'Error'), t('Při rozhodování došlo k chybě: ', 'Error while deciding: ') + e.message, 'red');
    }
  }

  function showDecision(id) { showView('decision', { id }); }
  function showTask(id) { showView('task-detail', { id }); }
  function showLead(id) { showView('lead-detail', { id }); }
  function showAgent(id) { showView('agent-detail', { id }); }
  function showReport() { showView('report'); }
  function openBoardHref(href) {
    if (!href) return;
    window.open(href, '_blank');
    toast(t('Originál', 'Original'), t('Otevřeno: ', 'Opened: ') + href, 'purple');
  }
  /* ---------- AKCE: Gmail / ISDS / Calendar / Ads / TURBOW ---------- */
  function callLead(leadId) {
    const l = (Core.state.leads.items || []).find(x => x.id === leadId);
    if (l && l.sourceUrl) { openBoardHref(l.sourceUrl); return; }
    openBoardHref('http://127.0.0.1:8877');
  }
  function composeMail() { openModal('compose-modal'); }
  function replyMail(to, subject) {
    const tg = $('#compose-to'); if (tg) tg.value = to || '';
    const s = $('#compose-subject'); if (s) s.value = subject ? 'Re: ' + subject : '';
    openModal('compose-modal');
  }
  function openMail(msgId) {
    const m = (Core.state.messages.items || []).find(x => x.id === msgId);
    if (m && m.sourceUrl) { openBoardHref(m.sourceUrl); return; }
    openBoardHref('https://mail.google.com/mail/u/0/#inbox');
  }
  async function archiveMail(msgId) {
    try {
      await Core.archiveMessage(msgId);
      toast(t('Archivováno', 'Archived'), t('Zpráva přesunuta z doručené pošty.', 'Message moved out of the inbox.'), 'green');
      await refreshAll();
    } catch (e) { toast(t('Chyba', 'Error'), e.message, 'red'); }
  }
  function openIsds() { openBoardHref('https://www.mojedatovaschranka.cz'); }
  function summarizeIsds() { toast('ISDS', t('Zprávy se čtou z lokální Datovka DB — přihlas se v Datovce a synchronizuj, pak se objeví zde.', 'Messages are read from the local Datovka DB — sign in to Datovka and sync, then they appear here.'), ''); }
  function addDeadline() { toast(t('Kalendář', 'Calendar'), t('Událost vytvoř přes API: POST /dh-api/commands/create-event {title, start, end} (timezone Europe/Prague).', 'Create event via API: POST /dh-api/commands/create-event {title, start, end} (timezone Europe/Prague).'), ''); }
  function openAds() { openBoardHref('https://ads.google.com'); }
  async function changeLeadStatus(leadId, status) {
    try {
      const r = await Core.changeLeadStatus(leadId, status);
      toast(t('Status změněn', 'Status changed'), status, 'green');
      await refreshAll();
    } catch (e) { toast(t('Chyba', 'Error'), e.message, 'red'); }
  }
  async function pauseCampaign(campaignId) {
    try {
      await Core.pauseCampaign(campaignId);
      toast(t('Pozastaveno', 'Paused'), t('Kampaň PAUSED.', 'Campaign PAUSED.'), 'green');
      await refreshAll();
    } catch (e) { toast(t('Chyba', 'Error'), e.message, 'red'); }
  }
  function updateBudget(campaignId) {
    const c = (Core.state.campaigns.items || []).find(x => x.id === campaignId);
    const cur = c && c.budgetMicros != null ? Math.round(c.budgetMicros / 1e6) : 0;
    const v = prompt(t('Denní rozpočet kampaně (Kč), aktuálně: ', 'Daily campaign budget (CZK), currently: ') + cur, String(cur || 100));
    if (v === null) return;
    const czk = Number(v);
    if (!Number.isFinite(czk) || czk <= 0) { toast(t('Chyba', 'Error'), t('Neplatná částka.', 'Invalid amount.'), 'red'); return; }
    Core.updateBudget(campaignId, Math.round(czk * 1e6))
      .then(() => { toast(t('Rozpočet změněn', 'Budget changed'), czk + ' Kč/den', 'green'); return refreshAll(); })
      .catch(e => toast(t('Chyba', 'Error'), e.message, 'red'));
  }
  function pauseAgent() { toast(t('Agenti', 'Agents'), t('Pause agenta přes MC není zatím povoleno — spravuj u zdroje.', 'Pausing an agent via MC is not allowed yet — manage at the source.'), ''); }
  function notifClick(title, href) {
    S.unreadNotifs = Math.max(0, S.unreadNotifs - 1); updateBadges(); closePop();
    if (href) openBoardHref(href);
    else toast(t('Notifikace', 'Notification'), title, '');
  }
  function markNotifsRead() { S.unreadNotifs = 0; updateBadges(); }

  function openModal(id) { const m = $('#' + id); if (m) m.classList.add('open'); }
  function closeModal(id) { const m = $('#' + id); if (m) m.classList.remove('open'); }
  async function submitTaskModal() {
    closeModal('task-modal');
    const title = ($('#task-title') && $('#task-title').value.trim()) || t('Nový úkol z Mission Control', 'New task from Mission Control');
    if (!Core.state.connected) { toast(t('Data offline', 'Data offline'), t('Nelze vytvořit úkol.', 'Cannot create task.'), 'red'); return; }
    try {
      const project = Core.state.turbow.root ? { projectId: Core.state.turbow.root.projectId } : {};
      const res = await Core.createTask(Object.assign({ title, description: t('Vytvořeno z Mission Control (', 'Created from Mission Control (') + new Date().toLocaleString('cs-CZ') + ')' }, project));
      const created = res && res.result;
      toast(t('Úkol vytvořen', 'Task created'), t('Vznikl úkol: ', 'Created task: ') + ((created && created.identifier) || (created && created.id) || '—'), 'green');
      await Core.refresh(true);
      renderTasksView(); renderNeedsYou(); updateBadges();
      if (created && created.id) showTask(created.id);
    } catch (e) { toast(t('Chyba', 'Error'), t('Vytvoření úkolu selhalo: ', 'Task creation failed: ') + e.message, 'red'); }
  }
  async function submitCompose() {
    const to = ($('#compose-to') && $('#compose-to').value.trim()) || '';
    const subject = ($('#compose-subject') && $('#compose-subject').value.trim()) || '';
    const body = ($('#compose-body') && $('#compose-body').value) || '';
    closeModal('compose-modal');
    if (!to) { toast(t('Chyba', 'Error'), t('Chybí příjemce (Komu).', 'Recipient (To) is missing.'), 'red'); return; }
    try {
      await Core.sendMessage({ to, subject: subject || t('(bez předmětu)', '(no subject)'), body });
      toast(t('Odesláno', 'Sent'), t('E-mail odeslán přes Gmail API.', 'Email sent via Gmail API.'), 'green');
      await refreshAll();
    } catch (e) { toast(t('Chyba', 'Error'), e.message, 'red'); }
  }
  function toggleSidebar() { S.sidebarCollapsed = !S.sidebarCollapsed; $('.app').classList.toggle('sidebar-collapsed', S.sidebarCollapsed); }
  function toggleRail() { S.railVisible = !S.railVisible; const a = $('.app'); a.classList.toggle('rail-hidden', !S.railVisible); }

  /* ---------- COMMAND PALETTE ---------- */
  const CMDS = [
    { g: ['Navigace', 'Navigate'], items: [
      { t: t('Domů / Dnes', 'Home / Today'), en: 'Home / Today', sub: t('Dnešní přehled a briefing', 'Today overview and briefing'), ensub: 'Today overview and briefing', icon: 'home', run: () => showView('home') },
      { t: t('Rozhodnutí — schválení', 'Decisions — approvals'), en: 'Decisions — approvals', sub: t('Čekající schválení', 'Pending approvals'), ensub: 'Pending approvals', icon: 'alert', run: () => showView('decisions') },
      { t: t('Agenti', 'Agents'), en: 'Agents', sub: t('Stav agentů (idle / running / error)', 'Agent status (idle / running / error)'), ensub: 'Agent status (idle / running / error)', icon: 'bot', run: () => showView('agents') },
      { t: t('Úkoly — otevřené', 'Tasks — open'), en: 'Tasks — open', sub: t('Otevřené úkoly', 'Open tasks'), ensub: 'Open tasks', icon: 'task', run: () => showView('tasks') },
      { t: 'TURBOW', en: 'TURBOW', sub: t('TURBOW projekt a jeho strom', 'TURBOW project and its tree'), ensub: 'TURBOW project and its tree', icon: 'lead', run: () => showView('turbow') },
      { t: t('Pipeline — leady', 'Pipeline — leads'), en: 'Pipeline — leads', sub: t('TURBOW lead pipeline', 'TURBOW lead pipeline'), ensub: 'TURBOW lead pipeline', icon: 'chart', run: () => showView('pipeline') },
      { t: t('Projekty', 'Projects'), en: 'Projects', sub: t('Projekty', 'Projects'), ensub: 'Projects', icon: 'folder', run: () => showView('projects') },
      { t: t('Aktivita', 'Activity'), en: 'Activity', sub: t('Jednotný activity stream', 'Unified activity stream'), ensub: 'Unified activity stream', icon: 'zap', run: () => showView('activity') },
      { t: t('Analytika', 'Analytics'), en: 'Analytics', sub: t('Run aktivita + náklady + GA4', 'Run activity + costs + GA4'), ensub: 'Run activity + costs + GA4', icon: 'chart', run: () => showView('analytics') }
    ]},
    { g: ['Zeptej se', 'Ask'], items: [
      { t: t('„co potřebuje mou pozornost“', '"what needs my attention"'), en: '"what needs my attention"', sub: t('Pozornost + chyby + blokace', 'Attention + errors + blocks'), ensub: 'Attention + errors + blocks', icon: 'spark', run: () => showView('home') },
      { t: t('„kteří agenti jsou v erroru“', '"which agents are in error"'), en: '"which agents are in error"', sub: t('Agenti se statusem error', 'Agents with error status'), ensub: 'Agents with error status', icon: 'spark', run: () => showView('agents') },
      { t: t('„ukaž blokované úkoly“', '"show blocked tasks"'), en: '"show blocked tasks"', sub: t('Pipeline → BLOCKED', 'Pipeline → BLOCKED'), ensub: 'Pipeline → BLOCKED', icon: 'spark', run: () => showView('pipeline') },
      { t: t('„co se právě děje“', '"what is happening right now"'), en: '"what is happening right now"', sub: t('Právě běží + aktivita', 'Working now + activity'), ensub: 'Working now + activity', icon: 'spark', run: () => showView('home') },
      { t: t('„otevři TURBOW“', '"open TURBOW"'), en: '"open TURBOW"', sub: t('TURBOW projekt', 'TURBOW project'), ensub: 'TURBOW project', icon: 'spark', run: () => { const t2 = Core.state.turbow.root; t2 && t2.sourceUrl ? openBoardHref(t2.sourceUrl) : showView('turbow'); } },
      { t: t('„vytvoř úkol“', '"create a task"'), en: '"create a task"', sub: t('Nový úkol', 'New task'), ensub: 'New task', icon: 'spark', run: () => { closeCmd(); openModal('task-modal'); } }
    ]},
    { g: ['Akce', 'Actions'], items: [
      { t: t('Nový úkol', 'New task'), en: 'New task', sub: t('Vytvoří úkol', 'Creates a task'), ensub: 'Creates a task', icon: 'plus', run: () => { closeCmd(); openModal('task-modal'); } },
      { t: t('Otevřít zdrojový board', 'Open source board'), en: 'Open source board', sub: Core.state.company && Core.state.company.boardUrl ? Core.state.company.boardUrl : '—', ensub: Core.state.company && Core.state.company.boardUrl ? Core.state.company.boardUrl : '—', icon: 'ext', run: () => { closeCmd(); const u = Core.state.company && Core.state.company.boardUrl; if (u) window.open(u, '_blank'); } },
      { t: t('Otevřít report (demo)', 'Open report (demo)'), en: 'Open report (demo)', sub: t('Ukázkový HTML report — design showcase', 'Sample HTML report — design showcase'), ensub: 'Sample HTML report — design showcase', icon: 'eye', run: () => showReport() },
      { t: t('Obnovit data', 'Refresh data'), en: 'Refresh data', sub: t('Znovu načte data přes DataHub', 'Reloads data via DataHub'), ensub: 'Reloads data via DataHub', icon: 'zap', run: () => { closeCmd(); refreshAll(); } }
    ]}
  ];

  function cmdEntities() {
    const out = [];
    Core.state.tasks.items.filter(i => ['todo', 'backlog', 'in_progress', 'blocked'].includes(i.status)).slice(0, 8).forEach(i =>
      out.push({ t: i.identifier + ' — ' + i.title.slice(0, 40), en: i.identifier + ' — ' + i.title.slice(0, 40), sub: 'Task · ' + i.status, ensub: 'Task · ' + i.status, icon: 'task', run: () => showTask(i.id) }));
    Core.state.agents.items.slice(0, 8).forEach(a =>
      out.push({ t: a.name + ' — ' + (a.title || a.role), en: a.name + ' — ' + (a.title || a.role), sub: 'Agent · ' + a.status, ensub: 'Agent · ' + a.status, icon: 'bot', run: () => showAgent(a.id) }));
    Core.state.projects.items.slice(0, 8).forEach(p =>
      out.push({ t: p.name, en: p.name, sub: 'Project · ' + p.status, ensub: 'Project · ' + p.status, icon: 'folder', run: () => openBoardHref(p.sourceUrl) }));
    return out;
  }

  function openCmd() {
    const o = $('#cmd-overlay'); if (!o) return;
    o.classList.add('open');
    const inp = $('#cmd-input'); if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 30); }
    renderCmd('');
  }
  function closeCmd() { const o = $('#cmd-overlay'); if (o) o.classList.remove('open'); }
  function renderCmd(q) {
    const host = $('#cmd-list'); if (!host) return;
    q = (q || '').trim().toLowerCase();
    let html = '';
    const flat = [];
    CMDS.forEach(g => g.items.forEach(i => flat.push({ ...i, g: t(g.g[0], g.g[1]) })));
    const entities = cmdEntities().filter(e => !q || (e.t + ' ' + e.sub).toLowerCase().includes(q));
    const cmds = flat.filter(i => !q || (i.t + ' ' + i.sub + ' ' + i.g).toLowerCase().includes(q));
    const sel = [];
    if (entities.length) {
      html += '<div class="cmd-group-label">' + t('Výsledky — úkoly / agenti / projekty', 'Results — tasks / agents / projects') + '</div>';
      entities.slice(0, 6).forEach((e, i) => { sel.push(e); html += cmdRow(e, i); });
    }
    const groups = {};
    cmds.forEach(c => { (groups[c.g] = groups[c.g] || []).push(c); });
    let idx = sel.length;
    Object.keys(groups).forEach(g => {
      if (!groups[g].length) return;
      html += '<div class="cmd-group-label">' + g + '</div>';
      groups[g].slice(0, 8).forEach(c => { sel.push(c); html += cmdRow(c, idx); idx++; });
    });
    if (!html) html = '<div class="cmd-empty">' + t('Nic nenalezeno pro „', 'Nothing found for "') + esc(q) + t('“. Zkus: „agenti“, „TURBOW“, „blokované“…', '". Try: "agents", "TURBOW", "blocked"…') + '</div>';
    host.innerHTML = html;
    host._sel = sel;
    host._idx = 0;
  }
  function cmdRow(c, i) {
    return '<div class="cmd-item" data-i="' + i + '" onclick="MC.runCmd(' + i + ')">' +
      '<span class="ci-icon">' + (I[c.icon] || I.doc) + '</span>' +
      '<span class="ci-main"><span class="ci-title">' + esc(t(c.t, c.en)) + '</span>' + (c.sub ? '<span class="ci-sub">' + esc(t(c.sub, c.ensub)) + '</span>' : '') + '</span>' +
      '<span class="ci-tag">' + esc(c.g || 'entity') + '</span></div>';
  }
  function runCmd(i) {
    const host = $('#cmd-list'); if (!host || !host._sel) return;
    const c = host._sel[i]; if (!c) return;
    closeCmd();
    c.run();
  }

  /* ---------- POPOVERS ---------- */
  function togglePop(id) { const p = $('#' + id); if (!p) return; const open = p.classList.contains('open'); closePop(); if (!open) p.classList.add('open'); }
  function closePop() { $$('.pop.open').forEach(p => p.classList.remove('open')); }

  /* ---------- POLL & REFRESH (centralizováno v MCCore) ---------- */
  async function refreshAll() {
    try {
      await Core.refresh(true);
      renderAll();
      tickerPush('sys', t('Data synchronizována — ', 'Data synced — ') + companyName());
      toast(t('Synchronizováno', 'Synced'), t('Data aktualizována.', 'Data updated.'), 'green');
    } catch (e) {
      renderAll();
      toast(t('Sync selhal', 'Sync failed'), e.message, 'red');
    }
  }

  function renderAll() {
    renderInstrument(); renderBriefing(); renderHomeStats(); renderNeedsYou(); renderDecisionsView();
    renderWorkingNow(); renderRecentResults(); renderLiveFeed(); renderKanban(); renderAgentsView();
    renderTasksView(); renderProjectsView(); renderTurbow(); renderActivity(); renderNotifs();
    renderNextEvent(); renderNotConnectedSections(); renderAnalytics(); renderIntegrations();
    renderGmail(); renderIsds(); renderCalendar(); renderAds(); renderSearchConsole(); renderTurbowLeads(); renderLeadsPipeline();
    renderPaperclipStats(); renderPerf(); renderTasksWork(); renderRailInsight();
    renderPersonal(); watchStatusWatchdog(); renderNotifStrip(); renderNotifications(); renderSettingsValues();
    updateBadges();
  }

  /* ---------- BOOT ---------- */
  async function boot() {
    window.MC = {
      showView, showDecision, showTask, showLead, showAgent, showReport, openBoardHref, callLead, composeMail, replyMail,
      openMail, archiveMail, openIsds, summarizeIsds, addDeadline, openAds, pauseAgent, resolveDecision,
      changeLeadStatus, pauseCampaign, updateBudget,
      notifClick, markNotifsRead, openModal, closeModal, submitTaskModal, submitCompose, toggleSidebar,
      toggleRail, togglePop, closePop, openCmd, closeCmd, renderCmd, runCmd, createTaskModal: () => openModal('task-modal'),
      refreshAll, toast, _toast: toast, toggleLang,
      notifOpen, setNotifTab, setNotifCats,
      watchAdd, watchRemove, watchAddAuto,
      googleConsent, googleExchange,
      calNav, calToday, calSetMode, calGo, openEventModal, submitEvent
    };

    applyLang();
    applyTheme();
    applyDensity();

    // vykresli UI okamžitě (loading / disconnected), pak načti data
    renderInstrument(); renderNotConnectedSections(); renderIntegrations();
    renderNeedsYou(); renderWorkingNow(); renderRecentResults(); renderLiveFeed(); renderKanban();
    renderTasksView(); renderProjectsView(); renderActivity(); renderNotifs(); renderNextEvent();
    renderAnalytics(); renderDecisionsView(); renderBriefing(); renderHomeStats();
    renderGmail(); renderIsds(); renderCalendar(); renderAds(); renderSearchConsole(); renderTurbowLeads(); renderLeadsPipeline();
    renderPaperclipStats(); renderPerf(); renderTasksWork(); renderRailInsight();
    const td = $('#today-date'); if (td) td.textContent = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
    const clock = () => { const c = $('#inst-clock'); if (c) c.textContent = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
    clock(); setInterval(clock, 1000);
    const ageTick = () => {
      $$('[data-age]').forEach(el => { el.textContent = fmtAgo(el.dataset.age); });
    };
    setInterval(ageTick, 2000);

    const _rt = parseRoute();
    showView(_rt.id, _rt.opts);

    // PŘIPOJENÍ: nejdřív cache (okamžitě, ~10 ms), pak full sync na pozadí.
    // Už žádných 25 s "Data offline" při startu.
    const cached = await Core.refresh().then(() => true).catch(() => false);
    if (cached) { initTicker(); renderAll(); } else { renderAll(); }
    Core.refresh(true).then(() => {
      initTicker(); renderAll();
      toast(t('Data připojena', 'Data connected'), t('Zobrazena živá data firmy ', 'Showing live data of ') + companyName() + ' — ' + t('žádný mock.', 'no mock.'), 'green');
    }).catch(() => {
      renderAll();
      toast(t('Data nedostupná', 'Data unavailable'), (Core.state.error || t('Integrační vrstva nedostupná', 'Integration layer unavailable')) + ' — start.sh (MC 5175 + DataHub 5180).', 'red');
    });
    // centralizovaný polling s backoff (§16) — jeden endpoint, žádné duplicity
    Core.startPolling(renderAll);

    // global events
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const o = $('#cmd-overlay'); o && o.classList.contains('open') ? closeCmd() : openCmd();
      }
      if (e.key === 'Escape') { closeCmd(); closePop(); $$('.modal-overlay.open').forEach(m => m.classList.remove('open')); }
      const ov = $('#cmd-overlay');
      if (ov && ov.classList.contains('open')) {
        const host = $('#cmd-list');
        if (host && host._sel && host._sel.length) {
          if (e.key === 'ArrowDown') { e.preventDefault(); host._idx = (host._idx + 1) % host._sel.length; markSel(host); }
          if (e.key === 'ArrowUp') { e.preventDefault(); host._idx = (host._idx - 1 + host._sel.length) % host._sel.length; markSel(host); }
          if (e.key === 'Enter') { e.preventDefault(); runCmd(host._idx); }
        }
      }
    });
    function markSel(host) { $$('.cmd-item', host).forEach((el, i) => el.classList.toggle('sel', i === host._idx)); const cur = $$('.cmd-item', host)[host._idx]; if (cur) cur.scrollIntoView({ block: 'nearest' }); }
    const cmdInp = $('#cmd-input');
    if (cmdInp) cmdInp.addEventListener('input', (e) => renderCmd(e.target.value));
    $$('.sb-item').forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); showView(item.dataset.view); }));
    window.addEventListener('popstate', () => { const r = parseRoute(); showView(r.id, r.opts); });
    const sbToggle = $('[data-action="toggle-sidebar"]'); if (sbToggle) sbToggle.addEventListener('click', toggleSidebar);
    const railToggle = $('[data-action="toggle-rail"]'); if (railToggle) railToggle.addEventListener('click', toggleRail);
    const bell = $('[data-action="notif"]'); if (bell) bell.addEventListener('click', (e) => { e.stopPropagation(); togglePop('notif-pop'); });
    const addBtn = $('[data-action="quick-add"]'); if (addBtn) addBtn.addEventListener('click', () => openModal('task-modal'));
    const cmdTrigger = $('#cmd-trigger'); if (cmdTrigger) cmdTrigger.addEventListener('click', openCmd);
    const langBtn = $('#lang-toggle'); if (langBtn) langBtn.addEventListener('click', toggleLang);
    initSettingsListeners();
    document.addEventListener('click', (e) => { if (!e.target.closest('.pop-anchor')) closePop(); });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
