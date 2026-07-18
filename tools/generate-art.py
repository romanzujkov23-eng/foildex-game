#!/usr/bin/env python3
# ==========================================================
# generate-art.py — автогенерация артов для ВСЕХ 39 карт
# одной командой, бесплатно, без регистрации и API-ключей.
#
# Использует публичный бесплатный сервис image.pollinations.ai
# (модель Flux). Не нужен Python-пакеты — только стандартная
# библиотека.
#
# ЗАПУСК (в терминале, в папке foildex-game):
#   python3 tools/generate-art.py
#
# Результат: tools/raw/f01.png ... tools/raw/l06.png (39 файлов)
# Дальше просто запустите:
#   bash tools/optimize-art.sh
# и готовые арты появятся в assets/cards/ — игра сама их подхватит.
#
# Если какая-то картинка не понравится — удалите её из tools/raw/
# и перезапустите скрипт: он генерирует только недостающие файлы
# (уже скачанные — не трогает и не тратит время повторно).
# ==========================================================
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS_FILE = os.path.join(HERE, "card_prompts.json")
OUT_DIR = os.path.join(HERE, "raw")
WIDTH = 768
HEIGHT = 768
MODEL = "flux"  # хорошее бесплатное качество; можно попробовать "flux-realism"

def main():
    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        prompts = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)

    total = len(prompts)
    done = 0
    skipped = 0

    for i, (card_id, prompt) in enumerate(prompts.items(), start=1):
        out_path = os.path.join(OUT_DIR, f"{card_id}.png")
        if os.path.exists(out_path):
            print(f"[{i}/{total}] {card_id} — уже есть, пропускаю")
            skipped += 1
            continue

        encoded_prompt = urllib.parse.quote(prompt)
        seed = abs(hash(card_id)) % 1_000_000  # стабильный seed = стабильный результат для карты
        url = (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?width={WIDTH}&height={HEIGHT}&seed={seed}&model={MODEL}&nologo=true"
        )

        print(f"[{i}/{total}] {card_id} — генерирую...")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            with open(out_path, "wb") as f:
                f.write(data)
            print(f"    ✓ сохранено: {out_path} ({len(data)//1024} КБ)")
            done += 1
        except Exception as e:
            print(f"    ✗ ошибка для {card_id}: {e}")

        time.sleep(1.5)  # вежливая пауза между запросами к бесплатному сервису

    print()
    print(f"Готово. Сгенерировано: {done}, пропущено (уже было): {skipped}, всего карт: {total}")
    print("Дальше выполните: bash tools/optimize-art.sh")

if __name__ == "__main__":
    main()
