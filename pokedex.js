// Pokéncarta — sezione Pokédex: elenco filtrabile e scheda completa di ogni Pokémon.
// Usa le funzioni di app.js (loadDex, softExtra, monNames, badge, icon, defensiveChart…).

const DEX_STAT = [
  ['hp', 'PS'], ['attack', 'Attacco'], ['defense', 'Difesa'],
  ['special-attack', 'Att. Sp.'], ['special-defense', 'Dif. Sp.'], ['speed', 'Velocità'],
];
const EGG_GROUP = {
  monster: 'Mostro', water1: 'Acqua 1', water2: 'Acqua 2', water3: 'Acqua 3', bug: 'Coleottero',
  flying: 'Volante', ground: 'Campo', fairy: 'Folletto', plant: 'Erba', humanshape: 'Umanoide',
  mineral: 'Minerale', indeterminate: 'Amorfo', ditto: 'Ditto', dragon: 'Drago', 'no-eggs': 'Sconosciuto',
};
const GROWTH = {
  slow: 'Lenta', medium: 'Media', fast: 'Veloce', 'medium-slow': 'Medio-lenta',
  'slow-then-very-fast': 'Irregolare', 'fast-then-very-slow': 'Fluttuante',
};
const LEARN = [
  ['level-up', 'Per livello'], ['machine', 'MT'], ['egg', 'Mosse uovo'], ['tutor', 'Insegnante'],
];
const DEX_ART = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const DEX_SPRITE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const DEX_ANIM = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`;
const idFromUrl = url => Number(url.split('/').filter(Boolean).pop());
const getJSON = url => fetch(url).then(r => { if (!r.ok) throw r; return r.json(); });
const dexCache = new Map();
const cached = (url) => { if (!dexCache.has(url)) dexCache.set(url, getJSON(url).catch(e => { dexCache.delete(url); throw e; })); return dexCache.get(url); };
const itName = (names, fallback) => names?.find(n => n.language.name === 'it')?.name || fallback;

const dexState = {
  q: '',
  types: store.get('dex-types', []),
  gen: store.get('dex-gen', 0),
  built: false,
  shown: false,   // elenco già filtrato una volta: da qui in poi i filtri si animano
  cards: [],
  scrollY: 0,
  vg: null,      // version group scelto per le mosse
  method: 'level-up',
  view: store.get('dex-view2', 'art'),  // vista immagine (predefinita: artwork), mantenuta tra i Pokémon
  shiny: store.get('dex-shiny', false),
  female: false,
  form: null,
  special: null,     // filtro elenco: 'mega' | 'gmax' | 'reg' | 'alt'
};

/* ---------- Elenco ---------- */

async function renderPokedex() {
  const seq = ++state.dexSeq;
  // Abilità e Oggetti (compendio.js) hanno indirizzi propri: #abilita, #oggetti
  if (renderCompendio()) return;
  buildDexFilters();
  const m = location.hash.match(/^#dex\/(\d+)$/);
  if (m) { openDex(Number(m[1]), false); return; }
  showDexList();
  if (dexState.built) return;
  $('dex-count').textContent = 'Carico il Pokédex…';
  let dex;
  try { [dex] = await Promise.all([loadDex(), softExtra()]); }
  catch { $('dex-count').textContent = 'Non riesco a scaricare il Pokédex. Controlla la connessione e riprova.'; return; }
  if (seq !== state.dexSeq || dexState.built) return;
  dexState.built = true;
  const list = $('dex-list');
  list.innerHTML = '';
  dexState.heads = [];
  // Specie con forme Mega / Gigamax (dai nomi delle forme alternative)
  const special = new Map();
  const speciesSlugs = new Set(dex.filter(m => m.id <= 1025).map(m => m.name));
  const baseOf = name => { const parts = name.split('-'); for (let i = parts.length - 1; i > 0; i--) { const c = parts.slice(0, i).join('-'); if (speciesSlugs.has(c)) return c; } return null; };
  for (const f of dex) {
    if (f.id <= 10000 || /-totem/.test(f.name)) continue;
    const baseName = baseOf(f.name);
    if (!baseName) continue;
    const k = special.get(baseName) ?? new Set();
    k.add(formKind(f.name));
    special.set(baseName, k);
  }
  let lastGen = 0;
  dexState.cards = dex.filter(mon => mon.id <= 1025).map(mon => {
    const gen = GENS.findIndex(([a, b]) => mon.id >= a && mon.id <= b) + 1;
    // Intestazione di regione all'inizio di ogni generazione
    if (gen !== lastGen) {
      lastGen = gen;
      const h = document.createElement('h3');
      h.className = 'dex-region';
      h.innerHTML = `<span>${REGIONS[gen]}</span><small>Gen ${gen} · Nº ${String(GENS[gen - 1][0]).padStart(4, '0')}–${String(GENS[gen - 1][1]).padStart(4, '0')}</small>`;
      list.append(h);
      dexState.heads.push({ el: h, gen });
    }
    const { it, en } = monNames(mon);
    const [t1, t2] = mon.types;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'dex-card';
    card.style.setProperty('--c', TYPE_BY_ID[t1].color);
    card.style.setProperty('--c2', TYPE_BY_ID[t2 ?? t1].color);
    card.setAttribute('aria-label', `${it}, numero ${mon.id}, ${mon.types.map(t => TYPE_BY_ID[t].it).join(' e ')}`);
    const stage = document.createElement('span');
    stage.className = 'dex-stage';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = img.height = 96;
    img.alt = '';
    img.src = DEX_SPRITE(mon.id);
    img.className = 'dex-static';
    img.onerror = () => { img.style.visibility = 'hidden'; };
    img.crossOrigin = 'anonymous';
    // Centro il Pokémon sul suo disegno (non sul riquadro dello sprite) e metto l'ombra sotto i piedi:
    // misuro i pixel non trasparenti quando lo sprite arriva (le schede si caricano solo quando entrano in vista)
    img.addEventListener('load', () => {
      spriteBox(DEX_SPRITE(mon.id)).then(b => {
        const k = img.clientWidth / 96;
        stage.style.setProperty('--dx', -((b.x0 + b.x1) / 2 - 48) * k + 'px');
        stage.style.setProperty('--dy', -((b.y0 + b.y1) / 2 - 48) * k + 'px');
        stage.style.setProperty('--feet', ((b.y1 - b.y0) / 2) * k + 'px');
        stage.style.setProperty('--size', Math.max(b.x1 - b.x0, b.y1 - b.y0) * k + 'px');
      }).catch(() => {});
    }, { once: true });
    // Paesaggio del tipo (paesaggi.js); con due tipi il secondo si posa sopra e si fondono al centro
    for (const t of new Set(mon.types)) stage.append(Object.assign(document.createElement('span'), { className: `scene sc-${t}` }));
    stage.append(Object.assign(document.createElement('span'), { className: 'grain' }), img);
    const kinds = special.get(mon.name);
    if (kinds) {
      const marks = document.createElement('span');
      marks.className = 'dex-marks';
      for (const k of ['reg', 'mega', 'gmax']) if (kinds.has(k)) {
        const m = document.createElement('span');
        m.className = 'dex-mark';
        m.dataset.kind = k;
        m.title = { mega: 'Ha una forma Mega', gmax: 'Ha una forma Gigamax', reg: 'Ha una forma regionale' }[k];
        m.innerHTML = FORM_ICON[k];
        marks.append(m);
      }
      stage.append(marks);
    }
    // Sotto la "foto", come una didascalia: numero e nome a sinistra, icone dei tipi a destra
    const foot = Object.assign(document.createElement('span'), { className: 'dex-foot' });
    const label = Object.assign(document.createElement('span'), { className: 'dex-label' });
    label.append(
      Object.assign(document.createElement('span'), { className: 'dex-num', textContent: `#${String(mon.id).padStart(3, '0')}` }),
      Object.assign(document.createElement('span'), { className: 'dex-name', textContent: it }));
    const ty = document.createElement('span');
    ty.className = 'dex-types';
    mon.types.forEach(t => { const b = badge(t); b.classList.add('mini'); b.title = TYPE_BY_ID[t].it; ty.append(b); });
    foot.append(label, ty);
    card.append(stage, foot);
    card.onclick = () => { location.hash = `dex/${mon.id}`; };
    // Sprite animato al passaggio del mouse (o con la tastiera): si carica solo la prima volta,
    // poi i due sprite si scambiano con una dissolvenza.
    let anim = null, want = false;
    const animate = on => {
      want = on;
      if (!on) { stage.classList.remove('anim'); return; }
      if (!anim) {
        anim = document.createElement('img');
        anim.className = 'dex-anim';
        anim.alt = '';
        anim.decoding = 'async';
        anim.onload = async () => {
          // Sovrappongo lo sprite animato esattamente al Pokémon dello sprite fisso:
          // stesso centro e stessa grandezza (la GIF include il margine del movimento).
          const W = stage.clientWidth, H = stage.clientHeight;
          // Il disegno fisso è già centrato (vedi --dx/--dy): l'animazione va nello stesso punto, alla stessa grandezza
          const lift = parseFloat(getComputedStyle(stage).getPropertyValue('--lift')) || 0;
          const cx = W / 2, cy = H / 2 + lift;
          const size = parseFloat(stage.style.getPropertyValue('--size')) || 70;
          const gw = anim.naturalWidth, gh = anim.naturalHeight;
          let k = size * 1.1 / Math.max(gw, gh);
          k = Math.min(k, (H - 8) / gh, (W - 12) / gw, 3);
          const w = Math.round(gw * k), h = Math.round(gh * w / gw);
          const left = Math.round(Math.min(Math.max(cx - w / 2, 6), W - w - 6));
          const top = Math.round(Math.min(Math.max(cy - h / 2, 4), H - h - 4));
          Object.assign(anim.style, { width: w + 'px', left: left + 'px', top: top + 'px' });
          if (want) requestAnimationFrame(() => stage.classList.add('anim'));
        };
        anim.onerror = () => { anim.remove(); anim = 'none'; };
        anim.src = DEX_ANIM(mon.id);
        stage.append(anim);
      } else if (anim !== 'none' && anim.complete) {
        stage.classList.add('anim');
      }
    };
    if (matchMedia('(hover: hover)').matches) {
      card.addEventListener('pointerenter', () => animate(true));
      card.addEventListener('pointerleave', () => animate(false));
    }
    card.addEventListener('focus', () => animate(true));
    card.addEventListener('blur', () => animate(false));
    list.append(card);
    return { el: card, id: mon.id, types: mon.types, gen, kinds: kinds ?? new Set(), key: `${it} ${en} ${mon.id}`.toLowerCase() };
  });
  applyDexFilter();
}

