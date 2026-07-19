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
let selectedLevelId = null;
let deckSlots = [];         // id карт текущей строящейся колоды (8-12, с повторами)
let collectionFilter = 'all';
let battleState = null;     // объект боя из BattleSystem
let selectedAttackerUid = null;
let battleLogShown = 0;     // сколько строк лога уже показано в UI

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
    clearedLevels: [],
    playerDeck: [],
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
  // Миграция старых сохранений — досоздаём новые поля, если их ещё нет
  if (state.epicPity === undefined) state.epicPity = 0;
  if (state.legendaryPity === undefined) state.legendaryPity = 0;
  if (state.mythicPity === undefined) state.mythicPity = 0;
  if (!state.clearedLevels) state.clearedLevels = [];
  if (!state.playerDeck) state.playerDeck = [];
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
    el.classList.add('has-count');
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
  const coverCard = CARD_BY_ID['n16']; // Лесная Фея — единственный настоящий фотоарт, витрина логова
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

/* ---------------- LEVEL MAP ---------------- */

function renderLevelSelect() {
  const el = document.getElementById('levels-content');
  el.innerHTML = '';

  const owned = ownedUniqueCards();
  if (owned.length < MIN_DECK_SIZE) {
    el.innerHTML = `<div class="empty-state">
      <div class="big">🃏</div>
      <p>Нужно минимум ${MIN_DECK_SIZE} разных карт в коллекции, чтобы собрать боевую колоду.<br>Открой ещё бустеров!</p>
    </div>`;
    return;
  }

  const intro = document.createElement('div');
  intro.className = 'panel';
  intro.innerHTML = `<div class="hero-title" style="font-size:16px;">Карта Арены</div>
    <p class="hero-sub">Проходи уровни по порядку. Боссы отмечены короной — сильнее, но щедрее на золото. Стихии противника показаны заранее: подбирай колоду под контр-стихию!</p>`;
  el.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'level-list';

  LEVELS.forEach(level => {
    const unlocked = isLevelUnlocked(level.id, state);
    const cleared = isLevelCleared(level.id, state);
    const elInfo = ELEMENTS[level.element];

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'level-card' + (level.isBoss ? ' boss' : '') + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
    card.disabled = !unlocked;
    card.innerHTML = `
      <div class="level-num">${level.isBoss ? '👑' : level.id}</div>
      <div class="level-info">
        <div class="level-name">${unlocked ? level.name : '???'}</div>
        <div class="level-meta">
          ${unlocked ? `<span class="tag-sm" style="--tc:${elInfo.color}">${elInfo.emoji} ${elInfo.label}</span>` : ''}
          ${unlocked ? `<span class="tag-sm">❤ ${level.faceHp}</span>` : ''}
          ${unlocked ? `<span class="tag-sm gold">💰 ${level.goldMin}–${level.goldMax}</span>` : ''}
        </div>
      </div>
      <div class="level-status">${cleared ? '✅' : (unlocked ? '▶' : '🔒')}</div>
    `;
    if (unlocked) {
      card.onclick = () => {
        SoundSystem.tap();
        selectedLevelId = level.id;
        deckSlots = state.playerDeck.filter(id => ownedCount(id) > 0).slice(0, MAX_DECK_SIZE);
        showScreen('screen-deckbuilder');
        renderDeckBuilder();
      };
    }
    list.appendChild(card);
  });

  el.appendChild(list);
}

/* ---------------- DECK BUILDER ---------------- */

