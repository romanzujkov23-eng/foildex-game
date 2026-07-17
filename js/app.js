/* ==========================================================
   APP.JS — главный контроллер
   ========================================================== */

const STATE_KEY = 'tcg_state_v1';
const BOOSTER_COST = 100;
const DAILY_BONUS = 50;
const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 часов

let state = null;
let currentTier = 1;
let deckSlots = [null, null, null, null, null];
let collectionFilter = 'all';

const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

function haptic(type) {
  if (!tg || !tg.HapticFeedback) return;
  if (type === 'success' || type === 'error' || type === 'warning') {
    tg.HapticFeedback.notificationOccurred(type);
  } else {
    tg.HapticFeedback.impactOccurred(type || 'light');
  }
}

/* ---------------- STATE ---------------- */

function defaultState() {
  return {
    shards: 250,
    freeBoosters: 2,
    collection: {},
    pity: 0,
    wins: 0,
    losses: 0,
    lastDaily: 0,
  };
}

async function loadState() {
  const raw = await Store.get(STATE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch (e) { state = defaultState(); }
  } else {
    state = defaultState();
  }
}

async function saveState() {
  await Store.set(STATE_KEY, JSON.stringify(state));
}

function ownedCount(cardId) { return state.collection[cardId] || 0; }
function ownedUniqueCards() { return CARDS.filter(c => ownedCount(c.id) > 0); }

function addCardsToCollection(cards) {
  cards.forEach(c => { state.collection[c.id] = (state.collection[c.id] || 0) + 1; });
}

/* ---------------- NAVIGATION ---------------- */

const TAB_SCREENS = { home: 'screen-home', collection: 'screen-collection', battle: 'screen-battle-setup' };

function showScreen(id, opts = {}) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const tabbar = document.getElementById('tabbar');
  const isTabScreen = Object.values(TAB_SCREENS).includes(id);
  tabbar.style.display = isTabScreen ? 'flex' : 'none';

  if (isTabScreen) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const entry = Object.entries(TAB_SCREENS).find(([, v]) => v === id);
    if (entry) document.querySelector(`.tab[data-tab="${entry[0]}"]`).classList.add('active');
  }

  if (tg && tg.BackButton) {
    if (!isTabScreen) { tg.BackButton.show(); } else { tg.BackButton.hide(); }
  }
  syncShardDisplays();
}

function syncShardDisplays() {
  document.querySelectorAll('[id^="shard-count"]').forEach(el => el.textContent = state.shards);
}

function toast(msg) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

/* ---------------- CARD RENDERING ---------------- */

function buildCardNode(card, opts = {}) {
  const { locked = false, count = null, onClick = null, selected = false } = opts;
  const el = document.createElement('div');
  el.className = `card rarity-${card.rarity}`;
  if (['epic', 'legendary'].includes(card.rarity) && !locked) el.classList.add('holo');
  if (locked) el.classList.add('locked');
  if (selected) el.classList.add('selected');

  const abilityText = card.ability === 'none' ? '—' : ABILITIES[card.ability].desc(card.value);

  el.innerHTML = `
    <div class="card-top">
      <span class="card-cost">⏳${card.cost}</span>
      <span class="card-rarity-dot"></span>
    </div>
    <div class="card-art">${locked ? '❔' : ELEMENTS[card.element].emoji}</div>
    <div class="card-name">${locked ? '???' : card.name}</div>
    <div class="card-ability">${locked ? '' : abilityText}</div>
    <div class="card-stats">
      <span class="atk">⚔ ${card.attack}</span>
      <span class="hp">❤ ${card.health}</span>
    </div>
  `;

  if (count && count > 1) {
    const badge = document.createElement('div');
    badge.className = 'card-count-badge';
    badge.textContent = 'x' + count;
    el.appendChild(badge);
  }

  if (onClick) { el.addEventListener('click', onClick); }
  return el;
}

/* ---------------- HOME ---------------- */

function canClaimDaily() {
  return Date.now() - state.lastDaily > DAILY_COOLDOWN_MS;
}

