from database import SessionLocal
import crud

db = SessionLocal()

# 1. Создаем пользователя
try:
    user = crud.create_user(db, name="Ivan", password="123", email="ivan@test.com", phone="+79990001122")
    print(f"Пользователь создан: {user.id}")
except ValueError as e:
    print(f"Ошибка: {e}")

# 2. Создаем продавца
try:
    seller = crud.create_seller(db, seller_type="individual", name="PetShop", email="shop@test.com", phone="+79990001133")
    print(f"Продавец создан: {seller.id}")
except ValueError as e:
    print(f"Ошибка: {e}")

# 3. Создаем питомца
try:
    pet = crud.create_pet(db, seller_id=seller.id, pet_type="dog", gender="male", nickname="Bobik", breed="Husky")
    print(f"Питомец создан: {pet.id}")
except ValueError as e:
    print(f"Ошибка: {e}")

# 4. Пользователь свайпает вправо (создается чат)
try:
    swipe, chat = crud.create_swipe(db, user_id=user.id, pet_id=pet.id, direction="right")
    print(f"Свайп создан. Чат ID: {chat.id}")
except ValueError as e:
    print(f"Ошибка: {e}")

# 5. Отправляем сообщение
try:
    msg = crud.send_message(db, chat_id=chat.id, sender_type="user", sender_id=user.id, text="Привет, хочу купить!")
    print(f"Сообщение отправлено: {msg.text}")
except ValueError as e:
    print(f"Ошибка: {e}")

db.close()