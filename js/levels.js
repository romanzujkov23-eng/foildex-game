/* ==========================================================
   LEVELS.JS — карта уровней Арены
   Каждый уровень описывает соперника-ИИ: его стихию (влияет на
   стихийные бонусы урона, см. ELEMENT_ADVANTAGE в cards.js),
   пул редкостей карт, размер колоды, здоровье и награду золотом.
   Боссы — сильнее и заметно выгоднее по награде.
   ========================================================== */

const LEVELS = [
  { id: 1,  name: 'Голодный Бродяга',        element: 'fire',     isBoss: false, pool: ['common'],                              deckSize: 8,  faceHp: 20, goldMin: 18, goldMax: 26 },
  { id: 2,  name: 'Костровой Вор',           element: 'fire',     isBoss: false, pool: ['common', 'uncommon'],                  deckSize: 8,  faceHp: 22, goldMin: 20, goldMax: 30 },
  { id: 3,  name: 'Орк-Латник Пепла',        element: 'fire',     isBoss: false, pool: ['common', 'uncommon'],                  deckSize: 8,  faceHp: 24, goldMin: 24, goldMax: 34 },
  { id: 4,  name: 'Пиромант-Отступник',      element: 'fire',     isBoss: false, pool: ['uncommon', 'rare'],                    deckSize: 9,  faceHp: 26, goldMin: 28, goldMax: 40 },
  { id: 5,  name: 'Дракон Инферно',          element: 'fire',     isBoss: true,  pool: ['uncommon', 'rare', 'epic'],            deckSize: 9,  faceHp: 34, goldMin: 80,  goldMax: 100 },

  { id: 6,  name: 'Штормовая Крачка',        element: 'water',    isBoss: false, pool: ['common', 'uncommon'],                  deckSize: 9,  faceHp: 26, goldMin: 30, goldMax: 42 },
  { id: 7,  name: 'Орк Затонувшего Флота',   element: 'water',   isBoss: false, pool: ['common', 'uncommon', 'rare'],          deckSize: 9,  faceHp: 28, goldMin: 34, goldMax: 46 },
  { id: 8,  name: 'Заклинательница Приливов', element: 'water',   isBoss: false, pool: ['uncommon', 'rare'],                    deckSize: 10, faceHp: 30, goldMin: 38, goldMax: 50 },
  { id: 9,  name: 'Ледяной Тролль Пучины',    element: 'water',   isBoss: false, pool: ['uncommon', 'rare', 'epic'],            deckSize: 10, faceHp: 32, goldMin: 42, goldMax: 56 },
  { id: 10, name: 'Праматерь Бездны',         element: 'water',   isBoss: true,  pool: ['rare', 'epic', 'legendary'],           deckSize: 10, faceHp: 42, goldMin: 130, goldMax: 160 },

  { id: 11, name: 'Архидруид Изначального Леса', element: 'nature',  isBoss: false, pool: ['uncommon', 'rare'],                 deckSize: 10, faceHp: 32, goldMin: 46, goldMax: 60 },
  { id: 12, name: 'Штормовой Заклинатель',       element: 'electric', isBoss: false, pool: ['uncommon', 'rare', 'epic'],        deckSize: 10, faceHp: 34, goldMin: 50, goldMax: 66 },
  { id: 13, name: 'Паладин Грозовых Небес',      element: 'electric', isBoss: false, pool: ['rare', 'epic'],                    deckSize: 11, faceHp: 36, goldMin: 56, goldMax: 72 },
  { id: 14, name: 'Лич Увядшей Рощи',            element: 'nature',  isBoss: false, pool: ['rare', 'epic'],                     deckSize: 11, faceHp: 38, goldMin: 62, goldMax: 80 },
  { id: 15, name: 'Драконлич Пустоты',            element: 'shadow',  isBoss: true,  pool: ['epic', 'legendary'],                deckSize: 11, faceHp: 50, goldMin: 200, goldMax: 240 },

  { id: 16, name: 'Рыцарь Забвения',        element: 'shadow',   isBoss: false, pool: ['rare', 'epic'],                        deckSize: 11, faceHp: 40, goldMin: 80,  goldMax: 100 },
  { id: 17, name: 'Проклятая Принцесса Костей', element: 'shadow', isBoss: false, pool: ['rare', 'epic', 'legendary'],          deckSize: 11, faceHp: 42, goldMin: 90,  goldMax: 112 },
  { id: 18, name: 'Архангел-Заступник',     element: 'light',    isBoss: false, pool: ['epic', 'legendary'],                   deckSize: 12, faceHp: 44, goldMin: 100, goldMax: 126 },
  { id: 19, name: 'Серафим Света',          element: 'light',    isBoss: false, pool: ['epic', 'legendary'],                   deckSize: 12, faceHp: 46, goldMin: 112, goldMax: 140 },
  { id: 20, name: 'Король Небесного Пламени', element: 'light',  isBoss: true,  pool: ['epic', 'legendary', 'mythic'],         deckSize: 12, faceHp: 60, goldMin: 380, goldMax: 460 },
];

