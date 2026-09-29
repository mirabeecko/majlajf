/* ============================================================================
 *  PPC Generator — jádro pro Google Ads Editor
 *  ---------------------------------------------------------------------------
 *  Sestaví z dat jednotlivých kroků soubor pro import do Google Ads Editoru
 *  a ověří ho. Formát je ověřený (viz tools/ppc_format.py a dokumentace Editoru):
 *    • UTF-16LE s BOM, oddělovač TAB
 *    • hlavička anglicky (Editor ignoruje velikost písmen a mezery)
 *    • 1 řádek = 1 entita, prázdná buňka = "nic neměň"
 *  Modul je použitelný v prohlížeči (window.PPCImport) i v Node (require).
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PPCImport = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── hlavička: názvy sloupců přesně jako v Editor exportu ──────────────────
  const HEADER = [].concat(
    ['Campaign', 'Campaign Type', 'Networks', 'Budget', 'Budget type',
     'EU political ads', 'Standard conversion goals', 'Customer acquisition',
     'Languages', 'Bid Strategy Type', 'Enhanced CPC', 'Target CPA',
     'Maximum CPC bid limit', 'Start Date', 'End Date', 'Ad rotation',
     'Campaign Status', 'Labels', 'Tracking template', 'Final URL expansion'],
    ['ID', 'Location', 'Reach', 'Bid Modifier'],
    ['Ad Group', 'Ad Group Type', 'Ad group status', 'Max CPC', 'Target CPA'],
    ['Keyword', 'Criterion Type', 'Account keyword type', 'Status'],
    ['Ad type', 'Ad name', 'Final URL', 'Path 1', 'Path 2'],
    Array.from({ length: 15 }, (_, i) => 'Headline ' + (i + 1)),
    Array.from({ length: 4 }, (_, i) => 'Description ' + (i + 1)),
    ['Link Text', 'Description Line 1', 'Description Line 2', 'Source',
     'Upgraded extension', 'Callout text', 'Header', 'Snippet Values',
     'Phone Number', 'Country of Phone', 'Audience segment', 'Ad Schedule',
     'Device Preference']
  );

  const MATCH_TYPES = { exact: 'Exact', phrase: 'Phrase', broad: 'Broad' };
  const NEG_TYPES = {
    exact: 'Negative Exact', phrase: 'Negative Phrase', broad: 'Negative Broad'
  };
  const CAMPAIGN_NEG = 'Campaign negative';
  const STATUSES = ['Enabled', 'Paused', 'Removed'];
  const AD_TYPES = ['Responsive search ad', 'Expanded text ad', 'Responsive display ad'];
  const BID_STRATEGIES = ['Maximize conversions', 'Maximize conversion value',
    'Maximize clicks', 'Target CPA', 'Target ROAS', 'Target impression share',
    'Manual CPC', 'Manual CPM', 'Target CPM', 'Percent CPC'];
  const LIMITS = { headline: 30, description: 90, path: 15, sitelink: 25,
                   sitelinkDesc: 35, callout: 25, keyword: 80, campaignName: 120,
                   minHeadlines: 3, minDescriptions: 2 };

  // ── pomocné ───────────────────────────────────────────────────────────────
  const clean = (v) => String(v == null ? '' : v)
    .replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ').replace(/ {2,}/g, ' ').trim();

  const matchType = (v, neg) => {
    const k = String(v || 'phrase').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const key = k.indexOf('exact') >= 0 ? 'exact' : k.indexOf('broad') >= 0 ? 'broad' : 'phrase';
    return (neg ? NEG_TYPES : MATCH_TYPES)[key];
  };

  function geoId(name) {
    const n = String(name || '').toLowerCase();
    if (/^česko|^cesko|czech|^cz$/.test(n)) return '2203';
    if (/slovensko|slovak/.test(n)) return '2703';
    return '';
  }

  // ── z dat kroků na řádky pro Editor ───────────────────────────────────────
  function toRows(state) {
    const s = state || {};
    const p = s.params || {};
    const rows = [];
    const startDate = p.startDate || new Date().toISOString().slice(0, 10);

    (s.struktura && s.struktura.kampane || []).forEach((k) => {
      const camp = { nazev: k.nazev || 'Kampaň', typ: k.typ || 'Search',
                     sit: k.sit || 'Google search;Search Partners',
                     rozpocet: k.rozpocet, nabidka: k.nabidka || 'Maximize clicks',
                     stav: k.stav || p.stavKampane || 'Paused' };

      rows.push({
        Campaign: camp.nazev, 'Campaign Type': camp.typ, Networks: camp.sit,
        Budget: camp.rozpocet, 'Budget type': 'Daily',
        'EU political ads': "Doesn't have EU political ads",
        'Standard conversion goals': 'Account-level',
        'Customer acquisition': 'Bid equally',
        Languages: p.jazyk || 'cs', 'Bid Strategy Type': camp.nabidka,
        'Enhanced CPC': 'Disabled', 'Target CPA': k.cilovaCPA || '',
        'Maximum CPC bid limit': camp.nabidka === 'Maximize clicks' ? '0.00' : '',
        'Start Date': startDate, 'End Date': '[]',
        'Ad rotation': 'Optimize for clicks', 'Campaign Status': camp.stav,
        'Final URL expansion': camp.stav === 'Enabled' ? 'Disabled' : '',
      });

      (k.lokality && k.lokality.length ? k.lokality : (p.lokality || ['Česko']))
        .forEach((loc) => {
          const nazev = typeof loc === 'string' ? loc : (loc.nazev || '');
          if (!nazev) return;
          rows.push({ Campaign: camp.nazev, ID: geoId(nazev) || (loc.id || ''),
                      Location: nazev });
        });

      (k.sestavy || []).forEach((a) => {
        rows.push({
          Campaign: camp.nazev, 'Ad Group': a.nazev, 'Ad Group Type': 'Standard',
          'Ad group status': a.stav || p.stavSestav || camp.stav || 'Paused',
          'Max CPC': a.maxCpc || (camp.nabidka === 'Maximize clicks' ? 15 : ''),
        });
      });
    });

    // klíčová slova
    ((s.keywords || {}).sestavy || []).forEach((sk) => {
      (sk.klice || []).forEach((kw) => {
        const slovo = typeof kw === 'string' ? kw : kw.slovo;
        if (!slovo) return;
        rows.push({ Campaign: sk.kampan || findCamp(s, sk.sestava), 'Ad Group': sk.sestava,
                    Keyword: slovo, 'Criterion Type': matchType(kw.shoda, false),
                    'Account keyword type': 'None', Status: sk.stav || p.stavKlice || 'Paused' });
      });
    });

    // vylučující slova — kampaňová
    ((s.negatives || {}).kampanove || []).forEach((kw) => {
      const slovo = typeof kw === 'string' ? kw : kw.slovo;
      if (!slovo) return;
      rows.push({ Campaign: (typeof kw === 'object' && kw.kampan) || firstCamp(s),
                  Keyword: slovo, 'Criterion Type': CAMPAIGN_NEG,
                  'Account keyword type': 'None', Status: 'Enabled' });
    });

    // vylučující slova — v sestavě
    ((s.negatives || {}).sestavy || []).forEach((sn) => {
      (sn.slova || []).forEach((kw) => {
        const slovo = typeof kw === 'string' ? kw : kw.slovo;
        if (!slovo) return;
        rows.push({ Campaign: sn.kampan || findCamp(s, sn.sestava), 'Ad Group': sn.sestava,
                    Keyword: slovo, 'Criterion Type': matchType(kw.shoda, true),
                    'Account keyword type': 'None', Status: 'Enabled' });
      });
    });

    // publikum / lookalike (pozorování, ne cílení)
    ((s.publika || {}).segmenty || []).forEach((seg) => {
      const nazev = typeof seg === 'string' ? seg : seg.nazev;
      if (!nazev || (typeof seg === 'object' && seg.doImportu === false)) return;
      rows.push({ Campaign: (seg.kampan) || firstCamp(s), 'Ad Group': seg.sestava || '',
                  'Audience segment': nazev, 'Bid Modifier': seg.modifikator || '',
                  'Targeting method': 'Observation' });
    });

    // reklamy
    ((s.reklamy || {}).sestavy || []).forEach((r) => {
      const camp = r.kampan || findCamp(s, r.sestava);
      const url = r.finalUrl || siteUrl(s);
      const row = {
        Campaign: camp, 'Ad Group': r.sestava, 'Ad type': 'Responsive search ad',
        'Ad name': r.nazev || ('RSA ' + (r.sestava || '')), 'Final URL': url,
        'Path 1': r.cesty && r.cesty[0], 'Path 2': r.cesty && r.cesty[1],
        Status: r.stav || p.stavReklam || 'Paused',
      };
      (r.titulky || []).slice(0, 15).forEach((t, i) => { row['Headline ' + (i + 1)] = t; });
      (r.popisky || []).slice(0, 4).forEach((t, i) => { row['Description ' + (i + 1)] = t; });
      rows.push(row);
    });

    // rozšíření
    const ext = s.rozsireni || {};
    (ext.sitelinky || []).forEach((sl) => {
      const text = typeof sl === 'string' ? sl : sl.text;
      if (!text) return;
      rows.push({ Campaign: (sl.kampan) || firstCamp(s), 'Start Date': '[]', 'End Date': '[]',
                  'Ad Schedule': '[]', 'Final URL': sl.url || siteUrl(s),
                  Source: 'Advertiser', 'Upgraded extension': '[]', 'Link Text': text,
                  'Description Line 1': sl.popis1 || '', 'Description Line 2': sl.popis2 || '',
                  'Campaign Status': 'Paused', Status: 'Enabled' });
    });
    (ext.callouty || []).forEach((c) => {
      const text = typeof c === 'string' ? c : c.text;
      if (!text) return;
      rows.push({ Campaign: (c.kampan) || firstCamp(s), 'Start Date': '[]', 'End Date': '[]',
                  'Ad Schedule': '[]', Source: 'Advertiser', 'Upgraded extension': '[]',
                  'Callout text': text, 'Campaign Status': 'Paused', Status: 'Enabled' });
    });
    (ext.snippety || []).forEach((sn) => {
      const hodnoty = (sn.hodnoty || []).join(';');
      if (!sn.header || !hodnoty) return;
      rows.push({ Campaign: sn.kampan || firstCamp(s), Source: 'Advertiser',
                  'Upgraded extension': '[]', Header: sn.header,
                  'Snippet Values': '"' + hodnoty + '"',
                  'Campaign Status': 'Paused', Status: 'Enabled' });
    });
    (ext.telefon && ext.telefon.cislo) && rows.push({
      Campaign: firstCamp(s), 'Phone Number': ext.telefon.cislo,
      'Country of Phone': ext.telefon.zeme || 'CZ', Source: 'Advertiser',
      'Campaign Status': 'Paused', Status: 'Enabled' });

    return rows;
  }

  const firstCamp = (s) => {
    const k = ((s.struktura || {}).kampane || [])[0];
    return (k && k.nazev) || 'Kampaň';
  };
  const findCamp = (s, sestava) => {
    const ks = ((s.struktura || {}).kampane || []);
    for (const k of ks) {
      if ((k.sestavy || []).some((a) => a.nazev === sestava)) return k.nazev;
    }
    return firstCamp(s);
  };
  const siteUrl = (s) => {
    let u = (s.params || {}).url || (s.site || {}).url || '';
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  };

  // ── validace ──────────────────────────────────────────────────────────────
  function rowKind(r) {
    const g = (k) => clean(r[k]);
    if (g('Keyword')) {
      const t = g('Criterion Type').toLowerCase();
      return t.indexOf('campaign') >= 0 ? 'negative_campaign'
        : t.indexOf('negative') >= 0 ? 'negative' : 'keyword';
    }
    if (g('Ad type') || g('Headline 1')) return 'ad';
    if (g('Link Text')) return 'sitelink';
    if (g('Callout text')) return 'callout';
    if (g('Snippet Values')) return 'snippet';
    if (g('Phone Number')) return 'call';
    if (g('Audience segment')) return 'audience';
    if (g('Location')) return 'location';
    if (g('Ad Group')) return 'adgroup';
    if (g('Campaign')) return 'campaign';
    return 'unknown';
  }

  function validate(rows) {
    const errors = [], warnings = [], stats = {};
    const seen = {};
    rows.forEach((r, i) => {
      const line = i + 2, g = (k) => clean(r[k]);
      const kind = rowKind(r);
      stats[kind] = (stats[kind] || 0) + 1;
      const err = (m) => errors.push('ř. ' + line + ': ' + m);
      const warn = (m) => warnings.push('ř. ' + line + ': ' + m);

      if (kind === 'unknown') return err('nedá se určit typ entity');
      if (!g('Campaign')) err('chybí kampaň');
      if (g('Campaign').length > LIMITS.campaignName) err('název kampaně je moc dlouhý');
      if (g('Campaign Status') && STATUSES.indexOf(g('Campaign Status')) < 0)
        err('neplatný Campaign Status "' + g('Campaign Status') + '"');
      if (g('Status') && STATUSES.indexOf(g('Status')) < 0)
        err('neplatný Status "' + g('Status') + '"');

      if (kind === 'campaign') {
        if (g('Budget') !== '' && !(parseFloat(g('Budget')) > 0))
          err('rozpočet "' + g('Budget') + '" musí být číslo větší než 0');
        if (g('Bid Strategy Type') && BID_STRATEGIES.indexOf(g('Bid Strategy Type')) < 0)
          warn('neobvyklá nabídková strategie "' + g('Bid Strategy Type') + '"');
      }
      if (kind === 'adgroup') {
        if (g('Max CPC') !== '' && isNaN(parseFloat(g('Max CPC'))))
          err('Max CPC "' + g('Max CPC') + '" není číslo');
      }
      if (kind === 'keyword' || kind === 'negative' || kind === 'negative_campaign') {
        const kw = g('Keyword');
        if (kw.length > LIMITS.keyword) err('klíčové slovo má ' + kw.length + ' znaků (max 80)');
        '^~{}='.split('').forEach((bad) => {
          if (kw.indexOf(bad) >= 0) err('klíčové slovo nesmí obsahovat "' + bad + '"');
        });
        const ct = g('Criterion Type');
        if (kind === 'keyword' && ['Exact', 'Phrase', 'Broad'].indexOf(ct) < 0)
          err('shoda "' + ct + '" musí být Exact/Phrase/Broad');
        if (kind === 'negative' && ct.indexOf('Negative') !== 0)
          err('negativum musí mít "Negative Broad/Phrase/Exact" (má "' + ct + '")');
        if (kind === 'negative_campaign' && ct !== CAMPAIGN_NEG)
          err('kampaňové negativum musí mít "' + CAMPAIGN_NEG + '"');
        if (kind === 'negative_campaign' && g('Ad Group'))
          err('kampaňové negativum nesmí mít vyplněnou sestavu');
        if (kind === 'negative' && !g('Ad Group'))
          err('negativum v sestavě musí mít vyplněnou sestavu');
        const key = [g('Campaign'), g('Ad Group'), kw.toLowerCase(), ct].join('|');
        if (seen[key]) {
          if (kind === 'negative') warn('duplicitní negativum "' + kw + '"');
          else err('duplicitní klíčové slovo "' + kw + '" (' + ct + ')');
        }
        seen[key] = true;
      }
      if (kind === 'ad') {
        const hl = [];
        for (let n = 1; n <= 15; n++) if (g('Headline ' + n)) hl.push(g('Headline ' + n));
        if (hl.length < LIMITS.minHeadlines)
          err('reklama musí mít aspoň ' + LIMITS.minHeadlines + ' titulky (má ' + hl.length + ')');
        hl.forEach((h, n) => { if (h.length > LIMITS.headline)
          err('Headline ' + (n + 1) + ' má ' + h.length + ' znaků (max 30)'); });
        const ds = [];
        for (let n = 1; n <= 4; n++) if (g('Description ' + n)) ds.push(g('Description ' + n));
        if (ds.length < LIMITS.minDescriptions)
          err('reklama musí mít aspoň ' + LIMITS.minDescriptions + ' popisky (má ' + ds.length + ')');
        ds.forEach((d, n) => { if (d.length > LIMITS.description)
          warn('Description ' + (n + 1) + ' má ' + d.length + ' znaků (max 90 — Editor to odmítne)'); });
        if (!g('Final URL')) err('reklama nemá Final URL');
        else if (!/^https?:\/\//i.test(g('Final URL'))) err('Final URL musí začínat http(s)://');
        ['Path 1', 'Path 2'].forEach((p) => {
          if (g(p) && g(p).length > LIMITS.path)
            err(p + ' má ' + g(p).length + ' znaků (max 15)');
        });
      }
      if (kind === 'sitelink') {
        if (g('Link Text').length > LIMITS.sitelink) err('text sitelinku má ' + g('Link Text').length + ' znaků (max 25)');
        if (!g('Final URL')) err('sitelink nemá Final URL');
        ['Description Line 1', 'Description Line 2'].forEach((c) => {
          if (g(c) && g(c).length > LIMITS.sitelinkDesc)
            err(c + ' má ' + g(c).length + ' znaků (max 35)');
        });
      }
      if (kind === 'callout' && g('Callout text').length > LIMITS.callout)
        err('callout má ' + g('Callout text').length + ' znaků (max 25)');
    });
    return { errors, warnings, stats, ok: errors.length === 0 };
  }

  // ── zápis do bajtů (UTF-16LE + BOM, TAB) ──────────────────────────────────
  function cellFor(col, val) {
    const s = clean(val);
    if (!s) return '';
    // Editor sám quotuje vícehodnotové buňky se středníkem
    if (col === 'Snippet Values' && s.indexOf(';') >= 0 && s[0] !== '"') return '"' + s + '"';
    return s;
  }

  function text(rows) {
    const out = [HEADER.join('\t')];
    rows.forEach((r) => {
      const cells = HEADER.map((c) => cellFor(c, r[c]));
      while (cells.length && cells[cells.length - 1] === '') cells.pop();
      out.push(cells.join('\t'));
    });
    return out.join('\r\n') + '\r\n';
  }

  function toBytes(rows) {
    const t = text(rows);
    const isNode = typeof Buffer !== 'undefined' && typeof TextEncoder === 'undefined';
    if (isNode) {
      // UTF-16LE i s BOM (Node)
      const b = Buffer.from(t, 'utf16le');
      return Buffer.concat([Buffer.from([0xff, 0xfe]), b]);
    }
    const units = new Uint16Array(t.length);
    for (let i = 0; i < t.length; i++) units[i] = t.charCodeAt(i);
    const body = new Uint8Array(units.buffer);
    const out = new Uint8Array(body.length + 2);
    out[0] = 0xff; out[1] = 0xfe;
    out.set(body, 2);
    return out;
  }

  function fileName(state) {
    let host = 'web';
    try {
      const u = new URL(siteUrl(state));
      host = (u.hostname || 'web').replace(/^www\./, '');
    } catch (e) { /* necháme výchozí */ }
    const d = new Date();
    const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
    return host.replace(/[^a-z0-9.-]/gi, '_') + '_google_ads_editor_' + stamp + '.csv';
  }

  // jeden krok celého procesu -> jeden hotový soubor
  function build(state) {
    const rows = toRows(state);
    const report = validate(rows);
    const bytes = toBytes(rows);
    return { rows, report, bytes, fileName: fileName(state), columns: HEADER.length };
  }

  return {
    HEADER, MATCH_TYPES, NEG_TYPES, CAMPAIGN_NEG, LIMITS, STATUSES,
    toRows, validate, toBytes, text, build, fileName, rowKind, clean,
  };
}));
