/* ==========================================================
   PACK.JS — логика бустеров
   5 карт в паке. Обычные слоты честно взвешены по редкости.
   Последний (5-й) слот — "гарантированный" и учитывает pity.

   СИСТЕМА PITY (защита от невезения), по нарастающей:
   - Rare+      : гарантирован не позже, чем раз в RARE_HARD_PITY боях.
   - Epic+      : гарантирован не позже, чем раз в EPIC_HARD_PITY
                  (на практике выпадает в среднем раз в ~8 бустеров).
   - Legendary+ : гарантирован не позже, чем раз в LEGENDARY_HARD_PITY
                  (в среднем — раз в ~44 бустера).
   - Mythic     : жёсткая гарантия раз в MYTHIC_HARD_PITY (в среднем —
                  раз в ~110 бустеров). Это самая ценная и заметная карта
                  в игре — держите её действительно редкой.
   Плюс "мягкий pity" — шанс редких исходов плавно растёт по мере
   приближения счётчика к жёсткому лимиту, а не выпадает внезапно.

   "ВЕЗУЧИЙ БУСТЕР" — с небольшим шансом редкость КАЖДОЙ карты в
   паке поднимается на одну ступень. Это редкое яркое событие,
   которое стоит явно анонсировать в UI (см. app.js: result.isLucky).
   ========================================================== */

