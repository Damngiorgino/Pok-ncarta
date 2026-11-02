// Pokéncarta (tema '70): adesivi fissi sullo sfondo, allo stesso livello delle strisce.
// Gli adesivi con l'artwork ritagliato vengono disegnati una volta su canvas; gli altri sono SVG
// con il bordo carta incluso nel disegno. Essendo fissi, il browser li prepara una sola volta
// e non li ridisegna durante lo scorrimento.
(() => {
  const box = document.getElementById('stickers');
  if (!box) return;
  const ART = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  const SYL = 'ᐊᐃᐅᐳᐱᐸᑕᑎᑐᑲᑭᑯᒪᒥᒧᓇᓂᓄᓴᓯᓱᔭᔨᔪᕋᕆᕈᓚᓕᓗ';
  const alien = n => [...n.toUpperCase()].map(c => c === ' ' ? ' ' : SYL[(c.charCodeAt(0) * 7) % SYL.length]).join('');
  const pad4 = n => String(n).padStart(4, '0');
  const CREAM = '#fbf8f2', INK = '#221d19';
  let uid = 0;

  // Bordo carta + filetto d'inchiostro attorno a una forma SVG (ombra leggera sotto)
  const rim = (shape) => `<g transform="translate(2 3)" fill="rgba(60,40,20,.18)">${shape(4.4)}</g><g fill="${INK}">${shape(4.4)}</g><g fill="${CREAM}">${shape(3)}</g>`;

  const STICKERS = [
    // [lato, fx (0 = bordo schermo, 1 = bordo del contenuto), y% dello schermo, rotazione, larghezza, contenuto]
    // Sinistra: Gengar, Riolu, Charmander · destra: Jirachi, Espeon, Vulpix di Alola
    ['L', .46, 16, -6, 166, () => ({ img: ART(94), kind: 'sagoma', shadow: '#6b4471' })],                                   // Gengar · sagoma
    ['L', .52, 45, -5, 136, () => {                                                                                            // Riolu · francobollo
      const u = ++uid; const d = [];
      for (let i = 0; i < 13; i++) d.push(`<circle cx="${8 + i * 10}" cy="2" r="3.4"/>`, `<circle cx="${8 + i * 10}" cy="158" r="3.4"/>`);
      for (let i = 0; i < 16; i++) d.push(`<circle cx="2" cy="${6 + i * 10}" r="3.4"/>`, `<circle cx="128" cy="${6 + i * 10}" r="3.4"/>`);
      return `<svg viewBox="-6 -6 144 174"><defs><mask id="mf${u}"><rect x="-6" y="-6" width="144" height="174" fill="#fff"/><g fill="#000">${d.join('')}</g></mask></defs>
        <g mask="url(#mf${u})">${rim(o => `<rect x="${-o}" y="${-o}" width="${130 + 2 * o}" height="${160 + 2 * o}"/>`)}<rect width="130" height="160" fill="${CREAM}"/></g>
        <rect x="12" y="12" width="106" height="122" fill="#2f5f9a"/><rect x="18" y="18" width="94" height="110" fill="none" stroke="${CREAM}" stroke-width="1.2"/>
        <image href="${ART(447)}" x="20" y="22" width="90" height="90"/><text x="22" y="124" font-family="Audiowide" font-size="12" fill="${CREAM}">RIOLU</text>
        <text x="108" y="34" text-anchor="end" font-family="Audiowide" font-size="16" fill="#e0b11e">25</text>
        <text class="syl" x="65" y="150" text-anchor="middle" font-size="9" fill="${INK}" letter-spacing="2">ᐳᑫᓀᑲᕐᑕ ᐳᓴᑕ</text>
        <g fill="none" stroke="${INK}" stroke-opacity=".55" stroke-width="1.4"><circle cx="100" cy="98" r="22"/><path d="M70 92 q8 -6 16 0 t16 0 t16 0 t16 0"/><path d="M70 100 q8 -6 16 0 t16 0 t16 0 t16 0"/></g></svg>`;
    }],
    ['L', .46, 73, 5, 128, () => `<div class="stk-patch"><img src="${ART(4)}" alt=""></div>`],                             // Charmander · toppa ricamata
    ['R', .5, 15, 5, 150, () => {                                                                                             // Jirachi · distintivo
      const u = ++uid;
      return `<svg viewBox="-8 -8 156 156"><defs><path id="ra${u}" d="M70 70 m-55 0 a55 55 0 1 1 110 0 a55 55 0 1 1 -110 0"/><clipPath id="ca${u}"><circle cx="70" cy="70" r="42"/></clipPath></defs>
        ${rim(o => `<circle cx="70" cy="70" r="${68 + o}"/>`)}
        <circle cx="70" cy="70" r="68" fill="#5f98ab"/><text class="syl" font-size="12" font-weight="700" fill="${CREAM}" letter-spacing="2"><textPath href="#ra${u}">${alien('Jirachi')} · ᐳᑫᓀᑲᕐᑕ · ${alien('Jirachi')} · ᐳᑫᓀᑲᕐᑕ ·</textPath></text>
        <circle cx="70" cy="70" r="44" fill="${CREAM}" stroke="#d9a51c" stroke-width="4"/><image href="${ART(385)}" x="34" y="34" width="72" height="72" clip-path="url(#ca${u})"/></svg>`;
    }],
    ['R', .46, 44, -7, 150, () => ({ img: ART(196), kind: 'ritaglio' })],                                                    // Espeon · ritaglio
    ['R', .5, 73, -5, 190, () => {                                                                                            // Vulpix di Alola · cartolina
      const u = ++uid;
      return `<svg viewBox="-6 -6 190 130">${rim(o => `<rect x="${-o}" y="${-o}" width="${178 + 2 * o}" height="${118 + 2 * o}" rx="${3 + o}"/>`)}
        <defs><clipPath id="cv${u}"><rect x="8" y="8" width="104" height="102"/></clipPath></defs>
        <rect width="178" height="118" rx="3" fill="${CREAM}"/>
        <g clip-path="url(#cv${u})"><rect x="8" y="8" width="104" height="102" fill="#9fd0e0"/><circle cx="60" cy="96" r="70" fill="#f5e3b3"/><rect x="8" y="78" width="104" height="32" fill="#5fa8c6"/>
          <path d="M22 78 q4 -26 -2 -44 M22 40 q-14 -2 -16 8 M22 40 q14 -4 18 6 M22 40 q-4 -12 -14 -12 M22 40 q6 -12 16 -10" fill="none" stroke="#2f6b3e" stroke-width="3" stroke-linecap="round"/>
          <image href="${ART(10103)}" x="36" y="26" width="78" height="78"/></g>
        <rect x="8" y="8" width="104" height="102" fill="none" stroke="${INK}" stroke-width="1.5"/>
        <rect x="136" y="10" width="32" height="36" fill="#e0b11e" stroke="${INK}" stroke-width="1"/><circle cx="152" cy="28" r="9" fill="none" stroke="${INK}" stroke-width="1.2"/>
        <text x="122" y="66" font-family="Audiowide" font-size="9" fill="#c8553d">SALUTI DA</text><text x="121" y="82" font-family="Audiowide" font-size="11" fill="#1f6f78">ALOLA!</text>
        <g stroke="${INK}" stroke-opacity=".35" stroke-width="1"><path d="M122 94 H170 M122 104 H170"/></g></svg>`;
    }],
  ];

  // Contorno da adesivo disegnato una volta su canvas (per gli artwork ritagliati)
  function dilate(src, r, color, pad, W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const w = W - 2 * pad, h = H - 2 * pad;
    const steps = r > 0 ? Math.max(16, Math.ceil(r * 5)) : 0;
    for (let i = 0; i < steps; i++) {
      const a = i / steps * Math.PI * 2;
      x.drawImage(src, pad + Math.cos(a) * r, pad + Math.sin(a) * r, w, h);
    }
    x.drawImage(src, pad, pad, w, h);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, W, H);
    return c;
  }
  function cutout(holder, { img: src, kind, shadow }, cssW) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let mask;
    img.onload = () => {
      const k = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(cssW * k), h = Math.round(img.naturalHeight / img.naturalWidth * cssW * k);
      const pad = Math.ceil(10 * k), W = w + pad * 2, H = h + pad * 2;
      const base = document.createElement('canvas');
      base.width = w; base.height = h;
      const bx = base.getContext('2d', { willReadFrequently: true });
      bx.drawImage(img, 0, 0, w, h);
      // Solo i pixel ben visibili formano la sagoma: i puntini semi-trasparenti degli artwork
      // non devono diventare macchie nel contorno (e vengono ripuliti dall'immagine).
      try {
        const data = bx.getImageData(0, 0, w, h), d = data.data;
        for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 28 ? 0 : d[i] > 110 ? d[i] : d[i];
        bx.putImageData(data, 0, 0);
        const md = new ImageData(w, h);
        for (let i = 3; i < d.length; i += 4) md.data[i] = d[i] > 110 ? 255 : 0;
        mask = document.createElement('canvas');
        mask.width = w; mask.height = h;
        mask.getContext('2d').putImageData(md, 0, 0);
      } catch { mask = base; }
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      const o = out.getContext('2d');
      if (kind === 'sagoma') {
        o.drawImage(dilate(mask, 3 * k, shadow, pad, W, H), 6 * k, 6 * k);
        o.drawImage(dilate(mask, 3 * k, INK, pad, W, H), 0, 0);
        o.drawImage(dilate(mask, 0, '#f4ecdf', pad, W, H), 0, 0);
      } else {
        o.drawImage(dilate(mask, 4.4 * k, 'rgba(60,40,20,.18)', pad, W, H), 2 * k, 3 * k);
        o.drawImage(dilate(mask, 4.4 * k, INK, pad, W, H), 0, 0);
        o.drawImage(dilate(mask, 3 * k, CREAM, pad, W, H), 0, 0);
        o.drawImage(base, pad, pad);
      }
      out.style.width = '100%';
      holder.append(out);
    };
    img.src = src;
  }

  // Gli adesivi esistono solo nello stile '70: li preparo quando lo stile è acceso (anche più tardi)
  let built = false;
  const build = () => {
    if (built || document.documentElement.dataset.style === 'base') return;
    built = true;
    STICKERS.forEach(([side, fx, y, rot, width, make], i) => {
      const el = document.createElement('div');
      el.className = `stk stk-${side === 'L' ? 'l' : 'r'}`;
      el.style.setProperty('--y', y);
      el.style.setProperty('--fx', fx);
      if (fx < .3) el.dataset.extra = '';   // colonna esterna: solo su schermi molto larghi
      if (y > 80) el.dataset.low = '';      // in basso: nascosto su schermi bassi
      el.style.setProperty('--w', width + 'px');
      el.style.setProperty('--rot', rot + 'deg');
      el.dataset.i = i;
      const content = make();
      if (typeof content === 'string') el.innerHTML = content;
      else cutout(el, content, width);
      box.append(el);
    });
  };
  build();
  document.addEventListener('pokencarta:style', build);
})();
