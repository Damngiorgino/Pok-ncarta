// Pokéncarta: quiz su Pokémon, quiz su singoli tipi e tabella.
// Richiede types.js (TYPES, TYPE_BY_ID, iconUrl, attackMultiplier, defensiveChart).

const MULTS = [
  { v: 4,    label: '×4' },
  { v: 2,    label: '×2' },
  { v: 0.5,  label: '×½' },
  { v: 0.25, label: '×¼' },
  { v: 0,    label: '×0' },
];
const LABEL = Object.fromEntries(MULTS.map(m => [m.v, m.label]));
const SINGLE = [2, 0.5, 0]; // con un solo tipo ×4 e ×¼ non esistono

const GENS = [
  [1, 151], [152, 251], [252, 386], [387, 493], [494, 649],
  [650, 721], [722, 809], [810, 905], [906, 1025],
];

const DIRS = [
  { id: 'def', label: 'Difesa (danno subito)' },
  { id: 'atk', label: 'Attacco (danno inflitto)' },
  { id: 'mix', label: 'Entrambe, a caso' },
];

const $ = id => document.getElementById(id);
// Testo sicuro da inserire in HTML (per i dati che arrivano da PokéAPI)
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const state = {
  mode: 'home',                        // 'home' | 'pokemon' | 'type' | 'chart' | 'coverage' | 'dex'
  quizKind: store.get('quiz-kind', 'pokemon'), // quiz scelto dentro la scheda Quiz
  brush: 2,
  answers: {},      // typeId -> moltiplicatore scelto (assente = ×1)
  q: null,          // domanda corrente (vedi pokemonQuestion / typeQuestion)
  checked: false,
  loadSeq: 0,       // per ignorare caricamenti superati da un cambio modalità
  sessions: { pokemon: null, type: null }, // domanda in corso per ciascun quiz
  covSeq: 0,
  dexSeq: 0,
  chartSeq: 0,
  covOpen: store.get('cov-open', {}), // moltiplicatore -> gruppo aperto/chiuso scelto dall'utente
  next: null,       // Promise del prossimo Pokémon precaricato
  lastType: null,
  gens: store.get('gens', [1, 2, 3, 4, 5, 6, 7, 8, 9]),
  dir: store.get('dir', 'mix'),
  picked: store.get('picked', ['fire']),
  cov: store.get('cov', ['fire', 'water', 'ice', 'bug']),
  covForms: store.get('cov-forms', false),
  covFinal: store.get('cov-final', false),
  covStatus: store.get('cov-status', false), // mostra anche le mosse di stato
  covMoveType: null,                         // tipo mostrato nell'elenco mosse
  chartForms: store.get('chart-forms', false),
  chartListOpen: false,
};

/* ---------- UI helpers ---------- */

function icon(typeId) {
  const t = TYPE_BY_ID[typeId];
  const span = document.createElement('span');
  span.className = 'ico';
  span.style.setProperty('--c', t.color);
  const img = document.createElement('img');
  img.src = iconUrl(typeId);
  img.alt = '';
  img.onerror = () => img.remove();
  span.append(img);
  return span;
}

function badge(typeId, tag = 'span') {
  const t = TYPE_BY_ID[typeId];
  const el = document.createElement(tag);
  el.className = 'badge';
  el.style.setProperty('--c', t.color);
  el.append(icon(typeId), t.it);
  return el;
}

// Righe "×2 [badge] [badge]…" per i moltiplicatori diversi da ×1.
function groupedRows(chart, values = MULTS.map(m => m.v)) {
  const wrap = document.createElement('div');
  wrap.className = 'answer';
  for (const v of values) {
    const list = TYPES.filter(t => chart[t.id] === v);
    if (!list.length) continue;
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.dataset.m = v;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = LABEL[v];
    const l = document.createElement('div');
    l.className = 'list';
    list.forEach(t => l.append(badge(t.id)));
    row.append(lbl, l);
    wrap.append(row);
  }
  return wrap;
}

/* ---------- Modalità ---------- */

function setMode(mode) {
  // La scheda "Quiz" riapre l'ultimo quiz scelto (Pokémon o Tipi).
  if (mode === 'quiz') mode = state.quizKind;
  // Conserva la domanda in corso del quiz che si sta lasciando.
  if (isQuiz(state.mode) && state.q) {
    state.sessions[state.mode] = { q: state.q, answers: state.answers, checked: state.checked };
  }
  state.mode = mode;
  store.set('mode', mode);
  const quiz = isQuiz(mode);
  if (quiz) { state.quizKind = mode; store.set('quiz-kind', mode); }
  for (const b of document.querySelectorAll('.tabs [data-mode]')) {
    if (b.dataset.mode === mode || (quiz && b.dataset.mode === 'quiz')) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  for (const b of document.querySelectorAll('.quiz-switch [data-quiz]')) b.setAttribute('aria-pressed', String(b.dataset.quiz === mode));
  $('home-view').hidden = mode !== 'home';
  $('quiz-view').hidden = !quiz;
  $('chart-view').hidden = mode !== 'chart';
  $('coverage-view').hidden = mode !== 'coverage';
  $('dex-view').hidden = mode !== 'dex';
  $('regions-view').hidden = mode !== 'regions';
  if (quiz) {
    $('set-gens').hidden = mode !== 'pokemon';
    $('set-dir').hidden = mode !== 'type';
    const saved = state.sessions[mode];
    if (saved) restoreSession(saved);
    else loadNext();
  } else {
    state.loadSeq++;
    if (mode === 'home') renderHome();
    else if (mode === 'chart') renderChartView();
    else if (mode === 'coverage') renderCoverage();
    else if (mode === 'regions') renderRegions();
    else renderPokedex();
  }
}

const isQuiz = mode => mode === 'pokemon' || mode === 'type';

function restoreSession({ q, answers, checked }) {
  state.loadSeq++; // annulla eventuali caricamenti in corso
  resetQuizUI();
  showQuestion(q);
  state.answers = { ...answers };
  Object.keys(state.answers).forEach(paintTile);
  if (checked) check(false);
}

/* ---------- Quiz: UI ---------- */

function renderBrushes(values) {
  const row = $('brushes');
  row.innerHTML = '';
  row.style.setProperty('--n', values.length);
  values.forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'brush';
    b.dataset.m = v;
    b.title = `Assegna ${LABEL[v]} (tasto ${i + 1})`;
    b.innerHTML = `<span class="dot"></span>${LABEL[v]}`;
    b.setAttribute('aria-keyshortcuts', String(i + 1));
    b.onclick = () => setBrush(v);
    row.append(b);
  });
  setBrush(values.includes(state.brush) ? state.brush : 2);
}

function setBrush(v) {
  state.brush = v;
  for (const b of $('brushes').children) {
    const on = Number(b.dataset.m) === v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

function renderGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  grid.classList.remove('dim');
  for (const t of TYPES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.type = t.id;
    b.style.setProperty('--c', t.color);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = t.it;
    const val = document.createElement('span');
    val.className = 'val';
    b.append(icon(t.id), name, val);
    b.onclick = () => toggleTile(t.id);
    grid.append(b);
  }
}

function paintTile(typeId) {
  const tile = $('grid').querySelector(`[data-type="${typeId}"]`);
  const v = state.answers[typeId];
  tile.classList.toggle('set', v !== undefined);
  if (v !== undefined) {
    tile.dataset.m = v;
    tile.querySelector('.val').textContent = LABEL[v];
  } else {
    delete tile.dataset.m;
  }
  tile.setAttribute('aria-label', `${TYPE_BY_ID[typeId].it}: ${v === undefined ? '×1' : LABEL[v]}`);
  $('grid').classList.toggle('dim', Object.keys(state.answers).length > 0);
}

function toggleTile(typeId) {
  if (state.checked || !state.q) return;
  if (state.answers[typeId] === state.brush) delete state.answers[typeId];
  else state.answers[typeId] = state.brush;
  paintTile(typeId);
}

/* ---------- Quiz: domande ---------- */

function randomId() {
  const gens = state.gens.length ? state.gens : [1];
  const total = gens.reduce((n, g) => n + GENS[g - 1][1] - GENS[g - 1][0] + 1, 0);
  let r = Math.floor(Math.random() * total);
  for (const g of gens) {
    const [a, b] = GENS[g - 1];
    const size = b - a + 1;
    if (r < size) return a + r;
    r -= size;
  }
}

async function fetchMon(id) {
  const [p, s] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => { if (!r.ok) throw r; return r.json(); }),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  const itName = s?.names?.find(n => n.language.name === 'it')?.name;
  const enName = s?.names?.find(n => n.language.name === 'en')?.name;
  const animated = p.sprites?.other?.showdown?.front_default;
  const art = p.sprites?.other?.['official-artwork']?.front_default;
  const sprite = animated || p.sprites?.front_default || art;
  if (!sprite) throw new Error('nessuno sprite');
  const mon = {
    id,
    name: itName || enName || p.name.charAt(0).toUpperCase() + p.name.slice(1),
    en: enName,
    types: p.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name).filter(t => TYPE_BY_ID[t]),
    sprite,
    art: sprite === art,
    ...dexInfo(p, s),
  };
  // Precarica l'immagine così appare subito.
  await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = sprite; });
  return mon;
}

// Voce del Pokédex in italiano (la più recente), categoria, generazione, altezza e peso.
function dexInfo(p, s) {
  // Italiano se c'è, altrimenti inglese (i Pokémon più recenti a volte non hanno la voce italiana).
  const entries = s?.flavor_text_entries ?? [];
  const pick = lang => entries.filter(f => f.language.name === lang).pop();
  const fl = pick('it') || pick('en');
  const flavor = fl ? fl.flavor_text.replace(/\s+/g, ' ').trim() : '';
  const genus = s?.genera?.find(g => g.language.name === 'it')?.genus ?? '';
  const gen = Number(s?.generation?.url?.split('/').filter(Boolean).pop()) || 0;
  return { flavor, genus, gen, height: p.height / 10, weight: p.weight / 10 };
}
const REGIONS = ['', 'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unima', 'Kalos', 'Alola', 'Galar', 'Paldea'];
const fmtNum = n => n.toLocaleString('it-IT', { maximumFractionDigits: 1 });

function prefetch() {
  state.next = fetchMon(randomId()).catch(() => null);
}

async function pokemonQuestion() {
  let mon = state.next ? await state.next : null;
  for (let tries = 0; !mon && tries < 3; tries++) {
    mon = await fetchMon(randomId()).catch(() => null);
  }
  if (!mon) return null;
  prefetch();
  return {
    kind: 'pokemon',
    title: mon.name,
    en: mon.en,
    info: mon,
    dex: `#${String(mon.id).padStart(4, '0')}`,
    types: mon.types,
    sprite: mon.sprite,
    art: mon.art,
    prompt: '', // i tipi sono già visibili: la domanda si capisce da sola
    gridLabel: 'Tipi attaccanti',
    brushes: MULTS.map(m => m.v),
    truth: defensiveChart(mon.types),
    perfect: `Hai indovinato tutte le debolezze e le resistenze di ${mon.name}.`,
  };
}

function typeQuestion() {
  let t;
  do t = TYPES[Math.floor(Math.random() * TYPES.length)]; while (t.id === state.lastType);
  state.lastType = t.id;
  const dir = state.dir === 'mix' ? (Math.random() < .5 ? 'def' : 'atk') : state.dir;
  const def = dir === 'def';
  return {
    kind: 'type',
    typeId: t.id,
    title: t.it,
    dex: def ? 'DIFESA · danno subito' : 'ATTACCO · danno inflitto',
    dir,
    types: [],
    prompt: def
      ? `Un Pokémon di tipo ${t.it}: quanto danno subisce da ogni tipo?`
      : `Una mossa di tipo ${t.it}: quanto danno fa a ogni tipo?`,
    gridLabel: def ? 'Tipi attaccanti' : 'Tipi in difesa',
    brushes: SINGLE,
    truth: def
      ? defensiveChart([t.id])
      : Object.fromEntries(TYPES.map(d => [d.id, attackMultiplier(t.id, d.id)])),
    perfect: def
      ? `Conosci tutte le debolezze e le resistenze del tipo ${t.it}.`
      : `Sai esattamente contro chi è efficace il tipo ${t.it}.`,
  };
}

function resetQuizUI() {
  state.checked = false;
  $('mon-name').textContent = 'Caricamento…';
  $('mon-en').textContent = '';
  $('dex').innerHTML = '&nbsp;';
  $('mon-types').innerHTML = '';
  $('prompt').textContent = '';
  state.answers = {};
  state.q = null;
  $('result').hidden = true;
  $('btn-check').textContent = 'Verifica';
  $('btn-check').dataset.state = 'check';
  $('btn-check').disabled = true;
  $('btn-skip').disabled = true;
  renderGrid();
}

