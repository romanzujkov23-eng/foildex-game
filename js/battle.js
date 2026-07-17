/* ==========================================================
   BATTLE.JS — бои против ИИ
   Формат "гаунтлет": твоя первая карта в строю дерётся с первой
   картой соперника до чьей-то гибели, победитель остаётся на поле
   (с текущим здоровьем!) и встречает следующую карту соперника.
   Побеждает тот, чья пятёрка не закончится первой.
   Порядок карт, который выбирает игрок, — это и есть стратегия.
   ========================================================== */

const BattleSystem = (() => {

  function aiPool(tier) {
    if (tier === 1) return CARDS.filter(c => ['common', 'uncommon'].includes(c.rarity));
    if (tier === 2) return CARDS.filter(c => ['uncommon', 'rare'].includes(c.rarity));
    return CARDS.filter(c => ['rare', 'epic', 'legendary'].includes(c.rarity));
  }

  function getAiTeam(tier) {
    const pool = aiPool(tier);
    const team = [];
    const used = new Set();
    while (team.length < 5) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      const key = c.id + '-' + team.length; // допускаем повторы карт у ИИ
      if (used.has(c.id) && pool.length >= 5) continue; // избегаем дублей, если хватает разнообразия
      used.add(c.id);
      team.push(c);
    }
    return team;
  }

  function cloneRuntime(card) {
    return {
      ...card,
      hp: card.health,
      maxHp: card.health,
      shieldUsed: false,
      entered: false,
    };
  }

  function applyEntryAbility(unit, queue, idx, log, sideLabel) {
    if (unit.entered) return;
    unit.entered = true;
    if (unit.ability === 'heal' && queue[idx + 1]) {
      const ally = queue[idx + 1];
      const before = ally.hp;
      ally.hp = Math.min(ally.maxHp, ally.hp + unit.value);
      if (ally.hp > before) {
        log.push(`💚 ${unit.name} (${sideLabel}) лечит ${ally.name} на ${ally.hp - before}`);
      }
    }
  }

  function resolveHit(attacker, defender, log, sideLabel) {
    let dmg = attacker.attack;
    if (attacker.ability === 'poison') dmg += attacker.value;

    if (!defender.shieldUsed && defender.ability === 'shield') {
      const blocked = Math.min(dmg, defender.value);
      dmg -= blocked;
      defender.shieldUsed = true;
      log.push(`🛡️ ${defender.name} блокирует ${blocked} урона`);
    }

    dmg = Math.max(0, dmg);
    defender.hp -= dmg;
    log.push(`⚔️ ${attacker.name} (${sideLabel}) бьёт ${defender.name} на ${dmg}`);

    if (attacker.ability === 'drain' && dmg > 0) {
      const healed = Math.ceil(dmg / 2);
      const before = attacker.hp;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healed);
      if (attacker.hp > before) log.push(`🩸 ${attacker.name} восстанавливает ${attacker.hp - before} здоровья`);
    }
  }

  /**
   * playerCards / aiCards — массивы из 5 карт (объекты из CARDS), в порядке боя.
   * Возвращает { log: string[], playerWon: boolean, draw: boolean }
   */
  function simulate(playerCards, aiCards) {
    const pQueue = playerCards.map(cloneRuntime);
    const aQueue = aiCards.map(cloneRuntime);
    let p = 0, a = 0;
    const log = [];

    log.push('🏁 Бой начинается!');

    let safety = 0;
    while (p < 5 && a < 5 && safety < 300) {
      safety++;
      const pc = pQueue[p], ac = aQueue[a];

      applyEntryAbility(pc, pQueue, p, log, 'ты');
      applyEntryAbility(ac, aQueue, a, log, 'соперник');

      if (pc.hp <= 0) { p++; continue; }
      if (ac.hp <= 0) { a++; continue; }

      log.push(`— ${pc.name} против ${ac.name} —`);

      let rounds = 0;
      while (pc.hp > 0 && ac.hp > 0 && rounds < 30) {
        rounds++;
        const pcHits = pc.ability === 'doubleStrike' ? 2 : 1;
        const acHits = ac.ability === 'doubleStrike' ? 2 : 1;

        for (let i = 0; i < pcHits && ac.hp > 0; i++) resolveHit(pc, ac, log, 'ты');
        for (let i = 0; i < acHits && pc.hp > 0; i++) resolveHit(ac, pc, log, 'соперник');
      }

      if (pc.hp <= 0) { log.push(`💀 ${pc.name} повержен`); p++; }
      if (ac.hp <= 0) { log.push(`💀 ${ac.name} повержен`); a++; }
    }

    const playerWon = a >= 5 && p < 5;
    const draw = p >= 5 && a >= 5;
    if (playerWon) log.push('🏆 Победа!');
    else if (draw) log.push('🤝 Ничья');
    else log.push('☠️ Поражение');

    return { log, playerWon, draw };
  }

  return { getAiTeam, simulate };
})();
