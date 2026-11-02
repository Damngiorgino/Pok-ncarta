// Pokéncarta: scheda Regioni. Elenco delle regioni e pagina di ciascuna: introduzione, starter,
// mappa ufficiale con le città cliccabili e capipalestra per gioco.
// Richiede app.js ($, esc, setMode, state, loadDex, softExtra, monNames, badge, TYPE_BY_ID).
// Indirizzi: #regioni, #regione/kanto. Immagini da Bulbagarden Archives, sprite degli allenatori da Showdown.

// Mappe salvate nel progetto (img/regioni, in WebP) invece che prese ogni volta da Bulbagarden Archives:
// 'x/xy/Nome_File.png' → 'img/regioni/nome-file.webp'
const ARCHIVE_LOCAL = p => 'img/regioni/' + decodeURIComponent(p.split('/').pop()).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.webp';
const TRAINER = n => `https://play.pokemonshowdown.com/sprites/trainers/${n}.png`;
const MON_SPRITE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

// Squadre dei capipalestra di Kanto: [specie, livello]. Uguali in Rosso/Blu e in RossoFuoco/VerdeFoglia.
const KANTO_GYMS = [
  { city: 'pewter', leader: 'Brock', sprite: 'brock', type: 'rock', badge: 'Medaglia Sasso', team: [[74, 12], [95, 14]] },
  { city: 'cerulean', leader: 'Misty', sprite: 'misty', type: 'water', badge: 'Medaglia Cascata', team: [[120, 18], [121, 21]] },
  { city: 'vermilion', leader: 'Lt. Surge', sprite: 'ltsurge', type: 'electric', badge: 'Medaglia Tuono', team: [[100, 21], [25, 18], [26, 24]] },
  { city: 'celadon', leader: 'Erika', sprite: 'erika', type: 'grass', badge: 'Medaglia Arcobaleno', team: [[71, 29], [114, 24], [45, 29]] },
  { city: 'fuchsia', leader: 'Koga', sprite: 'koga', type: 'poison', badge: 'Medaglia Anima', team: [[109, 37], [89, 39], [109, 37], [110, 43]] },
  { city: 'saffron', leader: 'Sabrina', sprite: 'sabrina', type: 'psychic', badge: 'Medaglia Palude', team: [[64, 38], [122, 37], [49, 38], [65, 43]] },
  { city: 'cinnabar', leader: 'Blaine', sprite: 'blaine', type: 'fire', badge: 'Medaglia Vulcano', team: [[58, 42], [77, 40], [78, 42], [59, 47]] },
  { city: 'viridian', leader: 'Giovanni', sprite: 'giovanni', type: 'ground', badge: 'Medaglia Terra', team: [[111, 45], [51, 42], [31, 44], [34, 45], [112, 50]] },
];

