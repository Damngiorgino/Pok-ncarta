// Pokéncarta: Abilità, Oggetti e Mosse, dentro la scheda Pokédex (selettore Pokémon | Abilità | Oggetti | Mosse).
// Richiede app.js (store, esc, $, loadDex, softExtra, monCard, extraData, prettyName) e pokedex.js.
// Dati da PokéAPI GraphQL in una sola richiesta per sezione, salvati 7 giorni in localStorage.
// Indirizzi: #abilita, #abilita/erbaiuto-slug, #strumenti, #strumento/master-ball, #mosse, #mossa/ember.

const GQL = 'https://beta.pokeapi.co/graphql/v1beta';
const CMP_DAYS = 7 * 864e5;
const gql = query => fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  .then(r => { if (!r.ok) throw r; return r.json(); }).then(j => { if (j.errors) throw j.errors; return j.data; });
const oneLine = t => (t ?? '').replace(/\s+/g, ' ').trim();
const nameIn = (n, lang) => n.find(x => x.language_id === lang)?.name;
// Senza accenti e in minuscolo, per la ricerca
const fold = x => (x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const cmp = { ab: null, it: null, mv: null, abQ: '', abGen: 0, itQ: '', itGroup: 'all', itShown: 120, mvQ: '', mvType: '', mvCls: '', mvShown: 120 };
// Indirizzo dell'elenco di ogni parte (la scheda grande di un elemento è <elenco>/<slug>)
const CMP_BASE = { ab: 'abilita', it: 'strumenti', mv: 'mosse' };
const CMP_LIST = { 'ab-list': 'abilita', 'it-list': 'strumenti', 'mv-list': 'mosse' };

/* ---------- Dati ---------- */

function loadAbilities() {
  if (cmp.ab) return cmp.ab;
  const hit = store.get('cmp-ab', null);
  if (hit && Date.now() - hit.t < CMP_DAYS) return (cmp.ab = Promise.resolve(hit.list));
  cmp.ab = gql(`{ a: pokemon_v2_ability(where:{is_main_series:{_eq:true}}, order_by:{id:asc}) { id name generation_id
      n: pokemon_v2_abilitynames(where:{language_id:{_in:[8,9]}}) { name language_id }
      ft: pokemon_v2_abilityflavortexts(where:{language_id:{_eq:8}}, order_by:{version_group_id:desc}, limit:1) { flavor_text }
      fe: pokemon_v2_abilityflavortexts(where:{language_id:{_eq:9}}, order_by:{version_group_id:desc}, limit:1) { flavor_text }
      e: pokemon_v2_abilityeffecttexts(where:{language_id:{_eq:9}}) { short_effect }
      p: pokemon_v2_pokemonabilities { pokemon_id is_hidden } } }`)
    .then(d => {
      const list = d.a.map(a => ({
        id: a.id, slug: a.name, gen: a.generation_id,
        it: nameIn(a.n, 8) || prettyName(a.name), en: nameIn(a.n, 9) || '',
        desc: oneLine(a.ft[0]?.flavor_text), descEn: oneLine(a.fe[0]?.flavor_text), tech: oneLine(a.e[0]?.short_effect),
        mons: a.p.map(p => [p.pokemon_id, p.is_hidden ? 1 : 0]),
      })).sort((x, y) => x.it.localeCompare(y.it, 'it'));
      store.set('cmp-ab', { t: Date.now(), list });
      return list;
    }).catch(e => { cmp.ab = null; throw e; });
  return cmp.ab;
}

// Gruppi per i filtri e nome italiano di ogni categoria di PokéAPI
const IT_GROUPS = [
  ['all', 'Tutti'], ['balls', 'Poké Ball'], ['medicine', 'Cure'], ['berries', 'Bacche'], ['held', 'Da tenere'],
  ['evolution', 'Evoluzione'], ['mega', 'Megapietre e Cristalli Z'], ['battle', 'Lotta'], ['tm', 'MT'], ['key', 'Strumenti base'], ['other', 'Altro'],
];
const IT_CAT = {
  flutes: ['battle', 'Flauti'], 'miracle-shooter': ['battle', 'Supercolpo'], 'stat-boosts': ['battle', 'Potenziamenti in lotta'],
  'baking-only': ['berries', 'Bacche da cucina'], 'catching-bonus': ['berries', 'Bacche per la cattura'], 'effort-drop': ['berries', 'Bacche che abbassano i PA'],
  'in-a-pinch': ['berries', 'Bacche d\'emergenza'], medicine: ['berries', 'Bacche curative'], other: ['berries', 'Altre bacche'],
  'picky-healing': ['berries', 'Bacche curative (gusti)'], 'type-protection': ['berries', 'Bacche anti-tipo'],
  'apricorn-box': ['key', 'Strumenti base'], 'event-items': ['key', 'Strumenti degli eventi'], gameplay: ['key', 'Strumenti base'],
  'plot-advancement': ['key', 'Strumenti di storia'], 'z-crystals': ['mega', 'Cristalli Z'],
  'all-machines': ['tm', 'MT e MN'], 'all-mail': ['other', 'Messaggi'],
  healing: ['medicine', 'Cure dei PS'], 'nature-mints': ['medicine', 'Mente'], 'pp-recovery': ['medicine', 'Recupero PP'],
  revival: ['medicine', 'Rianimazione'], 'status-cures': ['medicine', 'Cure di stato'], vitamins: ['medicine', 'Vitamine e caramelle'],
  'bad-held-items': ['held', 'Strumenti dannosi'], choice: ['held', 'Strumenti Scelta'], collectibles: ['other', 'Collezionabili'],
  'curry-ingredients': ['other', 'Ingredienti per il curry'], 'dex-completion': ['other', 'Pokédex'], 'effort-training': ['held', 'Allenamento PA'],
  evolution: ['evolution', 'Strumenti evolutivi'], 'held-items': ['held', 'Da tenere'], jewels: ['held', 'Gemme'],
  loot: ['other', 'Strumenti da vendere'], 'mega-stones': ['mega', 'Megapietre'], memories: ['held', 'ROM'], mulch: ['other', 'Fertilizzanti'],
  plates: ['held', 'Lastre'], scarves: ['held', 'Fasce'], 'species-candies': ['other', 'Caramelle delle specie'],
  'species-specific': ['held', 'Strumenti di una specie'], spelunking: ['other', 'Reperti del sottosuolo'], training: ['held', 'Allenamento'],
  'type-enhancement': ['held', 'Potenziano un tipo'], 'standard-balls': ['balls', 'Poké Ball'], 'special-balls': ['balls', 'Poké Ball speciali'],
  'apricorn-balls': ['balls', 'Ball di Ghicocca'],
};
const IT_SKIP = new Set(['unused', 'dynamax-crystals', 'data-cards']);

function loadItems() {
  if (cmp.it) return cmp.it;
  const hit = store.get('cmp-it2', null);
  if (hit && Date.now() - hit.t < CMP_DAYS) return (cmp.it = Promise.resolve(hit.data));
  cmp.it = gql(`{ i: pokemon_v2_item(where:{pokemon_v2_itemnames:{language_id:{_eq:8}}}, order_by:{id:asc}) { id name cost
      cat: pokemon_v2_itemcategory { name }
      n: pokemon_v2_itemnames(where:{language_id:{_in:[8,9]}}) { name language_id }
      ft: pokemon_v2_itemflavortexts(where:{language_id:{_eq:8}}, order_by:{version_group_id:desc}, limit:1) { flavor_text }
      fe: pokemon_v2_itemflavortexts(where:{language_id:{_eq:9}}, order_by:{version_group_id:desc}, limit:1) { flavor_text }
      h: pokemon_v2_pokemonitems { pokemon_id rarity version_id } }
    v: pokemon_v2_version { id n: pokemon_v2_versionnames(where:{language_id:{_eq:8}}) { name } } }`)
    .then(d => {
      const list = d.i.filter(x => x.cat && !IT_SKIP.has(x.cat.name)).map(x => ({
        id: x.id, slug: x.name, cost: x.cost, cat: x.cat.name,
        it: nameIn(x.n, 8), en: nameIn(x.n, 9) || '',
        desc: oneLine(x.ft[0]?.flavor_text), descEn: oneLine(x.fe[0]?.flavor_text),
        held: x.h.map(h => [h.pokemon_id, h.version_id, h.rarity]),
      })).sort((a, b) => a.it.localeCompare(b.it, 'it'));
      const data = { list, versions: Object.fromEntries(d.v.map(v => [v.id, v.n[0]?.name ?? ''])) };
      store.set('cmp-it2', { t: Date.now(), data });
      return data;
    }).catch(e => { cmp.it = null; throw e; });
  return cmp.it;
}

/* ---------- Instradamento: chiamata da renderPokedex (pokedex.js) ---------- */

function cmpRoute() {
  const h = location.hash;
  if (/^#abilita(\/|$)/.test(h)) return { part: 'ab', slug: decodeURIComponent(h.split('/')[1] ?? '') };
  // #oggetti / #oggetto/… sono i vecchi indirizzi: continuano a funzionare
  if (/^#(strument|oggett)[io](\/|$)/.test(h)) return { part: 'it', slug: decodeURIComponent(h.split('/')[1] ?? '') };
  if (/^#moss[ae](\/|$)/.test(h)) return { part: 'mv', slug: decodeURIComponent(h.split('/')[1] ?? '') };
  return { part: 'mon' };
}

// Mostra la parte giusta del Pokédex; restituisce true se la pagina è di Abilità o Oggetti.
function renderCompendio() {
  const r = cmpRoute();
  // Lasciando Abilità o Oggetti (per esempio aprendo un Pokémon dalla scheda grande) la scheda sparisce subito
  if (cmpFx.zoom && r.part !== cmpFx.zoom.part) closeZoom(true);
  for (const b of document.querySelectorAll('.dex-switch [data-dexpart]')) b.setAttribute('aria-pressed', String(b.dataset.dexpart === r.part));
  $('ab-view').hidden = r.part !== 'ab';
  $('it-view').hidden = r.part !== 'it';
  $('mv-view').hidden = r.part !== 'mv';
  if (r.part === 'mon') return false;
  $('dex-browse').hidden = true;
  $('dex-detail').hidden = true;
  if (r.part === 'ab') abilityList(r.slug);
  else if (r.part === 'it') itemList(r.slug);
  else moveList(r.slug);
  return true;
}

for (const b of document.querySelectorAll('.dex-switch [data-dexpart]')) {
  // Cambiando parte si riparte dall'alto: la posizione ricordata dell'elenco vale solo tornando da una scheda
  b.onclick = () => { dexState.scrollY = 0; location.hash = { mon: 'pokedex', ...CMP_BASE }[b.dataset.dexpart]; };
}

/* ---------- Pezzi comuni ---------- */

// Un Pokémon (anche una forma) come scheda breve che apre la sua pagina del Pokédex
function monLink(dex, pid, note = '') {
  const mon = dex.find(m => m.id === pid);
  if (!mon) return null;
  const species = pid <= 10000 ? pid : extraData?.formSpecies.get(pid);
  const a = document.createElement('a');
  a.className = 'cmp-mon';
  if (species) a.href = `#dex/${species}`;
  a.append(monCard(mon, note));
  if (note) a.querySelector('.cov-txt')?.append(Object.assign(document.createElement('span'), { className: 'cmp-note', textContent: note }));
  return a;
}
const loading = (box, text) => { box.innerHTML = `<section class="calc"><p class="hint">${text}</p></section>`; };
const failed = box => { box.innerHTML = '<section class="calc"><p class="hint">Non riesco a scaricare i dati da PokéAPI. Controlla la connessione e riprova.</p></section>'; };
const monGrid = (dex, ids, note) => {
  const grid = document.createElement('div');
  grid.className = 'cov-list';
  ids.forEach(id => { const l = monLink(dex, id, note?.(id)); if (l) grid.append(l); });
  return grid;
};

/* Riquadri che si ingrandiscono: un clic sul riepilogo (un link a #abilita/slug o #oggetto/slug) fa
   crescere il riquadro, dalla sua posizione, fino a una scheda grande al centro dello schermo (su
   telefono un foglio che sale dal basso) con le informazioni complete; lo sfondo si scurisce e la
   griglia non si muove mai. Chiudendo (×, clic fuori, Esc o Indietro) la scheda torna a rimpicciolirsi
   al posto del riquadro. Schema scelto dall'utente; prototipo: progetto-logo/prototipo-riquadri.html.
   Con prefers-reduced-motion la scheda compare e sparisce senza movimento. */
const cmpFx = { seq: 0, zoom: null };
const cmpMotion = () => !!window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPEN_S = .22, CLOSE_S = .18; // più rapida (prima .34 / .26)

// Misura e posizione finali: alta quanto il contenuto, al massimo quanto la finestra (poi scorre dentro)
function zoomTarget(z) {
  const W = innerWidth, H = innerHeight, phone = W < 600;
  const w = phone ? W - 16 : Math.min(760, W - 64);
  const max = phone ? H - 56 : H - 96;
  const keep = z.style.cssText;
  Object.assign(z.style, { left: '0px', top: '0px', width: w + 'px', height: 'auto', visibility: 'hidden' });
  const h = Math.min(z.offsetHeight, max);
  z.style.cssText = keep;
  return { left: (W - w) / 2, top: phone ? H - h - 8 : (H - h) / 2, width: w, height: h };
}

// Apertura senza testo che si riadatta: la scheda è subito alla misura e al posto finali (il testo è già
// impaginato) dentro un velo grande quanto la finestra; il velo è ritagliato (clip-path) sul riquadro e il
// ritaglio si allarga fino alla scheda. Sopra, una copia del riquadro sfuma via nei primi istanti; la cornice
// con l'ombra è un elemento a parte che cresce insieme al ritaglio. Niente si deforma.
const viewClip = (r, rad = 16) => `inset(${Math.max(0, r.top)}px ${Math.max(0, innerWidth - r.right)}px ${Math.max(0, innerHeight - r.bottom)}px ${Math.max(0, r.left)}px round ${rad}px)`;
const rectOf = t => ({ left: t.left, top: t.top, right: t.left + t.width, bottom: t.top + t.height });
function openZoom(card, base, instant) {
  const r = card.getBoundingClientRect();
  const back = Object.assign(document.createElement('div'), { className: 'zoom-back' });
  const frame = Object.assign(document.createElement('div'), { className: 'zoom-frame' });
  const wrap = Object.assign(document.createElement('div'), { className: 'zoom-wrap' });
  const z = document.createElement('div');
  z.className = card.className + ' zoom-card';
  z.setAttribute('role', 'dialog');
  z.setAttribute('aria-modal', 'true');
  z.setAttribute('aria-label', card.querySelector('strong').textContent);
  z.tabIndex = -1;
  const sum = card.querySelector('.cmp-sum').cloneNode(true);
  sum.removeAttribute('href');
  sum.removeAttribute('aria-expanded');
  if (card.item) sum.querySelector('.cmp-item-txt').insertAdjacentHTML('beforeend', `<span class="cmp-meta">${esc(catName(card.item))}</span>`);
  const scroll = Object.assign(document.createElement('div'), { className: 'zoom-scroll' });
  const body = card.querySelector('.cmp-body');
  scroll.append(body); // il contenuto completo passa nella scheda e torna nel riquadro alla chiusura
  back.onclick = () => { location.hash = base; }; // si chiude cliccando fuori (o con Esc / Indietro)
  z.append(sum, scroll);
  wrap.append(z);
  // Copia del riquadro com'è, sopra a tutto: sfuma mentre la scheda si apre
  const ghost = card.cloneNode(true);
  ghost.classList.add('zoom-ghost');
  ghost.querySelector('.cmp-body')?.remove();
  Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.append(back, frame, wrap, ghost);
  card.classList.add('zoom-src');
  card.querySelector('.cmp-sum').setAttribute('aria-expanded', 'true');
  cmpFx.zoom = { z, wrap, back, frame, card, body, part: cmpRoute().part };
  const t = zoomTarget(z);
  gsap.set([z, frame], t);
  if (instant || !cmpMotion()) {
    back.style.opacity = 1;
    ghost.remove();
  } else {
    gsap.fromTo(wrap, { clipPath: viewClip(r) }, { clipPath: viewClip(rectOf(t)), duration: OPEN_S, ease: 'power2.inOut', clearProps: 'clipPath' });
    gsap.fromTo(frame, { left: r.left, top: r.top, width: r.width, height: r.height }, { ...t, duration: OPEN_S, ease: 'power2.inOut' });
    gsap.to(ghost, { opacity: 0, duration: OPEN_S * .45, ease: 'power1.in', onComplete: () => ghost.remove() });
    // Prima si allarga la sola superficie, poi compare il contenuto: a metà non si vedono pezzi di testo
    const fill = Object.assign(document.createElement('div'), { className: 'zoom-fill' });
    wrap.prepend(fill);
    gsap.set(fill, t);
    gsap.fromTo(z, { opacity: 0 }, { opacity: 1, duration: .14, delay: OPEN_S * .65, ease: 'power1.out', clearProps: 'opacity', onComplete: () => fill.remove() });
    gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: OPEN_S, ease: 'power1.out' });
  }
  setTimeout(() => z.focus({ preventScroll: true }), instant ? 0 : OPEN_S * 1000);
}

// La scheda cambia altezza (per esempio aprendo l'elenco dei Pokémon che tengono l'oggetto)
function zoomRefit() {
  const zm = cmpFx.zoom;
  if (!zm) return;
  const t = zoomTarget(zm.z);
  if (!cmpMotion()) { gsap.set([zm.z, zm.frame], t); return; }
  gsap.to([zm.z, zm.frame], { ...t, duration: .35, ease: 'power2.inOut' });
}

function closeZoom(now) {
  const zm = cmpFx.zoom;
  if (!zm) return;
  cmpFx.zoom = null;
  const { z, wrap, back, frame, card, body } = zm;
  gsap.killTweensOf([z, wrap, back, frame]);
  const finish = () => {
    wrap.remove(); back.remove(); frame.remove();
    card.append(body);
    card.classList.remove('zoom-src');
    card.querySelector('.cmp-sum').setAttribute('aria-expanded', 'false');
    if (!now) card.querySelector('.cmp-sum').focus({ preventScroll: true });
  };
  if (now || !cmpMotion() || !card.isConnected) { finish(); return; }
  wrap.style.pointerEvents = back.style.pointerEvents = 'none';
  // Torna dove si trova ORA il riquadro (anche se nel frattempo la pagina è scorsa); il riquadro ricompare sotto
  const r = card.getBoundingClientRect(), t = z.getBoundingClientRect();
  card.classList.remove('zoom-src');
  gsap.to(z, { opacity: 0, duration: CLOSE_S * .6, ease: 'power1.in' });
  gsap.fromTo(wrap, { clipPath: viewClip(t) }, { clipPath: viewClip(r), duration: CLOSE_S, ease: 'power2.inOut', onComplete: finish });
  gsap.to(frame, { left: r.left, top: r.top, width: r.width, height: r.height, duration: CLOSE_S, ease: 'power2.inOut' });
  gsap.to(back, { opacity: 0, duration: CLOSE_S, ease: 'power1.in' });
}

addEventListener('keydown', e => { if (e.key === 'Escape' && cmpFx.zoom) location.hash = CMP_BASE[cmpFx.zoom.part]; });
addEventListener('resize', () => { if (cmpFx.zoom) { const t = zoomTarget(cmpFx.zoom.z); gsap.set([cmpFx.zoom.z, cmpFx.zoom.frame], t); } });

// Apre la scheda grande di `slug` (null = la chiude). body(card) prepara le informazioni complete.
async function cmpOpen(listEl, slug, body, instant = false) {
  const my = ++cmpFx.seq;
  if (cmpFx.zoom && cmpFx.zoom.card.dataset.slug === slug && cmpFx.zoom.card.isConnected) return;
  const card = slug ? listEl.querySelector(`.cmp-card[data-slug="${CSS.escape(slug)}"]`) : null;
  if (card && !card.querySelector('.cmp-body')) await body(card);
  if (my !== cmpFx.seq) return; // nel frattempo è arrivata un'altra richiesta: vale quella
  if (cmpFx.zoom) closeZoom(!!card); // passando a un'altra scheda quella vecchia sparisce subito
  if (!card) return;
  // Il riquadro deve essere in vista: la scheda cresce da lì (arrivando da un link, prima scorro fin lì)
  const r = card.getBoundingClientRect();
  if (r.top < 70 || r.bottom > innerHeight - 20) scrollTo({ top: scrollY + r.top - innerHeight / 3, behavior: 'auto' });
  openZoom(card, CMP_LIST[listEl.id], instant);
}

// Riepilogo cliccabile di un riquadro: punta al proprio indirizzo, o a quello dell'elenco se è già aperto
function cmpSum(card, base, slug) {
  const sum = card.querySelector('.cmp-sum');
  sum.href = `#${base}/${encodeURIComponent(slug)}`;
  sum.onclick = e => { if (location.hash === sum.getAttribute('href')) { e.preventDefault(); renderCompendio(); } }; // stesso indirizzo: riapre
}

/* ---------- Abilità ---------- */

async function abilityList(slug) {
  const box = $('ab-view');
  if (box.dataset.view !== 'list') {
    loading(box, 'Carico le abilità…');
    let list;
    try { list = await loadAbilities(); } catch { failed(box); return; }
    if (cmpRoute().part !== 'ab') return;
    if (box.dataset.view !== 'list') buildAbilityList(box, list);
  }
  const want = cmpRoute().slug || null;
  if (want && !$('ab-list').querySelector(`.cmp-card[data-slug="${CSS.escape(want)}"]`)) { cmp.abQ = ''; cmp.abGen = 0; $('ab-q').value = ''; cmp.abDraw(); }
  await cmpOpen($('ab-list'), want, abilityBody);
}

function buildAbilityList(box, list) {
  box.dataset.view = 'list';
  Promise.all([loadDex(), softExtra()]).catch(() => {}); // in anticipo: la prima apertura non deve aspettarli
  box.innerHTML = `
    <section class="cmp-filters">
      <input type="search" class="dex-search" id="ab-q" placeholder="Cerca un'abilità…" autocomplete="off" spellcheck="false" aria-label="Cerca un'abilità">
      <div class="dex-gens" id="ab-gens" aria-label="Generazione in cui è stata introdotta"></div>
    </section>
    <div class="cmp-list" id="ab-list"></div>`;
  const gens = $('ab-gens');
  [0, 3, 4, 5, 6, 7, 8, 9].forEach(g => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'dex-gen', textContent: g ? `Gen ${g}` : 'Tutte' });
    b.onclick = () => { cmp.abGen = g; draw(); };
    b.dataset.g = g;
    gens.append(b);
  });
  const q = $('ab-q');
  q.value = cmp.abQ;
  q.oninput = () => { cmp.abQ = q.value; draw(); };
  const draw = cmp.abDraw = () => {
    [...gens.children].forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === cmp.abGen)));
    const f = fold(cmp.abQ.trim());
    const shown = list.filter(a => (!cmp.abGen || a.gen === cmp.abGen) && (!f || fold(a.it).includes(f) || fold(a.en).includes(f)));
    const out = $('ab-list');
    out.innerHTML = '';
    for (const a of shown) {
      const c = document.createElement('article');
      c.className = 'cmp-card';
      c.dataset.slug = a.slug;
      c.ab = a;
      c.innerHTML = `<a class="cmp-sum" aria-expanded="false"><strong></strong><span class="cmp-en" lang="en"></span><span class="cmp-desc"></span></a>`;
      c.querySelector('strong').textContent = a.it;
      c.querySelector('.cmp-en').textContent = a.en; // sempre, anche se è uguale al nome italiano
      c.querySelector('.cmp-desc').textContent = a.desc || a.descEn;
      if (!a.desc && a.descEn) c.querySelector('.cmp-desc').lang = 'en';
      cmpSum(c, 'abilita', a.slug);
      out.append(c);
    }
    // Il riquadro aperto resta aperto anche dopo un cambio di filtro
    if (cmpRoute().slug) cmpOpen(out, cmpRoute().slug, abilityBody, true);
  };
  draw();
}

