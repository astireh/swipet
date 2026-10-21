from database import engine, Base
import models # Важно импортировать модели, чтобы Base увидел их

print("Удаление старых таблиц...")
Base.metadata.drop_all(bind=engine)

# 2. Затем создайте новые таблицы
print("Создание новых таблиц...")
Base.metadata.create_all(bind=engine)

print("Готово! База данных сброшена и пересоздана.")