/* ----------------------------------------------------------
   Главы 3-10 (уровни 21-100) — сгенерированы формулой, чтобы
   Арена была по-настоящему длинной, без ручного набора 80 строк.
   Каждая глава — 10 уровней одной стихии, 10-й — предводитель главы.
   ---------------------------------------------------------- */

const ELEMENT_CYCLE = ['fire', 'water', 'nature', 'electric', 'shadow', 'light'];
// главы 2..7 (id 21-80) — по одной стихии на главу, как и в главах 0-1;
// главы 8-9 (id 81-100) — хаотичные, стихии чередуются внутри главы
const CHAPTER_ELEMENT = { 2: 'fire', 3: 'water', 4: 'nature', 5: 'electric', 6: 'shadow', 7: 'light' };
const RARITY_ORDER_L = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const FODDER_ADJ = [
  'Иссохший', 'Безымянный', 'Проклятый', 'Забытый', 'Кровавый', 'Сумеречный', 'Отверженный',
  'Безумный', 'Одержимый', 'Падший', 'Взбешённый', 'Скорбный', 'Пепельный', 'Костяной',
  'Ядовитый', 'Разорённый', 'Неупокоенный', 'Бродячий', 'Заклятый', 'Мятежный', 'Ветхий', 'Клятый',
];
const FODDER_ROLE = [
  'Головорез', 'Мародёр', 'Наёмник', 'Ловчий', 'Страж', 'Заклинатель', 'Палач', 'Отступник',
  'Служитель', 'Изгой', 'Скиталец', 'Жрец', 'Вестник', 'Клинок', 'Охотник', 'Кузнец',
  'Пилигрим', 'Костоправ', 'Разоритель', 'Штурмовик',
];

const CHAPTER_BOSSES = {
  30:  'Повелитель Испепеляющих Легионов',
  40:  'Архонт Ледяной Пучины',
  50:  'Патриарх Гниющих Чащоб',
  60:  'Владыка Разрывающих Гроз',
  70:  'Царь Немой Тьмы',
  80:  'Архонт Слепящего Сияния',
  90:  'Вестник Всепоглощающего Хаоса',
  100: 'Изначальный Пожиратель Миров',
};