function buildDexFilters() {
  const types = $('dex-types');
  if (!types.childElementCount) {
    for (const t of TYPES) {
      const b = badge(t.id, 'button');
      b.type = 'button';
      b.classList.add('pick');
      b.dataset.type = t.id;
      b.title = t.it; // i tipi si vedono come sole icone: il nome compare passandoci sopra
      b.setAttribute('aria-label', t.it);
      b.onclick = () => {
        const sel = dexState.types;
        dexState.types = sel.includes(t.id) ? sel.filter(x => x !== t.id) : [...sel, t.id].slice(-2);
        store.set('dex-types', dexState.types);
        applyDexFilter();
      };
      types.append(b);
    }
    const gens = $('dex-gens');
    ['Tutte', ...REGIONS.slice(1)].forEach((label, g) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dex-gen';
      b.dataset.gen = g;
      b.textContent = g ? `${label}` : label;
      if (g) b.title = `Generazione ${g}`;
      b.onclick = () => { dexState.gen = g; store.set('dex-gen', g); applyDexFilter(); };
      gens.append(b);
    });
    $('dex-reset').onclick = () => {
      dexState.q = ''; dexState.types = []; dexState.gen = 0; dexState.special = null;
      $('dex-search').value = '';
      $('dex-list').classList.remove('searching');
      store.set('dex-types', []); store.set('dex-gen', 0);
      applyDexFilter();
    };
    const sp = $('dex-special');
    [[null, 'Tutti'], ['reg', 'Regionali'], ['mega', 'Con Mega'], ['gmax', 'Con Gigamax'], ['alt', 'Altre forme']].forEach(([k, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dex-gen';
      b.dataset.special = k ?? '';
      b.innerHTML = (k ? FORM_ICON[k] : '') + `<span>${label}</span>`;
      b.onclick = () => { dexState.special = k; applyDexFilter(); };
      sp.append(b);
    });
    const search = $('dex-search');
    // Scrivendo le schede cambiano subito, senza animazioni (a ogni lettera si muoverebbero in modo caotico);
    // l'elenco tiene un'altezza minima, così la pagina non si accorcia e la vista non salta su e giù
    search.oninput = () => {
      dexState.q = search.value.trim().toLowerCase();
      $('dex-list').classList.toggle('searching', !!dexState.q);
      applyDexFilter(true);
    };
  }
  for (const b of $('dex-types').children) b.setAttribute('aria-pressed', String(dexState.types.includes(b.dataset.type)));
  $('dex-types').classList.toggle('picking', dexState.types.length > 0);
  for (const b of $('dex-gens').children) b.setAttribute('aria-pressed', String(Number(b.dataset.gen) === dexState.gen));
  for (const b of $('dex-special').children) b.setAttribute('aria-pressed', String((b.dataset.special || null) === (dexState.special ?? null)));
}

// Filtri animati con GSAP Flip: le schede visibili scivolano nella nuova posizione, quelle che
// entrano o escono si dissolvono. Solo quelle che toccano la finestra (con un piccolo margine):
// animarle tutte e 1025 sarebbe lento e quelle fuori schermo non si vedono. Senza GSAP, con
// prefers-reduced-motion o durante il cambio di tema/stile, il filtro è immediato.
const dexFlip = window.gsap && window.Flip ? (gsap.registerPlugin(Flip), { tl: null }) : null;
function dexInView() {
  const top = -80, bottom = innerHeight + 80, out = [];
  for (const { el } of [...dexState.cards, ...dexState.heads]) {
    if (el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > top && r.top < bottom) out.push(el);
  }
  return out;
}
function applyDexFilter(still = false) {
  // Un filtro nuovo durante un'animazione: quella in corso arriva subito alla fine
  if (dexFlip?.tl) { dexFlip.tl.progress(1).kill(); dexFlip.tl = null; }
  const list = $('dex-list');
  list.classList.remove('flipping');
  const html = document.documentElement;
  const animate = !still && dexFlip && dexState.shown && !$('dex-browse').hidden
    && !matchMedia('(prefers-reduced-motion: reduce)').matches
    && !html.classList.contains('vt-pix') && !html.classList.contains('vt-style');
  if (!animate) { filterDexCards(); dexState.shown = !!dexState.cards.length; return; }
  const before = dexInView();
  const state = Flip.getState(before);
  const oldPos = new Map(before.map(el => { const r = el.getBoundingClientRect(); return [el, [r.left, r.top]]; }));
  filterDexCards();
  // Mentre Flip muove le schede la loro transizione CSS su transform (quella del passaggio del mouse)
  // è spenta: altrimenti rincorre l'animazione e le schede vanno oltre la meta e tornano indietro
  list.classList.add('flipping');
  // Durata secondo il tragitto più lungo tra le schede che restano in vista, con partenza e arrivo
  // dolci (come i risultati della Tabella): a metà corsa al massimo ~25 px per fotogramma
  // Le schede che dalla finestra finirebbero lontano, fuori vista, non attraversano lo schermo di corsa:
  // restano un attimo dov'erano (una copia) e svaniscono
  const away = [];
  const targets = [...new Set([...before, ...dexInView()])].filter(el => {
    const p = oldPos.get(el);
    if (!p || el.hidden) return true;
    const r = el.getBoundingClientRect();
    if (r.bottom >= 0 && r.top <= innerHeight) return true;
    away.push([el, p, r.width, r.height]);
    return false;
  });
  for (const [el, p, w, h] of away) {
    const g = el.cloneNode(true);
    g.setAttribute('aria-hidden', 'true');
    g.removeAttribute('tabindex');
    Object.assign(g.style, { position: 'fixed', left: p[0] + 'px', top: p[1] + 'px', width: w + 'px', height: h + 'px', margin: 0, zIndex: 1, pointerEvents: 'none', transform: 'none' });
    list.append(g);
    gsap.to(g, { opacity: 0, scale: .96, duration: .2, ease: 'power2.in', onComplete: () => g.remove() });
  }
  let far = 0;
  for (const el of targets) {
    const p = oldPos.get(el);
    if (!p) continue;
    const r = el.getBoundingClientRect();
    far = Math.max(far, Math.hypot(r.left - p[0], r.top - p[1]));
  }
  dexFlip.tl = Flip.from(state, {
    targets,
    duration: Math.min(.6, Math.max(.3, far / 850)),
    ease: 'sine.inOut',
    stagger: .012,
    absoluteOnLeave: true,
    onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .22, ease: 'power2.out', stagger: .012 }),
    onLeave: els => gsap.to(els, { opacity: 0, scale: .96, duration: .18, ease: 'power2.in' }),
    onComplete: () => { dexFlip.tl = null; list.classList.remove('flipping'); },
  });
  // Mostrare o nascondere molte schede può tenere occupato il browser per un paio di fotogrammi:
  // le schede restano ferme dov'erano finché non torna libero, poi l'animazione parte da zero (niente scatto iniziale)
  const tl = dexFlip.tl;
  tl.pause(0);
  requestAnimationFrame(() => requestAnimationFrame(() => { if (dexFlip.tl === tl) tl.play(0); }));
}

