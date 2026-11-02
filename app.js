// Pokéncarta: Versione completa e aggiornata (Quiz, Tabella, Copertura, Pokédex, Compendio, Regioni, Stile Retrô + Motore Pixel Art & UX potenziata)

const MULTS = [
{ v: 4,    label: '×4' },
{ v: 2,    label: '×2' },
{ v: 0.5,  label: '×½' },
{ v: 0.25, label: '×¼' },
{ v: 0,    label: '×0' },
];

const LABEL = Object.fromEntries(MULTS.map(m => [m.v, m.label]));
const SINGLE = [2, 0.5, 0];

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
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const store = {
get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const state = {
mode: 'home',
quizKind: store.get('quiz-kind', 'pokemon'),
brush: 2,
answers: {},
q: null,
checked: false,
loadSeq: 0,
sessions: { pokemon: null, type: null },
covSeq: 0,
dexSeq: 0,
chartSeq: 0,
covOpen: store.get('cov-open', {}),
next: null,
lastType: null,
gens: store.get('gens', [1, 2, 3, 4, 5, 6, 7, 8, 9]),
dir: store.get('dir', 'mix'),
picked: store.get('picked', ['fire']),
cov: store.get('cov', ['fire', 'water', 'ice', 'bug']),
covForms: store.get('cov-forms', false),
covFinal: store.get('cov-final', false),
covStatus: store.get('cov-status', false),
covMoveType: null,
chartForms: store.get('chart-forms', false),
chartListOpen: false,
streak: store.get('quiz-streak', 0),
};

function icon(typeId) {
const t = TYPE_BY_ID[typeId];
const span = document.createElement('span');
span.className = 'ico';
span.style.setProperty('--c', t.color);
const img = document.createElement('img');
img.src = iconUrl(typeId);
img.alt = '';
img.loading = 'lazy';
span.append(img);
return span;
}

function badge(typeId, tag = 'span') {
const t = TYPE_BY_ID[typeId];
const b = document.createElement(tag);
b.className = 'badge';
b.style.setProperty('--c', t.color);
const img = document.createElement('img');
img.src = iconUrl(typeId);
img.alt = '';
img.loading = 'lazy';
b.append(img, document.createTextNode(t.it));
return b;
}

function makeButton(el, label, onclick) {
el.tabIndex = 0;
el.setAttribute('role', 'button');
el.setAttribute('aria-label', label);
el.onclick = onclick;
el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(); } };
}

function setMode(mode) {
if (mode === 'quiz') mode = state.quizKind;
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
state.loadSeq++;
resetQuizUI();
showQuestion(q);
state.answers = { ...answers };
Object.keys(state.answers).forEach(paintTile);
if (checked) check(false);
}

function renderBrushes(values) {
const row = $('brushes');
row.innerHTML = '';
row.style.setProperty('--n', values.length);
values.forEach(v => {
const b = document.createElement('button');
b.type = 'button';
b.className = 'brush' + (state.brush === v ? ' active' : '');
b.style.setProperty('--c', v === 2 ? '#221d19' : v === 4 ? '#c8553d' : v === 0.5 ? '#1f6f78' : v === 0.25 ? '#8a4f7d' : '#8fb3a0');
b.textContent = LABEL[v];
b.setAttribute('aria-pressed', String(state.brush === v));
b.onclick = () => setBrush(v);
row.append(b);
});
}

function setBrush(v) {
state.brush = v;
for (const b of document.querySelectorAll('.brush')) {
const active = Number(b.dataset.v) === v || b.textContent === LABEL[v];
b.classList.toggle('active', active);
b.setAttribute('aria-pressed', String(active));
}
}

