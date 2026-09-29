/* ============================================================================
 *  PPC Generator — serverless proxy (Vercel Node function)
 *  ---------------------------------------------------------------------------
 *  Drží LLM klíč na serveru (env OPENROUTER_API_KEY) a staví prompty pro
 *  jednotlivé kroky procesu. Klient posílá jen parametry, ne hotové prompty.
 *
 *  Akce:
 *    GET  ?action=config                    → seznam kroků, modelů a doporučení
 *    POST {action:"site", url}              → stáhne web a vytáhne z něj text
 *    POST {action:"step", step, model, ...} → spustí jeden krok přes LLM
 *
 *  Ochrana: přístupový kód (env PPC_ACCESS_CODE), whitelist modelů, whitelist
 *  Origin, strop vstupu, rate limit na IP, timeout 130 s + jeden pokus navíc.
 * ========================================================================== */

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

// ── modely (stejný seznam jako LLM Arena, ověřený v produkci) ───────────────
const MODELY = {
  'openai/gpt-6-sol': 'GPT-6 Sol',
  'openai/gpt-6-luna': 'GPT-6 Luna',
  'openai/gpt-6-luna-pro': 'GPT-6 Luna Pro',
  'openai/gpt-5.6-sol': 'GPT-5.6 Sol',
  'google/gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
  'google/gemini-3.8-flash': 'Gemini 3.8 Flash',
  'google/gemini-3.5-flash': 'Gemini 3.5 Flash',
  'google/gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'x-ai/grok-4.7': 'Grok 4.7',
  'x-ai/grok-4.5': 'Grok 4.5',
  'x-ai/grok-4.3': 'Grok 4.3',
  'anthropic/claude-opus-5': 'Claude Opus 5',
  'anthropic/claude-sonnet-5': 'Claude Sonnet 5',
  'anthropic/claude-haiku-4.5': 'Claude Haiku 4.5',
  'deepseek/deepseek-v4-pro': 'DeepSeek V4 Pro',
  'deepseek/deepseek-v4-flash': 'DeepSeek V4 Flash',
  'deepseek/deepseek-v3.2': 'DeepSeek V3.2',
  'qwen/qwen3.8-27b': 'Qwen 3.8 27B',
  'meta-llama/llama-4-maverick': 'Llama 4 Maverick',
  'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
  'mistralai/mistral-large-latest': 'Mistral Large',
  'openai/gpt-oss-120b': 'GPT-OSS 120B',
};

const THINKING = /gemini-3|gpt-6|gpt-5\.6|grok-4\.7|grok-4\.5|claude-opus-5|deepseek-v4-pro|deepseek-r1/;

// ── kroky procesu: každý má doporučený model a vlastní zadání ───────────────
const KROKY = [
  { id: 'analyza', nazev: '1 · Analýza webu',
    popis: 'Přečte web a vytáhne obor, služby, výhody, cílové skupiny, témata a tón komunikace.',
    doporuceny: 'google/gemini-3.1-pro-preview', teplota: 0.3, maxTokens: 3000,
    duvod: 'velký kontext a nejlepší čtení rozsáhlého textu webu' },
  { id: 'struktura', nazev: '2 · Struktura kampaní a sestav',
    popis: 'Rozdělí nabídku do kampaní a tematických sestav včetně rozpočtů a nabídkových strategií.',
    doporuceny: 'anthropic/claude-sonnet-5', teplota: 0.4, maxTokens: 3500,
    duvod: 'nejlépe drží strukturu a logiku členění' },
  { id: 'klice', nazev: '3 · Klíčová slova a shodné typy',
    popis: 'Vygeneruje klíčová slova podle sestav včetně shodných typů a priority.',
    doporuceny: 'openai/gpt-6-luna-pro', teplota: 0.6, maxTokens: 5000,
    duvod: 'nejlepší jazyková pestrost a pokrytí variant' },
  { id: 'negativa', nazev: '4 · Vylučující slova',
    popis: 'Navrhne vylučující slova na úrovni kampaně i jednotlivých sestav.',
    doporuceny: 'deepseek/deepseek-v4-pro', teplota: 0.4, maxTokens: 5000,
    duvod: 'dlouhé seznamy zvládá nejlevněji a přitom kvalitně' },
  { id: 'publika', nazev: '5 · Publika a lookalike',
    popis: 'Navrhne publika (in-market, affinity, custom intent) a podobná publika včetně způsobu použití.',
    doporuceny: 'google/gemini-3.5-flash', teplota: 0.5, maxTokens: 2500,
    duvod: 'rychlý a dobře se orientuje ve znalostní bázi Google Ads' },
  { id: 'reklamy', nazev: '6 · Reklamy (titulky a popisky)',
    popis: 'Napíše responzivní reklamy: 15 titulků do 30 znaků, 4 popisky do 90 znaků, cesty.',
    doporuceny: 'anthropic/claude-opus-5', teplota: 0.7, maxTokens: 4000,
    duvod: 'nejlepší textařina při dodržení znakových limitů' },
  { id: 'rozsireni', nazev: '7 · Rozšíření (sitelinky, callouty, snippety)',
    popis: 'Navrhne rozšíření reklamy včetně textů a odkazů.',
    doporuceny: 'openai/gpt-6-sol', teplota: 0.6, maxTokens: 3000,
    duvod: 'kreativní a zároveň drží limity' },
  { id: 'nastaveni', nazev: '8 · Nastavení, rozpočty a kontrola',
    popis: 'Doplní lokality, rozpočty, nabídky a provede závěrečnou kontrolu celku.',
    doporuceny: 'anthropic/claude-sonnet-5', teplota: 0.3, maxTokens: 3000,
    duvod: 'spolehlivé čísla a věcná kontrola' },
];

