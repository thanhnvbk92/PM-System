from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.core import config
from app.core.websocket import manager
from app.db.clickhouse import get_clickhouse_client
from app.api.endpoints import production, statistics, master_data, logs

app = FastAPI(
    title="PM System Backend",
    description="Modular API for Log Collection and Production Analysis",
    version="1.4.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health_check():
    client = get_clickhouse_client()
    db_status = "healthy" if client else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "database_host": config.CLICKHOUSE_HOST,
        "timestamp": datetime.now()
    }

# Include Routers
app.include_router(production.router)
app.include_router(statistics.router)
app.include_router(master_data.router)
app.include_router(logs.router)

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
def startup_event():
    client = get_clickhouse_client()
    if client:
        print(f"Connected to ClickHouse at {config.CLICKHOUSE_HOST}:{config.CLICKHOUSE_PORT}")
    else:
        print(f"Warning: Could not connect to ClickHouse at {config.CLICKHOUSE_HOST}")