async function abilityBody(card) {
  const a = card.ab;
  let dex;
  try { [dex] = await Promise.all([loadDex(), softExtra()]); } catch { dex = []; }
  if (card.querySelector('.cmp-body') || cmpFx.zoom?.card === card) return;
  const body = document.createElement('div');
  body.className = 'cmp-body';
  // Descrizione intera se nel riquadro è tagliata (al massimo 3 righe)
  const desc = card.querySelector('.cmp-desc');
  if (desc.scrollHeight > desc.clientHeight + 2) body.append(Object.assign(document.createElement('p'), { className: 'cmp-lead', textContent: a.desc || a.descEn }));
  if (!a.desc && a.descEn) body.append(Object.assign(document.createElement('p'), { className: 'hint', textContent: 'Descrizione italiana non ancora disponibile in PokéAPI: testo in inglese.' }));
  // Dettagli tecnici sempre visibili (il nome inglese è già sotto il titolo)
  // Subito sotto la descrizione italiana, in piccolo, la spiegazione in inglese (più precisa)
  // (solo se la descrizione è in italiano: se è già in inglese non aggiungo altro inglese)
  if (a.tech && a.desc) body.append(Object.assign(document.createElement('p'), { className: 'cmp-en-desc', lang: 'en', textContent: a.tech }));
  // Pokémon che possono averla: dietro un pulsante, come per le mosse (prima i normali, poi chi l'ha come nascosta)
  if (a.mons.length) {
    const sec = document.createElement('div');
    sec.className = 'cmp-held';
    sec.innerHTML = `<button type="button" class="cmp-held-btn" aria-expanded="false">Quali Pokémon possono averla <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="mv-learners" hidden></div>`;
    const box = sec.querySelector('.mv-learners');
    const btn = sec.querySelector('button');
    btn.onclick = () => {
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open && !box.childElementCount) {
        for (const [hidden, title] of [[0, ''], [1, 'Come abilità nascosta']]) {
          const ids = a.mons.filter(m => m[1] === hidden).map(m => m[0]).sort((x, y) => x - y);
          if (!ids.length) continue;
          if (title) box.insertAdjacentHTML('beforeend', `<h3>${title}</h3>`);
          box.append(monGrid(dex, ids));
        }
        if (cmpMotion()) gsap.fromTo(box.querySelectorAll('.cmp-mon'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out', stagger: { amount: .4 } });
      }
      zoomRefit();
    };
    body.append(sec);
  }
  card.append(body);
}

/* ---------- Strumenti (in PokéAPI "items"; indirizzi #strumenti, #strumento/…) ---------- */

const itemSprite = slug => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
const groupOf = it => IT_CAT[it.cat]?.[0] ?? 'other';
// Colore tenue del riquadro dell'icona, per gruppo di oggetti
const IT_COLOR = {
  balls: '#e0604a', medicine: '#e889b0', berries: '#6fb35a', held: '#5a8fd6', evolution: '#9a6bd0',
  mega: '#e8963a', battle: '#e8c23a', tm: '#3fa6a0', key: '#b08a5a', other: '#a39a8e',
};
const catName = it => IT_CAT[it.cat]?.[1] ?? prettyName(it.cat);

async function itemList(slug) {
  const box = $('it-view');
  let data = cmp.itData;
  if (box.dataset.view !== 'list') {
    loading(box, 'Carico gli strumenti…');
    try { data = cmp.itData = await loadItems(); } catch { failed(box); return; }
    if (cmpRoute().part !== 'it') return;
    if (box.dataset.view !== 'list') buildItemList(box, data.list);
  }
  const want = cmpRoute().slug || null;
  if (want && !$('it-list').querySelector(`.cmp-card[data-slug="${CSS.escape(want)}"]`)) {
    // L'oggetto cercato è nascosto dai filtri o oltre quelli mostrati: tolgo i filtri e mostro fin lì
    cmp.itQ = ''; cmp.itGroup = 'all'; $('it-q').value = '';
    cmp.itShown = Math.max(120, data.list.findIndex(x => x.slug === want) + 1);
    cmp.itDraw();
  }
  await cmpOpen($('it-list'), want, itemBody);
}

function buildItemList(box, list) {
  box.dataset.view = 'list';
  Promise.all([loadDex(), softExtra()]).catch(() => {});
  box.innerHTML = `
    <section class="cmp-filters">
      <input type="search" class="dex-search" id="it-q" placeholder="Cerca uno strumento…" autocomplete="off" spellcheck="false" aria-label="Cerca uno strumento">
      <div class="dex-gens" id="it-groups" aria-label="Tipo di strumento"></div>
    </section>
    <div class="cmp-list cmp-items" id="it-list"></div>
    <button type="button" class="btn ghost cmp-more" id="it-more" hidden></button>`;
  const groups = $('it-groups');
  IT_GROUPS.forEach(([k, label]) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'dex-gen', textContent: label });
    b.dataset.k = k;
    b.onclick = () => { cmp.itGroup = k; cmp.itShown = 120; draw(); };
    groups.append(b);
  });
  const q = $('it-q');
  q.value = cmp.itQ;
  q.oninput = () => { cmp.itQ = q.value; cmp.itShown = 120; draw(); };
  $('it-more').onclick = () => { cmp.itShown += 240; draw(); };
  const draw = cmp.itDraw = () => {
    [...groups.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === cmp.itGroup)));
    const f = fold(cmp.itQ.trim());
    const shown = list.filter(it => (cmp.itGroup === 'all' || groupOf(it) === cmp.itGroup) && (!f || fold(it.it).includes(f) || fold(it.en).includes(f)));
    const out = $('it-list');
    out.innerHTML = '';
    for (const it of shown.slice(0, cmp.itShown)) {
      const c = document.createElement('article');
      c.className = 'cmp-card cmp-item';
      c.style.setProperty('--g', IT_COLOR[groupOf(it)] ?? IT_COLOR.other);
      c.dataset.slug = it.slug;
      c.item = it;
      c.innerHTML = '<a class="cmp-sum" aria-expanded="false"><span class="cmp-ico"><img alt="" width="30" height="30" loading="lazy"></span><span class="cmp-item-txt"><strong></strong><span class="cmp-en" lang="en"></span></span></a>';
      const img = c.querySelector('img');
      img.src = itemSprite(it.slug);
      img.onerror = () => { img.remove(); };
      c.querySelector('strong').textContent = it.it;
      c.querySelector('.cmp-en').textContent = it.en; // sempre, anche se è uguale al nome italiano
      cmpSum(c, 'strumento', it.slug);
      out.append(c);
    }
    const more = $('it-more');
    more.hidden = shown.length <= cmp.itShown;
    more.textContent = `Mostra altri (${shown.length - cmp.itShown})`;
    if (cmpRoute().slug) cmpOpen(out, cmpRoute().slug, itemBody, true);
  };
  draw();
}

