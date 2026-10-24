import os
from dotenv import load_dotenv
from gigachat import GigaChat

load_dotenv()  # читает файл .env

key = os.getenv("GIGACHAT_KEY")
scope = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")
model = os.getenv("GIGACHAT_MODEL", "GigaChat-2")

with GigaChat(credentials=key, scope=scope, model=model, verify_ssl_certs=False) as giga:
    answer = giga.chat("Привет! Ответь одним словом: ты работаешь?")
    print(answer.choices[0].message.content)