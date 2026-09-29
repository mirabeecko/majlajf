// LLM Arena — serverless proxy na OpenRouter (Vercel Node function)
// Drží API klíč na serveru (env OPENROUTER_API_KEY), klient ho nikdy nevidí.
// Dva režimy:
//   {action:"answer", ...} → jedna odpověď jednoho modelu
//   {action:"judge",  ...} → jedno anonymní hodnocení jednoho porotce
// Klient skládá celý průběh (anonymizace probíhá v prohlížeči).

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

// ── whitelist modelů (aby se přes endpoint nedalo volat cokoliv drahého) ──
const ALLOWED = new Set([
  // vlajkové
  'openai/gpt-6-sol', 'openai/gpt-6-luna', 'openai/gpt-6-luna-pro', 'openai/gpt-5.6-sol',
  'google/gemini-3.1-pro-preview', 'google/gemini-3.8-flash', 'google/gemini-3.5-flash',
  'google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash',
  'x-ai/grok-4.7', 'x-ai/grok-4.20', 'x-ai/grok-4.3', 'x-ai/grok-4.5',
  'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout', 'meta-llama/llama-3.3-70b-instruct',
  // porota navíc
  'anthropic/claude-opus-5', 'anthropic/claude-sonnet-5', 'anthropic/claude-haiku-4.5',
  'deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash', 'deepseek/deepseek-v3.2',
  'qwen/qwen3.8-27b', 'mistralai/mistral-large-latest', 'openai/gpt-oss-120b',
]);

const LIMITS = {
  maxTokensCap: 4000,      // strop pro jeden call
  maxPromptChars: 12000,   // zadání
  maxBlocksChars: 60000,   // anonymní odpovědi pro porotce
  timeoutMs: 130000,       // 130 s na jeden call (funkce má strop 300 s)
  retryTimeoutMs: 130000,  // jeden pokus navíc, když model nestihne odpovědět
};

// Modely, které si „ukusují" rozvahové tokeny — mají nárok na větší rozpočet,
// jinak se viditelná odpověď uřízne v půlce věty.
const THINKING = /gemini-3|gpt-6|gpt-5\.6|grok-4\.7|grok-4\.5|claude-opus-5|deepseek-v4-pro|deepseek-r1/;

function budgetFor(model, maxTokens) {
  const want = THINKING.test(model) ? maxTokens * 3 : maxTokens;
  return Math.min(want, LIMITS.maxTokensCap);
}

const JUDGE_SYSTEM = [
  'Jsi přísný, nestranný hodnotitel. Neznáš autory odpovědí a nesmíš hádat, kdo je napsal.',
  'Hodnotíš pouze věcnou správnost, užitečnost, konkrétnost, originalitu a dodržení zadání.',
  'Odpovídej POUZE jedním JSON objektem, bez textu okolo, bez markdown bloku.',
].join(' ');

function judgeUser(spec) {
  const letters = spec.letters.join(', ');
  return [
    'ZADÁNÍ, které dostali autoři:',
    '<zadani>',
    String(spec.prompt || '').slice(0, 8000),
    '</zadani>',
    '',
    'Následují anonymizované odpovědi různých AI modelů:',
    '',
    String(spec.blocks || '').slice(0, LIMITS.maxBlocksChars),
    '',
    'Porovnej je a rozhodni, která je nejlepší. Vrať JSON přesně v tomto tvaru:',
    `{"poradi": [${spec.letters.map((l) => `"${l}"`).join(', ')}],`,
    ` "vitez": "${spec.letters[0]}",`,
    ` "skore": {${spec.letters.map((l) => `"${l}": 8.5`).join(', ')}},`,
    ' "duvod": "stručné zdůvodnění česky, 2-4 věty, bez jmen modelů"}',
    '',
    'Pravidla: "poradi" = od nejlepší po nejhorší, každé písmeno právě jednou.',
    '"skore" = 0-10 za každou odpověď. "vitez" se musí rovnat prvnímu v "poradi".',
    'Hodnoť v češtině, věcně, bez zdvořilostních frází.',
  ].join('\n');
}

// ── velmi jednoduchý rate limit (per instance, na přežití stačí) ──
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { t: now, n: 0 };
  if (now - rec.t > 3600_000) { rec.t = now; rec.n = 0; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 2000) hits.clear();
  return rec.n > 400;   // 400 callů / hodinu / IP
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
  // jeden pokus navíc: model nestihl odpovědět nebo selhalo dočasně
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
      info: 'POST {action:"answer"|"judge"} — proxy na OpenRouter, klíč zůstává na serveru.',
      modely: [...ALLOWED],
    });
  }
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'použij POST' });

  // ── ochrana: přijímáme jen požadavky z naší stránky (nebo z lokálu) ──
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

  if (action === 'answer') {
    if (!ALLOWED.has(model)) return reply(400, { ok: false, error: `model "${model}" není v povoleném seznamu` });
    const prompt = String(body.prompt || '').slice(0, LIMITS.maxPromptChars);
    if (prompt.trim().length < 3) return reply(400, { ok: false, error: 'zadání je moc krátké' });
    const messages = [];
    if (body.system) messages.push({ role: 'system', content: String(body.system).slice(0, 4000) });
    messages.push({ role: 'user', content: prompt });
    const out = await callModel(key, model, messages,
      Number.isFinite(+body.temperature) ? +body.temperature : 0.7,
      +body.max_tokens || 900);
    if (out.error) return reply(200, { ok: false, error: out.error, model });
    return reply(200, {
      ok: true, text: out.text, usage: out.usage, model: out.model,
      truncated: !!out.truncated, opakovano: !!out.opakovano,
    });
  }

  if (action === 'judge') {
    if (!ALLOWED.has(model)) return reply(400, { ok: false, error: `model "${model}" není v povoleném seznamu` });
    const letters = Array.isArray(body.letters) ? body.letters.slice(0, 8).map((l) => String(l).slice(0, 1)) : [];
    if (letters.length < 2) return reply(400, { ok: false, error: 'chybí písmena anonymních odpovědí' });
    if (!body.blocks) return reply(400, { ok: false, error: 'chybí anonymní odpovědi' });
    const out = await callModel(key, model, [
      { role: 'system', content: JUDGE_SYSTEM },
      { role: 'user', content: judgeUser({ prompt: body.prompt, blocks: body.blocks, letters }) },
    ], 0.1, +body.max_tokens || 1200);
    if (out.error) return reply(200, { ok: false, error: out.error, model });
    return reply(200, { ok: true, text: out.text, usage: out.usage, model: out.model, letters });
  }

  return reply(400, { ok: false, error: 'neznámá akce — použij "answer" nebo "judge"' });
};
