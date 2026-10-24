"""Скачивает фото тестовых питомцев с Unsplash в папку seed_photos/ (один раз).

    python download_photos.py

Источники и лицензия - в seed_photos/photos.json (Unsplash License: бесплатно,
можно использовать в проектах, указывать автора не обязательно).
Уже скачанные файлы пропускаются. Свои фото можно положить в seed_photos/ вручную
с именем <номер питомца>.jpg (например 7.jpg) - тогда скачивание для него не нужно.
После скачивания запустите  python seed.py  - он прикрепит фото к питомцам.
"""
import json
import os
import sys
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = os.path.join(BASE, "seed_photos")
# Вертикальный кадр под карточку ленты (400x560), качество 80: около 100-200 КБ на фото
SIZE = "w=800&h=1120&fit=crop&crop=entropy&q=80&fm=jpg"
HEADERS = {"User-Agent": "Mozilla/5.0 (SWIPET hackathon seed script)"}


def candidate_url(candidate: str) -> str:
    if candidate.startswith("page:"):     # страница фото: официальная ссылка на скачивание
        return f"https://unsplash.com/photos/{candidate[5:]}/download?force=true&w=800"
    return f"https://images.unsplash.com/photo-{candidate}?{SIZE}"


def existing_photo(pet_id: int):
    for name in os.listdir(PHOTOS_DIR):
        stem, ext = os.path.splitext(name)
        if stem.split("_")[0] == str(pet_id) and ext.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            return name
    return None


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        if not response.headers.get("Content-Type", "").startswith("image/"):
            raise ValueError("пришла не картинка")
        return response.read()


def main():
    with open(os.path.join(PHOTOS_DIR, "photos.json"), encoding="utf-8") as f:
        photos = json.load(f)["photos"]
    ok, skipped, failed = 0, 0, []
    for item in photos:
        pet_id = item["pet_id"]
        if existing_photo(pet_id):
            skipped += 1
            continue
        for candidate in item["candidates"]:
            try:
                data = download(candidate_url(candidate))
                with open(os.path.join(PHOTOS_DIR, f"{pet_id}.jpg"), "wb") as f:
                    f.write(data)
                print(f"  {pet_id:2} {item['name']:8} OK ({len(data) // 1024} КБ)")
                ok += 1
                break
            except Exception as error:
                print(f"  {pet_id:2} {item['name']:8} вариант не скачался: {error}")
        else:
            failed.append(f"{pet_id} {item['name']}")
    print(f"\nСкачано: {ok}, уже были: {skipped}, не удалось: {len(failed)}")
    if failed:
        print("Без фото (в ленте будет эмодзи):", ", ".join(failed))
        print("Можно положить своё фото вручную: seed_photos/<номер>.jpg")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