const LIMITS = {
  maxTokensCap: 8000,
  maxPromptChars: 40000,
  timeoutMs: 130000,
  siteTimeoutMs: 20000,
  siteChars: 16000,
  maxKroku: 60,          // strop volání na jednu IP za hodinu
};

// ── jednoduchý rate limit na IP (drží se v paměti instance) ─────────────────
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { t: now, n: 0 };
  if (now - rec.t > 3600_000) { rec.t = now; rec.n = 0; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 2000) hits.clear();
  return rec.n > LIMITS.maxKroku;
}

// ── stahování webu ──────────────────────────────────────────────────────────
const stripTags = (html) => html
  .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ');

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&[a-z]+;/gi, ' ')
  .replace(/[ \t\u00a0]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

function extrahuj(html, url) {
  const t = (re) => { const m = html.match(re); return m ? decode(stripTags(m[1])) : ''; };
  const title = t(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || '';
  const h1 = (html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || []).map((x) => decode(stripTags(x))).slice(0, 4);
  const h2 = (html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || []).map((x) => decode(stripTags(x))).slice(0, 12);
  const h3 = (html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || []).map((x) => decode(stripTags(x))).slice(0, 12);
  const text = decode(stripTags(html)).slice(0, LIMITS.siteChars);
  const tel = (html.match(/(?:tel:|\+420\s?)\s?(\d[\d\s]{7,12})/i) || [])[0] || '';
  const mail = (html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [])[0] || '';
  const odkazy = [...new Set((html.match(/href=["']([^"'#?]+)["']/gi) || [])
    .map((x) => x.replace(/href=["']/i, '').replace(/["']$/, ''))
    .filter((h) => h && !/^(mailto|tel|javascript)/i.test(h))
    .map((h) => { try { return new URL(h, url).href; } catch { return ''; } })
    .filter((h) => h && h.indexOf(new URL(url).origin) === 0))].slice(0, 40);
  return { url, title, desc: decode(desc), h1, h2, h3, text, tel, mail, odkazy };
}

async function stahni(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), LIMITS.siteTimeoutMs);
  try {
    const r = await fetch(url, {
      signal: ac.signal, redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept-Language': 'cs,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!r.ok) return { error: 'web vrátil HTTP ' + r.status };
    const html = (await r.text()).slice(0, 900000);
    // POZOR: web často přesměruje (www → bez www). Kanonická adresa je až r.url,
    // jinak se relativní odkazy i filtr "vlastní domény" počítají ze špatného originu.
    const finalUrl = r.url || url;
    const site = extrahuj(html, finalUrl);
    // single-page weby nemají v HTML skoro žádné odkazy — dotáhneme je ze sitemapy
    if (site.odkazy.length < 5) {
      const zeSitemapy = await sitemapa(finalUrl);
      if (zeSitemapy.length) site.odkazy = [...new Set(site.odkazy.concat(zeSitemapy))].slice(0, 40);
    }
    return { site };
  } catch (e) {
    const n = (e && e.name) || '';
    return { error: n === 'AbortError' ? 'web nestihl odpovědět do 20 s'
      : 'web se nepodařilo načíst (' + (e && e.message) + ')' };
  } finally { clearTimeout(timer); }
}

// stránky webu ze sitemapy (když je v HTML málo odkazů — typicky jednostránkové weby)
async function sitemapa(base) {
  const kandidati = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'];
  for (const c of kandidati) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      const r = await fetch(new URL(c, base).href, { signal: ac.signal, redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/125.0 Safari/537.36' } });
      clearTimeout(t);
      if (!r.ok) continue;
      const xml = (await r.text()).slice(0, 300000);
      const url2 = [...new Set((xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) || [])
        .map((x) => x.replace(/<\/?loc>/gi, '').trim()))];
      const orig = new URL(base).origin;
      const vlastni = url2.filter((u) => u.indexOf(orig) === 0);
      if (vlastni.length) return vlastni.slice(0, 30);
    } catch (e) { /* zkusíme další variantu */ }
  }
  return [];
}

// ── prompty pro jednotlivé kroky ────────────────────────────────────────────
const SPOLECNA_PRAVIDLA = [
  'Jsi seniorní PPC specialista na Google Ads pro český trh a zároveň pečlivý datový inženýr.',
  'Vracíš POUZE jeden JSON objekt. Žádný text okolo, žádné markdown bloky, žádné komentáře.',
  'Všechny texty piš v češtině (pokud zadání neříká jinak), bez zástupných znaků a bez anglicismů.',
  'Nevymýšlej si fakta o firmě, která nejsou na webu nebo v zadání. Když něco chybí, použij rozumný obecný návrh a označ to v poznámce.',
  'Dodržuj znakové limity Google Ads přesně — delší text Google odmítne.',
  'Češtinu piš VŽDY s plnou diakritikou (háčky, čárky) — „elektrikář", ne „elektrikar"; „Chabařovice", ne „Chabarovice".',
  'Názvy firem, obcí a značek opiš z webu přesně, včetně diakritiky. Nic nedomýšlej.',
].join(' ');

const g = (k, v, d) => (v === undefined || v === null || v === '' ? (d || '') : v);

function promptPro(krok, p, kontext) {
  const zaklad = [
    'ZADÁNÍ OD UŽIVATELE:',
    '- web: ' + g('url', p.url),
    p.znacka ? '- značka/název firmy: ' + p.znacka : '',
    p.obor ? '- obor: ' + p.obor : '',
    p.cil ? '- hlavní cíl kampaní: ' + p.cil : '',
    p.zeme ? '- cílový trh: ' + p.zeme : '- cílový trh: Česko',
    p.jazyk ? '- jazyk inzerátů: ' + p.jazyk : '- jazyk inzerátů: čeština',
    p.rozpocet ? '- měsíční rozpočet celkem: ' + p.rozpocet + ' Kč' : '',
    p.pocetSestav ? '- požadovaný počet sestav: ' + p.pocetSestav : '',
    p.kliceNaSestavu ? '- klíčových slov na sestavu: ' + p.kliceNaSestavu : '',
    p.ton ? '- tón komunikace: ' + p.ton : '',
    p.konkurence ? '- konkurence: ' + p.konkurence : '',
    p.zakazanaSlova ? '- nepoužívat tato slova: ' + p.zakazanaSlova : '',
    p.sluzby ? '- zdůraznit služby: ' + p.sluzby : '',
    p.poznamka ? '- další poznámky: ' + p.poznamka : '',
    '',
    'KONTEXT Z PŘEDCHOZÍCH KROKŮ:',
    kontext || '(zatím nic)',
    '',
  ].filter(Boolean).join('\n');

  const uprava = p.uprava ? '\nDODATEČNÉ ZADÁNÍ (má přednost): ' + String(p.uprava).slice(0, 1500) + '\n' : '';

  const zadani = {
    analyza: [
      'Přečti si obsah webu níže a proveď analýzu pro přípravu PPC kampaní.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"nazev":"název firmy nebo značky","obor":"obor podnikání","popis":"2-3 věty co firma dělá",',
      ' "sluzby":["konkrétní služba/produkt", "..."],',
      ' "usp":["konkrétní výhoda oproti konkurenci", "..."],',
      ' "cilovky":[{"nazev":"cílová skupina","potreba":"co potřebuje a co hledá"}],',
      ' "geografie":["oblast působení"],',
      ' "temata":["téma pro jednu reklamní sestavu"],',
      ' "ton":"jak firma komunikuje","cenovaHladina":"levná/střední/prémiová nebo neurčeno",',
      ' "seoFraze":["fráze, kterými web sám sebe popisuje"],',
      ' "chybi":"co na webu chybí a bylo by potřeba doplnit","poznamka":"cokoliv důležitého"}',
      '',
      'Pravidla: "temata" = 4 až 8 témat vhodných jako samostatné reklamní sestavy.',
      '"sluzby" = 5 až 12 konkrétních služeb. "usp" = 3 až 6 výhod, každá podložená obsahem webu.',
      '"seoFraze" = 5 až 15 frází přesně tak, jak je používá web.',
      '',
      'OBSAH WEBU:',
      '<web>',
      String(kontext || '').slice(0, LIMITS.maxPromptChars),
      '</web>',
    ].join('\n'),

    struktura: [
      'Navrhni strukturu Google Ads kampaní a reklamních sestav pro tento web.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"kampane":[{"nazev":"Název | téma","typ":"Search","sit":"Google search;Search Partners",',
      ' "rozpocet":"300","nabidka":"Maximize clicks","cil":"co má kampaň přinést",',
      ' "sestavy":[{"nazev":"S01 | téma sestavy","tema":"o čem sestava je","cil":"jaký dotaz má chytit",',
      '  "url":"https://.../konkretni-stranka"}]}]}',
      '',
      'Pravidla: 1 až 3 kampaně, v každé 2 až 6 sestav. Názvy kampaní formátu "Firma | téma".',
      'Názvy sestav formátu "S01 | téma" (S01, S02 ... průběžně). Sestava = jedno téma, žádné mísení.',
      '"url" = konkrétní stránka webu, která danému tématu odpovídá (vezmi ji z odkazů, jinak homepage).',
      '"rozpocet" = číslo v Kč na den jako text, vycházej z měsíčního rozpočtu v zadání.',
      '"nabidka" = jedna z: Maximize clicks, Maximize conversions, Target CPA, Manual CPC.',
      'Pro každou sestavu uveď, jaký typ dotazu má chytit (informační/nákupní/lokální).',
    ].join('\n'),

    klice: [
      'Vygeneruj klíčová slova ke každé sestavě.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"sestavy":[{"sestava":"přesný název sestavy z předchozího kroku",',
      ' "klice":[{"slovo":"klíčové slovo","shoda":"exact|phrase|broad","priorita":"vysoká|střední|nízká",',
      '  "duvod":"proč toto slovo"}]}]}',
      '',
      'Pravidla: 8 až 15 klíčových slov na sestavu. Shodné typy rozumně míchej, ale u oborových',
      'obecných slov používej hlavně phrase a exact. Slova bez diakritiky i s diakritikou uváděj',
      'v přirozené podobě (Google si diakritiku řeší sám) — neuváděj tedy dvakrát totéž jen kvůli diakritice.',
      'Žádné duplicitní slovo ve stejné shodě v jedné sestavě. Nepoužívej zakázaná slova ze zadání.',
      'Nezahrnuj obchodní názvy konkurence ani cizí značky.',
    ].join('\n'),

    negativa: [
      'Navrhni vylučující slova (negativní klíčová slova) pro tyto kampaně.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"kampanove":[{"slovo":"slovo","shoda":"broad|phrase|exact","duvod":"proč vyloučit"}],',
      ' "sestavy":[{"sestava":"přesný název sestavy","slova":[{"slovo":"slovo","shoda":"broad|phrase|exact","duvod":"proč"}]}]}',
      '',
      'Pravidla: 15 až 30 kampaňových vylučujících slov (hledání zdarma, návody, "jak si udělat sám",',
      'práce, brigáda, kurz, školení, konkurenční značky, nesouvisející obory) a 3 až 10 slov na sestavu',
      '(vylučují dotazy, které do sestavy nepatří, ale mohly by se v kampani objevit).',
      'Každé slovo uveď jen jednou v celém výstupu (kampaňová a sestavová se nesmí opakovat).',
      'Nikdy nevylučuj slovo, které je součástí nabídky firmy.',
    ].join('\n'),

    publika: [
      'Navrhni publika a podobná publika (lookalike) pro tyto kampaně.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"segmenty":[{"nazev":"přesný název publika v Google Ads","typ":"In-market|Affinity|Custom intent|Similar|Detailed demographics|Remarketing",',
      ' "cileni":"kdo to je a proč","modifikator":"např. 10% nebo prázdné","doImportu":true,',
      '  "poznamka":"jak přesně ho v Google Ads nastavit"}],',
      ' "customIntent":[{"nazev":"název publika","klice":["klíčové slovo pro publikum"],"url":"vzorová URL"}],',
      ' "lookalike":"vysvětlení, kde a jak podobná publika v Google Ads použít",',
      ' "poznamka":"důležité upozornění k použití"}',
      '',
      'Pravidla: 4 až 10 segmentů. "doImportu" nech true jen u takových, které jde spolehlivě',
      'vytvořit v Editoru podle názvu; u ostatních dej false a vysvětli to v poznámce.',
      'U custom intent publika (vytváří se z klíčových slov) vygeneruj 3 publika po 10 až 20 slovech.',
      'Pozor: podobná publika (Similar/Lookalike) v Google Ads existují jen u některých typů kampaní —',
      'napiš konkrétně, u kterých, a co místo nich použít u Search kampaní.',
    ].join('\n'),

    reklamy: [
      'Napiš responzivní reklamy (RSA) pro každou sestavu.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"sestavy":[{"sestava":"přesný název sestavy","finalUrl":"https://...","cesty":["cesta-1","cesta-2"],',
      ' "titulky":["15 titulků"],"popisky":["4 popisky"]}],"poznamkaKLimitum":"cokoliv"}',
      '',
      'PRAVIDLA, KTERÁ SE KONTROLUJÍ AUTOMATICKY:',
      '- přesně 15 titulků, každý maximálně 30 znaků (počítej znaky i s diakritikou)',
      '- přesně 4 popisky, každý maximálně 90 znaků',
      '- cesty: 2 hodnoty, každá maximálně 15 znaků, bez mezer (pomlčky ano)',
      '- titulky se nesmí navzájem opakovat ani být jen jinak velkými písmeny',
      '- každý titulek musí dávat smysl samostatně (Google je kombinuje náhodně)',
      '- používej konkrétní přínosy, čísla, lokalitu, výzvy k akci; vyhýbej se prázdným frázím',
      '- nepoužívej vykřičníky na konci titulků, velká písmena celých slov ani nadsázku',
      '- do titulků nedávej zástupné známky, hvězdičky ani emoji',
      '- piš spisovnou češtinou s diakritikou',
    ].join('\n'),

    rozsireni: [
      'Navrhni rozšíření reklam (assety) pro tyto kampaně.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"sitelinky":[{"text":"max 25 znaků","popis1":"max 35 znaků","popis2":"max 35 znaků","url":"https://..."}],',
      ' "callouty":[{"text":"max 25 znaků"}],',
      ' "snippety":[{"header":"Služby","hodnoty":["max 25 znaků","..."]}],',
      ' "poznamka":"cokoliv"}',
      '',
      'Pravidla: 4 až 8 sitelinků (každý míří na jinou stránku webu), 4 až 10 calloutů,',
      '1 až 3 snippety s hlavičkami z této množiny: Služby, Produkty, Značky, Typy, Vlastnosti,',
      'Vhodné pro, Ceny, Doprava, Platby, Akce, Oblasti, Odkazy. Hodnoty snippetu: 3 až 5 položek.',
      'Limity dodrž PŘESNĚ — delší text Google odmítne. Než odpověď odešleš, každý text si přepočítej',
      'a nech si raději 2–3 znaky rezervu (texty piš kratší, ne na hranici limitu).',
    ].join('\n'),

    nastaveni: [
      'Doplň nastavení kampaní a proveď závěrečnou kontrolu celku.',
      'Vrať JSON přesně v tomto tvaru:',
      '{"lokality":[{"nazev":"Česko","id":"2203","duvod":"proč"}],',
      ' "planovani":"návrh režimu zobrazování (nebo prázdné)","konverze":"které konverzní akce měřit",',
      ' "kampane":[{"nazev":"název z předchozích kroků","rozpocet":"300","nabidka":"Maximize clicks",',
      '  "cilovaCPA":"","poznamka":"na co si dát pozor"}],',
      ' "kontrola":[{"co":"co bylo zkontrolováno","stav":"ok|pozor|chybí","poznamka":"detail"}],',
      ' "priority":["co udělat jako první po importu"],',
      ' "poznamka":"shrnutí pro zadavatele, 3-6 vět"}',
      '',
      'Pravidla: "lokality" = cílové země/regiony (u Česka použij ID 2203, u Slovenska 2703).',
      '"kontrola" = 6 až 12 konkrétních kontrol (limity znaků, duplicitní slova, pokrytí témat,',
      'chybějící stránky, konverze, rozpočty, vylučující slova, soutěž o stejné dotazy).',
      '"priority" = 4 až 8 kroků, co má zadavatel po importu udělat.',
    ].join('\n'),
  }[krok.id];

  if (!zadani) return null;
  return {
    system: SPOLECNA_PRAVIDLA + ' Krok: ' + krok.nazev + '. ' + krok.popis,
    user: zaklad + uprava + zadani,
  };
}

// ── volání modelu ───────────────────────────────────────────────────────────
function budgetFor(model, maxTokens) {
  const want = THINKING.test(model) ? maxTokens * 2 : maxTokens;
  return Math.min(want, LIMITS.maxTokensCap);
}

async function callModel(key, model, messages, temperature, maxTokens, jsonOnly) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: budgetFor(model, maxTokens),
    usage: { include: true },
  };
  if (jsonOnly) body.response_format = { type: 'json_object' };
  // DeepSeek V4 má thinking defaultně zapnutý a u JSON výstupů ho usekává
  if (/deepseek/.test(model)) body.thinking = { type: 'disabled' };

  const once = async (timeout) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      const r = await fetch(OPENROUTER, {
        method: 'POST', signal: ac.signal,
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://majlajf.vercel.app/ppc-generator',
          'X-Title': 'PPC Generator',
        },
        body: JSON.stringify(body),
      });
      const txt = await r.text();
      let data = null;
      try { data = JSON.parse(txt); } catch (e) { /* necháme null */ }
      if (!r.ok) {
        const msg = (data && data.error && (data.error.message || data.error.code)) || txt.slice(0, 300);
        return { error: 'HTTP ' + r.status + ': ' + String(msg).slice(0, 300),
                 retryable: r.status === 429 || r.status >= 500 };
      }
      const ch = (data && data.choices) || [];
      if (!ch.length) return { error: 'model vrátil prázdnou odpověď', retryable: true };
      const m = ch[0].message || {};
      const text = String(m.content || m.reasoning || '').trim();
      if (!text) return { error: 'model vrátil prázdný text', retryable: true };
      return { text, usage: data.usage || {}, model: data.model || model,
               truncated: ch[0].finish_reason === 'length' };
    } catch (e) {
      const n = (e && e.name) || 'Error';
      const t = n === 'AbortError' || n === 'TimeoutError';
      return { error: t ? 'timeout — model nestihl odpovědět do ' + Math.round(timeout / 1000) + ' s'
                        : n + ': ' + (e && e.message),
               retryable: t, timeout: t };
    } finally { clearTimeout(timer); }
  };

  let out = await once(LIMITS.timeoutMs);
  if (out.error && (out.retryable || out.timeout)) {
    const second = await once(LIMITS.timeoutMs);
    if (!second.error) { second.opakovano = true; out = second; }
  }
  return out;
}

