ZADÁNÍ PRO VÝVOJÁŘE / AI AGENTA — úprava aplikace app.tjkrupka.cz

Repozitář: mirabeecko/app.tjk (lokálně /Users/mb/dev/airbag-projekt/pwa)
Datum zadání: 23. 9. 2026
Zadavatel: TJ Krupka z.s. (předseda Miroslav Brožek), přes CHIEFa firmy Dream_Agents
První reálné použití: akce AIRBAG KOMÁRKA, sobota 17. 10. 2026 (náhrada 18. 10., druhá varianta 7. 11. 2026)

---

# 1) CO PO TOBĚ CHCEME — JEDNOU VĚTOU

Uprav členskou aplikaci TJ Krupka tak, aby se v ní daly **pořádat a propagovat libovolné akce spolku** (nejen tato jedna) a aby **informovala členy o událostech** — a tuto schopnost poprvé nasaď na akci AIRBAG KOMÁRKA.

Dvě roviny zadání, obě povinné:

- **ROVINA A — GENERICKÁ (hlavní):** aplikace dostane obecný, datově řízený modul akcí + modul informování členů. Akce je **data v databázi, ne kód**. Kdokoli z vedení spolku založí další akci (MTB závod, soustředění, brigádu, vánoční sraz) bez zásahu programátora.
- **ROVINA B — KONKRÉTNÍ (první použití):** akce AIRBAG KOMÁRKA musí být v aplikaci připravená tak, aby člověk přicházející z Facebooku a z webu akce skončil **jedním klikem v registraci** a na místě prošel bez improvizace.

**Zakázané řešení:** „udělám stránku pro AIRBAG KOMÁRKU natvrdo" — jméno akce, termín ani ceny nesmí být v kódu. Když to uděláš natvrdo, zadání je nesplněné, i kdyby akce fungovala.

---

# 2) OVĚŘENÝ KONTEXT (změřeno 23. 9. 2026, ne odhad)

Toto je reálný stav, na kterém budeš pracovat. Nepředělávej, co funguje; doplň, co chybí v logice ROVINY A.

**Technologie**
- Backend: Node.js (>= 18) + Express 4, `server.js`, `src/app.js`, `src/routes.js`, `api/index.js` (Vercel serverless entry).
- Databáze: dva drivery — `src/db-postgres.js` (produkce, Supabase) a `src/db-sqlite.js` (lokální vývoj/testy, `data/airbag.db`, `better-sqlite3`). Schéma: `src/schema.sql` (sqlite) a `supabase/schema.sql` + `supabase/schema-app.sql` (Postgres), migrace v `supabase/migrations/`.
- Frontend: vanilla JS, hash router, soubory `public/js/app.js`, `views-public.js`, `views-member.js`, `views-admin.js`, `api.js`, `ui.js`, PWA (`public/sw.js`, `manifest.json`), Capacitor obaly `android/` + `ios/`.
- Platby: Stripe (`src/payments.js`), v produkci ostrý režim (`paymentGateway: "stripe-live"`).
- E-maily: `src/mailer.js` (SMTP / stub), v aplikaci je „dev outbox" (`GET /api/outbox`).
- Nasazení: Vercel (`vercel.json`, rewrites → `/api/index`), vlastní doména `app.tjkrupka.cz` (WEDOS CNAME). Postup v `DEPLOYMENT.md`.
- Testy: `npm test` → `tests/api.test.js` (end-to-end, spouští server na portu 4310, vždy test mode bez reálného Stripe klíče).