function filterDexCards() {
  buildDexFilters();
  const { q, types, gen } = dexState;
  const num = /^\d+$/.test(q) ? Number(q) : null;
  let n = 0;
  const seen = new Set();
  for (const c of dexState.cards) {
    const ok = (!gen || c.gen === gen)
      && (!dexState.special || c.kinds.has(dexState.special))
      && types.every(t => c.types.includes(t))
      && (!q || (num !== null ? String(c.id).startsWith(q) : c.key.includes(q)));
    c.el.hidden = !ok;
    if (ok) { n++; seen.add(c.gen); }
  }
  for (const h of dexState.heads) h.el.hidden = !seen.has(h.gen);
  const active = q || types.length || gen || dexState.special;
  $('dex-reset').hidden = !active;
  $('dex-count').textContent = n ? '' : 'Nessun Pokémon corrisponde ai filtri.';
  $('dex-count').hidden = !!n;
}

function showDexList() {
  $('dex-detail').hidden = true;
  $('dex-browse').hidden = false;
  if (dexState.scrollY) requestAnimationFrame(() => scrollTo(0, dexState.scrollY));
}

/* ---------- Scheda ---------- */

// Forme della scheda: Mega (anche X e Y), Gigamax, Archeorisveglio, regionali e altre varianti
const SPECIAL_FORM = /-(mega|gmax|primal)(-|$)/;
const REGIONAL_FORM = /-(alola|galar|hisui|paldea)(?!-cap)(-|$)/;
const REGION_IT = { alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea' };
// Parole ricorrenti nei nomi delle forme, in italiano
const FORM_WORD = {
  'combat-breed': 'Razza Combattiva', 'blaze-breed': 'Razza Infuocata', 'aqua-breed': 'Razza Acquatica',
  origin: 'Originale', therian: 'Totem', incarnate: 'Incarnazione', attack: 'Attacco', defense: 'Difesa', speed: 'Velocità',
  heat: 'Calore', wash: 'Lavaggio', frost: 'Gelo', fan: 'Vortice', mow: 'Taglio', sky: 'Cielo', zen: 'Stato Zen',
  totem: 'Dominante', starter: 'Partner', crowned: 'Re Supremo', eternamax: 'Dynamax Infinito', hero: 'Eroica',
  female: 'Femmina', male: 'Maschio', 'rapid-strike': 'Pluricolpo', 'single-strike': 'Singolcolpo', ice: 'Destriero Glaciale',
  shadow: 'Destriero Spettrale', school: 'Banco', 'pom-pom': 'Ritmo Cheerleading', 'pau': 'Danza Hula', sensu: 'Danza Buyō',
  midnight: 'Notte', dusk: 'Crepuscolo', ultra: 'Ultra', 'dusk-mane': 'Criniera del Vespro', 'dawn-wings': 'Ali dell’Aurora',
  complete: 'Perfetta', '10': '10%', '50': '50%', unbound: 'Libero', resolute: 'Risoluta', pirouette: 'Danza',
  'original-cap': 'Berretto Originale', 'hoenn-cap': 'Berretto di Hoenn', 'sinnoh-cap': 'Berretto di Sinnoh', 'unova-cap': 'Berretto di Unima',
  'kalos-cap': 'Berretto di Kalos', 'alola-cap': 'Berretto di Alola', 'partner-cap': 'Berretto Compagno', 'world-cap': 'Berretto Mondiale',
  'rock-star': 'Rockstar', belle: 'Damigella', 'pop-star': 'Popstar', phd: 'Scienziata', libre: 'Wrestler', cosplay: 'Cosplay',
  black: 'Nera', white: 'Bianca', ash: 'di Ash', blade: 'Spada', shield: 'Scudo', sunny: 'Sole', rainy: 'Pioggia', snowy: 'Neve',
};
function formSuffix(name, baseSlug) {
  return name.startsWith(baseSlug + '-') ? name.slice(baseSlug.length + 1) : name.split('-').slice(1).join('-');
}
function formLabel(name, baseSlug = name.split('-')[0]) {
  if (/-mega-x$/.test(name)) return 'Mega X';
  if (/-mega-y$/.test(name)) return 'Mega Y';
  if (/-mega(-|$)/.test(name)) return 'Mega';
  if (/-gmax/.test(name)) return 'Gigamax';
  if (/-primal/.test(name)) return 'Archeo';
  const suf = formSuffix(name, baseSlug);
  const reg = !/-cap$/.test(suf) && suf.match(/^(alola|galar|hisui|paldea)(?:-(.+))?$/);
  if (reg) { const extra = reg[2] && reg[2] !== 'standard' ? FORM_WORD[reg[2]] ?? prettyName(reg[2]) : ''; return REGION_IT[reg[1]] + (extra ? ' · ' + extra : ''); }
  return FORM_WORD[suf] ?? suf.split('-').map(w => FORM_WORD[w] ?? prettyName(w)).join(' ');
}
function formName(base, name, baseSlug) {
  const l = formLabel(name, baseSlug);
  if (l.startsWith('Mega')) return `Mega ${base}${l.slice(4)}`;
  if (l === 'Gigamax') return `${base} Gigamax`;
  if (l === 'Archeo') return `Archeo${base}`;
  const reg = l.match(/^(Alola|Galar|Hisui|Paldea)(?: · (.+))?$/);
  if (reg) return `${base} di ${reg[1]}${reg[2] ? ` (${reg[2]})` : ''}`;
  return `${base} (${l})`;
}
// Icone delle forme, riprese dai giochi:
// base = Poké Ball (illustrazione Dream World), regionale = Mappa città, altre forme = Specchio Verità
// (sprite degli strumenti da PokéAPI); Mega e Gigamax = simboli disegnati come nei giochi.
const ITEM_ICON = n => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${n}.png`;
const FORM_ICON = {
  base: `<img class="fi" src="${ITEM_ICON('dream-world/poke-ball')}" alt="">`,
  reg: `<img class="fi pix" src="${ITEM_ICON('town-map')}" alt="">`,
  alt: `<img class="fi pix" src="${ITEM_ICON('reveal-glass')}" alt="">`,
  // Simbolo della Megaevoluzione: anello iridescente con la doppia elica al centro
  mega: '<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="mega-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f05aa6"/><stop offset=".35" stop-color="#f6a23a"/><stop offset=".65" stop-color="#5fc46d"/><stop offset="1" stop-color="#4b8fe0"/></linearGradient></defs><circle cx="12" cy="12" r="9.6" fill="#fff" stroke="url(#mega-g)" stroke-width="3.2"/><path d="M8.2 7.2c4.6 2.2 3 7.4 7.6 9.6M15.8 7.2c-4.6 2.2-3 7.4-7.6 9.6" fill="none" stroke="#6a3f9c" stroke-width="2.1" stroke-linecap="round"/><path d="M9.6 10.2h4.8M9.6 13.8h4.8" stroke="#6a3f9c" stroke-width="1.5" stroke-linecap="round"/></svg>',
  // Simbolo Gigamax (icona fornita, dai giochi)
  gmax: `<img class="fi" src="icons/gigamax.png" alt="">`,
};
// Simbolo di ogni regione (dai giochi); se manca, la Mappa città
const REGION_ICON = { galar: 'icons/galar.png' };
const regionOf = name => name.match(REGIONAL_FORM)?.[1] ?? null;
const formIcon = (kind, name) => kind === 'reg' && REGION_ICON[regionOf(name)]
  ? `<img class="fi" src="${REGION_ICON[regionOf(name)]}" alt="">` : FORM_ICON[kind];
const formKind = name => /-gmax/.test(name) ? 'gmax' : SPECIAL_FORM.test(name) ? 'mega' : REGIONAL_FORM.test(name) ? 'reg' : 'alt';

async function openDex(id, keepScroll = true, form = null) {
  renderCompendio(); // nasconde Abilità e Oggetti e riporta il selettore su Pokémon
  if (keepScroll && !$('dex-browse').hidden) dexState.scrollY = scrollY;
  const seq = ++state.dexSeq;
  const box = $('dex-detail');
  $('dex-browse').hidden = true;
  box.hidden = false;
  if (!form) { box.innerHTML = '<p class="empty">Carico la scheda…</p>'; scrollTo(0, 0); }
  else box.classList.add('switching');
  let base, p, s, extra;
  try {
    [base, s, extra] = await Promise.all([
      cached(`https://pokeapi.co/api/v2/pokemon/${id}`),
      cached(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
      loadExtra().catch(() => null),
    ]);
    const forms = (s.varieties ?? []).filter(v => !v.is_default);
    const chosen = form && forms.find(v => v.pokemon.name === form);
    p = chosen ? await cached(chosen.pokemon.url) : base;
  } catch {
    if (seq === state.dexSeq) box.innerHTML = '<p class="empty">Non riesco a caricare questa scheda. Controlla la connessione e riprova.</p>';
    return;
  }
  if (seq !== state.dexSeq) return;
  box.classList.remove('switching');
  extraData = extra || extraData;
  dexState.form = p === base ? null : p.name;
  box.innerHTML = '';
  box.append(dexHeader(p, s, id), dexAbout(p, s), dexStats(p), dexDefense(p));
  const evoSlot = document.createElement('section');
  evoSlot.className = 'dex-sec dex-evo';
  // Le forme speciali non hanno un elenco di mosse proprio: uso quello della forma base
  const cardSlot = document.createElement('section');
  cardSlot.className = 'dex-sec dex-cards';
  box.append(evoSlot, cardSlot, dexMoves(p.moves?.length ? p : base, extra));
  dexEvolution(s, evoSlot, seq);
  dexReveal(box);
  dexCards(id, itName(s.names, p.name), cardSlot, seq);
  dexAbilities(p, box.querySelector('[data-abilities]'), seq);
}