function renderDeckBuilder() {
  const level = getLevel(selectedLevelId);
  const el = document.getElementById('deckbuilder-content');
  el.innerHTML = '';
  if (!level) return;

  const elInfo = ELEMENTS[level.element];
  const playerDom = dominantElement(deckSlots);
  const matchup = matchupInfo(playerDom, level.element);

  const enemyPanel = document.createElement('div');
  enemyPanel.className = 'panel';
  enemyPanel.innerHTML = `
    <div class="hero-title" style="font-size:16px;">${level.isBoss ? '👑 ' : ''}${level.name}</div>
    <div class="level-meta" style="margin:6px 0 10px;">
      <span class="tag-sm" style="--tc:${elInfo.color}">${elInfo.emoji} ${elInfo.label}</span>
      <span class="tag-sm">❤ ${level.faceHp}</span>
      <span class="tag-sm">🃏 ${level.deckSize} карт</span>
      <span class="tag-sm gold">💰 ${level.goldMin}–${level.goldMax}</span>
    </div>
    <div class="matchup-banner matchup-${matchup.state}">
      ${matchup.state === 'favor' ? `✅ Твоя стихия (${playerDom ? ELEMENTS[playerDom].label : '?'}) сильнее ${elInfo.label} — бонус к урону в бою!` : ''}
      ${matchup.state === 'against' ? `⚠️ Стихия соперника (${elInfo.label}) сильнее твоей (${playerDom ? ELEMENTS[playerDom].label : '?'}) — будь осторожен` : ''}
      ${matchup.state === 'neutral' ? `⚖️ Нейтральный матчап стихий` : ''}
    </div>
  `;
  el.appendChild(enemyPanel);

  const deckPanel = document.createElement('div');
  deckPanel.className = 'panel';
  deckPanel.innerHTML = `<div class="hero-title" style="font-size:16px;">Твоя колода (${deckSlots.length}/${MAX_DECK_SIZE}, минимум ${MIN_DECK_SIZE})</div>
    <p class="hero-sub">Тапни карту снизу, чтобы добавить. Тапни карту в колоде, чтобы убрать.</p>`;

  const slotsRow = document.createElement('div');
  slotsRow.className = 'deckbuilder-slots';
  deckSlots.forEach((cardId, idx) => {
    const card = CARD_BY_ID[cardId];
    const node = buildCardNode(card, { onClick: () => { deckSlots.splice(idx, 1); renderDeckBuilder(); } });
    slotsRow.appendChild(node);
  });
  for (let i = deckSlots.length; i < MIN_DECK_SIZE; i++) {
    const empty = document.createElement('div');
    empty.className = 'deck-slot';
    empty.textContent = (i + 1).toString();
    slotsRow.appendChild(empty);
  }
  deckPanel.appendChild(slotsRow);

  const startBtn = document.createElement('button');
  startBtn.className = 'btn';
  startBtn.textContent = 'В бой!';
  startBtn.disabled = deckSlots.length < MIN_DECK_SIZE;
  startBtn.onclick = () => startInteractiveBattle(level);
  deckPanel.appendChild(startBtn);
  el.appendChild(deckPanel);

  const pickTitle = document.createElement('div');
  pickTitle.className = 'section-title';
  pickTitle.textContent = 'Твои карты';
  el.appendChild(pickTitle);

  const pickGrid = document.createElement('div');
  pickGrid.className = 'pick-grid';
  const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
  const owned = ownedUniqueCards();
  owned.sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]).forEach(card => {
    const inDeckCount = deckSlots.filter(id => id === card.id).length;
    const canAddMore = inDeckCount < ownedCount(card.id) && deckSlots.length < MAX_DECK_SIZE;
    const node = buildCardNode(card, {
      count: ownedCount(card.id),
      selected: inDeckCount > 0,
      onClick: () => {
        if (!canAddMore) return;
        deckSlots.push(card.id);
        renderDeckBuilder();
      },
    });
    if (!canAddMore && inDeckCount === 0) node.style.opacity = '0.4';
    pickGrid.appendChild(node);
  });
  el.appendChild(pickGrid);
}

/* ---------------- INTERACTIVE BATTLE ---------------- */

function startInteractiveBattle(level) {
  state.playerDeck = deckSlots.slice();
  saveState();

  battleState = BattleSystem.createBattle(deckSlots.slice(), level);
  selectedAttackerUid = null;
  battleLogShown = 0;

  showScreen('screen-battle');
  document.getElementById('battle-result-overlay').classList.remove('show');
  SoundSystem.tap();
  renderBattleScreen();
  flushBattleLog();
}