**Co v aplikaci UŽ JE (funguje, ověřeno přes veřejné API)**
- `GET /api/events` — veřejný seznam akcí: `title`, `description`, `startsAt`, `endsAt`, `location`, `capacity`, `signupDeadline`, `signupCount`, `spotsLeft`, `facilityName`. Reálně vrací 3 akce (26. 9., 30. 9. a 7.–8. 10. 2026).
- `POST /api/events/:id/signup` a `DELETE /api/events/:id/signup` — přihlášení/odhlášení, jen pro člena ve stavu `active`, hlídá kapacitu, `signupDeadline` a začátek akce. Chyby: `NEJSTE_CLENEM`, `UZAVRENO`, `ZACALO`, `PLNO`, `PRIHLASEN`.
- Tabulky `events`, `event_signups`, `notifications`, `consents`, `products`, `product_variants`, `entitlements`, `members`, `facilities`.
- UI pro akce **existuje** (`viewEvents()` v `public/js/views-member.js`), ale **je vypnuté** — v `public/js/app.js` je řádek s route `#/akce` zakomentovaný s poznámkou „Akce spolku jsou momentálně SKRYTÉ z UI (backend a testy připravené)".
- Souhlasy s verzí a otiskem dokumentu (`GET /api/docs`, `GET /api/consent-groups`, auditní stopa), QR členská karta (`GET /api/card`), kontrola karty dozorem (`POST /api/check-card`), notifikace (`GET /api/notifications`).
- Katalog: `GET /api/products` → mimo jiné produkt `airbag_day` = „Jednorázový vstup — AIRBAG", jednotka `den`, platnost vstupu **4 hodiny**, cena pro veřejnost **600 Kč**, má členskou variantu (300 Kč).

**Co v aplikaci CHYBÍ nebo je rozbité (tohle je předmět práce)**
1. **Akce jsou skryté z UI** — route `#/akce` je zakomentovaná, do navigace se nedostane.
2. **Akce nemají stránku ani obsah** — jen jednořádkový popis; chybí perex, delší popis, obrázek, místo srazu, program, FAQ, kontakt, odkaz na web akce.
3. **Akce nemají termíny/bloky** — `events` má jeden `starts_at`/`ends_at` a jednu kapacitu. Nelze udělat „dopolední blok 20 míst + odpolední blok 20 míst".
4. **Ceny jsou rozejité** — `GET /api/config` vrací `dailyPriceHost: 300`, `dailyPriceMember: 150` (zdroj: tabulka `member_types`), ale produkt `airbag_day` má 600 / 300 Kč. Dva zdroje pravdy = zákazník vidí jinou cenu než na plakátu.
5. **Ceny nejdou vázat na termín** — `product_variants` umí `active_from` / `active_until`, ale nikde se nepoužívá pro „cena platná jen v den akce".
6. **Neexistuje žádné „informování členů o událostech"** — není tabulka ani obrazovka pro novinky/oznámení; `notifications` je jen per-člen důsledek události v účtu, ne redakční kanál.
7. **Neexistuje zdroj registrace** (odkud člověk přišel: FB / reklama / plakát / škola) — bez toho nelze vyhodnotit kampaň.
8. **Drobnost k opravě:** `GET /api/events` vrací `signupCount` jako **string** (`"0"`), ne číslo → v UI se to projeví v porovnáních a součtech. Normalizuj na číslo (a doplň test).
9. **Chybí export a offline režim pro den akce** — papírový seznam přihlášených a kontrola QR karet bez signálu (v areálu na Komárce je slabý signál).

---

# 3) NEPŘEKROČITELNÁ PRAVIDLA

