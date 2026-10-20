from data import PETS, USER_PREFS, LIKED_IDS, DISLIKED_IDS
from scoring import get_feed

feed, taste = get_feed(PETS, USER_PREFS, LIKED_IDS, DISLIKED_IDS)

for pet in feed:
    print(f'{pet["name"]:10} {pet["species"]:8} {pet["score"]:5} баллов  [{pet["source"]}]')