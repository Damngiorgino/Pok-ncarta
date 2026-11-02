// Pokéncarta — Comparse scorrendo ottimizzate (include #mv-list e limita il carico su liste lunghe).
(() => {
  if (!window.gsap || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const GROUPS = [
    ['#home-view .home-tiles', ':scope > *', 'up'],
    ['#home-view .home-mon', ':scope > *', 'grow'],
    ['#home-view .home-answers', ':scope > *', 'up'],
    ['#quiz-view .grid', ':scope > *', 'pop'],
    ['#chart-view .matrix', ':scope tbody > tr', 'row'],
    ['#chart-view .calc-out', ':scope > *', 'up'],
    ['#coverage-view .cov-counts', ':scope > *', 'pop'],
    ['#coverage-view .cov-group', ':scope .cov-list > *', 'up'],
    ['.dex-detail .evo, .dex-detail .evo-branch, .dex-detail .evo-kids', ':scope > *', 'evo'],
    ['#ab-list, #it-list, #mv-list', ':scope > .cmp-card', 'up'],
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
      const items = (e.target.__items || []).filter(el => el.isConnected);
      const kind = e.target.__kind;
      gsap.to(items, {
        opacity: 1, x: 0, y: 0, scale: 1, duration: kind === 'row' ? .35 : .48,
        ease: kind === 'pop' ? 'back.out(1.7)' : 'power3.out',
        stagger: { amount: Math.min(.5, items.length * (kind === 'row' ? .025 : .045)) },
        clearProps: 'opacity,transform',
      });
    }
  }, { rootMargin: '0px 0px -6% 0px' });

  const scan = root => {
    for (const [sel, child, kind] of GROUPS) {
      const boxes = [...(root.matches?.(sel) ? [root] : []), ...root.querySelectorAll(sel)];
      for (const box of boxes) {
        const allNew = [...box.querySelectorAll(child)].filter(el => !el.__shown);
        if (!allNew.length) continue;
        allNew.forEach(el => { el.__shown = true; });
        // Anima solo i primi 24 elementi del blocco così "Mostra altri (240)" non rallenta mai
        const items = allNew.slice(0, 24);
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