function generateLaterLevels() {
  // детерминированная "тасовка" пар прилагательное×роль, чтобы имена
  // не повторялись между уровнями (комбинаций 22×20=440 — с запасом)
  const namePairs = [];
  FODDER_ADJ.forEach(a => FODDER_ROLE.forEach(r => namePairs.push(`${a} ${r}`)));
  let seed = 1337;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = namePairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [namePairs[i], namePairs[j]] = [namePairs[j], namePairs[i]];
  }

  const levels = [];
  let nameIdx = 0;
  for (let id = 21; id <= 100; id++) {
    const chapter = Math.floor((id - 1) / 10);       // 2..9
    const posInChapter = (id - 1) % 10;              // 0..9, 9 = босс главы
    const isBoss = posInChapter === 9;
    const element = CHAPTER_ELEMENT[chapter] || ELEMENT_CYCLE[(id + chapter) % ELEMENT_CYCLE.length];
    const progress = (id - 21) / (100 - 21);          // 0..1 общий прогресс по хвосту Арены

    // пул редкостей плавно смещается вверх; у боссов на ступень выше обычных
    const floorIdx = Math.min(5, Math.floor(progress * 5));       // 0..5
    const topIdx = Math.min(5, floorIdx + 2 + (isBoss ? 1 : 0));
    const pool = RARITY_ORDER_L.slice(floorIdx, topIdx + 1);

    const deckSize = Math.min(16, 12 + Math.floor(progress * 5) + (isBoss ? 1 : 0));
    const faceHp = Math.round(48 + progress * 90 + (isBoss ? 26 : 0));
    const goldBase = Math.round(120 + progress * 900);
    const goldMin = isBoss ? Math.round(goldBase * 2.4) : goldBase;
    const goldMax = isBoss ? Math.round(goldBase * 3) : Math.round(goldBase * 1.35);

    const name = isBoss ? CHAPTER_BOSSES[id] : namePairs[nameIdx++ % namePairs.length];

    levels.push({ id, name, element, isBoss, pool, deckSize, faceHp, goldMin, goldMax });
  }
  return levels;
}

LEVELS.push(...generateLaterLevels());

const PLAYER_FACE_HP = 30;
const MIN_DECK_SIZE = 8;
const MAX_DECK_SIZE = 12;

function getLevel(id) {
  return LEVELS.find(l => l.id === id) || null;
}

function isLevelUnlocked(id, state) {
  if (id === 1) return true;
  const cleared = state.clearedLevels || [];
  return cleared.includes(id - 1);
}

function isLevelCleared(id, state) {
  return (state.clearedLevels || []).includes(id);
}

function rollLevelGold(level) {
  return level.goldMin + Math.floor(Math.random() * (level.goldMax - level.goldMin + 1));
}

/* Собирает колоду ИИ: пул карт нужных редкостей, с уклоном (70%) в
   заглавную стихию уровня — так матчап "своя стихия против чужой"
   действительно ощущается, но колода не мономастная. */
function buildAiDeck(level) {
  const rarityPool = CARDS.filter(c => level.pool.includes(c.rarity));
  const themed = rarityPool.filter(c => c.element === level.element);
  const other = rarityPool.filter(c => c.element !== level.element);
  const deck = [];
  for (let i = 0; i < level.deckSize; i++) {
    const useThemed = themed.length > 0 && (other.length === 0 || Math.random() < 0.7);
    const src = useThemed ? themed : other;
    deck.push(src[Math.floor(Math.random() * src.length)]);
  }
  return deck;
}

/* Доминирующая стихия колоды — для баннера "стихийное преимущество" перед боем. */
function dominantElement(cardIds) {
  const counts = {};
  cardIds.forEach(id => {
    const c = CARD_BY_ID[id];
    if (!c) return;
    counts[c.element] = (counts[c.element] || 0) + 1;
  });
  let best = null, bestN = -1;
  Object.entries(counts).forEach(([el, n]) => { if (n > bestN) { best = el; bestN = n; } });
  return best;
}

function matchupInfo(playerElement, aiElement) {
  if (!playerElement || !aiElement || playerElement === aiElement) return { state: 'neutral' };
  if (ELEMENT_ADVANTAGE[playerElement] === aiElement) return { state: 'favor' };
  if (ELEMENT_ADVANTAGE[aiElement] === playerElement) return { state: 'against' };
  return { state: 'neutral' };
}