async function loadNext() {
  const seq = ++state.loadSeq;
  const mode = state.mode;
  state.sessions[mode] = null;
  resetQuizUI();

  const img = $('sprite');
  if (mode === 'pokemon') {
    $('type-hero').hidden = true;
    img.hidden = false;
    img.classList.add('loading');
    $('spinner').classList.add('on');
  }

  const q = mode === 'pokemon' ? await pokemonQuestion() : typeQuestion();
  if (seq !== state.loadSeq) {
    // L'utente ha cambiato sezione durante il caricamento: tieni la domanda per quando torna.
    if (q && !state.sessions[mode]) state.sessions[mode] = { q, answers: {}, checked: false };
    return;
  }
  $('spinner').classList.remove('on');

  if (!q) {
    $('mon-name').textContent = 'Errore di rete';
    $('dex').textContent = 'Controlla la connessione e premi Salta';
    $('btn-skip').disabled = false;
    return;
  }
  showQuestion(q, true);
}

function showQuestion(q, animate = false) {
  state.q = q;
  const img = $('sprite');
  const hero = $('type-hero');
  $('spinner').classList.remove('on');
  if (q.kind === 'pokemon') {
    hero.hidden = true;
    img.hidden = false;
    img.onload = () => {
      // Gli sprite animati sono piccoli: ingranditi ×1.6 a pixel nitidi, entro il riquadro.
      img.style.width = Math.round(img.naturalWidth * (q.art ? 1 : 2.2)) + 'px';
    };
    img.style.width = '';
    img.src = q.sprite;
    img.alt = q.title;
    img.classList.toggle('art', q.art);
    requestAnimationFrame(() => img.classList.remove('loading'));
  } else {
    img.hidden = true;
    hero.hidden = false;
    hero.innerHTML = '';
    hero.append(icon(q.typeId));
    hero.dataset.dir = q.dir;
    hero.classList.remove('pop');
    if (animate) {
      void hero.offsetWidth;
      hero.classList.add('pop');
    }
  }

  $('dex').textContent = q.dex;
  $('mon-name').textContent = q.title;
  $('mon-en').textContent = sameName(q.title, q.en) ? '' : q.en;
  const types = $('mon-types');
  types.innerHTML = '';
  q.types.forEach(t => types.append(badge(t)));
  types.hidden = !q.types.length;
  $('prompt').textContent = q.prompt;
  $('prompt').hidden = !q.prompt;
  const side = $('mon-side');
  const info = q.info;
  side.hidden = !info;
  if (info) {
    $('mon-genus').textContent = info.genus;
    $('mon-flavor').textContent = info.flavor;
    $('mon-meta').textContent = [info.gen && `Gen ${info.gen} · ${REGIONS[info.gen]}`, `${fmtNum(info.height)} m`, `${fmtNum(info.weight)} kg`].filter(Boolean).join(' · ');
  }
  $('grid').setAttribute('aria-label', q.gridLabel);
  renderBrushes(q.brushes);
  $('btn-check').disabled = false;
  $('btn-skip').disabled = false;
}

/* ---------- Quiz: verifica ---------- */