// Le sezioni sotto la testata compaiono scorrendo; le barre delle statistiche si riempiono da sinistra
function dexReveal(box) {
  if (!window.gsap || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      gsap.to(e.target, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' });
      const bars = e.target.querySelectorAll('.stat-bar i');
      if (bars.length) gsap.from(bars, { width: 0, duration: .9, ease: 'power3.out', stagger: .07, delay: .15 });
      const nums = e.target.querySelectorAll('.stat-row b');
      nums.forEach((b, i) => {
        const v = parseInt(b.textContent);
        if (!v) return;
        const o = { n: 0 };
        gsap.to(o, { n: v, duration: .9, delay: .15 + i * .07, ease: 'power3.out', onUpdate: () => { b.textContent = Math.round(o.n); } });
      });
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  for (const sec of box.querySelectorAll(':scope > .dex-sec')) { gsap.set(sec, { opacity: 0, y: 30 }); io.observe(sec); }
}

function dexForms(s, id, current) {
  // Ordine: regionali, Mega, Gigamax, altre forme
  const order = { reg: 0, mega: 1, gmax: 2, alt: 3 };
  const forms = (s.varieties ?? []).filter(v => !v.is_default)
    .sort((a, b) => order[formKind(a.pokemon.name)] - order[formKind(b.pokemon.name)]);
  if (!forms.length) return null;
  const bar = document.createElement('div');
  bar.className = 'dex-forms';
  const all = [{ name: null, label: 'Base', kind: 'base' }, ...forms.map(v => ({ name: v.pokemon.name, label: formLabel(v.pokemon.name, s.name), kind: formKind(v.pokemon.name) }))];
  for (const f of all) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'form-btn';
    b.dataset.kind = f.kind;
    b.innerHTML = formIcon(f.kind, f.name ?? '') + `<span>${esc(f.label)}</span>`;
    b.setAttribute('aria-pressed', String((current ?? null) === f.name));
    b.onclick = () => { if ((current ?? null) !== f.name) openDex(id, false, f.name); };
    bar.append(b);
  }
  return bar;
}

function dexHeader(p, s, id = p.id) {
  const types = p.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name).filter(t => TYPE_BY_ID[t]);
  const baseName = itName(s.names, p.name);
  const name = p.is_default ? baseName : formName(baseName, p.name, s.name);
  const enBase = s.names?.find(n => n.language.name === 'en')?.name || '';
  const en = p.is_default ? enBase : '';
  const info = dexInfo(p, s);
  const head = document.createElement('section');
  head.className = 'dex-head';

  const nav = document.createElement('div');
  nav.className = 'dex-nav';
  const back = Object.assign(document.createElement('button'), { type: 'button', className: 'btn ghost small', textContent: '← Elenco' });
  back.onclick = () => { location.hash = 'pokedex'; };
  const prev = Object.assign(document.createElement('button'), { type: 'button', className: 'btn ghost small', textContent: '‹', title: 'Precedente' });
  const next = Object.assign(document.createElement('button'), { type: 'button', className: 'btn ghost small', textContent: '›', title: 'Successivo' });
  prev.setAttribute('aria-label', 'Pokémon precedente');
  next.setAttribute('aria-label', 'Pokémon successivo');
  prev.disabled = id <= 1;
  next.disabled = id >= 1025;
  prev.onclick = () => { location.hash = `dex/${id - 1}`; };
  next.onclick = () => { location.hash = `dex/${id + 1}`; };
  nav.append(back, Object.assign(document.createElement('span'), { className: 'dex-nav-gap' }), prev, next);

  const art = dexArt(p, name, s.gender_rate);

  const txt = document.createElement('div');
  txt.className = 'dex-title';
  txt.innerHTML = `<p class="dex">Nº ${String(id).padStart(4, '0')}${info.gen ? ` · Gen ${info.gen} · ${REGIONS[info.gen]}` : ''}</p>`;
  const h = Object.assign(document.createElement('h2'), { textContent: name });
  const cry = dexCry(p, name);
  if (cry) { const row = document.createElement('div'); row.className = 'dex-name-row'; row.append(h, cry); txt.append(row); }
  else txt.append(h);
  const enEl = enLine(name, en, 'p');
  if (enEl) txt.append(enEl);
  if (info.genus) txt.append(Object.assign(document.createElement('p'), { className: 'dex-genus', textContent: info.genus }));
  const ty = document.createElement('div');
  ty.className = 'mon-types';
  types.forEach(t => ty.append(badge(t)));
  txt.append(ty);
  const fb = dexForms(s, id, p.is_default ? null : p.name);
  if (fb) txt.append(fb);
  if (info.flavor) txt.append(Object.assign(document.createElement('p'), { className: 'dex-flavor', textContent: info.flavor }));

  head.append(nav, art, txt);
  head.dataset.types = types.join(' ');
  return head;
}

// Verso del Pokémon (PokéAPI): pulsante con l'altoparlante accanto al nome; se esiste anche il verso
// dei giochi vecchi, una seconda pillola "Classico". Un solo audio alla volta, onde animate mentre suona.
let cryAudio = null;
function dexCry(p, name) {
  const c = p.cries ?? {};
  if (!c.latest && !c.legacy) return null;
  const wrap = document.createElement('div');
  wrap.className = 'dex-cry';
  const make = (src, label, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', `${label}: verso di ${name}`);
    b.title = label;
    // Verso moderno: altoparlante classico; verso dei giochi vecchi: altoparlante a pixel
    b.innerHTML = cls === 'cry-alt'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path class="spk" d="M3 9h4v6H3zM7 7h2v10H7zM9 5h2v14H9z"/><path class="w1 px" d="M14 9h2v6h-2z"/><path class="w2 px" d="M18 6h2v12h-2z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path class="w1" d="M15.2 9.2a4 4 0 0 1 0 5.6"/><path class="w2" d="M17.8 6.8a7.4 7.4 0 0 1 0 10.4"/></svg>';
    b.onclick = () => {
      if (cryAudio) { cryAudio.pause(); cryAudio.btn?.classList.remove('playing'); }
      const a = cryAudio = new Audio(src);
      a.volume = .5;
      a.btn = b;
      b.classList.add('playing');
      const stop = () => b.classList.remove('playing');
      a.onended = stop; a.onerror = stop; a.onpause = stop;
      a.play().catch(stop);
    };
    return b;
  };
  wrap.append(make(c.latest || c.legacy, 'Ascolta il verso', 'cry-btn'));
  if (c.latest && c.legacy) wrap.append(make(c.legacy, 'Verso classico (giochi vecchi)', 'cry-alt'));
  return wrap;
}

// Al clic sul Pokémon: la sua animazione vera dei giochi (lo sprite animato di Pokémon Showdown, preso dai
// giochi Nero/Bianco e successivi), sopra l'immagine per qualche secondo; poi si torna all'immagine scelta.
// Se il Pokémon non ha uno sprite animato non succede nulla oltre al verso.
function dexAnimate(p, frame) {
  const sd = p.sprites?.other?.showdown ?? {};
  const src = (dexState.shiny && sd.front_shiny) || sd.front_default;
  if (!src || frame.querySelector('.dex-live')) return;
  const live = Object.assign(document.createElement('img'), { className: 'dex-live', alt: '' });
  live.onload = () => {
    const F = frame.clientWidth || 280;
    const k = Math.min(3, (F * .8) / Math.max(live.naturalWidth, live.naturalHeight));
    live.style.width = Math.round(live.naturalWidth * k) + 'px';
    frame.classList.add('live');
    clearTimeout(frame.liveT);
    frame.liveT = setTimeout(() => { frame.classList.remove('live'); setTimeout(() => live.remove(), 300); }, 4000);
  };
  live.onerror = () => live.remove();
  live.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now(); // riparte dall'inizio
  frame.append(live);
}

