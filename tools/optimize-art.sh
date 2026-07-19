#!/usr/bin/env bash
# ==========================================================
# optimize-art.sh — подготовка артов карт под Telegram Mini App
#
# Что делает:
#   1) Берёт все изображения из tools/raw/  (как вы их скачали
#      из generate-art.py, Midjourney, Leonardo, DALL-E — любого
#      размера/формата)
#   2) Обрезает их в квадрат, уменьшает до 640×640
#   3) Сохраняет в assets/cards/<id>.webp  (основной, лёгкий)
#      и assets/cards/<id>.jpg  (запасной формат для старых
#      браузеров/Telegram-клиентов без webp)
#
# Всего в игре 89 карт (id от f01 до l14) — скрипт обработает
# ровно те файлы, что реально лежат в tools/raw/, и ничего лишнего.
#
# Использование:
#   1. Положите файлы в tools/raw/ с именами, совпадающими
#      с id карты, например: tools/raw/f01.png, tools/raw/n07.jpg
#   2. Запустите:  bash tools/optimize-art.sh
#   3. Готовые файлы появятся в assets/cards/
#
# Требуется ImageMagick (команда `convert`). Обычно уже стоит
# на Linux/Mac; на Windows — через WSL или https://imagemagick.org
# ==========================================================
set -euo pipefail

RAW_DIR="tools/raw"
OUT_DIR="assets/cards"
SIZE=640
WEBP_QUALITY=82
JPG_QUALITY=85

mkdir -p "$OUT_DIR"

if [ ! -d "$RAW_DIR" ] || [ -z "$(ls -A "$RAW_DIR" 2>/dev/null)" ]; then
  echo "Папка $RAW_DIR пуста или не существует."
  echo "Положите туда исходники (f01.png, w03.jpg, ...) и запустите скрипт снова."
  exit 1
fi

count=0
for src in "$RAW_DIR"/*; do
  [ -f "$src" ] || continue
  filename=$(basename "$src")
  id="${filename%.*}"

  echo "→ $filename  →  $OUT_DIR/$id.webp + .jpg"

  # Обрезка в квадрат по центру + ресайз + лёгкое повышение резкости
  convert "$src" \
    -auto-orient \
    -gravity center \
    -resize "${SIZE}x${SIZE}^" \
    -extent "${SIZE}x${SIZE}" \
    -unsharp 0x0.75+0.75+0.008 \
    -strip \
    -quality "$JPG_QUALITY" \
    "$OUT_DIR/$id.jpg"

  convert "$OUT_DIR/$id.jpg" -quality "$WEBP_QUALITY" "$OUT_DIR/$id.webp"

  count=$((count+1))
done

echo ""
echo "Готово: обработано $count файлов."
echo "Проверьте размер папки assets/cards/:"
du -sh "$OUT_DIR"
