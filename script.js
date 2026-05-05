'use strict';

/* ===== Mobile menu ===== */
const menuToggle = document.getElementById('menuToggle');
const mobMenu = document.getElementById('mobMenu');
if (menuToggle && mobMenu) {
  menuToggle.addEventListener('click', () => {
    mobMenu.classList.toggle('hidden');
  });
  document.querySelectorAll('.mob-link').forEach(l => l.addEventListener('click', () => mobMenu.classList.add('hidden')));
}

/* ===== Scroll reveal ===== */
const revealEls = document.querySelectorAll('.rev, .revL, .revR');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); revealObs.unobserve(e.target); } });
}, { threshold: 0.1 });
revealEls.forEach(el => revealObs.observe(el));

/* ===== Slot bar countdown (resets every day at midnight) ===== */
(function slotCountdown(){
  const timerEl = document.getElementById('slot-timer');
  if (!timerEl) return;
  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const t = end.getTime() - now.getTime();
    if (t <= 0){ timerEl.textContent = '00:00:00'; return; }
    const h = Math.floor(t / 3600000);
    const m = Math.floor((t % 3600000) / 60000);
    const s = Math.floor((t % 60000) / 1000);
    timerEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
  }
  tick(); setInterval(tick, 1000);
})();

/* ===== Contact countdown (15 min) ===== */
(function contactCountdown(){
  const el = document.getElementById('countdown2');
  if (!el) return;
  let remaining = 15 * 60;
  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    if (remaining <= 0){ el.textContent = '00:00'; return; }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = pad(m) + ':' + pad(s);
    remaining--;
  }
  tick(); setInterval(tick, 1000);
})();