1. **Akce = data, ne kód.** Žádné jméno akce, datum, cena ani text nesmí být zapsané v JS/HTML/šabloně. Vše z databáze přes API. Kontrolní test: založ druhou testovací akci jen daty a UI ji vykreslí bez změny jediného řádku kódu.
2. **Nic nespouštěj.** Žádné publikování, žádné rozesílání e-mailů skutečným členům, žádná změna produkčních cen, žádný `git push` do `main`, žádné `vercel --prod`. Pracuješ na větvi, výsledek je k odsouhlasení.
3. **Žádná změna Stripe.** Platební logika (`src/payments.js`) se nemění, mění se jen to, co se platí (produkty, varianty, ceny jako data).
4. **Žádné credentials v kódu ani v dokumentaci.** Pouze `.env` / Vercel env (`.env` je v `.gitignore`).
5. **Žádná osobní data v logu ani v repu.** Testy a seedy používají vymyšlené osoby.
6. **Nepřepisuj architekturu.** Žádný nový framework, žádný build krok navíc, žádná nová služba. Drž vanilla JS + Express + stávající DB vrstvu a design systém.
7. **Zpětná kompatibilita.** Stávající endpointy (`/api/config`, `/api/products`, `/api/me`, `/api/card`, `/api/check-card`…) nesmí změnit tvar odpovědi, který už někdo čte. Nové věci přidávej, staré nemaž.
8. **Migrace pro oba drivery.** Každá změna schématu musí být v `src/schema.sql` (sqlite), v `supabase/` (Postgres) i jako spustitelná migrace v `supabase/migrations/2026xxxx_*.sql`. Seed musí být **idempotentní** (upsert, ne insert naslepo) — běží při startu na Vercelu.
9. **Vše česky v UI.** Kód a komentáře česky (stávající styl), UI texty česky, bez anglicismů, kde existuje český výraz.
10. **Přístupnost a design.** Drž stávající tmavý design systém a komponenty (`card`, `btn`, `tag`, `alert`, `event-card`, `ico()`), mobil na prvním místě (přes mobil se registruje 90 % lidí), ovladatelné jednou rukou, bez hover-only interakcí.
11. **Testy.** Každý nový endpoint a každé nové pravidlo má test v `tests/api.test.js`. `npm test` musí být zelené (dnes 103/103) — počet rozšiř, ne snižuj. Testy nesmí sahat na reálný Stripe ani na produkční DB.

---

# 4) PRACOVNÍ BALÍČKY

## P1 — Zprovoznit a zveřejnit modul akcí

