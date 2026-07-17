/* ==========================================================
   PACK.JS — логика бустеров
   5 карт в паке. Обычные слоты честно взвешены по редкости.
   Последний (5-й) слот всегда Uncommon+ — "гарантированный слот".
   Pity: если за 10 бустеров подряд не выпало Rare+, следующий
   гарантированный слот форсируется в Rare (чтобы никто не застрял
   на голых "commons" надолго — это стандартная защита от фрустрации).
   ========================================================== */

const PackSystem = (() => {

  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  function weightedRarity(pool) {
    // pool: { common: w, uncommon: w, ... } — только среди указанных редкостей
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

  // Обычный (не гарантированный) слот — веса как в RARITIES
  function rollNormalSlot() {
    const pool = {};
    RARITY_ORDER.forEach(r => pool[r] = RARITIES[r].weight);
    const rarity = weightedRarity(pool);
    return pickCardOfRarity(rarity);
  }

  // Гарантированный слот — минимум Uncommon
  function rollGuaranteedSlot(forceRareUp) {
    const pool = forceRareUp
      ? { rare: 70, epic: 25, legendary: 5 }
      : { uncommon: 55, rare: 30, epic: 12, legendary: 3 };
    const rarity = weightedRarity(pool);
    return pickCardOfRarity(rarity);
  }

  /**
   * Открывает один бустер.
   * state.pity — счётчик бустеров с последнего Rare+ (мутируется).
   * Возвращает массив из 5 объектов карт.
   */
  function openBooster(state) {
    const cards = [];
    for (let i = 0; i < 4; i++) cards.push(rollNormalSlot());

    const forceRareUp = state.pity >= 9; // на 10-м бустере форсируем
    const guaranteed = rollGuaranteedSlot(forceRareUp);
    cards.push(guaranteed);

    const gotRarePlus = cards.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity));
    state.pity = gotRarePlus ? 0 : (state.pity + 1);

    // Сортируем по редкости, самое редкое — последним (кульминация)
    const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    cards.sort((a, b) => rarityRank[a.rarity] - rarityRank[b.rarity]);

    return cards;
  }

  return { openBooster };
})();
