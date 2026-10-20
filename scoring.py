import random
from collections import Counter

# По каким признакам мы «изучаем вкус» пользователя
FEATURES = ("species", "breed", "size")

# Насколько важен каждый признак при изучении вкуса
FEATURE_WEIGHTS = {"species": 1.0, "breed": 0.5, "size": 0.3}

EXPLORE_EVERY = 4    # сколько рекомендаций идёт подряд перед одним случайным
TASTE_WEIGHT = 20    # насколько сильно влияют лайки
CONTRADICT_AT = -2   # при таком «вкусе» к виду считаем, что человек опроверг анкету


def prefs_score(pet, prefs):
    """Баллы за совпадение с анкетой пользователя."""
    score = 0
    if pet["species"] == prefs["species"]:
        score += 40  # вид животного самый важный
    if prefs["age_min"] <= pet["age_months"] <= prefs["age_max"]:
        score += 20
    if pet["size"] == prefs["size"]:
        score += 15
    if pet["city"] == prefs["city"]:
        score += 25
    return score


def prefs_weight(swipes_count):
    """Чем больше свайпов, тем меньше доверяем анкете (но не меньше 30%)."""
    return max(0.3, 1 - 0.1 * swipes_count)


def build_taste(liked_pets, disliked_pets):
    """Считает, какие признаки нравятся пользователю.
    Лайк даёт +1 признакам питомца, дизлайк даёт -1."""
    taste = Counter()  # словарь-счётчик: если ключа нет, вернёт 0
    for pet in liked_pets:
        for f in FEATURES:
            taste[(f, pet[f])] += 1
    for pet in disliked_pets:
        for f in FEATURES:
            taste[(f, pet[f])] -= 1
    return taste


def taste_score(pet, taste):
    """Сумма «симпатий» к признакам питомца с учётом важности признака."""
    return sum(taste[(f, pet[f])] * FEATURE_WEIGHTS[f] for f in FEATURES)


def final_score(pet, prefs, taste, swipes_count=0):
    """Итоговый балл = (анкета * её вес) + лайки * TASTE_WEIGHT."""
    anketa = prefs_score(pet, prefs)
    # если человек дизлайкает вид из анкеты, баллы за этот вид отбираем
    if (pet["species"] == prefs["species"]
            and taste[("species", prefs["species"])] <= CONTRADICT_AT):
        anketa -= 40
    anketa *= prefs_weight(swipes_count)
    return anketa + TASTE_WEIGHT * taste_score(pet, taste)


def get_feed(pets, prefs, liked_ids, disliked_ids,
             explore_every=EXPLORE_EVERY, seed=None):
    """Возвращает ленту: несколько рекомендаций, потом один случайный, и так по кругу.
    seed нужен, чтобы «случайность» можно было повторить."""
    rng = random.Random(seed)

    seen = set(liked_ids) | set(disliked_ids)  # уже свайпнутые
    liked = [p for p in pets if p["id"] in liked_ids]
    disliked = [p for p in pets if p["id"] in disliked_ids]
    taste = build_taste(liked, disliked)

    # 1. Считаем баллы всем, кого ещё не свайпали
    scored = []
    for p in pets:
        if p["id"] in seen:
            continue
        item = dict(p)  # копия, чтобы не портить исходные данные
        item["score"] = round(final_score(p, prefs, taste, len(seen)))
        item["source"] = "рекомендация"
        scored.append(item)
    scored.sort(key=lambda p: p["score"], reverse=True)

    # 2. Определяем «основные» виды
    #    а) виды, которые человек лайкал
    core = {p["species"] for p in liked if taste[("species", p["species"])] > 0}
    #    б) вид из анкеты, если человек его не опроверг
    if taste[("species", prefs["species"])] > CONTRADICT_AT:
        core.add(prefs["species"])
    #    в) если основных нет, то все виды, к которым нет негатива
    if not core:
        core = {p["species"] for p in scored if taste[("species", p["species"])] >= 0}

    recommended = [p for p in scored if p["species"] in core]
    pool = [p for p in scored if p["species"] not in core]

    # случайные: сортируем по баллам с шумом, чтобы подходящие чаще шли раньше
    pool.sort(key=lambda p: p["score"] + rng.uniform(-15, 15), reverse=True)

    # 3. Смешиваем: explore_every рекомендаций, потом один случайный
    feed = []
    while recommended or pool:
        for _ in range(explore_every):
            if recommended:
                feed.append(recommended.pop(0))
        if pool:
            p = pool.pop(0)
            p["source"] = "случайная"
            feed.append(p)

    return feed, taste