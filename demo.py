"""Консольное демо всего пути пользователя через настоящее API.

Как запустить:
  python demo.py
Если сервер не запущен, демо предложит запустить его прямо здесь (в этом же окне).
Можно и по-старому: терминал 1 - uvicorn main:app --reload, терминал 2 - python demo.py

Что можно сделать: регистрация или вход -> опрос (анкета) -> лента с лайками и пропусками ->
«почему мне это показали» (GigaChat) -> чат с продавцом -> уведомления -> подписка.
Демо ходит в API по HTTP, как это будет делать фронтенд, поэтому заодно проверяет весь бэкенд.
"""
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

API = os.getenv("API_URL", "http://127.0.0.1:8000/api/v1")

KINDS = [("cat", "кошка"), ("dog", "собака"), ("parrot", "попугай"), ("hamster", "хомяк"),
         ("rabbit", "кролик"), ("fish", "рыбка"), ("cow", "корова")]
KIND_RU = dict(KINDS)
NOTIFY_RU = {"new_chat": "Вашим питомцем заинтересовались, открыт чат",
             "new_message": "Новое сообщение в чате"}

user_id = None          # кто сейчас вошёл
pet_names = {}          # id питомца -> кличка (чтобы показывать имена в чатах)

# Запросы к своему компьютеру идут напрямую, мимо прокси
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


class ApiError(Exception):
    def __init__(self, status, detail):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def api(method, path, body=None):
    """Один запрос к API. Возвращает ответ (dict/list) или бросает ApiError."""
    headers = {"Content-Type": "application/json"}
    if user_id:
        headers["X-User-Id"] = str(user_id)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(API + path, data=data, method=method, headers=headers)
    try:
        with _opener.open(request, timeout=90) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read()).get("detail")
        except Exception:
            detail = error.reason
        if isinstance(detail, list):          # ошибки проверки полей от FastAPI
            detail = "; ".join(f"{'.'.join(map(str, d.get('loc', [])))}: {d.get('msg')}" for d in detail)
        raise ApiError(error.code, detail)
    except urllib.error.URLError:
        print(f"\nСервер не отвечает по адресу {API}.")
        print("Перезапустите демо: python demo.py (оно предложит запустить сервер)")
        sys.exit(1)


# ---------- Сервер ----------

def server_alive():
    base = API.split("/api/")[0]
    try:
        _opener.open(base + "/openapi.json", timeout=3)
        return True
    except Exception:
        return False


def start_local_server():
    """Запускает API в этом же процессе, в фоновом потоке (как uvicorn main:app)."""
    import uvicorn
    print("Запускаю сервер...")
    import main                                   # создаёт таблицы и приложение
    port = urllib.parse.urlparse(API).port or 8000
    server = uvicorn.Server(uvicorn.Config(main.app, host="127.0.0.1", port=port, log_level="warning"))
    threading.Thread(target=server.run, daemon=True).start()
    deadline = time.time() + 600
    while not server.started:
        if not threading.main_thread().is_alive() or time.time() > deadline:
            print("Сервер не запустился. Попробуйте в отдельном окне: uvicorn main:app --reload")
            sys.exit(1)
        time.sleep(0.3)
    print(f"Сервер работает. Пока открыто демо, Swagger доступен: http://127.0.0.1:{port}/docs")


# ---------- Ввод ----------

def ask(prompt, default=None):
    hint = f" [{default}]" if default else ""
    value = input(f"{prompt}{hint}: ").strip()
    return value or (default or "")


def ask_int(prompt):
    """Число или None, если просто нажали Enter."""
    while True:
        value = input(f"{prompt} (Enter - не важно): ").strip()
        if not value:
            return None
        if value.isdigit():
            return int(value)
        print("  Введите число или нажмите Enter.")


def choose(title, options):
    """options: список (ключ, подпись). Возвращает выбранный ключ."""
    print(f"\n{title}")
    for key, label in options:
        print(f"  {key} - {label}")
    keys = {str(key) for key, _ in options}
    while True:
        answer = input("Ваш выбор: ").strip()
        if answer in keys:
            return answer
        print("  Нет такого пункта, попробуйте ещё раз.")


def line(char="-"):
    print(char * 60)


# ---------- Вход и регистрация ----------

def register():
    global user_id
    print("\n=== Регистрация ===")
    name = ask("Имя")
    email = ask("E-mail")
    phone = ask("Телефон")
    password = ask("Пароль")
    try:
        answer = api("POST", "/auth/register",
                     {"email": email, "password": password, "displayName": name, "phone": phone})
    except ApiError as error:
        print("  Не получилось:", error.detail)
        return False
    user_id = answer["userId"]
    print(f"  Готово! Вы зарегистрированы, ваш id: {user_id}")
    survey()
    return True


