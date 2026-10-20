from datetime import date, datetime, timedelta

# --- Настройки ---
FREE_DAILY_SWIPES = 10      # свайпов в день на бесплатном тарифе
PREMIUM_DAILY_SWIPES = 50   # свайпов в день на премиуме
PREMIUM_DAYS = 30           # на сколько дней оформляется подписка
PROMO_EVERY = 6             # каждая 6-я карточка в ленте рекламная


# ---------- Подписка ----------

def is_premium(user, now=None):
    """True, если у пользователя есть действующий премиум."""
    now = now or datetime.now()
    until = user.get("premium_until")
    return until is not None and until > now


def activate_premium(user, days=PREMIUM_DAYS):
    """Оформляет или продлевает премиум. Оплата здесь имитируется."""
    now = datetime.now()
    start = user["premium_until"] if is_premium(user) else now
    user["premium_until"] = start + timedelta(days=days)


def cancel_premium(user):
    """Отключает премиум."""
    user["premium_until"] = None


# ---------- Лимит свайпов ----------

def daily_limit(user):
    """Сколько свайпов в день положено этому пользователю."""
    return PREMIUM_DAILY_SWIPES if is_premium(user) else FREE_DAILY_SWIPES


def _reset_if_new_day(user):
    """Если наступил новый день, обнуляем счётчик свайпов."""
    today = date.today()
    if user.get("swipes_date") != today:
        user["swipes_date"] = today
        user["swipes_today"] = 0


def swipes_left(user):
    """Сколько свайпов осталось на сегодня."""
    _reset_if_new_day(user)
    return max(0, daily_limit(user) - user["swipes_today"])


def register_swipe(user):
    """Засчитывает свайп. Возвращает False, если лимит исчерпан."""
    if swipes_left(user) <= 0:
        return False
    user["swipes_today"] += 1
    return True


# ---------- Продвижение объявлений ----------

def eligible_promoted(feed, promoted_ids):
    """Все продвигаемые питомцы, которых пользователь ещё не свайпал.
    Показываются ВСЕ (продавец заплатил), но самые подходящие идут первыми."""
    promo = [p for p in feed if p["id"] in promoted_ids]
    promo.sort(key=lambda p: p["score"], reverse=True)
    return promo


def is_promo_slot(swipes_count, every=PROMO_EVERY):
    """True, если следующая карточка по счёту должна быть рекламной."""
    return swipes_count % every == every - 1


def apply_promotion(feed, promoted_ids, every=PROMO_EVERY):
    """Возвращает ленту, где каждая every-я карточка рекламная."""
    promo = eligible_promoted(feed, promoted_ids)
    promo_ids = {p["id"] for p in promo}
    organic = [p for p in feed if p["id"] not in promo_ids]

    result = []
    while organic or promo:
        for _ in range(every - 1):
            if organic:
                result.append(organic.pop(0))
        if promo:
            p = promo.pop(0)
            p["source"] = "реклама"
            result.append(p)
    return result