/* ==========================================================
   SHOP.JS — типы бустеров в лавке.
   minRarity: null — обычные честные шансы (см. pack.js).
   minRarity: 'X' — гарантирует, что КАЖДАЯ из 5 карт будет не хуже X.
   ========================================================== */

const PACK_TYPES = {
  standard: {
    id: 'standard',
    name: 'Тёмный бустер',
    desc: '5 карт · честные шансы, шанс на мифическую и «везучий» бустер',
    cost: 100,
    minRarity: null,
    icon: 'cards',
    accent: '#9b6bff',
  },
  premium: {
    id: 'premium',
    name: 'Премиум бустер',
    desc: '5 карт · каждая гарантированно Редкая или выше',
    cost: 380,
    minRarity: 'rare',
    icon: 'bag',
    accent: '#4c8dff',
  },
  mythic: {
    id: 'mythic',
    name: 'Мифический бустер',
    desc: '5 карт · каждая гарантированно Эпическая или выше',
    cost: 950,
    minRarity: 'epic',
    icon: 'chest',
    accent: '#ff3d7a',
  },
};

function getPackType(id) {
  return PACK_TYPES[id] || PACK_TYPES.standard;
}