def login():
    global user_id
    print("\n=== Вход ===")
    print("Тестовые аккаунты (пароль demo1234): koshatnik@example.com - клиент,")
    print("maria@example.com - продавец Мурки и Барсика (чтобы ответить в чате).")
    email = ask("E-mail")
    password = ask("Пароль", "demo1234")
    try:
        answer = api("POST", "/auth/login", {"email": email, "password": password})
    except ApiError as error:
        print("  Не получилось:", error.detail)
        return False
    user_id = answer["userId"]
    print(f"  Здравствуйте, {answer['displayName']}! (id {user_id})")
    return True


# ---------- Опрос (анкета предпочтений) ----------

def survey():
    print("\n=== Опрос: кого вы ищете? ===")
    options = [(i, label) for i, (_, label) in enumerate(KINDS, 1)] + [(0, "пока не знаю")]
    choice = int(choose("Какое животное вы хотите?", options))
    species = KINDS[choice - 1][0] if choice else None
    print("Возраст питомца в месяцах:")
    age_min = ask_int("  от")
    age_max = ask_int("  до")
    city = ask("Ваш город (Enter - не важно)") or None
    about = ask("Опишите своими словами, какой питомец нужен\n"
                "(например: спокойная кошка для квартиры, есть дети)") or None
    try:
        api("PUT", "/me/prefs", {"species": species, "age_min": age_min, "age_max": age_max,
                                 "city": city, "about": about})
        print("  Анкета сохранена, лента подстроится под неё.")
    except ApiError as error:
        print("  Анкета не сохранена:", error.detail)


# ---------- Лента ----------

def show_card(card, number):
    pet_names[card["id"]] = card["name"]
    line("=")
    if card["is_promo"]:
        print(f"Карточка {number}   *** РЕКЛАМА: продавец оплатил продвижение ***")
    else:
        print(f"Карточка {number}   [{card['source']}, {card['score']} баллов]")
    kind = KIND_RU.get(card["category"], card["category"])
    gender = {"male": "мальчик", "female": "девочка"}.get(card["gender"], card["gender"])
    price = "бесплатно" if card["is_free"] else f"{card['price']:,.0f} руб.".replace(",", " ")
    print(f"{card['name']} - {kind}, {card['breed'] or 'без породы'}, {gender}")
    print(f"Возраст: {card['age_in_months'] or '?'} мес. | Город: {card['city'] or '?'} | {price}")
    if card["description"]:
        print(f"О питомце: {card['description']}")
    if card["reasons"]:
        print("Почему в ленте (алгоритм):", ", ".join(card["reasons"]))
    line("=")


def offer_premium():
    print("\nСвайпы на сегодня закончились. Премиум увеличивает лимит с 10 до 50 в день.")
    if choose("Оформить премиум? (оплата имитируется)", [(1, "да"), (0, "нет")]) == "1":
        answer = api("POST", "/me/subscription/activate")
        print("  Премиум до", answer["premium_until"][:10])
        return True
    return False


def write_to_chat(chat_id):
    text = ask("Напишите продавцу (Enter - не сейчас)")
    if text:
        api("POST", f"/chats/{chat_id}/messages", {"text": text})
        print("  Сообщение отправлено.")


def feed():
    number = 0
    while True:
        cards = api("GET", "/feed?limit=10")
        if not cards:
            print("\nЛента закончилась: вы посмотрели всех доступных питомцев.")
            return
        for card in cards:
            number += 1
            show_card(card, number)
            while True:
                action = choose("Что делаем?", [(1, "лайк"), (2, "пропустить"),
                                                (3, "почему мне это показали? (GigaChat)"),
                                                (0, "в главное меню")])
                if action == "0":
                    return
                if action == "3":
                    print("  Думаю...")
                    why = api("GET", f"/feed/{card['id']}/why")
                    source = "GigaChat" if why["by"] == "gigachat" else "шаблон (GigaChat не ответил)"
                    print(f"\n  {why['explanation']}\n  ({source})")
                    continue
                direction = "right" if action == "1" else "left"
                try:
                    answer = api("POST", f"/feed/{card['id']}/swipe", {"direction": direction})
                except ApiError as error:
                    if error.status == 429:
                        if offer_premium():
                            continue          # лимит увеличен: повторяем этот же свайп
                        return
                    print("  Не получилось:", error.detail)
                    break
                print(f"  {'Лайк' if direction == 'right' else 'Пропуск'}. "
                      f"Свайпов на сегодня осталось: {answer['swipes_left']}")
                if answer["chat_id"]:
                    print(f"  Открыт чат №{answer['chat_id']}, продавец получил уведомление.")
                    write_to_chat(answer["chat_id"])
                break
        # порция из 10 закончилась: просим у сервера следующую (лента пересчитается с учётом свайпов)


