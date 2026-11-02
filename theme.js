// Pokéncarta (tema anni '70): icone delle categorie di mossa, tonde come i medaglioni.
window.POKENCARTA_CLS_ICON = {
  physical: '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="#c8553d" stroke="#221d19" stroke-width="1.6"/><path d="M11 3.6l1.5 3.2 3.3-1.5-1 3.4 3.5.8-3.1 1.9 2 2.8-3.5-.3-.4 3.4L11 14.8l-2.3 2.5-.4-3.4-3.5.3 2-2.8-3.1-1.9 3.5-.8-1-3.4 3.3 1.5z" fill="#fbf8f2"/><circle cx="11" cy="11.3" r="1.8" fill="#221d19"/></svg>',
  special: '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="#1f6f78" stroke="#221d19" stroke-width="1.6"/><circle cx="11" cy="11" r="6.3" fill="none" stroke="#fbf8f2" stroke-width="1.8"/><circle cx="11" cy="11" r="3.2" fill="none" stroke="#8fb3a0" stroke-width="1.8"/><circle cx="11" cy="11" r="1.1" fill="#fbf8f2"/></svg>',
  status: '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="#9a8f80" stroke="#221d19" stroke-width="1.6"/><circle cx="11" cy="11" r="6" fill="#fbf8f2" stroke="#221d19" stroke-width="1.2"/><path d="M11 5a6 6 0 0 1 0 12a3 3 0 0 1 0-6a3 3 0 0 0 0-6z" fill="#221d19"/></svg>',
};