function renderHome() {
  const el = document.getElementById('home-content');
  el.innerHTML = '';

  const hero = document.createElement('div');
  hero.className = 'panel';
  const uniqueOwned = ownedUniqueCards().length;
  hero.innerHTML = `
    <div class="hero-title">Привет, коллекционер 👋</div>
    <p class="hero-sub">У тебя ${uniqueOwned} из ${CARDS.length} карт. Побеждай в боях, зарабатывай кристаллы и вскрывай новые бустеры.</p>
  `;
  el.appendChild(hero);

  if (canClaimDaily()) {
    const daily = document.createElement('div');
    daily.className = 'panel';
    daily.innerHTML = `<div class="hero-title" style="font-size:16px;">🎁 Ежедневный бонус</div>
      <p class="hero-sub">Забери ${DAILY_BONUS} 💎 просто за то, что зашёл.</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = `Забрать ${DAILY_BONUS} 💎`;
    btn.onclick = async () => {
      state.shards += DAILY_BONUS;
      state.lastDaily = Date.now();
      await saveState();
      haptic('success');
      toast(`+${DAILY_BONUS} 💎`);
      renderHome();
    };
    daily.appendChild(btn);
    el.appendChild(daily);
  }

  if (state.freeBoosters > 0) {
    const free = document.createElement('div');
    free.className = 'panel';
    free.innerHTML = `<div class="hero-title" style="font-size:16px;">🎉 Бесплатный бустер</div>
      <p class="hero-sub">У тебя ${state.freeBoosters} бесплатных бустера(ов). Открой прямо сейчас!</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Открыть бесплатно';
    btn.onclick = () => startPackFlow({ free: true });
    free.appendChild(btn);
    el.appendChild(free);
  }

  const shopTitle = document.createElement('div');
  shopTitle.className = 'section-title';
  shopTitle.textContent = 'Магазин бустеров';
  el.appendChild(shopTitle);

  const shopPanel = document.createElement('div');
  shopPanel.className = 'panel';
  const row = document.createElement('div');
  row.className = 'pack-shop-item';
  row.innerHTML = `
    <div class="pack-icon">🎁</div>
    <div class="pack-info">
      <div class="name">Стандартный бустер</div>
      <div class="desc">5 карт · шанс на редкие и легендарные</div>
    </div>
  `;
  const buyBtn = document.createElement('button');
  buyBtn.className = 'pack-buy';
  buyBtn.textContent = `${BOOSTER_COST} 💎`;
  buyBtn.disabled = state.shards < BOOSTER_COST;
  buyBtn.onclick = () => startPackFlow({ free: false });
  row.appendChild(buyBtn);
  shopPanel.appendChild(row);
  el.appendChild(shopPanel);

  const statsTitle = document.createElement('div');
  statsTitle.className = 'section-title';
  statsTitle.textContent = 'Статистика';
  el.appendChild(statsTitle);
  const statsPanel = document.createElement('div');
  statsPanel.className = 'panel';
  statsPanel.innerHTML = `<p class="hero-sub" style="margin:0;">🏆 Побед: ${state.wins} &nbsp;·&nbsp; ☠️ Поражений: ${state.losses}</p>`;
  el.appendChild(statsPanel);
}

/* ---------------- COLLECTION ---------------- */

function renderCollection() {
  const filterRow = document.getElementById('filter-row');
  const grid = document.getElementById('collection-grid');
  filterRow.innerHTML = '';
  grid.innerHTML = '';

  const filters = [['all', 'Все']].concat(Object.entries(ELEMENTS).map(([k, v]) => [k, v.emoji + ' ' + v.label]));
  filters.forEach(([key, label]) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (collectionFilter === key ? ' active' : '');
    chip.textContent = label;
    chip.onclick = () => { collectionFilter = key; renderCollection(); };
    filterRow.appendChild(chip);
  });

  const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const list = CARDS
    .filter(c => collectionFilter === 'all' || c.element === collectionFilter)
    .sort((a, b) => rarityRank[a.rarity] - rarityRank[b.rarity]);

  list.forEach(card => {
    const count = ownedCount(card.id);
    const node = buildCardNode(card, { locked: count === 0, count });
    grid.appendChild(node);
  });
}

/* ---------------- PACK OPENING ---------------- */

let pendingCards = [];
let revealIndex = 0;
let pendingPaymentDone = false;

function startPackFlow({ free }) {
  if (free) {
    if (state.freeBoosters <= 0) return;
  } else {
    if (state.shards < BOOSTER_COST) return;
  }
  pendingPaymentDone = false;
  showScreen('screen-pack');
  document.getElementById('pack-intro').style.display = 'flex';
  document.getElementById('reveal-stage').classList.remove('active');
  const visual = document.getElementById('pack-visual');
  visual.classList.remove('opening');
  visual.onclick = () => openPack({ free });
}