/* ===== Notifications (100 unique) ===== */
const NOTIFS = [
  {e:'🏢',t:'Martin V. z Prahy 1 zarezervoval slot pro web realitní kanceláře'},
  {e:'🍕',t:'Pizzerie Bella Praha 4 potvrdila náhled webu a zaplatila zálohu'},
  {e:'💇',t:'Barbershop Royal Praha 6 právě podepsal smlouvu na 24 měsíců'},
  {e:'🔧',t:'Autoservis Novák Praha 9 dokončil onboarding za 12 minut'},
  {e:'⚖️',t:'Advokátní kancelář JUDr. Horáček Praha přechází na Model C'},
  {e:'🏋️',t:'Fitness centrum PowerGym Praha 5 právě spustilo nový web'},
  {e:'📸',t:'Fotograf Marek B. Praha 2 zobrazil náhled webu a schválil'},
  {e:'🛍️',t:'Butik Mode Praha 7 objednal doménu a profesionální e-mail'},
  {e:'🦷',t:'MUDr. Svobodová Praha-Stodůlky dokončila registraci'},
  {e:'☕',t:'Kavárna Artisan Praha 10 přidala hodnocení 5 hvězdiček'},
  {e:'🏠',t:'Realitní kancelář Morava Brno potvrdila objednávku Model B'},
  {e:'🍺',t:'Pivnice U Kapucínů Brno právě spustila nový web'},
  {e:'💻',t:'IT startup DataFlow Brno zaplatil zálohu za Startup Flow'},
  {e:'🌿',t:'Zahradní centrum GreenBrno zobrazilo náhled webu'},
  {e:'🎨',t:'Grafické studio PixelArt Brno podepsalo smlouvu na 12 měsíců'},
  {e:'🏗️',t:'Stavební firma TechBuild Brno zarezervovala prémiový slot'},
  {e:'🧘',t:'Jóga centrum Brno-střed dokončilo onboarding formulář'},
  {e:'🔑',t:'Správa bytů Brno přechází na Growth Engine'},
  {e:'🍰',t:'Cukrárna Sweet Dreams Brno spustila web s rezervacemi'},
  {e:'📚',t:'Jazyková škola LinguaBrno přidala hodnocení 5 hvězdiček'},
  {e:'⚙️',t:'Strojní opravna Ostrava zarezervovala slot pro průmyslový web'},
  {e:'💈',t:'Kadeřnictví Stylo Ostrava-Poruba potvrdilo objednávku'},
  {e:'🚗',t:'Autopůjčovna DriveOstrava dokončila onboarding webu'},
  {e:'🌟',t:'Eventová agentura EventPro Ostrava právě spustila web'},
  {e:'🍣',t:'Sushi restaurant Sakura Ostrava zobrazilo náhled webu'},
  {e:'🔌',t:'Elektroinstalace Novotný Ostrava podepsalo smlouvu'},
  {e:'📦',t:'E-shop Ostrava Style přechází z Model A na Growth Engine'},
  {e:'🎭',t:'Taneční škola Rytmus Ostrava dokončila registraci'},
  {e:'🐾',t:'Psí salon Woofy Ostrava-Jih zaplatil zálohu za 12 měsíců'},
  {e:'🏊',t:'Aquapark klub Ostrava zaplatil zálohu za roční plán'},
  {e:'🍻',t:'Pivovar MiniBrewery Plzeň zarezervoval vývojový slot'},
  {e:'🏪',t:'Prodejna nářadí Plzeň-západ potvrdila objednávku Model A'},
  {e:'🌺',t:'Květinářství Florea Liberec spustilo web s e-shopem'},
  {e:'🎸',t:'Hudební škola Liberec zarezervovala slot pro nový web'},
  {e:'🏥',t:'Fyzioterapie MoveWell Olomouc zaplatila zálohu'},
  {e:'🧁',t:'Pekárna Zlatý klas Olomouc potvrdila objednávku'},
  {e:'🚀',t:'Tech startup SpeedOlom Olomouc dokončil onboarding'},
  {e:'🎓',t:'Doučování Olomouc online přidalo hodnocení 5 hvězd'},
  {e:'🏡',t:'Realitní makléř Ivo P. Olomouc právě spustil web'},
  {e:'🔍',t:'SEO agentura DigitalOlom přechází na Growth Engine'},
  {e:'💼',t:'Účetní firma HK zarezervovala slot pro nový web'},
  {e:'🌱',t:'Organická farma EcoBio Pardubice potvrdila web'},
  {e:'🚲',t:'Půjčovna kol CyclePardubice dokončila registraci'},
  {e:'🎯',t:'Marketing studio Hradec Králové spustilo nový web'},
  {e:'🍷',t:'Vinárna Bohemia České Budějovice potvrdila náhled'},
  {e:'🐕',t:'Veterinární klinika Paw ČB zaplatila roční zálohu'},
  {e:'🏄',t:'Vodní sporty Lipno zarezervovaly prémiový slot'},
  {e:'🎪',t:'Zábavní centrum Kids World ČB spustilo web'},
  {e:'🏰',t:'Cestovní kancelář BohemiaTour Pardubice uzavřela smlouvu'},
  {e:'🌊',t:'Půjčovna SUP ČB přechází na Model C s rezervačním systémem'},
  {e:'🛁',t:'Koupelnové studio Ústí nad Labem zarezervovalo slot'},
  {e:'💅',t:'Nehtové studio Elegance Ústí nad Labem potvrdilo objednávku'},
  {e:'🏨',t:'Penzion Grandview Karlovy Vary zaplatil zálohu'},
  {e:'🧖',t:'Wellness centrum Spa Vary dokončilo onboarding'},
  {e:'👟',t:'Obchod se sportovní obuví Zlín zarezervoval slot'},
  {e:'🏭',t:'Výrobní podnik Zlín-centrum potvrdil objednávku Model A'},
  {e:'🌍',t:'Překladatelská agentura KV Languages spustila web'},
  {e:'🎁',t:'Dárková prodejna GiftShop Karlovy Vary uzavřela smlouvu'},
  {e:'📊',t:'Obchodní zástupce z Frýdku-Místku přechází na Model C'},
  {e:'🎨',t:'Interiérový designér Jihlava zaplatil zálohu'},
  {e:'🛒',t:'E-shop módních doplňků Kladno spustil web s katalogem'},
  {e:'🏋️',t:'Personal trainer Mladá Boleslav zarezervoval slot'},
  {e:'🍜',t:'Asijský bistro Teplice potvrdilo objednávku webu'},
  {e:'💡',t:'Elektrikář OSVČ Opava zaplatil zálohu za Model A'},
  {e:'🌮',t:'Food truck festival Havířov zarezervoval slot'},
  {e:'🎻',t:'Hudební agentura Chomutov přidala hodnocení 5 hvězdiček'},
  {e:'🏪',t:'Papírnictví Přerov dokončilo onboarding nového webu'},
  {e:'🌻',t:'Zahradnictví Sunshine Kolín spustilo nový web'},
  {e:'✅',t:'Firma z Prostějova podepsala smlouvu na 24 měsíců'},
  {e:'🎉',t:'Web firmy z Třebíče byl spuštěn o 19 h dříve, než bylo plánováno'},
  {e:'💬',t:'Zákazník ze Znojma: "Výsledek předčil moje očekávání o 200 %"'},
  {e:'⭐',t:'Advokát JUDr. Šimek Vsetín přidal recenzi 5/5 hvězdiček'},
  {e:'🚀',t:'Startupista z Jablonce n. N. spustil svůj první profesionální web'},
  {e:'🔔',t:'Slot se uvolnil – zákazník z Berouna to okamžitě využil'},
  {e:'💰',t:'Účetní z Berouna zaplatila zálohu – web bude hotový do 24 h'},
  {e:'🏆',t:'Restaurace ze Strakonic: 50 rezervací za první týden po spuštění'},
  {e:'🌐',t:'Kavárna z Chebu spustila web a hned obdržela první objednávku'},
  {e:'📈',t:'E-shop ze Sokolova: +230 % návštěvnosti po spuštění webu'},
  {e:'🎯',t:'Kosmetický salon Šumperk: "Za 3 dny plný kalendář – super!"'},
  {e:'💎',t:'Zlatnictví Nový Jičín přechází na Growth Engine po 6 měsících'},
  {e:'🏗️',t:'Rekonstrukce bytů Krnov: 3 zakázky přes web za měsíc'},
  {e:'📱',t:'IT konzultant Příbram: "Web vypadá lépe než u větších firem"'},
  {e:'🌟',t:'Fyzioterapeut z Trutnova zarezervoval slot pro expanzi webu'},
  {e:'🎪',t:'Cestovní kancelář Litoměřice potvrdila náhled nového webu'},
  {e:'🛠️',t:'Instalatér z Karviné: "Web jsem měl za 21 h – funguje skvěle"'},
  {e:'🌈',t:'Grafický designér Most dokončil onboarding – startuje zítra'},
  {e:'🎓',t:'Soukromá školka Kopřivnice přidala hodnocení 5 hvězdiček'},
  {e:'🏥',t:'Ortopedická ordinace Frýdek-Místek spustila web s rezervacemi'},
  {e:'⚡',t:'POZOR: Dnešní slot je téměř obsazen – zbývá poslední místo!'},
  {e:'🔥',t:'Malíř pokojů Praha 8 právě využil dnešní poslední slot'},
  {e:'✅',t:'Zákazník z Brna doporučil WebDo24 svému obchodnímu partnerovi'},
  {e:'💯',t:'Hodnocení Google: 4,9 hvězdičky z 127 ověřených recenzí'},
  {e:'🎁',t:'Tři zákazníci dnes využili akci na rychlý start –15 %'},
  {e:'🌍',t:'Překladatelka Praha 3 přidala svůj web do Google Firmy'},
  {e:'📊',t:'Datový analytik z Brna: web generuje 8× více poptávek'},
  {e:'🏆',t:'WebDo24 dnes spustil 4. web za den – vše do 24 hodin!'},
  {e:'🚀',t:'Startup z Prahy přechází z Startup Flow na Growth Engine'},
  {e:'🔑',t:'Realitní makléřka Praha 4 spustila web a prodala nemovitost'},
  {e:'🎉',t:'Právě se uvolnil slot pro zítřejší start – využijte ho!'},
];