// Logo "libro da corsa": al cambio scheda il fermaglio si sgancia verso destra, il libro
// si apre, si sfoglia col pollice e si richiude; le pagine e il segnalibro prendono il colore
// della scheda. Ogni parte è una molla (o una pagina con gravità) simulata a passo fisso:
// tempi diversi, urti e ombre che seguono gli oggetti. Con prefers-reduced-motion cambia
// solo il colore. Prototipo: progetto-logo/prototipo-sfogliata.html.
(() => {
  const svg = document.getElementById('brand-book');
  const tabs = document.querySelectorAll('.tabs [data-mode]');
  if (!svg || !tabs.length) return;

  const INK = '#221d19', CREAM = '#fbf8f2', PI = Math.PI;
  const HX = 10, LW = 66, FX = 80, KA = .25, KB = .22, N = 8, GR = 140, DT = 1 / 240;
  const COLORS = { home: '#4f8a6a', quiz: '#c8553d', chart: '#1f6f78', coverage: '#c98a1b', dex: '#8a4f7d' };
  const LINES = [30, 48, 44, 52, 0, 50, 38, 52, 46, 24, 0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const mix = (a, b, t) => {
    const h = x => [1, 3, 5].map(i => parseInt(x.substr(i, 2), 16)), A = h(a), B = h(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const f = n => n.toFixed(2), clamp01 = x => Math.max(0, Math.min(1, x));
  const q = c => svg.querySelector(c);
  const el = {
    book: q('.bk-book'), top: q('.bk-top'), end: q('.bk-end'), rib: q('.bk-rib'), sw: q('.bk-sw'),
    ball: q('.bk-ball'), flap: q('.bk-flap'), fsh: q('.bk-fsh'), leaves: q('.bk-leaves'), spine: q('.bk-spine'),
    gr: q('.bk-gr'), cv: q('.bk-cv'), cvsh: q('.bk-cv > .bk-sh'), fr: q('.bk-fr'), inn: q('.bk-in'), ol: q('.bk-ol'),
    lf: [...svg.querySelectorAll('.bk-lf')].map(g => ({ g, sh: g.querySelector('.bk-sh'), fc: g.querySelector('.bk-fc'), tx: g.querySelector('.bk-tx') })),
  };
  const LK = el.lf.map((_, i) => 'L' + i);

  // Stato: c = copertina, fl = cinghia del fermaglio, L0..L7 = pagine (angoli in radianti),
  // r = segnalibro rientrato (0-1), il resto sono piccoli sussulti.
  const spring = (x, o = {}) => Object.assign({ x, v: 0, t: x, k: 200, d: 20, lo: -1e9, hi: 1e9, e: 0, fo: null, mul: 1, g: 0, pa: 0, pe: 0 }, o);
  const S = {
    time: 0, q: [], open: false, again: false, col: '', next: '', lcol: '', bd: {},
    sp: {
      c: spring(0, { lo: 0, hi: .97 * PI, e: .25 }), fl: spring(0, { lo: 0, hi: .84 * PI, e: .3 }),
      ball: spring(0, { k: 260, d: 12 }), dy: spring(0, { k: 420, d: 16 }), tilt: spring(0, { k: 300, d: 12 }),
      r: spring(0, { lo: 0, hi: 1, e: .25 }), sw: spring(0, { k: 45, d: 3.4 }),
    },
  };
  for (const k of LK) { S.sp[k] = spring(0, { lo: 0, e: .15 }); S.bd[k] = 0; }

  const ev = (t, key, to, k, d) => ({ t, op: 'set', key, to, k, d });
  const closeBook = (t, k, d) => [ev(t, 'c', -.2, k, d), ...LK.map((key, i) => ({ t, op: 'fol', key, mul: 1 - .012 * (N - i), k: 220, d: 24 }))];
  // Apertura completa: fermaglio a destra, copertina, sfogliata (rilasci più fitti a metà), chiusura.
  function riffle() {
    const E = [ev(0, 'fl', .7 * PI, 120, 13), ev(0, 'r', 1, 260, 26), { t: 110, op: 'open' }, ev(110, 'c', .95 * PI, 62, 12),
      // Le pagine si sganciano dalla copertina (in chiusura la seguivano): restano sulla pila finché il pollice non le lancia.
      ...LK.map(key => ev(0, key, 0, 200, 28))];
    const T = (N - 1) * 64;
    let last = 0;
    LK.forEach((key, i) => {
      const u = i / (N - 1);
      last = Math.round(400 + T * (u + .3 * Math.sin(2 * PI * u) / (2 * PI)));
      E.push({ t: last, op: 'flick', key, G: GR, v: 1.15 * Math.sqrt(2 * GR) });
    });
    return [...E, ...closeBook(last + 230, 70, 12)];
  }
  // Cambio scheda a libro già aperto: si richiude subito e poi si riapre con le pagine della nuova scheda.
  const shut = () => closeBook(0, 110, 14);
  const push = list => { S.q.push(...list); S.q.sort((a, b) => a.t - b.t); };
  // Al tonfo di chiusura: nuovo colore, segnalibro che ricade, fermaglio che si riaggancia.
  // Se nel frattempo è stata scelta un'altra scheda, il libro si riapre subito e sfoglia le sue pagine.
  const closed = () => {
    const t = S.time;
    if (S.again) {
      S.again = false;
      S.lcol = S.next;
      push(riffle().map(e => ({ ...e, t: e.t + t + 120 })));
      return;
    }
    push([{ t, op: 'paint' }, ev(t + 20, 'r', 0, 200, 9), ev(t + 60, 'fl', -.25, 130, 13)]);
  };
  function apply(e) {
    const s = S.sp[e.key];
    if (e.op === 'set') Object.assign(s, { t: e.to, k: e.k, d: e.d, fo: null, g: 0, pe: 0 });
    else if (e.op === 'fol') Object.assign(s, { fo: 'c', mul: e.mul, k: e.k, d: e.d, g: 0, pe: 0 });
    // Spinta del pollice per 60 ms, poi solo gravità e un filo d'attrito dell'aria.
    else if (e.op === 'flick') Object.assign(s, { g: e.G, k: 0, d: 1.2, fo: null, pa: (e.v + e.G * .06) / .06, pe: S.time + 60 });
    else if (e.op === 'open') S.open = true;
    else if (e.op === 'paint') S.col = S.next;
  }
  function hit(key, side, im) {
    const P = S.sp;
    if (key === 'c' && side === 'lo' && im > .8) { P.dy.v += im * 3; P.tilt.v += im * 2.2; if (S.open) { S.open = false; closed(); } }
    if (key === 'c' && side === 'hi') P.dy.v += im * 1.2;
    if (key === 'fl' && side === 'lo' && im > .8) { P.ball.v -= im * 22; P.dy.v += im * .8; }
    if (key === 'r' && side === 'lo' && im > .5) P.sw.v += im * 7;
  }
  function step() {
    while (S.q.length && S.q[0].t <= S.time) apply(S.q.shift());
    for (const key in S.sp) {
      const s = S.sp[key], tg = s.fo ? S.sp[s.fo].x * s.mul : s.t;
      const force = s.g ? -s.g * Math.cos(s.x) : -s.k * (s.x - tg);
      s.v += (force - s.d * s.v + (s.pe > S.time ? s.pa : 0)) * DT;
      s.x += s.v * DT;
      if (s.x < s.lo) { s.x = s.lo; if (s.v < 0) { const im = -s.v; s.v = im * s.e; hit(key, 'lo', im); } }
      if (s.x > s.hi) { s.x = s.hi; if (s.v > 0) { const im = s.v; s.v = -im * s.e; hit(key, 'hi', im); } }
    }
    // Le pagine non attraversano la copertina né la pagina sopra; a sinistra si impilano.
    let above = S.sp.c;
    for (const k of LK) {
      const p = S.sp[k], cap = above === S.sp.c ? above.x : above.x - .012 * Math.max(0, -Math.cos(above.x));
      if (p.x > cap) { p.x = cap; if (p.v > above.v) p.v = above.v - (p.v - above.v) * .2; }
      above = p;
    }
    // Piega delle pagine in volo: segue la velocità, smorzata per non scattare.
    for (const k of LK) { const tg = Math.max(-.8, Math.min(.8, .055 * S.sp[k].v)); S.bd[k] += (tg - S.bd[k]) * Math.min(1, DT / .05); }
    S.time += DT * 1000;
  }

  let order = '';
  function render() {
    const P = S.sp, base = S.lcol;
    const front = [mix(base, CREAM, .42), base, mix(base, CREAM, .22)], back = front.map(c => mix(c, INK, .22));
    svg.style.setProperty('--rb', S.col);
    // Anche la pagina sotto le pagine sfogliate e il risguardo della copertina hanno il colore della scheda
    el.top.setAttribute('fill', mix(base, CREAM, .6));
    el.end.setAttribute('fill', mix(base, CREAM, .78));
    // Aprendosi il libro scivola a destra: la copertina aperta resta dentro lo schermo anche col logo al bordo
    el.book.setAttribute('transform', `translate(${f(13 * (1 - Math.cos(P.c.x)))} ${f(P.dy.x)}) rotate(${f(P.tilt.x)} 40 100)`);
    el.rib.setAttribute('transform', `translate(0 ${f(-24 * P.r.x)})`);
    el.sw.setAttribute('transform', `rotate(${f(P.sw.x)} 54.5 92)`);
    el.ball.setAttribute('transform', `rotate(${f(P.ball.x)})`);

    // Cinghia del fermaglio: cerniera sul taglio (x = 80), si ribalta verso destra.
    const fc = Math.cos(P.fl.x), fs = Math.sin(P.fl.x), FA = fc + .12 * fs, FB = .12 * fs, GA = fc - KB * fs, GB = -KB * fs;
    el.flap.setAttribute('transform', `matrix(${f(Math.abs(FA) < .002 ? .002 : FA)} ${f(FB)} 0 1 ${f(FX - FX * FA)} ${f(-FX * FB)})`);
    el.fsh.setAttribute('d', `M${f(FX + (62 - FX) * GA + 1)} ${f(43 + (62 - FX) * GB)}L${FX} 43L${FX} 55L${f(FX + (62 - FX) * GA + 1)} ${f(55 + (62 - FX) * GB)}Z`);

    // Copertina: ruota sulla cerniera del dorso (x = 10) in prospettiva obliqua.
    const th = P.c.x, c = Math.cos(th), s = Math.sin(th), oy = 1.8 * (1 - c), A = c - KA * s, B = -KA * s;
    el.fr.style.display = A >= 0 ? '' : 'none';
    el.inn.style.display = A < 0 ? '' : 'none';
    const m = `matrix(${f(Math.abs(A) < .002 ? .002 : A)} ${f(B)} 0 1 ${f(HX - HX * A)} ${f(-HX * B + oy)})`;
    el.fr.setAttribute('transform', m);
    el.inn.setAttribute('transform', m);
    const map = (A, B) => (x, y) => `${f(HX + (x - HX) * A)} ${f(y + (x - HX) * B + oy)}`;
    const board = p => `M${p(10, 0)}L${p(74, 0)}Q${p(80, 0)} ${p(80, 6)}L${p(80, 86)}Q${p(80, 92)} ${p(74, 92)}L${p(10, 92)}`;
    el.ol.setAttribute('d', board(map(A, B)));
    el.spine.setAttribute('transform', `translate(0 ${f(oy)})`);
    el.cvsh.setAttribute('d', s > .01 ? board(map(c + KB * s, KB * s)) + 'Z' : '');
    el.gr.setAttribute('d', `M${HX} ${f(Math.min(2, oy + 2))}V${f(Math.max(90, oy + 90))}`);

    // Pagine: due metà (la esterna in ritardo = piega), ombra sulla pagina sotto, righe che sfumano.
    const items = [['c', el.cv, A]];
    LK.forEach((k, i) => {
      const L = el.lf[i], t1 = P[k].x;
      L.g.style.display = t1 > .001 || th > .001 ? '' : 'none';
      const above = i ? P[LK[i - 1]].x : th, below = i + 1 < N ? P[LK[i + 1]].x : 0;
      const t2 = Math.max(below, Math.min(above, t1 - S.bd[k])), bend = t1 - t2, h = LW / 2;
      const s2 = Math.max(0, Math.sin(t2)), h1 = h * Math.sin(t1), h2 = h1 + h * s2, dx1 = h * Math.cos(t1), dx2 = dx1 + h * Math.cos(t2);
      const y = 1.6 * (1 - Math.cos(t1)), J = [HX + dx1 - KA * h1, -KA * h1], E = [HX + dx2 - KA * h2, -KA * h2];
      items.push([k, L.g, E[0] - HX]);
      const sheet = (J, E) => `M${HX} ${f(5 + y)}Q${f(J[0])} ${f(5 + y + J[1])} ${f(E[0])} ${f(5 + y + E[1])}L${f(E[0])} ${f(89 + y + E[1])}Q${f(J[0])} ${f(89 + y + J[1])} ${HX} ${f(89 + y)}Z`;
      const gap = t1 - below, ts = t1 - .35 * gap, Jh = h * Math.sin(ts), Eh = Jh + h * Math.max(0, Math.sin(ts - bend));
      const Sj = [HX + h * Math.cos(ts) - KA * Jh + 2, -KA * Jh + 3], Se = [HX + h * Math.cos(ts) + h * Math.cos(ts - bend) - KA * Eh + 2, -KA * Eh + 3];
      const so = .16 * clamp01((gap - .03) / .15);
      L.sh.setAttribute('d', so > 0 ? sheet(Sj, Se) : '');
      L.sh.setAttribute('opacity', f(so));
      const isFront = E[0] >= HX, w = E[0] - HX, to = clamp01((Math.abs(w) / LW - .4) / .35) * clamp01(1 - Math.abs(bend) / .25);
      L.fc.setAttribute('d', sheet(J, E));
      L.fc.setAttribute('fill', isFront ? front[i % 3] : back[i % 3]);
      let d = '';
      if (to > 0) LINES.forEach((n, j) => {
        if (!n) return;
        const u0 = isFront ? 7 : 59 - n, u1 = u0 + n, yy = 14 + j * 7 + y;
        d += `M${f(HX + w * u0 / LW)} ${f(yy + E[1] * u0 / LW)}L${f(HX + w * u1 / LW)} ${f(yy + E[1] * u1 / LW)}`;
      });
      L.tx.setAttribute('d', d);
      L.tx.setAttribute('opacity', f(to * (isFront ? .5 : .3)));
    });
    // Ordine di sovrapposizione: a sinistra la copertina sta sotto, a destra sopra.
    const sorted = [...items.filter(o => o[2] < 0), ...items.filter(o => o[2] >= 0).reverse()];
    const sig = sorted.map(o => o[0]).join();
    if (sig !== order) { order = sig; for (const o of sorted) el.leaves.appendChild(o[1]); el.leaves.appendChild(el.gr); }
  }

  // Ciclo: gira solo mentre c'è qualcosa in movimento.
  let raf = 0, last = 0, acc = 0, until = 0;
  function loop(now) {
    acc += Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    while (acc >= DT) { step(); acc -= DT; }
    render();
    const moving = Object.values(S.sp).some(s => Math.abs(s.v) > .01) || S.q.length;
    raf = moving || S.time < until ? requestAnimationFrame(loop) : 0;
  }

  function paintNow(color) {
    S.col = S.next = S.lcol = color;
    render();
  }
  const bornAt = performance.now();
  function change(color) {
    // Durante il caricamento (es. link diretto a una scheda) il colore arriva senza animazione.
    if (!S.col || reduce.matches || performance.now() - bornAt < 1200) { paintNow(color); return; }
    if (color === S.next) return;
    const isOpen = S.sp.c.x > .05 || LK.some(k => S.sp[k].x > .05);
    // L'orologio della simulazione riparte da zero: le spinte del pollice ancora segnate vanno spente,
    // altrimenti alla sfogliata successiva tutte le pagine partirebbero insieme alla copertina.
    for (const k in S.sp) S.sp[k].pe = 0;
    S.time = 0; S.q = []; S.next = color;
    if (isOpen) { S.open = true; S.again = true; push(shut()); }
    else { S.open = false; S.lcol = color; push(riffle()); }
    until = 400;
    if (!raf) { last = 0; acc = 0; raf = requestAnimationFrame(loop); }
  }

  // app.js segna la scheda attiva con aria-current: la prima volta il colore arriva subito.
  const current = () => [...tabs].find(b => b.getAttribute('aria-current') === 'page');
  const sync = () => { const b = current(); if (b && COLORS[b.dataset.mode]) change(COLORS[b.dataset.mode]); };
  new MutationObserver(sync).observe(document.querySelector('.tabs'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
  sync();
})();
