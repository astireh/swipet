import random
from data import PETS, USER_PREFS, USER_ACCOUNT, PROMOTED_PET_IDS
from scoring import get_feed, EXPLORE_EVERY
from subscription import (
    is_premium, activate_premium, daily_limit, swipes_left,
    register_swipe, eligible_promoted, is_promo_slot,
)

SESSION_SEED = random.randint(1, 10**6)  # стабильная случайность внутри одной игры

liked_ids = []
disliked_ids = []

FEATURE_NAMES = {"species": "вид", "breed": "порода", "size": "размер"}

MENU = """
Что делаем с карточкой?
  1 - Лайк (понравился)
  2 - Дизлайк (не нравится)
  3 - Показать, что лента уже поняла о моём вкусе
  4 - Моя подписка и остаток свайпов
  5 - Оформить премиум
  0 - Выйти
(лайк и дизлайк тратят свайп, остальное нет)"""


def show_card(pet, number):
    print()
    print("=" * 52)
    if pet["source"] == "реклама":
        label = "РЕКЛАМА - продавец продвигает это объявление"
    else:
        label = pet["source"]
    print(f"Карточка №{number}  [{label}, {pet['score']} баллов]")
    print(f"{pet['name']} - {pet['species']}, {pet['breed']}")
    print(f"Возраст: {pet['age_months']} мес. | Пол: {pet['gender']} | Размер: {pet['size']}")
    print(f"Город: {pet['city']}")
    print(f"О питомце: {pet['description']}")
    print("=" * 52)


def show_taste(taste):
    items = [(k, v) for k, v in taste.items() if v != 0]
    print("\n--- Ваш вкус по версии ленты ---")
    if not items:
        print("   пока ничего (свайпов ещё нет)")
        return
    items.sort(key=lambda kv: kv[1], reverse=True)
    for (feature, value), score in items:
        sign = "+" if score > 0 else ""
        print(f"   {FEATURE_NAMES[feature]}: {value}   {sign}{score}")


def show_status():
    print("\n--- Ваша подписка ---")
    if is_premium(USER_ACCOUNT):
        print(f"   ПРЕМИУМ до {USER_ACCOUNT['premium_until']:%d.%m.%Y}")
    else:
        print("   Бесплатный тариф")
    print(f"   Свайпов осталось сегодня: {swipes_left(USER_ACCOUNT)} из {daily_limit(USER_ACCOUNT)}")


def buy_premium():
    activate_premium(USER_ACCOUNT)
    print("\n  Премиум оформлен (оплата имитирована).")
    show_status()


def finish():
    show_taste(get_feed(PETS, USER_PREFS, liked_ids, disliked_ids)[1])
    show_status()
    print("\nВы лайкнули:", [p["name"] for p in PETS if p["id"] in liked_ids])
    print("Вы отклонили:", [p["name"] for p in PETS if p["id"] in disliked_ids])
    raise SystemExit


def pick_next(organic, swipes_count):
    """Из обычной (не рекламной) ленты: после 4 рекомендаций идёт случайная."""
    want_random = (swipes_count % (EXPLORE_EVERY + 1)) == EXPLORE_EVERY
    wanted = "случайная" if want_random else "рекомендация"
    for pet in organic:
        if pet["source"] == wanted:
            return pet
    return organic[0]


print(f"Ваша анкета: {USER_PREFS}")
show_status()

while True:
    # 1. Лимит свайпов
    if swipes_left(USER_ACCOUNT) <= 0:
        print("\nНа сегодня свайпы закончились. Премиум увеличивает дневной лимит.")
        cmd = input("1 - оформить премиум, 0 - выйти: ").strip()
        if cmd == "1":
            buy_premium()
        elif cmd == "0":
            finish()
        continue

    # 2. Строим ленту
    swipes_count = len(liked_ids) + len(disliked_ids)
    feed, taste = get_feed(PETS, USER_PREFS, liked_ids, disliked_ids,
                           seed=SESSION_SEED + swipes_count)
    if not feed:
        print("\nЛента закончилась. Вы посмотрели всех питомцев.")
        break

    # 3. Выбираем карточку: рекламный слот или обычная
    promo = eligible_promoted(feed, PROMOTED_PET_IDS)
    promo_ids = {p["id"] for p in promo}
    organic = [p for p in feed if p["id"] not in promo_ids]

    if promo and (is_promo_slot(swipes_count) or not organic):
        pet = promo[0]
        pet["source"] = "реклама"
    else:
        pet = pick_next(organic, swipes_count)

    show_card(pet, swipes_count + 1)
    print(MENU)

    # 4. Ответ пользователя
    while True:
        answer = input("Введите цифру и нажмите Enter: ").strip().lower()
        if answer in ("1", "л", "+"):
            register_swipe(USER_ACCOUNT)
            liked_ids.append(pet["id"])
            print(f"  Лайк: {pet['name']}  (свайпов осталось: {swipes_left(USER_ACCOUNT)})")
            break
        elif answer in ("2", "д", "-"):
            register_swipe(USER_ACCOUNT)
            disliked_ids.append(pet["id"])
            print(f"  Дизлайк: {pet['name']}  (свайпов осталось: {swipes_left(USER_ACCOUNT)})")
            break
        elif answer == "3":
            show_taste(taste)
        elif answer == "4":
            show_status()
        elif answer == "5":
            buy_premium()
        elif answer in ("0", "в", "q"):
            finish()
        else:
            print("  Не понял. Введите цифру от 0 до 5.")