// Versioni dei giochi: sigla e colore per i quadratini "dove lo tiene" (id di PokéAPI)
const VERSION_TAG = {
  1: ['R', '#d8352a'], 2: ['B', '#2f5fc4'], 3: ['G', '#f2c21b'], 4: ['O', '#d6a419'], 5: ['A', '#a9b6c0'], 6: ['C', '#4fb3d9'],
  7: ['Ru', '#c8243a'], 8: ['Za', '#2753a8'], 9: ['Sm', '#1d9a5c'], 10: ['RF', '#e8622a'], 11: ['VF', '#54a63c'],
  12: ['D', '#4f73c0'], 13: ['P', '#d79bbd'], 14: ['Pt', '#7d7f86'], 15: ['HG', '#d6a419'], 16: ['SS', '#a9b6c0'],
  17: ['N', '#26262b'], 18: ['Bi', '#cfcfcf'], 21: ['N2', '#26262b'], 22: ['B2', '#cfcfcf'], 23: ['X', '#2f63b5'], 24: ['Y', '#d0303f'],
  25: ['RΩ', '#c8243a'], 26: ['Zα', '#2753a8'], 27: ['So', '#f0a020'], 28: ['Lu', '#6c5ce7'], 29: ['US', '#e4701f'], 30: ['UL', '#8b4bb8'],
  31: ['LP', '#f2c21b'], 32: ['LE', '#b07a45'], 33: ['Sp', '#2fa6dc'], 34: ['Sc', '#d6336c'], 39: ['DL', '#4f73c0'], 40: ['PS', '#d79bbd'],
  41: ['LA', '#5f8f6f'], 42: ['Sl', '#e2412d'], 43: ['Vi', '#7b3fbf'],
};
async function itemBody(card) {
  const it = card.item;
  let dex;
  try { [dex] = await Promise.all([loadDex(), softExtra()]); } catch { dex = []; }
  if (card.querySelector('.cmp-body') || cmpFx.zoom?.card === card) return;
  const body = document.createElement('div');
  body.className = 'cmp-body';
  body.append(Object.assign(document.createElement('p'), { className: 'cmp-lead', textContent: it.desc || it.descEn || 'Nessuna descrizione disponibile.' }));
  if (it.cost) body.insertAdjacentHTML('beforeend', `<p class="cmp-price">Nei negozi a <b>${it.cost.toLocaleString('it-IT')} ₽</b></p>`);
  if (it.held.length) {
    // Pokémon selvatici che possono tenerlo: per ciascuno, la probabilità e i giochi come quadratini colorati
    const by = new Map();
    for (const [pid, vid, r] of it.held) {
      const m = by.get(pid) ?? new Map();
      (m.get(r) ?? m.set(r, []).get(r)).push(vid);
      by.set(pid, m);
    }
    const sec = document.createElement('div');
    sec.className = 'cmp-held';
    sec.innerHTML = `<button type="button" class="cmp-held-btn" aria-expanded="false">Quali Pokémon selvatici lo tengono <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="cmp-held-list" hidden></div>`;
    const list = sec.querySelector('.cmp-held-list');
    for (const pid of [...by.keys()].sort((a, b) => a - b)) {
      const mon = dex.find(m => m.id === pid);
      if (!mon) continue;
      const species = pid <= 10000 ? pid : extraData?.formSpecies.get(pid);
      const row = document.createElement(species ? 'a' : 'div');
      row.className = 'cmp-held-row';
      if (species) row.href = `#dex/${species}`;
      row.innerHTML = `<img src="${spriteUrl(pid)}" alt="" width="56" height="56" loading="lazy"><span class="cmp-held-name"></span><span class="cmp-held-odds"></span>`;
      row.querySelector('.cmp-held-name').textContent = monNames(mon).it;
      const odds = row.querySelector('.cmp-held-odds');
      for (const [pct, vids] of [...by.get(pid)].sort((a, b) => b[0] - a[0])) {
        const g = document.createElement('span');
        g.className = 'cmp-odd';
        g.innerHTML = `<b>${pct}%</b>` + vids.map(v => { const [tag, col] = VERSION_TAG[v] ?? ['?', '#888']; return `<i style="--v:${col}" title="${esc(cmp.itData.versions[v] || '')}">${esc(tag)}</i>`; }).join('');
        odds.append(g);
      }
      list.append(row);
    }
    const btn = sec.querySelector('button');
    btn.onclick = () => {
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open && cmpMotion()) gsap.fromTo(list.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out', stagger: .03 });
      zoomRefit();
    };
    body.append(sec);
  }
  card.append(body);
}