const REGIONS_DATA = [
  {
    id: 'kanto', name: 'Kanto', gen: 1, prof: 'Professor Oak', starters: [1, 4, 7], color: '#c8553d',
    games: ['Rosso', 'Blu', 'Giallo', 'RossoFuoco', 'VerdeFoglia', "Let's Go, Pikachu!", "Let's Go, Eevee!"],
    art: 'e/ee/Pok%C3%A9mon_Day_2022_Kanto_Artwork.png',
    map: '7/7d/PE_Kanto_Map.png', mapRatio: 2571 / 1818,
    intro: 'La regione dove tutto è cominciato. Ispirata alla zona del Kantō, in Giappone, è chiusa da montagne a nord e a ovest e affacciata sul mare a sud. Il viaggio parte da Biancavilla, nel laboratorio del Professor Oak, e attraverso otto palestre arriva all’Altopiano Blu, sede della Lega Pokémon. Al centro c’è Zafferanopoli, con la Silph S.p.A. presa d’assalto dal Team Rocket.',
    // Luoghi sulla mappa: posizione in percentuale dell'immagine (mappa di Let's Go, PE_Kanto_Map.png)
    places: [
      { id: 'pallet', name: 'Biancavilla', x: 24.0, y: 62.5, text: 'La città natale del protagonista, con il laboratorio del Professor Oak: qui si sceglie il primo Pokémon.' },
      { id: 'viridian', name: 'Smeraldopoli', x: 24.5, y: 44.5, text: 'La prima città del viaggio. La sua palestra resta chiusa fino alla fine: il capopalestra è Giovanni, capo del Team Rocket.' },
      { id: 'pewter', name: 'Plumbeopoli', x: 24.5, y: 19.5, text: 'Città di pietra ai piedi del Monte Luna, con il Museo della Scienza. Prima palestra.' },
      { id: 'cerulean', name: 'Celestopoli', x: 63.5, y: 17.0, text: 'Città d’acqua a nord, vicino al Ponte Pepita e alla Grotta Celeste.' },
      { id: 'vermilion', name: 'Aranciopoli', x: 63.5, y: 54.5, text: 'Città portuale dove attracca la nave M/N Anna.' },
      { id: 'lavender', name: 'Lavandonia', x: 87.0, y: 36.0, text: 'Piccolo villaggio con la Torre Pokémon, il cimitero dei Pokémon infestato dagli spettri.' },
      { id: 'celadon', name: 'Azzurropoli', x: 47.5, y: 34.5, text: 'La città più grande di Kanto, con il Centro Commerciale e la Sala Giochi, covo del Team Rocket.' },
      { id: 'saffron', name: 'Zafferanopoli', x: 64.5, y: 34.0, text: 'Il cuore della regione: la sede della Silph S.p.A., il Dojo Karate e la palestra degli psichici.' },
      { id: 'fuchsia', name: 'Fucsiapoli', x: 49.0, y: 76.5, text: 'Città a sud con la Zona Safari, dove si catturano Pokémon rari con le Safari Ball.' },
      { id: 'cinnabar', name: 'Isola Cannella', x: 22.0, y: 91.0, text: 'Isola vulcanica con il Laboratorio Pokémon e la Villa Pokémon in rovina.' },
      { id: 'indigo', name: 'Altopiano Blu', x: 12.0, y: 4.5, text: 'La sede della Lega Pokémon: i Superquattro e il Campione aspettano chi ha tutte e otto le medaglie.' },
    ],
    gymGames: [{ id: 'rb', label: 'Rosso e Blu', suffix: '-gen1', gyms: KANTO_GYMS }, ...KANTO_GYM_GAMES],
  },
  { id: 'johto', name: 'Johto', gen: 2, prof: 'Professor Elm', starters: [152, 155, 158], color: '#c98a1b', games: ['Oro', 'Argento', 'Cristallo', 'HeartGold', 'SoulSilver'], map: '6/64/JohtoMap.png', mapRatio: 1961 / 1316,
    intro: 'A ovest di Kanto, ispirata al Kansai e alle sue città antiche: templi, torri in legno e tradizioni. Il viaggio parte da Borgo Foglianova.' },
  { id: 'hoenn', name: 'Hoenn', gen: 3, prof: 'Professor Birch', starters: [252, 255, 258], color: '#1f6f78', games: ['Rubino', 'Zaffiro', 'Smeraldo', 'Rubino Omega', 'Zaffiro Alpha'], map: '8/85/Hoenn_ORAS.png', mapRatio: 1250 / 884,
    intro: 'Una regione tropicale ispirata al Kyūshū, fatta di isole, vulcani e tantissimo mare da attraversare con Surf.' },
  { id: 'sinnoh', name: 'Sinnoh', gen: 4, prof: 'Professor Rowan', starters: [387, 390, 393], color: '#4f6db0', games: ['Diamante', 'Perla', 'Platino', 'Diamante Lucente', 'Perla Splendente'], map: '0/08/Sinnoh_BDSP_artwork.png', mapRatio: 1280 / 905,
    intro: 'Una regione del nord ispirata all’Hokkaidō, divisa in due dal Monte Corona e legata ai miti della creazione.' },
  { id: 'unova', name: 'Unima', gen: 5, prof: 'Professoressa Aralia', starters: [495, 498, 501], color: '#221d19', games: ['Nero', 'Bianco', 'Nero 2', 'Bianco 2'], map: 'f/fc/Unova_B2W2_alt.png', mapRatio: 1280 / 837,
    intro: 'Ispirata all’area di New York, lontana dalle altre regioni: grattacieli, ponti e un’unica grande città al centro, Austropoli.' },
  { id: 'kalos', name: 'Kalos', gen: 6, prof: 'Professor Platan', starters: [650, 653, 656], color: '#2f5f9a', games: ['X', 'Y'], map: '8/8a/Kalos_alt.png', mapRatio: 1032 / 676,
    intro: 'Ispirata alla Francia, con Luminopoli e la sua torre al centro. È la regione delle megaevoluzioni.' },
  { id: 'alola', name: 'Alola', gen: 7, prof: 'Professor Kukui', starters: [722, 725, 728], color: '#d07a3a', games: ['Sole', 'Luna', 'Ultrasole', 'Ultraluna'], map: '0/0b/Alola_USUM_artwork.png', mapRatio: 1280 / 905,
    intro: 'Quattro isole ispirate alle Hawaii. Al posto delle palestre ci sono le prove dei capitani e i Kahuna di ogni isola.' },
  { id: 'galar', name: 'Galar', gen: 8, prof: 'Professoressa Magnolia', starters: [810, 813, 816], color: '#8a4f7d', games: ['Spada', 'Scudo'], map: 'c/ce/Galar_artwork.png', mapRatio: 1554 / 2198,
    intro: 'Ispirata alla Gran Bretagna: le lotte in palestra sono spettacoli negli stadi, con il fenomeno Dynamax.' },
  { id: 'paldea', name: 'Paldea', gen: 9, prof: 'Professoressa Olim / Professor Turum', starters: [906, 909, 912], color: '#4f8a6a', games: ['Scarlatto', 'Violetto'], map: 'f/fd/Paldea_artwork.png', mapRatio: 1280 / 905,
    intro: 'Ispirata alla penisola iberica, è il primo mondo aperto della serie: si esplora liberamente, con la Voragine al centro.' },
];