async function openPack({ free }) {
  if (pendingPaymentDone) return;
  pendingPaymentDone = true;
  haptic('medium');

  const visual = document.getElementById('pack-visual');
  visual.classList.add('opening');

  if (free) { state.freeBoosters -= 1; } else { state.shards -= BOOSTER_COST; }

  pendingCards = PackSystem.openBooster(state);
  await saveState();
  syncShardDisplays();

  setTimeout(() => {
    document.getElementById('pack-intro').style.display = 'none';
    document.getElementById('reveal-stage').classList.add('active');
    revealIndex = 0;
    showRevealCard();
  }, 550);
}

function showRevealCard() {
  const card = pendingCards[revealIndex];
  const holder = document.getElementById('reveal-card-holder');
  holder.innerHTML = '';
  const node = buildCardNode(card);
  node.classList.add('reveal-flip-anim');
  holder.appendChild(node);

  document.getElementById('reveal-progress').textContent = `Карта ${revealIndex + 1} / ${pendingCards.length}`;

  const wasOwned = ownedCount(card.id) > 0;
  document.getElementById('reveal-new-tag').textContent = wasOwned ? '' : '✨ НОВАЯ КАРТА';

  const rarityHaptic = { common: 'light', uncommon: 'medium', rare: 'heavy', epic: 'success', legendary: 'success' };
  haptic(rarityHaptic[card.rarity] || 'light');

  const btn = document.getElementById('reveal-next-btn');
  btn.textContent = revealIndex < pendingCards.length - 1 ? 'Далее' : 'Забрать карты';
}

async function finishReveal() {
  addCardsToCollection(pendingCards);
  await saveState();
  const rareCount = pendingCards.filter(c => ['rare', 'epic', 'legendary'].includes(c.rarity)).length;
  toast(rareCount > 0 ? `Получено 5 карт, из них ${rareCount} редких+!` : 'Получено 5 карт!');
  showScreen('screen-home');
  renderHome();
}

/* ---------------- BATTLE SETUP ---------------- */

function tierUnlocked(tier) {
  if (tier === 1) return true;
  if (tier === 2) return state.wins >= 5;
  if (tier === 3) return state.wins >= 15;
  return false;
}

function renderBattleSetup() {
  const el = document.getElementById('battle-setup-content');
  el.innerHTML = '';

  const owned = ownedUniqueCards();
  if (owned.length < 5) {
    el.innerHTML = `<div class="empty-state">
      <div class="big">🃏</div>
      <p>Нужно минимум 5 разных карт в коллекции, чтобы собрать боевой отряд.<br>Открой ещё бустеров!</p>
    </div>`;
    return;
  }

  deckSlots = deckSlots.map(id => (id && ownedCount(id) > 0) ? id : null);

  const tierPanel = document.createElement('div');
  tierPanel.className = 'panel';
  tierPanel.innerHTML = `<div class="hero-title" style="font-size:16px;">Выбери соперника</div>`;
  const tierRow = document.createElement('div');
  tierRow.className = 'tier-row';
  [[1, 'Новичок'], [2, 'Ветеран'], [3, 'Мастер']].forEach(([t, label]) => {
    const btn = document.createElement('button');
    btn.className = 'tier-btn' + (currentTier === t ? ' active' : '');
    const unlocked = tierUnlocked(t);
    btn.disabled = !unlocked;
    btn.textContent = unlocked ? label : `🔒 ${label}`;
    btn.onclick = () => { currentTier = t; renderBattleSetup(); };
    tierRow.appendChild(btn);
  });
  tierPanel.appendChild(tierRow);
  el.appendChild(tierPanel);

  const deckPanel = document.createElement('div');
  deckPanel.className = 'panel';
  deckPanel.innerHTML = `<div class="hero-title" style="font-size:16px;">Твой отряд (порядок важен!)</div>
    <p class="hero-sub">Первая карта встретит соперника первой. Победивший остаётся на поле с текущим здоровьем.</p>`;
  const slotsRow = document.createElement('div');
  slotsRow.className = 'deck-slots';
  deckSlots.forEach((cardId, idx) => {
    const slot = document.createElement('div');
    slot.className = 'deck-slot' + (cardId ? ' filled' : '');
    if (cardId) {
      const card = CARD_BY_ID[cardId];
      const node = buildCardNode(card);
      node.onclick = () => { deckSlots[idx] = null; renderBattleSetup(); };
      slot.appendChild(node);
    } else {
      slot.textContent = (idx + 1).toString();
      slot.onclick = () => {};
    }
    slotsRow.appendChild(slot);
  });
  deckPanel.appendChild(slotsRow);

  const startBtn = document.createElement('button');
  startBtn.className = 'btn';
  startBtn.textContent = 'В бой!';
  const filled = deckSlots.every(s => s !== null);
  startBtn.disabled = !filled;
  startBtn.onclick = () => runBattle();
  deckPanel.appendChild(startBtn);
  el.appendChild(deckPanel);

  const pickTitle = document.createElement('div');
  pickTitle.className = 'section-title';
  pickTitle.textContent = 'Выбери карты (тапни, чтобы добавить)';
  el.appendChild(pickTitle);

  const pickGrid = document.createElement('div');
  pickGrid.className = 'pick-grid';
  const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  owned.sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]).forEach(card => {
    const isSelected = deckSlots.includes(card.id);
    const node = buildCardNode(card, { count: ownedCount(card.id), selected: isSelected });
    node.onclick = () => {
      if (isSelected) return;
      const emptyIdx = deckSlots.indexOf(null);
      if (emptyIdx === -1) return;
      deckSlots[emptyIdx] = card.id;
      renderBattleSetup();
    };
    pickGrid.appendChild(node);
  });
  el.appendChild(pickGrid);
}

