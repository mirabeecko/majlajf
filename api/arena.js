// LLM Arena — serverless proxy na OpenRouter (Vercel Node function)
// Drží API klíč na serveru (env OPENROUTER_API_KEY), klient ho nikdy nevidí.
// Režimy:
//   {action:"answer"}     → odpověď jednoho modelu na původní zadání
//   {action:"judge"}      → anonymní hodnocení (mode: "odpovedi" | "zadani")
//   {action:"synthesize"} → model z odpovědí sestaví NOVÉ, lepší zadání
// Anonymizaci, míchání pořadí a sčítání hlasů dělá prohlížeč.

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

// ── whitelist modelů ──
const ALLOWED = new Set([
  'openai/gpt-6-sol', 'openai/gpt-6-luna', 'openai/gpt-6-luna-pro', 'openai/gpt-5.6-sol',
  'google/gemini-3.1-pro-preview', 'google/gemini-3.8-flash', 'google/gemini-3.5-flash',
  'google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash',
  'x-ai/grok-4.7', 'x-ai/grok-4.20', 'x-ai/grok-4.3', 'x-ai/grok-4.5',
  'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout', 'meta-llama/llama-3.3-70b-instruct',
  'anthropic/claude-opus-5', 'anthropic/claude-sonnet-5', 'anthropic/claude-haiku-4.5',
  'deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash', 'deepseek/deepseek-v3.2',
  'qwen/qwen3.8-27b', 'mistralai/mistral-large-latest', 'openai/gpt-oss-120b',
]);

const LIMITS = {
  maxTokensCap: 4000,
  maxPromptChars: 12000,
  maxBlocksChars: 60000,
  timeoutMs: 130000,
  retryTimeoutMs: 130000,
};

const THINKING = /gemini-3|gpt-6|gpt-5\.6|grok-4\.7|grok-4\.5|claude-opus-5|deepseek-v4-pro|deepseek-r1/;

function budgetFor(model, maxTokens) {
  const want = THINKING.test(model) ? maxTokens * 3 : maxTokens;
  return Math.min(want, LIMITS.maxTokensCap);
}

// ════════════════════════════════════════════════════════════
//  ZADÁNÍ PRO POROTU — tady je celá „známkovací" logika
//  (stránka si tyto texty tahá přes GET /api/arena a zobrazuje je)
// ════════════════════════════════════════════════════════════

const JUDGE_SYSTEM_ANSWERS = [
  'Jsi přísný, nestranný hodnotitel. Neznáš autory odpovědí a nesmíš hádat, kdo je napsal.',
  'Hodnotíš pouze věcnou správnost, užitečnost, konkrétnost, originalitu a dodržení zadání.',
  'Odpovídej POUZE jedním JSON objektem, bez textu okolo, bez markdown bloku.',
].join(' ');

const JUDGE_SYSTEM_TASKS = [
  'Jsi přísný, nestranný hodnotitel zadání (promptů). Neznáš autory a nesmíš hádat, kdo je napsal.',
  'Hodnotíš kvalitu SAMOTNÉHO ZADÁNÍ: jednoznačnost, konkrétnost, úplnost, originalitu',
  'a to, jak dobře povede k vynikajícímu výsledku. Nehodnotíš odpovědi, jen zadání.',
  'Odpovídej POUZE jedním JSON objektem, bez textu okolo, bez markdown bloku.',
].join(' ');

function jsonSchema(letters, what, each, style) {
  const core = [
    `{"poradi": [${letters.map((l) => `"${l}"`).join(', ')}],`,
    ` "vitez": "${letters[0]}",`,
  ];
  if (style !== 'jen_poradi') {
    core.push(` "skore": {${letters.map((l) => `"${l}": 8.5`).join(', ')}},`);
  }
  core.push(' "duvod": "stručné zdůvodnění česky, 2-4 věty, bez jmen modelů"}');

  const out = ['Vrať JSON přesně v tomto tvaru:', ...core, ''];
  out.push('Pravidla: "poradi" = od nejlepší po nejhorší, každé písmeno právě jednou.');
  if (style !== 'jen_poradi') {
    out.push(`"skore" = 1-10 pro ${each}, kde 10 je nejlepší a 1 nejhorší.`);
  }
  if (style === 'znamky_rozptyl') {
    out.push('Použij CELOU škálu: nejlepší musí dostat aspoň 9 a nejhorší nejvýš 4.',
             'Vyhýbej se tomu dát všem podobné známky — rozdíly mají být vidět.');
  }
  out.push('"vitez" se musí rovnat prvnímu v "poradi".',
           'Hodnoť v češtině, věcně, bez zdvořilostních frází.');
  return out;
}

// styly hodnocení: poradi_znamky (výchozí), znamky_rozptyl (vynucená plná škála), jen_poradi
const STYLES = ['poradi_znamky', 'znamky_rozptyl', 'jen_poradi'];
const styleOf = (s) => (STYLES.includes(s) ? s : 'poradi_znamky');