// Luoghi e palestre delle altre regioni (regioni-dati.js)
for (const r of REGIONS_DATA) if (REGION_EXTRA[r.id]) Object.assign(r, REGION_EXTRA[r.id]);
// Medaglie di Kanto anche negli altri giochi ambientati lì
for (const g of KANTO_GYM_GAMES) for (const gym of g.gyms) gym.badge ??= KANTO_GYMS.find(k => k.city === gym.city)?.badge;

const regState = { game: {}, place: {} };
const regGame = r => r.gymGames?.find(x => x.id === regState.game[r.id]) || r.gymGames?.[0];
const regRoute = () => { const m = location.hash.match(/^#regione\/([\w-]+)/); return m ? m[1] : null; };

function renderRegions() {
  const id = regRoute();
  const r = id && REGIONS_DATA.find(x => x.id === id);
  r ? regionPage(r) : regionList();
}

const regMotion = () => !!window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches;
// Fa comparire gli elementi quando entrano nella finestra scorrendo (una volta sola)
function regReveal(els, build) {
  if (!regMotion() || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); build(e.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  els.forEach(el => { gsap.set(el, { opacity: 0 }); io.observe(el); });
}

// Colori delle versioni di ogni gioco, per le cartucce del selettore
const GAME_COLORS = {
  rb: ['#d8352a', '#2f5fc4'], frlg: ['#e8622a', '#54a63c'], pe: ['#f2c21b', '#b07a45'], hgss: ['#d6a419', '#a9b6c0'],
  gsc: ['#d6a419', '#a9b6c0', '#4fb3d9'], rs: ['#c8243a', '#2753a8'], e: ['#1d9a5c'], oras: ['#c8243a', '#2753a8'],
  dp: ['#4f73c0', '#d79bbd'], pt: ['#7d7f86'], bdsp: ['#4f73c0', '#d79bbd'], bw: ['#26262b', '#ececec'], b2w2: ['#26262b', '#ececec'],
  xy: ['#2f63b5', '#d0303f'], sm: ['#f0a020', '#6c5ce7'], usum: ['#e4701f', '#8b4bb8'], sw: ['#2fa6dc'], sh: ['#d6336c'], sv: ['#e2412d', '#7b3fbf'],
};
function cartridge(id) {
  const c = GAME_COLORS[id] || ['#888'];
  const w = 40 / c.length;
  const stripes = c.map((col, i) => `<rect x="${12 + i * w}" y="20" width="${w}" height="30" fill="${col}"/>`).join('');
  return `<svg class="reg-cart" viewBox="0 0 64 72" aria-hidden="true"><path d="M8 4h40l8 8v56H8z" class="cart-body"/><path d="M14 4v8M20 4v8M26 4v8" class="cart-ridge"/>${stripes}<rect x="12" y="20" width="40" height="30" class="cart-frame"/><path d="M16 60h32" class="cart-ridge"/></svg>`;
}

function regionList() {
  const box = $('regions-view');
  box.innerHTML = '<div class="reg-list"></div>';
  const list = box.querySelector('.reg-list');
  for (const r of REGIONS_DATA) {
    const a = document.createElement('a');
    a.className = 'reg-card';
    a.href = `#regione/${r.id}`;
    a.style.setProperty('--c', r.color);
    a.innerHTML = `<span class="reg-img"><img alt="" loading="lazy" src="${ARCHIVE_LOCAL(r.map)}"></span>
      <span class="reg-txt"><strong>${esc(r.name)}</strong>
      <span class="reg-starters">${r.starters.map(s => `<img src="${MON_SPRITE(s)}" alt="" width="64" height="64" loading="lazy">`).join('')}</span></span>`;
    a.querySelector('.reg-img img').onerror = e => { e.target.remove(); };
    list.append(a);
  }
  scrollTo(0, 0);
}

async function regionPage(r) {
  const box = $('regions-view');
  box.innerHTML = '';
  box.style.setProperty('--c', r.color);
  const cover = REGION_IMG.covers[r.id];

  // Copertina grande, poi nome, descrizione e starter che compaiono scorrendo
  const head = document.createElement('section');
  head.className = 'reg-hero';
  head.innerHTML = `
    <a class="reg-back" href="#regioni">← Tutte le regioni</a>
    <div class="reg-cover"><img alt="Illustrazione di ${esc(r.name)}" src="${cover || ARCHIVE_LOCAL(r.map)}"></div>
    <div class="reg-hero-txt">
      <h2 class="reg-title">${esc(r.name)}</h2>
      <p class="reg-lead"></p>
      <p class="reg-games-line">${r.games.map(esc).join(' · ')}</p>
    </div>
    <div class="reg-starter-row"></div>`;
  head.querySelector('.reg-lead').textContent = r.intro;
  box.append(head);
  if (regMotion()) gsap.fromTo(head.querySelector('.reg-cover'), { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: .7, ease: 'power2.out' });
  regReveal([...head.querySelectorAll('.reg-title, .reg-lead, .reg-games-line')], el => gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' }));

  let dex = [];
  try { [dex] = await Promise.all([loadDex(), softExtra()]); } catch { /* senza nomi italiani */ }
  if (regRoute() !== r.id) return;
  const row = head.querySelector('.reg-starter-row');
  for (const id of r.starters) {
    const mon = dex.find(m => m.id === id);
    const a = document.createElement('a');
    a.className = 'reg-starter';
    a.href = `#dex/${id}`;
    a.innerHTML = `<img src="${ARTWORK(id)}" alt="" width="200" height="200" loading="lazy"><span></span>`;
    a.querySelector('span').textContent = mon ? monNames(mon).it : `Nº ${id}`;
    row.append(a);
  }
  // Gli starter arrivano uno dopo l'altro, crescendo
  regReveal([row], el => {
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(el.children, { opacity: 0, scale: .55, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: .65, ease: 'back.out(1.6)', stagger: .22 });
  });

  // Mappa (solo i pallini) e, sotto, la città scelta con il suo capopalestra
  const map = document.createElement('section');
  map.className = 'reg-map-sec';
  map.innerHTML = `<div class="reg-map" style="aspect-ratio:${r.mapRatio}"><img alt="Mappa di ${esc(r.name)}" src="${ARCHIVE_LOCAL(r.map)}"></div><div class="reg-place" aria-live="polite" hidden></div>`;
  box.append(map);
  if (r.places) {
    const m = map.querySelector('.reg-map');
    for (const p of r.places) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reg-pin';
      b.style.left = p.x + '%';
      b.style.top = p.y + '%';
      b.dataset.place = p.id;
      b.setAttribute('aria-label', p.name);
      // Nome della città sopra il cerchio al passaggio del mouse (sotto, se il cerchio è vicino al bordo alto;
      // allineato al bordo se è vicino ai lati, così la mappa non lo taglia)
      if (p.y < 14) b.classList.add('tip-below');
      if (p.x < 14) b.classList.add('tip-left'); else if (p.x > 86) b.classList.add('tip-right');
      b.innerHTML = `<span class="reg-dot" aria-hidden="true"></span><span class="reg-tip" aria-hidden="true">${esc(p.name)}</span>`;
      b.onclick = () => showPlace(r, p, map);
      m.append(b);
    }
    showPlace(r, r.places.find(p => p.id === (regState.place[r.id] || r.places[0].id)), map, true);
  }

  // Palestre
  if (r.gymGames) {
    const gyms = document.createElement('section');
    gyms.className = 'reg-gyms';
    gyms.innerHTML = '<h3 class="reg-h">Capipalestra</h3><div class="reg-game-switch" role="group" aria-label="Gioco"></div><div class="reg-gym-list"></div>';
    box.append(gyms);
    const sw = gyms.querySelector('.reg-game-switch');
    const draw = animate => {
      const g = regGame(r);
      [...sw.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.game === g.id)));
      gymList(r, g, gyms.querySelector('.reg-gym-list'), dex, animate);
    };
    for (const g of r.gymGames) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'reg-game' });
      b.innerHTML = cartridge(g.id) + `<span>${esc(g.label)}</span>`;
      b.dataset.game = g.id;
      b.onclick = () => {
        regState.game[r.id] = g.id; draw(true);
        const pl = r.places?.find(p => p.id === regState.place[r.id]);
        if (pl) showPlace(r, pl, map, true);
      };
      sw.append(b);
    }
    draw(false);
    regReveal([...gyms.querySelectorAll('.reg-h, .reg-game-switch')], el => gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }));
  }
  scrollTo(0, 0);
}