// fresh = false quando si ripristina una domanda già corretta (niente focus né scroll).
function check(fresh = true) {
  const { truth } = state.q;
  const issues = [];

  for (const t of TYPES) {
    const tile = $('grid').querySelector(`[data-type="${t.id}"]`);
    tile.classList.add('locked');
    const want = truth[t.id];
    const got = state.answers[t.id] ?? 1;
    if (want === 1 && got === 1) continue;

    let cls;
    if (want === got) cls = 'ok';
    else if (got === 1) { cls = 'miss'; issues.push(`<b>${t.it}</b>: dimenticato, è ${LABEL[want]}`); }
    else if (want === 1) { cls = 'extra'; issues.push(`<b>${t.it}</b>: hai messo ${LABEL[got]}, ma è neutro (×1)`); }
    else { cls = 'bad'; issues.push(`<b>${t.it}</b>: hai messo ${LABEL[got]}, è ${LABEL[want]}`); }
    tile.classList.add(cls);

    if (cls !== 'ok') {
      const fix = document.createElement('span');
      fix.className = 'fix';
      fix.textContent = LABEL[want] ?? '×1';
      tile.append(fix);
    }
  }

  const perfect = issues.length === 0;
  const res = $('result');
  res.className = 'result' + (perfect ? '' : ' fail');
  res.innerHTML = perfect
    ? `<h3>Perfetto!</h3><p>${state.q.perfect}</p>`
    // Niente elenco di frasi: gli errori si leggono nella griglia (valore giusto in verde accanto al tuo, barrato);
    // qui solo quanti sono e, sotto, la risposta giusta raggruppata
    : `<h3>${issues.length === 1 ? 'Quasi! Un errore' : `${issues.length} errori`}</h3><p class="result-hint">Nella griglia, accanto a ogni errore, c'è in verde il valore giusto. Ecco la risposta completa:</p>`;
  res.append(groupedRows(truth));
  res.hidden = false;

  state.checked = true;
  $('btn-check').textContent = 'Prossimo';
  $('btn-check').dataset.state = 'next';
  if (fresh) {
    $('btn-check').focus({ preventScroll: true });
    res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ---------- Tabella ---------- */

function renderChartView() {
  renderPicker();
  renderCalc();
  if (!$('matrix').rows.length) renderMatrix();
  paintMatrixSelection();
}

function renderPicker() {
  const box = $('picker');
  box.innerHTML = '';
  for (const t of TYPES) {
    const b = badge(t.id, 'button');
    b.type = 'button';
    b.classList.add('pick');
    b.setAttribute('aria-pressed', String(state.picked.includes(t.id)));
    b.onclick = () => togglePick(t.id);
    box.append(b);
  }
}

function togglePick(id) {
  const p = state.picked;
  if (p.includes(id)) state.picked = p.filter(x => x !== id);
  else state.picked = p.length < 2 ? [...p, id] : [p[0], id];
  store.set('picked', state.picked);
  renderPicker();
  animateCalc(renderCalc);
  paintMatrixSelection();
}

function renderCalc() {
  const out = $('calc-out');
  out.innerHTML = '';
  const p = state.picked;
  if (!p.length) {
    out.innerHTML = '<p class="empty">Seleziona un tipo per vedere debolezze, resistenze e contro chi è efficace.</p>';
    return;
  }
  const names = p.map(id => TYPE_BY_ID[id].it).join(' / ');
  const def = defensiveChart(p);
  const defVals = p.length > 1 ? [4, 2, 0.5, 0.25, 0] : [2, 0.5, 0];

  const defCol = calcColumn('Difesa', `Danno subito da un Pokémon ${names}`, [matchRows(def, defVals, DEF_WORDS, 'd')]);

  const atkCol = calcColumn('Attacco', p.length > 1 ? 'Danno inflitto dalle mosse di ciascun tipo' : `Danno inflitto da una mossa ${names}`,
    p.map(id => {
      const rows = matchRows(Object.fromEntries(TYPES.map(d => [d.id, attackMultiplier(id, d.id)])), SINGLE, ATK_WORDS, 'a-' + id);
      if (p.length === 1) return rows;
      const box = document.createElement('div');
      box.className = 'calc-sub';
      const h = document.createElement('div');
      h.className = 'calc-sub-head';
      h.dataset.flipId = 'h-' + id;
      h.append(badge(id), Object.assign(document.createElement('span'), { textContent: 'come mossa' }));
      box.append(h, rows);
      return box;
    }));

  out.append(defCol, atkCol, chartMonList(p, names));
}

/* Risultati del calcolatore animati con GSAP Flip, al cambio dei tipi scelti:
   - i badge già presenti scivolano nella nuova riga (×2 → ×4, ×½ → ×0…): si vede dove è finito ogni tipo;
   - quelli nuovi compaiono uno dopo l'altro, dall'alto in basso;
   - quelli che spariscono si dissolvono dove erano (le scritte prima dei badge);
   - le colonne cambiano altezza insieme al contenuto; le righe "nessuno" sfumano.
   Una nuova scelta a metà animazione riparte dalle posizioni e opacità del momento.
   Senza GSAP, con prefers-reduced-motion o durante il cambio di tema/stile è immediato.
   Prototipo: progetto-logo/prototipo-risultati-calcolo.html */
const calcFx = window.gsap && window.Flip ? (gsap.registerPlugin(Flip), { tl: null, ghosts: new Set() }) : null;

function animateCalc(update) {
  const out = $('calc-out');
  const html = document.documentElement;
  if (!calcFx || matchMedia('(prefers-reduced-motion: reduce)').matches
    || html.classList.contains('vt-pix') || html.classList.contains('vt-style')) { update(); return; }

  const old = [...out.querySelectorAll('[data-flip-id]')];
  // Anche l'opacità: un badge interrotto mentre compariva riparte da com'era, senza scatti
  const flipState = Flip.getState(old, { props: 'opacity' });
  const oldPos = new Map(old.map(el => { const r = el.getBoundingClientRect(); return [el.dataset.flipId, [r.left, r.top]]; }));
  // Tutto ciò che potrebbe uscire (badge, etichette, intestazioni dei sotto-blocchi):
  // posizione relativa alla colonna e opacità del momento
  const cols = [...out.querySelectorAll('.calc-col')];
  const snap = [...out.querySelectorAll('.calc-col [data-flip-id]')].map(el => {
    const r = el.getBoundingClientRect(), c = el.closest('.calc-col').getBoundingClientRect();
    const row = el.closest('.calc-row');
    return { id: el.dataset.flipId, el, row, col: cols.indexOf(el.closest('.calc-col')), x: r.left - c.left, y: r.top - c.top,
      op: getComputedStyle(el).opacity * (row ? getComputedStyle(row).opacity : 1) };
  });
  const colH = cols.map(c => c.offsetHeight);
  const colBox = cols.map(c => [c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight]);
  const outH = out.offsetHeight;
  // I fantasmi ancora in dissolvenza passano nelle colonne nuove e finiscono la loro uscita
  const ghostCols = [...calcFx.ghosts].map(g => cols.indexOf(g.parentNode));
  const rowOp = new Map([...out.querySelectorAll('.calc-row[data-row]')].map(r => [r.dataset.row, +getComputedStyle(r).opacity]));

  if (calcFx.tl) { calcFx.tl.kill(); calcFx.tl = null; }
  gsap.killTweensOf(out);

  update();

  const now = [...out.querySelectorAll('[data-flip-id]')];
  const ids = new Set(now.map(el => el.dataset.flipId));
  const newCols = [...out.querySelectorAll('.calc-col')];
  [...calcFx.ghosts].forEach((g, i) => {
    if (ghostCols[i] === -1 && g.classList.contains('calc-col')) out.append(g); // colonna intera in uscita
    else if (newCols[ghostCols[i]]) newCols[ghostCols[i]].append(g);
    else { gsap.killTweensOf(g); g.remove(); calcFx.ghosts.delete(g); }
  });
  const ghosts = snap.filter(s => !ids.has(s.id) && newCols[s.col]).map(s => {
    // Il clone esce dentro un guscio con classe e data-m della sua riga, così l'etichetta ×4
    // tiene la sua pillola colorata e la parola "nessuno" resta com'era
    const c = s.el.cloneNode(true);
    c.removeAttribute('data-flip-id');
    Object.assign(c.style, { transform: '', opacity: '' });
    const g = document.createElement('div');
    if (s.row) { g.className = s.row.className; g.dataset.m = s.row.dataset.m; }
    g.dataset.ghost = '';
    g.setAttribute('aria-hidden', 'true');
    Object.assign(g.style, { position: 'absolute', left: s.x + 'px', top: s.y + 'px', display: 'block', margin: 0, padding: 0, border: 0,
      opacity: s.op, pointerEvents: 'none', transformOrigin: '0 50%' });
    g.append(c);
    newCols[s.col].append(g);
    calcFx.ghosts.add(g);
    return g;
  });
  // Tolto l'ultimo tipo: le colonne intere svaniscono dove erano mentre compare il messaggio
  if (cols.length && !newCols.length) {
    cols.forEach((c, i) => {
      gsap.killTweensOf(c);
      const [x, y, w, h] = colBox[i];
      Object.assign(c.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', margin: 0, pointerEvents: 'none' });
      c.setAttribute('aria-hidden', 'true');
      out.append(c);
      calcFx.ghosts.add(c);
      gsap.to(c, { opacity: 0, duration: .22, ease: 'sine.in', onComplete: () => { c.remove(); calcFx.ghosts.delete(c); } });
    });
    const msg = out.querySelector('.empty');
    if (msg) gsap.from(msg, { opacity: 0, duration: .2, delay: .08, ease: 'power1.out', clearProps: 'opacity' });
  }

  // Le scritte (×4, "Molto debole"…) escono più in fretta dei badge: non si sovrappongono a quelle che arrivano
  ghosts.forEach((g, i) => {
    const text = !g.firstChild.classList.contains('badge') && !g.querySelector('.badge');
    gsap.to(g, {
      opacity: 0, scale: text ? 1 : .8, duration: text ? .14 : .22, ease: 'sine.in', delay: text ? 0 : Math.min(.08, i * .01),
      onComplete: () => { g.remove(); calcFx.ghosts.delete(g); },
    });
  });

  // Righe che cambiano stato "nessuno": sfumano dall'opacità del momento a quella del CSS
  for (const r of out.querySelectorAll('.calc-row[data-row]')) {
    const was = rowOp.get(r.dataset.row);
    if (was !== undefined && Math.abs(was - getComputedStyle(r).opacity) > .01) gsap.from(r, { opacity: was, duration: .25, ease: 'power1.out', clearProps: 'opacity' });
  }

  // Durata secondo il tragitto più lungo (badge o bordo delle colonne):
  // niente deve schizzare, al massimo ~25 px per fotogramma a metà corsa
  let far = 0;
  for (const el of now) {
    const p = oldPos.get(el.dataset.flipId);
    if (p) { const r = el.getBoundingClientRect(); far = Math.max(far, Math.hypot(r.left - p[0], r.top - p[1])); }
  }
  const toH = newCols.map(c => c.offsetHeight); // misurate tutte prima di fissarne una
  toH.forEach((h, i) => { if (colH[i] !== undefined) far = Math.max(far, Math.abs(h - colH[i])); });
  // Da nessun tipo a uno (o viceversa) si apre/chiude tutto il riquadro dei risultati
  const outTo = !cols.length !== !newCols.length ? out.offsetHeight : null;
  if (outTo !== null) far = Math.max(far, Math.abs(outTo - outH));
  const dur = Math.min(.6, Math.max(.3, far / 850));
  if (outTo !== null && Math.abs(outTo - outH) >= 1) {
    gsap.fromTo(out, { height: outH, overflow: 'clip' }, { height: outTo, duration: dur, ease: 'sine.inOut', clearProps: 'height,overflow' });
  }

  // Le colonne cambiano altezza insieme al contenuto; durante il cambio tagliano ciò che sporge
  toH.forEach((to, i) => {
    const from = colH[i];
    if (from === undefined || Math.abs(from - to) < 1) return;
    gsap.fromTo(newCols[i], { height: from, overflow: 'clip' }, { height: to, duration: dur, ease: 'sine.inOut', clearProps: 'height,overflow' });
  });

  calcFx.tl = Flip.from(flipState, {
    targets: now,
    duration: dur,
    ease: 'sine.inOut',
    simple: true,
    scale: true,
    zIndex: 2, // chi cambia riga passa sopra gli altri, non sotto
    // I nuovi entrano dopo che i vecchi hanno iniziato a muoversi, dall'alto in basso
    onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .82, y: 5 }, {
      opacity: 1, scale: 1, y: 0, duration: .26, ease: 'power2.out', delay: .07,
      stagger: { amount: Math.min(.34, els.length * .022) }, clearProps: 'opacity,transform',
    }),
    onComplete: () => { calcFx.tl = null; },
  });
}

const DEF_WORDS = { 4: 'Molto debole', 2: 'Debole', 0.5: 'Resiste', 0.25: 'Resiste molto', 0: 'Immune' };
const ATK_WORDS = { 2: 'Superefficace', 0.5: 'Poco efficace', 0: 'Nessun effetto' };

function calcColumn(title, sub, bodies) {
  const col = document.createElement('section');
  col.className = 'calc-block calc-col';
  col.innerHTML = `<h3>${title}</h3><p class="sub">${sub}</p>`;
  bodies.forEach(b => col.append(b));
  return col;
}

// Righe sempre presenti (anche vuote) così le colonne restano allineate.
// Con `key` (calcolatore della Tabella) righe, etichette e badge hanno un data-flip-id:
// animateCalc riconosce lo stesso tipo prima e dopo il ridisegno anche se ha cambiato riga.
function matchRows(chart, values, words, key) {
  const wrap = document.createElement('div');
  wrap.className = 'calc-rows';
  for (const v of values) {
    const list = TYPES.filter(t => chart[t.id] === v);
    const row = document.createElement('div');
    row.className = 'calc-row' + (list.length ? '' : ' none');
    row.dataset.m = v;
    row.innerHTML = `<span class="lbl">${LABEL[v]}</span><span class="word">${words[v]}</span>`;
    if (key) {
      row.dataset.row = `${key}-${v}`;
      row.querySelector('.lbl').dataset.flipId = `${key}-l${v}`;
      row.querySelector('.word').dataset.flipId = `${key}-w${v}`;
    }
    const l = document.createElement('div');
    l.className = 'list';
    if (list.length) list.forEach(t => { const b = badge(t.id); if (key) b.dataset.flipId = `${key}-${t.id}`; l.append(b); });
    else l.innerHTML = '<span class="dash">nessuno</span>';
    row.append(l);
    wrap.append(row);
  }
  return wrap;
}

// Elenco (a scomparsa) dei Pokémon con i tipi scelti nella Tabella.
function chartMonList(picked, names) {
  const det = document.createElement('details');
  det.className = 'calc-block calc-mons';
  det.open = state.chartListOpen;
  const sum = document.createElement('summary');
  sum.innerHTML = `<h3>Pokémon ${picked.length === 1 ? 'di tipo' : ''} ${names}</h3><span class="sub" data-count>…</span>`;
  const opts = document.createElement('label');
  opts.className = 'cov-forms';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = state.chartForms;
  cb.onchange = () => { state.chartForms = cb.checked; store.set('chart-forms', cb.checked); renderCalc(); };
  opts.append(cb, ' Includi forme alternative');
  const body = document.createElement('div');
  det.append(sum, opts, body);

  const seq = ++state.chartSeq;
  Promise.all([loadDex(), softExtra()]).then(([dex]) => {
    if (seq !== state.chartSeq) return;
    dexReady = true;
    const has = m => picked.every(t => m.types.includes(t));
    const list = filterDex(dex, { forms: state.chartForms }).filter(has);
    // Con un solo tipo: prima i monotipo, poi i doppi tipi.
    if (picked.length === 1) list.sort((a, b) => a.types.length - b.types.length || a.id - b.id);
    sum.querySelector('[data-count]').textContent = list.length ? `${list.length} Pokémon` : 'nessuno';
    const fill = () => {
      if (body.childElementCount) return;
      if (!list.length) { body.innerHTML = '<p class="empty">Nessun Pokémon ha questa combinazione di tipi.</p>'; return; }
      const grid = document.createElement('div');
      grid.className = 'cov-list';
      list.forEach(m => grid.append(monCard(m)));
      body.append(grid);
    };
    if (det.open) fill();
    det.addEventListener('toggle', () => { state.chartListOpen = det.open; if (det.open) fill(); });
  }).catch(() => {
    if (seq === state.chartSeq) sum.querySelector('[data-count]').textContent = 'errore di rete';
  });
  return det;
}

function renderMatrix() {
  const table = $('matrix');
  const head = table.createTHead().insertRow();
  const corner = document.createElement('th');
  corner.className = 'corner';
  corner.innerHTML = '<span>ATT ↓</span><span>DIF →</span>';
  head.append(corner);
  TYPES.forEach((t, c) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'col-h';
    th.dataset.c = c;
    th.title = `${t.it} (in difesa)`;
    th.append(icon(t.id));
    makeButton(th, `Mostra ${t.it}`, () => selectOnly(t.id));
    head.append(th);
  });

  const body = table.createTBody();
  TYPES.forEach((a, r) => {
    const tr = body.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.className = 'row-h';
    th.dataset.r = r;
    th.append(icon(a.id), Object.assign(document.createElement('span'), { textContent: a.it }));
    makeButton(th, `Mostra ${a.it}`, () => selectOnly(a.id));
    tr.append(th);
    TYPES.forEach((d, c) => {
      const m = attackMultiplier(a.id, d.id);
      const td = tr.insertCell();
      td.dataset.r = r;
      td.dataset.c = c;
      if (m !== 1) {
        td.dataset.m = m;
        td.textContent = m === 0.5 ? '½' : String(m);
      }
      td.title = `${a.it} → ${d.it}: ${LABEL[m] ?? '×1'}`;
    });
  });

  // Evidenzia riga e colonna sotto il puntatore.
  let last = null;
  table.addEventListener('pointerover', e => {
    const cell = e.target.closest('td, th');
    const key = cell ? `${cell.dataset.r}|${cell.dataset.c}` : null;
    if (key === last) return;
    last = key;
    table.querySelectorAll('.hl').forEach(x => x.classList.remove('hl'));
    if (!cell) return;
    const { r, c } = cell.dataset;
    if (r !== undefined) table.querySelectorAll(`[data-r="${r}"]`).forEach(x => x.classList.add('hl'));
    if (c !== undefined) table.querySelectorAll(`[data-c="${c}"]`).forEach(x => x.classList.add('hl'));
  });
  table.addEventListener('pointerleave', () => {
    last = null;
    table.querySelectorAll('.hl').forEach(x => x.classList.remove('hl'));
  });
}

// Rende una cella d'intestazione cliccabile anche da tastiera.
function makeButton(el, label, fn) {
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', label);
  el.onclick = fn;
  el.onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };
}

function paintMatrixSelection() {
  const table = $('matrix');
  table.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
  for (const id of state.picked) {
    const i = TYPES.findIndex(t => t.id === id);
    table.querySelectorAll(`[data-r="${i}"], [data-c="${i}"]`).forEach(x => x.classList.add('sel'));
  }
}