function judgeUserAnswers(spec) {
  return [
    'ZADÁNÍ, které dostali autoři:',
    '<zadani>',
    String(spec.prompt || '').slice(0, 8000),
    '</zadani>',
    '',
    'Následují anonymizované ODPOVĚDI různých AI modelů:',
    '',
    String(spec.blocks || '').slice(0, LIMITS.maxBlocksChars),
    '',
    'Porovnej odpovědi a rozhodni, která je nejlepší (věcná správnost, užitečnost,',
    'konkrétnost, originalita, dodržení zadání).',
    '',
    ...jsonSchema(spec.letters, 'odpověď', 'každou odpověď', styleOf(spec.style)),
  ].join('\n');
}

function judgeUserTasks(spec) {
  return [
    'PŮVODNÍ ZADÁNÍ, ze kterého autoři vycházeli:',
    '<zadani>',
    String(spec.prompt || '').slice(0, 8000),
    '</zadani>',
    '',
    'Následují anonymizovaná NOVÁ ZADÁNÍ, která různí autoři sestavili tak,',
    'aby vedla k ještě lepšímu výsledku:',
    '',
    String(spec.blocks || '').slice(0, LIMITS.maxBlocksChars),
    '',
    'Porovnej ZADÁNÍ (ne odpovědi!) a rozhodni, které je nejlepší: které je nejjednoznačnější,',
    'nejkonkrétnější, nejúplnější, nejoriginálnější a povede k nejlepšímu výsledku.',
    '',
    ...jsonSchema(spec.letters, 'zadání', 'každé zadání', styleOf(spec.style)),
  ].join('\n');
}

const SYNTH_SYSTEM = [
  'Jsi špičkový tvůrce zadání (prompt engineer).',
  'Dostaneš původní zadání a anonymizované odpovědi několika AI modelů.',
  'Vezmi z nich to nejlepší — nápady, strukturu, detaily, silné formulace —',
  'a sestav JEDNO NOVÉ ZADÁNÍ, které povede k ještě lepšímu výsledku, než jaký vznikl dřív.',
  'Nové zadání musí být konkrétní, jednoznačné, úplné a přímo použitelné.',
  'Neopisuj jednu odpověď — skládej to nejlepší z více zdrojů a přidej, co všem chybělo.',
  'Odpovídej POUZE jedním JSON objektem, bez textu okolo, bez markdown bloku.',
].join(' ');

function synthUser(spec) {
  return [
    'PŮVODNÍ ZADÁNÍ:',
    '<zadani>',
    String(spec.prompt || '').slice(0, 8000),
    '</zadani>',
    '',
    'Anonymizované odpovědi různých modelů:',
    '',
    String(spec.blocks || '').slice(0, LIMITS.maxBlocksChars),
    '',
    'Sestav z toho nejlepšího nové zadání. Vrať JSON přesně v tomto tvaru:',
    '{"nove_zadani": "plné znění nového zadání, česky, připravené ke zkopírování",',
    ` "vychazi_z": [${spec.letters.map((l) => `"${l}"`).join(', ')}],`,
    ' "proc_je_lepsi": "2-4 věty, co jsi převzal a co jsi přidal"}}',
    '',
    'Pravidla: "vychazi_z" = písmena odpovědí, ze kterých jsi čerpal (jedno i více).',
    'Zadání piš v češtině, bez oslovení hodnotitele, bez vysvětlivek v jeho textu.',
  ].join('\n');
}

// ── jednoduchý rate limit ──
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { t: now, n: 0 };
  if (now - rec.t > 3600_000) { rec.t = now; rec.n = 0; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 2000) hits.clear();
  return rec.n > 400;
}

