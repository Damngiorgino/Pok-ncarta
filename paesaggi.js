// Pokéncarta, versione "essenziale": sfondi reali 3D dei giochi Pokémon per ciascuno dei 18 tipi,
// scelti dall'utente in prototipo-10-tipi-G.html per la Scheda G del Pokédex (e usati anche nelle Mosse).
(() => {
  // Evita il blocco hotlink delle immagini ospitate su Bulbagarden Archives
  if (!document.querySelector('meta[name="referrer"]')) {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.append(meta);
  }

  const XY = file => `https://play.pokemonshowdown.com/sprites/gen6bgs/bg-${file}`;

  // I 18 sfondi scelti per ciascun tipo Pokémon
  const SCENES = {
    // 1. Normale — 2 · Prateria di Kalos (3DS · X / Y)
    normal: {
      url: XY('meadow.jpg')
    },
    // 2. Fuoco — 2 · Cratere Magmatico (3DS · Vulcano)
    fire: {
      url: XY('earthycave.jpg'),
      flt: 'sepia(.55) saturate(3) hue-rotate(-25deg) brightness(.95)'
    },
    // 3. Acqua — 1 · Oceano di Hoenn (3DS · OR / AS)
    water: {
      url: XY('orassea.png')
    },
    // 4. Elettro — 4 · Luminopoli Elettrica 3D (Torre Prisma · X / Y)
    electric: {
      url: XY('city.jpg'),
      flt: 'sepia(.45) saturate(2.2) hue-rotate(6deg) brightness(1.04)'
    },
    // 5. Erba — 4 · Giungla Ombrosa (Ibis · 3DS · Sole / Luna)
    grass: {
      url: 'https://archives.bulbagarden.net/media/upload/3/35/Lush_Jungle_SM.png'
    },
    // 6. Ghiaccio — 1 · Caverna Gelata 3D (3DS · X / Y)
    ice: {
      url: XY('icecave.jpg')
    },
    // 7. Lotta — 4 · Tempio Dojo Imperiale 3D (Sala dei Maestri)
    fighting: {
      url: XY('elite4drake.png'),
      flt: 'sepia(.48) saturate(1.65) hue-rotate(4deg) brightness(1.04)'
    },
    // 8. Veleno — 1 · Grotta delle Stalattiti 3D (3DS · X / Y)
    poison: {
      url: XY('dampcave.jpg')
    },
    // 9. Terra — 1 · Deserto di Hoenn 3D (3DS · OR / AS)
    ground: {
      url: XY('orasdesert.jpg')
    },
    // 10. Volante — 6 · Cima Monte Lanakila (3DS · Sole / Luna)
    flying: {
      url: 'https://archives.bulbagarden.net/media/upload/1/16/Mount_Lanakila_SM.png'
    },
    // 11. Psico — 3 · Santuario Psichico 3D (3DS · Astrale)
    psychic: {
      url: XY('leaderwallace.png'),
      flt: 'hue-rotate(115deg) saturate(1.25)'
    },
    // 12. Coleottero — 2 · Sottobosco 3D (3DS · X / Y)
    bug: {
      url: XY('forest.jpg')
    },
    // 13. Roccia — 1 · Grotta Rocciosa 3D (3DS · X / Y)
    rock: {
      url: XY('earthycave.jpg')
    },
    // 14. Spettro — 6 · Bosco di Lecci di Notte (DS · HG / SS)
    ghost: {
      url: 'https://archives.bulbagarden.net/media/upload/f/f7/HGSS_Ilex_Forest-Night.png'
    },
    // 15. Drago — 2 · Arena Torre dei Cieli 3D (3DS · OR / AS)
    dragon: {
      url: XY('skypillar.jpg')
    },
    // 16. Buio — 1 · Prato di Mezzanotte 3D (3DS · X / Y)
    dark: {
      url: XY('darkmeadow.jpg')
    },
    // 17. Acciaio — 2 · Grotta di Ferro 3D (3DS · Miniera)
    steel: {
      url: XY('earthycave.jpg'),
      flt: 'saturate(.2) brightness(1.08) contrast(1.12)'
    },
    // 18. Folletto — 2 · Radura di Romantopoli 3D (3DS · Fatato)
    fairy: {
      url: XY('meadow.jpg'),
      flt: 'hue-rotate(-45deg) saturate(1.15) brightness(1.05)'
    }
  };

  const css = Object.entries(SCENES).map(([t, cfg]) => {
    const fltRule = cfg.flt ? ` --flt: ${cfg.flt};` : '';
    return `.scene.sc-${t} { --scene: url("${cfg.url}");${fltRule} }`;
  }).join('\n');

  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
})();