const PackSystem = (() => {

  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  const RARE_HARD_PITY      = 9;    // индекс 0..8, форс на 10-м бустере
  const EPIC_SOFT_PITY      = 16;
  const EPIC_HARD_PITY      = 26;
  const LEGENDARY_SOFT_PITY = 35;
  const LEGENDARY_HARD_PITY = 65;
  const MYTHIC_SOFT_PITY    = 70;
  const MYTHIC_HARD_PITY    = 140;

  const LUCKY_PACK_CHANCE = 0.03; // ~1 из 33 бустеров

  function weightedRarity(pool) {
    const total = Object.values(pool).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (const rarity of RARITY_ORDER) {
      if (!(rarity in pool)) continue;
      roll -= pool[rarity];
      if (roll <= 0) return rarity;
    }
    return RARITY_ORDER[0];
  }

  function pickCardOfRarity(rarity) {
    const options = CARDS.filter(c => c.rarity === rarity);
    return options[Math.floor(Math.random() * options.length)];
  }

  function nextRarity(rarity) {
    const i = RARITY_ORDER.indexOf(rarity);
    return RARITY_ORDER[Math.min(i + 1, RARITY_ORDER.length - 1)];
  }

  // Плавно увеличивает вес редкости по мере приближения counter к hardCap,
  // начиная с softStart. Возвращает бонусный вес (добавляется поверх базового).
  function softBoost(counter, softStart, hardCap, magnitude) {
    if (counter < softStart) return 0;
    const span = Math.max(1, hardCap - softStart);
    const progress = Math.min(1, (counter - softStart) / span);
    return progress * magnitude;
  }

  // Обычный (не гарантированный) слот — веса как в RARITIES,
  // с мягким pity-буст на epic/legendary/mythic ближе к хард-капу.
  function rollNormalSlot(state) {
    const pool = {};
    RARITY_ORDER.forEach(r => pool[r] = RARITIES[r].weight);
    pool.epic      += softBoost(state.epicPity || 0,      EPIC_SOFT_PITY,      EPIC_HARD_PITY,      22);
    pool.legendary += softBoost(state.legendaryPity || 0, LEGENDARY_SOFT_PITY, LEGENDARY_HARD_PITY, 6);
    pool.mythic     += softBoost(state.mythicPity || 0,   MYTHIC_SOFT_PITY,    MYTHIC_HARD_PITY,    1.2);
    const rarity = weightedRarity(pool);
    return pickCardOfRarity(rarity);
  }

  // Гарантированный (5-й) слот. Минимум зависит от того, какой pity
  // "горит" сильнее всего — приоритет у самого редкого хард-пити.
  function rollGuaranteedSlot(state) {
    const rarePity = state.pity || 0;
    const epicPity = state.epicPity || 0;
    const legendaryPity = state.legendaryPity || 0;
    const mythicPity = state.mythicPity || 0;

    if (mythicPity >= MYTHIC_HARD_PITY) {
      return pickCardOfRarity('mythic');
    }
    if (legendaryPity >= LEGENDARY_HARD_PITY) {
      return pickCardOfRarity(weightedRarity({ legendary: 85, mythic: 15 }));
    }
    if (epicPity >= EPIC_HARD_PITY) {
      return pickCardOfRarity(weightedRarity({ epic: 78, legendary: 18, mythic: 4 }));
    }
    if (rarePity >= RARE_HARD_PITY) {
      return pickCardOfRarity(weightedRarity({ rare: 70, epic: 24, legendary: 5, mythic: 1 }));
    }

    const pool = { uncommon: 600, rare: 250, epic: 20, legendary: 2.4, mythic: 0.4 };
    pool.legendary += softBoost(legendaryPity, LEGENDARY_SOFT_PITY, LEGENDARY_HARD_PITY, 10);
    pool.mythic     += softBoost(mythicPity, MYTHIC_SOFT_PITY, MYTHIC_HARD_PITY, 3);
    return pickCardOfRarity(weightedRarity(pool));
  }

  function updatePity(state, cards) {
    const has = r => cards.some(c => c.rarity === r);
    const hasRarePlus      = cards.some(c => ['rare','epic','legendary','mythic'].includes(c.rarity));
    const hasEpicPlus      = cards.some(c => ['epic','legendary','mythic'].includes(c.rarity));
    const hasLegendaryPlus = cards.some(c => ['legendary','mythic'].includes(c.rarity));
    const hasMythic        = has('mythic');

    state.pity          = hasRarePlus ? 0 : (state.pity || 0) + 1;
    state.epicPity       = hasEpicPlus ? 0 : (state.epicPity || 0) + 1;
    state.legendaryPity  = hasLegendaryPlus ? 0 : (state.legendaryPity || 0) + 1;
    state.mythicPity     = hasMythic ? 0 : (state.mythicPity || 0) + 1;
  }

  /**
   * Открывает один бустер.
   * state.pity / epicPity / legendaryPity / mythicPity — счётчики (мутируются).
   * Возвращает { cards: [...5 карт], isLucky: bool }
   */
  function openBooster(state) {
    let cards = [];
    for (let i = 0; i < 4; i++) cards.push(rollNormalSlot(state));
    cards.push(rollGuaranteedSlot(state));

    const isLucky = Math.random() < LUCKY_PACK_CHANCE;
    if (isLucky) {
      cards = cards.map(c => {
        const upgraded = nextRarity(c.rarity);
        if (upgraded === c.rarity) return c; // уже mythic — некуда расти
        return pickCardOfRarity(upgraded) || c;
      });
    }

    updatePity(state, cards);

    const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
    cards.sort((a, b) => rarityRank[a.rarity] - rarityRank[b.rarity]);

    return { cards, isLucky };
  }

  /* Для UI: сколько бустеров осталось до жёсткой гарантии каждой редкости */
  function pityStatus(state) {
    return {
      rare:      Math.max(0, RARE_HARD_PITY      - (state.pity || 0)) + 1,
      epic:      Math.max(0, EPIC_HARD_PITY      - (state.epicPity || 0)) + 1,
      legendary: Math.max(0, LEGENDARY_HARD_PITY - (state.legendaryPity || 0)) + 1,
      mythic:    Math.max(0, MYTHIC_HARD_PITY    - (state.mythicPity || 0)) + 1,
    };
  }

  return { openBooster, pityStatus, RARE_HARD_PITY, EPIC_HARD_PITY, LEGENDARY_HARD_PITY, MYTHIC_HARD_PITY };
})();