function dexAbout(p, s) {
  const sec = document.createElement('section');
  sec.className = 'dex-sec dex-about';
  const info = dexInfo(p, s);
  const female = s.gender_rate < 0 ? null : s.gender_rate / 8 * 100;
  const rows = [
    ['Altezza', `${fmtNum(info.height)} m`],
    ['Peso', `${fmtNum(info.weight)} kg`],
    ['Abilità', '<span data-abilities>…</span>'],
    ['Genere', female === null ? 'Senza genere' : female === 0 ? 'Solo maschi' : female === 100 ? 'Solo femmine' : `♂ ${fmtNum(100 - female)}% · ♀ ${fmtNum(female)}%`],
    ['Tasso di cattura', String(s.capture_rate)],
    ['Gruppi uova', esc((s.egg_groups ?? []).map(g => EGG_GROUP[g.name] ?? g.name).join(', ') || '—')],
    ['Schiusa', s.hatch_counter != null ? `${s.hatch_counter} cicli` : '—'],
    ['Crescita', GROWTH[s.growth_rate?.name] ?? '—'],
  ];
  sec.innerHTML = `<h3>Informazioni</h3><dl class="dex-info">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  return sec;
}

async function dexAbilities(p, el, seq) {
  if (!el) return;
  try {
    const list = await Promise.all(p.abilities.sort((a, b) => a.slot - b.slot).map(async a => {
      const d = await cached(a.ability.url);
      const fl = (d.flavor_text_entries ?? []).filter(f => f.language.name === 'it');
      return { slug: a.ability.name, name: itName(d.names, a.ability.name), hidden: a.is_hidden, desc: fl.length ? fl[fl.length - 1].flavor_text.replace(/\s+/g, ' ') : '' };
    }));
    if (seq !== state.dexSeq) return;
    el.innerHTML = '';
    list.forEach((a, i) => {
      // Il nome porta alla pagina dell'abilità (compendio.js)
      const span = document.createElement('a');
      span.href = `#abilita/${encodeURIComponent(a.slug)}`;
      span.className = 'dex-ability' + (a.hidden ? ' hidden-ab' : '');
      span.textContent = a.name + (a.hidden ? ' (nascosta)' : '');
      if (a.desc) span.title = a.desc;
      el.append(span);
      if (i < list.length - 1) el.append(', ');
    });
  } catch { el.textContent = p.abilities.map(a => prettyName(a.ability.name)).join(', '); }
}

function dexStats(p) {
  const sec = document.createElement('section');
  sec.className = 'dex-sec';
  const vals = Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat]));
  const total = Object.values(vals).reduce((a, b) => a + b, 0);
  const tone = v => v < 50 ? 'low' : v < 80 ? 'mid' : v < 100 ? 'good' : v < 130 ? 'high' : 'top';
  sec.className = 'dex-sec dex-stat-sec';
  sec.setAttribute('aria-label', 'Statistiche base');
  sec.innerHTML = `<div class="dex-stats">${DEX_STAT.map(([k, label]) =>
    `<div class="stat-row"><span class="stat-k">${label}</span><b>${vals[k] ?? '—'}</b><span class="stat-bar"><i data-tone="${tone(vals[k] ?? 0)}" style="width:${Math.min(100, (vals[k] ?? 0) / 200 * 100)}%"></i></span></div>`).join('')}
    <div class="stat-row total"><span class="stat-k">Totale</span><b>${total}</b><span></span></div></div>`;
  return sec;
}

function dexDefense(p) {
  const sec = document.createElement('section');
  sec.className = 'dex-sec';
  const types = p.types.map(t => t.type.name).filter(t => TYPE_BY_ID[t]);
  sec.className = 'dex-sec dex-def';
  sec.innerHTML = '<h3>Danno subito</h3>';
  sec.append(matchRows(defensiveChart(types), types.length > 1 ? [4, 2, 0.5, 0.25, 0] : [2, 0.5, 0], DEF_WORDS));
  return sec;
}

/* ---------- Immagine della scheda: viste, sesso, misure uniformi ---------- */

const VIEW_ICON = {
  anim: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor"/></svg>',
  art: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3-6.5 6.5H4v-3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2.5 14h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  shiny: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.6 4.3 4.4.2-3.4 2.8 1.2 4.3L8 10.6 4.2 13.1l1.2-4.3L2 6l4.4-.2z" fill="currentColor"/></svg>',
  pixel: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="currentColor"/></svg>',
};
// Viste: [chiave, etichetta, sorgenti {m, f, sm, sf} (normale/femmina e cromatiche), pixel?]
const VIEWS = [
  ['art', 'Artwork', sp => {
    const a = sp.other?.['official-artwork'] ?? {};
    return { m: a.front_default, f: null, sm: a.front_shiny, sf: null };
  }, false],
  ['anim', 'Animato', sp => {
    const d = sp.other?.showdown ?? {};
    return { m: d.front_default, f: d.front_female, sm: d.front_shiny, sf: d.front_shiny_female };
  }, true],
  ['pixel', 'Sprite', sp => {
    const bw = sp.versions?.['generation-v']?.['black-white'];
    const src = bw?.front_default ? bw : sp;
    return { m: src.front_default, f: src.front_female, sm: src.front_shiny, sf: src.front_shiny_female };
  }, true],
];
// Simbolo "cromatico" dei giochi: stella scintillante a quattro punte con una più piccola accanto
const SHINY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2.5c.6 4.4 2.4 6.2 6.8 6.8-4.4.6-6.2 2.4-6.8 6.8-.6-4.4-2.4-6.2-6.8-6.8 4.4-.6 6.2-2.4 6.8-6.8z" fill="currentColor"/><path d="M17.6 13.4c.3 2.2 1.2 3.1 3.4 3.4-2.2.3-3.1 1.2-3.4 3.4-.3-2.2-1.2-3.1-3.4-3.4 2.2-.3 3.1-1.2 3.4-3.4z" fill="currentColor"/></svg>';

// Riquadro occupato davvero dal Pokémon (pixel non trasparenti), per mostrare tutte le viste
// alla stessa grandezza. Gli sprite arrivano da GitHub con CORS, quindi i pixel sono leggibili.
const bboxCache = new Map();
function spriteBox(src) {
  if (bboxCache.has(src)) return bboxCache.get(src);
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      const w = im.naturalWidth, h = im.naturalHeight;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      try {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, w, h).data;
        for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
          if (d[(y * w + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      } catch { x0 = 0; y0 = 0; x1 = w; y1 = h; }
      if (x1 < x0) { x0 = 0; y0 = 0; x1 = w; y1 = h; }
      res({ w, h, x0, y0, x1: x1 + 1, y1: y1 + 1, im });
    };
    im.onerror = rej;
    im.src = src;
  });
  bboxCache.set(src, p);
  return p;
}

// Bordo da adesivo (solo tema retrò) disegnato su canvas. Il contorno si basa solo sui pixel
// ben visibili (alfa > 110): così i puntini semi-trasparenti che alcuni artwork hanno intorno
// al Pokémon non diventano macchie. Quei puntini vengono anche ripuliti dall'immagine.
function stickerCanvas(im, k) {
  const w = im.naturalWidth, h = im.naturalHeight;
  const rc = 3 / k, ri = 4.3 / k, pad = Math.ceil(ri + 2);
  const W = w + 2 * pad, H = h + 2 * pad;
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const sx = src.getContext('2d', { willReadFrequently: true });
  sx.drawImage(im, 0, 0);
  const data = sx.getImageData(0, 0, w, h), d = data.data;
  const mask = new ImageData(w, h), md = mask.data;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] < 28) d[i] = 0;
    md[i] = d[i] > 110 ? 255 : 0;
  }
  sx.putImageData(data, 0, 0);
  const m = document.createElement('canvas');
  m.width = w; m.height = h;
  m.getContext('2d').putImageData(mask, 0, 0);
  const ring = (r, color) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const steps = Math.max(16, Math.ceil(r * 6));
    for (let i = 0; i < steps; i++) { const a = i / steps * Math.PI * 2; x.drawImage(m, pad + Math.cos(a) * r, pad + Math.sin(a) * r); }
    x.drawImage(m, pad, pad);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, W, H);
    return c;
  };
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const o = out.getContext('2d');
  o.drawImage(ring(ri, '#221d19'), 0, 0);
  o.drawImage(ring(rc, '#fbf8f2'), 0, 0);
  o.drawImage(src, pad, pad);
  return { canvas: out, pad };
}
const stickerMode = () => getComputedStyle(document.documentElement).getPropertyValue('--dex-sticker').trim() === '1';

