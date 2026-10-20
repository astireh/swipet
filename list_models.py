import os
from dotenv import load_dotenv
from gigachat import GigaChat

load_dotenv()
KEY = os.getenv("GIGACHAT_KEY")
SCOPE = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")

with GigaChat(credentials=KEY, scope=SCOPE, verify_ssl_certs=False) as giga:
    for m in giga.get_models().data:
        print(getattr(m, "id_", m))