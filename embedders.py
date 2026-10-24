import os
import threading

import numpy as np
from dotenv import load_dotenv

load_dotenv()

# Короткое название -> адреса модели на HuggingFace (пробуем по порядку, организация меняла имя)
BACKENDS = {
    "sbert":  ["ai-forever/sbert_large_nlu_ru", "sberbank-ai/sbert_large_nlu_ru"],  # на базе ruBERT-large от Сбера
    "rubert": ["ai-forever/ruBert-base", "sberbank-ai/ruBert-base"],                # «голый» ruBERT, для сравнения
    "tiny":   ["cointegrated/rubert-tiny2"],                                        # лёгкая сторонняя, для быстрой отладки
}
DEFAULT_BACKEND = "sbert"
BATCH = 16          # сколько текстов обрабатываем за раз
MAX_TOKENS = 128    # длиннее этого текст обрезается

_cache = {}         # модель с диска грузится один раз
_lock = threading.Lock()   # API работает в нескольких потоках: не грузим модель дважды


def enabled():
    """EMBED_ENABLED=0 в .env: нейросеть не загружается вообще, используются только готовые векторы."""
    return os.getenv("EMBED_ENABLED", "1") == "1"


def _current(backend):
    return backend or os.getenv("EMBED_BACKEND", DEFAULT_BACKEND)


def _load(backend):
    if backend in _cache:
        return _cache[backend]
    with _lock:
        if backend in _cache:          # пока ждали, другой поток уже загрузил
            return _cache[backend]
        return _load_unlocked(backend)


def _load_unlocked(backend):
    from transformers import AutoModel, AutoTokenizer
    last_error = None
    for model_id in BACKENDS[backend]:
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_id)   # режет текст на токены
            model = AutoModel.from_pretrained(model_id)           # сама нейросеть
            model.eval()                                          # режим «только считать»
            _cache[backend] = (tokenizer, model)
            return _cache[backend]
        except Exception as error:
            last_error = error
    raise RuntimeError(f"Не удалось загрузить модель {backend}: {last_error}")


def encode(texts, backend=None):
    """Список текстов -> матрица векторов (по строке на текст), длина каждого равна 1."""
    if not texts:
        return np.zeros((0, 0))
    if not enabled():
        raise RuntimeError("ruBERT выключен (EMBED_ENABLED=0)")
    import torch
    tokenizer, model = _load(_current(backend))

    vectors = []
    for i in range(0, len(texts), BATCH):
        encoded = tokenizer(texts[i:i + BATCH], padding=True, truncation=True,
                            max_length=MAX_TOKENS, return_tensors="pt")
        with torch.no_grad():
            hidden = model(**encoded).last_hidden_state     # вектор на каждый токен
        # усредняем векторы токенов в один вектор на весь текст
        # (маска нужна, чтобы не учитывать пустые «заполнители» в коротких текстах)
        mask = encoded["attention_mask"].unsqueeze(-1).float()
        pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        vectors.extend(pooled.numpy())

    matrix = np.array(vectors, dtype=float)
    return matrix / np.linalg.norm(matrix, axis=1, keepdims=True)   # нормировка


def model_name(backend=None):
    """Название модели: хранится в базе рядом с вектором."""
    return BACKENDS[_current(backend)][0]


def warmup(backend=None):
    """Загружает модель заранее (при старте сервера), чтобы первый запрос ленты не ждал."""
    encode(["прогрев модели"], backend)
    return model_name(backend)