function buildBattleUnitNode(unit, { side, selectable, targetable, onClick }) {
  const el = document.createElement('div');
  el.className = `unit-card rarity-${unit.rarity}`;
  if (STANDOUT_RARITIES.includes(unit.rarity)) el.classList.add('holo');
  if (selectable) el.classList.add('can-act');
  if (selectedAttackerUid === unit.uid) el.classList.add('selected');
  if (targetable) el.classList.add('target-highlight');

  const elInfo = ELEMENTS[unit.element];
  const hpPct = Math.max(0, Math.round((unit.hp / unit.maxHp) * 100));
  el.innerHTML = `
    <div class="unit-art">${CardArt.render(unit)}</div>
    <span class="unit-element" style="--tc:${elInfo.color}">${elInfo.emoji}</span>
    ${side === 'player' && !unit.hasAttacked && !unit.justPlayed ? '<span class="unit-ready-dot"></span>' : ''}
    <div class="unit-name">${unit.name}</div>
    <div class="unit-bottom">
      <span class="unit-atk">⚔ ${unit.attack}</span>
      <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:${hpPct}%"></div></div>
      <span class="unit-hp">${unit.hp}</span>
    </div>
  `;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

function renderBattleScreen() {
  if (!battleState) return;
  const s = battleState;

  document.getElementById('bf-enemy-name').textContent = (s.level.isBoss ? '👑 ' : '') + s.level.name;
  const ePct = Math.max(0, Math.round((s.ai.faceHp / s.ai.faceMaxHp) * 100));
  document.getElementById('bf-enemy-hp-fill').style.width = ePct + '%';
  document.getElementById('bf-enemy-hp-text').textContent = `${Math.max(0, s.ai.faceHp)}/${s.ai.faceMaxHp}`;
  document.getElementById('bf-enemy-deck-count').textContent = `🂠 ${s.ai.deck.length}`;

  const pPct = Math.max(0, Math.round((s.player.faceHp / s.player.faceMaxHp) * 100));
  document.getElementById('bf-player-hp-fill').style.width = pPct + '%';
  document.getElementById('bf-player-hp-text').textContent = `${Math.max(0, s.player.faceHp)}/${s.player.faceMaxHp}`;

  const isPlayerTurn = s.turn === 'player' && !s.over;
  const attackerSelected = !!selectedAttackerUid;

  // вражеское поле — цели для атаки, если выбран атакующий
  const enemyBoard = document.getElementById('bf-enemy-board');
  enemyBoard.innerHTML = '';
  s.ai.board.forEach(unit => {
    const node = buildBattleUnitNode(unit, {
      side: 'ai',
      targetable: isPlayerTurn && attackerSelected,
      onClick: () => {
        if (!isPlayerTurn || !attackerSelected) return;
        const ok = BattleSystem.attack(s, 'player', selectedAttackerUid, 'creature', unit.uid);
        if (ok) { haptic('medium'); SoundSystem.battleHit(); }
        selectedAttackerUid = null;
        renderBattleScreen();
        flushBattleLog();
        checkBattleOver();
      },
    });
    enemyBoard.appendChild(node);
  });
  // портрет-лицо соперника — тоже кликабельная цель, если выбран атакующий
  const enemyInfo = document.getElementById('bf-enemy-info');
  enemyInfo.classList.toggle('face-targetable', isPlayerTurn && attackerSelected);
  enemyInfo.onclick = () => { if (isPlayerTurn && attackerSelected) attackEnemyFace(); };

  // поле игрока
  const playerBoard = document.getElementById('bf-player-board');
  playerBoard.innerHTML = '';
  s.player.board.forEach(unit => {
    const canAct = isPlayerTurn && BattleSystem.canAttack(s, 'player', unit.uid);
    const node = buildBattleUnitNode(unit, {
      side: 'player',
      selectable: canAct,
      onClick: () => {
        if (!canAct && selectedAttackerUid !== unit.uid) return;
        selectedAttackerUid = (selectedAttackerUid === unit.uid) ? null : unit.uid;
        haptic('light');
        renderBattleScreen();
      },
    });
    playerBoard.appendChild(node);
  });

  // мана
  const manaRow = document.getElementById('bf-mana-row');
  manaRow.innerHTML = '';
  for (let i = 1; i <= s.player.maxMana; i++) {
    const gem = document.createElement('span');
    gem.className = 'mana-crystal' + (i <= s.player.mana ? ' full' : '');
    manaRow.appendChild(gem);
  }
  const manaLabel = document.createElement('span');
  manaLabel.className = 'mana-label';
  manaLabel.textContent = `${s.player.mana}/${s.player.maxMana}`;
  manaRow.appendChild(manaLabel);

  // рука игрока
  const handRow = document.getElementById('bf-hand-row');
  handRow.innerHTML = '';
  s.player.hand.forEach(card => {
    const affordable = isPlayerTurn && BattleSystem.canPlay(s, 'player', card.uid);
    const node = buildCardNode(card, { variant: 'mini' });
    node.classList.add('hand-card');
    if (!affordable) node.classList.add('unaffordable');
    node.onclick = () => {
      if (!affordable) { if (isPlayerTurn) toast('Не хватает маны или поле заполнено'); return; }
      BattleSystem.playCard(s, 'player', card.uid);
      haptic('light');
      SoundSystem.tap();
      renderBattleScreen();
      flushBattleLog();
      checkBattleOver();
    };
    handRow.appendChild(node);
  });

  const endBtn = document.getElementById('bf-end-turn-btn');
  endBtn.disabled = !isPlayerTurn;
  endBtn.textContent = isPlayerTurn ? 'Завершить ход' : `Ход соперника…`;
}

function attackEnemyFace() {
  if (!battleState || battleState.turn !== 'player' || !selectedAttackerUid) return;
  const ok = BattleSystem.attack(battleState, 'player', selectedAttackerUid, 'face');
  if (ok) { haptic('heavy'); SoundSystem.battleHit(); }
  selectedAttackerUid = null;
  renderBattleScreen();
  flushBattleLog();
  checkBattleOver();
}

function flushBattleLog() {
  if (!battleState) return;
  const strip = document.getElementById('battle-log-strip');
  const newLines = battleState.log.slice(battleLogShown);
  battleLogShown = battleState.log.length;
  newLines.forEach(line => {
    const el = document.createElement('div');
    el.className = 'log-line-b';
    el.textContent = line;
    strip.appendChild(el);
  });
  strip.scrollTop = strip.scrollHeight;
  while (strip.childNodes.length > 40) strip.removeChild(strip.firstChild);
}

function checkBattleOver() {
  if (!battleState || !battleState.over) return;
  const s = battleState;
  const won = s.winner === 'player';
  const level = s.level;

  let reward = 0;
  if (won) {
    reward = rollLevelGold(level);
    state.shards += reward;
    state.wins += 1;
    if (!state.clearedLevels.includes(level.id)) state.clearedLevels.push(level.id);
    haptic('success');
    SoundSystem.victory();
  } else {
    reward = Math.round(level.goldMin * 0.3);
    state.shards += reward;
    state.losses += 1;
    haptic('error');
    SoundSystem.defeat();
  }
  saveState();
  syncShardDisplays();

  const overlay = document.getElementById('battle-result-overlay');
  const card = document.getElementById('battle-result-card');
  const nextLevel = getLevel(level.id + 1);
  card.innerHTML = `
    <div class="battle-result ${won ? 'win' : 'lose'}">${won ? (level.isBoss ? '👑 Босс повержен!' : 'Победа!') : 'Поражение'}</div>
    <p class="hero-sub" style="text-align:center;">+${reward} ${COIN_ICON}</p>
    <div class="battle-result-actions">
      <button class="btn ghost" id="battle-result-map-btn">К карте</button>
      ${won && nextLevel && isLevelUnlocked(nextLevel.id, state) ? `<button class="btn" id="battle-result-next-btn">Следующий уровень →</button>` : ''}
    </div>
  `;
  overlay.classList.add('show');

  document.getElementById('battle-result-map-btn').onclick = () => {
    overlay.classList.remove('show');
    showScreen('screen-battle-setup');
    renderLevelSelect();
  };
  const nextBtn = document.getElementById('battle-result-next-btn');
  if (nextBtn) {
    nextBtn.onclick = () => {
      overlay.classList.remove('show');
      selectedLevelId = nextLevel.id;
      showScreen('screen-deckbuilder');
      renderDeckBuilder();
    };
  }
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
      if (key === 'battle') renderLevelSelect();
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

  document.getElementById('deckbuilder-back-btn').addEventListener('click', () => {
    SoundSystem.tap();
    showScreen('screen-battle-setup');
    renderLevelSelect();
  });

  document.getElementById('bf-end-turn-btn').addEventListener('click', () => {
    if (!battleState || battleState.turn !== 'player' || battleState.over) return;
    selectedAttackerUid = null;
    SoundSystem.tap();
    BattleSystem.endTurn(battleState, 'player');
    renderBattleScreen();
    flushBattleLog();
    checkBattleOver();
  });

  if (tg && tg.BackButton) {
    tg.BackButton.onClick(() => {
      if (document.getElementById('card-modal').classList.contains('active')) {
        closeCardModal();
        return;
      }
      if (document.getElementById('screen-deckbuilder').classList.contains('active')) {
        showScreen('screen-battle-setup');
        renderLevelSelect();
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
