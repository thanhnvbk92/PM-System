from typing import List, Dict, Any
from fastapi import WebSocket
import asyncio
import uuid

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
        self.active_agents: Dict[int, WebSocket] = {}
        self.agent_metadata: Dict[int, Dict[str, Any]] = {}
        self.pending_responses: Dict[str, asyncio.Future] = {}

    async def connect(self, channel_id: int, websocket: WebSocket, metadata: Dict[str, Any] = None):
        await websocket.accept()
        self.active_agents[channel_id] = websocket
        if metadata:
            self.agent_metadata[channel_id] = metadata

    def disconnect(self, channel_id: int):
        if channel_id in self.active_agents:
            del self.active_agents[channel_id]
        if channel_id in self.agent_metadata:
            del self.agent_metadata[channel_id]
        
        # Cancel all pending responses for this channel if needed (optional)

    async def send_command(self, channel_id: int, message: dict, wait_for_response: bool = False, timeout: float = 30.0):
        if channel_id not in self.active_agents:
            return None if wait_for_response else False
            
        request_id = str(uuid.uuid4())
        message["request_id"] = request_id
        
        if wait_for_response:
            loop = asyncio.get_event_loop()
            future = loop.create_future()
            self.pending_responses[request_id] = future
            
            try:
                await self.active_agents[channel_id].send_json(message)
                return await asyncio.wait_for(future, timeout=timeout)
            except asyncio.TimeoutError:
                return {"error": "Timeout waiting for agent response", "success": False}
            finally:
                if request_id in self.pending_responses:
                    del self.pending_responses[request_id]
        else:
            await self.active_agents[channel_id].send_json(message)
            return True

    def set_response(self, request_id: str, data: Any):
        if request_id in self.pending_responses:
            future = self.pending_responses[request_id]
            if not future.done():
                future.set_result(data)
            return True
        return False

manager = ConnectionManager()
agent_manager = AgentManager()
