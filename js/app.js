/* ==========================================================
   APP.JS — главный контроллер
   ========================================================== */

const STATE_KEY = 'tcg_state_v1';
const BOOSTER_COST = 100;
const DAILY_BONUS = 50;
const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 часов

/* Кастомная иконка валюты — мешок с золотом (вместо эмодзи 💎) */
const COIN_ICON = `<svg class="coin-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coinBagGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f6d488"/>
      <stop offset="55%" stop-color="#e8b64a"/>
      <stop offset="100%" stop-color="#a9761f"/>
    </linearGradient>
  </defs>
  <path d="M9.3 5.2c0-1.7 1.1-3 2.7-3s2.7 1.3 2.7 3" fill="none" stroke="#8a6423" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M7 6.1c-2.9 2.9-4 6.9-2.6 10.3C5.7 19.9 8.5 21.6 12 21.6s6.3-1.7 7.6-5.2C20.9 12.9 20 8.9 17 6.1c-1.6 0.95-3.2 1.35-5 1.35S8.6 7.05 7 6.1z" fill="url(#coinBagGrad)" stroke="#8a6423" stroke-width="0.7"/>
  <path d="M7.3 8.9c2.8 1.4 6.6 1.4 9.4 0" fill="none" stroke="#8a6423" stroke-width="0.6" opacity="0.55"/>
  <circle cx="12" cy="14.6" r="2.6" fill="#fff3d6" opacity="0.3"/>
  <circle cx="12" cy="14.6" r="2.1" fill="none" stroke="#8a6423" stroke-width="0.7"/>
</svg>`;

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
    epicPity: 0,
    legendaryPity: 0,
    mythicPity: 0,
    wins: 0,
    losses: 0,
    lastDaily: 0,
    soundOn: true,
  };
}

