// Pokéncarta, versione "essenziale": un paesaggio disegnato per ogni tipo, dietro al Pokémon nelle schede del Pokédex
// (scelto da progetto-logo/prototipo-paesaggi.html, versione A). Ogni paesaggio diventa un'immagine SVG in CSS
// (classe .scene.sc-<tipo>): una sola copia per tipo, anche con mille schede.
(() => {
// Paesaggi disegnati in SVG (200×150): illustrazioni stilizzate ma con profondità — più piani che sbiadiscono
// in lontananza, luce e ombre sulle forme, bagliori. Il terreno sta in basso, così il Pokémon ci "poggia" sopra.
const st = s => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const L = (id, s, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${st(s)}</linearGradient>`;
const R = (id, s) => `<radialGradient id="${id}">${st(s)}</radialGradient>`;
const defs = (...g) => `<defs>${g.join('')}</defs>`;
const bg = id => `<rect width="200" height="150" fill="url(#${id})"/>`;
const glow = (id, cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`;
// Stellina a quattro punte
const spark = (x, y, s, c = '#fff', o = 1) => `<path d="M${x} ${y - s} Q${x + s * .18} ${y - s * .18} ${x + s} ${y} Q${x + s * .18} ${y + s * .18} ${x} ${y + s} Q${x - s * .18} ${y + s * .18} ${x - s} ${y} Q${x - s * .18} ${y - s * .18} ${x} ${y - s}Z" fill="${c}" opacity="${o}"/>`;
// Ciuffi d'erba lungo una riga
const tufts = (y, xs, c, h = 7) => `<g stroke="${c}" stroke-width="1.4" stroke-linecap="round" fill="none">${xs.map(x => `<path d="M${x} ${y} q-1 -${h * .6} -3 -${h}M${x} ${y} q0 -${h * .7} 1 -${h * 1.1}M${x} ${y} q1 -${h * .5} 4 -${h * .8}"/>`).join('')}</g>`;

// Ingranaggio: corona di denti e foro al centro
const gear = (cx, cy, r, n, h, fill, hole) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, w = Math.PI / n * .55;
    for (const [ang, rr] of [[a - w, r], [a - w * .7, r + h], [a + w * .7, r + h], [a + w, r]]) pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)} ${(cy + Math.sin(ang) * rr).toFixed(1)}`);
  }
  return `<path d="M${pts.join('L')}Z" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="${r * .62}" fill="none" stroke="${hole}" stroke-width="1.4" opacity=".6"/><circle cx="${cx}" cy="${cy}" r="${r * .26}" fill="${hole}"/>`;
};

const SCENES = {
  // Prateria all'ora d'oro: colline che sbiadiscono, boschetti, prato con ciuffi e fiorellini
  normal: defs(L('s', [[0, '#f7e7c4'], [1, '#f3cf95']]), R('g', [[0, '#fff6d8', .95], [1, '#fff6d8', 0]]),
      L('h', [[0, '#b3bd85'], [1, '#98a46c']]), L('m', [[0, '#93a463'], [1, '#76874a']])) + bg('s') +
    glow('g', 150, 44, 46) + `<circle cx="150" cy="44" r="11" fill="#fde7ad"/>
     <path d="M0 84 Q30 70 62 80 T130 74 T200 80 V150 H0Z" fill="#d8cfa3"/>
     <g fill="#bfc08f"><circle cx="38" cy="80" r="6"/><circle cx="46" cy="79" r="7"/><circle cx="168" cy="76" r="6"/><circle cx="176" cy="78" r="5"/></g>
     <path d="M0 98 Q50 82 104 94 T200 90 V150 H0Z" fill="url(#h)"/>
     <path d="M0 98 Q50 82 104 94 T200 90" stroke="#cfd59f" stroke-width="1.2" fill="none" opacity=".7"/>
     <path d="M0 116 Q70 102 130 112 T200 108 V150 H0Z" fill="url(#m)"/>
     ${tufts(118, [14, 40, 150, 178], '#647540')}
     <path d="M0 134 Q100 124 200 134 V150 H0Z" fill="#687a40"/>
     <g fill="#f8ecc2"><circle cx="30" cy="130" r="1.6"/><circle cx="58" cy="137" r="1.4"/><circle cx="150" cy="132" r="1.6"/><circle cx="176" cy="140" r="1.3"/></g>`,

  // Vulcano al tramonto: cielo arancio, fumo chiaro, cratere che brilla, colate con bagliore, braci
  fire: defs(L('s', [[0, '#c4573a'], [.55, '#ef8b4f'], [1, '#f8c27a']]), R('g', [[0, '#ffe08a', .85], [1, '#ffb35c', 0]]),
      L('v', [[0, '#a8513a'], [1, '#6b3022']], 1, 0), L('l', [[0, '#ffe39a'], [1, '#ff5a1f']])) + bg('s') +
    `<g fill="#8a4a3c" opacity=".45"><ellipse cx="92" cy="34" rx="24" ry="9"/><ellipse cx="110" cy="24" rx="28" ry="10"/><ellipse cx="128" cy="14" rx="32" ry="9"/></g>
     <path d="M0 96 L26 78 L48 90 L60 82 V150 H0Z M200 96 L176 76 L156 90 L142 84 V150 H200Z" fill="#c26a4c" opacity=".7"/>
     ${glow('g', 100, 60, 46)}
     <path d="M14 150 L76 64 Q100 54 124 64 L186 150Z" fill="url(#v)"/>
     <path d="M76 64 L52 108 L70 104 L60 150 L14 150Z" fill="#c06a4e" opacity=".5"/>
     <ellipse cx="100" cy="63" rx="22" ry="4.5" fill="#ffe7a0"/>
     <path d="M95 63 Q88 86 97 104 Q90 122 98 150 L112 150 Q104 122 110 104 Q101 86 106 63Z" fill="#ff8a3d" opacity=".4"/>
     <path d="M97 63 Q91 86 99 104 Q93 124 101 150 L108 150 Q101 123 107 104 Q99 86 104 63Z" fill="url(#l)"/>
     <path d="M0 130 Q30 120 60 128 T130 124 T200 130 V150 H0Z" fill="#5a2a1f"/>
     <path d="M0 130 Q30 120 60 128 T130 124 T200 130" stroke="#ffb066" stroke-width="1.2" fill="none" opacity=".7"/>
     <g fill="#fff0b0"><circle cx="66" cy="40" r="1.4"/><circle cx="132" cy="34" r="1.2"/><circle cx="116" cy="46" r="1"/><circle cx="84" cy="28" r=".9"/><circle cx="148" cy="52" r="1"/><circle cx="56" cy="58" r=".8"/></g>`,

  // Mare: isola lontana, riflesso del sole, onde con luce, battigia di sabbia con schiuma
  water: defs(L('s', [[0, '#94cdea'], [1, '#e8f6fb']]), R('g', [[0, '#fffbe6', .9], [1, '#fffbe6', 0]]),
      L('w', [[0, '#5aaee0'], [1, '#1d5d94']]), L('b', [[0, '#f2deb0'], [1, '#e2c58c']])) + bg('s') +
    glow('g', 52, 40, 34) + `<circle cx="52" cy="40" r="10" fill="#fff4c4"/>
     <g fill="#fff" opacity=".7"><ellipse cx="150" cy="28" rx="20" ry="5"/><ellipse cx="166" cy="24" rx="12" ry="4"/></g>
     <path d="M128 80 Q146 66 168 80Z" fill="#7aaec8"/><path d="M150 72 q2 -10 0 -14 M150 58 q-6 0 -10 4 M150 58 q6 -1 10 3" stroke="#6a9db8" stroke-width="1.4" fill="none"/>
     <rect y="80" width="200" height="70" fill="url(#w)"/>
     <g fill="#fff7d6" opacity=".7"><rect x="46" y="84" width="12" height="1.6" rx=".8"/><rect x="42" y="90" width="20" height="1.6" rx=".8"/><rect x="48" y="97" width="10" height="1.6" rx=".8"/></g>
     <g stroke="#a9d6f0" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"><path d="M90 92 q6 -3 12 0"/><path d="M140 100 q8 -3 16 0"/><path d="M20 104 q6 -3 12 0"/><path d="M110 110 q7 -3 14 0"/></g>
     <path d="M0 124 Q40 116 90 122 T200 118 V150 H0Z" fill="url(#b)"/>
     <path d="M0 124 Q40 116 90 122 T200 118" stroke="#fff" stroke-width="2.4" fill="none" opacity=".85"/>
     <path d="M0 128 Q40 121 90 126 T200 123" stroke="#fff" stroke-width="1" fill="none" opacity=".5"/>`,

  // Temporale elettrico: cielo che vira al giallo, nuvole con il bordo acceso, fulmini ramificati con alone, pianura dorata
  electric: defs(L('s', [[0, '#4a4a5e'], [.55, '#8f8463'], [1, '#e9cf6a']]), R('g', [[0, '#fff6b0', .75], [1, '#fff6b0', 0]]),
      L('c', [[0, '#55566b'], [1, '#7a7466']]), L('p', [[0, '#c9a93c'], [1, '#8a7224']])) + bg('s') +
    glow('g', 70, 70, 56) + glow('g', 150, 60, 34) +
    `<g fill="url(#c)"><ellipse cx="40" cy="18" rx="56" ry="18"/><ellipse cx="150" cy="14" rx="66" ry="20"/><ellipse cx="100" cy="28" rx="50" ry="14"/></g>
     <g fill="none" stroke="#fde68a" stroke-width="1.4" opacity=".8" stroke-linecap="round"><path d="M4 34 Q40 42 86 34"/><path d="M104 30 Q150 38 198 28"/></g>
     <g stroke-linejoin="round" stroke-linecap="round" fill="none">
       <path d="M74 30 L62 54 L72 56 L56 84 L66 86 L52 112 M62 54 L50 62 M56 84 L44 90" stroke="#fff7b8" stroke-width="8" opacity=".35"/>
       <path d="M74 30 L62 54 L72 56 L56 84 L66 86 L52 112 M62 54 L50 62 M56 84 L44 90" stroke="#ffd21a" stroke-width="3.2"/>
       <path d="M74 30 L62 54 L72 56 L56 84 L66 86 L52 112" stroke="#fffde8" stroke-width="1.2"/>
       <path d="M152 26 L144 44 L152 46 L140 70 M144 44 L136 50" stroke="#fff7b8" stroke-width="6" opacity=".3"/>
       <path d="M152 26 L144 44 L152 46 L140 70 M144 44 L136 50" stroke="#ffd21a" stroke-width="2.4"/>
     </g>
     <path d="M0 108 Q60 96 120 106 T200 102 V150 H0Z" fill="#b39a3a"/>
     <path d="M0 120 Q80 110 200 120 V150 H0Z" fill="url(#p)"/>
     <ellipse cx="56" cy="116" rx="46" ry="7" fill="#fff6b0" opacity=".35"/>
     ${tufts(134, [16, 40, 140, 168, 190], '#6e5a1a', 9)}
     <g fill="#fff3a0"><circle cx="30" cy="110" r="1.2"/><circle cx="96" cy="100" r="1"/><circle cx="176" cy="108" r="1.2"/></g>`,

  // Radura nel bosco: fila di alberi lontani, chiome con luce, raggi di sole, prato e cespugli
  grass: defs(L('s', [[0, '#e4f2d2'], [1, '#f6f9e8']]), L('t', [[0, '#a1cd80'], [1, '#6fa452']]),
      L('m', [[0, '#6dab4a'], [1, '#467f2e']]), L('r', [[0, '#fffbe0', .55], [1, '#fffbe0', 0]])) + bg('s') +
    `<path d="M0 86 Q12 70 24 82 Q36 66 50 80 Q64 68 78 82 Q92 70 106 82 Q120 66 136 80 Q150 70 164 82 Q178 68 200 80 V100 H0Z" fill="#bcd8a2"/>
     <path d="M60 0 L84 0 L120 110 L90 110Z" fill="url(#r)"/><path d="M110 0 L124 0 L156 110 L136 110Z" fill="url(#r)" opacity=".7"/>
     <g fill="#6b4a2e"><rect x="20" y="64" width="6" height="46"/><rect x="170" y="58" width="7" height="52"/></g>
     <g fill="url(#t)"><circle cx="23" cy="56" r="20"/><circle cx="10" cy="66" r="12"/><circle cx="36" cy="66" r="12"/><circle cx="173" cy="50" r="22"/><circle cx="160" cy="62" r="13"/><circle cx="188" cy="62" r="13"/></g>
     <g fill="#c4e3a6" opacity=".7"><circle cx="17" cy="48" r="6"/><circle cx="166" cy="42" r="7"/></g>
     <path d="M0 108 Q50 98 100 106 T200 102 V150 H0Z" fill="url(#m)"/>
     <g fill="#3f7a2a"><ellipse cx="40" cy="110" rx="14" ry="7"/><ellipse cx="160" cy="108" rx="16" ry="8"/></g>
     ${tufts(128, [12, 60, 132, 186], '#3a6e26', 7)}
     <path d="M0 136 Q100 128 200 136 V150 H0Z" fill="#3c7228"/>
     <g fill="#fff8d0"><circle cx="28" cy="132" r="1.6"/><circle cx="90" cy="140" r="1.4"/><circle cx="170" cy="134" r="1.6"/></g>
     <g fill="#f3a9c4"><circle cx="50" cy="138" r="1.5"/><circle cx="150" cy="142" r="1.5"/></g>`,

  // Montagne innevate con aurora, facce in luce e in ombra, lago ghiacciato con riflessi, neve
  ice: defs(L('s', [[0, '#bfe0f1'], [1, '#f2fbff']]), L('a', [[0, '#9ff0d6', 0], [.5, '#9ff0d6', .55], [1, '#9fc8f0', 0]], 1, 0),
      L('k', [[0, '#e3f4fa'], [1, '#bfe1ef']])) + bg('s') +
    `<path d="M0 30 Q50 14 100 28 T200 20 V36 Q150 30 100 42 T0 46Z" fill="url(#a)"/>
     <path d="M0 92 L30 62 L50 76 L76 54 L104 84 L130 60 L160 80 L184 64 L200 74 V110 H0Z" fill="#cfe6f1"/>
     <path d="M0 104 L40 50 L66 86 L104 34 L150 96 L176 60 L200 88 V120 H0Z" fill="#a6cfe4"/>
     <path d="M40 50 L66 86 L58 88 L40 66Z M104 34 L150 96 L136 98 L104 52Z M176 60 L200 88 L192 90 L176 72Z" fill="#88b8d2"/>
     <path d="M40 50 L48 61 L42 60 L37 65 L33 59Z M104 34 L116 50 L108 48 L101 54 L94 48Z M176 60 L183 69 L176 67 L171 71Z" fill="#fff"/>
     <path d="M0 112 Q60 104 120 110 T200 108 V150 H0Z" fill="url(#k)"/>
     <g stroke="#fff" stroke-width="1.2" opacity=".8" stroke-linecap="round"><path d="M30 120 h22M120 124 h30M70 132 h18M150 136 h24"/></g>
     <path d="M0 136 Q30 128 60 134 T120 132 T200 136 V150 H0Z" fill="#f7fcff"/>
     <g fill="#fff"><circle cx="20" cy="26" r="1.2"/><circle cx="70" cy="50" r="1"/><circle cx="140" cy="20" r="1.2"/><circle cx="180" cy="44" r="1"/><circle cx="110" cy="66" r=".9"/></g>`,

  // Dojo: parete di carta di riso a riquadri con luce dietro, travi di legno, rotolo appeso, pavimento a doghe con cerchio d'allenamento
  fighting: defs(L('w', [[0, '#f7e9cc'], [1, '#efd9ae']]), L('f', [[0, '#c98f55'], [1, '#9a6334']]), R('g', [[0, '#fff7e0', .8], [1, '#fff7e0', 0]])) +
    `<rect width="200" height="150" fill="url(#w)"/>
     ${glow('g', 60, 50, 50)}${glow('g', 150, 50, 44)}
     <g stroke="#a06a3c" stroke-width="1.6" opacity=".75"><path d="M25 14 V92M50 14 V92M75 14 V92M125 14 V92M150 14 V92M175 14 V92M0 40 H200M0 66 H200"/></g>
     <rect x="0" y="6" width="200" height="9" fill="#6b3f22"/><rect x="0" y="90" width="200" height="6" fill="#6b3f22"/>
     <rect x="94" y="15" width="12" height="75" fill="#7a4828"/>
     <rect x="86" y="22" width="28" height="44" fill="#f8f1df"/><rect x="86" y="22" width="28" height="3" fill="#5a3a22"/><rect x="86" y="63" width="28" height="3" fill="#5a3a22"/>
     <g stroke="#2b1f18" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M96 32 h8 M100 30 v12 M95 46 q5 -3 10 0 M100 46 v10"/></g>
     <circle cx="108" cy="58" r="2.4" fill="#c8553d"/>
     <path d="M0 96 H200 V150 H0Z" fill="url(#f)"/>
     <g stroke="#7e4e28" stroke-width="1" opacity=".7"><path d="M0 108 H200M0 122 H200M0 138 H200M40 96 L28 150M100 96 V150M160 96 L172 150"/></g>
     <ellipse cx="100" cy="124" rx="70" ry="13" fill="none" stroke="#f4e3c4" stroke-width="2.4" opacity=".7"/>
     <ellipse cx="100" cy="124" rx="66" ry="11" fill="#b17644" opacity=".35"/>`,

  // Palude: alberi morti nella nebbia, acqua viola con cerchi, funghi velenosi, bolle con riflesso
  poison: defs(L('s', [[0, '#35204a'], [1, '#7a4e93']]), L('w', [[0, '#8f5ab0'], [1, '#55316d']]),
      R('g', [[0, '#c9f08a', .35], [1, '#c9f08a', 0]])) + bg('s') +
    glow('g', 100, 96, 70) +
    `<g stroke="#4a2c5e" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"><path d="M30 100 V58 M30 76 L18 64 M30 70 L40 58"/><path d="M168 100 V54 M168 72 L180 60 M168 66 L158 56"/></g>
     <g fill="#a982c0" opacity=".28"><ellipse cx="50" cy="96" rx="70" ry="7"/><ellipse cx="160" cy="100" rx="60" ry="6"/></g>
     <path d="M0 100 Q50 94 100 98 T200 96 V150 H0Z" fill="#4a2b5c"/>
     <ellipse cx="100" cy="124" rx="114" ry="20" fill="url(#w)"/>
     <g fill="none" stroke="#c49ade" stroke-width=".9" opacity=".6"><ellipse cx="60" cy="122" rx="10" ry="2.4"/><ellipse cx="140" cy="128" rx="12" ry="2.6"/></g>
     <g fill="#c592dc"><circle cx="58" cy="116" r="4.6"/><circle cx="138" cy="120" r="3.6"/><circle cx="120" cy="110" r="2.4"/></g>
     <g fill="#fff" opacity=".8"><circle cx="56.6" cy="114.4" r="1.2"/><circle cx="137" cy="118.8" r="1"/></g>
     <path d="M14 138 v-8 M10 130 q4 -8 8 0Z" stroke="#e7d4ee" stroke-width="2" fill="#b35bd1"/>
     <path d="M184 140 v-9 M179 131 q5 -9 10 0Z" stroke="#e7d4ee" stroke-width="2" fill="#b35bd1"/>
     <g fill="#f3d7ff"><circle cx="12.5" cy="127.5" r=".9"/><circle cx="185" cy="128" r="1"/></g>`,

  // Deserto: sole con calura, mesas lontane, dune con lato in luce e in ombra, increspature e sassi
  ground: defs(L('s', [[0, '#f6dfae'], [1, '#f0c47f']]), R('g', [[0, '#fff6d6', .9], [1, '#fff6d6', 0]]),
      L('d', [[0, '#e2b06c'], [1, '#c48a47']]), L('e', [[0, '#c9914f'], [1, '#9c6634']])) + bg('s') +
    glow('g', 150, 38, 40) + `<circle cx="150" cy="38" r="12" fill="#fff2c8"/>
     <path d="M0 84 V68 H20 V60 H44 V84Z M190 84 V62 H170 V70 H150 V84Z" fill="#e5bd88"/>
     <path d="M0 96 Q40 72 92 94 T200 86 V150 H0Z" fill="url(#d)"/>
     <path d="M0 96 Q40 72 92 94 Q50 84 0 104Z" fill="#f0c78a" opacity=".6"/>
     <path d="M0 118 Q70 96 136 114 T200 110 V150 H0Z" fill="url(#e)"/>
     <g stroke="#b67b3e" stroke-width="1" fill="none" opacity=".7"><path d="M20 128 q12 -4 24 0M70 124 q12 -4 24 0M130 130 q12 -4 24 0"/></g>
     <path d="M0 138 Q100 128 200 138 V150 H0Z" fill="#956031"/>
     <g fill="#7a4f28"><ellipse cx="34" cy="140" rx="5" ry="2.6"/><ellipse cx="168" cy="142" rx="6" ry="3"/></g>`,

  // Sopra le nuvole: cielo che schiarisce verso l'orizzonte, nuvole morbide e allungate (non a bolle), uccelli
  flying: defs(L('s', [[0, '#72b0e2'], [.65, '#cfe6f8'], [1, '#f7e6cd']]), R('g', [[0, '#fff9e8', .9], [1, '#fff9e8', 0]]),
      L('c', [[0, '#ffffff'], [1, '#d6e5f2']])) + bg('s') +
    glow('g', 156, 66, 42) +
    `<g fill="#fff" opacity=".55"><path d="M10 34 Q40 26 70 32 Q50 36 10 36Z"/><path d="M130 22 Q160 16 190 22 Q164 26 130 24Z"/></g>
     <g stroke="#4c6a88" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M40 52 q4 -4 8 0 q4 -4 8 0"/><path d="M62 44 q3 -3 6 0 q3 -3 6 0"/></g>
     <path d="M0 100 Q30 90 60 96 Q90 86 120 96 Q150 88 200 98 V112 H0Z" fill="#e6f0f9"/>
     <path d="M0 118 Q24 102 52 110 Q72 96 100 108 Q128 96 152 108 Q178 100 200 110 V150 H0Z" fill="url(#c)"/>
     <path d="M0 118 Q24 102 52 110 Q72 96 100 108 Q128 96 152 108 Q178 100 200 110" stroke="#fff" stroke-width="2" fill="none"/>
     <path d="M0 136 Q50 126 100 134 T200 132 V150 H0Z" fill="#fff"/>`,

  // Crepuscolo onirico: luna con anelli, isolotti sospesi con erba rosa, cristalli e scintille
  psychic: defs(L('s', [[0, '#c26d9c'], [.5, '#ef9fbf'], [1, '#fbd9e7']]), R('g', [[0, '#fff0f6', .85], [1, '#fff0f6', 0]]),
      L('i', [[0, '#a85a86'], [1, '#6e3458']]), L('h', [[0, '#e18aad'], [1, '#c46a90']])) + bg('s') +
    glow('g', 100, 42, 40) + `<circle cx="100" cy="42" r="16" fill="#fde9f1"/>
     <ellipse cx="100" cy="42" rx="30" ry="6" fill="none" stroke="#fff" stroke-width="1" opacity=".6"/>
     <path d="M14 60 h34 l-8 6 -6 10 -6 -6 -8 -4Z" fill="url(#i)"/><path d="M14 60 h34" stroke="#f7b9d4" stroke-width="3" stroke-linecap="round"/>
     <path d="M150 48 h38 l-8 6 -8 12 -6 -8 -10 -4Z" fill="url(#i)"/><path d="M150 48 h38" stroke="#f7b9d4" stroke-width="3" stroke-linecap="round"/>
     <path d="M168 48 l4 -10 4 10Z" fill="#fbe0ff"/>
     ${spark(62, 26, 4)}${spark(148, 82, 3)}${spark(30, 92, 2.4, '#fff', .8)}${spark(176, 22, 2.4, '#fff', .8)}
     <path d="M0 112 Q60 98 120 108 T200 104 V150 H0Z" fill="url(#h)"/>
     <path d="M0 132 Q100 122 200 132 V150 H0Z" fill="#b25a82"/>
     <g fill="#f6b8d2"><path d="M30 120 l3 -8 3 8Z"/><path d="M160 116 l4 -10 4 10Z"/></g>`,

  // Sottobosco all'alba: erba alta in controluce, foglie grandi con nervature, rugiada e lucciole
  bug: defs(L('s', [[0, '#eef3c8'], [1, '#e2eaa6']]), L('f', [[0, '#b5c447'], [1, '#7d952a']]), L('m', [[0, '#8ea338'], [1, '#5f7420']]),
      R('g', [[0, '#fff9b0', .9], [1, '#fff9b0', 0]])) + bg('s') +
    `<g stroke="#cbd68a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"><path d="M30 100 Q28 70 36 50M44 100 Q46 76 40 60M150 100 Q154 72 146 52M164 100 Q160 78 168 62M96 100 Q94 84 100 70"/></g>
     <path d="M-10 62 Q30 18 76 40 Q44 76 -10 62Z" fill="url(#f)"/><path d="M-6 60 Q30 44 74 40" stroke="#d6e08a" stroke-width="1.2" fill="none"/>
     <path d="M210 52 Q168 12 124 34 Q158 70 210 52Z" fill="url(#f)"/><path d="M206 50 Q168 38 126 34" stroke="#d6e08a" stroke-width="1.2" fill="none"/>
     <path d="M0 108 Q50 98 100 106 T200 102 V150 H0Z" fill="url(#m)"/>
     ${tufts(140, [10, 26, 44, 152, 170, 188], '#4d5f18', 14)}
     <path d="M0 136 Q100 128 200 136 V150 H0Z" fill="#53661c"/>
     ${glow('g', 60, 86, 5)}${glow('g', 142, 78, 4)}${glow('g', 120, 96, 3.5)}
     <g fill="#fff" opacity=".85"><circle cx="34" cy="46" r="1.4"/><circle cx="164" cy="38" r="1.2"/></g>`,

  // Calanchi con molte rocce: mesas a strati, massi grandi e piccoli con il lato in ombra, ciottoli
  rock: defs(L('s', [[0, '#efe2c4'], [1, '#e3cfa5']]), L('a', [[0, '#bda57b'], [1, '#97805a']]), L('g', [[0, '#9a8560'], [1, '#6e5c3e']])) + bg('s') +
    `<path d="M70 76 V64 H96 V58 H118 V76Z" fill="#d8c7a2"/>
     <path d="M0 100 V52 H38 V68 H60 V100Z" fill="url(#a)"/><path d="M200 100 V46 H164 V62 H144 V100Z" fill="url(#a)"/>
     <g stroke="#8a7350" stroke-width="1" opacity=".7"><path d="M0 62 H38M0 74 H60M0 86 H60M144 70 H200M144 82 H200M164 56 H200"/></g>
     <path d="M38 52 V68 H60 V100" stroke="#e6d2a8" stroke-width="1.2" fill="none"/>
     <g><path d="M70 100 l8 -14 12 -2 8 16Z" fill="#a8916a"/><path d="M90 84 l8 16 h-8Z" fill="#8a7450"/>
        <path d="M120 100 l6 -10 10 0 6 10Z" fill="#a8916a"/><path d="M136 90 l6 10 h-6Z" fill="#8a7450"/></g>
     <path d="M0 106 Q100 96 200 106 V150 H0Z" fill="url(#g)"/>
     <g><path d="M14 132 q2 -18 18 -20 q16 0 20 18 Z" fill="#857150"/><path d="M34 112 q16 0 18 18 h-18Z" fill="#6c5a3c"/>
        <path d="M150 136 q4 -22 24 -24 q20 2 22 24Z" fill="#857150"/><path d="M174 112 q20 2 22 24 h-22Z" fill="#6c5a3c"/>
        <path d="M58 140 q2 -10 10 -10 q8 0 10 10Z" fill="#7a6644"/><path d="M68 130 q8 0 10 10 h-10Z" fill="#5f4f33"/>
        <path d="M124 142 q2 -8 8 -8 q6 0 8 8Z" fill="#7a6644"/></g>
     <g fill="#5c4c32"><ellipse cx="96" cy="140" rx="3" ry="1.6"/><ellipse cx="110" cy="134" rx="2.4" ry="1.3"/><ellipse cx="40" cy="144" rx="3" ry="1.5"/><ellipse cx="186" cy="144" rx="2.6" ry="1.4"/></g>`,

  // Luogo stregato: cielo viola e verde acqua, torre in rovina lontana, lapidi storte, fantasmini trasparenti, fuochi fatui, nebbia
  ghost: defs(L('s', [[0, '#2a1d40'], [.6, '#4d3a6e'], [1, '#5f7f86']]), R('w', [[0, '#c8fff4', .95], [.4, '#7fe0d6', .6], [1, '#9a7bff', 0]]),
      L('f', [[0, '#b9a6e0', 0], [.5, '#b9a6e0', .35], [1, '#b9a6e0', 0]], 1, 0), L('gh', [[0, '#f2ecff', .75], [1, '#f2ecff', 0]])) + bg('s') +
    `<g fill="#1f1630" opacity=".85"><rect x="140" y="30" width="18" height="70"/><path d="M136 32 L149 14 L162 32Z"/><rect x="144" y="44" width="4" height="7" fill="#9be3d8"/><rect x="150" y="60" width="4" height="7" fill="#9be3d8"/></g>
     <path d="M0 100 Q50 90 100 98 T200 94 V150 H0Z" fill="#2c2142"/>
     <path d="M0 86 Q60 76 120 86 T200 80 V96 Q140 90 100 100 T0 100Z" fill="url(#f)"/>
     <g fill="#3e335a"><path d="M24 120 v-14 q8 -8 16 0 v14Z"/><path d="M160 122 v-12 q7 -7 14 0 v12Z" transform="rotate(-6 167 116)"/><path d="M60 124 v-10 q6 -6 12 0 v10Z" transform="rotate(5 66 119)"/></g>
     <g stroke="#5a4c7a" stroke-width="1.2"><path d="M32 110 v6 M29 112 h6"/></g>
     <path d="M0 120 Q100 112 200 120 V150 H0Z" fill="#1d1629"/>
     <g fill="url(#gh)"><path d="M40 70 q0 -14 12 -14 q12 0 12 14 v14 l-4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4Z"/><path d="M164 52 q0 -10 9 -10 q9 0 9 10 v10 l-3 -3 -3 3 -3 -3 -3 3 -3 -3 -3 3Z"/></g>
     <g fill="#2a1d40"><circle cx="48" cy="68" r="1.6"/><circle cx="56" cy="68" r="1.6"/><circle cx="170" cy="51" r="1.2"/><circle cx="176" cy="51" r="1.2"/></g>
     ${glow('w', 92, 64, 7)}${glow('w', 124, 80, 5.5)}${glow('w', 20, 92, 5)}${glow('w', 186, 96, 4.5)}
     <path d="M0 132 Q60 124 120 132 T200 128 V140 Q120 134 60 142 T0 142Z" fill="url(#f)"/>`,

  // Drago: cielo tempestoso porpora e oro, Pilastro antico tra le nuvole, isole sospese, sagoma di drago lontano, vortici di vento
  dragon: defs(L('s', [[0, '#2b1d5a'], [.5, '#6a3f8f'], [1, '#e0a05a']]), R('g', [[0, '#ffd890', .8], [1, '#ffd890', 0]]),
      L('t', [[0, '#7c6aa8'], [1, '#3e3166']], 1, 0), L('c', [[0, '#d8c4ef'], [1, '#9c86c8']])) + bg('s') +
    glow('g', 100, 96, 60) +
    `<path d="M126 34 q10 -6 20 -2 q-6 2 -8 6 q8 -2 14 2 q-8 0 -12 4 q-6 -2 -14 -10Z" fill="#2a1b4a"/>
     <path d="M146 32 q8 -10 18 -10 M146 32 q4 -12 -2 -18" stroke="#2a1b4a" stroke-width="1.6" fill="none"/>
     <path d="M84 104 V40 L92 30 L100 24 L108 30 L116 40 V104Z" fill="url(#t)"/>
     <g fill="#2e2452" opacity=".6"><rect x="88" y="44" width="24" height="3"/><rect x="88" y="62" width="24" height="3"/><rect x="88" y="80" width="24" height="3"/><rect x="97" y="50" width="6" height="9"/></g>
     <path d="M100 24 L108 30 L116 40 V104 H108 V40Z" fill="#2e2452" opacity=".35"/>
     <path d="M18 70 h30 l-6 8 -8 10 -6 -8 -10 -4Z" fill="#4a3a78"/><path d="M18 70 h30" stroke="#b9a3e6" stroke-width="2"/>
     <path d="M156 84 h32 l-7 8 -9 10 -6 -9 -10 -3Z" fill="#4a3a78"/><path d="M156 84 h32" stroke="#b9a3e6" stroke-width="2"/>
     <g fill="none" stroke="#f3d9a0" stroke-width="1.4" opacity=".65" stroke-linecap="round"><path d="M10 50 q30 -12 54 0 q12 6 4 10"/><path d="M134 66 q26 -10 50 2"/></g>
     <path d="M0 112 Q30 100 60 108 Q90 98 120 108 Q150 100 200 110 V150 H0Z" fill="url(#c)"/>
     <path d="M0 132 Q50 122 100 130 T200 128 V150 H0Z" fill="#8c75bb"/>`,

  // Buio: notte con luna e nuvole, nebbia, albero spoglio (senza fuochi fatui)
  dark: defs(L('s', [[0, '#1c152b'], [1, '#43355d']]), R('g', [[0, '#f4ead0', .55], [1, '#f4ead0', 0]])) + bg('s') +
    glow('g', 150, 36, 34) + `<circle cx="150" cy="36" r="13" fill="#efe4c6"/>
     <g fill="#2f2542" opacity=".9"><ellipse cx="136" cy="44" rx="22" ry="4"/><ellipse cx="164" cy="34" rx="16" ry="3"/></g>
     <path d="M0 104 Q50 92 100 100 T200 96 V150 H0Z" fill="#2c2240"/>
     <path d="M36 118 V80 M36 96 L22 82 M36 90 L50 72 M50 72 L56 70 M22 82 L18 84 M36 104 L44 98" stroke="#150f20" stroke-width="3.4" fill="none" stroke-linecap="round"/>
     <g fill="#9a88b8" opacity=".25"><ellipse cx="60" cy="110" rx="70" ry="7"/><ellipse cx="160" cy="118" rx="66" ry="7"/></g>
     <path d="M0 122 Q100 114 200 122 V150 H0Z" fill="#1d1629"/>
     <g fill="#fff" opacity=".7"><circle cx="20" cy="22" r=".8"/><circle cx="80" cy="16" r=".9"/><circle cx="110" cy="30" r=".7"/></g>`,

  // Acciaio: officina di metallo — parete a lastre rivettate, ingranaggi grandi e piccoli, tubi, pavimento a piastre con riflessi
  steel: defs(L('w', [[0, '#9fb2bf'], [1, '#c9d5dd']]), L('m', [[0, '#d7e1e8'], [1, '#8ea3b1']], 1, 1), L('f', [[0, '#8297a6'], [1, '#5d7080']]),
      R('g', [[0, '#ffffff', .55], [1, '#ffffff', 0]])) +
    `<rect width="200" height="150" fill="url(#w)"/>
     <g stroke="#879cab" stroke-width="1.2"><path d="M0 34 H200M0 68 H200M50 0 V100M100 0 V34M150 0 V100M100 68 V100"/></g>
     <g fill="#7b909f">${[[6, 6], [44, 6], [56, 6], [94, 6], [106, 6], [144, 6], [156, 6], [194, 6], [6, 40], [44, 40], [56, 40], [144, 40], [156, 40], [194, 40], [6, 74], [44, 74], [156, 74], [194, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>
     ${glow('g', 70, 30, 40)}
     ${gear(34, 50, 26, 12, 6, 'url(#m)', '#6d8291')}${gear(170, 36, 20, 10, 5, 'url(#m)', '#6d8291')}${gear(146, 74, 13, 8, 4, '#b8c7d1', '#6d8291')}
     <path d="M0 88 H60 q8 0 8 -8 V20" stroke="#6f8494" stroke-width="5" fill="none"/><path d="M0 88 H60 q8 0 8 -8 V20" stroke="#c3d0d9" stroke-width="1.4" fill="none"/>
     <path d="M0 100 H200 V150 H0Z" fill="url(#f)"/>
     <g stroke="#4f6070" stroke-width="1"><path d="M0 116 H200M0 134 H200M40 100 L32 150M100 100 V150M160 100 L168 150"/></g>
     <g fill="#dfe8ee" opacity=".5"><path d="M50 104 h30 l-4 6 h-30Z"/><path d="M120 120 h34 l-4 8 h-34Z"/></g>`,

  // Prato incantato: arcobaleno tenue, colline rosa, fiori a cinque petali, funghetti, scintille
  fairy: defs(L('s', [[0, '#eeaccf'], [1, '#f9d3e6']]), L('h', [[0, '#ec9fc6'], [1, '#d97aab']]), R('g', [[0, '#fff4fa', .7], [1, '#fff4fa', 0]])) + bg('s') +
    glow('g', 40, 30, 26) + glow('g', 160, 40, 22) +
    `<g fill="none" stroke-width="3" opacity=".35"><path d="M20 108 A80 80 0 0 1 180 108" stroke="#ffb3c7"/><path d="M26 108 A74 74 0 0 1 174 108" stroke="#ffe0a6"/><path d="M32 108 A68 68 0 0 1 168 108" stroke="#b9e6c9"/><path d="M38 108 A62 62 0 0 1 162 108" stroke="#b9d3f6"/></g>
     ${spark(40, 30, 4)}${spark(160, 40, 3)}${spark(130, 20, 2.4, '#fff', .8)}${spark(70, 52, 2, '#fff', .8)}
     <path d="M0 104 Q50 88 100 100 T200 96 V150 H0Z" fill="url(#h)"/>
     <path d="M0 126 Q100 114 200 126 V150 H0Z" fill="#cc6c9f"/>
     <g fill="#fff"><g transform="translate(26 134)"><circle cx="0" cy="-3" r="2.2"/><circle cx="2.9" cy="-.9" r="2.2"/><circle cx="1.8" cy="2.4" r="2.2"/><circle cx="-1.8" cy="2.4" r="2.2"/><circle cx="-2.9" cy="-.9" r="2.2"/></g>
        <g transform="translate(172 138)"><circle cx="0" cy="-3" r="2.2"/><circle cx="2.9" cy="-.9" r="2.2"/><circle cx="1.8" cy="2.4" r="2.2"/><circle cx="-1.8" cy="2.4" r="2.2"/><circle cx="-2.9" cy="-.9" r="2.2"/></g></g>
     <g fill="#ffe27a"><circle cx="26" cy="134" r="1.6"/><circle cx="172" cy="138" r="1.6"/></g>
     <path d="M150 128 v-6 M145 122 q5 -8 10 0Z" stroke="#fff3f8" stroke-width="2" fill="#f27fb6"/>
     <g fill="#f9a8cf"><circle cx="60" cy="140" r="2"/><circle cx="120" cy="142" r="2"/><circle cx="92" cy="134" r="1.6"/></g>`,
};
// Ogni paesaggio diventa un'immagine riutilizzabile (una sola copia per tipo, anche con mille schede)
const css = Object.entries(SCENES).map(([t, body]) =>
  `.scene.sc-${t} { --scene: url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">${body}</svg>`)}"); }`).join('\n');
document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
})();