function selectOnly(id) {
  state.picked = [id];
  store.set('picked', state.picked);
  renderPicker();
  animateCalc(renderCalc);
  paintMatrixSelection();
  document.querySelector('.calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Dati extra: evoluzioni e mosse (GraphQL PokéAPI) ---------- */

const EXTRA_KEY = 'extra-v10';
let extraPromise = null;

// Regola: un Pokémon è "completamente evoluto" se esiste almeno un gioco in cui
// non può evolversi. In pratica: tutte le sue evoluzioni sono uscite in una
// generazione successiva alla sua (es. Golbat in Gen 1, prima di Crobat).
// Le forme regionali contano dalla generazione della loro regione.
const FORM_GEN = [[/-alola/, 7], [/-galar/, 8], [/-hisui/, 8], [/-paldea/, 9], [/white-striped/, 8]];
// Evoluzioni arrivate con un DLC nella stessa generazione: nel gioco base erano finali.
const FINAL_EXCEPTIONS = new Set([
  1011, // Dipplin → Hydrapple (Scarlatto/Violetto: Il disco indaco)
]);

function loadExtra() {
  if (extraPromise) return extraPromise;
  const cached = store.get(EXTRA_KEY, null);
  if (cached && Date.now() - cached.t < 7 * 864e5) return (extraPromise = Promise.resolve(unpackExtra(cached)));
  const query = `{
    s: pokemon_v2_pokemonspecies { id generation_id evolves_from_species_id }
    f: pokemon_v2_pokemon(where: {id: {_gt: 10000}}) { id pokemon_species_id }
    m: pokemon_v2_move(where: {pokemon_v2_pokemonmoves: {}}) {
      id name power accuracy priority pp generation_id move_effect_chance
      ch: pokemon_v2_movechanges { version_group_id power accuracy pp type_id move_effect_chance }
      t: pokemon_v2_type { name }
      p: pokemon_v2_movemeta {
        ailment_chance flinch_chance stat_chance drain healing crit_rate min_hits max_hits
        a: pokemon_v2_movemetaailment { name }
        c: pokemon_v2_movemetacategory { name }
      }
      sc: pokemon_v2_movemetastatchanges { change s: pokemon_v2_stat { name } }
      tg: pokemon_v2_movetarget { name }
      ft: pokemon_v2_moveflavortexts(where: {language_id: {_eq: 8}, flavor_text: {_nilike: "%farla dimenticare%"}}, order_by: {version_group_id: desc}, limit: 1) { flavor_text }
      fe: pokemon_v2_moveflavortexts(where: {language_id: {_eq: 9}, flavor_text: {_nilike: "%this move is forgotten%"}}, order_by: {version_group_id: desc}, limit: 1) { flavor_text }
      c: pokemon_v2_movedamageclass { name }
      n: pokemon_v2_movenames(where: {language_id: {_in: [8, 9]}}) { language_id name }
    }
    sn: pokemon_v2_pokemonspeciesname(where: {language_id: {_in: [8, 9]}}) { pokemon_species_id language_id name }
    fn: pokemon_v2_pokemonformname(where: {language_id: {_eq: 9}, pokemon_name: {_neq: ""}}) {
      pokemon_name pokemon_v2_pokemonform { pokemon_id }
    }
  }`;
  extraPromise = fetch('https://beta.pokeapi.co/graphql/v1beta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then(r => { if (!r.ok) throw r; return r.json(); }).then(({ data }) => {
    const lang = (list, id) => list.find(n => n.language_id === id)?.name;
    const spNames = new Map();
    for (const x of data.sn) {
      const e = spNames.get(x.pokemon_species_id) ?? ['', ''];
      e[x.language_id === 8 ? 0 : 1] = x.name;
      spNames.set(x.pokemon_species_id, e);
    }
    const packed = {
      t: Date.now(),
      names: [...spNames].map(([id, [it, en]]) => [id, it, en]),
      formNames: data.fn.map(x => [x.pokemon_v2_pokemonform.pokemon_id, x.pokemon_name]),
      species: data.s.map(x => [x.id, x.generation_id, x.evolves_from_species_id]),
      forms: data.f.map(x => [x.id, x.pokemon_species_id]),
      moves: data.m.filter(x => TYPE_BY_ID[x.t?.name]).map(x => [
        x.id, lang(x.n, 8) || lang(x.n, 9) || prettyName(x.name), lang(x.n, 9) || prettyName(x.name),
        x.t.name, x.c?.name ?? 'status', x.power, x.accuracy,
        moveTags(x), (x.ft[0]?.flavor_text ?? x.fe[0]?.flavor_text ?? '').replace(/\s+/g, ' ').trim(),
        [x.generation_id, x.pp, x.move_effect_chance,
          x.ch.map(c => [c.version_group_id, c.power, c.accuracy, c.pp, c.type_id, c.move_effect_chance])],
      ]),
    };
    store.set(EXTRA_KEY, packed);
    return unpackExtra(packed);
  }).catch(err => { extraPromise = null; throw err; });
  return extraPromise;
}

function unpackExtra(p) {
  const gen = new Map(p.species.map(([id, g]) => [id, g]));
  const firstEvoGen = new Map(); // specie -> generazione della sua prima evoluzione
  for (const [id, g, from] of p.species) {
    if (from != null) firstEvoGen.set(from, Math.min(firstEvoGen.get(from) ?? Infinity, g));
  }
  return {
    gen,
    firstEvoGen,
    formSpecies: new Map(p.forms),
    names: new Map(p.names.map(([id, it, en]) => [id, { it, en }])),
    formNames: new Map(p.formNames),
    moves: p.moves.map(([id, name, en, type, cls, power, acc, tags, desc, hist]) => ({ id, name, en, type, cls, power, acc, tags, desc, hist })),
  };
}

let extraData = null; // dati extra già caricati (per i nomi), o null
const softExtra = () => loadExtra().then(x => (extraData = x)).catch(() => null);

// Nome italiano e inglese di un Pokémon o di una sua forma.
function monNames(mon) {
  const x = extraData;
  if (!x) return { it: prettyName(mon.name), en: '' };
  if (mon.id <= 10000) {
    const n = x.names.get(mon.id);
    return n ? { it: n.it || n.en, en: n.en } : { it: prettyName(mon.name), en: '' };
  }
  const en = x.formNames.get(mon.id);
  const sp = x.names.get(x.formSpecies.get(mon.id));
  if (!en) return { it: prettyName(mon.name), en: '' };
  let it = sp && sp.it && sp.en ? en.replace(sp.en, sp.it) : en;
  it = it
    .replace(/^Alolan (.+)$/, '$1 di Alola')
    .replace(/^Galarian (.+)$/, '$1 di Galar')
    .replace(/^Hisuian (.+)$/, '$1 di Hisui')
    .replace(/^Paldean (.+)$/, '$1 di Paldea')
    .replace(/^Gigantamax (.+)$/, '$1 Gigamax')
    .replace('Combat Breed', 'Razza Combattiva')
    .replace('Blaze Breed', 'Razza Infuocata')
    .replace('Aqua Breed', 'Razza Acquatica');
  return { it, en };
}

// Mostra il nome inglese (più piccolo e grigio) solo se diverso da quello italiano.
const sameName = (a, b) => !b || a.localeCompare(b, 'it', { sensitivity: 'base' }) === 0;
function enLine(it, en, tag = 'span') {
  if (sameName(it, en)) return null;
  const el = document.createElement(tag);
  el.className = 'en-name';
  el.lang = 'en';
  el.textContent = en;
  return el;
}

// Icona categoria (simboli dei giochi ridisegnati puliti, scelti da prototipo-simboli.html, famiglia 5):
// fisica = stella d'urto, speciale = cerchi concentrici, stato = cerchio diviso a metà.
const CLS_ICON = window.POKENCARTA_CLS_ICON || {
  physical: '<svg viewBox="0 0 32 20" aria-hidden="true"><rect width="32" height="20" rx="6" fill="#d23a24"/><path d="M16.00 2.40L17.05 6.77L20.47 3.85L18.75 8.00L23.23 7.65L19.40 10.00L23.23 12.35L18.75 12.00L20.47 16.15L17.05 13.23L16.00 17.60L14.95 13.23L11.53 16.15L13.25 12.00L8.77 12.35L12.60 10.00L8.77 7.65L13.25 8.00L11.53 3.85L14.95 6.77Z" fill="#ffb02e"/><circle cx="16" cy="10" r="2.6" fill="#ffe9a8"/></svg>',
  special: '<svg viewBox="0 0 32 20" aria-hidden="true"><rect width="32" height="20" rx="6" fill="#3d4a6b"/><circle cx="16" cy="10" r="6.6" fill="none" stroke="#86aef5" stroke-width="2.2"/><circle cx="16" cy="10" r="3.4" fill="none" stroke="#c7d9ff" stroke-width="2.2"/><circle cx="16" cy="10" r="1.2" fill="#fff"/></svg>',
  status: '<svg viewBox="0 0 32 20" aria-hidden="true"><rect width="32" height="20" rx="6" fill="#8c8790"/><circle cx="16" cy="10" r="6.4" fill="#fbf8f2"/><path d="M16 3.6a6.4 6.4 0 0 1 0 12.8 3.2 3.2 0 0 1 0-6.4 3.2 3.2 0 0 0 0-6.4z" fill="#2c2833"/><circle cx="16" cy="6.8" r="1" fill="#2c2833"/><circle cx="16" cy="13.2" r="1" fill="#fbf8f2"/></svg>',
};

function isFinal(mon, extra) {
  const species = mon.id > 10000 ? extra.formSpecies.get(mon.id) : mon.id;
  const evoGen = extra.firstEvoGen.get(species);
  if (evoGen === undefined || FINAL_EXCEPTIONS.has(species)) return true;
  const ownGen = FORM_GEN.find(([re]) => re.test(mon.name))?.[1] ?? extra.gen.get(species);
  return evoGen > ownGen;
}

function filterDex(dex, { forms = false, finalOnly = false, extra = null } = {}) {
  return dex.filter(m => (forms || m.id <= 10000) && (!finalOnly || isFinal(m, extra)));
}

/* ---------- Effetti secondari delle mosse (riassunto in etichette) ---------- */

const AILMENT = {
  burn: 'Scottatura', paralysis: 'Paralisi', freeze: 'Congelamento', poison: 'Avvelenamento',
  sleep: 'Sonno', confusion: 'Confusione', infatuation: 'Infatuazione', trap: 'Intrappola',
  nightmare: 'Incubo', torment: 'Attaccalite', disable: 'Inibizione', yawn: 'Sbadiglio',
  'heal-block': 'Anticura', 'leech-seed': 'Parassiseme', embargo: 'Divieto', 'perish-song': 'Ultimocanto',
  ingrain: 'Radicamento', silence: 'Silenzio', 'tar-shot': 'Catrame',
};
const BAD_POISON = new Set(['toxic', 'poison-fang', 'malignant-chain']);
// PokéAPI usa "unknown" per effetti diversi: qui il nome giusto per ciascuna mossa.
const UNKNOWN_AILMENT = { 'tri-attack': 'Stato casuale', 'smack-down': 'Atterra', 'thousand-arrows': 'Atterra', telekinesis: 'Fa levitare' };
const STAT = {
  attack: 'Att', defense: 'Dif', 'special-attack': 'AttSp', 'special-defense': 'DifSp',
  speed: 'Vel', accuracy: 'Prec', evasion: 'Elus',
};
const pct = n => (n > 0 && n < 100 ? ` ${n}%` : '');
// Effetti che PokéAPI non descrive nei dati strutturati.
const NAMED_FX = [
  ['Cambio', ['u-turn', 'volt-switch', 'flip-turn', 'parting-shot', 'teleport', 'baton-pass', 'chilly-reception', 'shed-tail']],
  ['Ricarica', ['hyper-beam', 'giga-impact', 'blast-burn', 'frenzy-plant', 'hydro-cannon', 'rock-wrecker', 'roar-of-time', 'prismatic-laser', 'eternabeam', 'meteor-assault']],
  ['2 turni', ['solar-beam', 'solar-blade', 'sky-attack', 'skull-bash', 'razor-wind', 'fly', 'dig', 'dive', 'bounce', 'phantom-force', 'shadow-force', 'freeze-shock', 'ice-burn', 'geomancy', 'meteor-beam', 'electro-shot', 'sky-drop']],
];

// Da dati PokéAPI a etichette brevi: [testo, tipo] con tipo = ail | up | down | info.
function moveTags(x) {
  const out = [];
  const m = x.p?.[0];
  if (x.priority) out.push([`Priorità ${x.priority > 0 ? '+' : '−'}${Math.abs(x.priority)}`, 'info']);
  for (const [label, names] of NAMED_FX) if (names.includes(x.name)) out.push([label, 'info']);
  if (m) {
    const ail = m.a?.name;
    if (ail && ail !== 'none') {
      const label = ail === 'unknown' ? UNKNOWN_AILMENT[x.name]
        : ail === 'poison' && BAD_POISON.has(x.name) ? 'Iperveleno' : (AILMENT[ail] ?? ail);
      if (label) out.push([label + pct(m.ailment_chance), 'ail']);
    }
    if (m.flinch_chance) out.push(['Tentennamento' + pct(m.flinch_chance), 'ail']);
    if (m.drain > 0) out.push([`Assorbe ${m.drain}%`, 'up']);
    if (m.drain < 0) out.push([`Contraccolpo ${-m.drain}%`, 'down']);
    if (m.healing > 0) out.push([`Cura ${m.healing}%`, 'up']);
    if (m.healing < 0) out.push([`Costa ${-m.healing}% PS`, 'down']);
    if (m.crit_rate >= 6) out.push(['Sempre brutto colpo', 'info']);
    else if (m.crit_rate > 0) out.push(['Brutto colpo ↑', 'info']);
    if (m.min_hits && m.max_hits) {
      out.push([m.min_hits === m.max_hits ? `${m.min_hits} colpi` : `${m.min_hits}–${m.max_hits} colpi`, 'info']);
    }
  }
  if (x.sc?.length) {
    // Su chi agisce: le mosse "raise" o rivolte a sé modificano l'utilizzatore.
    const cat = m?.c?.name ?? '';
    const self = ['user', 'users-field', 'user-and-allies', 'user-or-ally'].includes(x.tg?.name) || cat.includes('raise');
    const byChange = new Map();
    for (const c of x.sc) {
      const k = c.change;
      byChange.set(k, [...(byChange.get(k) ?? []), STAT[c.s.name] ?? c.s.name]);
    }
    for (const [change, stats] of byChange) {
      const sign = change > 0 ? `+${change}` : `−${-change}`;
      const who = self ? 'sé' : 'avv.';
      const good = self ? change > 0 : change < 0;
      const what = stats.length >= 5 ? 'Tutte' : stats.join('/');
      out.push([`${what} ${sign} (${who})${pct(m?.stat_chance)}`, good ? 'up' : 'down']);
    }
  }
  return out;
}

/* ---------- Storia delle mosse ---------- */

// Version group principali in ordine cronologico: [id PokéAPI, generazione, nome].
const VGS = [
  [1, 1, 'Rosso/Blu'], [2, 1, 'Giallo'], [3, 2, 'Oro/Argento'], [4, 2, 'Cristallo'],
  [5, 3, 'Rubino/Zaffiro'], [6, 3, 'Smeraldo'], [7, 3, 'RossoFuoco/VerdeFoglia'],
  [8, 4, 'Diamante/Perla'], [9, 4, 'Platino'], [10, 4, 'HeartGold/SoulSilver'],
  [11, 5, 'Nero/Bianco'], [14, 5, 'Nero 2/Bianco 2'], [15, 6, 'X/Y'], [16, 6, 'Rubino Omega/Zaffiro Alpha'],
  [17, 7, 'Sole/Luna'], [18, 7, 'Ultrasole/Ultraluna'], [19, 7, "Let's Go"], [20, 8, 'Spada/Scudo'],
  [21, 8, "L'isola solitaria dell'armatura"], [22, 8, 'Le terre innevate della corona'],
  [23, 8, 'Diamante Lucente/Perla Splendente'], [24, 8, 'Leggende: Arceus'],
  [25, 9, 'Scarlatto/Violetto'], [26, 9, 'La maschera turchese'], [27, 9, 'Il disco indaco'],
];
const VG_INDEX = new Map(VGS.map(([id], i) => [id, i]));
// id tipo PokéAPI -> id interno (10001 è il tipo "???", es. Maledizione in Gen 2–4)
const TYPE_IDS = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'];
const typeName = id => (id === 10001 ? '???' : TYPE_BY_ID[TYPE_IDS[id - 1]]?.it ?? '?');
const typeIdOf = t => TYPE_IDS.indexOf(t) + 1;
// Fino alla Gen 3 la categoria dipendeva dal tipo della mossa.
const SPECIAL_TYPES = new Set(['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark']);

// Divide la vita della mossa in periodi con gli stessi valori; restituisce solo quelli diversi da oggi.
function moveHistory(m) {
  if (!m.hist) return [];
  const [introGen, pp, chance, changes] = m.hist;
  const now = { power: m.power, acc: m.acc, pp, type: typeIdOf(m.type), chance, cls: m.cls };
  // Ogni modifica a un version group V indica i valori in vigore *prima* di V.
  const sorted = changes.filter(c => VG_INDEX.has(c[0])).sort((a, b) => VG_INDEX.get(b[0]) - VG_INDEX.get(a[0]));
  const start = VGS.findIndex(([, g]) => g >= introGen);
  if (start < 0) return [];
  const snaps = [];
  let cur = { ...now };
  let ci = 0;
  for (let i = VGS.length - 1; i >= start; i--) {
    while (ci < sorted.length && VG_INDEX.get(sorted[ci][0]) > i) {
      const [, power, acc, cpp, type, ch] = sorted[ci++];
      cur = { ...cur };
      if (power != null) cur.power = power;
      if (acc != null) cur.acc = acc;
      if (cpp != null) cur.pp = cpp;
      if (type != null) cur.type = type;
      if (ch != null) cur.chance = ch;
    }
    const snap = { ...cur };
    if (VGS[i][1] <= 3 && m.cls !== 'status') {
      snap.cls = snap.type === 10001 ? 'physical' : SPECIAL_TYPES.has(TYPE_IDS[snap.type - 1]) ? 'special' : 'physical';
    }
    snaps[i] = snap;
  }
  const key = v => [v.power, v.acc, v.pp, v.type, v.chance, v.cls].join('|');
  // Raggruppa version group consecutivi con valori uguali.
  const ranges = [];
  for (let i = start; i < VGS.length; i++) {
    const last = ranges[ranges.length - 1];
    if (last && key(last.v) === key(snaps[i])) last.to = i;
    else ranges.push({ from: i, to: i, v: snaps[i] });
  }
  const nowKey = key(now);
  return ranges.filter(r => key(r.v) !== nowKey).map(r => ({ label: rangeLabel(r.from, r.to), diffs: diffs(r.v, now) }));
}

function rangeLabel(from, to) {
  const gA = VGS[from][1], gB = VGS[to][1];
  const genStart = VGS.findIndex(([, g]) => g === gA);
  const genEnd = VGS.findLastIndex(([, g]) => g === gB);
  const gens = gA === gB ? `Gen ${gA}` : `Gen ${gA}–${gB}`;
  if (from === genStart && to === genEnd) return { short: gens, full: gens };
  const names = from === to ? VGS[from][2] : `${VGS[from][2]} → ${VGS[to][2]}`;
  return { short: gens + '*', full: `${gens} · ${names}` };
}

function diffs(old, now) {
  const out = [];
  const val = (v, suf = '') => (v == null || v === 0 ? '—' : v + suf);
  if (old.type !== now.type) out.push(['Tipo', typeName(old.type), typeName(now.type)]);
  if (old.cls !== now.cls) out.push(['Categoria', CLS[old.cls]?.label, CLS[now.cls]?.label]);
  if (old.power !== now.power) out.push(['Potenza', val(old.power), val(now.power)]);
  if (old.acc !== now.acc) out.push(['Precisione', val(old.acc, '%'), val(now.acc, '%')]);
  if (old.pp !== now.pp) out.push(['PP', val(old.pp), val(now.pp)]);
  if (old.chance !== now.chance) out.push(['Prob. effetto', val(old.chance, '%'), val(now.chance, '%')]);
  return out;
}

// Pulsanti "Gen 1–3", "Gen 4"… che aprono com'era la mossa in quel periodo.
function historyBlock(history) {
  const wrap = document.createElement('div');
  wrap.className = 'hist';
  const label = document.createElement('span');
  label.className = 'hist-label';
  label.textContent = 'Com’era:';
  const btns = document.createElement('div');
  btns.className = 'hist-btns';
  btns.append(label);
  const panel = document.createElement('div');
  panel.className = 'hist-panel';
  const inner = document.createElement('div');
  panel.append(inner);
  let active = null;
  history.forEach(h => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hist-btn';
    b.textContent = h.label.short;
    b.title = h.label.full;
    b.setAttribute('aria-pressed', 'false');
    b.onclick = e => {
      e.stopPropagation(); // non chiudere la riga
      const open = active !== b;
      active?.setAttribute('aria-pressed', 'false');
      active = open ? b : null;
      b.setAttribute('aria-pressed', String(open));
      if (open) {
        inner.innerHTML = '';
        const t = document.createElement('div');
        t.className = 'hist-title';
        t.textContent = h.label.full;
        inner.append(t);
        for (const [what, before, after] of h.diffs) {
          const row = document.createElement('div');
          row.className = 'hist-row';
          row.innerHTML = `<span>${what}</span><b>${before}</b><span class="hist-now">ora ${after}</span>`;
          inner.append(row);
        }
      }
      panel.classList.toggle('open', open);
    };
    b.onkeydown = e => e.stopPropagation();
    btns.append(b);
  });
  wrap.append(btns, panel);
  return wrap;
}