/* ---------- Mosse ---------- */

function loadMoves() {
  if (cmp.mv) return cmp.mv;
  const hit = store.get('cmp-mv3', null);
  if (hit && Date.now() - hit.t < CMP_DAYS) return (cmp.mv = Promise.resolve(hit.list));
  // "Da contatto" non c'è in PokéAPI: lo prendo dai dati delle mosse di Pokémon Showdown (chiave = slug senza trattini)
  const sd = fetch('https://play.pokemonshowdown.com/data/moves.json').then(r => r.json()).catch(() => null);
  cmp.mv = Promise.all([gql(`{ m: pokemon_v2_move(where:{pokemon_v2_movenames:{language_id:{_eq:8}}, id:{_lt:10000}}, order_by:{id:asc}) { id name power accuracy pp priority generation_id move_effect_chance
      t: pokemon_v2_type { name } c: pokemon_v2_movedamageclass { name }
      n: pokemon_v2_movenames(where:{language_id:{_in:[8,9]}}) { name language_id }
      ft: pokemon_v2_moveflavortexts(where:{language_id:{_eq:8}}, order_by:{version_group_id:desc}, limit:1) { flavor_text }
      fe: pokemon_v2_moveflavortexts(where:{language_id:{_eq:9}}, order_by:{version_group_id:desc}, limit:1) { flavor_text }
      e: pokemon_v2_moveeffect { x: pokemon_v2_moveeffecteffecttexts(where:{language_id:{_eq:9}}) { short_effect } } } }`), sd])
    .then(([d, flags]) => {
      const list = d.m.filter(m => TYPE_BY_ID[m.t?.name]).map(m => ({
        id: m.id, slug: m.name, type: m.t.name, cls: m.c?.name ?? 'status', gen: m.generation_id,
        pow: m.power, acc: m.accuracy, pp: m.pp, pri: m.priority,
        it: nameIn(m.n, 8) || prettyName(m.name), en: nameIn(m.n, 9) || '',
        desc: oneLine(m.ft[0]?.flavor_text), descEn: oneLine(m.fe[0]?.flavor_text),
        tech: oneLine(m.e?.x[0]?.short_effect).replace(/\$effect_chance/g, m.move_effect_chance ?? ''),
        // true / false per le mosse di danno; null se è di stato o il dato manca
        contact: m.c?.name === 'status' || !flags?.[m.name.replace(/-/g, '')] ? null : !!flags[m.name.replace(/-/g, '')].flags?.contact,
      })).sort((x, y) => x.it.localeCompare(y.it, 'it'))
        // Le mosse Z esistono in due copie (fisica e speciale) con lo stesso nome: ne tengo una
        .filter((m, i, a) => !(i && a[i - 1].it === m.it && a[i - 1].type === m.type));
      store.set('cmp-mv3', { t: Date.now(), list });
      return list;
    }).catch(e => { cmp.mv = null; throw e; });
  return cmp.mv;
}