// Cromatico = adesivo olografico: sotto il mouse l'artwork si inclina verso il puntatore e tre strati
// (arcobaleno, brillantini, riflesso) scorrono sopra, ritagliati sulla sua sagoma. Idea ripresa da
// simeydotme/pokemon-cards-css (GPL-3.0), codice scritto da zero. Prototipo: progetto-logo/prototipo-olografico.html
function holoShot(shot, maskUrl) {
  const el = document.createElement('div');
  el.className = shot.className + ' holo';
  Object.assign(el.style, { width: shot.style.width, left: shot.style.left, top: shot.style.top });
  el.style.setProperty('--holo-mask', `url("${maskUrl}")`);
  shot.className = '';
  shot.removeAttribute('style');
  el.innerHTML = '<i class="holo-shadow" aria-hidden="true"></i>';
  el.append(shot);
  el.insertAdjacentHTML('beforeend', '<i class="holo-foil" aria-hidden="true"></i><i class="holo-glare" aria-hidden="true"></i>');
  return el;
}

// Molla a passo fisso (come il logo in theme.js): --hx, --hy inseguono il puntatore dentro `hit`,
// --ho è l'intensità. Leggermente sotto-smorzata: all'uscita il riflesso torna al centro con un
// piccolo assestamento. Il ciclo gira solo mentre qualcosa si muove. Restituisce la funzione che
// dice quale immagine animare (null = nessuna: l'immagine non è cromatica).
function holoTilt(hit) {
  const S = { el: null, x: .5, y: .5, o: 0, vx: 0, vy: 0, vo: 0, tx: .5, ty: .5, to: 0, raf: 0, last: 0, acc: 0 };
  const K = 140, C = 2 * Math.sqrt(K) * .72, KO = 90, CO = 2 * Math.sqrt(KO) * .9, DT = 1 / 240;
  const write = () => {
    if (!S.el) return;
    S.el.style.setProperty('--hx', S.x.toFixed(4));
    S.el.style.setProperty('--hy', S.y.toFixed(4));
    S.el.style.setProperty('--ho', Math.max(0, S.o).toFixed(4));
  };
  const step = now => {
    S.acc += Math.min(.05, (now - S.last) / 1000);
    S.last = now;
    while (S.acc >= DT) {
      S.vx += (K * (S.tx - S.x) - C * S.vx) * DT; S.x += S.vx * DT;
      S.vy += (K * (S.ty - S.y) - C * S.vy) * DT; S.y += S.vy * DT;
      S.vo += (KO * (S.to - S.o) - CO * S.vo) * DT; S.o += S.vo * DT;
      S.acc -= DT;
    }
    write();
    const still = Math.abs(S.tx - S.x) + Math.abs(S.ty - S.y) + Math.abs(S.to - S.o) < 1e-3
      && Math.abs(S.vx) + Math.abs(S.vy) + Math.abs(S.vo) < 1e-3;
    S.raf = still ? 0 : requestAnimationFrame(step);
  };
  const kick = () => { if (!S.raf) { S.last = performance.now(); S.acc = 0; S.raf = requestAnimationFrame(step); } };
  hit.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !S.el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = hit.getBoundingClientRect();
    S.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    S.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    S.to = 1;
    kick();
  });
  hit.addEventListener('pointerleave', () => { S.tx = .5; S.ty = .5; S.to = 0; kick(); });
  return el => {
    S.el = el;
    if (!el) { S.x = S.y = S.tx = S.ty = .5; S.o = S.to = S.vx = S.vy = S.vo = 0; }
    write(); // la nuova immagine parte dallo stato del momento (il mouse può essere già sopra)
  };
}

const SHINY_SVG = '<svg class="shiny-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z"/><path d="M17.5 13c.35 2.1 1.4 3.15 3.5 3.5-2.1.35-3.15 1.4-3.5 3.5-.35-2.1-1.4-3.15-3.5-3.5 2.1-.35 3.15-1.4 3.5-3.5z"/></svg>';

function dexArt(p, name, genderRate) {
  const sp = p.sprites ?? {};
  const views = VIEWS.map(([key, label, get, pix]) => ({ key, label, pix, ...get(sp) })).filter(v => v.m);
  // Pulsanti ♂ ♀ tolti (versione essenziale): si mostra sempre il maschio, o l'unico sesso disponibile
  const hasFemale = false;
  const hasShiny = views.some(v => v.sm);
  if (!hasFemale) dexState.female = false;

  const art = document.createElement('div');
  art.className = 'dex-art';
  const frame = document.createElement('div');
  frame.className = 'dex-frame';
  // Un clic sul Pokémon gli fa emettere il verso (con il balzo)
  frame.title = 'Ascolta il verso';
  frame.onclick = () => { document.querySelector('.dex-head .cry-btn')?.click(); dexAnimate(p, frame); };
  // Riquadro + simbolo cromatico in alto a destra
  const stagebox = document.createElement('div');
  stagebox.className = 'dex-stagebox';
  stagebox.append(frame);
  const setHolo = holoTilt(stagebox);
  const vbar = document.createElement('div');
  vbar.className = 'dex-views';
  // Cerchietto cromatico
  const tbar = document.createElement('div');
  tbar.className = 'dex-gender';
  art.append(stagebox, vbar, tbar);

  let token = 0;
  const show = async () => {
    // Se la vista preferita non esiste per questo Pokémon ne uso un'altra, senza cambiare la preferenza.
    const pref = views.find(x => x.key === dexState.view) ?? views[0];
    // La femmina spesso esiste solo in alcune viste (l'artwork non la distingue mai):
    // in quel caso mostro la prima vista che ce l'ha, senza cambiare la preferenza.
    const femOf = x => dexState.shiny && x.sm ? x.sf : x.f;
    const v = dexState.female && !femOf(pref) ? views.find(femOf) ?? pref : pref;
    const shiny = dexState.shiny && !!v.sm;
    const femSrc = shiny ? v.sf : v.f;
    const fem = dexState.female && !!femSrc;
    const src = shiny ? (fem ? v.sf : v.sm) : (fem ? v.f : v.m);
    [...vbar.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v.key)));
    tbar.querySelectorAll('[data-g]').forEach(b => {
      const isF = b.dataset.g === 'f';
      b.setAttribute('aria-pressed', String(isF === fem));
      b.disabled = isF && !views.some(femOf);
      b.title = b.disabled ? 'Nessuna immagine femminile per questa versione' : (isF ? 'Femmina' : 'Maschio');
    });
    const sb = tbar.querySelector('.shiny-toggle');
    if (sb) {
      sb.setAttribute('aria-pressed', String(shiny));
      sb.disabled = !v.sm;
      sb.title = !v.sm ? 'Nessuna versione cromatica in questa vista' : shiny ? 'Mostra i colori normali' : 'Mostra la versione cromatica';
    }
    const my = ++token;
    let box;
    try { box = await spriteBox(src); } catch { box = null; }
    if (my !== token) return;
    // Il Pokémon occupa sempre circa l'80% del riquadro, qualunque sia la vista
    const F = frame.clientWidth || 200, target = F * .8;
    const img = document.createElement('img');
    img.alt = `${name} (${v.label.toLowerCase()}${shiny ? ', cromatico' : ''}${fem ? ', femmina' : ''})`;
    img.className = 'dex-shot' + (v.pix ? ' pix' : '');
    // Le GIF animate hanno la tela già grande quanto l'intera animazione: misuro la tela.
    if (box && /\.gif$/.test(src)) box = { ...box, x0: 0, y0: 0, x1: box.w, y1: box.h };
    if (box) {
      const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
      let k = target / Math.max(bw, bh);
      // Le GIF sono piccole: oltre ~2,5× si vede la bassa risoluzione, quindi mi fermo lì
      if (/\.gif$/.test(src)) k = Math.min(k, 2.5);
      // Valori a pixel interi: niente ricampionamento che sfoca l'immagine
      const w = Math.round(box.w * k);
      k = w / box.w;
      img.style.width = w + 'px';
      img.style.left = Math.round(F / 2 - (box.x0 + bw / 2) * k) + 'px';
      img.style.top = Math.round(F / 2 - (box.y0 + bh / 2) * k) + 'px';
    } else {
      Object.assign(img.style, { width: '100%', left: '0', top: '0' });
    }
    img.src = src;
    await img.decode().catch(() => {});
    if (my !== token) return;
    // Tema retrò: l'artwork diventa un adesivo con bordo carta e filetto d'inchiostro
    let shot = img;
    if (box?.im && !v.pix && !/\.gif$/.test(src) && stickerMode()) {
      try {
        const k = parseFloat(img.style.width) / box.w;
        const { canvas, pad } = stickerCanvas(box.im, k);
        canvas.className = img.className;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', img.alt);
        canvas.style.width = Math.round(canvas.width * k) + 'px';
        canvas.style.left = Math.round(parseFloat(img.style.left) - pad * k) + 'px';
        canvas.style.top = Math.round(parseFloat(img.style.top) - pad * k) + 'px';
        shot = canvas;
      } catch { /* resta l'immagine semplice */ }
    }
    // Cromatico: adesivo olografico (non sugli sprite in pixel né sulle GIF)
    if (shiny && !v.pix && !/\.gif$/.test(src)) {
      try { shot = holoShot(shot, shot.tagName === 'CANVAS' ? shot.toDataURL() : src); } catch { /* resta senza effetto */ }
    }
    setHolo(shot.classList.contains('holo') ? shot : null);
    const old = [...frame.querySelectorAll('.dex-shot')];
    frame.append(shot);
    requestAnimationFrame(() => {
      shot.classList.add('in');
      old.forEach(o => { o.classList.remove('in'); setTimeout(() => o.remove(), 400); });
    });
  };

  views.forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hist-btn view-btn';
    b.dataset.view = v.key;
    b.innerHTML = VIEW_ICON[v.key] + `<span>${v.label}</span>`;
    b.onclick = () => { dexState.view = v.key; store.set('dex-view2', v.key); show(); };
    vbar.append(b);
  });
  if (hasFemale) {
    [['m', '♂', 'Maschio'], ['f', '♀', 'Femmina']].forEach(([g, sym, label]) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'gender-btn', textContent: sym });
      b.setAttribute('aria-label', label);
      b.dataset.g = g;
      b.onclick = () => { dexState.female = g === 'f'; show(); };
      tbar.append(b);
    });
  }
  if (hasShiny) {
    // Cromatico: pillola con le due stelline della Gen 9 disegnate in SVG (sempre visibili, niente immagini esterne)
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shiny-toggle';
    b.innerHTML = SHINY_SVG;
    b.setAttribute('aria-label', 'Cromatico');
    b.onclick = () => { dexState.shiny = !dexState.shiny; store.set('dex-shiny', dexState.shiny); show(); };
    tbar.append(b);
  }
  if (!tbar.childElementCount) tbar.remove();
  setTimeout(show); // dopo l'inserimento nella pagina
  return art;
}

