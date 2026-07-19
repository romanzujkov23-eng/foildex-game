/* ==========================================================
   BATTLE.JS — пошаговый карточный бой (мана, рука, поле)

   Игрок реально играет: каждый ход берёт карту, копит ману,
   сам решает, какую карту разыграть и какой юнит куда атаковать.
   ИИ ходит по тем же правилам через простую, но не тупую эвристику.

   Формат: колода 8-12 карт → перемешка → стартовая рука 3 карты →
   мана растёт +1/ход до 10 → поле максимум 6 существ на сторону →
   победа — здоровье лица соперника ≤ 0 (или он не может тянуть
   карты и получает урон истощения).

   Стихийный бонус: если стихия атакующего "бьёт" стихию цели
   (см. ELEMENT_ADVANTAGE в cards.js) — урон ×1.3 (округление вверх).
   ========================================================== */

const BattleSystem = (() => {

  const MAX_MANA = 10;
  const MAX_BOARD = 6;
  const START_HAND = 3;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let uidCounter = 1;
  function nextUid() { return 'u' + (uidCounter++); }

  function toHandCard(cardId) {
    const card = CARD_BY_ID[cardId];
    return { ...card, uid: nextUid() };
  }

  function toBoardUnit(card) {
    return {
      ...card,
      hp: card.health,
      maxHp: card.health,
      shieldUsed: false,
      hasAttacked: false,
      justPlayed: true,
    };
  }

  function makeSide(deckCardIds, faceHp) {
    const deck = shuffle(deckCardIds);
    const hand = [];
    for (let i = 0; i < START_HAND; i++) {
      const id = deck.shift();
      if (id) hand.push(toHandCard(id));
    }
    return {
      deck, hand, board: [],
      faceHp, faceMaxHp: faceHp,
      mana: 0, maxMana: 0,
      fatigue: 0,
    };
  }

  /**
   * playerDeckIds: массив id карт колоды игрока (8-12 шт, с повторами).
   * level: объект уровня из levels.js — по нему собирается колода ИИ.
   */
  function createBattle(playerDeckIds, level) {
    const aiCards = buildAiDeck(level);
    const aiDeckIds = aiCards.map(c => c.id);

    const state = {
      level,
      player: makeSide(playerDeckIds, PLAYER_FACE_HP),
      ai: makeSide(aiDeckIds, level.faceHp),
      turn: 'player',
      turnNumber: 1,
      log: [],
      over: false,
      winner: null,
    };

    state.log.push(`🏁 Бой начинается! Противник: ${level.name}`);
    startTurn(state, 'player');
    return state;
  }

  function sideOf(state, who) { return who === 'player' ? state.player : state.ai; }
  function enemyOf(state, who) { return who === 'player' ? state.ai : state.player; }

  function startTurn(state, who) {
    const side = sideOf(state, who);
    if (side.maxMana < MAX_MANA) side.maxMana += 1;
    side.mana = side.maxMana;
    side.board.forEach(u => { u.hasAttacked = false; u.justPlayed = false; });

    const drawn = side.deck.shift();
    if (drawn) {
      side.hand.push(toHandCard(drawn));
    } else {
      side.fatigue += 1;
      side.faceHp -= side.fatigue;
      state.log.push(`💀 ${who === 'player' ? 'Ты' : state.level.name} истощены и теряете ${side.fatigue} здоровья (колода пуста)`);
    }
    state.turn = who;
  }

  function checkOver(state) {
    if (state.over) return true;
    if (state.ai.faceHp <= 0) { state.over = true; state.winner = 'player'; state.log.push('🏆 Победа!'); return true; }
    if (state.player.faceHp <= 0) { state.over = true; state.winner = 'ai'; state.log.push('☠️ Поражение'); return true; }
    return false;
  }

  function canPlay(state, who, handUid) {
    if (state.turn !== who || state.over) return false;
    const side = sideOf(state, who);
    const card = side.hand.find(c => c.uid === handUid);
    if (!card) return false;
    if (card.cost > side.mana) return false;
    if (side.board.length >= MAX_BOARD) return false;
    return true;
  }

  function playCard(state, who, handUid) {
    if (!canPlay(state, who, handUid)) return false;
    const side = sideOf(state, who);
    const idx = side.hand.findIndex(c => c.uid === handUid);
    const card = side.hand[idx];
    side.hand.splice(idx, 1);
    side.mana -= card.cost;

    const unit = toBoardUnit(card);
    side.board.push(unit);

    const label = who === 'player' ? 'Ты' : state.level.name;
    state.log.push(`🃏 ${label} разыгрывает ${unit.name}`);

    if (unit.ability === 'heal') {
      const allies = side.board.filter(u => u.uid !== unit.uid && u.hp < u.maxHp);
      const target = allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (target) {
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + unit.value);
        if (target.hp > before) state.log.push(`💚 ${unit.name} лечит ${target.name} на ${target.hp - before}`);
      } else if (side.faceHp < side.faceMaxHp) {
        const before = side.faceHp;
        side.faceHp = Math.min(side.faceMaxHp, side.faceHp + unit.value);
        state.log.push(`💚 ${unit.name} лечит ${label} на ${side.faceHp - before}`);
      }
    }
    return true;
  }

  function elementalMult(attacker, defenderElement) {
    return defenderElement && elementBeats(attacker.element, defenderElement) ? ELEMENT_BONUS_MULT : 1;
  }

  function computeHitDamage(attacker, defenderElement) {
    let dmg = attacker.attack;
    if (attacker.ability === 'poison') dmg += attacker.value;
    dmg = Math.ceil(dmg * elementalMult(attacker, defenderElement));
    return dmg;
  }

  function dealDamageToUnit(attacker, defender, log) {
    let dmg = computeHitDamage(attacker, defender.element);
    let blocked = 0;
    if (!defender.shieldUsed && defender.ability === 'shield') {
      blocked = Math.min(dmg, defender.value);
      dmg -= blocked;
      defender.shieldUsed = true;
    }
    dmg = Math.max(0, dmg);
    defender.hp -= dmg;

    let line = `⚔️ ${attacker.name} бьёт ${defender.name} на ${dmg}`;
    if (elementBeats(attacker.element, defender.element)) line += ' (стихийный бонус!)';
    if (blocked > 0) line += ` · 🛡️ заблокировано ${blocked}`;
    log.push(line);

    if (attacker.ability === 'drain' && dmg > 0) {
      const healed = Math.ceil(dmg / 2);
      const before = attacker.hp;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healed);
      if (attacker.hp > before) log.push(`🩸 ${attacker.name} восстанавливает ${attacker.hp - before} здоровья`);
    }
    return dmg;
  }

  function removeDead(side, state) {
    const dead = side.board.filter(u => u.hp <= 0);
    dead.forEach(u => state.log.push(`💀 ${u.name} повержен`));
    side.board = side.board.filter(u => u.hp > 0);
  }

  function canAttack(state, who, attackerUid) {
    if (state.turn !== who || state.over) return false;
    const side = sideOf(state, who);
    const unit = side.board.find(u => u.uid === attackerUid);
    return !!unit && !unit.hasAttacked && !unit.justPlayed;
  }

  /**
   * targetType: 'face' | 'creature'; targetUid обязателен для 'creature'.
   */
  function attack(state, who, attackerUid, targetType, targetUid) {
    if (!canAttack(state, who, attackerUid)) return false;
    const side = sideOf(state, who);
    const enemy = enemyOf(state, who);
    const attacker = side.board.find(u => u.uid === attackerUid);

    const hits = attacker.ability === 'doubleStrike' ? 2 : 1;

    if (targetType === 'face') {
      for (let i = 0; i < hits; i++) {
        const dmg = computeHitDamage(attacker, null);
        enemy.faceHp -= dmg;
        const whom = who === 'player' ? state.level.name : 'тебя';
        state.log.push(`⚔️ ${attacker.name} бьёт ${whom} напрямую на ${dmg}`);
        if (attacker.ability === 'drain') {
          const before = attacker.hp;
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.ceil(dmg / 2));
          if (attacker.hp > before) state.log.push(`🩸 ${attacker.name} восстанавливает ${attacker.hp - before} здоровья`);
        }
        if (checkOver(state)) break;
      }
    } else {
      const defender = enemy.board.find(u => u.uid === targetUid);
      if (!defender) return false;
      for (let i = 0; i < hits && defender.hp > 0; i++) {
        dealDamageToUnit(attacker, defender, state.log);
      }
      // ответный удар защитника (если жив и атакующий тоже жив)
      if (defender.hp > 0 && attacker.hp > 0) {
        dealDamageToUnit(defender, attacker, state.log);
      }
      removeDead(enemy, state);
      removeDead(side, state);
    }

    if (side.board.find(u => u.uid === attackerUid)) attacker.hasAttacked = true;
    checkOver(state);
    return true;
  }

  /* ---------------- ИИ ---------------- */

  function runAiTurn(state) {
    if (state.over) return;
    const ai = state.ai;

    // 1) разыгрываем карты, пока хватает маны и есть место на поле
    let played = true;
    while (played && !state.over) {
      played = false;
      const playable = ai.hand
        .filter(c => c.cost <= ai.mana)
        .sort((a, b) => b.cost - a.cost); // сперва самое дорогое — эффективно тратим ману
      if (playable.length > 0 && ai.board.length < MAX_BOARD) {
        playCard(state, 'ai', playable[0].uid);
        played = true;
      }
    }
    if (state.over) return;

    // 2) атакуем каждым юнитом, способным атаковать
    let attackerUids = ai.board.filter(u => !u.hasAttacked && !u.justPlayed).map(u => u.uid);
    attackerUids.forEach(uid => {
      if (state.over) return;
      const atk = state.ai.board.find(u => u.uid === uid);
      if (!atk || atk.hasAttacked) return;

      const targets = state.player.board;
      let best = null;
      targets.forEach(t => {
        const shieldAbsorb = (!t.shieldUsed && t.ability === 'shield') ? t.value : 0;
        const dmg = computeHitDamage(atk, t.element);
        const effHp = t.hp + shieldAbsorb;
        const kills = dmg >= effHp;
        const survives = t.attack < atk.hp;
        if (kills && survives) best = t;
      });
      if (!best && targets.length && Math.random() < 0.35) {
        best = [...targets].sort((a, b) => a.hp - b.hp)[0];
      }

      if (best) {
        attack(state, 'ai', atk.uid, 'creature', best.uid);
      } else {
        attack(state, 'ai', atk.uid, 'face');
      }
    });
  }

  function endTurn(state, who) {
    if (state.turn !== who || state.over) return false;
    const other = who === 'player' ? 'ai' : 'player';
    startTurn(state, other);
    if (other === 'ai') {
      runAiTurn(state);
      if (!state.over) startTurn(state, 'player');
    }
    return true;
  }

  return {
    createBattle, playCard, attack, endTurn,
    canPlay, canAttack, checkOver,
    MAX_MANA, MAX_BOARD,
  };
})();
