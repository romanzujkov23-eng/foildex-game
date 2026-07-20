/* ==========================================================
   ICONS.JS — единый набор кастомных SVG-иконок вместо эмодзи.
   Icon(name, opts) -> строка <svg>. Используют currentColor,
   поэтому красятся через CSS `color`, если не передан свой size.
   ========================================================== */

const ICON_PATHS = {
  coin: `<defs><linearGradient id="icoCoinGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f6d488"/><stop offset="55%" stop-color="#e8b64a"/><stop offset="100%" stop-color="#a9761f"/></linearGradient></defs><circle cx="12" cy="12" r="8.5" fill="url(#icoCoinGrad)" stroke="#8a6423" stroke-width="1"/><circle cx="12" cy="12" r="5.4" fill="none" stroke="#8a6423" stroke-width="0.9" opacity="0.55"/><path d="M9.6 9.3c0-1 .9-1.7 2.2-1.7.9 0 1.7.35 2.1.9" fill="none" stroke="#6e4d19" stroke-width="1" stroke-linecap="round"/>`,
  mana: `<path d="M12 2.5c2.7 4 6 7.6 6 11.7a6 6 0 1 1-12 0c0-4.1 3.3-7.7 6-11.7z"/>`,
  sword: `<path d="M20.5 3.5l-9 9-1.6-1.6 9-9zM10 12l1.6 1.6-6 6-2.2.6.6-2.2z" stroke-linejoin="round"/><path d="M14.5 8.5l3.6 3.6" stroke-linecap="round"/>`,
  heart: `<path d="M12 20.5s-7.6-4.7-9.8-9.3C.6 7.5 2.3 3.8 6 3.2c2.1-.3 3.9.7 6 3 2.1-2.3 3.9-3.3 6-3 3.7.6 5.4 4.3 3.8 8-2.2 4.6-9.8 9.3-9.8 9.3z"/>`,
  shield: `<path d="M12 2l7.5 3v6c0 5-3.2 8.7-7.5 11-4.3-2.3-7.5-6-7.5-11V5z" fill="none" stroke-width="1.8" stroke-linejoin="round"/>`,
  crown: `<path d="M3 8l4 3 5-6 5 6 4-3-1.7 10H4.7L3 8z" stroke-linejoin="round"/><rect x="4.5" y="18.5" width="15" height="2.3" rx="0.6"/>`,
  lock: `<rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke-width="1.8"/><path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" fill="none" stroke-width="1.8" stroke-linecap="round"/>`,
  check: `<path d="M4.5 12.5l5 5L20 6.5" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  cards: `<defs><linearGradient id="icoCoinGrad2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9b6bff"/><stop offset="100%" stop-color="#5a3fb0"/></linearGradient></defs><rect x="3.5" y="6" width="12" height="15" rx="2" transform="rotate(-8 9.5 13.5)" fill="none" stroke-width="1.6"/><rect x="8" y="4" width="12" height="16" rx="2" fill="url(#icoCoinGrad2)" stroke-width="1.6"/>`,
  book: `<path d="M4 4.8c2.4-1 5.4-1 8 .6v13.8c-2.6-1.6-5.6-1.6-8-.6z" fill="none" stroke-width="1.7" stroke-linejoin="round"/><path d="M20 4.8c-2.4-1-5.4-1-8 .6v13.8c2.6-1.6 5.6-1.6 8-.6z" fill="none" stroke-width="1.7" stroke-linejoin="round"/>`,
  back: `<path d="M15 5l-7 7 7 7" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" stroke-width="2.3" stroke-linecap="round"/>`,
  info: `<circle cx="12" cy="12" r="9.2" fill="none" stroke-width="1.7"/><circle cx="12" cy="8.3" r="1.15"/><path d="M12 11.3v6" stroke-width="2" stroke-linecap="round"/>`,
  bag: `<path d="M7 8.5l1.3-3.7A2 2 0 0 1 10.2 3.4h3.6a2 2 0 0 1 1.9 1.4L17 8.5" fill="none" stroke-width="1.7" stroke-linejoin="round"/><path d="M5.3 8.5h13.4l1 11a2 2 0 0 1-2 2.1H6.3a2 2 0 0 1-2-2.1z" fill="none" stroke-width="1.7" stroke-linejoin="round"/>`,
  chest: `<path d="M3.5 10.5h17v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="none" stroke-width="1.7" stroke-linejoin="round"/><path d="M3.5 10.5c0-3.6 2-6 8.5-6s8.5 2.4 8.5 6" fill="none" stroke-width="1.7"/><path d="M3.5 14h17M10.5 14v3.4M13.5 14v3.4" stroke-width="1.4"/>`,
  trophy: `<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="none" stroke-width="1.7"/><path d="M7 5.5H4a3 3 0 0 0 3 5.5M17 5.5h3a3 3 0 0 1-3 5.5" fill="none" stroke-width="1.5"/><path d="M12 14v3.5M8.5 20.5h7M9.5 17.5h5l.6 3H8.9z" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`,
  skull: `<path d="M12 3.5c-4 0-7 3-7 6.8 0 2.4 1.2 4 2.6 5.2v2.7c0 .6.5 1 1 1h1.2v-1.7h1v1.7h2.4v-1.7h1v1.7H15c.6 0 1-.4 1-1v-2.7c1.4-1.2 2.6-2.8 2.6-5.2 0-3.8-3-6.8-6.6-6.8z" fill="none" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9.3" cy="11" r="1.3"/><circle cx="14.7" cy="11" r="1.3"/>`,
  gear: `<circle cx="12" cy="12" r="3" fill="none" stroke-width="1.7"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.1 5.9l-1.8 1.8M7.7 16.3l-1.8 1.8M18.1 18.1l-1.8-1.8M7.7 7.7L5.9 5.9" stroke-width="1.7" stroke-linecap="round"/>`,
  speakerOn: `<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="1.6" stroke-linecap="round"/>`,
  speakerOff: `<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" stroke-linejoin="round"/><path d="M16.5 9.5l4.5 5M21 9.5l-4.5 5" stroke-width="1.8" stroke-linecap="round"/>`,
  play: `<path d="M6 4.5l14 7.5-14 7.5z" stroke-linejoin="round"/>`,
  bolt: `<path d="M13 2.5L5 14h5.5l-1.5 7.5L19 10h-5.5z" stroke-linejoin="round"/>`,
  poison: `<path d="M12 2.5c1.6 3 4.5 4.6 4.5 8.5a4.5 4.5 0 1 1-9 0c0-3.9 2.9-5.5 4.5-8.5z" fill="none" stroke-width="1.7"/><circle cx="10.3" cy="12.5" r="1"/><circle cx="13.5" cy="14" r="0.8"/>`,
  heal: `<path d="M12 3.5v17M3.5 12h17" stroke-width="3" stroke-linecap="round"/>`,
  doubleStrike: `<path d="M17 3l-9 9-1.4-1.4L15.6 1.6zM8 12l1.4 1.4-6 6-1.9.5.5-1.9z" stroke-linejoin="round"/><path d="M21 7l-9 9-1.4-1.4L19.6 5.6zM12 16l1.4 1.4-4.5 4.5-1.9.5.5-1.9z" stroke-linejoin="round" opacity="0.6"/>`,
  drain: `<path d="M12 3c2.4 3.8 6 7.4 6 11.3a6 6 0 1 1-12 0C6 10.4 9.6 6.8 12 3z" fill="none" stroke-width="1.6"/><path d="M9 15.5a3 3 0 0 0 3 3" fill="none" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>`,
  none: `<circle cx="12" cy="12" r="1.6"/>`,
  swords: `<path d="M4 3l8 8-2 2-8-8zM12 11l2 2-6 6-2.5.5.5-2.5z" stroke-linejoin="round"/><path d="M20 3l-8 8 2 2 8-8z" stroke-linejoin="round"/>`,
  target: `<circle cx="12" cy="12" r="8" fill="none" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" fill="none" stroke-width="1.6"/><circle cx="12" cy="12" r="1"/>`,
  deckBack: `<rect x="4" y="3" width="16" height="18" rx="2.4" fill="none" stroke-width="1.6"/><path d="M12 6.5v11M7.5 12h9" stroke-width="1.3" opacity="0.55"/>`,
  home: `<path d="M4 11.5L12 4l8 7.5" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h12v-9.5" fill="none" stroke-width="1.9" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="6" fill="none" stroke-width="1.5"/>`,
  grimoire: `<path d="M5 4.5c1.6-1.3 4.6-1.3 7 0v15c-2.4-1.3-5.4-1.3-7 0z" fill="none" stroke-width="1.7" stroke-linejoin="round"/><path d="M19 4.5c-1.6-1.3-4.6-1.3-7 0v15c2.4-1.3 5.4-1.3 7 0z" fill="none" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="1.4" fill="none" stroke-width="1.2"/>`,
  arena: `<path d="M20.5 3.5l-9 9-1.6-1.6 9-9zM10 12l1.6 1.6-6 6-2.2.6.6-2.2z" stroke-linejoin="round"/><path d="M14.5 8.5l3.6 3.6" stroke-linecap="round"/>`,
  shop: `<path d="M7 8.5l1.3-3.7A2 2 0 0 1 10.2 3.4h3.6a2 2 0 0 1 1.9 1.4L17 8.5" fill="none" stroke-width="1.6" stroke-linejoin="round"/><path d="M5.3 8.5h13.4l1 11a2 2 0 0 1-2 2.1H6.3a2 2 0 0 1-2-2.1z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>`,
  fire: `<path d="M12 2.3c1 3 4.8 5 4.8 9.4a4.8 4.8 0 1 1-9.6 0c0-1.6.7-2.6 1.4-3.7.2 1.2 1 1.8 1.7 1.8-.5-2.4.4-4.8 1.7-7.5z"/>`,
  water: `<path d="M12 2.8c3 4.4 6.6 8.4 6.6 12.7a6.6 6.6 0 1 1-13.2 0c0-4.3 3.6-8.3 6.6-12.7z"/>`,
  nature: `<path d="M12 21V9M12 9c-4-.2-7-2.6-7-6 3.6 0 6.4 1.6 7 4.6C12.6 4.6 15.4 3 19 3c0 3.4-3 5.8-7 6z"/>`,
  electric: `<path d="M13 2.5L5 14h5.5l-1.5 7.5L19 10h-5.5z" stroke-linejoin="round"/>`,
  shadow: `<path d="M20 13a8 8 0 1 1-9-9 6.5 6.5 0 0 0 9 9z"/>`,
  light: `<circle cx="12" cy="12" r="4.3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1M18.6 18.6l-2.1-2.1M7.5 7.5L5.4 5.4" stroke-width="1.7" stroke-linecap="round"/>`,
};

function Icon(name, opts = {}) {
  const { size = 16, color = 'currentColor', className = '' } = opts;
  const body = ICON_PATHS[name] || ICON_PATHS.none;
  return `<svg class="icon icon-${name} ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="${color}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

const ELEMENT_ICON = { fire: 'fire', water: 'water', nature: 'nature', electric: 'electric', shadow: 'shadow', light: 'light' };
const ABILITY_ICON_NAME = { none: 'none', shield: 'shield', poison: 'poison', heal: 'heal', doubleStrike: 'doubleStrike', drain: 'drain' };
