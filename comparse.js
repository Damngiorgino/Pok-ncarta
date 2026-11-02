// Pokéncarta, versione "essenziale": comparse scorrendo, come nella scheda Regioni.
// Ogni gruppo compare quando entra nella finestra, i suoi elementi uno dopo l'altro. Funziona anche sugli
// elementi creati dopo (un MutationObserver li trova), una volta sola per elemento.
// Con prefers-reduced-motion o senza GSAP non fa nulla.
(() => {
  if (!window.gsap || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // [contenitore, figli da far comparire uno dopo l'altro, come compaiono]
  const GROUPS = [
    ['#home-view .home-tiles', ':scope > *', 'up'],          // Home: le sezioni arrivano una dopo l'altra
    ['#home-view .home-mon', ':scope > *', 'grow'],          // Pokémon del giorno: immagine che cresce, poi il testo
    ['#home-view .home-answers', ':scope > *', 'up'],
    ['#quiz-view .grid', ':scope > *', 'pop'],               // Quiz: le caselle dei tipi in sequenza
    ['#chart-view .matrix', ':scope tbody > tr', 'row'],     // Tabella: le righe si accendono una dopo l'altra
    ['#chart-view .calc-out', ':scope > *', 'up'],
    ['#coverage-view .cov-counts', ':scope > *', 'pop'],     // Copertura: i risultati a cascata
    ['#coverage-view .cov-group', ':scope .cov-list > *', 'up'],
    ['.dex-detail .evo, .dex-detail .evo-branch, .dex-detail .evo-kids', ':scope > *', 'evo'], // evoluzioni
    ['#ab-list, #it-list', ':scope > .cmp-card', 'up'],
  ];
  const FROM = {
    up: { opacity: 0, y: 24 },
    pop: { opacity: 0, scale: .7, y: 10 },
    grow: { opacity: 0, scale: .85 },
    row: { opacity: 0, x: -16 },
    evo: { opacity: 0, x: -20 },
  };
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const items = e.target.__items.filter(el => el.isConnected);
      const kind = e.target.__kind;
      gsap.to(items, {
        opacity: 1, x: 0, y: 0, scale: 1, duration: kind === 'row' ? .35 : .5,
        ease: kind === 'pop' ? 'back.out(1.7)' : 'power3.out',
        stagger: { amount: Math.min(.6, items.length * (kind === 'row' ? .03 : .06)) },
        clearProps: 'opacity,transform',
      });
    }
  }, { rootMargin: '0px 0px -8% 0px' });

  const scan = root => {
    for (const [sel, child, kind] of GROUPS) {
      const boxes = [...(root.matches?.(sel) ? [root] : []), ...root.querySelectorAll(sel)];
      for (const box of boxes) {
        const items = [...box.querySelectorAll(child)].filter(el => !el.__shown);
        if (!items.length) continue;
        items.forEach(el => { el.__shown = true; });
        // Già in vista al momento della creazione (per esempio una nuova domanda del quiz): parte subito
        gsap.set(items, FROM[kind]);
        box.__items = items;
        box.__kind = kind;
        io.observe(box);
      }
    }
  };
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(document.body); });
  }).observe(document.body, { childList: true, subtree: true });
  scan(document.body);
})();
