import random
from data import PETS, USER_PREFS
from scoring import get_feed, EXPLORE_EVERY

# Номер «сессии»: делает случайность стабильной внутри одной игры
SESSION_SEED = random.randint(1, 10**6)

liked_ids = []      # сюда попадают id лайкнутых
disliked_ids = []   # сюда попадают id отклонённых

FEATURE_NAMES = {"species": "вид", "breed": "порода", "size": "размер"}


def show_card(pet, number):
    """Печатает карточку питомца."""
    print()
    print("=" * 52)
    print(f"Карточка №{number}   [{pet['source']}, {pet['score']} баллов]")
    print(f"{pet['name']} - {pet['species']}, {pet['breed']}")
    print(f"Возраст: {pet['age_months']} мес. | Пол: {pet['gender']} | Размер: {pet['size']}")
    print(f"Город: {pet['city']}")
    print(f"О питомце: {pet['description']}")
    print("=" * 52)


def show_taste(taste):
    """Печатает, что система уже поняла о вкусе пользователя."""
    items = [(k, v) for k, v in taste.items() if v != 0]
    print()
    print("--- Ваш вкус по версии ленты ---")
    if not items:
        print("   пока ничего (свайпов ещё нет)")
        return
    items.sort(key=lambda kv: kv[1], reverse=True)
    for (feature, value), score in items:
        sign = "+" if score > 0 else ""
        print(f"   {FEATURE_NAMES[feature]}: {value}   {sign}{score}")


def pick_next(feed, swipes_count):
    """Выбирает следующую карточку: после каждых 4 рекомендаций идёт случайная."""
    want_random = (swipes_count % (EXPLORE_EVERY + 1)) == EXPLORE_EVERY
    wanted = "случайная" if want_random else "рекомендация"
    for pet in feed:
        if pet["source"] == wanted:
            return pet
    return feed[0]  # нужного типа не осталось, берём что есть


print("Управление: л (или +) = лайк, д (или -) = дизлайк, т = мой вкус, в = выход")
print(f"Ваша анкета: {USER_PREFS}")

while True:
    swipes_count = len(liked_ids) + len(disliked_ids)
    feed, taste = get_feed(PETS, USER_PREFS, liked_ids, disliked_ids,
                           seed=SESSION_SEED + swipes_count)

    if not feed:
        print("\nЛента закончилась. Вы посмотрели всех питомцев.")
        break

    pet = pick_next(feed, swipes_count)
    show_card(pet, swipes_count + 1)

    while True:
        answer = input("Ваш выбор (л / д / т / в): ").strip().lower()
        if answer in ("л", "+", "l"):
            liked_ids.append(pet["id"])
            print(f"  Лайк: {pet['name']}")
            break
        elif answer in ("д", "-"):
            disliked_ids.append(pet["id"])
            print(f"  Дизлайк: {pet['name']}")
            break
        elif answer == "т":
            show_taste(taste)
        elif answer in ("в", "q"):
            show_taste(taste)
            print("\nВы лайкнули:", [p["name"] for p in PETS if p["id"] in liked_ids])
            print("Вы отклонили:", [p["name"] for p in PETS if p["id"] in disliked_ids])
            raise SystemExit
        else:
            print("  Не понял. Нажмите л, д, т или в и Enter.")