/* ---------------- BATTLE EXECUTION ---------------- */

async function runBattle() {
  const playerCards = deckSlots.map(id => CARD_BY_ID[id]);
  const aiCards = BattleSystem.getAiTeam(currentTier);
  const result = BattleSystem.simulate(playerCards, aiCards);

  showScreen('screen-battle-log');
  const vsRow = document.getElementById('vs-row');
  vsRow.innerHTML = `<span>Ты</span><span style="color:var(--text-dim); font-weight:400;">против</span><span>Соперник</span>`;
  const logBox = document.getElementById('log-box');
  logBox.innerHTML = '';
  document.getElementById('battle-result-holder').innerHTML = '';
  const doneBtn = document.getElementById('battle-log-done-btn');
  doneBtn.style.display = 'none';

  let i = 0;
  const interval = setInterval(() => {
    if (i >= result.log.length) {
      clearInterval(interval);
      finishBattle(result);
      return;
    }
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = result.log[i];
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
    i++;
  }, 260);
}

async function finishBattle(result) {
  let reward = 10;
  if (result.playerWon) { reward = 35; state.wins += 1; haptic('success'); }
  else if (result.draw) { reward = 18; haptic('warning'); }
  else { reward = 10; state.losses += 1; haptic('error'); }

  state.shards += reward;
  await saveState();

  const holder = document.getElementById('battle-result-holder');
  const label = result.playerWon ? 'Победа!' : (result.draw ? 'Ничья' : 'Поражение');
  const cls = result.playerWon ? 'win' : (result.draw ? 'draw' : 'lose');
  holder.innerHTML = `<div class="battle-result ${cls}">${label}</div>
    <p class="hero-sub" style="text-align:center;">+${reward} 💎</p>`;

  const doneBtn = document.getElementById('battle-log-done-btn');
  doneBtn.style.display = 'block';
  doneBtn.onclick = () => {
    deckSlots = [null, null, null, null, null];
    showScreen('screen-battle-setup');
    renderBattleSetup();
  };
}

/* ---------------- INIT ---------------- */

function bindStaticEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.tab;
      showScreen(TAB_SCREENS[key]);
      if (key === 'home') renderHome();
      if (key === 'collection') renderCollection();
      if (key === 'battle') renderBattleSetup();
    });
  });

  document.getElementById('pack-back-btn').addEventListener('click', () => {
    showScreen('screen-home');
    renderHome();
  });

  document.getElementById('reveal-next-btn').addEventListener('click', () => {
    if (revealIndex < pendingCards.length - 1) {
      revealIndex++;
      showRevealCard();
    } else {
      finishReveal();
    }
  });

  if (tg && tg.BackButton) {
    tg.BackButton.onClick(() => {
      showScreen('screen-home');
      renderHome();
    });
  }
}

async function init() {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) { try { tg.setHeaderColor('#0B0E14'); } catch (e) {} }
  }
  await loadState();
  bindStaticEvents();
  showScreen('screen-home');
  renderHome();
  await saveState();
}

document.addEventListener('DOMContentLoaded', init);