/* ---------- Carte del GCC (TCGdex) ---------- */
// Tutte le carte reali con questo Pokémon (per numero del Pokédex): in italiano quando esistono,
// altrimenti l'edizione inglese. 18 subito, le altre su richiesta.
// Un clic apre la carta grande con espansione, rarità e illustratore.
const TCG = 'https://api.tcgdex.net/v2';
async function dexCards(id, name, sec, seq) {
  sec.innerHTML = '<h3>Carte</h3><p class="empty">Carico le carte…</p>';
  let it, en, sets;
  try {
    [it, en, sets] = await Promise.all([
      cached(`${TCG}/it/cards?dexId=eq:${id}`).catch(() => []),
      cached(`${TCG}/en/cards?dexId=eq:${id}`),
      cached(`${TCG}/en/sets`).catch(() => []),
    ]);
  } catch {
    if (seq === state.dexSeq) sec.querySelector('.empty').textContent = 'Non riesco a caricare le carte. Controlla la connessione.';
    return;
  }
  if (seq !== state.dexSeq) return;
  // Ordine delle espansioni come in TCGdex (dalla più vecchia): la posizione serve per ordinare
  const setPos = new Map(sets.map((x, i) => [x.id, i]));
  const setOf = cid => cid.slice(0, cid.lastIndexOf('-'));
  const byId = new Map();
  for (const c of en) if (c.image) byId.set(c.id, { ...c, lang: 'en' });
  for (const c of it) if (c.image) byId.set(c.id, { ...c, lang: 'it' });
  // Prima una carta per ogni espansione (dalla più recente), poi le seconde, e così via:
  // in cima si vede la varietà invece di 18 carte della stessa espansione
  const sorted = [...byId.values()].sort((a, b) => (setPos.get(setOf(b.id)) ?? -1) - (setPos.get(setOf(a.id)) ?? -1) || parseInt(a.localId) - parseInt(b.localId));
  const nth = new Map();
  sorted.forEach(c => { const k = setOf(c.id); c.round = nth.get(k) ?? 0; nth.set(k, c.round + 1); });
  const cards = sorted.map((c, i) => [c, i]).sort((x, y) => x[0].round - y[0].round || x[1] - y[1]).map(x => x[0]);
  const nIt = cards.filter(c => c.lang === 'it').length;
  sec.innerHTML = '<h3>Carte</h3>';
  if (!cards.length) { sec.insertAdjacentHTML('beforeend', `<p class="empty">Nessuna carta trovata per ${esc(name)}.</p>`); return; }
  const grid = document.createElement('div');
  grid.className = 'tcg-grid';
  const add = list => list.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tcg-card';
    b.title = `${c.name} · ${c.lang === 'it' ? 'italiano' : 'inglese'}`;
    const img = Object.assign(document.createElement('img'), { src: `${c.image}/low.webp`, alt: c.name, loading: 'lazy', decoding: 'async', width: 245, height: 342 });
    img.onerror = () => { b.remove(); };
    b.append(img);
    b.onclick = () => openCard(c);
    grid.append(b);
  });
  add(cards.slice(0, 18));
  sec.append(grid);
  if (cards.length > 18) {
    const more = Object.assign(document.createElement('button'), { type: 'button', className: 'btn ghost tcg-more', textContent: 'Mostra tutte le carte' });
    more.onclick = () => { add(cards.slice(18)); more.remove(); };
    sec.append(more);
  }
}