async function callModel(key, model, messages, temperature, maxTokens) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: budgetFor(model, maxTokens),
    usage: { include: true },
  };

  const once = async (timeout) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      const r = await fetch(OPENROUTER, {
        method: 'POST',
        signal: ac.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://majlajf.vercel.app/llm-arena',
          'X-Title': 'LLM Arena',
        },
        body: JSON.stringify(body),
      });
      const txt = await r.text();
      let data;
      try { data = JSON.parse(txt); } catch { data = null; }
      if (!r.ok) {
        const msg = (data && data.error && (data.error.message || data.error.code)) || txt.slice(0, 300);
        return { error: `HTTP ${r.status}: ${String(msg).slice(0, 300)}`, retryable: r.status === 429 || r.status >= 500 };
      }
      const ch = (data && data.choices) || [];
      if (!ch.length) return { error: 'prázdná odpověď modelu' };
      const m = ch[0].message || {};
      const text = (m.content || m.reasoning || '').trim();
      if (!text) return { error: 'model vrátil prázdný text', retryable: true };
      return {
        text,
        usage: data.usage || {},
        model: data.model || model,
        truncated: ch[0].finish_reason === 'length',
      };
    } catch (e) {
      const name = (e && e.name) || 'Error';
      const isTimeout = name === 'AbortError' || name === 'TimeoutError';
      return {
        error: isTimeout
          ? `timeout — model nestihl odpovědět do ${Math.round(timeout / 1000)} s`
          : `${name}: ${e && e.message}`,
        retryable: isTimeout,
        timeout: isTimeout,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  let out = await once(LIMITS.timeoutMs);
  if (out.error && (out.retryable || out.timeout)) {
    const second = await once(LIMITS.retryTimeoutMs);
    if (!second.error) { second.opakovano = true; out = second; }
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 500000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const reply = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method === 'GET') {
    return reply(200, {
      ok: true,
      service: 'llm-arena',
      info: 'POST {action:"answer"|"judge"|"synthesize"} — proxy na OpenRouter, klíč zůstává na serveru.',
      modely: [...ALLOWED],
      styly: STYLES,
      zadani_pro_porotu: (() => {
        const varianty = {};
        STYLES.forEach((s) => {
          varianty[s] = {
            odpovedi: { system: JUDGE_SYSTEM_ANSWERS, user: judgeUserAnswers({ prompt: '<ZADÁNÍ>', blocks: '<ODPOVĚDI A–D>', letters: ['A', 'B', 'C', 'D'], style: s }) },
            zadani: { system: JUDGE_SYSTEM_TASKS, user: judgeUserTasks({ prompt: '<PŮVODNÍ ZADÁNÍ>', blocks: '<NOVÁ ZADÁNÍ A–D>', letters: ['A', 'B', 'C', 'D'], style: s }) },
          };
        });
        return {
          varianty,
          nove_zadani: { system: SYNTH_SYSTEM, user: synthUser({ prompt: '<ZADÁNÍ>', blocks: '<ODPOVĚDI A–D>', letters: ['A', 'B', 'C', 'D'] }) },
        };
      })(),
    });
  }
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'použij POST' });

  const origin = req.headers.origin || '';
  const okOrigin = !origin || [
    /^https:\/\/majlajf\.vercel\.app$/,
    /^https:\/\/majlajf-[a-z0-9]+-mirabeeckos-projects\.vercel\.app$/,
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  ].some((re) => re.test(origin));
  if (!okOrigin) return reply(403, { ok: false, error: 'volání je povoleno jen ze stránky LLM Arena' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return reply(500, { ok: false, error: 'chybí OPENROUTER_API_KEY v prostředí serveru' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'neznámá';
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'příliš mnoho požadavků, zkus to za chvíli' });

  const body = await readBody(req);
  const action = body.action;
  const model = String(body.model || '');
  if (!ALLOWED.has(model)) return reply(400, { ok: false, error: `model "${model}" není v povoleném seznamu` });

  const letters = Array.isArray(body.letters) ? body.letters.slice(0, 8).map((l) => String(l).slice(0, 1)) : [];
  const blocks = String(body.blocks || '');

  if (action === 'answer') {
    const prompt = String(body.prompt || '').slice(0, LIMITS.maxPromptChars);
    if (prompt.trim().length < 3) return reply(400, { ok: false, error: 'zadání je moc krátké' });
    const messages = [];
    if (body.system) messages.push({ role: 'system', content: String(body.system).slice(0, 4000) });
    messages.push({ role: 'user', content: prompt });
    const out = await callModel(key, model, messages,
      Number.isFinite(+body.temperature) ? +body.temperature : 0.7, +body.max_tokens || 900);
    if (out.error) return reply(200, { ok: false, error: out.error, model });
    return reply(200, { ok: true, text: out.text, usage: out.usage, model: out.model,
      truncated: !!out.truncated, opakovano: !!out.opakovano });
  }

  if (action === 'judge') {
    if (letters.length < 2) return reply(400, { ok: false, error: 'chybí písmena anonymních položek' });
    if (!blocks) return reply(400, { ok: false, error: 'chybí anonymní obsah k hodnocení' });
    const mode = body.mode === 'zadani' ? 'zadani' : 'odpovedi';
    const style = styleOf(body.style);
    const system = mode === 'zadani' ? JUDGE_SYSTEM_TASKS : JUDGE_SYSTEM_ANSWERS;
    const user = mode === 'zadani'
      ? judgeUserTasks({ prompt: body.prompt, blocks, letters, style })
      : judgeUserAnswers({ prompt: body.prompt, blocks, letters, style });
    const out = await callModel(key, model, [{ role: 'system', content: system }, { role: 'user', content: user }],
      0.1, +body.max_tokens || 1200);
    if (out.error) return reply(200, { ok: false, error: out.error, model });
    return reply(200, { ok: true, text: out.text, usage: out.usage, model: out.model, letters, mode, style });
  }

  if (action === 'synthesize') {
    if (letters.length < 1) return reply(400, { ok: false, error: 'chybí písmena odpovědí' });
    if (!blocks) return reply(400, { ok: false, error: 'chybí odpovědi, ze kterých má vzniknout zadání' });
    const out = await callModel(key, model, [
      { role: 'system', content: SYNTH_SYSTEM },
      { role: 'user', content: synthUser({ prompt: body.prompt, blocks, letters }) },
    ], 0.4, +body.max_tokens || 1200);
    if (out.error) return reply(200, { ok: false, error: out.error, model });
    return reply(200, { ok: true, text: out.text, usage: out.usage, model: out.model, letters });
  }

  return reply(400, { ok: false, error: 'neznámá akce — použij "answer", "judge" nebo "synthesize"' });
};