**Co:** Odkomentovat route `#/akce` v `public/js/app.js`, doplnit ji do navigace (hlavní menu + mobilní „Více") a rozšířit `viewEvents()` na veřejný přehled: nejbližší akce nahoře, řazení podle data, filtr „jen akce, na které se dá přihlásit", zobrazení obsazenosti a stavu (volno / plno / přihlašování uzavřeno / proběhlo).

**Kde:** `public/js/app.js`, `public/js/views-member.js`, `public/js/views-public.js` (veřejná část bez přihlášení), `src/routes.js` (GET `/events`).

**Akceptační kritérium:** Nepřihlášený návštěvník otevře `app.tjkrupka.cz` → klikne na „Akce" → vidí seznam akcí s datem, místem, obsazeností a tlačítkem „Přihlásit se" (které ho pošle na přihlášení). Žádná akce se v UI nezobrazí, pokud má v DB `status = draft`.

## P2 — Akce jako plnohodnotná stránka (obsah + termíny)

**Co:** Rozšířit datový model akce tak, aby se dala vypsat jako stránka, a přidat termíny (bloky):

- `events`: doplnit `slug` (unikátní, pro odkaz a sdílení), `perex`, `description_long`, `cover_image`, `place_name`, `place_note` (jak se dostat), `external_url` (web akce / FB událost), `contact_name`, `contact_phone`, `contact_email`, `faq` (JSON pole otázka/odpověď), `required_doc_keys` (JSON, které souhlasy akce vyžaduje), `published_at`, `status` (`draft|published|cancelled|finished`), `updated_at`.
- Nová tabulka `event_slots` (termíny/bloky): `id`, `event_id`, `label` (např. „Blok 1 — Škola skoku"), `starts_at`, `ends_at`, `capacity`, `price_czk` (nullable = cena akce), `sort_order`, `active`.
- Nová tabulka `event_signups` rozšířit o `slot_id` (nullable) — při přihlášení volitelně vybrat blok.
- API: `GET /api/events` (seznam, veřejný), `GET /api/events/:slug` (detail včetně slotů, FAQ, obsazenosti po slotech), `POST /api/events/:id/signup` rozšířit o volitelný `slotId` s kontrolou kapacity **bloku**.
- UI: nová obrazovka `#/akce/:slug` — hero s obrázkem a termínem, program, bloky s obsazeností, „co si vzít", FAQ, kontakt, dvě CTA („Přihlásit se" a „Web akce").
- Admin: správa akcí v `#/superadmin` (vytvořit/upravit/publikovat akci, přidat bloky, kapacity, ceny, obrázek, FAQ). Akci musí založit **člověk z vedení přes UI**, ne programátor přes SQL.

**Akceptační kritérium:** Akce založená pouze přes admin UI (bez jediného řádku v kódu) se zobrazí ve veřejném seznamu i na vlastní stránce, včetně bloků s kapacitou, a přihlášení do plného bloku vrátí `PLNO` s českou hláškou; přihlášení do bloku s volnou kapacitou zvýší `signupCount` **daného bloku**.

## P3 — Informování členů o událostech (novinky / oznámení)

**Co:** Redakční kanál, kterým spolek informuje členy i veřejnost o dění — nezávislý na tom, zda si člověk něco koupil.

- Nová tabulka `announcements`: `id`, `title`, `body` (markdown), `severity` (`info|warn|critical`), `audience` (`public|members|event`), `event_id` (nullable), `pinned`, `published_at`, `expires_at`, `created_by`.
- API: `GET /api/news` (veřejně jen `public` a neexpirované; člen navíc `members`), `GET /api/news/:id`, admin CRUD `POST/PATCH/DELETE /api/superadmin/news`.
- Notifikace: při publikování oznámení s `audience = members` vytvořit záznam v `notifications` pro všechny aktivní členy (idempotentně — opakované publikování nesmí vyrobit duplikáty) a volitelně rozeslat e-mailem přes stávající `src/mailer.js`. **E-mail reálným členům se v tomto zadání NEROZESÍLÁ** — implementuj cestu, ale nech ji za vypínačem (`NEWS_EMAIL_ENABLED=false`) a otestuj ji jen na dev outboxu.
- UI: obrazovka `#/novinky` (seznam + detail), na úvodní stránce dlaždice „Poslední oznámení" s maximálně 3 položkami, oznámení s `severity = critical` se zobrazí jako pruh nad obsahem.
- Akce ↔ oznámení: každá publikovaná akce umí zobrazit svá oznámení (např. „kvůli větru se odpolední blok ruší").

**Akceptační kritérium:** Publikované oznámení pro členy se objeví v `#/novinky` a v dlaždici na úvodu; nepřihlášený uživatel vidí jen `public` oznámení; druhé publikování téhož oznámení nevytvoří duplicitní notifikace; `critical` oznámení je vidět bez rozkliknutí.

## P4 — Jedna pravda o cenách + ceny pro den akce

**Co:** Odstranit rozpor mezi `GET /api/config` (`dailyPriceHost: 300`, `dailyPriceMember: 150`) a produktem `airbag_day` (600 / 300 Kč) a umožnit cenu vázanou na termín.

- Jeden zdroj pravdy: ceny vždy z `products` + `product_variants` (případně `event_slots.price_czk`); `GET /api/config` ať vrací totéž, co vidí uživatel v ceníku, nebo pole označ jako „odvozené" a odvoď je z produktu.
- `product_variants` umět `event_id` (nullable) — varianta platná jen pro konkrétní akci (např. „cena v den akce").
- **Ceny podle rozhodnutí majitele (23. 9. 2026):** člen TJ Krupka **300 Kč**, nečlen **600 Kč** — a **dítě i mládež platí stejně jako dospělí** (žádná sleva podle věku). **Rodinný balíček se nezavádí.** Model `audience` (`MEMBER|PUBLIC`) na to stačí; `age_type` (`ANY|ADULT|MINOR`) použij jen pro **kontrolu a souhlasy** (dítě do 15 let pouze s doprovodem zákonného zástupce, do 18 let s jeho písemným souhlasem), **ne pro výpočet ceny**.
- Varianta „cena v den akce“ (člen 250 / nečlen 450 Kč) je **podmíněná**: nasaď ji jen, pokud ji majitel výslovně schválí. Bez schválení se neimplementuje (rozpočet 23. 9. 2026 počítá s běžnými cenami 300 / 600 Kč).
- UI: ceník akce na stránce akce (`#/akce/:slug`) i v registraci; vždy s poznámkou, do kdy cena platí.

**Akceptační kritérium:** Na jednom místě (stránka akce, registrace, `GET /api/config`, `/api/products`) jsou **shodné** ceny; test porovná všechny čtyři zdroje a selže při jakémkoli rozporu. Varianta „den akce" se přestane nabízet po `active_until`.

## P5 — Zdroj registrace (měření kampaně)

**Co:** Uložit, odkud člověk přišel — jediné měřitelné kritérium kampaně.

- Registrace (`POST /api/register`) a přihlášení na akci přijímají `source` (např. `fb-event`, `fb-ads`, `web-airbag`, `plakat`, `skola`, `qrcode`, `direct`) + volitelně `utm_*`. Uložit k členovi/registraci (`members.reg_source`, `members.reg_utm`).
- Odkazy v kampani nesou parametr (`?source=fb-event`), aplikace si ho zapamatuje i při prokliku na registraci.
- Admin: přehled v `#/superadmin` — počty podle zdroje, případně export.

**Akceptační kritérium:** Registrace otevřená s `?source=fb-event` má v DB `reg_source = "fb-event"`; přehled v adminu zobrazí počty podle zdrojů; chybějící parametr je `direct` (ne prázdný string).

## P6 — Den akce: kontrola na místě a export

**Co:** Aby akce prošla bez improvizace, i když v areálu není signál.

- **Export přihlášených** pro akci (a pro jednotlivý blok) — CSV (jméno, příjmení, členské číslo, blok, stav platby, zdroj) a tisknutelná verze (PDF/HTML pro tiskárnu) v adminu.
- **Offline kontrola QR karet:** obrazovka pro dozor (`#/admin`) musí fungovat z cache, když vypadne signál — kontrola karty se uloží do fronty v `localStorage` a odešle se, jakmile je spojení; UI jasně ukáže „Nesynchronizováno: N záznamů".
- U ukončené akce (`status = finished`) nejde přihlásit; seznam přihlášených zůstává dostupný pro vyhodnocení.

**Akceptační kritérium:** S vypnutou sítí (DevTools → offline) obrazovka dozoru naskenuje QR kartu, zapíše ji do fronty a po obnovení spojení se záznam synchronizuje bez duplikátu; export přihlášených obsahuje právě tolik řádků, kolik je `signupCount` v API.

## P7 — Připomínka 24 hodin před akcí

**Co:** Snížit počet lidí, kteří se zaregistrují a nedorazí.

- Oznámení/notifikace + e-mail 24 hodin před `starts_at` s QR členskou kartou, časem a místem srazu, co si vzít a odkazem na web akce.
- Idempotence: jednomu členovi na jednu akci maximálně jedna připomínka (i když se úloha spustí víckrát).
- Spouštění: stávající mechanismus aplikace (cron čistě nad DB, kompatibilní s Vercel — např. `api/cron-reminders.js` + `vercel.json` `crons`), plus možnost spustit ručně z adminu pro test.

**Akceptační kritérium:** Test nasimuluje akci začínající za 24 hodin → vznikne právě jedna připomínka; druhé spuštění téže úlohy nevytvoří druhou; pro akci, která už začala, se nevytvoří žádná.

## P8 — Stránka akce v aplikaci + proklik na web akce (AIRBAG KOMÁRKA)

**Co:** Aplikace je konec trychtýře. Člověk z Facebooku jde na web akce a odtud **jedním klikem** do registrace v aplikaci; kdo přijde do aplikace napřed, musí vidět akci a dostat se na web akce.

- Pro akci AIRBAG KOMÁRKA připravit (jako data, přes admin UI / idempotentní seed) záznam akce se dvěma bloky, kapacitou 20 na blok, ceníkem, FAQ, kontaktem, obrázkem a odkazem na web akce.
- Dvě CTA na stránce akce: **„Registrovat se"** (registrace v aplikaci) a **„Web akce"** (`external_url`).
- Kdo není člen, musí vidět, že se dá zaregistrovat i tak (jednorázový vstup) — s jasným vysvětlením rozdílu člen / nečlen.

**Akceptační kritérium:** Z webu akce vede odkaz na `app.tjkrupka.cz/#/akce/airbag-komarka` a ze stránky akce zpět na web akce; obě CTA jsou funkční na mobilu; v nepřihlášeném stavu je vidět cena pro veřejnost.

---

# 5) SOUHRNNÁ AKCEPTAČNÍ TABULKA

| # | Co se měří | Jak se to měří | Očekávaný výsledek |
|---|---|---|---|
| A1 | Data-driven, ne hardcode | Založit druhou akci pouze daty | Vykreslí se bez změny kódu |
| A2 | Akce viditelné veřejně | Otevřít `#/akce` bez přihlášení | Seznam bez chyby, `draft` skryté |
| A3 | Bloky s kapacitou | Přihlásit do plného bloku | `PLNO`, česká hláška, kapacita drží |
| A4 | Ceny konzistentní | Porovnat 4 zdroje cen | Shodné, jinak test selže |
| A5 | Oznámení členům | Publikovat pro členy | Vidí člen, nevidí nepřihlášený |
| A6 | Idempotence notifikací | Publikovat dvakrát | Jedna notifikace na člena |
| A7 | Zdroj registrace | Registrace s `?source=fb-event` | V DB `fb-event`, v přehledu započteno |
| A8 | Offline kontrola | Prohlížeč offline + sken QR | Záznam ve frontě, po připojení synchronizace 1× |
| A9 | Export | Export přihlášených akce | Řádků = `signupCount` |
| A10 | Připomínka 24 h | Simulace + druhé spuštění | 1 připomínka, ne 2 |
| A11 | Registrační cesta | FB → web akce → app | Jeden klik do registrace, ceny vidět před registrací |
| A12 | Testy | `npm test` | Zelené, počet testů vyšší než 103 |
| A13 | Migrace | Čistá DB (sqlite i pg) + seed | Start bez chyby, seed idempotentní po druhém běhu |

---

# 6) CO NEDĚLAT (kontrolní seznam)

- Nepublikovat, nerozesílat e-maily skutečným členům, neměnit produkční ceny, nepushovat do `main`, nenasazovat na Vercel.
- Nezapisovat jméno akce, termín ani cenu do kódu.
- Nezakládat nový framework, novou službu, druhou databázi ani druhou platební bránu.
- Neměnit `src/payments.js` a Stripe nastavení.
- Nedávat do repa ani do logů credentials ani osobní data.
- Neničit existující endpointy a jejich tvar odpovědí.
- Nedělat z administrace SQL konzoli pro programátora — akci musí založit vedení spolku v UI.

---

# 7) CO OD TEBE CHCEME DODAT

1. **Větev** s popisným názvem (`feat/akce-modul` nebo podobně) a commit po balíčcích P1–P8.
2. **Seznam změněných a nových souborů** + popis migrací.
3. **Výstup `npm test`** (počet testů, všechny zelené) a stručný popis nových testů.
4. **Návod k nasazení** krok za krokem (`DEPLOYMENT.md` styl): migrace, seed akce AIRBAG KOMÁRKA, co je potřeba odsouhlasit před zapnutím.
5. **Sekce „známá omezení a rizika"** — co je hotové, co je připravené za vypínačem a co záměrně čeká na rozhodnutí.
6. **Nic z toho nenasazovat** — výstup je k revizi a odsouhlasení majitelem.

---

# 8) CO NENÍ PRÁCE DEV (neřeš, jen respektuj)

Tyto body patří jinam a mohou zablokovat spuštění akce — připrav je jako **podmínku zadání**, ne jako svůj úkol:

- **Právní režim jednorázového vstupu pro veřejnost** (členský vs. živnostenský model) — LEGAL.
- **Pojištění jednorázové akce pro nečleny** (krytí nad rámec pojištění spolku) — LEGAL / pojistitel.
- **Odsouhlasení cen a termínu** majitelem — OWNER (TJ Krupka z.s.).
- **Texty a obsah akce** (popis, FAQ, harmonogram, obrázky, plakát, FB) — GROWTH, dodá jako data k akci.

Kdyby některý z těchto bodů měnil zadání (např. veřejnost nesmí kupovat jednorázový vstup), vývojář to neřeší sám — vrací dotaz zadavateli.