/* ---------- Copertura: elenco mosse ---------- */

const CLS = {
  physical: { label: 'Fisica', short: 'Fis' },
  special: { label: 'Speciale', short: 'Spe' },
  status: { label: 'Stato', short: 'Sta' },
};

async function renderCovMoves() {
  const box = $('cov-moves');
  const types = state.cov;
  if (!types.length) { box.hidden = true; return; }
  box.hidden = false;
  if (!types.includes(state.covMoveType)) state.covMoveType = types[0];

  const sw = $('cov-move-types');
  sw.innerHTML = '';
  for (const id of types) {
    const b = badge(id, 'button');
    b.type = 'button';
    b.classList.add('pick');
    b.setAttribute('aria-pressed', String(id === state.covMoveType));
    b.onclick = () => { state.covMoveType = id; renderCovMoves(); };
    sw.append(b);
  }

  const list = $('cov-move-list');
  let extra;
  try { extra = await loadExtra(); }
  catch {
    list.innerHTML = '<p class="empty">Non riesco a scaricare le mosse. Controlla la connessione e riprova.</p>';
    return;
  }
  const type = state.covMoveType;
  const moves = extra.moves
    .filter(m => m.type === type && (state.covStatus || m.cls !== 'status'))
    .sort((a, b) => (b.power ?? -1) - (a.power ?? -1) || a.name.localeCompare(b.name, 'it'));

  const table = document.createElement('table');
  table.className = 'moves';
  const th = (long, short, cls = '') => `<th scope="col" class="${cls}"><span class="long">${long}</span><span class="short" aria-hidden="true">${short}</span></th>`;
  table.innerHTML = `<thead><tr>${th('Mossa', 'Mossa')}${th('Potenza', 'Pot.', 'num')}${th('Precisione', 'Prec.', 'num')}</tr></thead>`;
  const tb = table.createTBody();
  for (const m of moves) {
    const tr = tb.insertRow();
    const cell = document.createElement('div'); // il flex sta dentro la cella, non sulla <td>
    cell.className = 'move-name';
    tr.insertCell().append(cell);
    const label = CLS[m.cls]?.label ?? m.cls;
    const ic = document.createElement('span');
    ic.className = 'cls-ico';
    ic.title = label;
    ic.innerHTML = (CLS_ICON[m.cls] ?? '') + `<span class="sr-only">${label}</span>`;
    const txt = document.createElement('span');
    txt.className = 'move-txt';
    const line = document.createElement('span');
    line.className = 'move-line';
    const it = document.createElement('span');
    it.className = 'move-it';
    it.textContent = m.name;
    txt.append(it);
    const en = enLine(m.name, m.en);
    if (en) txt.append(en);
    for (const [t, kind] of m.tags ?? []) {
      const tag = document.createElement('span');
      tag.className = 'fx';
      tag.dataset.kind = kind;
      tag.textContent = t;
      line.append(tag);
    }
    const history = moveHistory(m);
    if (history.length) {
      const mark = document.createElement('span');
      mark.className = 'fx hist-mark';
      mark.title = 'Cambiata nel tempo: apri la mossa per vedere com’era';
      mark.textContent = '↺ storia';
      line.append(mark);
    }
    if (line.childElementCount) txt.append(line);
    if (m.desc || history.length) {
      // Descrizione completa: si apre toccando la riga.
      // Contenitore a griglia (0fr → 1fr) per animare l'altezza.
      const d = document.createElement('span');
      d.className = 'move-desc';
      const inner = document.createElement('span');
      const p = document.createElement('span');
      p.className = 'move-desc-text';
      p.textContent = m.desc;
      inner.append(p);
      if (history.length) inner.append(historyBlock(history));
      d.append(inner);
      txt.append(d);
      tr.classList.add('has-desc');
      tr.tabIndex = 0;
      tr.setAttribute('aria-expanded', 'false');
      const toggle = () => tr.setAttribute('aria-expanded', String(tr.getAttribute('aria-expanded') !== 'true'));
      tr.onclick = toggle;
      tr.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
    }
    cell.append(ic, txt);
    const pw = tr.insertCell(); pw.className = 'num'; pw.textContent = m.power || '—';
    const ac = tr.insertCell(); ac.className = 'num'; ac.textContent = m.acc ? m.acc + '%' : '—';
  }
  list.innerHTML = '';
  if (moves.length) {
    const wrap = document.createElement('div');
    wrap.className = 'moves-scroll';
    wrap.append(table);
    list.append(wrap);
  }
}

/* ---------- Copertura ---------- */

const COV_MAX = 4;
const COV_ORDER = [4, 2, 1, 0.5, 0.25, 0];
const COV_LABEL = { ...LABEL, 1: '×1' };
const DEX_KEY = 'dex-v2';
let dexPromise = null;
let dexReady = false;

// Tutti i Pokémon (e forme) con i loro tipi: 18 richieste a /type, poi in cache per 7 giorni.
function loadDex() {
  if (dexPromise) return dexPromise;
  const cached = store.get(DEX_KEY, null);
  if (cached && Date.now() - cached.t < 7 * 864e5) return (dexPromise = Promise.resolve(cached.list));
  const getJson = url => fetch(url).then(r => { if (!r.ok) throw r; return r.json(); });
  dexPromise = Promise.all([
    getJson('https://pokeapi.co/api/v2/pokemon-species?limit=2000'),
    ...TYPES.map(t => getJson(`https://pokeapi.co/api/v2/type/${t.id}`)),
  ]).then(([species, ...results]) => {
    // Per le forme base usa il nome della specie ("keldeo" invece di "keldeo-ordinary").
    const speciesName = new Map(species.results.map(sp => [Number(sp.url.split('/').filter(Boolean).pop()), sp.name]));
    const byId = new Map();
    results.forEach((res, i) => {
      for (const { slot, pokemon } of res.pokemon) {
        const id = Number(pokemon.url.split('/').filter(Boolean).pop());
        const mon = byId.get(id) ?? { id, name: speciesName.get(id) ?? pokemon.name, types: [] };
        mon.types[slot - 1] = TYPES[i].id;
        byId.set(id, mon);
      }
    });
    const list = [...byId.values()]
      .map(m => ({ ...m, types: m.types.filter(Boolean) }))
      .sort((a, b) => a.id - b.id);
    store.set(DEX_KEY, { t: Date.now(), list });
    return list;
  }).catch(err => { dexPromise = null; throw err; });
  return dexPromise;
}

