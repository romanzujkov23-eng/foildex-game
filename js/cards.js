/* ==========================================================
   CARDS.JS — карточная база игры
   Каждая карта: id, name, element, rarity, cost, attack, health,
   ability (none | shield | poison | heal | doubleStrike | drain),
   value (сила способности), shape (архетип силуэта для арта:
   beast | bird | serpent | insect | spirit | guardian)
   ========================================================== */

const ELEMENTS = {
  fire:     { label: 'Огонь',    color: '#FF6B4A', emoji: '🔥' },
  water:    { label: 'Вода',     color: '#4AC0FF', emoji: '🌊' },
  nature:   { label: 'Природа',  color: '#6BCB6B', emoji: '🌿' },
  electric: { label: 'Молния',   color: '#FFD84A', emoji: '⚡' },
  shadow:   { label: 'Тень',     color: '#B15CFF', emoji: '🌑' },
  light:    { label: 'Свет',     color: '#FFE9A6', emoji: '✨' },
};

const RARITIES = {
  common:    { label: 'Обычная',    color: '#9098AA', weight: 55, dust: 5 },
  uncommon:  { label: 'Необычная',  color: '#4FBE7E', weight: 27, dust: 15 },
  rare:      { label: 'Редкая',     color: '#4C8DFF', weight: 12, dust: 40 },
  epic:      { label: 'Эпическая',  color: '#B15CFF', weight: 5,  dust: 100 },
  legendary: { label: 'Легендарная',color: '#FFB238', weight: 1,  dust: 300 },
};

const ABILITIES = {
  none:         { label: '—' },
  shield:       { label: 'Щит', desc: v => `Блокирует ${v} урона от первой атаки` },
  poison:       { label: 'Яд', desc: v => `Наносит ${v} доп. урона в этом бою` },
  heal:         { label: 'Лечение', desc: v => `Лечит следующего союзника на ${v}` },
  doubleStrike: { label: 'Двойной удар', desc: () => `Атакует дважды` },
  drain:        { label: 'Похищение', desc: v => `Восстанавливает ${v} здоровья при ударе` },
};

