#!/usr/bin/env python3
# ==========================================================
# generate-art.py — автогенерация артов для ВСЕХ 89 карт
# одной командой, бесплатно, без регистрации и API-ключей.
#
# Использует публичный бесплатный сервис image.pollinations.ai
# (модель Flux). Не нужны сторонние Python-пакеты — только
# стандартная библиотека.
#
# ЗАПУСК (в терминале, в папке foildex-game):
#   python3 tools/generate-art.py
#
# Результат: tools/raw/f01.png ... tools/raw/l14.png (89 файлов).
# Дальше просто запустите:
#   bash tools/optimize-art.sh
# и готовые арты появятся в assets/cards/ — игра сама их подхватит.
#
# Если какая-то картинка не понравится — удалите её из tools/raw/
# и перезапустите скрипт: он генерирует только недостающие файлы
# (уже скачанные — не трогает и не тратит время повторно).
#
# Редкие карты (Легендарная/Мифическая) рендерятся в повышенном
# разрешении — им и так предстоит крупный, заметный арт.
#
# Добавили новых карт в js/cards.js? Допишите промпт для их id в
# tools/card_prompts.json (форматом "id": "текст промпта") и просто
# перезапустите скрипт — он подхватит только новые записи.
# ==========================================================
import json
import os
import re
import time
import urllib.parse
import urllib.request
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS_FILE = os.path.join(HERE, "card_prompts.json")
CARDS_JS_FILE = os.path.join(HERE, "..", "js", "cards.js")
OUT_DIR = os.path.join(HERE, "raw")
BASE_SIZE = 768
BIG_SIZE = 960     # legendary / mythic — крупнее и детальнее
MODEL = "flux"      # хорошее бесплатное качество; можно попробовать "flux-realism"
MAX_RETRIES = 3

RARITY_PATTERN = re.compile(r"id:'(\w+)'.*?rarity:'(\w+)'")


def load_rarities():
    """Читает js/cards.js, чтобы узнать редкость каждой карты (для размера арта)."""
    try:
        with open(CARDS_JS_FILE, "r", encoding="utf-8") as f:
            src = f.read()
        return dict(RARITY_PATTERN.findall(src))
    except Exception:
        return {}


def size_for(card_id, rarities):
    return BIG_SIZE if rarities.get(card_id) in ("legendary", "mythic") else BASE_SIZE


def stable_seed(card_id):
    # crc32 вместо встроенного hash() — тот рандомизирован между запусками Python
    # и НЕ даёт стабильный результат для одной и той же карты между перезапусками.
    return zlib.crc32(card_id.encode("utf-8")) % 1_000_000


def main():
    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        prompts = json.load(f)
    rarities = load_rarities()

    os.makedirs(OUT_DIR, exist_ok=True)

    total = len(prompts)
    done = 0
    skipped = 0
    failed = []

    for i, (card_id, prompt) in enumerate(prompts.items(), start=1):
        out_path = os.path.join(OUT_DIR, f"{card_id}.png")
        if os.path.exists(out_path):
            print(f"[{i}/{total}] {card_id} — уже есть, пропускаю")
            skipped += 1
            continue

        size = size_for(card_id, rarities)
        encoded_prompt = urllib.parse.quote(prompt)
        seed = stable_seed(card_id)
        url = (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?width={size}&height={size}&seed={seed}&model={MODEL}&nologo=true"
        )

        print(f"[{i}/{total}] {card_id} — генерирую ({size}x{size})...")
        ok = False
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=120) as resp:
                    data = resp.read()
                with open(out_path, "wb") as f:
                    f.write(data)
                print(f"    ✓ сохранено: {out_path} ({len(data)//1024} КБ)")
                done += 1
                ok = True
                break
            except Exception as e:
                print(f"    ✗ попытка {attempt}/{MAX_RETRIES} для {card_id}: {e}")
                time.sleep(2 * attempt)
        if not ok:
            failed.append(card_id)

        time.sleep(1.5)  # вежливая пауза между запросами к бесплатному сервису

    print()
    print(f"Готово. Сгенерировано: {done}, пропущено (уже было): {skipped}, всего карт: {total}")
    if failed:
        print(f"Не удалось (перезапустите скрипт ещё раз): {', '.join(failed)}")
    print("Дальше выполните: bash tools/optimize-art.sh")


if __name__ == "__main__":
    main()
