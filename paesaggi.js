// Pokéncarta — Motore Paesaggi Pixel Art (18 tipi) + Fusione Dithering per Doppio Tipo.
// Griglia nativa 40×30 pixel (proporzione 4:3 come 200×150) renderizzata con crispEdges:
// zero sfocature, 100% pixel art autentica in stile Pokémon GBA / DS.
// Nei Pokémon con due tipi (e nell'header della scheda Pokédex), il secondo tipo si fonde
// da sinistra a destra usando una maschera di dithering a scacchiera pixelata!

(() => {
  const W = 40, H = 30;

  // Helpers per disegnare in Pixel Art su griglia 40×30
  const px = (x, y, w, h, c, o = 1) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`;

  // Cielo a bande orizzontali + filari di dithering pixelato tra una fascia e l'altra
  const skyBands = (colors, splits = [7, 14, 20]) => {
    let out = '', y0 = 0;
    const all = [...splits, H];
    colors.forEach((c, i) => {
      const y1 = all[i];
      out += px(0, y0, W, y1 - y0, c);
      if (i > 0) {
        for (let x = 0; x < W; x += 2) {
          out += px(x + (y0 % 2), y0, 1, 1, colors[i - 1]);
          if (x % 4 === 0) out += px(x + 1, y0 - 1, 1, 1, c);
        }
      }
      y0 = y1;
    });
    return out;
  };

  // Profilo a gradini (montagne, colline, onde, dune, nuvole) da un array di altezze Y
  const horizon = (ys, c, topHighlight = null) => {
    let out = '';
    for (let x = 0; x < W; x++) {
      const y = ys[x] ?? ys[ys.length - 1];
      out += px(x, y, 1, H - y, c);
      if (topHighlight && y < H) out += px(x, y, 1, 1, topHighlight);
    }
    return out;
  };

  // Albero o pino pixelato
  const pTree = (x, y, cDark, cLight, trunk = '#5a3921') =>
    px(x + 1, y + 4, 2, 3, trunk) +
    px(x, y + 2, 4, 2, cDark) + px(x + 1, y, 2, 2, cDark) +
    px(x + 1, y, 1, 1, cLight) + px(x, y + 2, 2, 1, cLight);

  // Stellina / scintilla a croce in pixel art
  const pStar = (x, y, c = '#ffffff', center = '#fff6a0') =>
    px(x - 1, y, 3, 1, c) + px(x, y - 1, 1, 3, c) + px(x, y, 1, 1, center);

  // Sole / Luna pixel art rotonda
  const pOrb = (cx, cy, r, cMain, cEdge = null) => {
    let out = '';
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= r * r + 1) {
          const edge = cEdge && d2 >= (r - 1) * (r - 1);
          out += px(cx + dx, cy + dy, 1, 1, edge ? cEdge : cMain);
        }
      }
    }
    return out;
  };

  // Ciuffi d'erba o pietrisco sul terreno
  const pDots = (pts, c) => pts.map(([x, y, w = 1, h = 1]) => px(x, y, w, h, c)).join('');

  // I 18 Paesaggi Pixel Art
  const SCENES = {
    // 1. NORMALE: Percorso 1 al tramonto dorato, colline a gradoni, staccionata in legno e fiori
    normal:
      skyBands(['#f6d992', '#f7e6b5', '#fff4d4'], [6, 13, 19]) +
      pOrb(31, 7, 4, '#fffbe0', '#f9c86b') +
      horizon([18,18,17,17,16,16,16,17,17,18,19,19,18,18,17,16,15,15,16,16,17,18,18,19,19,18,17,17,16,16,17,17,18,18,19,19,18,18,17,17], '#b7c67e', '#d6e29c') +
      horizon([21,21,20,20,20,21,21,22,22,22,21,21,20,20,21,21,22,22,23,22,22,21,21,20,20,21,21,22,22,22,21,21,20,20,21,21,22,22,21,21], '#7ea04e', '#a1c168') +
      px(0, 25, 40, 5, '#597d35') + px(0, 25, 40, 1, '#6c9242') +
      // Staccionata Percorso Pokémon
      px(3, 22, 14, 1, '#d8b078') + px(3, 24, 14, 1, '#b58952') +
      px(4, 21, 2, 5, '#8c6239') + px(9, 21, 2, 5, '#8c6239') + px(14, 21, 2, 5, '#8c6239') +
      pDots([[6,27,2,1],[22,26,2,1],[33,28,2,1]], '#fff6c4') +
      pDots([[7,26],[23,27],[34,27]], '#e86a73'),

    // 2. FUOCO: Monte Camino con vulcano eruttante, cielo cremisi, fiume di lava pixelato e braci
    fire:
      skyBands(['#6e1d2a', '#a8332a', '#de652b', '#f4a340'], [5, 10, 16]) +
      // Nuvole di fumo vulcanico
      pDots([[14,2,12,2],[12,4,16,2],[17,1,8,1],[6,5,5,2],[29,4,6,2]], '#4a2228') +
      pDots([[15,3,8,1],[13,5,10,1]], '#783a36') +
      // Montagne lontane e cono del vulcano
      horizon([19,18,17,16,17,18,19,20,19,17,15,13,11,9,8,7,7,7,7,7,7,7,7,8,9,11,13,15,17,19,20,19,18,17,16,17,18,19,20,20], '#4f201d', '#8c3b2b') +
      // Bocca del cratere e colata lavica a zig-zag
      px(16, 6, 8, 2, '#ffea79') + px(15, 7, 10, 1, '#ff9d2e') +
      px(18, 8, 4, 4, '#ffea79') + px(17, 12, 5, 4, '#ff7b24') + px(19, 16, 5, 5, '#ff4d1c') + px(17, 21, 7, 4, '#ff7b24') +
      px(19, 8, 2, 8, '#ffffff') + px(20, 16, 2, 6, '#ffea79') +
      // Rocce in primo piano e fiume di magma alla base
      px(0, 24, 40, 6, '#361515') + px(0, 24, 16, 1, '#8c3b2b') + px(25, 24, 15, 1, '#8c3b2b') +
      px(10, 26, 22, 4, '#e03c1f') + px(13, 27, 16, 2, '#ff9d2e') + px(16, 28, 10, 1, '#ffea79') +
      pDots([[8,10],[11,6],[27,8],[31,12],[6,14],[33,6]], '#ffea79'),

    // 3. ACQUA: Mare di Hoenn in pixel art, isola con palma, onde bianche spumeggianti e sabbia
    water:
      skyBands(['#4ea6dc', '#7bc4ec', '#b6e3f8'], [6, 12, 17]) +
      pOrb(8, 6, 3, '#fff9c4', '#ffe07d') +
      // Nuvoletta pixel
      pDots([[24,4,9,2],[26,3,5,1],[22,5,13,1]], '#ffffff') +
      pDots([[22,6,13,1]], '#cae8f8') +
      // Isolotto con palma all'orizzonte
      pDots([[27,14,8,3],[29,13,4,1]], '#5c9c54') + pDots([[26,16,10,1]], '#e8cf8c') +
      px(31, 10, 1, 4, '#8c5a32') + pDots([[29,9,5,1],[28,10,2,1],[33,10,2,1]], '#3f8242') +
      // Oceano a fasce
      px(0, 17, 40, 9, '#1f6fa8') + px(0, 17, 40, 2, '#3890c8') + px(0, 22, 40, 4, '#165382') +
      // Riflesso solare e creste delle onde in pixel
      pDots([[6,18,5,1],[7,20,3,1],[5,22,6,1],[8,24,2,1]], '#fff6b3') +
      pDots([[16,19,5,1],[28,21,6,1],[12,23,5,1],[33,18,4,1]], '#8ad4f5') +
      // Schiuma e spiaggia
      horizon([25,25,26,26,26,25,25,25,26,26,26,25,25,25,26,26,25,25,25,26,26,26,25,25,25,26,26,25,25,25,26,26,26,25,25,25,26,26,25,25], '#ffffff') +
      horizon([26,26,27,27,27,26,26,26,27,27,27,26,26,26,27,27,26,26,26,27,27,27,26,26,26,27,27,26,26,26,27,27,27,26,26,26,27,27,26,26], '#f2d694', '#7ad0f0'),

    // 4. ELETTRO: Centrale Elettrica / Temporale con saette pixelate, nuvole nere e prateria carica
    electric:
      skyBands(['#272940', '#3d3f5c', '#69625c', '#c9a842'], [6, 12, 18]) +
      // Nuvole temporalesche in alto
      pDots([[0,0,40,4],[2,4,14,2],[20,4,18,2],[6,6,8,1],[24,6,10,1]], '#1b1c2e') +
      pDots([[3,5,12,1],[21,5,14,1]], '#f5d442') +
      // Grande fulmine a gradini a sinistra e secondo fulmine a destra
      pDots([[11,5,2,2],[10,7,2,2],[9,9,4,1],[11,10,2,2],[10,12,2,2],[8,14,4,1],[10,15,2,3],[9,18,2,3]], '#ffe838') +
      pDots([[11,6,1,3],[11,10,1,4],[10,15,1,4]], '#ffffff') +
      pDots([[30,6,2,2],[29,8,3,1],[30,9,2,3],[28,12,2,3]], '#ffe838') +
      // Traliccio / antenna in lontananza
      px(35, 13, 1, 7, '#272940') + px(33, 13, 5, 1, '#272940') + px(34, 16, 3, 1, '#272940') +
      // Pianura dorata elettrizzata
      horizon([20,20,19,19,20,20,21,21,20,20,19,19,20,21,21,20,20,19,19,20,20,21,21,20,20,19,20,20,21,21,20,20,19,19,20,20,21,21,20,20], '#9e8424', '#e8c84b') +
      px(0, 24, 40, 6, '#695614') + px(6, 21, 8, 2, '#fff799') +
      pDots([[4,16],[16,13],[25,15],[32,18]], '#fff799'),

    // 5. ERBA: Bosco Smeraldo con chiome frondose a blocchi, fasci di luce e fiori di campo
    grass:
      skyBands(['#b8e3a8', '#d7f2c2', '#eef9d8'], [6, 13, 19]) +
      // Alberi sullo sfondo
      px(0, 10, 40, 12, '#5a9444') +
      // Tronchi
      px(4, 12, 3, 11, '#5e3c23') + px(15, 13, 2, 10, '#5e3c23') + px(26, 13, 2, 10, '#5e3c23') + px(34, 11, 3, 12, '#5e3c23') +
      // Chiome d'albero in primo piano
      pDots([[0,0,14,9],[2,9,10,3],[12,0,16,7],[14,7,12,2],[26,0,14,9],[28,9,10,3]], '#2f6327') +
      pDots([[1,1,10,5],[14,1,12,4],[28,1,10,5]], '#4a8538') +
      pDots([[2,2,6,2],[16,2,8,2],[29,2,6,2]], '#74b553') +
      // Raggi di sole filtranti in pixel (con trasparenza)
      px(18, 7, 3, 14, '#fff9b3', 0.35) + px(21, 9, 2, 12, '#fff9b3', 0.25) +
      // Radura erbosa
      horizon([21,21,20,20,21,21,22,21,21,20,20,21,21,22,22,21,21,20,20,21,21,22,21,21,20,20,21,21,22,22,21,21,20,20,21,21,22,21,21,20], '#4a8538', '#74b553') +
      px(0, 25, 40, 5, '#346627') +
      pDots([[5,24],[12,26],[22,24],[30,26],[36,24]], '#fff49c') +
      pDots([[8,27],[19,26],[27,28],[33,25]], '#f582ae'),

    // 6. GHIACCIO: Vetta Polare con aurora boreale pixelata, picchi innevati e lastra di ghiaccio
    ice:
      skyBands(['#1d3557', '#35608a', '#6ba3c7', '#b5e2fa'], [6, 12, 18]) +
      // Aurora boreale a strisce scalate
      pDots([[2,3,10,1],[4,2,12,1],[16,4,12,1],[18,3,12,1],[28,2,10,1]], '#72efdd') +
      pDots([[6,4,8,1],[20,5,10,1]], '#b8f2e6') +
      // Picchi montuosi sfaccettati (luce a sinistra, ombra a destra)
      horizon([19,17,15,13,11,9,11,13,15,17,15,13,10,8,6,4,6,8,10,13,16,18,16,14,12,10,12,14,16,18,16,14,11,9,11,13,15,17,18,19], '#4f86b0', '#ffffff') +
      pDots([[6,9,1,10],[7,11,1,8],[8,13,1,6],[15,4,1,16],[16,6,1,14],[17,8,1,12],[18,10,1,10],[25,10,1,10],[26,12,1,8],[33,9,1,11],[34,11,1,9]], '#2d577a') +
      pDots([[4,11,2,2],[13,6,2,3],[14,4,2,2],[24,10,2,2],[32,9,2,2]], '#ffffff') +
      // Lago ghiacciato e riva innevata
      px(0, 20, 40, 6, '#90dbf4') + px(0, 20, 40, 1, '#caf0f8') +
      pDots([[5,22,7,1],[18,23,9,1],[29,21,6,1],[11,24,5,1]], '#ffffff') +
      px(0, 26, 40, 4, '#e8f8ff') + px(0, 26, 40, 1, '#ffffff') +
      pDots([[4,7],[11,3],[23,8],[31,5],[37,10]], '#ffffff'),

    // 7. LOTTA: Dojo di Karate di Zafferanopoli con pareti Shoji, travi in legno e tatami
    fighting:
      // Parete Shoji a griglia
      px(0, 0, 40, 19, '#f2e4c9') +
      px(0, 0, 40, 3, '#59341c') + px(0, 17, 40, 2, '#59341c') +
      pDots([[0,7,40,1],[0,12,40,1]], '#c7b08b') +
      pDots([[7,3,1,14],[14,3,1,14],[25,3,1,14],[32,3,1,14]], '#c7b08b') +
      px(0, 2, 3, 16, '#6e4225') + px(37, 2, 3, 16, '#6e4225') +
      // Pergamena appesa al centro con simbolo rosso
      px(17, 3, 6, 12, '#7d4928') + px(18, 4, 4, 10, '#fff9eb') +
      px(19, 6, 2, 2, '#c83e2b') + px(19, 9, 2, 3, '#2b1e16') +
      // Pavimento Tatami / Parquet e ring d'allenamento
      px(0, 19, 40, 11, '#b57c43') + px(0, 19, 40, 1, '#d69f63') +
      pDots([[0,22,40,1],[0,26,40,1]], '#8f5d2c') +
      // Cerchio del Dojo sul pavimento
      px(8, 23, 24, 4, '#9c6631') + px(6, 24, 28, 2, '#9c6631') +
      px(8, 22, 24, 1, '#f7e6c4') + px(8, 27, 24, 1, '#f7e6c4') + px(6, 23, 2, 4, '#f7e6c4') + px(32, 23, 2, 4, '#f7e6c4'),

    // 8. VELENO: Palude Tossica di Fucsiapoli con alberi spogli, fanghiglia viola e bolle acide
    poison:
      skyBands(['#241433', '#3b2152', '#593275', '#784796'], [5, 11, 17]) +
      // Nebbia tossica verdognola
      px(0, 15, 40, 3, '#a5d66c', 0.28) + px(4, 14, 14, 1, '#c5f08d', 0.35) + px(23, 14, 13, 1, '#c5f08d', 0.35) +
      // Alberi contorti della palude
      pDots([[4,7,2,12],[2,9,2,1],[1,8,1,1],[6,8,2,1],[8,7,1,1],[33,6,2,13],[31,8,2,1],[35,7,2,1],[37,6,1,1]], '#1f102b') +
      // Terreno scuro e laguna velenosa
      horizon([19,19,18,18,19,20,20,19,19,18,19,20,20,20,19,19,18,19,20,20,20,19,19,18,19,20,20,19,19,18,18,19,20,20,19,19,18,18,19,19], '#321b47') +
      px(0, 21, 40, 9, '#6a2c91') + px(0, 21, 40, 1, '#9c52c4') + px(0, 26, 40, 4, '#4c1c6e') +
      // Bolle di gas acido e funghetti
      pDots([[9,23,3,2],[22,24,4,2],[30,22,3,2],[15,27,3,2]], '#b86ee0') +
      pDots([[10,23],[23,24],[31,22],[16,27]], '#e8ff99') +
      pDots([[8,16],[12,13],[25,15],[29,12]], '#c5f08d'),

    // 9. TERRA: Deserto percorso 111 con sole cocente, canyon a gradoni, dune, rocce e cactus
    ground:
      skyBands(['#f2c166', '#f7d68a', '#fcedb6'], [6, 12, 18]) +
      pOrb(31, 6, 4, '#fffbe0', '#f5b041') +
      // Mesas / Grand Canyon sullo sfondo
      pDots([[1,12,8,7],[3,10,5,2],[25,11,10,8],[27,9,6,2],[14,14,6,5]], '#c98849') +
      pDots([[1,12,8,1],[3,10,5,1],[25,11,10,1],[27,9,6,1]], '#ebae6d') +
      // Dune sabbiose
      horizon([19,18,18,17,17,16,16,17,17,18,18,19,19,18,18,17,16,16,15,15,16,16,17,17,18,19,19,18,18,17,17,16,17,17,18,18,19,19,18,18], '#de9e57', '#f7c988') +
      horizon([23,23,22,22,21,21,22,22,23,23,24,23,23,22,22,21,21,22,22,23,23,24,24,23,23,22,22,21,22,22,23,23,24,23,23,22,22,23,23,24], '#ba7936', '#e3a662') +
      px(0, 26, 40, 4, '#965d24') +
      // Cactus pixelato (stile Cacnea/Maractus) e massi
      px(7, 17, 2, 6, '#4d8c3a') + px(5, 19, 2, 1, '#4d8c3a') + px(5, 18, 1, 2, '#4d8c3a') + px(9, 18, 2, 1, '#4d8c3a') + px(10, 17, 1, 2, '#4d8c3a') +
      pDots([[18,27,3,2],[33,26,4,2]], '#6e4219'),

    // 10. VOLANTE: Cielo d'alta quota sopra le nuvole cumulonembi, stormo in volo e brezze
    flying:
      skyBands(['#3b82c4', '#63a4de', '#99c9f2', '#d5ecfc'], [6, 12, 18]) +
      pOrb(32, 6, 3, '#fffdf0', '#fce592') +
      // Banchi di nuvole alte e stormo a V
      pDots([[3,4,7,1],[5,3,4,1],[20,6,6,1],[22,5,3,1]], '#ffffff') +
      pDots([[11,8],[13,8],[12,9],[16,6],[18,6],[17,7]], '#24527a') +
      // Soffici tappeti di nuvole a strati nella metà inferiore
      horizon([19,18,17,17,18,19,18,17,16,16,17,18,18,17,16,15,15,16,17,18,17,16,16,17,18,19,18,17,16,16,17,18,17,16,16,17,18,19,18,18], '#d0e7f9', '#ffffff') +
      horizon([22,21,20,20,21,22,21,20,19,19,20,21,22,21,20,19,18,19,20,21,21,20,19,20,21,22,21,20,19,19,20,21,21,20,19,20,21,22,21,21], '#eef7ff', '#ffffff') +
      px(0, 25, 40, 5, '#ffffff') +
      pDots([[4,26,8,1],[18,27,10,1],[31,26,6,1]], '#c2dff5'),

    // 11. PSICO: Dimensione Onirica / Spazio cosmico con anelli lunari, isole fluttuanti e cristalli
    psychic:
      skyBands(['#421c52', '#732c7b', '#a84799', '#de78b5'], [6, 12, 18]) +
      // Luna mistica con anello orbitale
      pOrb(20, 7, 4, '#ffebf7', '#f7a8d8') +
      px(13, 7, 14, 1, '#ffffff') + px(11, 8, 3, 1, '#f7a8d8') + px(26, 6, 3, 1, '#f7a8d8') +
      // Isolotti fluttuanti a sinistra e destra
      pDots([[3,13,8,2],[5,15,4,2],[29,11,8,2],[31,13,4,2]], '#592363') +
      px(3, 12, 8, 1, '#ff9ce3') + px(29, 10, 8, 1, '#ff9ce3') +
      // Colline psichiche e cristalli luminosi
      horizon([21,21,20,20,19,19,20,20,21,21,22,21,20,20,19,19,20,20,21,21,22,21,20,20,19,19,20,20,21,21,22,21,20,20,19,19,20,21,21,22], '#94358c', '#f582d0') +
      px(0, 25, 40, 5, '#661d63') +
      // Cristalli magenta e stelline a 4 punte
      pDots([[7,22,2,3],[8,20,1,2],[31,21,2,4],[32,19,1,2]], '#ffb3f0') +
      pStar(10, 4) + pStar(33, 4) + pStar(6, 18) + pStar(27, 17),

    // 12. COLEOTTERO: Sottobosco illuminato con fili d'erba giganti, fronde e lucciole dorate
    bug:
      skyBands(['#d4e68a', '#e4f0a8', '#f2f7c8'], [7, 14, 20]) +
      // Fronde giganti sugli angoli superiori
      pDots([[0,0,15,5],[0,5,11,3],[0,8,7,2],[25,0,15,5],[29,5,11,3],[33,8,7,2]], '#5e8c2a') +
      pDots([[0,5,11,1],[29,5,11,1]], '#99c44d') +
      // Steli d'erba alti sullo sfondo
      pDots([[6,10,1,12],[7,8,1,2],[12,11,1,11],[11,9,1,2],[28,10,1,12],[29,8,1,2],[34,12,1,10]], '#8ab042') +
      // Sottobosco muschioso
      horizon([20,20,19,19,20,21,21,20,20,19,19,20,20,21,21,20,19,19,20,20,21,21,20,20,19,19,20,21,21,20,20,19,19,20,20,21,21,20,20,19], '#6e992e', '#99c44d') +
      px(0, 24, 40, 6, '#496b1b') +
      // Lucciole luminose con alone
      pDots([[9,14,3,3],[20,11,3,3],[30,15,3,3]], '#fff78c') +
      pDots([[10,15],[21,12],[31,16]], '#ffffff') +
      pDots([[4,26,2,1],[16,27,2,1],[26,25,2,1],[35,27,2,1]], '#bad962'),

    // 13. ROCCIA: Vetta Sassosa / Cava di Pietra con pareti stratificate, stalagmiti e massi
    rock:
      skyBands(['#d9bf8c', '#e8d3a7', '#f5e6c4'], [6, 13, 19]) +
      // Pareti rocciose a strati laterali e picco centrale
      pDots([[0,6,10,16],[10,10,4,12],[27,5,13,17],[23,9,4,13],[16,12,6,10]], '#8c7250') +
      pDots([[0,6,10,1],[10,10,4,1],[27,5,13,1],[23,9,4,1],[16,12,6,1]], '#c9b089') +
      pDots([[0,10,10,1],[0,14,14,1],[23,13,17,1],[27,9,13,1]], '#695336') +
      // Terreno pietroso e grandi massi squadrati con luce/ombra
      px(0, 20, 40, 10, '#735c3d') + px(0, 20, 40, 1, '#9e835e') + px(0, 25, 40, 5, '#57442b') +
      // Masso sinistro e masso destro
      px(3, 21, 7, 5, '#8c7250') + px(3, 21, 5, 1, '#baa077') + px(8, 22, 2, 4, '#4d3b24') +
      px(29, 20, 8, 6, '#8c7250') + px(29, 20, 6, 1, '#baa077') + px(35, 21, 2, 5, '#4d3b24') +
      pDots([[14,24,3,2],[22,26,2,2],[11,27,2,1]], '#4d3b24'),

    // 14. SPETTRO: Torre Pokémon di Lavandonia nella nebbia, lapidi, luna livida e fuochi fatui
    ghost:
      skyBands(['#181026', '#291b40', '#3d295c', '#4a4766'], [6, 12, 18]) +
      // Torre stregata in lontananza con finestre accese color ciano
      px(28, 4, 7, 16, '#140d21') + px(27, 4, 9, 1, '#140d21') + px(29, 2, 5, 2, '#140d21') + px(31, 1, 1, 1, '#140d21') +
      px(30, 7, 1, 2, '#7bf0de') + px(32, 7, 1, 2, '#7bf0de') + px(31, 12, 1, 2, '#7bf0de') +
      // Banchi di nebbia spettrale
      px(0, 15, 40, 2, '#9e8cc4', 0.3) + px(0, 23, 40, 2, '#9e8cc4', 0.35) +
      // Collina del cimitero e lapidi in pixel
      horizon([20,20,19,19,18,18,19,19,20,20,19,19,18,19,20,20,21,20,20,19,19,20,20,21,20,20,19,19,20,20,21,20,20,19,19,20,20,21,21,20], '#221736', '#433063') +
      px(0, 25, 40, 5, '#160e24') +
      // Lapidi
      px(5, 19, 4, 5, '#3d3359') + px(6, 18, 2, 1, '#584b7a') +
      px(14, 21, 3, 4, '#3d3359') + px(15, 20, 1, 1, '#584b7a') +
      px(33, 20, 4, 5, '#3d3359') + px(34, 19, 2, 1, '#584b7a') +
      // Fuochi fatui azzurro-menta (Will-O-Wisp)
      pDots([[9,10,3,3],[20,12,3,3],[24,8,2,2]], '#64dfdf') +
      pDots([[10,11],[21,13],[24,8]], '#e0ffff'),

    // 15. DRAGO: Pilastro Celeste tra tempeste viola e oro, rovina antica e sagoma di drago
    dragon:
      skyBands(['#1f1442', '#3c246b', '#6e388a', '#c97b4b'], [5, 11, 17]) +
      // Sagoma di drago alato nel cielo
      pDots([[6,5,5,1],[4,4,3,1],[9,4,3,1],[3,3,2,1],[11,3,2,1],[8,6,2,1]], '#140c2e') +
      // Colonna / Pilastro antico al centro
      px(17, 4, 6, 18, '#4f4375') + px(16, 4, 8, 1, '#8c7ab8') + px(18, 2, 4, 2, '#695994') +
      px(17, 4, 1, 18, '#8c7ab8') + px(22, 4, 1, 18, '#2d2447') +
      pDots([[18,7,4,1],[18,11,4,1],[18,15,4,1]], '#2d2447') +
      // Isole sospese e nuvole dorate alla base
      pDots([[2,13,7,2],[4,15,3,1],[30,12,7,2],[32,14,3,1]], '#352659') +
      px(2, 12, 7, 1, '#e8b26b') + px(30, 11, 7, 1, '#e8b26b') +
      horizon([21,20,19,19,20,21,20,19,18,19,20,21,20,19,19,20,21,20,19,18,19,20,21,20,19,19,20,21,20,19,18,19,20,21,20,19,19,20,21,21], '#8c6bb5', '#f2c98a') +
      px(0, 25, 40, 5, '#563d7a') +
      pDots([[12,9],[26,7],[14,16],[25,15]], '#ffe399'),

    // 16. BUIO: Notte di Plenilunio nel bosco tetro, grande falce/luna pallida, stelle e rami neri
    dark:
      skyBands(['#0f0b1c', '#1b1430', '#2c214a', '#3d2e61'], [6, 12, 18]) +
      pOrb(30, 7, 4, '#f5ebd1', '#c7b893') +
      // Nuvole scure davanti alla luna
      pDots([[24,8,7,1],[28,5,6,1]], '#1b1430') +
      // Cielo stellato
      pDots([[4,3],[9,6],[15,2],[20,5],[12,10],[37,3]], '#ffffff') +
      // Albero spoglio in silhouette e colline notturne
      pDots([[6,10,2,12],[4,12,2,1],[2,10,2,1],[8,11,3,1],[11,9,2,1],[5,15,2,1]], '#090612') +
      horizon([20,20,19,18,18,19,19,20,21,20,20,19,18,18,19,20,20,21,20,19,19,18,19,20,20,21,20,19,18,18,19,20,20,21,20,19,19,20,20,21], '#1d1530', '#4a3970') +
      px(0, 24, 40, 6, '#100b1c') +
      px(0, 18, 40, 2, '#7c6a9e', 0.22),

    // 17. ACCIAIO: Fonderie / Officina meccanica con piastre bullonate, tubature e ingranaggi
    steel:
      // Parete metallica a pannelli con rivetti
      px(0, 0, 40, 20, '#8fa3b0') +
      pDots([[0,9,40,1],[0,19,40,1],[13,0,1,20],[27,0,1,20]], '#5c707d') +
      pDots([[0,10,40,1],[14,0,1,20],[28,0,1,20]], '#bfd0db') +
      // Rivetti negli angoli dei pannelli
      pDots([[2,2],[11,2],[16,2],[25,2],[30,2],[38,2],[2,12],[11,12],[16,12],[25,12],[30,12],[38,12]], '#495a66') +
      // Grande ingranaggio pixelato a sinistra e tubazione a destra
      pDots([[4,5,6,6],[3,7,8,2],[6,4,2,8]], '#cad6de') + px(6, 7, 2, 2, '#5c707d') +
      px(31, 0, 3, 19, '#5c707d') + px(32, 0, 1, 19, '#d5e2eb') +
      // Pavimento industriale a piastre d'acciaio con riflessi diagonali
      px(0, 20, 40, 10, '#627785') + px(0, 20, 40, 1, '#b5c7d4') + px(0, 25, 40, 5, '#495a66') +
      pDots([[6,22,6,1],[5,23,6,1],[22,23,7,1],[21,24,7,1]], '#d5e2eb'),

    // 18. FOLLETTO: Radura Incantata di Kalos con arcobaleno pastello, colline rosa, funghi e scintille
    fairy:
      skyBands(['#e899c5', '#f2b8d8', '#fae0ee'], [6, 12, 18]) +
      // Arcobaleno pixelato a gradoni
      pDots([[6,15,28,1],[9,14,22,1],[12,13,16,1]], '#ff9ebb') +
      pDots([[6,16,28,1],[9,15,22,1],[12,14,16,1]], '#ffe699') +
      pDots([[6,17,28,1],[9,16,22,1],[12,15,16,1]], '#a8f0c6') +
      pDots([[6,18,28,1],[9,17,22,1],[12,16,16,1]], '#a3d5ff') +
      // Colline zuccherose rosa
      horizon([20,19,19,18,18,19,19,20,20,19,18,18,17,18,18,19,20,20,19,19,18,18,19,19,20,20,19,18,18,19,19,20,20,19,18,18,19,19,20,20], '#de78b0', '#ffaee0') +
      px(0, 24, 40, 6, '#c25792') +
      // Funghetto incantato a destra e fiori luminosi
      px(31, 22, 2, 3, '#fff5fa') + px(29, 20, 6, 2, '#ff4d94') + px(30, 19, 4, 1, '#ff4d94') +
      pDots([[30,20],[33,21]], '#ffffff') +
      pDots([[5,25,2,1],[14,27,2,1],[23,25,2,1],[36,27,2,1]], '#ffe97d') +
      pStar(8, 5) + pStar(20, 4) + pStar(32, 6),
  };

  // Genera una maschera SVG di Dithering a scacchiera pixelata (40×30) per fondere il secondo tipo!
  // Da X=0 a X=15 è trasparente (mostra il Tipo 1), tra X=16 e X=24 i pixel si intrecciano a scacchiera
  // stile Bayer matrix (25% -> 50% -> 75%), e da X=25 a X=40 mostra al 100% il Tipo 2!
  let ditherRects = px(24, 0, 16, H, '#fff');
  for (let y = 0; y < H; y++) {
    for (let x = 15; x < 24; x++) {
      const step = x - 15; // 0..8
      const keep =
        step >= 6 ? ((x + y) % 2 === 0 || x % 2 === 0) :
        step >= 3 ? ((x + y) % 2 === 0) :
        ((x % 2 === 0) && (y % 2 === 0));
      if (keep) ditherRects += px(x, y, 1, 1, '#fff');
    }
  }
  const ditherSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges">${ditherRects}</svg>`;
  const ditherUrl = `url("data:image/svg+xml,${encodeURIComponent(ditherSvg)}")`;

  // Costruisce i data URL SVG per ogni tipo e le regole CSS di fusione doppio tipo (anche nell'header Pokédex)
  const rules = Object.entries(SCENES).map(([t, body]) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">${body}</svg>`;
    return `.scene.sc-${t} { --scene: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`;
  });

  rules.push(`
    .scene {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    /* Fusione Pixel Art (Dithering) quando un Pokémon ha due tipi */
    .dex-stage .scene + .scene,
    .dex-head-scenes .scene + .scene {
      -webkit-mask-image: ${ditherUrl} !important;
      mask-image: ${ditherUrl} !important;
      -webkit-mask-size: 100% 100% !important;
      mask-size: 100% 100% !important;
    }
  `);

  document.head.append(Object.assign(document.createElement('style'), { textContent: rules.join('\n') }));

  // Aggancia automaticamente lo sfondo Pixel Art (singolo o fuso per doppio tipo) anche alla testata della scheda Pokédex
  const attachDexHeaderScenes = () => {
    for (const head of document.querySelectorAll('.dex-head[data-types]')) {
      const types = head.dataset.types.split(' ').filter(Boolean);
      const key = types.join('|');
      let box = head.querySelector('.dex-head-scenes');
      if (box && box.dataset.key === key) continue;
      box?.remove();
      box = document.createElement('div');
      box.className = 'dex-head-scenes';
      box.dataset.key = key;
      box.setAttribute('aria-hidden', 'true');
      types.forEach(t => box.append(Object.assign(document.createElement('span'), { className: `scene sc-${t}` })));
      head.prepend(box);
    }
  };

  new MutationObserver(() => requestAnimationFrame(attachDexHeaderScenes))
    .observe(document.body, { childList: true, subtree: true });
})();