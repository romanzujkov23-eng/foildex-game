/* ==========================================================
   ART.JS — генерация карточного арта в виде SVG-эмблем
   Никаких внешних картинок: всё рисуется кодом, поэтому не
   зависит от хостинга изображений и не нарушает чужие права.
   У каждой карты — стихийный градиент фона + силуэт-глиф
   архетипа (зверь / птица / змей / насекомое / дух / страж).
   ========================================================== */

const CardArt = (() => {

  // Затемнить/осветлить hex-цвет на percent пунктов (-255..255)
  function shade(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0xff) + percent;
    let b = (num & 0xff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  const GLYPHS = {
    // три когтевых росчерка
    beast: `<line x1="32" y1="30" x2="42" y2="68"/><line x1="45" y1="25" x2="55" y2="70"/><line x1="58" y1="30" x2="68" y2="68"/>`,
    // раскрытые крылья
    bird: `<path d="M18,58 Q35,26 50,48 Q65,26 82,58"/><path d="M27,68 Q50,50 73,68"/>`,
    // свёрнутый змеиный виток
    serpent: `<path d="M30,74 Q23,44 48,42 Q74,40 71,60 Q69,75 52,71 Q39,68 42,55"/>`,
    // гранёный панцирь + усики
    insect: `<polygon points="50,28 66,38 66,58 50,68 34,58 34,38"/><line x1="50" y1="28" x2="50" y2="15"/><line x1="42" y1="19" x2="50" y2="15"/><line x1="58" y1="19" x2="50" y2="15"/>`,
    // язык пламени / дух с искрой
    spirit: `<path d="M50,20 Q65,45 55,64 Q50,79 45,64 Q35,45 50,20 Z"/><circle cx="71" cy="38" r="3" fill="rgba(255,255,255,0.9)" stroke="none"/>`,
    // геральдический щит с крестом
    guardian: `<path d="M50,16 L77,29 L77,54 Q77,77 50,88 Q23,77 23,54 L23,29 Z"/><line x1="50" y1="37" x2="50" y2="67"/><line x1="37" y1="52" x2="63" y2="52"/>`,
  };

  function render(card) {
    const el = ELEMENTS[card.element];
    const rarity = RARITIES[card.rarity];
    const base = el.color;
    const light = shade(base, 55);
    const dark = shade(base, -55);
    const gradId = 'grad_' + card.id;
    const glyph = GLYPHS[card.shape] || GLYPHS.spirit;
    const ringWidth = 2 + ['common','uncommon','rare','epic','legendary'].indexOf(card.rarity) * 0.5;

    return `
      <svg class="card-art-svg" viewBox="0 0 100 100" role="img" aria-label="${el.label}">
        <defs>
          <radialGradient id="${gradId}" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stop-color="${light}"/>
            <stop offset="55%" stop-color="${base}"/>
            <stop offset="100%" stop-color="${dark}"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="url(#${gradId})" stroke="${rarity.color}" stroke-width="${ringWidth}"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
        <g stroke="rgba(255,255,255,0.92)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          ${glyph}
        </g>
      </svg>
    `;
  }

  return { render };
})();
