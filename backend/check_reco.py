"""Самопроверка рекомендаций без запуска сервера.
Запуск:  python check_reco.py        (по умолчанию пользователь 4)
         python check_reco.py 6
"""
import os
import sys

import embedders
import monetization as mon
import reco_api
import reco_explain
import reco_vectors
from database import SessionLocal, engine
from models import Pet

user_id = int(sys.argv[1]) if len(sys.argv) > 1 else 4
ok = True


def step(title):
    print(f"\n=== {title} ===")


reco_api.init_schema()
db = SessionLocal()

step("1. База")
print("Адрес:", engine.url.render_as_string(hide_password=True))
total = db.query(Pet).count()
with_desc = db.query(Pet).filter(Pet.description.isnot(None)).count()
print(f"Питомцев: {total}, с описанием: {with_desc}")
if total == 0:
    print("ОШИБКА: база пустая, сначала запустите  python seed.py")
    sys.exit(1)
if with_desc < total:
    print("ПРЕДУПРЕЖДЕНИЕ: не у всех питомцев есть описание, ruBERT будет хуже их различать")

step("2. ruBERT")
try:
    print("Из vectors.json загружено:", reco_vectors.import_json(db))
    pets_n, prefs_n = reco_vectors.sync_all(db)
    print("Модель:", embedders.model_name(), f"| пересчитано: питомцев {pets_n}, опросов {prefs_n}")
    vectors = db.query(reco_vectors.PetVector).filter(
        reco_vectors.PetVector.model == embedders.model_name()).count()
    print(f"Векторов в базе: {vectors} из {total}")
    if vectors < total:
        ok = False
        print("ОШИБКА: не у всех питомцев есть вектор")
except Exception as error:
    ok = False
    print("ОШИБКА ruBERT:", error)

step(f"3. Лента пользователя {user_id}")
items = mon.build_feed(db, user_id, limit=8, seed=1)
for i, it in enumerate(items, 1):
    pet = it["pet"]
    print(f"{i}. {pet.nickname:9} {pet.pet_type:8} {it['score']:6.1f} [{it['source']}] {', '.join(it['reasons'])}")
if not items:
    ok = False
    print("Лента пустая: этот пользователь уже свайпнул всех питомцев.\n"
          "Для чистой проверки удалите dev.db и снова запустите  python seed.py")
reco_explain.remember_feed(db, user_id, items)

step("4. GigaChat")
print("Ключ в .env:", "есть" if os.getenv("GIGACHAT_KEY") else "НЕТ")
for it in items[:3]:
    why = reco_explain.explain(db, user_id, it["id"], refresh=True)
    print(f"- {it['pet'].nickname} ({why['by']}): {why['explanation']}")
    if why["by"] != "gigachat":
        ok = False
        print("  ^ GigaChat не ответил, выдан шаблон. Причина напечатана выше (или нет ключа).")

db.close()
print("\nИТОГ:", "всё работает" if ok else "есть проблемы, смотрите сообщения выше")
