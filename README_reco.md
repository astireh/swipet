# Рекомендации, GigaChat и подписка

Лента питомцев по смыслу описаний (векторы ruBERT от Сбера: `ai-forever/sbert_large_nlu_ru`)
и правилам (вид, город, возраст, лайки), объяснение «почему эта карточка» от GigaChat,
лимит свайпов и рекламные слоты по подписке.

## Запуск (Windows, PowerShell)
```
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
copy .env.example .env          # затем вписать GIGACHAT_KEY
python seed.py                  # тестовые данные
python build_vectors.py         # векторы ruBERT -> база и vectors.json (после seed и новых питомцев)
python check_reco.py 4          # самопроверка: база, ruBERT, лента, GigaChat
uvicorn main:app --reload       # API: http://127.0.0.1:8000/docs
python demo.py                  # во втором терминале: весь путь пользователя через API
```
Как всё устроено (ИИ, лента, чат, база): ARCHITECTURE.md
При первом запуске build_vectors.py модель ruBERT скачивается (около 1,7 ГБ). Сервер модель при старте не грузит: берёт готовые векторы из vectors.json, недостающие досчитывает в фоне. EMBED_ENABLED=0 в .env отключает модель совсем. Тестовый пароль всех пользователей из seed: `demo1234`.
`python seed.py reset` сбрасывает счётчики свайпов и премиум клиентов.

## Эндпоинты (заголовок `X-User-Id` обязателен)
| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/v1/feed?limit=10&category=cat&free=true` | персональная лента; у карточки `source`, `is_promo`, `reasons` |
| POST | `/api/v1/feed/{id}/swipe` `{"direction": "right"}` | лайк/пропуск; 429 если лимит на сегодня исчерпан |
| GET | `/api/v1/feed/{id}/why` | объяснение от GigaChat (или шаблон, если GigaChat недоступен) |
| GET / PUT | `/api/v1/me/prefs` | анкета: вид, возраст, город, текст «о себе» |
| GET | `/api/v1/me/subscription` | премиум, остаток свайпов |
| POST | `/api/v1/me/subscription/activate?as_seller=false` | оформить премиум (оплата имитируется) |
| POST | `/api/v1/me/subscription/cancel?as_seller=false` | отменить премиум |

## Файлы
- `reco_api.py`: эндпоинты выше, создание таблиц, прогрев модели
- `reco_explain.py`: GigaChat, промпт, кэш объяснений (таблица `feed_impressions`)
- `reco_feed.py`: гибридная лента; `reco_vectors.py`: векторы питомцев и вкус пользователя
- `build_vectors.py`, `vectors.json`: готовые векторы, чтобы не грузить модель при старте
- `embedders.py`: текст в вектор; `monetization.py`: премиум, лимит свайпов, реклама
- `deps.py`: `get_db` и `get_current_user` (общие для main.py и reco_api.py)
- `seed.py`, `demo_data.py`: тестовые данные; `play_db.py`: консольная лента; `check_reco.py`: самопроверка
- `demo.py`: консольное демо через API (регистрация, опрос, лента, GigaChat, чат, подписка)
