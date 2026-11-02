// Dati dei tipi (Gen 6+ / Scarlatto-Violetto).
// TYPES: ordine ufficiale, nome italiano, colore SV.
const TYPES = [
  { id: 'normal',   it: 'Normale',    color: '#9FA19F' },
  { id: 'fire',     it: 'Fuoco',      color: '#E62829' },
  { id: 'water',    it: 'Acqua',      color: '#2980EF' },
  { id: 'electric', it: 'Elettro',    color: '#FAC000' },
  { id: 'grass',    it: 'Erba',       color: '#3FA129' },
  { id: 'ice',      it: 'Ghiaccio',   color: '#3DCEF3' },
  { id: 'fighting', it: 'Lotta',      color: '#FF8000' },
  { id: 'poison',   it: 'Veleno',     color: '#9141CB' },
  { id: 'ground',   it: 'Terra',      color: '#915121' },
  { id: 'flying',   it: 'Volante',    color: '#81B9EF' },
  { id: 'psychic',  it: 'Psico',      color: '#EF4179' },
  { id: 'bug',      it: 'Coleottero', color: '#91A119' },
  { id: 'rock',     it: 'Roccia',     color: '#AFA981' },
  { id: 'ghost',    it: 'Spettro',    color: '#704170' },
  { id: 'dragon',   it: 'Drago',      color: '#5060E1' },
  { id: 'dark',     it: 'Buio',       color: '#624D4E' },
  { id: 'steel',    it: 'Acciaio',    color: '#60A1B8' },
  { id: 'fairy',    it: 'Folletto',   color: '#EF70EF' },
];

const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));

const iconUrl = id =>
  `https://cdn.jsdelivr.net/gh/duiker101/pokemon-type-svg-icons@master/icons/${id}.svg`;

// Tipo attaccante -> { se: superefficace x2, nve: poco efficace x0.5, imm: x0 }
const CHART = {
  normal:   { se: [], nve: ['rock', 'steel'], imm: ['ghost'] },
  fire:     { se: ['grass', 'ice', 'bug', 'steel'], nve: ['fire', 'water', 'rock', 'dragon'], imm: [] },
  water:    { se: ['fire', 'ground', 'rock'], nve: ['water', 'grass', 'dragon'], imm: [] },
  electric: { se: ['water', 'flying'], nve: ['electric', 'grass', 'dragon'], imm: ['ground'] },
  grass:    { se: ['water', 'ground', 'rock'], nve: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], imm: [] },
  ice:      { se: ['grass', 'ground', 'flying', 'dragon'], nve: ['fire', 'water', 'ice', 'steel'], imm: [] },
  fighting: { se: ['normal', 'ice', 'rock', 'dark', 'steel'], nve: ['poison', 'flying', 'psychic', 'bug', 'fairy'], imm: ['ghost'] },
  poison:   { se: ['grass', 'fairy'], nve: ['poison', 'ground', 'rock', 'ghost'], imm: ['steel'] },
  ground:   { se: ['fire', 'electric', 'poison', 'rock', 'steel'], nve: ['grass', 'bug'], imm: ['flying'] },
  flying:   { se: ['grass', 'fighting', 'bug'], nve: ['electric', 'rock', 'steel'], imm: [] },
  psychic:  { se: ['fighting', 'poison'], nve: ['psychic', 'steel'], imm: ['dark'] },
  bug:      { se: ['grass', 'psychic', 'dark'], nve: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], imm: [] },
  rock:     { se: ['fire', 'ice', 'flying', 'bug'], nve: ['fighting', 'ground', 'steel'], imm: [] },
  ghost:    { se: ['psychic', 'ghost'], nve: ['dark'], imm: ['normal'] },
  dragon:   { se: ['dragon'], nve: ['steel'], imm: ['fairy'] },
  dark:     { se: ['psychic', 'ghost'], nve: ['fighting', 'dark', 'fairy'], imm: [] },
  steel:    { se: ['ice', 'rock', 'fairy'], nve: ['fire', 'water', 'electric', 'steel'], imm: [] },
  fairy:    { se: ['fighting', 'dragon', 'dark'], nve: ['fire', 'poison', 'steel'], imm: [] },
};

function attackMultiplier(attacker, defender) {
  const row = CHART[attacker];
  if (row.imm.includes(defender)) return 0;
  if (row.se.includes(defender)) return 2;
  if (row.nve.includes(defender)) return 0.5;
  return 1;
}

// Moltiplicatore subito da un Pokémon con i tipi `defTypes` per ogni tipo attaccante.
function defensiveChart(defTypes) {
  const out = {};
  for (const { id } of TYPES) {
    out[id] = defTypes.reduce((m, d) => m * attackMultiplier(id, d), 1);
  }
  return out;
}
