/* ==========================================================
   STORAGE.JS — сохранение прогресса
   Если игра открыта внутри Telegram — используем CloudStorage
   (синхронизируется между устройствами игрока бесплатно).
   Если открыта в обычном браузере (например, при тестировании
   на GitHub Pages напрямую) — используем localStorage.
   ========================================================== */

const Store = (() => {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  const hasCloud = !!(tg && tg.CloudStorage);

  function get(key) {
    return new Promise((resolve) => {
      if (hasCloud) {
        tg.CloudStorage.getItem(key, (err, value) => {
          if (err || value === undefined || value === '') resolve(null);
          else resolve(value);
        });
      } else {
        resolve(localStorage.getItem(key));
      }
    });
  }

  function set(key, value) {
    return new Promise((resolve) => {
      if (hasCloud) {
        tg.CloudStorage.setItem(key, value, () => resolve(true));
      } else {
        localStorage.setItem(key, value);
        resolve(true);
      }
    });
  }

  return { get, set, hasCloud, tg };
})();