(function notifEngine(){
  const stack = document.getElementById('notif-wrap');
  if (!stack) return;
  const RHYTHM = [8000, 5000, 12000, 11000, 3000];
  let rhythmIdx = 0, queue = [];
  function refillQueue(){ queue = NOTIFS.map((_,i)=>i); for (let i=queue.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [queue[i],queue[j]]=[queue[j],queue[i]]; } }
  refillQueue();
  function nextNotif(){ if (!queue.length) refillQueue(); return NOTIFS[queue.pop()]; }
  function timeLabel(){ const r=Math.random(); if (r<0.45) return 'právě teď'; if (r<0.75) return 'před '+(Math.floor(Math.random()*8)+1)+' min'; if (r<0.92) return 'před '+(Math.floor(Math.random()*45)+15)+' min'; return 'dnes ráno'; }
  function buildToast(n){
    const el = document.createElement('div');
    el.className = 'notif-card in';
    el.innerHTML = `<div class="text-lg">${n.e}</div><div class="text-sm leading-snug min-w-0"><div class="font-semibold text-ivory truncate">${n.t}</div><div class="text-[11px] text-ivory/50 mt-0.5">${timeLabel()}</div></div><button class="text-ivory/40 hover:text-ivory text-lg leading-none px-1 ml-auto" aria-label="Zavřít">×</button>`;
    el.querySelector('button').addEventListener('click', ()=>removeToast(el));
    return el;
  }
  function removeToast(el){ el.classList.remove('in'); el.classList.add('out'); setTimeout(()=>el.remove(), 400); }
  function show(){
    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { schedule(); return; }
    const toast = buildToast(nextNotif()); stack.appendChild(toast);
    while (stack.children.length > 2) removeToast(stack.firstElementChild);
    setTimeout(()=>removeToast(toast), 6500); schedule();
  }
  function schedule(){ setTimeout(show, RHYTHM[rhythmIdx % RHYTHM.length]); rhythmIdx++; }
  setTimeout(show, 4000);
})();