async function loadState() {
  const raw = await Store.get(STATE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch (e) { state = defaultState(); }
  } else {
    state = defaultState();
  }
  if (state.soundOn === undefined) state.soundOn = true;
  // Миграция старых сохранений — досоздаём новые pity-счётчики, если их ещё нет
  if (state.epicPity === undefined) state.epicPity = 0;
  if (state.legendaryPity === undefined) state.legendaryPity = 0;
  if (state.mythicPity === undefined) state.mythicPity = 0;
  SoundSystem.setEnabled(state.soundOn);
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
  el.innerHTML = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

/* ---------------- CARD RENDERING ---------------- */

const ABILITY_ICON = { none: '', shield: '🛡', poison: '☠', heal: '✚', doubleStrike: '⚔⚔', drain: '🩸' };
const RARITY_ICON = { common: '●', uncommon: '◆', rare: '★', epic: '✦✦', legendary: '♛', mythic: '✵' };

function buildCardNode(card, opts = {}) {
  const { locked = false, count = null, onClick = null, selected = false, variant = 'mini' } = opts;
  const el = document.createElement('div');
  el.className = `card card--${variant} rarity-${card.rarity}`;
  if (STANDOUT_RARITIES.includes(card.rarity) && !locked) el.classList.add('holo');
  if (card.rarity === 'mythic' && !locked) el.classList.add('mythic-fx');
  if (locked) el.classList.add('locked');
  if (selected) el.classList.add('selected');

  const hasAbility = card.ability !== 'none';
  const artHtml = locked ? '<span class="card-art-locked">✦</span>' : CardArt.render(card);
  const elInfo = ELEMENTS[card.element];
  const rarityBadge = `<span class="card-rarity-badge" style="--tc:${RARITIES[card.rarity].color}"><span class="ric">${RARITY_ICON[card.rarity]}</span></span>`;
  const elementBadge = `<span class="card-element-badge" style="--tc:${elInfo.color}">${elInfo.emoji}</span>`;

  if (variant === 'full') {
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-top">
          <span class="card-cost">${card.cost}</span>
          ${elementBadge}
          ${rarityBadge}
        </div>
        <div class="card-art">${artHtml}</div>
        <div class="card-name-plate"><div class="card-name">${locked ? '???' : card.name}</div></div>
        <div class="card-ability-line">${locked ? '' : (hasAbility ? `<span class="ab-ic">${ABILITY_ICON[card.ability]}</span> ${ABILITIES[card.ability].label}` : '<span class="ab-none">—</span>')}</div>
        <div class="card-stats">
          <span class="atk">${card.attack}</span>
          <span class="hp">${card.health}</span>
        </div>
      </div>
      ${!locked ? `<button type="button" class="card-info-btn" aria-label="Подробнее о карте">ⓘ</button>` : ''}
    `;
  } else {
    /* mini: арт занимает всю карту, имя и статы — единой плашкой снизу */
    el.innerHTML = `
      <div class="card-art">${artHtml}</div>
      <div class="card-top">
        <span class="card-cost">${card.cost}</span>
        ${!locked ? elementBadge : ''}
        ${!locked ? rarityBadge : ''}
      </div>
      ${!locked ? `
        <div class="card-scrim">
          <div class="card-name">${card.name}</div>
          <div class="card-stats">
            <span class="atk">${card.attack}</span>
            <span class="hp">${card.health}</span>
          </div>
        </div>
        <button type="button" class="card-info-btn" aria-label="Подробнее о карте">ⓘ</button>
      ` : ''}
    `;
  }

  if (count && count > 1) {
    const badge = document.createElement('div');
    badge.className = 'card-count-badge';
    badge.textContent = '×' + count;
    el.appendChild(badge);
  }

  if (onClick) { el.addEventListener('click', onClick); }
  if (!locked) {
    const infoBtn = el.querySelector('.card-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', (e) => { e.stopPropagation(); openCardModal(card); });
    }
    if (!onClick) {
      el.classList.add('tappable');
      el.addEventListener('click', () => openCardModal(card));
    }
  }
  return el;
}

/* ---------------- CARD DETAIL MODAL ---------------- */

function openCardModal(card) {
  const modal = document.getElementById('card-modal');
  const body = document.getElementById('card-modal-body');
  const elInfo = ELEMENTS[card.element];
  const rarity = RARITIES[card.rarity];
  const owned = ownedCount(card.id);
  const hasAbility = card.ability !== 'none';
  const abilityFull = hasAbility ? ABILITIES[card.ability].desc(card.value) : 'Эта карта не обладает особой способностью — полагается на грубую силу в бою.';

  body.innerHTML = `
    <div class="modal-art-frame rarity-${card.rarity}">${CardArt.render(card)}</div>
    <div class="modal-card-name">${card.name}</div>
    <div class="modal-card-tags">
      <span class="tag" style="--tc:${elInfo.color}">${elInfo.emoji} ${elInfo.label}</span>
      <span class="tag" style="--tc:${rarity.color}">${rarity.label}</span>
    </div>
    <div class="modal-card-stats">
      <div class="stat-box"><span class="lbl">Стоимость</span><span class="val">${card.cost}</span></div>
      <div class="stat-box"><span class="lbl">Атака</span><span class="val atk">${card.attack}</span></div>
      <div class="stat-box"><span class="lbl">Здоровье</span><span class="val hp">${card.health}</span></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">${hasAbility ? ABILITY_ICON[card.ability] + ' Способность · ' + ABILITIES[card.ability].label : 'Способность'}</div>
      <div class="modal-body-text">${abilityFull}</div>
    </div>
    <div class="modal-owned">${owned > 0 ? `В твоей коллекции: ×${owned}` : 'Эта карта ещё не найдена'}</div>
  `;
  modal.classList.add('active');
  haptic('light');
}

function closeCardModal() {
  document.getElementById('card-modal').classList.remove('active');
}

/* ---------------- HOME ---------------- */

function canClaimDaily() {
  return Date.now() - state.lastDaily > DAILY_COOLDOWN_MS;
}

function renderHome() {
  const el = document.getElementById('home-content');
  el.innerHTML = '';

  const uniqueOwned = ownedUniqueCards().length;

  /* ---- обложка-постер (магазинный/журнальный вид) ---- */
  const coverCard = CARD_BY_ID['n07']; // Мировой Корень — легендарный лик логова
  const cover = document.createElement('div');
  cover.className = 'home-cover';
  cover.innerHTML = `
    <picture>
      <source srcset="assets/cards/${coverCard.id}.webp" type="image/webp">
      <img src="assets/cards/${coverCard.id}.jpg" alt="${coverCard.name}" loading="eager">
    </picture>
    <div class="home-cover-content">
      <div class="home-cover-eyebrow">
        <span>✦ Тёмный Гримуар</span>
        <span>№1</span>
      </div>
      <div>
        <div class="home-cover-badge">📖 ${uniqueOwned} / ${CARDS.length} существ поймано</div>
        <div class="home-cover-title">ЛОГОВО<br>ТЕНЕЙ</div>
        <p class="home-cover-sub">Побеждай в боях, собирай кристаллы душ и вскрывай бустеры — гримуар ждёт, чтобы его заполнили.</p>
      </div>
    </div>
  `;
  el.appendChild(cover);

  /* ---- быстрые действия: дар дня + бесплатный бустер ---- */
  const hasDaily = canClaimDaily();
  const hasFree = state.freeBoosters > 0;
  if (hasDaily || hasFree) {
    const quick = document.createElement('div');
    quick.className = 'quick-actions';

    if (hasDaily) {
      const card = document.createElement('div');
      card.className = 'quick-card';
      card.innerHTML = `
        <div class="qc-icon">✦</div>
        <div class="qc-title">Дар подземелья</div>
        <div class="qc-desc">Забери просто за то, что вернулся.</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.innerHTML = `+${DAILY_BONUS} ${COIN_ICON}`;
      btn.onclick = async () => {
        state.shards += DAILY_BONUS;
        state.lastDaily = Date.now();
        await saveState();
        haptic('success');
        SoundSystem.coin();
        toast(`+${DAILY_BONUS} ${COIN_ICON}`);
        renderHome();
      };
      card.appendChild(btn);
      quick.appendChild(card);
    }

    if (hasFree) {
      const card = document.createElement('div');
      card.className = 'quick-card';
      card.innerHTML = `
        <div class="qc-icon">🕯</div>
        <div class="qc-title">Бесплатный бустер</div>
        <div class="qc-desc">Доступно: ${state.freeBoosters} шт.</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Открыть';
      btn.onclick = () => { SoundSystem.tap(); startPackFlow({ free: true }); };
      card.appendChild(btn);
      quick.appendChild(card);
    }
    el.appendChild(quick);
  }

  const shopTitle = document.createElement('div');
  shopTitle.className = 'section-title';
  shopTitle.textContent = 'Лавка бустеров';
  el.appendChild(shopTitle);

  const shopPanel = document.createElement('div');
  shopPanel.className = 'panel';
  const row = document.createElement('div');
  row.className = 'pack-shop-item';
  row.innerHTML = `
    <div class="pack-icon">📜</div>
    <div class="pack-info">
      <div class="name">Тёмный бустер</div>
      <div class="desc">5 карт · шанс на мифическую и «везучий» бустер ✵</div>
    </div>
  `;
  const buyBtn = document.createElement('button');
  buyBtn.className = 'pack-buy';
  buyBtn.innerHTML = `${BOOSTER_COST} ${COIN_ICON}`;
  buyBtn.disabled = state.shards < BOOSTER_COST;
  buyBtn.onclick = () => { SoundSystem.tap(); startPackFlow({ free: false }); };
  row.appendChild(buyBtn);
  shopPanel.appendChild(row);
  el.appendChild(shopPanel);

  const statsTitle = document.createElement('div');
  statsTitle.className = 'section-title';
  statsTitle.textContent = 'Хроника побед';
  el.appendChild(statsTitle);
  const statsPanel = document.createElement('div');
  statsPanel.className = 'panel';
  statsPanel.innerHTML = `<p class="hero-sub" style="margin:0;">🏆 Побед: ${state.wins} &nbsp;·&nbsp; 💀 Поражений: ${state.losses}</p>`;
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

  const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
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
let pendingIsLucky = false;
let revealIndex = 0;
let pendingPaymentDone = false;

function renderPityPanel() {
  const panel = document.getElementById('pity-panel');
  if (!panel) return;
  const status = PackSystem.pityStatus(state);
  panel.innerHTML = `
    <div class="pity-row"><span class="pity-ic" style="--tc:${RARITIES.rare.color}">★</span>До гарантии Редкой+: <b>${status.rare}</b></div>
    <div class="pity-row"><span class="pity-ic" style="--tc:${RARITIES.legendary.color}">♛</span>До гарантии Легендарной+: <b>${status.legendary}</b></div>
    <div class="pity-row"><span class="pity-ic" style="--tc:${RARITIES.mythic.color}">✵</span>До гарантии Мифической: <b>${status.mythic}</b></div>
  `;
}

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
  document.getElementById('lucky-banner').classList.remove('show');
  const visual = document.getElementById('pack-visual');
  visual.classList.remove('opening');
  visual.onclick = () => openPack({ free });
  renderPityPanel();
}

async function openPack({ free }) {
  if (pendingPaymentDone) return;
  pendingPaymentDone = true;
  haptic('medium');
  SoundSystem.packShake();

  const visual = document.getElementById('pack-visual');
  visual.classList.add('opening');

  if (free) { state.freeBoosters -= 1; } else { state.shards -= BOOSTER_COST; }

  const result = PackSystem.openBooster(state);
  pendingCards = result.cards;
  pendingIsLucky = result.isLucky;
  await saveState();
  syncShardDisplays();

  setTimeout(() => {
    document.getElementById('pack-intro').style.display = 'none';
    document.getElementById('reveal-stage').classList.add('active');
    if (pendingIsLucky) {
      const banner = document.getElementById('lucky-banner');
      banner.classList.add('show');
      haptic('success');
      SoundSystem.reveal('mythic');
      setTimeout(() => banner.classList.remove('show'), 2200);
    }
    revealIndex = 0;
    showRevealCard();
  }, 550);
}

function showRevealCard() {
  const card = pendingCards[revealIndex];
  const holder = document.getElementById('reveal-card-holder');
  holder.innerHTML = '';
  const node = buildCardNode(card, { variant: 'full' });
  node.classList.add('reveal-flip-anim');
  holder.appendChild(node);

  document.getElementById('reveal-progress').textContent = `Карта ${revealIndex + 1} / ${pendingCards.length}`;

  const wasOwned = ownedCount(card.id) > 0;
  document.getElementById('reveal-new-tag').textContent = wasOwned ? '' : '✨ НОВАЯ КАРТА';

  const flash = document.getElementById('reveal-flash');
  flash.className = 'reveal-flash';
  if (STANDOUT_RARITIES.includes(card.rarity)) {
    // форс-рефлоу, чтобы анимация могла перезапуститься на повторной редкости подряд
    void flash.offsetWidth;
    flash.classList.add('flash-' + card.rarity, 'flash-play');
  }

  const rarityHaptic = { common: 'light', uncommon: 'medium', rare: 'heavy', epic: 'success', legendary: 'success', mythic: 'success' };
  haptic(rarityHaptic[card.rarity] || 'light');
  SoundSystem.reveal(card.rarity);

  const btn = document.getElementById('reveal-next-btn');
  btn.textContent = revealIndex < pendingCards.length - 1 ? 'Далее' : 'Забрать карты';
}

async function finishReveal() {
  addCardsToCollection(pendingCards);
  await saveState();
  const rareCount = pendingCards.filter(c => ['rare', 'epic', 'legendary', 'mythic'].includes(c.rarity)).length;
  const hasMythic = pendingCards.some(c => c.rarity === 'mythic');
  if (hasMythic) toast('✵ МИФИЧЕСКАЯ КАРТА! Получено 5 карт!');
  else toast(rareCount > 0 ? `Получено 5 карт, из них ${rareCount} редких+!` : 'Получено 5 карт!');
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
  [[1, 'Бродяга'], [2, 'Клинок Ночи'], [3, 'Владыка Арены']].forEach(([t, label]) => {
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
  deckPanel.innerHTML = `<div class="hero-title" style="font-size:16px;">Твой отряд теней (порядок важен!)</div>
    <p class="hero-sub">Первая карта встретит соперника первой. Победивший остаётся на поле с текущим здоровьем.</p>`;
  const slotsRow = document.createElement('div');
  slotsRow.className = 'deck-slots';
  deckSlots.forEach((cardId, idx) => {
    const slot = document.createElement('div');
    slot.className = 'deck-slot' + (cardId ? ' filled' : '');
    if (cardId) {
      const card = CARD_BY_ID[cardId];
      const node = buildCardNode(card, { onClick: () => { deckSlots[idx] = null; renderBattleSetup(); } });
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
  const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
  owned.sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]).forEach(card => {
    const isSelected = deckSlots.includes(card.id);
    const node = buildCardNode(card, {
      count: ownedCount(card.id),
      selected: isSelected,
      onClick: () => {
        if (isSelected) return;
        const emptyIdx = deckSlots.indexOf(null);
        if (emptyIdx === -1) return;
        deckSlots[emptyIdx] = card.id;
        renderBattleSetup();
      },
    });
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
    if (result.log[i].includes('⚔️')) SoundSystem.battleHit();
    i++;
  }, 260);
}

async function finishBattle(result) {
  let reward = 10;
  if (result.playerWon) { reward = 35; state.wins += 1; haptic('success'); SoundSystem.victory(); }
  else if (result.draw) { reward = 18; haptic('warning'); }
  else { reward = 10; state.losses += 1; haptic('error'); SoundSystem.defeat(); }

  state.shards += reward;
  await saveState();

  const holder = document.getElementById('battle-result-holder');
  const label = result.playerWon ? 'Победа!' : (result.draw ? 'Ничья' : 'Поражение');
  const cls = result.playerWon ? 'win' : (result.draw ? 'draw' : 'lose');
  holder.innerHTML = `<div class="battle-result ${cls}">${label}</div>
    <p class="hero-sub" style="text-align:center;">+${reward} ${COIN_ICON}</p>`;

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
      SoundSystem.tap();
      const key = tab.dataset.tab;
      showScreen(TAB_SCREENS[key]);
      if (key === 'home') renderHome();
      if (key === 'collection') renderCollection();
      if (key === 'battle') renderBattleSetup();
    });
  });

  document.getElementById('sound-toggle-btn').addEventListener('click', async (e) => {
    state.soundOn = !state.soundOn;
    SoundSystem.setEnabled(state.soundOn);
    e.currentTarget.textContent = state.soundOn ? '🔊' : '🔇';
    if (state.soundOn) SoundSystem.tap();
    await saveState();
  });

  document.getElementById('pack-back-btn').addEventListener('click', () => {
    SoundSystem.tap();
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
      if (document.getElementById('card-modal').classList.contains('active')) {
        closeCardModal();
        return;
      }
      showScreen('screen-home');
      renderHome();
    });
  }

  document.getElementById('card-modal-close').addEventListener('click', closeCardModal);
  document.getElementById('card-modal').addEventListener('click', (e) => {
    if (e.target.id === 'card-modal') closeCardModal();
  });
}

async function init() {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) { try { tg.setHeaderColor('#0B0E14'); } catch (e) {} }
  }
  await loadState();
  bindStaticEvents();
  document.getElementById('sound-toggle-btn').textContent = state.soundOn ? '🔊' : '🔇';
  showScreen('screen-home');
  renderHome();
  await saveState();
}

document.addEventListener('DOMContentLoaded', init);