async function openCard(c) {
  let dlg = $('tcg-view');
  if (!dlg) {
    dlg = Object.assign(document.createElement('dialog'), { id: 'tcg-view', className: 'tcg-view' });
    // Niente riquadro né ×: la carta fluttua sullo sfondo scuro; si chiude cliccando fuori o con Esc
    dlg.innerHTML = '<div class="tcg-big"><div class="tcg-tilt"><div class="tcg-glare"></div></div></div><div class="tcg-info"></div>';
    dlg.addEventListener('click', e => { if (!e.target.closest('.tcg-tilt')) dlg.close(); });
    document.body.append(dlg);
    cardTilt(dlg.querySelector('.tcg-tilt'));
  }
  const big = dlg.querySelector('.tcg-tilt'), info = dlg.querySelector('.tcg-info');
  big.querySelector('img')?.remove();
  // Subito l'immagine piccola (già scaricata per la griglia), poi quella grande quando è pronta
  const img = Object.assign(document.createElement('img'), { src: `${c.image}/low.webp`, alt: c.name });
  const hi = new Image();
  hi.onload = () => { if (img.isConnected) img.src = hi.src; };
  hi.onerror = () => { hi.onerror = null; hi.src = `${c.image}/high.png`; };
  hi.src = `${c.image}/high.webp`;
  big.prepend(img);
  info.innerHTML = `<h3>${esc(c.name)}</h3><p class="hint">Carico i dettagli…</p>`;
  dlg.showModal();
  if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(big, { opacity: 0, scale: .8, rotateY: -25 }, { opacity: 1, scale: 1, rotateY: 0, duration: .55, ease: 'back.out(1.4)' });
    gsap.fromTo(info, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: .4, delay: .15, ease: 'power2.out' });
  }
  try {
    const d = await cached(`${TCG}/${c.lang}/cards/${c.id}`);
    if (!dlg.open || !big.contains(img)) return;
    const n = d.set?.cardCount?.official ? `${d.localId}/${d.set.cardCount.official}` : d.localId;
    const rows = [['Espansione', d.set?.name], ['Numero', n], ['Rarità', d.rarity], ['Illustratore', d.illustrator], ['Lingua', c.lang === 'it' ? 'Italiano' : 'Inglese (non uscita in italiano)']].filter(r => r[1]);
    info.innerHTML = `<h3>${esc(d.name)}</h3><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  } catch { info.querySelector('.hint').textContent = 'Dettagli non disponibili.'; }
}

// Carta in 3D: si inclina verso il puntatore (anche al tocco sul telefono), con un riflesso di luce;
// lasciata, torna dritta con una molla
function cardTilt(el) {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap;
  const move = e => {
    if (reduce()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    gsap.to(el, { rotateY: (x - .5) * 26, rotateX: (.5 - y) * 22, duration: .3, ease: 'power2.out', overwrite: 'auto' });
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    el.classList.add('lit');
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerdown', move);
  el.addEventListener('pointerleave', () => {
    el.classList.remove('lit');
    if (!reduce()) gsap.to(el, { rotateX: 0, rotateY: 0, duration: .8, ease: 'elastic.out(1, .5)', overwrite: 'auto' });
  });
}

/* ---------- Evoluzioni ---------- */

async function dexEvolution(s, sec, seq) {
  sec.innerHTML = '<h3>Evoluzioni</h3><p class="empty">Carico…</p>';
  try {
    const chain = (await cached(s.evolution_chain.url)).chain;
    if (seq !== state.dexSeq) return;
    if (!chain.evolves_to.length) { sec.remove(); return; } // senza evoluzioni la sezione non c'è
    const wrap = document.createElement('div');
    wrap.className = 'evo';
    const node = async (n) => {
      const id = idFromUrl(n.species.url);
      const col = document.createElement('div');
      col.className = 'evo-branch';
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'evo-mon' + (id === s.id ? ' current' : '');
      const name = monNames({ id, name: n.species.name }).it;
      card.innerHTML = `<img src="${DEX_SPRITE(id)}" alt="" width="72" height="72"><span>${esc(name)}</span>`;
      card.onclick = () => { location.hash = `dex/${id}`; };
      col.append(card);
      if (n.evolves_to.length) {
        const kids = document.createElement('div');
        kids.className = 'evo-kids' + (n.evolves_to.length > 3 ? ' many' : '');
        for (const k of n.evolves_to) {
          const step = document.createElement('div');
          step.className = 'evo-step';
          const how = document.createElement('span');
          how.className = 'evo-how';
          how.textContent = await evoText(k.evolution_details);
          step.append(how, await node(k));
          kids.append(step);
        }
        col.append(kids);
      }
      return col;
    };
    wrap.append(await node(chain));
    if (seq !== state.dexSeq) return;
    sec.innerHTML = '<h3>Evoluzioni</h3>';
    sec.append(wrap);
  } catch { sec.innerHTML = '<h3>Evoluzioni</h3><p class="empty">Non riesco a caricare le evoluzioni.</p>'; }
}

async function evoText(details) {
  // Più modi per evolversi (cambiano tra i giochi): preferisci lo strumento, poi il più recente.
  const d = details?.find(x => x.trigger?.name === 'use-item') || details?.[details.length - 1];
  if (!d) return '→';
  const item = async (ref) => { try { return itName((await cached(ref.url)).names, prettyName(ref.name)); } catch { return prettyName(ref.name); } };
  const parts = [];
  const trig = d.trigger?.name;
  if (trig === 'trade') parts.push('Scambio');
  if (trig === 'use-item' && d.item) parts.push(await item(d.item));
  if (d.min_level) parts.push(`Liv. ${d.min_level}`);
  else if (trig === 'level-up' && !d.min_happiness && !d.known_move && !d.known_move_type && !d.location && !d.min_affection) parts.push('Sale di livello');
  if (d.min_happiness) parts.push('Affetto alto');
  if (d.min_affection) parts.push('Affetto');
  if (d.held_item) parts.push(`tenendo ${await item(d.held_item)}`);
  if (d.known_move) parts.push(`conoscendo ${extraData?.moves.find(m => m.id === idFromUrl(d.known_move.url))?.name ?? prettyName(d.known_move.name)}`);
  if (d.known_move_type) parts.push(`con una mossa ${TYPE_BY_ID[d.known_move_type.name]?.it ?? ''}`);
  if (d.time_of_day === 'day') parts.push('di giorno');
  if (d.time_of_day === 'night') parts.push('di notte');
  if (d.location) parts.push('in un luogo speciale');
  if (d.needs_overworld_rain) parts.push('con la pioggia');
  if (d.gender === 1) parts.push('(femmina)');
  if (d.gender === 2) parts.push('(maschio)');
  if (!parts.length) parts.push('Condizione speciale');
  return parts.join(' · ');
}

/* ---------- Mosse ---------- */

function dexMoves(p, extra) {
  const sec = document.createElement('section');
  sec.className = 'dex-sec dex-moves';
  sec.innerHTML = '<h3>Mosse</h3>';
  if (!extra) { sec.innerHTML += '<p class="empty">Non riesco a caricare i dati delle mosse.</p>'; return sec; }
  const byId = new Map(extra.moves.map(m => [m.id, m]));
  // Tutte le mosse per version group e metodo
  const learn = [];
  for (const mv of p.moves) {
    const m = byId.get(idFromUrl(mv.move.url));
    if (!m) continue;
    for (const d of mv.version_group_details) {
      learn.push({ m, vg: idFromUrl(d.version_group.url), method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const vgs = [...new Set(learn.map(l => l.vg))].filter(v => VG_INDEX.has(v)).sort((a, b) => VG_INDEX.get(b) - VG_INDEX.get(a));
  if (!vgs.length) { sec.innerHTML += '<p class="empty">Nessuna mossa registrata.</p>'; return sec; }
  if (!vgs.includes(dexState.vg)) dexState.vg = vgs[0];

  const controls = document.createElement('div');
  controls.className = 'dex-move-controls';
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Gioco');
  vgs.forEach(v => sel.append(new Option(VGS[VG_INDEX.get(v)][2], v)));
  sel.value = dexState.vg;
  const methods = document.createElement('div');
  methods.className = 'dex-methods';
  const body = document.createElement('div');
  controls.append(sel, methods);
  sec.append(controls, body);

  const draw = () => {
    const rows = learn.filter(l => l.vg === dexState.vg);
    methods.innerHTML = '';
    for (const [k, label] of LEARN) {
      const n = new Set(rows.filter(r => r.method === k).map(r => r.m.id)).size;
      if (!n) continue;
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'hist-btn', textContent: label });
      b.setAttribute('aria-pressed', String(dexState.method === k));
      b.onclick = () => { dexState.method = k; draw(); };
      methods.append(b);
    }
    if (!rows.some(r => r.method === dexState.method)) {
      dexState.method = LEARN.find(([k]) => rows.some(r => r.method === k))?.[0] ?? 'level-up';
      return draw();
    }
    const seen = new Set();
    const list = rows.filter(r => r.method === dexState.method && !seen.has(r.m.id + ':' + r.level) && seen.add(r.m.id + ':' + r.level))
      .sort((a, b) => (dexState.method === 'level-up' ? a.level - b.level : 0) || a.m.name.localeCompare(b.m.name, 'it'));
    const lv = dexState.method === 'level-up';
    const table = document.createElement('table');
    table.className = 'moves dex-move-table';
    table.innerHTML = `<thead><tr>${lv ? '<th scope="col" class="lv">Liv.</th>' : ''}<th scope="col">Mossa</th><th scope="col" class="ty">Tipo</th><th scope="col" class="num">Pot.</th><th scope="col" class="num">Prec.</th></tr></thead>`;
    const tb = table.createTBody();
    for (const { m, level } of list) {
      const tr = tb.insertRow();
      if (lv) { const c = tr.insertCell(); c.className = 'lv'; c.textContent = level === 0 ? 'Evo' : level === 1 ? '1' : level; if (level === 0) c.title = 'Si impara evolvendosi'; }
      const cell = document.createElement('div');
      cell.className = 'move-name';
      const ic = document.createElement('span');
      ic.className = 'cls-ico';
      ic.title = CLS[m.cls]?.label ?? m.cls;
      ic.innerHTML = (CLS_ICON[m.cls] ?? '') + `<span class="sr-only">${ic.title}</span>`;
      const t = document.createElement('span');
      t.className = 'move-txt';
      t.append(Object.assign(document.createElement('span'), { className: 'move-it', textContent: m.name }));
      const e = enLine(m.name, m.en);
      if (e) t.append(e);
      cell.append(ic, t);
      tr.insertCell().append(cell);
      const tc = tr.insertCell();
      tc.className = 'ty';
      tc.append(icon(m.type));
      tc.title = TYPE_BY_ID[m.type].it;
      const pw = tr.insertCell(); pw.className = 'num'; pw.textContent = m.power || '—';
      const ac = tr.insertCell(); ac.className = 'num'; ac.textContent = m.acc ? m.acc + '%' : '—';
    }
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'moves-scroll';
    wrap.append(table);
    body.append(wrap);
  };
  sel.onchange = () => { dexState.vg = Number(sel.value); draw(); };
  draw();
  return sec;
}

/* ---------- Navigazione con l'hash (#dex/25) ---------- */

addEventListener('hashchange', () => {
  const m = location.hash.match(/^#dex\/(\d+)$/);
  if (m) {
    if (state.mode !== 'dex') setMode('dex');
    else openDex(Number(m[1]));
  } else if (state.mode === 'dex') {
    renderPokedex();
  } else if (cmpRoute().part !== 'mon') {
    setMode('dex');
  }
});
document.addEventListener('DOMContentLoaded', () => {
  if (/^#dex\/\d+$/.test(location.hash) && state.mode !== 'dex') setMode('dex');
});