# ---------- Чаты ----------

def chats():
    my_chats = api("GET", "/chats")
    if not my_chats:
        print("\nЧатов пока нет. Лайкните питомца в ленте, и чат с продавцом откроется.")
        return
    options = []
    for chat in my_chats:
        role = "вы покупатель" if chat["user_id"] == user_id else "вы продавец"
        pet = pet_names.get(chat["pet_id"], f"питомец №{chat['pet_id']}")
        options.append((chat["id"], f"чат №{chat['id']}: {pet} ({role})"))
    options.append((0, "назад"))
    chat_id = int(choose("Ваши чаты:", options))
    if chat_id == 0:
        return
    chat = next(c for c in my_chats if c["id"] == chat_id)
    my_role = "user" if chat["user_id"] == user_id else "seller"
    while True:
        messages = api("GET", f"/chats/{chat_id}/messages")
        line()
        if not messages:
            print("Сообщений пока нет.")
        for m in messages:
            who = "Вы" if m["sender_type"] == my_role else "Собеседник"
            print(f"{m['sent_date'][:16].replace('T', ' ')}  {who}: {m['text']}")
        line()
        text = ask("Ваше сообщение (Enter - выйти из чата)")
        if not text:
            return
        api("POST", f"/chats/{chat_id}/messages", {"text": text})


# ---------- Уведомления, подписка, профиль ----------

def notifications():
    items = api("GET", "/notifications")
    print()
    if not items:
        print("Уведомлений нет.")
    for n in items:
        print(f"{n['date'][:16].replace('T', ' ')}  {NOTIFY_RU.get(n['type'], n['type'])}")


def subscription():
    status = api("GET", "/me/subscription")
    print()
    if status["is_premium"]:
        print("Тариф: ПРЕМИУМ до", status["premium_until"][:10])
    else:
        print("Тариф: бесплатный")
    print(f"Свайпов сегодня: осталось {status['swipes_left']} из {status['daily_limit']}")
    if status["seller_premium_until"]:
        print("Премиум продавца до", status["seller_premium_until"][:10], "- ваши анкеты продвигаются в ленте")
    action = choose("Подписка:", [(1, "оформить премиум покупателя"), (2, "отменить премиум покупателя"),
                                  (3, "оформить премиум продавца"), (0, "назад")])
    try:
        if action == "1":
            print("  Премиум до", api("POST", "/me/subscription/activate")["premium_until"][:10])
        elif action == "2":
            api("POST", "/me/subscription/cancel")
            print("  Премиум отменён.")
        elif action == "3":
            print("  Премиум продавца до",
                  api("POST", "/me/subscription/activate?as_seller=true")["premium_until"][:10])
    except ApiError as error:
        print("  Не получилось:", error.detail)


def profile():
    me = api("GET", "/profile/me")
    prefs = api("GET", "/me/prefs")
    print(f"\n{me['displayName']} | {me['email']} | {me['phone']} | город: {me['city'] or '-'}")
    kind = KIND_RU.get(prefs["species"], prefs["species"]) if prefs["species"] else "любое"
    print(f"Анкета: {kind}, возраст {prefs['age_min'] or 0}-{prefs['age_max'] or '...'} мес., "
          f"город {prefs['city'] or '-'}")
    if prefs["about"]:
        print(f"О себе: {prefs['about']}")


# ---------- Главное меню ----------

def main_menu():
    global user_id
    actions = {"1": feed, "2": chats, "3": notifications, "4": survey, "5": subscription, "6": profile}
    while True:
        choice = choose("=== Главное меню ===", [(1, "лента"), (2, "мои чаты"), (3, "уведомления"),
                                                 (4, "пройти опрос заново"), (5, "подписка"),
                                                 (6, "мой профиль"), (0, "выйти из аккаунта")])
        if choice == "0":
            user_id = None
            return
        try:
            actions[choice]()
        except ApiError as error:
            print("  Ошибка сервера:", error.status, error.detail)


def main():
    print("Petomnik: демо через API", API)
    if not server_alive():
        print("\nСервер не запущен.")
        if choose("Запустить его прямо здесь?", [(1, "да"), (0, "нет, выйти")]) == "0":
            print("Запустите в другом окне:  uvicorn main:app --reload  и снова  python demo.py")
            return
        start_local_server()
    while True:
        choice = choose("Добро пожаловать!", [(1, "регистрация"), (2, "вход"), (0, "выход")])
        if choice == "0":
            return
        if (register() if choice == "1" else login()):
            main_menu()


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nПока!")