const CARDS = [
  // ---------- FIRE ----------
  { id:'f01', name:'Тлеющий Щенок', element:'fire', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'beast' },
  { id:'f02', name:'Пепельный Волчонок', element:'fire', rarity:'common', cost:2, attack:3, health:4, ability:'none', value:0, shape:'beast' },
  { id:'f03', name:'Огненный Бесёнок', element:'fire', rarity:'common', cost:1, attack:3, health:2, ability:'none', value:0, shape:'spirit' },
  { id:'f04', name:'Магма-Краб', element:'fire', rarity:'uncommon', cost:2, attack:4, health:6, ability:'shield', value:2, shape:'insect' },
  { id:'f05', name:'Ястреб Пожарищ', element:'fire', rarity:'uncommon', cost:3, attack:6, health:4, ability:'none', value:0, shape:'bird' },
  { id:'f06', name:'Дракон Инферно', element:'fire', rarity:'rare', cost:4, attack:8, health:9, ability:'poison', value:3, shape:'bird' },
  { id:'f07', name:'Феникс (детёныш)', element:'fire', rarity:'epic', cost:5, attack:10, health:12, ability:'drain', value:5, shape:'bird' },

  // ---------- WATER ----------
  { id:'w01', name:'Мальковая Гольда', element:'water', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'serpent' },
  { id:'w02', name:'Лужный Дух', element:'water', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'spirit' },
  { id:'w03', name:'Коралловый Ползун', element:'water', rarity:'common', cost:2, attack:3, health:5, ability:'none', value:0, shape:'insect' },
  { id:'w04', name:'Морозный Тритон', element:'water', rarity:'uncommon', cost:2, attack:4, health:5, ability:'shield', value:3, shape:'beast' },
  { id:'w05', name:'Змей Прибоя', element:'water', rarity:'uncommon', cost:3, attack:5, health:6, ability:'none', value:0, shape:'serpent' },
  { id:'w06', name:'Отпрыск Левиафана', element:'water', rarity:'rare', cost:4, attack:7, health:10, ability:'heal', value:4, shape:'serpent' },
  { id:'w07', name:'Кракен Бездны', element:'water', rarity:'epic', cost:5, attack:11, health:11, ability:'doubleStrike', value:0, shape:'serpent' },

  // ---------- NATURE ----------
  { id:'n01', name:'Росток-Дух', element:'nature', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'spirit' },
  { id:'n02', name:'Колючая Крыса', element:'nature', rarity:'common', cost:1, attack:3, health:3, ability:'none', value:0, shape:'beast' },
  { id:'n03', name:'Мховый Жук', element:'nature', rarity:'common', cost:2, attack:2, health:6, ability:'none', value:0, shape:'insect' },
  { id:'n04', name:'Лозный Волк', element:'nature', rarity:'uncommon', cost:2, attack:4, health:6, ability:'none', value:0, shape:'beast' },
  { id:'n05', name:'Терновый Медведь', element:'nature', rarity:'uncommon', cost:3, attack:5, health:8, ability:'shield', value:3, shape:'beast' },
  { id:'n06', name:'Древний Энт', element:'nature', rarity:'rare', cost:4, attack:6, health:12, ability:'heal', value:5, shape:'guardian' },
  { id:'n07', name:'Мировой Корень', element:'nature', rarity:'legendary', cost:5, attack:9, health:16, ability:'heal', value:6, shape:'guardian' },

  // ---------- ELECTRIC ----------
  { id:'e01', name:'Искровая Мышь', element:'electric', rarity:'common', cost:1, attack:3, health:2, ability:'none', value:0, shape:'beast' },
  { id:'e02', name:'Статик-Нетопырь', element:'electric', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'bird' },
  { id:'e03', name:'Вольтовый Жук', element:'electric', rarity:'common', cost:2, attack:3, health:4, ability:'none', value:0, shape:'insect' },
  { id:'e04', name:'Штормовой Сокол', element:'electric', rarity:'uncommon', cost:2, attack:5, health:3, ability:'none', value:0, shape:'bird' },
  { id:'e05', name:'Громовой Баран', element:'electric', rarity:'uncommon', cost:3, attack:5, health:6, ability:'poison', value:2, shape:'beast' },
  { id:'e06', name:'Джинн Молний', element:'electric', rarity:'rare', cost:4, attack:9, health:7, ability:'doubleStrike', value:0, shape:'spirit' },

  // ---------- SHADOW ----------
  { id:'s01', name:'Сумрачная Летучка', element:'shadow', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'bird' },
  { id:'s02', name:'Теневая Крыса', element:'shadow', rarity:'common', cost:1, attack:3, health:2, ability:'none', value:0, shape:'beast' },
  { id:'s03', name:'Ночной Ползун', element:'shadow', rarity:'common', cost:2, attack:3, health:4, ability:'none', value:0, shape:'insect' },
  { id:'s04', name:'Ночной Гончий', element:'shadow', rarity:'uncommon', cost:2, attack:4, health:5, ability:'drain', value:2, shape:'beast' },
  { id:'s05', name:'Шакал-Призрак', element:'shadow', rarity:'uncommon', cost:3, attack:6, health:5, ability:'none', value:0, shape:'beast' },
  { id:'s06', name:'Жнец Пустоты', element:'shadow', rarity:'rare', cost:4, attack:8, health:8, ability:'drain', value:4, shape:'guardian' },

  // ---------- LIGHT ----------
  { id:'l01', name:'Мерцающая Мушка', element:'light', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'insect' },
  { id:'l02', name:'Рассветный Воробей', element:'light', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'bird' },
  { id:'l03', name:'Ореольный Заяц', element:'light', rarity:'common', cost:2, attack:3, health:5, ability:'none', value:0, shape:'beast' },
  { id:'l04', name:'Лучистый Лис', element:'light', rarity:'uncommon', cost:2, attack:4, health:6, ability:'shield', value:2, shape:'beast' },
  { id:'l05', name:'Солнечный Страж', element:'light', rarity:'uncommon', cost:3, attack:5, health:7, ability:'heal', value:3, shape:'guardian' },
  { id:'l06', name:'Серафим-Рыцарь', element:'light', rarity:'rare', cost:4, attack:7, health:11, ability:'shield', value:5, shape:'guardian' },
];

/* Быстрый доступ к карте по id */
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
