/* ==========================================================
   ART.JS — иллюстрации карт (тёмное фэнтези)

   Основной режим: настоящее растровое изображение существа
   (WebP/JPG), лежащее в assets/cards/<id>.webp (+ .jpg как
   запасной формат). Если файл для карты ещё не залит —
   автоматически (через onerror у <img>) откатываемся на старый
   процедурный SVG-генератор, чтобы карта не показывала "битую
   картинку", пока вы постепенно грузите арты.

   Как добавить реальный арт карте:
   1) Сгенерируйте/подготовьте квадратное изображение (см. промпты
      в CARD_ART_PROMPTS.md)
   2) Сохраните как assets/cards/<id>.webp (и/или .jpg)
      Пример: assets/cards/f01.webp — для карты "Тлеющий Щенок"
   3) Ничего в коде менять не нужно — при следующей отрисовке
      игра сама подхватит файл вместо SVG.

   Структура:
   - render(card)            → <picture> c реальным изображением
                                 + автоматический откат на SVG
   - renderProcedural(card)  → старый процедурный SVG-арт
   - CardArt.fallback(id, el)→ вызывается по onerror у <img>
   ========================================================== */

const CardArt = (() => {

  /* ---------- seeded random ---------- */
  function makeRng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return function rng() {
      a = Math.imul(a ^ (a >>> 15), 1 | a);
      a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
      return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const range = (rng, min, max) => min + rng() * (max - min);

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
  function alpha(hex, a) {
    const num = parseInt(hex.slice(1), 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${a})`;
  }

  /* ---------- eyes ---------- */
  function eyes(cx1, cy1, cx2, cy2, r, glowColor) {
    return `
      <g class="art-eyes">
        <circle cx="${cx1}" cy="${cy1}" r="${r}" fill="${glowColor}"/>
        <circle cx="${cx2}" cy="${cy2}" r="${r}" fill="${glowColor}"/>
        <circle cx="${cx1}" cy="${cy1}" r="${r * 2.4}" fill="${glowColor}" opacity="0.35"/>
        <circle cx="${cx2}" cy="${cy2}" r="${r * 2.4}" fill="${glowColor}" opacity="0.35"/>
      </g>`;
  }

  /* ==========================================================
     СИЛУЭТЫ СУЩЕСТВ ПО АРХЕТИПАМ
     каждый возвращает { body, extra } — SVG-разметку в системе
     координат 0..100, куда потом накладываются эффекты стихии
     ========================================================== */

  function beastShape(rng, base, dark, glow) {
    // хищная голова: острые уши, вытянутая морда, клыки
    const earSway = range(rng, -4, 4);
    const snoutLen = range(rng, 0, 6);
    const furJags = Math.floor(range(rng, 3, 6));
    let fur = '';
    for (let i = 0; i < furJags; i++) {
      const t = i / (furJags - 1);
      const x = 30 + t * 40;
      fur += `M${x},${30 + (i % 2) * 3} l${range(rng, -2, 2)},-6 `;
    }
    return `
      <path d="M${38 + earSway},18 L${28 + earSway},2 L${44},24 Z" fill="${dark}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>
      <path d="M${62 - earSway},18 L${72 - earSway},2 L${56},24 Z" fill="${dark}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>
      <path d="M50,16 Q30,20 28,42 Q26,58 34,${68 + snoutLen} Q40,${80 + snoutLen} 50,${84 + snoutLen}
               Q60,${80 + snoutLen} 66,${68 + snoutLen} Q74,58 72,42 Q70,20 50,16 Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.55)" stroke-width="1.4"/>
      <path d="M40,${64 + snoutLen} Q50,${72 + snoutLen} 60,${64 + snoutLen} Q58,${76 + snoutLen} 50,${79 + snoutLen}
               Q42,${76 + snoutLen} 40,${64 + snoutLen} Z" fill="${dark}" opacity="0.85"/>
      <path d="M44,${68 + snoutLen} L46,${74 + snoutLen} L48,${68 + snoutLen} Z" fill="#fff" opacity="0.9"/>
      <path d="M56,${68 + snoutLen} L54,${74 + snoutLen} L52,${68 + snoutLen} Z" fill="#fff" opacity="0.9"/>
      <path d="${fur}" stroke="${dark}" stroke-width="1" fill="none" opacity="0.5"/>
      ${eyes(41, 46, 59, 46, 2.4, glow)}
    `;
  }

  function birdShape(rng, base, dark, glow) {
    const wingDroop = range(rng, -6, 8);
    const featherN = Math.floor(range(rng, 3, 6));
    let feathersL = '', feathersR = '';
    for (let i = 0; i < featherN; i++) {
      const t = i / (featherN - 1 || 1);
      feathersL += `<path d="M${16 + t * 20},${58 + wingDroop * t} L${8 + t * 14},${72 + wingDroop * t}" stroke="${dark}" stroke-width="1.6" opacity="0.65"/>`;
      feathersR += `<path d="M${84 - t * 20},${58 + wingDroop * t} L${92 - t * 14},${72 + wingDroop * t}" stroke="${dark}" stroke-width="1.6" opacity="0.65"/>`;
    }
    return `
      <path d="M50,38 Q18,${28 + wingDroop} 6,${54 + wingDroop} Q26,${58 + wingDroop} 40,${50}
               Q30,${68 + wingDroop} 16,${80 + wingDroop} Q36,${76} 46,${58} Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/>
      <path d="M50,38 Q82,${28 + wingDroop} 94,${54 + wingDroop} Q74,${58 + wingDroop} 60,${50}
               Q70,${68 + wingDroop} 84,${80 + wingDroop} Q64,${76} 54,${58} Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/>
      ${feathersL}${feathersR}
      <path d="M50,26 Q40,30 40,40 Q40,50 50,54 Q60,50 60,40 Q60,30 50,26 Z" fill="${dark}"/>
      <path d="M50,36 L58,42 L50,46 Z" fill="#E8C468" stroke="rgba(0,0,0,.4)" stroke-width="0.6"/>
      <path d="M46,80 L42,92 M50,82 L50,94 M54,80 L58,92" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>
      ${eyes(46, 38, 46, 38, 2, glow)}
    `;
  }

  function serpentShape(rng, base, dark, glow) {
    const coilTight = range(rng, -4, 4);
    const spikeN = Math.floor(range(rng, 5, 9));
    let spikes = '';
    const pathD = `M26,${76 + coilTight} Q16,${44 + coilTight} 42,${40} Q76,${36} ${70 - coilTight},${60}
                   Q${66 - coilTight},78 ${46},${72} Q30,${68} 36,${52}`;
    for (let i = 0; i < spikeN; i++) {
      const t = i / (spikeN - 1);
      const x = 26 + t * 46;
      const y = 76 - t * 34;
      spikes += `<path d="M${x},${y} l${range(rng, -3, 3)},-7 l4,6 Z" fill="${dark}"/>`;
    }
    return `
      <path d="${pathD}" fill="none" stroke="url(#bodyGrad)" stroke-width="13" stroke-linecap="round"/>
      <path d="${pathD}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="13" stroke-linecap="round" opacity="0.25"/>
      ${spikes}
      <path d="M20,${72 + coilTight} Q10,${68 + coilTight} 8,${78 + coilTight} Q16,${84} 24,${78 + coilTight} Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/>
      <path d="M8,72 L2,66 M8,76 L1,76" stroke="${dark}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12,80 Q6,84 4,90 M12,82 Q10,88 12,92" stroke="${glow}" stroke-width="1.2" fill="none" opacity="0.8"/>
      ${eyes(14, 70, 14, 76, 1.6, glow)}
    `;
  }

  function insectShape(rng, base, dark, glow) {
    const legSpread = range(rng, -3, 5);
    const legN = 3;
    let legs = '';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < legN; i++) {
        const y = 44 + i * 12;
        const x1 = 50 + side * 16;
        const x2 = 50 + side * (32 + legSpread);
        const y2 = y + (i - 1) * 8;
        legs += `<path d="M${x1},${y} L${x2},${y2} L${x2 + side * 6},${y2 + 10}" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>`;
      }
    }
    return `
      <ellipse cx="50" cy="40" rx="10" ry="9" fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/>
      <path d="M50,46 L34,58 Q28,74 38,86 Q50,94 62,86 Q72,74 66,58 Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/>
      <path d="M50,54 L50,84 M40,60 Q50,64 60,60 M38,70 Q50,74 62,70 M40,80 Q50,83 60,80"
            stroke="${dark}" stroke-width="1" opacity="0.55" fill="none"/>
      ${legs}
      <path d="M44,32 L36,20 M56,32 L64,20" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>
      <path d="M42,36 L30,38 M58,36 L70,38" stroke="${dark}" stroke-width="2.4" stroke-linecap="round"/>
      ${eyes(46, 38, 54, 38, 1.8, glow)}
    `;
  }

  function spiritShape(rng, base, dark, glow) {
    const flicker = range(rng, -6, 6);
    const wispN = Math.floor(range(rng, 3, 5));
    let wisps = '';
    for (let i = 0; i < wispN; i++) {
      const t = i / (wispN - 1 || 1);
      const x = 38 + t * 24 + range(rng, -3, 3);
      wisps += `<path d="M${x},80 Q${x + flicker * 0.4},92 ${x - 4},${98}" stroke="${base}" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round"/>`;
    }
    return `
      <path d="M50,14 Q${68 + flicker},34 62,54 Q${72},64 60,78 Q50,90 40,78 Q28,64 ${38},54
               Q${32 - flicker},34 50,14 Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>
      <path d="M50,20 Q60,36 56,50 Q62,58 54,70 Q50,78 46,70 Q38,58 44,50 Q40,36 50,20 Z"
            fill="${alpha(dark, 0.4)}"/>
      ${wisps}
      <path d="M44,44 Q50,40 56,44 Q54,52 50,52 Q46,52 44,44 Z" fill="rgba(6,6,10,0.85)"/>
      ${eyes(46, 47, 54, 47, 1.7, glow)}
    `;
  }

  function guardianShape(rng, base, dark, glow) {
    const visorGap = range(rng, 1.5, 3.5);
    const rivets = Math.floor(range(rng, 3, 6));
    let rivetDots = '';
    for (let i = 0; i < rivets; i++) {
      const t = i / (rivets - 1 || 1);
      rivetDots += `<circle cx="${30 + t * 40}" cy="${86}" r="1.3" fill="${dark}"/>`;
    }
    return `
      <path d="M50,14 L74,26 L74,50 Q74,74 50,90 Q26,74 26,50 L26,26 Z"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,.55)" stroke-width="1.6"/>
      <path d="M50,14 L74,26 L74,44 L50,50 L26,44 L26,26 Z" fill="${dark}" opacity="0.9"/>
      <rect x="30" y="${40 - visorGap}" width="14" height="${visorGap * 2}" rx="1.5" fill="${glow}" opacity="0.9"/>
      <rect x="56" y="${40 - visorGap}" width="14" height="${visorGap * 2}" rx="1.5" fill="${glow}" opacity="0.9"/>
      <path d="M50,52 L50,80 M40,62 L60,62" stroke="${alpha(base, 0.9)}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M20,40 Q10,44 12,58 Q18,60 24,54 Z" fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1"/>
      <path d="M80,40 Q90,44 88,58 Q82,60 76,54 Z" fill="url(#bodyGrad)" stroke="rgba(0,0,0,.5)" stroke-width="1"/>
      ${rivetDots}
    `;
  }

  const SHAPES = {
    beast: beastShape, bird: birdShape, serpent: serpentShape,
    insect: insectShape, spirit: spiritShape, guardian: guardianShape,
  };

  /* ==========================================================
     ЭЛЕМЕНТАЛЬНЫЕ ЭФФЕКТЫ (оверлей поверх существа)
     ========================================================== */
  function elementFx(element, rng, base) {
    const n = Math.floor(range(rng, 4, 7));
    let out = '';
    if (element === 'fire') {
      for (let i = 0; i < n; i++) {
        const x = range(rng, 12, 88), y = range(rng, 78, 96), r = range(rng, 0.8, 2.2);
        out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${base}" opacity="${range(rng, 0.35, 0.8).toFixed(2)}"/>`;
      }
    } else if (element === 'water') {
      for (let i = 0; i < n; i++) {
        const x = range(rng, 10, 90), y = range(rng, 6, 20);
        out += `<circle cx="${x}" cy="${y}" r="${range(rng, 0.8, 1.8)}" fill="${base}" opacity="0.6"/>`;
      }
      out += `<path d="M6,50 Q50,44 94,50" stroke="${base}" stroke-width="0.7" fill="none" opacity="0.35"/>`;
    } else if (element === 'nature') {
      for (let i = 0; i < n; i++) {
        const x = range(rng, 8, 30), y = range(rng, 55, 92);
        out += `<path d="M${x},${y} q6,-2 8,-8" stroke="${base}" stroke-width="1.4" fill="none" opacity="0.55" stroke-linecap="round"/>`;
      }
    } else if (element === 'electric') {
      for (let i = 0; i < n; i++) {
        const x = range(rng, 14, 86), y = range(rng, 8, 28);
        out += `<path d="M${x},${y} l-4,6 l5,1 l-5,7" stroke="${base}" stroke-width="1.3" fill="none" opacity="0.75" stroke-linecap="round"/>`;
      }
    } else if (element === 'shadow') {
      for (let i = 0; i < n; i++) {
        const x = range(rng, 10, 90), y = range(rng, 82, 96);
        out += `<path d="M${x},${y} q10,-6 18,0 q-8,6 -18,0 Z" fill="${base}" opacity="0.28"/>`;
      }
    } else if (element === 'light') {
      const rays = 8;
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2;
        const x1 = 50 + Math.cos(ang) * 30, y1 = 50 + Math.sin(ang) * 30;
        const x2 = 50 + Math.cos(ang) * 46, y2 = 50 + Math.sin(ang) * 46;
        out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${base}" stroke-width="1" opacity="0.3"/>`;
      }
    }
    return `<g class="art-fx">${out}</g>`;
  }

  /* ==========================================================
     РАМКА АУРЫ РЕДКОСТИ
     ========================================================== */
  function rarityAura(rarity, rc, gradId) {
    if (rarity === 'common') return '';
    if (rarity === 'uncommon') {
      return `<circle cx="50" cy="50" r="47" fill="none" stroke="${rc}" stroke-width="0.8" opacity="0.5"/>`;
    }
    if (rarity === 'rare') {
      return `
        <circle cx="50" cy="50" r="46" fill="none" stroke="${rc}" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>
        <circle cx="50" cy="4" r="1.6" fill="${rc}"/><circle cx="50" cy="96" r="1.6" fill="${rc}"/>
        <circle cx="4" cy="50" r="1.6" fill="${rc}"/><circle cx="96" cy="50" r="1.6" fill="${rc}"/>
      `;
    }
    if (rarity === 'epic') {
      return `
        <circle cx="50" cy="50" r="47" fill="none" stroke="${rc}" stroke-width="1" stroke-dasharray="1 2.5" opacity="0.75"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="${rc}" stroke-width="0.6" opacity="0.4"/>
        <g opacity="0.85">
          ${[0,72,144,216,288].map(a => {
            const r = a * Math.PI / 180;
            const x = 50 + Math.cos(r) * 44, y = 50 + Math.sin(r) * 44;
            return `<circle cx="${x}" cy="${y}" r="1.4" fill="${rc}"/>`;
          }).join('')}
        </g>
      `;
    }
    // legendary
    return `
      <circle cx="50" cy="50" r="47" fill="none" stroke="${rc}" stroke-width="1.2" opacity="0.85"/>
      <circle cx="50" cy="50" r="43" fill="none" stroke="${rc}" stroke-width="0.6" stroke-dasharray="1 2" opacity="0.55"/>
      <path d="M38,10 L44,3 L50,9 L56,3 L62,10 L50,14 Z" fill="${rc}" opacity="0.9"/>
      <g opacity="0.9">
        ${[45,135,225,315].map(a => {
          const r = a * Math.PI / 180;
          const x = 50 + Math.cos(r) * 44, y = 50 + Math.sin(r) * 44;
          return `<path d="M${x},${y - 2} L${x + 2},${y} L${x},${y + 2} L${x - 2},${y} Z" fill="${rc}"/>`;
        }).join('')}
      </g>
    `;
  }

  function renderProcedural(card) {
    const el = ELEMENTS[card.element];
    const rarity = RARITIES[card.rarity];
    const rng = makeRng(card.id + ':' + card.name);
    const base = el.color;
    const light = shade(base, 45);
    const dark = shade(base, -70);
    const glow = pick(rng, ['#fff', '#ffe9b0', light]);
    const gradId = 'grad_' + card.id;
    const vignetteId = 'vig_' + card.id;

    const shapeFn = SHAPES[card.shape] || SHAPES.spirit;
    const creature = shapeFn(rng, base, dark, glow);
    const fx = elementFx(card.element, rng, light);
    const aura = rarityAura(card.rarity, rarity.color, gradId);

    return `
      <svg class="card-art-svg" viewBox="0 0 100 100" role="img" aria-label="${card.name}, ${el.label}">
        <defs>
          <radialGradient id="${gradId}" cx="42%" cy="30%" r="75%">
            <stop offset="0%" stop-color="${light}"/>
            <stop offset="55%" stop-color="${base}"/>
            <stop offset="100%" stop-color="${dark}"/>
          </radialGradient>
          <radialGradient id="${vignetteId}" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stop-color="${alpha(base, 0.28)}"/>
            <stop offset="70%" stop-color="rgba(6,7,12,0.55)"/>
            <stop offset="100%" stop-color="rgba(2,2,5,0.92)"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#${vignetteId})"/>
        ${fx}
        <g>${creature}</g>
        ${aura}
      </svg>
    `;
  }

  /* ---------- путь к папке с реальными изображениями ---------- */
  // Меняйте только эту константу, если решите переименовать/перенести папку.
  const ART_BASE = 'assets/cards/';

  /* Вызывается из onerror <img>, когда файла ещё нет / не загрузился.
     Подменяет саму картинку на процедурный SVG-арт этой же карты. */
  function fallback(id, imgEl) {
    const card = CARD_BY_ID[id];
    if (!card) return;
    const holder = imgEl.closest('.card-art, .modal-art-frame');
    if (holder) holder.innerHTML = renderProcedural(card);
  }

  /* Основной рендер: пытаемся показать реальное изображение,
     с автоматическим откатом на процедурный арт при отсутствии файла. */
  function render(card) {
    const el = ELEMENTS[card.element];
    const webp = ART_BASE + card.id + '.webp';
    const jpg = ART_BASE + card.id + '.jpg';
    return `
      <picture>
        <source srcset="${webp}" type="image/webp">
        <img
          class="card-art-img"
          src="${jpg}"
          alt="${card.name}, ${el.label}"
          loading="lazy"
          decoding="async"
          onerror="CardArt.fallback('${card.id}', this)"
        >
      </picture>
    `;
  }

  return { render, renderProcedural, fallback };
})();