function showPlace(r, p, map, quiet) {
  regState.place[r.id] = p.id;
  map.querySelectorAll('.reg-pin').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.place === p.id)));
  const box = map.querySelector('.reg-place');
  const g = regGame(r);
  const gym = g?.gyms.find(x => x.city === p.id);
  const cityImg = REGION_IMG.cities[p.id];
  const art = gym && REGION_IMG.leaders[gym.sprite];
  box.hidden = false;
  box.classList.toggle('has-gym', !!gym);
  box.innerHTML = `
    ${cityImg ? `<div class="reg-city-img"><img alt="" src="${cityImg}"></div>` : ''}
    <div class="reg-city-txt"><h4></h4><p class="reg-city-desc"></p>
      ${gym ? `<div class="reg-city-gym"><span class="reg-city-kicker">Capopalestra</span><strong>${esc(gym.leader)}</strong><span class="reg-city-type"></span>${gym.badge ? `<span class="reg-city-badge">${esc(gym.badge)}</span>` : ''}<a class="reg-link" href="#">Vedi la squadra ↓</a></div>` : ''}
    </div>
    ${gym ? `<div class="reg-city-leader"><img alt="${esc(gym.leader)}" src="${art || TRAINER(gym.sprite + (g.suffix || ''))}" class="${art ? '' : 'pix'}"></div>` : ''}`;
  box.querySelector('h4').textContent = p.name;
  const desc = box.querySelector('.reg-city-desc');
  desc.textContent = p.text || '';
  desc.hidden = !p.text;
  box.querySelector('.reg-city-img img')?.addEventListener('error', e => e.target.parentNode.remove());
  const li = box.querySelector('.reg-city-leader img');
  if (li) li.onerror = () => { li.onerror = null; li.src = TRAINER(gym.sprite); li.className = 'pix'; };
  if (gym) {
    box.querySelector('.reg-city-type').append(badge(gym.type));
    box.querySelector('.reg-link').onclick = e => {
      e.preventDefault();
      const card = document.querySelector(`.reg-gym[data-city="${gym.city}"]`);
      if (!card) return;
      openTeam(card, true);
      card.scrollIntoView({ behavior: regMotion() ? 'smooth' : 'auto', block: 'center' });
    };
  }
  if (!quiet && regMotion()) {
    const tl = gsap.timeline();
    tl.fromTo(box, { opacity: .2 }, { opacity: 1, duration: .25, ease: 'power1.out' })
      .fromTo(box.querySelector('.reg-city-img'), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: .45, ease: 'power3.out' }, 0)
      .fromTo(box.querySelector('.reg-city-txt'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out' }, .06)
      .fromTo(box.querySelector('.reg-city-leader'), { opacity: 0, x: 40, scale: .92 }, { opacity: 1, x: 0, scale: 1, duration: .55, ease: 'power3.out' }, .1);
  }
}

