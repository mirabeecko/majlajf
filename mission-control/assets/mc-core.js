/* ============================================================
   MISSION CONTROL — browser klient DATAHUBu (canonical kontrakty)
   ------------------------------------------------------------
   UI mluví JEN s /mc-api/* (fasáda → DataHub /dh-api/*).
   Žádný provider-specific tvar, URL, port ani token sem nesmí.

   Kontrakty (queries):
     loadState()        → kompletní canonical bundle (jeden request)
     attention/tasks/agents/projects/decisions/activity/overview/turbow
     health             → přehled integrací
   Kontrakty (commands):
     approveTask(entityId) / rejectTask(entityId) / createTask(input)
   Realtime: centralizovaný polling s backoff — jeden endpoint,
   in-flight dedup, žádné duplicitní requesty (§16).
   ============================================================ */
(function () {
  'use strict';

  const API_BASE = (location.pathname.indexOf('/mission-control') === 0) ? '/mission-control' : ((location.protocol === 'http:' || location.protocol === 'https:') ? '' : 'http://127.0.0.1:5175');
  const POLL_MS = 30000;      // standardní interval
  const MAX_POLL_MS = 300000; // strop backoffu (5 min)

  const EMPTY = { items: [], totalCount: 0, syncedAt: null, stale: true, sources: [] };

  const Core = {
    state: {
      connected: false,
      error: null,
      lastSyncAt: null,
      stale: false,
      health: [],                       // IntegrationHealth[]
      company: null,                    // { id, name, boardUrl }
      attention: EMPTY,                 // AttentionItem[]
      tasks: EMPTY,                     // Task[]
      agents: EMPTY,                    // Agent[]
      projects: EMPTY,                  // Project[]
      decisions: EMPTY,                 // Decision[]
      activity: EMPTY,                  // ActivityItem[]
      overview: null,                   // AgentOverview
      turbow: { root: null, subtree: [] },
      messages: EMPTY,                  // Message[] (Gmail)
      isdsMessages: EMPTY,              // Message[] (Datová schránka)
      events: EMPTY,                    // CalendarEvent[]
      agenda: EMPTY,                    // dnešní agenda (seřazená)
      leads: EMPTY,                     // Lead[] (TURBOW)
      pipeline: { stages: [], total: 0 },
      analytics: { daily: [], totals: {} },
      campaigns: EMPTY,                 // Google Ads kampaně
      spend: { data: null, syncedAt: null, stale: true },
      searchconsole: { daily: [], totals: {}, siteUrl: null },
      meta: null,
    },
    _inFlight: null,
    _timer: null,
    _interval: POLL_MS,

    async fetchJson(path, opts) {
      const r = await fetch(API_BASE + '/mc-api' + path, opts || {});
      let body = null;
      try { body = await r.json(); } catch (e) { body = null; }
      if (!r.ok || (body && body.ok === false)) {
        const err = new Error((body && body.error && body.error.message) || ('HTTP ' + r.status));
        err.code = (body && body.error && body.error.code) || 'unknown';
        err.retryable = !!(body && body.error && body.error.retryable);
        err.httpStatus = r.status;
        throw err;
      }
      return body;
    },

    applyState(data) {
      const s = this.state;
      s.connected = true;
      s.error = null;
      s.lastSyncAt = data.meta && data.meta.syncedAt || null;
      s.stale = !!(data.meta && data.meta.stale);
      s.meta = data.meta || null;
      s.health = (data.health && data.health.integrations) || [];
      s.company = data.company || null;
      s.attention = data.attention || EMPTY;
      s.tasks = data.tasks || EMPTY;
      s.agents = data.agents || EMPTY;
      s.projects = data.projects || EMPTY;
      s.decisions = data.decisions || EMPTY;
      s.activity = data.activity || EMPTY;
      s.overview = data.overview || null;
      s.turbow = data.turbow || { root: null, subtree: [] };
      s.messages = data.messages || EMPTY;
      s.isdsMessages = data.isdsMessages || EMPTY;
      s.events = data.events || EMPTY;
      s.agenda = data.agenda || EMPTY;
      s.leads = data.leads || EMPTY;
      s.pipeline = data.pipeline || { stages: [], total: 0 };
      s.analytics = data.analytics || { daily: [], totals: {} };
      s.campaigns = data.campaigns || EMPTY;
      s.spend = data.spend || { data: null, syncedAt: null, stale: true };
      s.searchconsole = data.searchconsole || { daily: [], totals: {}, siteUrl: null };
    },

    /**
     * Jediný refresh bod. Žádné duplicitní requesty (in-flight guard),
     * backoff při chybě (§16, §24).
     * @param {boolean} forceRefresh - true = požádat DataHub o synchronizaci zdrojů
     */
    async refresh(forceRefresh) {
      if (this._inFlight) return this._inFlight;
      const p = (async () => {
        try {
          const data = await this.fetchJson('/state' + (forceRefresh ? '?refresh=1' : ''));
          this.applyState(data);
          this._interval = POLL_MS;
        } catch (e) {
          this.state.connected = false;
          this.state.error = e.message || String(e);
          this._interval = Math.min(MAX_POLL_MS, Math.round(this._interval * 2 + Math.random() * 3000));
          throw e;
        }
      })();
      this._inFlight = p;
      try { await p; } finally { this._inFlight = null; }
      return p;
    },

    /** Write akce — jediná cesta; UI nikdy nevolá provider API (§12). */
    async command(name, input) {
      return this.fetchJson('/commands/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input || {}),
      });
    },
    approveTask(entityId) { return this.command('approve-task', { entityId, idempotencyKey: idemKey('approve', entityId) }); },
    rejectTask(entityId) { return this.command('reject-task', { entityId, idempotencyKey: idemKey('reject', entityId) }); },
    createTask(input) { return this.command('create-task', Object.assign({}, input, { idempotencyKey: idemKey('create', JSON.stringify(input || {})) })); },
    sendMessage(input) { return this.command('send-message', Object.assign({}, input, { idempotencyKey: idemKey('send', JSON.stringify(input || {})) })); },
    archiveMessage(entityId) { return this.command('archive-message', { entityId, idempotencyKey: idemKey('archive', entityId) }); },
    createEvent(input) { return this.command('create-event', Object.assign({}, input, { idempotencyKey: idemKey('event', JSON.stringify(input || {})) })); },
    changeLeadStatus(entityId, status) { return this.command('change-lead-status', { entityId, status, idempotencyKey: idemKey('leadstatus', entityId + ':' + status) }); },
    pauseCampaign(entityId) { return this.command('pause-campaign', { entityId, idempotencyKey: idemKey('pause', entityId) }); },
    updateBudget(entityId, amountMicros) { return this.command('update-budget', { entityId, amountMicros, idempotencyKey: idemKey('budget', entityId + ':' + amountMicros) }); },

    /** Centralizovaný polling: setTimeout řetěz s backoff intervalem. */
    startPolling(onUpdate) {
      if (this._timer) return;
      const tick = async () => {
        try {
          await this.refresh();
          // state se aktualizoval — nech UI přerenderovat (jinak DOM žije dál starými daty)
          if (typeof onUpdate === 'function') onUpdate();
        } catch (e) { /* backoff řeší refresh() */ }
        this._timer = setTimeout(tick, this._interval);
      };
      tick();
    },

    /** Uživatelské nastavení intervalu obnovování (ms). */
    setPollInterval(ms) {
      const v = Math.max(10000, Math.min(600000, Number(ms) || POLL_MS));
      this._interval = v;
      return v;
    },
  };

  // idempotency klíč UI: stabilní pro stejný cíl, aby opakovaný klik
  // (např. dvojité odeslání) neprovedl akci dvakrát (§22)
  function idemKey(verb, target) {
    let h = 0;
    const s = verb + ':' + target;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return 'ui:' + verb + ':' + Math.abs(h).toString(36);
  }

  window.MCCore = Core;
})();
