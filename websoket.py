from fastapi import WebSocket
from collections import defaultdict

class Connection:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, chat_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, chat_id: int, websocket: WebSocket):
        connections = self.active_connections.get(chat_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            self.active_connections.pop(chat_id, None)

    async def broadcast(self, chat_id: int, data: dict):
        connections = self.active_connections.get(chat_id, []).copy()
        for websocket in connections:
            try:
                await websocket.send_json(data)
            except Exception:
                self.disconnect(chat_id, websocket)

manager = Connection()
