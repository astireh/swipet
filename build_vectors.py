"""Считает векторы ruBERT для всех питомцев и текстов из опроса и сохраняет их
в базу и в файл vectors.json.

Запускать, когда добавили/изменили питомцев или после python seed.py:
    python build_vectors.py

После этого сервер стартует без загрузки нейросети, а vectors.json можно закоммитить,
чтобы у всей команды лента работала сразу (даже с EMBED_ENABLED=0 и без скачанной модели).
"""
import time

import embedders
import reco_api
import reco_vectors
from database import SessionLocal

reco_api.init_schema()
db = SessionLocal()
try:
    print("Из старого vectors.json взято:", reco_vectors.import_json(db))
    missing = reco_vectors.missing_count(db)
    print("Не хватает векторов:", missing)
    if missing:
        start = time.time()
        print("Загружаю ruBERT", embedders.model_name(), "и считаю... (первый раз - до минуты)")
        pets_n, prefs_n = reco_vectors.sync_all(db)
        print(f"Посчитано: питомцев {pets_n}, опросов {prefs_n} за {time.time() - start:.1f} с")
    count = reco_vectors.export_json(db)
    print(f"Сохранено в {reco_vectors.VECTORS_FILE}: {count} векторов")
finally:
    db.close()
