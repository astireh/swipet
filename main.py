from data import PETS, USER_PREFS, LIKED_IDS, DISLIKED_IDS, PROMOTED_PET_IDS
from scoring import get_feed
from subscription import apply_promotion

feed, taste = get_feed(PETS, USER_PREFS, LIKED_IDS, DISLIKED_IDS)
feed = apply_promotion(feed, PROMOTED_PET_IDS)

for i, pet in enumerate(feed, start=1):
    print(f'{i:2}. {pet["name"]:10} {pet["species"]:8} {pet["score"]:5} баллов  [{pet["source"]}]')