async function moveList(slug) {
  const box = $('mv-view');
  let list = cmp.mvList;
  if (box.dataset.view !== 'list') {
    loading(box, 'Carico le mosse…');
    try { list = cmp.mvList = await loadMoves(); } catch { failed(box); return; }
    if (cmpRoute().part !== 'mv') return;
    if (box.dataset.view !== 'list') buildMoveList(box, list);
  }
  const want = cmpRoute().slug || null;
  if (want && !$('mv-list').querySelector(`.cmp-card[data-slug="${CSS.escape(want)}"]`)) {
    // La mossa cercata è nascosta dai filtri o oltre quelle mostrate: tolgo i filtri e mostro fin lì
    cmp.mvQ = ''; cmp.mvType = ''; cmp.mvCls = ''; $('mv-q').value = '';
    cmp.mvShown = Math.max(120, list.findIndex(x => x.slug === want) + 1);
    cmp.mvDraw();
  }
  await cmpOpen($('mv-list'), want, moveBody);
}

const mvStat = (v, unit = '') => v == null ? '—' : v + unit;

function buildMoveList(box, list) {
  box.dataset.view = 'list';
  Promise.all([loadDex(), softExtra()]).catch(() => {});
  box.innerHTML = `
    <section class="cmp-filters">
      <input type="search" class="dex-search" id="mv-q" placeholder="Cerca una mossa…" autocomplete="off" spellcheck="false" aria-label="Cerca una mossa">
      <div class="mv-types" id="mv-types" role="group" aria-label="Tipo della mossa"></div>
      <div class="dex-gens" id="mv-cls" role="group" aria-label="Categoria"></div>
    </section>
    <div class="cmp-list cmp-moves" id="mv-list"></div>
    <button type="button" class="btn ghost cmp-more" id="mv-more" hidden></button>`;
  // Tipi: solo le icone tonde (il nome compare passandoci sopra); un secondo clic toglie il filtro
  const types = $('mv-types');
  for (const t of TYPES) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'mv-type-btn', title: t.it });
    b.dataset.t = t.id;
    b.setAttribute('aria-label', t.it);
    b.append(icon(t.id));
    b.onclick = () => { cmp.mvType = cmp.mvType === t.id ? '' : t.id; cmp.mvShown = 120; draw(); };
    types.append(b);
  }
  const clsBox = $('mv-cls');
  for (const [k, label] of [['', 'Tutte'], ['physical', 'Fisiche'], ['special', 'Speciali'], ['status', 'Di stato']]) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'dex-gen', textContent: label });
    b.dataset.k = k;
    b.onclick = () => { cmp.mvCls = k; cmp.mvShown = 120; draw(); };
    clsBox.append(b);
  }
  const q = $('mv-q');
  q.value = cmp.mvQ;
  q.oninput = () => { cmp.mvQ = q.value; cmp.mvShown = 120; draw(); };
  $('mv-more').onclick = () => { cmp.mvShown += 240; draw(); };
  const draw = cmp.mvDraw = () => {
    [...types.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === cmp.mvType)));
    types.classList.toggle('picking', !!cmp.mvType);
    [...clsBox.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === cmp.mvCls)));
    const f = fold(cmp.mvQ.trim());
    const shown = list.filter(m => (!cmp.mvType || m.type === cmp.mvType) && (!cmp.mvCls || m.cls === cmp.mvCls) && (!f || fold(m.it).includes(f) || fold(m.en).includes(f)));
    const out = $('mv-list');
    out.innerHTML = '';
    for (const m of shown.slice(0, cmp.mvShown)) {
      const c = document.createElement('article');
      c.className = 'cmp-card cmp-move';
      c.dataset.slug = m.slug;
      c.move = m;
      const t = TYPE_BY_ID[m.type];
      // A sinistra il paesaggio del tipo (paesaggi.js) con l'icona del tipo; il simbolo della categoria accanto al nome;
      // (se è da contatto si vede solo nella scheda grande)
      const cls = CLS[m.cls]?.label ?? '';
      c.innerHTML = `<a class="cmp-sum" aria-expanded="false"><span class="mv-pic"><span class="scene sc-${m.type}"></span></span>
        <span class="mv-txt"><span class="mv-name"><strong></strong><span class="mv-cls" title="${cls}">${CLS_ICON[m.cls] ?? ''}<span class="sr-only">${cls}</span></span></span><span class="cmp-en" lang="en"></span>
        <span class="mv-stats"><span><b>${mvStat(m.pow)}</b> pot.</span><span><b>${mvStat(m.acc, '%')}</b> prec.</span><span><b>${mvStat(m.pp)}</b> PP</span></span></span></a>`;
      c.querySelector('.mv-pic').prepend(Object.assign(icon(m.type), { title: t.it }));
      c.querySelector('strong').textContent = m.it;
      c.querySelector('.cmp-en').textContent = m.en; // sempre, anche se è uguale al nome italiano
      cmpSum(c, 'mossa', m.slug);
      out.append(c);
    }
    const more = $('mv-more');
    more.hidden = shown.length <= cmp.mvShown;
    more.textContent = `Mostra altre (${shown.length - cmp.mvShown})`;
    if (!shown.length) out.innerHTML = '<p class="hint cmp-none">Nessuna mossa con questi filtri.</p>';
    if (cmpRoute().slug) cmpOpen(out, cmpRoute().slug, moveBody, true);
  };
  draw();
}