/* ===== FAQ accordion ===== */
document.querySelectorAll('.faq-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const body = btn.nextElementSibling;
    const ico = btn.querySelector('.faq-ico');
    const isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
    document.querySelectorAll('.faq-body').forEach(b => { b.style.maxHeight = '0px'; });
    document.querySelectorAll('.faq-ico').forEach(i => { i.style.transform = 'rotate(0deg)'; i.textContent = '+'; });
    if (!isOpen) { body.style.maxHeight = body.scrollHeight + 'px'; ico.style.transform = 'rotate(180deg)'; ico.textContent = '−'; }
  });
});

/* ===== VOP accordion ===== */
document.querySelectorAll('.vop-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const body = btn.nextElementSibling;
    const ico = btn.querySelector('.vop-ico');
    const isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
    document.querySelectorAll('.vop-body').forEach(b => { b.style.maxHeight = '0px'; });
    document.querySelectorAll('.vop-ico').forEach(i => { i.style.transform = 'rotate(0deg)'; i.textContent = '+'; });
    if (!isOpen) { body.style.maxHeight = body.scrollHeight + 'px'; ico.style.transform = 'rotate(180deg)'; ico.textContent = '−'; }
  });
});

/* ===== Specs tabs ===== */
document.querySelectorAll('.spec-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.spec-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.spec-panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.remove('hidden');
  });
});