// vytáhne JSON i z odpovědi obalené markdownem nebo textem
function vytahniJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const pokusy = [t];
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i) pokusy.push(t.slice(i, j + 1));
  for (const p of pokusy) {
    try { return JSON.parse(p); } catch (e) { /* zkusíme dál */ }
  }
  return null;
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); }
    }
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 900000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ── handler ─────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const reply = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };

  const kod = process.env.PPC_ACCESS_CODE || '';

  // GET = konfigurace (kroky, modely) — bez klíče, jen popis
  if (req.method === 'GET') {
    return reply(200, {
      ok: true,
      kodPotreba: !!kod,
      kroky: KROKY.map((k) => ({ id: k.id, nazev: k.nazev, popis: k.popis,
        doporuceny: k.doporuceny, duvod: k.duvod })),
      modely: Object.keys(MODELY).map((m) => ({ id: m, nazev: MODELY[m],
        doporuceny: KROKY.some((k) => k.doporuceny === m) })),
      limity: { znakuTitulek: 30, znakuPopisek: 90, znakuCesta: 15, znakuSitelink: 25,
                znakuCallout: 25, titulku: 15, popisku: 4 },
    });
  }
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'použij GET nebo POST' });

  const origin = req.headers.origin || '';
  const okOrigin = !origin || [
    /^https:\/\/majlajf\.vercel\.app$/,
    /^https:\/\/majlajf-[a-z0-9]+-mirabeeckos-projects\.vercel\.app$/,
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  ].some((re) => re.test(origin));
  if (!okOrigin) return reply(403, { ok: false, error: 'volání je povoleno jen ze stránky generátoru' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return reply(500, { ok: false, error: 'chybí OPENROUTER_API_KEY v prostředí serveru' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'neznámá';
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'příliš mnoho požadavků, zkus to za chvíli' });

  const body = await readBody(req);

  // přístupový kód (když je nastavený)
  if (kod && String(body.kod || '') !== kod) {
    return reply(401, { ok: false, error: 'chybí nebo nesouhlasí přístupový kód', kodPotreba: true });
  }

  const action = body.action;

  if (action === 'site') {
    let url = String(body.url || '').trim();
    if (!url) return reply(400, { ok: false, error: 'chybí adresa webu' });
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let host;
    try { host = new URL(url).hostname; } catch (e) {
      return reply(400, { ok: false, error: 'adresa webu není platná' });
    }
    if (!/\./.test(host) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(host)) {
      return reply(400, { ok: false, error: 'tuhle adresu nenačtu (musí to být veřejný web)' });
    }
    const out = await stahni(url);
    if (out.error) return reply(200, { ok: false, error: out.error });
    return reply(200, { ok: true, site: out.site });
  }

  if (action === 'step') {
    const krok = KROKY.find((k) => k.id === body.step);
    if (!krok) return reply(400, { ok: false, error: 'neznámý krok "' + body.step + '"' });
    const model = String(body.model || '');
    if (!MODELY[model]) return reply(400, { ok: false, error: 'model "' + model + '" není v povoleném seznamu' });

    const p = (body.params && typeof body.params === 'object') ? body.params : {};
    p.url = String(p.url || '').slice(0, 500);
    const kontext = String(body.kontext || '').slice(0, LIMITS.maxPromptChars);
    const pr = promptPro(krok, p, kontext);
    if (!pr) return reply(400, { ok: false, error: 'prompt pro tento krok se nepodařilo sestavit' });

    const out = await callModel(key, model, [
      { role: 'system', content: pr.system },
      { role: 'user', content: pr.user },
    ], krok.teplota, krok.maxTokens, true);

    if (out.error) return reply(200, { ok: false, error: out.error, model, step: krok.id });

    let data = vytahniJson(out.text);
    let opraveno = false;
    if (!data) {
      // druhý pokus: požádáme výslovně o čistý JSON
      const out2 = await callModel(key, model, [
        { role: 'system', content: pr.system },
        { role: 'user', content: pr.user },
        { role: 'assistant', content: out.text.slice(0, 4000) },
        { role: 'user', content: 'Odpověď nebyla platný JSON. Vrať POUZE platný JSON objekt podle zadání, bez textu okolo.' },
      ], 0.1, krok.maxTokens, true);
      if (!out2.error) {
        const d2 = vytahniJson(out2.text);
        if (d2) { data = d2; opraveno = true; out.usage = out2.usage; out.model = out2.model; out.text = out2.text; }
      }
    }
    if (!data) {
      return reply(200, { ok: false, model, step: krok.id,
        error: 'model nevrátil platný JSON', ukazka: String(out.text).slice(0, 800) });
    }

    return reply(200, { ok: true, step: krok.id, model: out.model, data,
      usage: out.usage, opraveno, truncated: !!out.truncated, opakovano: !!out.opakovano });
  }

  return reply(400, { ok: false, error: 'neznámá akce — použij "site" nebo "step"' });
};