const prettyName = slug => slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const spriteUrl = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

function renderCovPicker() {
  const box = $('cov-picker');
  box.innerHTML = '';
  const full = state.cov.length >= COV_MAX;
  for (const t of TYPES) {
    const b = badge(t.id, 'button');
    b.type = 'button';
    b.classList.add('pick');
    const on = state.cov.includes(t.id);
    b.setAttribute('aria-pressed', String(on));
    b.disabled = full && !on;
    b.onclick = () => {
      state.cov = on ? state.cov.filter(x => x !== t.id) : [...state.cov, t.id];
      store.set('cov', state.cov);
      renderCoverage();
    };
    box.append(b);
  }
}

async function renderCoverage() {
  renderCovPicker();
  renderCovMoves();
  const out = $('cov-out');
  if (!state.cov.length) {
    out.innerHTML = '<p class="empty">Seleziona almeno un tipo di mossa.</p>';
    return;
  }
  const seq = ++state.covSeq;
  if (!dexReady) out.innerHTML = '<p class="empty">Carico il Pokédex…</p>';

  let dex;
  try { [dex] = await Promise.all([loadDex(), softExtra()]); dexReady = true; }
  catch {
    out.innerHTML = '<p class="empty">Errore di rete nel caricare il Pokédex. Riprova.</p>';
    return;
  }
  if (seq !== state.covSeq) return;

  let extra = null;
  if (state.covFinal) {
    try { extra = await loadExtra(); }
    catch {
      out.innerHTML = '<p class="empty">Non riesco a scaricare i dati sulle evoluzioni. Riprova o togli il filtro “Solo completamente evoluti”.</p>';
      return;
    }
    if (seq !== state.covSeq) return;
  }

  const moves = state.cov;
  const groups = Object.fromEntries(COV_ORDER.map(v => [v, []]));
  for (const mon of filterDex(dex, { forms: state.covForms, finalOnly: state.covFinal, extra })) {
    let best = -1, by = [];
    for (const mv of moves) {
      const m = mon.types.reduce((x, d) => x * attackMultiplier(mv, d), 1);
      if (m > best) { best = m; by = [mv]; }
      else if (m === best) by.push(mv);
    }
    groups[best].push({ ...mon, by });
  }
  const total = COV_ORDER.reduce((n, v) => n + groups[v].length, 0);

  out.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'matrix-head';
  head.innerHTML = `<h2>Risultato</h2><span class="cov-total">${total} Pokémon · danno migliore tra le tue mosse</span>`;
  out.append(head);

  // Barra riassuntiva
  const bar = document.createElement('div');
  bar.className = 'cov-bar';
  const counts = document.createElement('div');
  counts.className = 'cov-counts';
  for (const v of COV_ORDER) {
    const n = groups[v].length;
    if (n) {
      const seg = document.createElement('span');
      seg.dataset.m = v;
      seg.style.flexGrow = n;
      seg.dataset.tip = `${COV_LABEL[v]} · ${n} Pokémon`;
      seg.setAttribute('aria-label', seg.dataset.tip);
      bar.append(seg);
    }
    const c = document.createElement('a');
    c.href = `#cov-${String(v).replace('.', '_')}`;
    c.dataset.m = v;
    c.className = n ? '' : 'zero';
    c.innerHTML = `<b>${COV_LABEL[v]}</b><span>${n}</span>`;
    c.onclick = e => {
      e.preventDefault();
      const det = document.getElementById(c.hash.slice(1));
      if (!det) return;
      det.open = true;
      det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    counts.append(c);
  }
  out.append(bar, counts);


  // Liste per moltiplicatore
  for (const v of COV_ORDER) {
    const list = groups[v];
    if (!list.length) continue;
    const det = document.createElement('details');
    det.className = 'cov-group';
    det.id = `cov-${String(v).replace('.', '_')}`;
    det.dataset.m = v;
    det.open = state.covOpen[v] ?? (v < 1 || (v === 1 && list.length <= 60));
    const sum = document.createElement('summary');
    sum.innerHTML = `<span class="lbl">${COV_LABEL[v]}</span><span>${list.length} Pokémon</span>`;
    det.append(sum);

    // Le card si costruiscono solo quando il gruppo viene aperto.
    const fill = () => {
      if (det.dataset.filled) return;
      det.dataset.filled = '1';
      const grid = document.createElement('div');
      grid.className = 'cov-list';
      for (const mon of list) {
        const best = mon.by.map(id => TYPE_BY_ID[id].it).join(', ');
        grid.append(monCard(mon, `${v === 1 ? 'neutro' : 'migliore'}: ${best} ${COV_LABEL[v]}`));
      }
      det.append(grid);
    };
    if (det.open) fill();
    det.addEventListener('toggle', () => {
      if (det.open) fill();
      state.covOpen[v] = det.open;
      store.set('cov-open', state.covOpen);
    });
    out.append(det);
  }
}

function monCard(mon, note = '') {
  const el = document.createElement('div');
  el.className = 'cov-mon';
  const { it: name, en } = monNames(mon);
  el.title = `${name}${sameName(name, en) ? '' : ` (${en})`} — ${mon.types.map(t => TYPE_BY_ID[t].it).join('/')}${note ? ' · ' + note : ''}`;
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.width = img.height = 48;
  img.alt = '';
  img.src = spriteUrl(mon.id);
  img.onerror = () => img.style.visibility = 'hidden';
  const txt = document.createElement('div');
  txt.className = 'cov-txt';
  const n = document.createElement('span');
  n.className = 'cov-name';
  n.textContent = name;
  const ty = document.createElement('span');
  ty.className = 'cov-types';
  mon.types.forEach(t => ty.append(icon(t)));
  txt.append(n);
  const enEl = enLine(name, en);
  if (enEl) txt.append(enEl);
  txt.append(ty);
  el.append(img, txt);
  return el;
}

/* ---------- Impostazioni ---------- */

function renderSettings() {
  const gens = $('gens');
  GENS.forEach((_, i) => {
    const g = i + 1;
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.gens.includes(g);
    cb.onchange = () => {
      const sel = [...gens.querySelectorAll('input')].map((c, j) => c.checked && j + 1).filter(Boolean);
      if (!sel.length) { cb.checked = true; return; } // almeno una generazione
      state.gens = sel;
      store.set('gens', state.gens);
      prefetch(); // il prossimo rispetta la nuova selezione
    };
    label.append(cb, `Gen ${g}`);
    gens.append(label);
  });

  const dirs = $('dirs');
  for (const d of DIRS) {
    const label = document.createElement('label');
    const rb = document.createElement('input');
    rb.type = 'radio';
    rb.name = 'dir';
    rb.checked = state.dir === d.id;
    rb.onchange = () => { state.dir = d.id; store.set('dir', d.id); };
    label.append(rb, d.label);
    dirs.append(label);
  }
}

/* ---------- Home ---------- */

const HOME_TILES = [
  ['quiz', 'Quiz', 'Indovina debolezze e resistenze di Pokémon e tipi.', '#c8553d'],
  ['chart', 'Tabella', 'Tutti gli incroci tra i tipi e il calcolatore.', '#1f6f78'],
  ['coverage', 'Copertura', 'Quali tipi colpisce bene la tua squadra di mosse.', '#c98a1b'],
  ['dex', 'Pokédex', 'Le schede di tutti i Pokémon, con forme e statistiche.', '#8a4f7d'],
  ['regions', 'Regioni', 'Mappe, starter e capipalestra di ogni regione.', '#2f5f9a'],
];
const ARTWORK = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const QUICK_WORDS = { 2: 'superefficace', 1: 'normale', 0.5: 'poco efficace', 0: 'senza effetto' };

// Pokémon del giorno: cambia a mezzanotte ed è lo stesso per tutti nello stesso giorno.
function dayMonId() {
  const d = new Date();
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return (day * 7919) % 1025 + 1;
}

let homeBuilt = false;
function renderHome() {
  const view = $('home-view');
  if (homeBuilt) return;
  homeBuilt = true;
  view.innerHTML = `
    <section class="calc home-hero">
      <form class="home-search" role="search">
        <label class="sr-only" for="home-q">Cerca nel sito</label>
        <svg class="home-lens" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>
        <input id="home-q" type="search" placeholder="Cerca Pokémon, mosse, abilità, strumenti…" autocomplete="off" spellcheck="false" enterkeyhint="go"
          role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="home-sugg" aria-label="Cerca Pokémon, mosse, abilità, strumenti e capipalestra, in italiano o in inglese">
      </form>
      <div class="home-sugg" id="home-sugg" role="listbox" aria-label="Risultati" hidden></div>
      <div class="home-day" id="home-day" aria-live="polite"><p class="hint">Carico il Pokémon del giorno…</p></div>
    </section>
    <!-- Niente tessere delle sezioni: sono già nelle schede in alto -->
    <section class="calc home-quick" id="home-quick" aria-live="polite"></section>`;
  view.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => setMode(b.dataset.go); });
  homeSearchBox();
  homeDay();
  homeQuestion();
}

/* Ricerca della Home: una sola casella per tutto il sito. Mentre si scrive compaiono fino a 8 risultati tra
   Pokémon (nome o numero), mosse, abilità, strumenti e capipalestra, cercando sia il nome italiano sia quello
   inglese. Se il risultato scelto è un Pokémon si mostra subito al posto del Pokémon del giorno. Frecce o mouse
   cambiano il risultato scelto, Invio o un clic lo aprono, Esc (o la casella vuota) torna al Pokémon del giorno.
   Mosse, abilità e strumenti vengono da compendio.js (stessi dati, già salvati per 7 giorni); i capipalestra da
   regioni.js. Per aggiungere altro (per esempio i Superquattro) basta un'altra fonte in homeSources(). */