function paintTile(typeId) {
const tile = $('grid').querySelector(`[data-type="${typeId}"]`);
if (!tile) return;
const v = state.answers[typeId];
if (v !== undefined) {
tile.dataset.m = v;
tile.querySelector('.tag').textContent = LABEL[v];
} else {
delete tile.dataset.m;
tile.querySelector('.tag').textContent = '';
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

function randomId() {
const gens = state.gens.length ? state.gens : [1];
const [min, max] = GENS[gens[Math.floor(Math.random() * gens.length)] - 1];
return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function loadMon(id, seq) {
const [p, s] = await Promise.all([
cached(`https://pokeapi.co/api/v2/pokemon/${id}`),
cached(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
]);
if (seq !== state.loadSeq) return null;
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
await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = sprite; });
return mon;
}

function dexInfo(p, s) {
const fl = (s.flavor_text_entries ?? []).filter(f => f.language.name === 'it');
const flavor = fl.length ? fl[fl.length - 1].flavor_text.replace(/\s+/g, ' ') : '';
const genus = s.genera?.find(g => g.language.name === 'it')?.genus ?? '';
return {
flavor,
genus,
height: p.height / 10,
weight: p.weight / 10,
};
}

async function loadNext() {
const seq = ++state.loadSeq;
resetQuizUI();
if (state.mode === 'pokemon') {
try {
const mon = await loadMon(randomId(), seq);
if (!mon || seq !== state.loadSeq) return;
pokemonQuestion(mon);
} catch {
if (seq === state.loadSeq) loadNext();
}
} else {
typeQuestion(TYPES[Math.floor(Math.random() * TYPES.length)], state.dir);
}
}

function pokemonQuestion(mon) {
const def = defensiveChart(mon.types);
const truth = Object.fromEntries(TYPES.map(t => [t.id, def[t.id] ?? 1]));
const { it, en } = monNames(mon);
const q = {
kind: 'pokemon',
title: it,
en,
sprite: mon.sprite,
art: mon.art,
truth,
brushes: [4, 2, 0.5, 0.25, 0],
gridLabel: 'Assegna un moltiplicatore ai tipi',
perfect: `Conosci perfettamente le debolezze e le resistenze di ${it}.`,
};
showQuestion(q);
}

function typeQuestion(t, dir) {
const atk = dir === 'atk' || (dir === 'mix' && Math.random() < .5);
const truth = Object.fromEntries(TYPES.map(d => [d.id, atk ? attackMultiplier(t.id, d.id) : attackMultiplier(d.id, t.id)]));
const q = {
kind: 'type',
title: t.it,
typeId: t.id,
atk,
truth,
brushes: [2, 0.5, 0],
gridLabel: 'Assegna l’efficacia ai tipi',
perfect: atk ? `Sai esattamente contro chi è efficace il tipo ${t.it}.` : `Conosci tutte le debolezze e le resistenze del tipo ${t.it}.`,
};
showQuestion(q);
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
$('btn-check').removeAttribute('data-state');
$('grid').innerHTML = '';
$('grid').classList.remove('dim');
$('spinner').classList.add('on');
}

function showQuestion(q) {
state.q = q;
const img = $('sprite');
const hero = $('type-hero');
$('spinner').classList.remove('on');
if (q.kind === 'pokemon') {
hero.hidden = true;
img.hidden = false;
img.onload = () => { img.style.width = Math.round(img.naturalWidth * (q.art ? 1 : 2.2)) + 'px'; };
img.style.width = '';
img.src = q.sprite;
img.alt = q.title;
img.classList.toggle('art', q.art);
const { it, en } = monNames({ name: q.title, en: q.en });
$('mon-name').textContent = it;
$('mon-en').textContent = en;
$('dex').textContent = '';
const typesBox = $('mon-types');
typesBox.innerHTML = '';
TYPES.filter(t => state.q.truth[t.id] !== 1 || true).forEach(() => {});
} else {
img.hidden = true;
hero.hidden = false;
hero.innerHTML = '';
hero.append(badge(q.typeId));
$('mon-name').textContent = TYPE_BY_ID[q.typeId].it;
$('mon-en').textContent = '';
$('dex').textContent = q.atk ? 'Tipo di mossa (attacco)' : 'Tipo di Pokémon (difesa)';
}
$('prompt').textContent = q.kind === 'pokemon' ? 'Quali sono le sue debolezze e resistenze?' : q.atk ? `Quali tipi subiscono danno superefficace o ridotto da ${q.title}?` : `Quali mosse sono superefficaci o poco efficaci contro ${q.title}?`;

const grid = $('grid');
grid.innerHTML = '';
TYPES.forEach(t => {
const cell = document.createElement('button');
cell.type = 'button';
cell.className = 'tile';
cell.dataset.type = t.id;
cell.append(icon(t.id), Object.assign(document.createElement('span'), { className: 'name', textContent: t.it }), Object.assign(document.createElement('span'), { className: 'tag' }));
cell.onclick = () => toggleTile(t.id);
grid.append(cell);
});
$('grid').setAttribute('aria-label', q.gridLabel);
renderBrushes(q.brushes);
$('btn-check').disabled = false;
$('btn-skip').disabled = false;
}

function check(fresh = true) {
const { truth } = state.q;
const issues = [];
for (const t of TYPES) {
const tile = $('grid').querySelector(`[data-type="${t.id}"]`);
tile.classList.add('locked');
const want = truth[t.id] ?? 1;
const v = state.answers[t.id];
const cls = (v === undefined ? 1 : v) === want ? 'ok' : 'wrong';
tile.classList.add(cls);
if (cls !== 'ok') {
issues.push({ id: t.id, want, got: v ?? 1 });
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
: `<h3>${issues.length === 1 ? 'Quasi! Un errore' : `${issues.length} errori`}</h3><p class="result-hint">Nella griglia, accanto a ogni errore, c'è in verde il valore giusto.</p>`;
res.hidden = false;
state.checked = true;
$('btn-check').textContent = 'Prossimo';
$('btn-check').dataset.state = 'next';
if (fresh) {
$('btn-check').focus({ preventScroll: true });
res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
}

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
const names = p.map(id => TYPE_BY_ID[id].it).join(' e ');
const def = defensiveChart(p);
const defCol = document.createElement('section');
defCol.className = 'calc-col';
defCol.innerHTML = `<h3>Se subisce un attacco</h3>`;
defCol.append(matchRows(def, p.length > 1 ? [4, 2, 0.5, 0.25, 0] : [2, 0.5, 0], DEF_WORDS, 'def'));

const atkCol = document.createElement('section');
atkCol.className = 'calc-col';
atkCol.innerHTML = `<h3>Se attacca</h3>`;
const atk = Object.fromEntries(TYPES.map(t => [t.id, p.reduce((acc, id) => Math.max(acc, attackMultiplier(id, t.id)), 0)]));
atkCol.append(matchRows(atk, [2, 0.5, 0], ATK_WORDS, 'atk'));

out.append(defCol, atkCol, chartMonList(p, names));
}

const DEF_WORDS = { 4: 'Molto debole', 2: 'Debole', 1: 'Normale', 0.5: 'Resistente', 0.25: 'Molto resistente', 0: 'Immune' };
const ATK_WORDS = { 2: 'Superefficace', 1: 'Normale', 0.5: 'Poco efficace', 0: 'Nessun effetto' };

function matchRows(chart, values, words, key) {
const wrap = document.createElement('div');
wrap.className = 'calc-rows';
for (const v of values) {
const list = TYPES.filter(t => chart[t.id] === v);
const row = document.createElement('div');
row.className = 'calc-row';
row.dataset.m = v;
row.dataset.row = key + '-' + v;
const label = document.createElement('span');
label.className = 'calc-label';
label.textContent = words[v];
const l = document.createElement('div');
l.className = 'calc-badges';
if (list.length) list.forEach(t => l.append(badge(t.id)));
else l.innerHTML = '<span class="dash">nessuno</span>';
row.append(label, l);
wrap.append(row);
}
return wrap;
}

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
const has = m => picked.every(t => m.types.includes(t));
const list = filterDex(dex, { forms: state.chartForms }).filter(has);
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

const calcFx = window.gsap && window.Flip ? (gsap.registerPlugin(Flip), { tl: null, ghosts: new Set() }) : null;
function animateCalc(update) {
update();
}

function paintMatrixSelection() {
const p = state.picked;
const table = $('matrix');
if (!table.rows.length) return;
for (const th of table.querySelectorAll('.col-h')) {
const t = TYPES[th.dataset.c];
th.classList.toggle('sel', p.includes(t.id));
}
for (const th of table.querySelectorAll('.row-h')) {
const t = TYPES[th.dataset.r];
th.classList.toggle('sel', p.includes(t.id));
}
}

function renderMatrix() {
const table = $('matrix');
let infoBar = $('matrix-live-info');
if (!infoBar) {
infoBar = document.createElement('div');
infoBar.id = 'matrix-live-info';
infoBar.className = 'matrix-live-info';
infoBar.setAttribute('aria-live', 'polite');
infoBar.innerHTML = '<span>Tocca o passa su una casella per leggere l’incrocio esatto</span>';
table.parentElement.before(infoBar);
}

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
makeButton(th, `Seleziona ${t.it}`, () => selectOnly(t.id, false));
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
makeButton(th, `Seleziona ${a.id}`, () => selectOnly(a.id, false));
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

const highlightCell = cell => {
table.querySelectorAll('.hl').forEach(x => x.classList.remove('hl'));
if (!cell) return;
const { r, c } = cell.dataset;
if (r !== undefined) table.querySelectorAll(`[data-r="${r}"]`).forEach(x => x.classList.add('hl'));
if (c !== undefined) table.querySelectorAll(`[data-c="${c}"]`).forEach(x => x.classList.add('hl'));
if (r !== undefined && c !== undefined) {
const a = TYPES[r], d = TYPES[c], m = attackMultiplier(a.id, d.id);
const word = m === 2 ? 'Superefficace' : m === 0.5 ? 'Poco efficace' : m === 0 ? 'Nessun effetto' : 'Danno normale';
infoBar.innerHTML = `<b>${a.it}</b> (attacco) → <b>${d.it}</b> (difesa): <span class="m-pill" data-m="${m}">${LABEL[m] ?? '×1'} · ${word}</span>`;
}
};

table.addEventListener('pointerover', e => highlightCell(e.target.closest('td, th')));
table.addEventListener('click', e => {
const td = e.target.closest('td');
if (td) highlightCell(td);
});
}

function selectOnly(id, scroll = false) {
state.picked = [id];
store.set('picked', state.picked);
renderPicker();
animateCalc(renderCalc);
paintMatrixSelection();
if (scroll) document.querySelector('.calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function monNames(mon) {
return { it: prettyName(mon.name), en: mon.en || '' };
}

const prettyName = slug => slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const spriteUrl = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

function renderCovPicker() {
const box = $('cov-picker');
if (!box) return;
box.innerHTML = '';
for (const t of TYPES) {
const b = badge(t.id, 'button');
b.type = 'button';
b.classList.add('pick');
const on = state.cov.includes(t.id);
b.setAttribute('aria-pressed', String(on));
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
}

function renderSettings() {
const gens = $('gens');
if (!gens) return;
GENS.forEach((_, i) => {
const g = i + 1;
const label = document.createElement('label');
const cb = document.createElement('input');
cb.type = 'checkbox';
cb.checked = state.gens.includes(g);
cb.onchange = () => {
state.gens = cb.checked ? [...state.gens, g].sort((a, b) => a - b) : state.gens.filter(x => x !== g);
store.set('gens', state.gens);
};
label.append(cb, `Gen ${g}`);
gens.append(label);
});
const dirs = $('dirs');
if (!dirs) return;
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

const HOME_TILES = [
['quiz', 'Quiz', 'Indovina debolezze e resistenze di Pokémon e tipi.', '#c8553d'],
['chart', 'Tabella', 'Tutti gli incroci tra i tipi e il calcolatore.', '#1f6f78'],
['coverage', 'Copertura', 'Quali tipi colpisce bene la tua squadra di mosse.', '#c98a1b'],
['dex', 'Pokédex', 'Le schede di tutti i Pokémon, con forme e statistiche.', '#8a4f7d'],
['regions', 'Regioni', 'Mappe, starter e capipalestra di ogni regione.', '#2f5f9a'],
];

const ARTWORK = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

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
const tilesHtml = HOME_TILES.map(([mode, title, desc, color]) => `
    <button type="button" class="home-tile" data-go="${mode}" style="--tc:${color}">
      <strong>${title}</strong>
      <span>${desc}</span>
    </button>`).join('');

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
    <nav class="home-tiles" aria-label="Esplora le sezioni">${tilesHtml}</nav>
    <section class="calc home-quick" id="home-quick" aria-live="polite"></section>`;

view.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => goMode(b.dataset.go); });
homeSearchBox();
homeDay();
}

const home = { dayMon: null, hits: [], active: 0 };
const HOME_KIND = { mon: 0, move: 1, ability: 2, item: 3, leader: 4 };

function foldName(x) {
return (x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

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

function homeMatches(dex, text) {
const q = text.trim().toLowerCase().replace(/^#|^n[º°]\s*/, '');
if (!q) return [];
if (/^\d+$/.test(q)) {
const n = Number(q);
return dex.filter(m => m.id <= 1025 && String(m.id).startsWith(q))
.sort((a, b) => (b.id === n) - (a.id === n) || a.id - b.id)
.slice(0, 8)
.map(m => ({ kind: 'mon', item: m, score: 0 }));
}
const f = foldName(q);
const scored = [];
for (const m of dex.filter(x => x.id <= 1025)) {
const n = monNames(m);
const score = nameScore([n.it, n.en, m.name], f);
if (score < 9) scored.push({ kind: 'mon', item: m, score });
}
scored.sort((a, b) => a.score - b.score || a.item.id - b.item.id);

const per = {}, picked = new Set(), out = [];
for (const h of scored) {
if ((per[h.kind] ?? 0) < 2 && out.length < 8) {
per[h.kind] = (per[h.kind] ?? 0) + 1;
picked.add(h);
out.push(h);
}
}
for (const h of scored) {
if (out.length >= 8) break;
if (!picked.has(h)) out.push(h);
}
return out.sort((a, b) => HOME_KIND[a.kind] - HOME_KIND[b.kind]);
}

function homeOpen(h) {
const it = h.item;
if (h.kind === 'mon') location.hash = `dex/${it.id}`;
}

function homeSearchBox() {
const input = $('home-q'), list = $('home-sugg');
if (!input) return;
input.oninput = async () => {
const text = input.value;
if (!text.trim()) {
list.hidden = true;
list.innerHTML = '';
return;
}
let dex;
try { [dex] = await Promise.all([loadDex(), softExtra()]); } catch { dex = []; }
home.hits = homeMatches(dex, text);
list.hidden = false;
list.innerHTML = home.hits.length ? '' : '<p class="hint">Nessun risultato.</p>';
home.hits.forEach(h => {
const b = document.createElement('button');
b.type = 'button';
b.textContent = h.item.name || h.item.it;
b.onclick = () => homeOpen(h);
list.append(b);
});
};
}

function homeMonCard(mon, kicker) {
home.shownId = mon.id;
const box = $('home-day');
if (!box) return;
const { it } = monNames(mon);
box.innerHTML = `
    <a class="home-mon" href="#dex/${mon.id}">
      <span class="home-art"><img src="${ARTWORK(mon.id)}" alt="" width="260" height="260"></span>
      <span class="home-id">${kicker}</span>
      <strong class="home-name">${it}</strong>
    </a>`;
}

async function homeDay() {
const box = $('home-day');
if (!box) return;
const id = dayMonId();
let mon;
try {
const [dex] = await Promise.all([loadDex(), softExtra()]);
mon = dex.find(m => m.id === id);
} catch {}
if (mon) homeMonCard(mon, `Pokémon del giorno · Nº ${String(id).padStart(4, '0')}`);
}

const MODE_HASH = { home: '', quiz: '#quiz', chart: '#tabella', coverage: '#copertura', dex: '#pokedex', regions: '#regioni' };
function modeFromHash(h) {
if (/^#(dex\/\d+|pokedex|abilita|strument[io]|oggett[io]|moss[ae])/.test(h)) return 'dex';
if (/^#region[ei]/.test(h)) return 'regions';
return { '#quiz': 'quiz', '#tabella': 'chart', '#copertura': 'coverage' }[h] ?? 'home';
}

function goMode(m) {
const h = MODE_HASH[m];
if (h) location.hash = h;
else { history.pushState(null, '', location.pathname + location.search); setMode('home'); }
}

addEventListener('hashchange', () => {
const m = modeFromHash(location.hash);
const cur = isQuiz(state.mode) ? 'quiz' : state.mode;
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

const checkBtn = $('btn-check');
if (checkBtn) {
checkBtn.onclick = () => {
if (!isQuiz(state.mode)) return;
state.checked ? loadNext() : state.q && check();
};
}
const skipBtn = $('btn-skip');
if (skipBtn) skipBtn.onclick = () => loadNext();

/* Pulsante Livrea Anni '70: mantiene sempre attivo lo stile retrô ma esegue l'animazione e ruota i colori */
const styleBtn = $('style-toggle');
if (styleBtn) {
const link = $('style-70s');
let liveryVariant = 0;
document.documentElement.dataset.style = 'retro';
if (link) link.disabled = false;
styleBtn.setAttribute('aria-pressed', 'true');
styleBtn.setAttribute('aria-label', "Sfreccia con la livrea anni '70");
styleBtn.title = "Animazione Livrea Anni '70";

styleBtn.onclick = () => {
if (typeof liveryTransition === 'function') {
liveryTransition(() => {
liveryVariant = (liveryVariant + 1) % 3;
document.documentElement.dataset.style = 'retro';
document.documentElement.dataset.livery = String(liveryVariant);
if (link) link.disabled = false;
store.set('style', 'retro');
document.dispatchEvent(new CustomEvent('pokencarta:style', { detail: 'retro' }));
});
}
};
}

const themeBtn = $('theme-toggle');
if (themeBtn) {
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (document.documentElement.dataset.theme || (sysDark.matches ? 'dark' : 'light')) === 'dark';
const paint = () => {
const d = isDark();
themeBtn.setAttribute('aria-pressed', String(d));
themeBtn.setAttribute('aria-label', d ? 'Passa al tema chiaro' : 'Passa al tema scuro');
};
themeBtn.onclick = () => {
const next = isDark() ? 'light' : 'dark';
document.documentElement.dataset.theme = next;
store.set('theme', next);
paint();
};
paint();
}

document.querySelector('.logo-link')?.addEventListener('click', e => {
e.preventDefault();
if (location.hash) history.pushState(null, '', location.pathname + location.search);
setMode('home');
scrollTo({ top: 0, behavior: 'smooth' });
});

renderSettings();

/* ---------- Quiz: Tasto Pulisci e Contatore Serie (Streak) ---------- */
(() => {
const actions = document.querySelector('#quiz-view .actions');
if (!actions) return;
const clearBtn = Object.assign(document.createElement('button'), {
type: 'button',
id: 'btn-clear',
className: 'btn ghost',
textContent: 'Pulisci',
hidden: true,
});
actions.insertBefore(clearBtn, $('btn-check'));

const streakEl = Object.assign(document.createElement('span'), {
id: 'quiz-streak',
className: 'quiz-streak',
});
document.querySelector('#quiz-view .quiz-switch')?.append(streakEl);

const syncStreak = () => {
streakEl.textContent = state.streak > 0 ? `🔥 ${state.streak} di fila` : '';
streakEl.hidden = state.streak <= 0;
};
syncStreak();

clearBtn.onclick = () => {
if (state.checked || !state.q) return;
const keys = Object.keys(state.answers);
state.answers = {};
keys.forEach(paintTile);
clearBtn.hidden = true;
};

const origPaint = paintTile;
paintTile = function(typeId) {
origPaint(typeId);
clearBtn.hidden = state.checked || Object.keys(state.answers).length === 0;
};

const origReset = resetQuizUI;
resetQuizUI = function() {
origReset();
clearBtn.hidden = true;
};

const origCheck = check;
check = function(fresh = true) {
origCheck(fresh);
clearBtn.hidden = true;
if (fresh) {
const perfect = !$('result').classList.contains('fail');
state.streak = perfect ? state.streak + 1 : 0;
store.set('quiz-streak', state.streak);
syncStreak();
}
};
})();

document.addEventListener('DOMContentLoaded', () => {
setMode(modeFromHash(location.hash));
});
