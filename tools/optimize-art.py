#!/usr/bin/env python3
# ==========================================================
# optimize-art.py — подготовка артов карт под Telegram Mini App
# Кросс-платформенный аналог tools/optimize-art.sh: работает
# одинаково в Windows (обычный cmd/PowerShell, без bash),
# macOS и Linux. Не требует ImageMagick — только Pillow.
#
# Что делает:
#   1) Берёт все изображения из tools/raw/
#   2) Обрезает их в квадрат по центру, уменьшает до 640×640
#   3) Сохраняет в assets/cards/<id>.webp (основной, лёгкий)
#      и assets/cards/<id>.jpg (запасной формат)
#
# УСТАНОВКА (один раз):
#   pip install pillow
#
# ЗАПУСК (в терминале/PowerShell/cmd, в папке foildex-game):
#   python tools/optimize-art.py
#
# Использование:
#   1. Положите файлы в tools/raw/ с именами, совпадающими
#      с id карты, например: tools/raw/f01.png, tools/raw/n16.jpg
#   2. Запустите: python tools/optimize-art.py
#   3. Готовые файлы появятся в assets/cards/
# ==========================================================
import os
import sys

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("Не найден Pillow. Установите его командой:")
    print("    pip install pillow")
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "raw")
OUT_DIR = os.path.join(HERE, "..", "assets", "cards")
SIZE = 640
JPG_QUALITY = 85
WEBP_QUALITY = 82

VALID_EXT = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")


def process_one(src_path, card_id):
    img = Image.open(src_path)
    img = img.convert("RGB")

    # обрезка в квадрат по центру (аналог -gravity center -extent)
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))

    # ресайз до 640x640
    img = img.resize((SIZE, SIZE), Image.LANCZOS)

    # лёгкая резкость (аналог -unsharp)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))

    os.makedirs(OUT_DIR, exist_ok=True)
    jpg_path = os.path.join(OUT_DIR, f"{card_id}.jpg")
    webp_path = os.path.join(OUT_DIR, f"{card_id}.webp")

    img.save(jpg_path, "JPEG", quality=JPG_QUALITY)
    img.save(webp_path, "WEBP", quality=WEBP_QUALITY)

    return jpg_path, webp_path


def main():
    if not os.path.isdir(RAW_DIR) or not os.listdir(RAW_DIR):
        print(f"Папка {RAW_DIR} пуста или не существует.")
        print("Положите туда исходники (f01.png, n16.jpg, ...) и запустите скрипт снова.")
        sys.exit(1)

    count = 0
    for filename in sorted(os.listdir(RAW_DIR)):
        src_path = os.path.join(RAW_DIR, filename)
        if not os.path.isfile(src_path):
            continue
        name, ext = os.path.splitext(filename)
        if ext.lower() not in VALID_EXT:
            continue

        card_id = name
        print(f"-> {filename}  ->  assets/cards/{card_id}.webp + .jpg")
        try:
            process_one(src_path, card_id)
            count += 1
        except Exception as e:
            print(f"   x ошибка для {filename}: {e}")

    print()
    print(f"Готово: обработано {count} файлов.")
    print(f"Проверьте папку: {os.path.abspath(OUT_DIR)}")


if __name__ == "__main__":
    main()