// Apre o chiude la squadra di un capopalestra (altezza animata)
function openTeam(card, force) {
  const team = card.querySelector('.reg-team');
  const btn = card.querySelector('.reg-team-btn');
  const open = force ?? !card.classList.contains('open');
  if (open === card.classList.contains('open')) return;
  card.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.querySelector('span').textContent = open ? 'Nascondi la squadra' : 'Vedi la squadra';
  if (!regMotion()) { team.hidden = !open; return; }
  gsap.killTweensOf(team);
  if (open) {
    team.hidden = false;
    gsap.fromTo(team, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .45, ease: 'power3.out', clearProps: 'height' });
    gsap.fromTo(team.children, { opacity: 0, y: 16, scale: .8 }, { opacity: 1, y: 0, scale: 1, duration: .4, ease: 'back.out(1.7)', stagger: .06, delay: .08 });
  } else {
    gsap.to(team, { height: 0, opacity: 0, duration: .3, ease: 'power2.in', onComplete: () => { team.hidden = true; gsap.set(team, { clearProps: 'height,opacity' }); } });
  }
}

function gymList(r, g, out, dex, animate) {
  out.innerHTML = '';
  g.gyms.forEach((gym, i) => {
    const place = r.places?.find(p => p.id === gym.city);
    const c = document.createElement('article');
    c.className = 'reg-gym';
    c.dataset.city = gym.city;
    c.innerHTML = `
      <div class="reg-gym-sprite"><img class="reg-trainer" src="${TRAINER(gym.sprite + g.suffix)}" alt="" width="160" height="160"></div>
      <div class="reg-gym-info">
        <span class="reg-gym-n">Palestra ${i + 1}${place ? ` · ${esc(place.name)}` : ''}</span>
        <strong>${esc(gym.leader)}</strong>
        <span class="reg-gym-type"></span>
        ${gym.badge ? `<span class="reg-gym-badge">${esc(gym.badge)}</span>` : ''}
        <button type="button" class="reg-team-btn" aria-expanded="false"><span>Vedi la squadra</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      </div>
      <div class="reg-team" hidden></div>`;
    const img = c.querySelector('.reg-trainer');
    img.onerror = () => { img.onerror = null; img.src = TRAINER(gym.sprite); };
    c.querySelector('.reg-gym-type').append(badge(gym.type));
    c.querySelector('.reg-team-btn').onclick = () => openTeam(c);
    const team = c.querySelector('.reg-team');
    for (const [id, lv] of gym.team) {
      const mon = dex.find(m => m.id === id);
      const a = document.createElement('a');
      a.className = 'reg-mon';
      a.href = `#dex/${id}`;
      a.innerHTML = `<img src="${MON_SPRITE(id)}" alt="" width="96" height="96" loading="lazy"><span class="reg-mon-name"></span><span class="reg-mon-lv">Liv. ${lv}</span>`;
      a.querySelector('.reg-mon-name').textContent = mon ? monNames(mon).it : `Nº ${id}`;
      team.append(a);
    }
    out.append(c);
  });
  if (animate && regMotion()) gsap.fromTo(out.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out', stagger: .05 });
  else regReveal([...out.children], el => gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }));
}

addEventListener('hashchange', () => {
  if (/^#region[ei]/.test(location.hash)) {
    if (state.mode !== 'regions') setMode('regions');
    else renderRegions();
  }
});
