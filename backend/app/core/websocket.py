from typing import List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Handle disconnected clients that didn't trigger disconnect
                pass

class AgentManager:
    def __init__(self):
        self.active_agents: dict[int, WebSocket] = {}

    async def connect(self, channel_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_agents[channel_id] = websocket

    def disconnect(self, channel_id: int):
        if channel_id in self.active_agents:
            del self.active_agents[channel_id]

    async def send_command(self, channel_id: int, message: dict):
        if channel_id in self.active_agents:
            await self.active_agents[channel_id].send_json(message)
            return True
        return False

manager = ConnectionManager()
agent_manager = AgentManager()