const home = { dayMon: null, hits: [], active: 0 };
const HOME_KIND = { mon: 0, move: 1, ability: 2, item: 3, leader: 4 };
const HOME_LABEL = { move: 'Mossa', ability: 'Abilità', item: 'Strumento', leader: 'Capopalestra' };
const HOME_GROUP = { mon: 'Pokémon', move: 'Mosse', ability: 'Abilità', item: 'Strumenti', leader: 'Capipalestra' };
// Simbolo delle abilità: una coccarda (scelta da prototipo-simbolo-abilita.html)
const ABILITY_ICON = '<svg class="home-row-ab" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#d4a23a"/><path d="M9 13.5l-1.8 6 2.6-1.2 1.3 2.3 1-5.6M15 13.5l1.8 6-2.6-1.2-1.3 2.3-1-5.6" fill="#fbf8f2"/><circle cx="12" cy="10" r="4.6" fill="#fbf8f2"/><circle cx="12" cy="10" r="2.6" fill="#d4a23a"/></svg>';
// Il pezzo cercato in evidenza (senza badare ad accenti e maiuscole)
function markMatch(name, f) {
  const i = foldName(name).indexOf(f);
  if (!f || i < 0) return esc(name);
  return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + f.length)) + '</mark>' + esc(name.slice(i + f.length));
}
const foldName = x => (x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// 0 = uguale, 1 = inizia così, 2 = una parola inizia così, 3 = lo contiene, 9 = niente
function nameScore(names, f) {
  let best = 9;
  for (const name of names) {
    if (!name) continue;
    const x = foldName(name);
    const sc = x === f ? 0 : x.startsWith(f) ? 1 : x.split(/[\s.'’-]+/).some(w => w.startsWith(f)) ? 2 : x.includes(f) ? 3 : 9;
    if (sc < best) best = sc;
  }
  return best;
}

// Elenchi in cui cercare: i Pokémon subito, il resto appena arriva (homeExtra)
let homeExtra = null;
function homeSources(dex) {
  const out = [{ kind: 'mon', list: dex.filter(m => m.id <= 1025), names: m => { const n = monNames(m); return [n.it, n.en, m.name]; } }];
  const x = homeExtra?.done;
  if (x?.moves) out.push({ kind: 'move', list: x.moves, names: m => [m.it, m.en] });
  if (x?.abilities) out.push({ kind: 'ability', list: x.abilities, names: a => [a.it, a.en] });
  if (x?.items) out.push({ kind: 'item', list: x.items, names: i => [i.it, i.en] });
  if (typeof homeLeaders === 'function') out.push({ kind: 'leader', list: homeLeaders(), names: l => [l.it, l.en] });
  return out;
}
function loadHomeExtra() {
  if (homeExtra) return homeExtra.p;
  const done = {};
  const safe = (pr, k, f = v => v) => (typeof pr === 'function' ? pr() : Promise.reject()).then(v => { done[k] = f(v); }).catch(() => {});
  homeExtra = { done };
  homeExtra.p = Promise.all([
    safe(typeof loadMoves === 'function' && loadMoves, 'moves'),
    safe(typeof loadAbilities === 'function' && loadAbilities, 'abilities'),
    safe(typeof loadItems === 'function' && loadItems, 'items', d => d.list),
  ]);
  return homeExtra.p;
}

// Capipalestra di tutte le regioni (una voce per capopalestra e regione, con il gioco più vecchio in cui compare)
let homeLeadersCache = null;
function homeLeaders() {
  if (homeLeadersCache || typeof REGIONS_DATA === 'undefined') return homeLeadersCache ?? [];
  const seen = new Map();
  for (const r of REGIONS_DATA) for (const g of r.gymGames ?? []) for (const gym of g.gyms) {
    const key = r.id + '|' + gym.leader;
    if (seen.has(key)) continue;
    // Nome inglese dallo sprite di Showdown (ltsurge → Lt Surge non c'è: basta per trovarlo cercando "surge")
    const en = gym.sprite.replace(/-.*$/, '').replace(/^./, c => c.toUpperCase());
    seen.set(key, { slug: key, it: gym.leader, en, region: r, game: g, gym });
  }
  return (homeLeadersCache = [...seen.values()]);
}

function homeMatches(dex, text) {
  const q = text.trim().toLowerCase().replace(/^#|^n[º°]\s*/, '');
  if (!q) return [];
  if (/^\d+$/.test(q)) {
    const n = Number(q);
    return dex.filter(m => m.id <= 1025 && String(m.id).startsWith(q)).sort((a, b) => (b.id === n) - (a.id === n) || a.id - b.id).slice(0, 8)
      .map(m => ({ kind: 'mon', item: m, score: 0 }));
  }
  const f = foldName(q);
  const scored = [];
  for (const src of homeSources(dex)) for (const item of src.list) {
    const score = nameScore(src.names(item), f);
    if (score < 9) scored.push({ kind: src.kind, item, score });
  }
  // Al massimo 2 risultati per gruppo, i migliori di ciascuno; poi in ordine di gruppo (Pokémon, Mosse, Abilità…)
  scored.sort((a, b) => a.score - b.score || (a.item.id ?? 0) - (b.item.id ?? 0) || String(a.item.it).localeCompare(b.item.it, 'it'));
  const per = {};
  return scored.filter(h => (per[h.kind] = (per[h.kind] ?? 0) + 1) <= 2).sort((a, b) => HOME_KIND[a.kind] - HOME_KIND[b.kind]);
}

// Indirizzo (o azione) per aprire un risultato
function homeOpen(h) {
  const it = h.item;
  if (h.kind === 'mon') location.hash = `dex/${it.id}`;
  else if (h.kind === 'move') location.hash = `mossa/${encodeURIComponent(it.slug)}`;
  else if (h.kind === 'ability') location.hash = `abilita/${encodeURIComponent(it.slug)}`;
  else if (h.kind === 'item') location.hash = `strumento/${encodeURIComponent(it.slug)}`;
  else if (h.kind === 'leader') {
    // Pagina della regione con il gioco e la città del capopalestra già scelti
    regState.game[it.region.id] = it.game.id;
    regState.place[it.region.id] = it.gym.city;
    location.hash = `regione/${it.region.id}`;
  }
}

// Riga di un risultato nella tendina: immagine piccola, nome (con il pezzo cercato in evidenza), nome inglese a destra
function homeHitRow(h, i, f) {
  const it = h.item;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `home-row home-row-${h.kind}`;
  b.id = `home-sugg-${i}`;
  b.setAttribute('role', 'option');
  b.tabIndex = -1;
  const pic = Object.assign(document.createElement('span'), { className: 'home-row-pic' });
  const img = (src, cls = '') => { const im = Object.assign(document.createElement('img'), { src, alt: '', className: cls }); im.onerror = () => { im.style.visibility = 'hidden'; }; pic.append(im); };
  let name = it.it, en = it.en;
  if (h.kind === 'mon') { const n = monNames(it); name = n.it; en = String(it.id); img(spriteUrl(it.id)); }
  else if (h.kind === 'move') pic.append(icon(it.type));
  else if (h.kind === 'ability') pic.innerHTML = ABILITY_ICON;
  else if (h.kind === 'item') img(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${it.slug}.png`);
  else if (h.kind === 'leader') { img(TRAINER(it.gym.sprite + (it.game.suffix || '')), 'home-row-trainer'); en = it.region.name; }
  // In evidenza il nome che contiene la ricerca: l'italiano, oppure l'inglese se la ricerca era in inglese
  const itHas = foldName(name).includes(f);
  b.innerHTML = `<span class="home-row-name">${itHas ? markMatch(name, f) : esc(name)}</span><span class="home-row-en">${!itHas && h.kind !== 'mon' ? markMatch(en, f) : esc(en)}</span>`;
  b.prepend(pic);
  b.setAttribute('aria-label', `${name}${h.kind === 'mon' ? '' : ', ' + HOME_LABEL[h.kind].toLowerCase()}`);
  return b;
}

function homeSearchBox() {
  const input = $('home-q'), list = $('home-sugg');
  let seq = 0;
  const showDay = () => { if (home.dayMon) homeMonCard(home.dayMon, `Pokémon del giorno · Nº ${String(home.dayMon.id).padStart(4, '0')}`); };
  const show = i => {
    home.active = i;
    list.querySelectorAll('.home-row').forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
    const h = home.hits[i];
    if (!h) return;
    input.setAttribute('aria-activedescendant', `home-sugg-${i}`);
    // Un Pokémon prende il posto del Pokémon del giorno; per mosse, abilità ecc. sotto resta (o torna) quello del giorno
    if (h.kind === 'mon') { if (home.shownId !== h.item.id) homeMonCard(h.item, `Nº ${String(h.item.id).padStart(4, '0')}`); }
    else if (home.dayMon && home.shownId !== home.dayMon.id) showDay();
  };
  const update = async () => {
    const my = ++seq;
    const text = input.value;
    if (!text.trim()) {
      home.hits = [];
      list.hidden = true; list.innerHTML = '';
      input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
      showDay();
      return;
    }
    // Mosse, abilità e oggetti si caricano alla prima ricerca; appena arrivano la ricerca si ripete
    if (!homeExtra) loadHomeExtra().then(() => { if (input.value.trim()) update(); });
    let dex;
    try { [dex] = await Promise.all([loadDex(), softExtra()]); } catch { dex = null; }
    if (my !== seq) return;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (!dex) { list.innerHTML = '<p class="hint">Non riesco a caricare i dati. Controlla la connessione.</p>'; return; }
    home.hits = homeMatches(dex, text);
    list.innerHTML = '';
    if (!home.hits.length) {
      list.innerHTML = `<p class="hint">${homeExtra?.done && Object.keys(homeExtra.done).length ? 'Nessun risultato con questo nome.' : 'Cerco…'}</p>`;
      input.removeAttribute('aria-activedescendant');
      showDay();
      return;
    }
    // Tendina a gruppi: un titoletto per categoria, poi le sue righe
    const f = foldName(text.trim().replace(/^#|^n[º°]\s*/i, ''));
    let group = null;
    home.hits.forEach((h, i) => {
      if (h.kind !== group) { group = h.kind; list.append(Object.assign(document.createElement('p'), { className: 'home-group', textContent: HOME_GROUP[h.kind] })); }
      const b = homeHitRow(h, i, f);
      b.onmouseenter = () => show(i);
      b.onclick = () => homeOpen(h);
      list.append(b);
    });
    show(0);
  };
  input.addEventListener('input', update);
  input.addEventListener('keydown', e => {
    const n = home.hits.length;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowRight' && input.selectionStart === input.value.length) && n) { e.preventDefault(); show((home.active + 1) % n); }
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft' && input.selectionStart === input.value.length && home.active > 0) && n) { e.preventDefault(); show((home.active - 1 + n) % n); }
    else if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; update(); }
  });
  $('home-q').form.onsubmit = e => {
    e.preventDefault();
    const h = home.hits[home.active];
    if (h) homeOpen(h);
    else if (input.value.trim()) homeSearch(input.value); // nomi non trovati: Pokédex filtrato
  };
}

// Senza risultati (o senza rete): numero o nome esatto aprono la scheda, altrimenti il Pokédex filtrato.
async function homeSearch(text) {
  const q = text.trim().toLowerCase();
  if (!q) return;
  const n = Number(q.replace(/^#|^n[º°]\s*/, ''));
  if (Number.isInteger(n) && n >= 1 && n <= 1025) { location.hash = `dex/${n}`; return; }
  setMode('dex');
  const box = $('dex-search');
  box.value = text.trim();
  box.dispatchEvent(new Event('input'));
}

// Scheda breve di un Pokémon nella Home: artwork, nome, tipi, debolezze e resistenze.
// Scheda del Pokémon nella Home: artwork grande, nome, tipi e la sua voce del Pokédex
const homeFlavor = new Map();
function homeMonCard(mon, kicker) {
  home.shownId = mon.id;
  const box = $('home-day');
  const { it } = monNames(mon);
  box.innerHTML = `
    <a class="home-mon" href="#dex/${mon.id}">
      <span class="home-art"><img src="${ARTWORK(mon.id)}" alt="" width="260" height="260"></span>
      <span class="home-id">
        <span class="home-kicker"></span>
        <span class="home-name"></span>
        <span class="home-types"></span>
        <span class="home-flavor"></span>
        <span class="home-more">Apri la scheda →</span>
      </span>
    </a>`;
  box.querySelector('.home-kicker').textContent = kicker;
  box.querySelector('.home-name').textContent = it;
  const types = box.querySelector('.home-types');
  mon.types.forEach(t => types.append(badge(t)));
  const flavor = box.querySelector('.home-flavor');
  const species = mon.id <= 10000 ? mon.id : extraData?.formSpecies.get(mon.id);
  if (!species) return;
  const show = t => { if (box.querySelector('.home-flavor') === flavor) flavor.textContent = t; };
  if (homeFlavor.has(species)) { show(homeFlavor.get(species)); return; }
  fetch(`https://pokeapi.co/api/v2/pokemon-species/${species}`).then(r => r.json()).then(sp => {
    const list = sp.flavor_text_entries ?? [];
    const pick = [...list].reverse().find(f => f.language.name === 'it') ?? [...list].reverse().find(f => f.language.name === 'en');
    const t = (pick?.flavor_text ?? '').replace(/\s+/g, ' ').trim();
    homeFlavor.set(species, t);
    show(t);
  }).catch(() => {});
}

async function homeDay() {
  const box = $('home-day');
  const id = dayMonId();
  let mon;
  try {
    const [dex] = await Promise.all([loadDex(), softExtra()]);
    mon = dex.find(m => m.id === id);
  } catch { /* gestito sotto */ }
  if (!mon) { if (!home.hits.length) box.innerHTML = '<p class="hint">Non riesco a scaricare il Pokémon del giorno. Controlla la connessione.</p>'; return; }
  home.dayMon = mon;
  if (!home.hits.length) homeMonCard(mon, `Pokémon del giorno · Nº ${String(id).padStart(4, '0')}`);
}

// Domanda lampo: un tipo attacca, un tipo difende; più spesso coppie con un effetto speciale.
function homeQuestion() {
  const box = $('home-quick');
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const att = pick(TYPES).id;
  const special = TYPES.filter(t => attackMultiplier(att, t.id) !== 1);
  const def = (Math.random() < .7 && special.length ? pick(special) : pick(TYPES)).id;
  const truth = attackMultiplier(att, def);
  box.innerHTML = '<h3>Domanda lampo</h3><p class="prompt home-prompt"></p><div class="home-answers"></div><p class="home-fb" hidden></p>';
  const prompt = box.querySelector('.home-prompt');
  prompt.append('Un attacco ', badge(att), ' contro un Pokémon ', badge(def), ' è…');
  const answers = box.querySelector('.home-answers'), fb = box.querySelector('.home-fb');
  [2, 1, 0.5, 0].forEach(v => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'home-answer' });
    b.innerHTML = `<b>${v === 1 ? '×1' : LABEL[v]}</b><span>${QUICK_WORDS[v]}</span>`;
    b.onclick = () => {
      answers.querySelectorAll('button').forEach(x => { x.disabled = true; });
      answers.querySelector(`[data-v="${truth}"]`).classList.add('ok');
      if (v !== truth) b.classList.add('wrong');
      fb.hidden = false;
      fb.innerHTML = v === truth ? '<strong>Esatto!</strong> ' : `<strong>No:</strong> è ${truth === 1 ? '×1' : LABEL[truth]}, ${QUICK_WORDS[truth]}. `;
      const again = Object.assign(document.createElement('button'), { type: 'button', className: 'btn ghost', textContent: 'Un’altra' });
      again.onclick = homeQuestion;
      fb.append(again);
      again.focus();
    };
    b.dataset.v = v;
    answers.append(b);
  });
}