const mvLearners = new Map();
// Per ogni Pokémon: l'ultimo gruppo di giochi in cui impara la mossa e in quali modi (livello, MT, uovo, insegnante).
// Ordine: prima chi la impara salendo di livello (dal livello più basso), poi gli altri.
const LEARN_NAME = { 2: 'Uovo', 3: 'Insegnante', 4: 'MT' };
function learnWays(d) {
  const by = new Map();
  for (const r of d.p) {
    const w = by.get(r.pokemon_id);
    if (w && w.vg !== r.version_group_id) continue; // tengo solo il gioco più recente (righe già in ordine)
    const x = w ?? { id: r.pokemon_id, vg: r.version_group_id, lv: null, how: new Set() };
    if (r.move_learn_method_id === 1) x.lv = x.lv == null ? r.level : Math.min(x.lv, r.level);
    else x.how.add(LEARN_NAME[r.move_learn_method_id] ?? 'Altro');
    by.set(r.pokemon_id, x);
  }
  return [...by.values()].map(x => ({
    id: x.id, lv: x.lv,
    note: [x.lv == null ? '' : x.lv === 0 ? 'Evolvendosi' : `Lv. ${x.lv}`, ...['MT', 'Uovo', 'Insegnante', 'Altro'].filter(h => x.how.has(h))].filter(Boolean).join(' · '),
  })).sort((a, b) => (a.lv == null) - (b.lv == null) || (a.lv ?? 0) - (b.lv ?? 0) || a.id - b.id);
}
async function moveBody(card) {
  const m = card.move;
  if (card.querySelector('.cmp-body') || cmpFx.zoom?.card === card) return;
  const body = document.createElement('div');
  body.className = 'cmp-body';
  // Senza descrizione (né italiana né inglese) uso come testo principale la spiegazione tecnica in inglese
  body.append(Object.assign(document.createElement('p'), { className: 'cmp-lead', textContent: m.desc || m.descEn || m.tech || 'Nessuna descrizione disponibile.' }));
  if (!m.desc && (m.descEn || m.tech)) body.lastChild.lang = 'en';
  // Subito sotto, in piccolo, la spiegazione in inglese (l'effetto preciso, con le percentuali)
  // (solo se la descrizione sopra è in italiano: se è già in inglese non aggiungo altro inglese)
  if (m.tech && m.desc) body.append(Object.assign(document.createElement('p'), { className: 'cmp-en-desc', lang: 'en', textContent: m.tech }));
  // I numeri della mossa, in fila come i dati delle schede dei Pokémon
  const t = TYPE_BY_ID[m.type];
  const facts = [['Tipo', t.it], ['Categoria', CLS[m.cls]?.label ?? m.cls], ['Potenza', mvStat(m.pow)], ['Precisione', mvStat(m.acc, '%')],
    ['PP', mvStat(m.pp)], ['Priorità', m.pri > 0 ? '+' + m.pri : String(m.pri)], ['Generazione', m.gen]];
  if (m.contact != null) facts.splice(5, 0, ['Contatto', m.contact ? 'Sì' : 'No']); // subito dopo i PP
  const dl = document.createElement('dl');
  dl.className = 'mv-facts';
  for (const [k, v] of facts) dl.insertAdjacentHTML('beforeend', `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`);
  body.append(dl);
  // Pokémon che la imparano: scaricati solo quando si apre l'elenco
  const sec = document.createElement('div');
  sec.className = 'cmp-held';
  sec.innerHTML = `<button type="button" class="cmp-held-btn" aria-expanded="false">Quali Pokémon la imparano <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="mv-learners" hidden></div>`;
  const box = sec.querySelector('.mv-learners');
  const btn = sec.querySelector('button');
  btn.onclick = async () => {
    const open = box.hidden;
    box.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open && !box.childElementCount) {
      box.innerHTML = '<p class="hint">Carico…</p>';
      zoomRefit();
      try {
        if (!mvLearners.has(m.id)) mvLearners.set(m.id, gql(`{ p: pokemon_v2_pokemonmove(where:{move_id:{_eq:${m.id}}}, order_by:{version_group_id:desc}) { pokemon_id level move_learn_method_id version_group_id } }`).then(learnWays));
        const [ways, [dex]] = await Promise.all([mvLearners.get(m.id), Promise.all([loadDex(), softExtra()])]);
        box.innerHTML = '';
        if (!ways.length) box.innerHTML = '<p class="hint">Nessun Pokémon la impara nei giochi principali.</p>';
        else {
          box.append(Object.assign(document.createElement('p'), { className: 'hint mv-learn-hint', textContent: 'Livello e modo dell\'ultimo gioco in cui ciascun Pokémon la impara.' }));
          const note = new Map(ways.map(w => [w.id, w.note]));
          box.append(monGrid(dex, ways.map(w => w.id), id => note.get(id)));
        }
        if (cmpMotion()) gsap.fromTo(box.querySelectorAll('.cmp-mon'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out', stagger: { amount: .4 } });
      } catch { mvLearners.delete(m.id); box.innerHTML = '<p class="hint">Non riesco a scaricare l\'elenco. Riprova.</p>'; }
    }
    zoomRefit();
  };
  body.append(sec);
  card.append(body);
}