/* ===== Portfolio filter ===== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.portfolio-item').forEach(item => {
      if (filter === 'all' || item.dataset.cat === filter) {
        item.style.display = 'block'; item.style.opacity = '0'; setTimeout(()=>item.style.opacity='1', 50);
      } else {
        item.style.display = 'none';
      }
    });
  });
});

/* ===== Multi-step form ===== */
let currentStep = 1;
function toStep(n){
  if (n === 2) {
    const name = document.getElementById('f_name').value.trim();
    const goal = document.getElementById('f_goal').value;
    if (!name) { document.getElementById('f_name_err').classList.remove('hidden'); return; }
    document.getElementById('f_name_err').classList.add('hidden');
    if (!goal) { document.getElementById('f_goal_err').classList.remove('hidden'); return; }
    document.getElementById('f_goal_err').classList.add('hidden');
    document.getElementById('s_name').textContent = name;
    document.getElementById('s_goal').textContent = goal;
    updateModelPrice();
  }
  document.getElementById('step'+currentStep).classList.add('hidden');
  document.getElementById('step'+n).classList.remove('hidden');
  // update indicators (3 steps: Výběr / Platba / Brief)
  for (let i=1;i<=3;i++){
    const sn = document.getElementById('sn'+i);
    const sl = document.getElementById('sl'+i);
    if (!sn || !sl) continue;
    if (i < n) { sn.className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-teal text-navy-900'; sl.className='text-sm font-bold text-teal'; }
    else if (i === n) { sn.className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-teal text-navy-900'; sl.className='text-sm font-bold text-teal'; }
    else { sn.className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-white/[0.08] text-ivory/35'; sl.className='text-sm text-ivory/30 font-semibold'; }
  }
  currentStep = n;
  // start 24h countdown when reaching step 4
  if (n === 4) startDeliveryCountdown();
}
function updateModelPrice(){
  const model = document.querySelector('input[name="f_model"]:checked')?.value || 'pro';
  const vip = document.getElementById('f_vip')?.checked;
  const prices = { start: 1990, pro: 19900, elite: 49900 };
  const labels = { start: 'START — 1 990 Kč/měsíc', pro: 'PRO — 19 900 Kč', elite: 'ELITE — 49 900 Kč' };
  let price = prices[model];
  let label = labels[model];
  if (vip && model !== 'start') {
    label += ' + VIP Správa 490 Kč/měsíc';
  }
  const priceEl = document.getElementById('s_price');
  const modelEl = document.getElementById('s_model');
  if (priceEl) priceEl.textContent = price.toLocaleString('cs-CZ') + ' Kč';
  if (modelEl) modelEl.textContent = label;
}

function submitBrief(){
  // Simulate payment success → go to brief (step 3)
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step3').classList.remove('hidden');
  // update indicators for step 3
  for (let i=1;i<=3;i++){
    const sn = document.getElementById('sn'+i);
    const sl = document.getElementById('sl'+i);
    if (!sn || !sl) continue;
    if (i <= 3) { sn.className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-teal text-navy-900'; sl.className='text-sm font-bold text-teal'; }
    else { sn.className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-white/[0.08] text-ivory/35'; sl.className='text-sm text-ivory/30 font-semibold'; }
  }
  currentStep = 3;
}

/* ===== 24h delivery countdown ===== */
let deliveryTimer = null;
function startDeliveryCountdown(){
  const el = document.getElementById('delivery-countdown');
  if (!el || deliveryTimer) return;
  let remaining = 24 * 60 * 60 - 1; // 23:59:59
  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    if (remaining <= 0){ el.textContent = '00:00:00'; clearInterval(deliveryTimer); return; }
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
    remaining--;
  }
  tick(); deliveryTimer = setInterval(tick, 1000);
}

/* ===== Color picker sync ===== */
const fPicker = document.getElementById('f_picker');
const fColor = document.getElementById('f_color');
if (fPicker && fColor) {
  fPicker.addEventListener('input', () => fColor.value = fPicker.value);
  fColor.addEventListener('input', () => fPicker.value = fColor.value);
}

/* ===== Charts ===== */
window.addEventListener('load', () => {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = 'Outfit, system-ui, sans-serif';
  Chart.defaults.color = 'rgba(244,248,251,.7)';

  /* Loss chart */
  const lossCtx = document.getElementById('lossChart');
  if (lossCtx) {
    const g = lossCtx.getContext('2d').createLinearGradient(0,0,0,270);
    g.addColorStop(0,'rgba(255,51,102,0.28)'); g.addColorStop(1,'rgba(255,51,102,0)');
    new Chart(lossCtx, {
      type: 'line',
      data: {
        labels: ['Měsíc 1','Měsíc 2','Měsíc 3','Měsíc 4','Měsíc 5','Měsíc 6'],
        datasets: [{ label:'Ztracený obrat (Kč)', data:[0,36000,72000,108000,144000,180000], borderColor:'#FF3366', backgroundColor:g, fill:true, tension:0.4, borderWidth:3, pointBackgroundColor:'#FF3366', pointRadius:5 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{display:false},x:{ticks:{color:'rgba(255,255,255,0.35)',font:{size:11}},grid:{display:false},border:{display:false}}} }
    });
  }

  /* Radar chart */
  const radarCtx = document.getElementById('radarChart');
  if (radarCtx) {
    new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Změna textů','Výměna fotek','Úprava barev','Změna rozložení','Nové funkce','Změna logiky'],
        datasets: [
          { label:'V ceně (Free)', data:[100,100,100,20,10,5], backgroundColor:'rgba(0,196,181,0.12)', borderColor:'#00C4B5', borderWidth:2, pointBackgroundColor:'#00C4B5', pointRadius:4 },
          { label:'Vícepráce (Paid)', data:[0,0,0,80,95,100], backgroundColor:'rgba(255,51,102,0.08)', borderColor:'#FF3366', borderWidth:2, pointBackgroundColor:'#FF3366', pointRadius:4 }
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'rgba(255,255,255,0.55)',font:{size:11},boxWidth:12,padding:16}}}, scales:{r:{angleLines:{color:'rgba(255,255,255,0.07)'},grid:{color:'rgba(255,255,255,0.07)'},pointLabels:{color:'rgba(255,255,255,0.55)',font:{size:11}},ticks:{display:false},beginAtZero:true,max:100}} }
    });
  }
});