/* ---------- Avvio ---------- */

/* Ogni sezione ha il suo indirizzo, così Indietro / Avanti del browser (e lo swipe a due dita del trackpad)
   ripercorrono le sezioni visitate. La Home è l'indirizzo senza #. Il Pokédex ha anche #dex/25, #mosse/…,
   #abilita/…, #strumento/… (pokedex.js, compendio.js); le Regioni #regione/kanto (regioni.js). */
const MODE_HASH = { home: '', quiz: '#quiz', chart: '#tabella', coverage: '#copertura', dex: '#pokedex', regions: '#regioni' };
function modeFromHash(h) {
  if (/^#(dex\/\d+|pokedex|abilita|strument[io]|oggett[io]|moss[ae])/.test(h)) return 'dex'; // #oggetti: vecchio indirizzo
  if (/^#region[ei]/.test(h)) return 'regions';
  return { '#quiz': 'quiz', '#tabella': 'chart', '#copertura': 'coverage' }[h] ?? 'home';
}
// Va a una sezione registrandola nella cronologia; il cambio vero lo fa l'ascoltatore di hashchange qui sotto
function goMode(m) {
  const h = MODE_HASH[m];
  if (h) location.hash = h;
  else { history.pushState(null, '', location.pathname + location.search); setMode('home'); }
}
addEventListener('hashchange', () => {
  const m = modeFromHash(location.hash);
  const cur = isQuiz(state.mode) ? 'quiz' : state.mode;
  // Pokédex e Regioni gestiscono da sé i loro indirizzi interni (pokedex.js, regioni.js), tranne l'ingresso da #pokedex
  if (m === 'dex' ? location.hash === '#pokedex' && cur !== 'dex' : m !== 'regions' && m !== cur) setMode(m);
});

for (const b of document.querySelectorAll('.tabs [data-mode]')) {
  b.onclick = () => {
    const m = b.dataset.mode;
    if (m === 'quiz' ? !isQuiz(state.mode) : m !== state.mode) goMode(m);
  };
}
for (const b of document.querySelectorAll('.quiz-switch [data-quiz]')) {
  b.onclick = () => b.dataset.quiz !== state.mode && setMode(b.dataset.quiz);
}
$('btn-check').onclick = () => {
  if (!isQuiz(state.mode)) return;
  state.checked ? loadNext() : state.q && check();
};
$('btn-skip').onclick = () => loadNext();
$('cov-final').checked = state.covFinal;
$('cov-final').onchange = e => {
  state.covFinal = e.target.checked;
  store.set('cov-final', state.covFinal);
  renderCoverage();
};
$('cov-status').checked = state.covStatus;
$('cov-status').onchange = e => {
  state.covStatus = e.target.checked;
  store.set('cov-status', state.covStatus);
  renderCovMoves();
};
$('cov-forms').checked = state.covForms;
$('cov-forms').onchange = e => {
  state.covForms = e.target.checked;
  store.set('cov-forms', state.covForms);
  renderCoverage();
};

document.addEventListener('keydown', e => {
  if (!isQuiz(state.mode) || !state.q) return;
  if (e.target.closest?.('input, select, textarea, summary') || e.metaKey || e.ctrlKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= state.q.brushes.length) setBrush(state.q.brushes[n - 1]);
  else if (e.key === 'Enter' && !e.target.closest?.('button, a, [role="button"]')) $('btn-check').click();
});

// Pulsante "torna su": compare dopo aver scrollato un po'
const toTop = $('to-top');
if (toTop) {
  const sync = () => toTop.classList.toggle('show', scrollY > 600);
  addEventListener('scroll', sync, { passive: true });
  toTop.onclick = () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  sync();
}

/* ---------- Animazioni di cambio tema e di cambio stile ---------- */
// Entrambe usano le View Transitions: la pagina vecchia resta ferma come immagine e quella nuova
// compare attraverso un ritaglio aggiornato a ogni fotogramma. Senza supporto, o con
// prefers-reduced-motion, il cambio è immediato.
const canTransition = () => !!document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches;
// Regole CSS modificate a ogni fotogramma: toccano solo lo pseudo-elemento della transizione
const vtSheet = document.createElement('style');
vtSheet.textContent = 'html.vt-pix::view-transition-new(root) {} html.vt-style::view-transition-new(root) {}';
document.head.append(vtSheet);
let vtBusy = false, vtNow = null;
function runTransition(cls, dur, update, onFrame, after) {
  vtBusy = true;
  const html = document.documentElement;
  html.style.setProperty('--vt-dur', dur + 'ms');
  html.classList.add(cls);
  onFrame(0);
  const t = vtNow = document.startViewTransition(update);
  t.ready.then(() => {
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / dur); onFrame(k); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }).catch(() => {});
  t.finished.finally(() => { html.classList.remove(cls); after(); vtBusy = false; vtNow = null; });
}
// Un nuovo cambio durante un'animazione: quella in corso finisce subito e parte la nuova
function afterCurrent(next) {
  vtNow?.skipTransition();
  (vtNow?.finished ?? Promise.resolve()).catch(() => {}).finally(() => setTimeout(next));
}

// Notte/giorno (stile Super Mario Maker): un'onda di pixel parte dall'angolo in alto a destra;
// ogni pixel che "scatta" mostra già la pagina nel nuovo tema, crescendo in tre passi (punto, croce, quadrato).
function pixelTransition(update) {
  if (!canTransition()) { update(); return; }
  if (vtBusy) { afterCurrent(() => pixelTransition(update)); return; }
  const rule = vtSheet.sheet.cssRules[0];
  const W = innerWidth, H = innerHeight, T = 14, S = 3;   // pixel da 14 px, ognuno fatto di 3×3 celle
  const cols = Math.ceil(W / T), rows = Math.ceil(H / T), maxD = Math.hypot(cols, rows);
  const delay = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    delay[r * cols + c] = Math.hypot(cols - 1 - c, r) / maxD * .82 + Math.random() * .1;
  }
  const SPREAD = 1800, GROW = 480, DUR = SPREAD + GROW, C = T / S;   // C = lato di una cella, in px
  const f = n => +(n * C).toFixed(2);
  // La pagina nuova si vede attraverso un ritaglio (clip-path) fatto di quadratini; i pixel pieni
  // di una riga sono uniti in un solo rettangolo. Il ritaglio funziona in tutti i browser con le
  // View Transitions, anche dove le maschere sugli pseudo-elementi della transizione non vengono applicate.
  runTransition('vt-pix', DUR, update, k => {
    let d = '';
    for (let r = 0; r < rows; r++) {
      let run = -1;
      const y = r * S;
      for (let c = 0; c <= cols; c++) {
        const p = c < cols ? (k * DUR - delay[r * cols + c] * SPREAD) / GROW : 0;
        if (p >= .66) { if (run < 0) run = c; continue; }
        if (run >= 0) { d += `M${f(run * S)} ${f(y)}H${f(c * S)}V${f(y + S)}H${f(run * S)}Z`; run = -1; }
        if (p <= 0 || c === cols) continue;
        const x = c * S;
        if (p >= .33) d += `M${f(x + 1)} ${f(y)}H${f(x + 2)}V${f(y + S)}H${f(x + 1)}Z M${f(x)} ${f(y + 1)}H${f(x + S)}V${f(y + 2)}H${f(x)}Z`;
        else d += `M${f(x + 1)} ${f(y + 1)}H${f(x + 2)}V${f(y + 2)}H${f(x + 1)}Z`;
      }
    }
    // Un ritaglio vuoto lascerebbe vedere tutta la pagina nuova: all'inizio uso un punto fuori schermo
    rule.style.setProperty('clip-path', `path('${d || 'M-2 -2H-1V-1H-2Z'}')`);
  }, () => rule.style.removeProperty('clip-path'));
}

// Cambio stile: le tre fasce della livrea entrano dall'angolo in alto a sinistra ed escono del tutto
// in basso a destra; il nuovo stile si vede fino al loro bordo destro, calcolato nello stesso fotogramma.
function liveryTransition(update) {
  if (!canTransition()) { update(); return; }
  if (vtBusy) { afterCurrent(() => liveryTransition(update)); return; }
  const rule = vtSheet.sheet.cssRules[1];
  const W = innerWidth, H = innerHeight, TAN = Math.tan(16 * Math.PI / 180);
  const w = .34 * W, lean = TAN * H / 2;            // larghezza delle fasce e spostamento dovuto all'inclinazione
  const x0 = -(w + lean) - 4, x1 = W + lean + 4;    // tutte fuori a sinistra → tutte fuori a destra
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const livery = Object.assign(document.createElement('div'), { className: 'vt-livery' });
  runTransition('vt-style', 1150, () => { update(); document.body.append(livery); }, k => {
    const tx = x0 + (x1 - x0) * ease(k);
    livery.style.transform = `translateX(${tx}px) skewX(-16deg)`;
    const top = tx + w + lean + 1, bottom = tx + w - lean + 1;
    rule.style.setProperty('clip-path', `polygon(0 0, ${top}px 0, ${bottom}px 100%, 0 100%)`);
  }, () => { rule.style.removeProperty('clip-path'); livery.remove(); });
}

// Stile base / anni '70: accende o spegne theme-70s.css e ricorda la scelta
const styleBtn = $('style-toggle');
if (styleBtn) {
  const link = $('style-70s');
  const isRetro = () => document.documentElement.dataset.style !== 'base';
  const paintStyle = () => {
    const r = isRetro();
    styleBtn.setAttribute('aria-pressed', String(r));
    styleBtn.setAttribute('aria-label', r ? 'Passa allo stile semplice' : "Passa allo stile anni '70");
    styleBtn.title = r ? 'Stile semplice' : "Stile anni '70";
  };
  styleBtn.onclick = () => {
    const next = isRetro() ? 'base' : 'retro';
    liveryTransition(() => {
      document.documentElement.dataset.style = next;
      if (link) link.disabled = next === 'base';
      store.set('style', next);
      paintStyle();
      themeBtn?.dispatchEvent(new Event('repaint'));
      document.dispatchEvent(new CustomEvent('pokencarta:style', { detail: next }));
    });
  };
  paintStyle();
}

// Tema chiaro / scuro: segue il sistema finché non lo scegli a mano
const themeBtn = $('theme-toggle');
if (themeBtn) {
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (document.documentElement.dataset.theme || (sysDark.matches ? 'dark' : 'light')) === 'dark';
  const paint = () => {
    const d = isDark();
    themeBtn.setAttribute('aria-pressed', String(d));
    themeBtn.setAttribute('aria-label', d ? 'Passa al tema chiaro' : 'Passa al tema scuro');
    themeBtn.title = d ? 'Tema chiaro' : 'Tema scuro';
    // Colore della barra del browser uguale allo sfondo
    requestAnimationFrame(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bg));
    });
  };
  themeBtn.onclick = () => {
    const next = isDark() ? 'light' : 'dark';
    pixelTransition(() => {
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
      paint();
    });
  };
  sysDark.addEventListener('change', paint);
  themeBtn.addEventListener('repaint', paint);
  paint();
}

// Il nome del sito porta alla Home (al posto del pulsante Home)
document.querySelector('.logo-link').onclick = e => {
  e.preventDefault();
  if (location.hash) history.pushState(null, '', location.pathname + location.search);
  setMode('home');
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};

renderSettings();
prefetch();
// Avvio dopo che tutti gli script (anche pokedex.js) sono stati caricati.
document.addEventListener('DOMContentLoaded', () => {
  // Il sito si apre sulla sezione del suo indirizzo (#tabella, #dex/25, #regione/kanto…), altrimenti sulla Home.
  setMode(modeFromHash(location.hash));
});
