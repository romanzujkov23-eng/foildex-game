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
  common:    { label: 'Обычная',     color: '#9098AA', weight: 540,  dust: 5    },
  uncommon:  { label: 'Необычная',   color: '#4FBE7E', weight: 325,  dust: 15   },
  rare:      { label: 'Редкая',      color: '#4C8DFF', weight: 118,  dust: 40   },
  epic:      { label: 'Эпическая',   color: '#E05CE0', weight: 15,   dust: 150  },
  legendary: { label: 'Легендарная', color: '#F0B93F', weight: 1.8,  dust: 500  },
  mythic:    { label: 'Мифическая',  color: '#FF3D7A', weight: 0.35, dust: 2000 },
};

/* Редкости, начиная с которых карта считается "выдающейся" (голографика,
   усиленные эффекты вскрытия, звук, вибро). */
const STANDOUT_RARITIES = ['epic', 'legendary', 'mythic'];

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
  { id:'f08', name:'Обугленный Шакал', element:'fire', rarity:'common', cost:1, attack:3, health:4, ability:'none', value:0, shape:'beast' },
  { id:'f09', name:'Уголья-Змей', element:'fire', rarity:'common', cost:1, attack:3, health:3, ability:'none', value:0, shape:'serpent' },
  { id:'f10', name:'Магна-Скорпион', element:'fire', rarity:'uncommon', cost:2, attack:5, health:6, ability:'poison', value:2, shape:'insect' },
  { id:'f11', name:'Кузнец Пепла', element:'fire', rarity:'uncommon', cost:3, attack:4, health:8, ability:'shield', value:3, shape:'guardian' },
  { id:'f12', name:'Пламенный Оракул', element:'fire', rarity:'rare', cost:4, attack:8, health:9, ability:'drain', value:4, shape:'spirit' },
  { id:'f13', name:'Пожиратель Углей', element:'fire', rarity:'epic', cost:5, attack:11, health:13, ability:'doubleStrike', value:0, shape:'beast' },
  { id:'f14', name:'Феникс Возрождённый', element:'fire', rarity:'legendary', cost:5, attack:12, health:16, ability:'heal', value:6, shape:'bird' },
  { id:'f15', name:'Владыка Пожара Бездны', element:'fire', rarity:'mythic', cost:6, attack:15, health:20, ability:'drain', value:8, shape:'guardian' },

  // ---------- WATER ----------
  { id:'w01', name:'Мальковая Гольда', element:'water', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'serpent' },
  { id:'w02', name:'Лужный Дух', element:'water', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'spirit' },
  { id:'w03', name:'Коралловый Ползун', element:'water', rarity:'common', cost:2, attack:3, health:5, ability:'none', value:0, shape:'insect' },
  { id:'w04', name:'Морозный Тритон', element:'water', rarity:'uncommon', cost:2, attack:4, health:5, ability:'shield', value:3, shape:'beast' },
  { id:'w05', name:'Змей Прибоя', element:'water', rarity:'uncommon', cost:3, attack:5, health:6, ability:'none', value:0, shape:'serpent' },
  { id:'w06', name:'Отпрыск Левиафана', element:'water', rarity:'rare', cost:4, attack:7, health:10, ability:'heal', value:4, shape:'serpent' },
  { id:'w07', name:'Кракен Бездны', element:'water', rarity:'epic', cost:5, attack:11, health:11, ability:'doubleStrike', value:0, shape:'serpent' },
  { id:'w08', name:'Ледяная Выдра', element:'water', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'beast' },
  { id:'w09', name:'Жемчужный Краб', element:'water', rarity:'common', cost:1, attack:2, health:5, ability:'none', value:0, shape:'insect' },
  { id:'w10', name:'Штормовой Угорь', element:'water', rarity:'uncommon', cost:2, attack:5, health:5, ability:'none', value:0, shape:'serpent' },
  { id:'w11', name:'Страж Глубин', element:'water', rarity:'uncommon', cost:3, attack:4, health:8, ability:'shield', value:3, shape:'guardian' },
  { id:'w12', name:'Дух Утопленников', element:'water', rarity:'rare', cost:4, attack:7, health:10, ability:'drain', value:4, shape:'spirit' },
  { id:'w13', name:'Ледовый Исполин', element:'water', rarity:'epic', cost:5, attack:10, health:13, ability:'shield', value:6, shape:'guardian' },
  { id:'w14', name:'Левиафан Пучины', element:'water', rarity:'legendary', cost:5, attack:12, health:17, ability:'heal', value:6, shape:'serpent' },
  { id:'w15', name:'Праматерь Бездны', element:'water', rarity:'mythic', cost:6, attack:15, health:21, ability:'doubleStrike', value:0, shape:'serpent' },

  // ---------- NATURE ----------
  { id:'n01', name:'Росток-Дух', element:'nature', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'spirit' },
  { id:'n02', name:'Колючая Крыса', element:'nature', rarity:'common', cost:1, attack:3, health:3, ability:'none', value:0, shape:'beast' },
  { id:'n03', name:'Мховый Жук', element:'nature', rarity:'common', cost:2, attack:2, health:6, ability:'none', value:0, shape:'insect' },
  { id:'n04', name:'Лозный Волк', element:'nature', rarity:'uncommon', cost:2, attack:4, health:6, ability:'none', value:0, shape:'beast' },
  { id:'n05', name:'Терновый Медведь', element:'nature', rarity:'uncommon', cost:3, attack:5, health:8, ability:'shield', value:3, shape:'beast' },
  { id:'n06', name:'Древний Энт', element:'nature', rarity:'rare', cost:4, attack:6, health:12, ability:'heal', value:5, shape:'guardian' },
  { id:'n07', name:'Мировой Корень', element:'nature', rarity:'legendary', cost:5, attack:9, health:16, ability:'heal', value:6, shape:'guardian' },
  { id:'n08', name:'Терновый Кабан', element:'nature', rarity:'common', cost:1, attack:3, health:5, ability:'none', value:0, shape:'beast' },
  { id:'n09', name:'Болотный Огонёк', element:'nature', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'spirit' },
  { id:'n10', name:'Шипастая Гусеница', element:'nature', rarity:'uncommon', cost:2, attack:4, health:7, ability:'poison', value:2, shape:'insect' },
  { id:'n11', name:'Клыкастый Олень', element:'nature', rarity:'uncommon', cost:2, attack:5, health:6, ability:'none', value:0, shape:'beast' },
  { id:'n12', name:'Страж Чащи', element:'nature', rarity:'rare', cost:4, attack:6, health:13, ability:'shield', value:4, shape:'guardian' },
  { id:'n13', name:'Владыка Листвы', element:'nature', rarity:'epic', cost:5, attack:9, health:14, ability:'heal', value:5, shape:'beast' },
  { id:'n14', name:'Сердце Древнего Леса', element:'nature', rarity:'legendary', cost:5, attack:10, health:18, ability:'heal', value:7, shape:'guardian' },
  { id:'n15', name:'Первокорень Мира', element:'nature', rarity:'mythic', cost:6, attack:13, health:22, ability:'heal', value:9, shape:'guardian' },
  { id:'n16', name:'Лесная Фея', element:'nature', rarity:'mythic', cost:6, attack:12, health:19, ability:'heal', value:8, shape:'spirit' },

  // ---------- ELECTRIC ----------
  { id:'e01', name:'Искровая Мышь', element:'electric', rarity:'common', cost:1, attack:3, health:2, ability:'none', value:0, shape:'beast' },
  { id:'e02', name:'Статик-Нетопырь', element:'electric', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'bird' },
  { id:'e03', name:'Вольтовый Жук', element:'electric', rarity:'common', cost:2, attack:3, health:4, ability:'none', value:0, shape:'insect' },
  { id:'e04', name:'Штормовой Сокол', element:'electric', rarity:'uncommon', cost:2, attack:5, health:3, ability:'none', value:0, shape:'bird' },
  { id:'e05', name:'Громовой Баран', element:'electric', rarity:'uncommon', cost:3, attack:5, health:6, ability:'poison', value:2, shape:'beast' },
  { id:'e06', name:'Джинн Молний', element:'electric', rarity:'rare', cost:4, attack:9, health:7, ability:'doubleStrike', value:0, shape:'spirit' },
  { id:'e07', name:'Электро-Крыс', element:'electric', rarity:'common', cost:1, attack:3, health:3, ability:'none', value:0, shape:'beast' },
  { id:'e08', name:'Грозовой Птенец', element:'electric', rarity:'common', cost:1, attack:3, health:2, ability:'none', value:0, shape:'bird' },
  { id:'e09', name:'Заряженный Жук', element:'electric', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'insect' },
  { id:'e10', name:'Молниеносная Рысь', element:'electric', rarity:'uncommon', cost:2, attack:5, health:5, ability:'none', value:0, shape:'beast' },
  { id:'e11', name:'Искровой Дух', element:'electric', rarity:'uncommon', cost:2, attack:4, health:6, ability:'poison', value:2, shape:'spirit' },
  { id:'e12', name:'Буревестник Гроз', element:'electric', rarity:'rare', cost:4, attack:8, health:8, ability:'doubleStrike', value:0, shape:'bird' },
  { id:'e13', name:'Громовой Тигр', element:'electric', rarity:'epic', cost:5, attack:10, health:11, ability:'doubleStrike', value:0, shape:'beast' },
  { id:'e14', name:'Джинн Бури', element:'electric', rarity:'legendary', cost:5, attack:11, health:15, ability:'drain', value:5, shape:'spirit' },
  { id:'e15', name:'Владыка Грома и Молний', element:'electric', rarity:'mythic', cost:6, attack:14, health:18, ability:'doubleStrike', value:0, shape:'bird' },

  // ---------- SHADOW ----------
  { id:'s01', name:'Сумрачная Летучка', element:'shadow', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'bird' },
  { id:'s02', name:'Теневая Крыса', element:'shadow', rarity:'common', cost:1, attack:3, health:2, ability:'none', value:0, shape:'beast' },
  { id:'s03', name:'Ночной Ползун', element:'shadow', rarity:'common', cost:2, attack:3, health:4, ability:'none', value:0, shape:'insect' },
  { id:'s04', name:'Ночной Гончий', element:'shadow', rarity:'uncommon', cost:2, attack:4, health:5, ability:'drain', value:2, shape:'beast' },
  { id:'s05', name:'Шакал-Призрак', element:'shadow', rarity:'uncommon', cost:3, attack:6, health:5, ability:'none', value:0, shape:'beast' },
  { id:'s06', name:'Жнец Пустоты', element:'shadow', rarity:'rare', cost:4, attack:8, health:8, ability:'drain', value:4, shape:'guardian' },
  { id:'s07', name:'Мрачный Шакал', element:'shadow', rarity:'common', cost:1, attack:3, health:3, ability:'none', value:0, shape:'beast' },
  { id:'s08', name:'Паук Тьмы', element:'shadow', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'insect' },
  { id:'s09', name:'Крикунья Полуночи', element:'shadow', rarity:'common', cost:1, attack:3, health:3, ability:'none', value:0, shape:'bird' },
  { id:'s10', name:'Костяной Волк', element:'shadow', rarity:'uncommon', cost:2, attack:5, health:5, ability:'drain', value:2, shape:'beast' },
  { id:'s11', name:'Плакальщица Теней', element:'shadow', rarity:'uncommon', cost:2, attack:4, health:6, ability:'none', value:0, shape:'spirit' },
  { id:'s12', name:'Палач Забвения', element:'shadow', rarity:'rare', cost:4, attack:7, health:10, ability:'drain', value:4, shape:'guardian' },
  { id:'s13', name:'Пожиратель Душ', element:'shadow', rarity:'epic', cost:5, attack:10, health:12, ability:'drain', value:5, shape:'beast' },
  { id:'s14', name:'Владыка Пустоты', element:'shadow', rarity:'legendary', cost:5, attack:11, health:16, ability:'drain', value:6, shape:'guardian' },
  { id:'s15', name:'Изначальная Тьма', element:'shadow', rarity:'mythic', cost:6, attack:14, health:19, ability:'drain', value:8, shape:'guardian' },

  // ---------- LIGHT ----------
  { id:'l01', name:'Мерцающая Мушка', element:'light', rarity:'common', cost:1, attack:2, health:3, ability:'none', value:0, shape:'insect' },
  { id:'l02', name:'Рассветный Воробей', element:'light', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'bird' },
  { id:'l03', name:'Ореольный Заяц', element:'light', rarity:'common', cost:2, attack:3, health:5, ability:'none', value:0, shape:'beast' },
  { id:'l04', name:'Лучистый Лис', element:'light', rarity:'uncommon', cost:2, attack:4, health:6, ability:'shield', value:2, shape:'beast' },
  { id:'l05', name:'Солнечный Страж', element:'light', rarity:'uncommon', cost:3, attack:5, health:7, ability:'heal', value:3, shape:'guardian' },
  { id:'l06', name:'Серафим-Рыцарь', element:'light', rarity:'rare', cost:4, attack:7, health:11, ability:'shield', value:5, shape:'guardian' },
  { id:'l07', name:'Ясноглазый Совёнок', element:'light', rarity:'common', cost:1, attack:2, health:4, ability:'none', value:0, shape:'bird' },
  { id:'l08', name:'Светлячковый Олень', element:'light', rarity:'common', cost:1, attack:3, health:4, ability:'none', value:0, shape:'beast' },
  { id:'l09', name:'Хрустальная Пчела', element:'light', rarity:'uncommon', cost:2, attack:3, health:5, ability:'heal', value:2, shape:'insect' },
  { id:'l10', name:'Хранитель Рассвета', element:'light', rarity:'uncommon', cost:3, attack:4, health:7, ability:'shield', value:3, shape:'guardian' },
  { id:'l11', name:'Единорог Зари', element:'light', rarity:'rare', cost:4, attack:7, health:10, ability:'heal', value:4, shape:'beast' },
  { id:'l12', name:'Архангел-Заступник', element:'light', rarity:'epic', cost:5, attack:9, health:14, ability:'shield', value:6, shape:'guardian' },
  { id:'l13', name:'Серафим Света', element:'light', rarity:'legendary', cost:5, attack:11, health:17, ability:'heal', value:7, shape:'guardian' },
  { id:'l14', name:'Владыка Небесного Пламени', element:'light', rarity:'mythic', cost:6, attack:14, health:20, ability:'shield', value:9, shape:'guardian' },
];

/* Быстрый доступ к карте по id */
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
