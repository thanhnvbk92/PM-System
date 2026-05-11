from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.core import config
from app.core.websocket import manager, agent_manager
from app.db.clickhouse import get_clickhouse_client
import logging
from app.api.endpoints import production, statistics, master_data, logs, commands

# --- Logging Filter to reduce noise ---
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Bỏ qua các log chứa các đường dẫn heartbeat/polling tần suất cao
        msg = record.getMessage()
        return "/api/master/channels/heartbeat" not in msg and \
               "/api/stats/active-channel-ids" not in msg

# Áp dụng filter cho uvicorn.access logger
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

app = FastAPI(
    title="PM System Backend",
    description="Modular API for Log Collection and Production Analysis",
    version="1.5.0"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log chi tiết lỗi validation để dễ debug
    print(f"❌ Validation Error: {request.method} {request.url}")
    print(f"  Details: {exc.errors()}")
    # try to get body if possible
    try:
        body = await request.body()
        if body:
            print(f"  Body: {body.decode()[:500]}...")
    except:
        pass
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": "Logged to server console"},
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
app.include_router(commands.router)

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/client-command")
async def agent_websocket_endpoint(
    websocket: WebSocket, 
    channel_id: int,
    mac_address: str = None,
    ip: str = None,
    version: str = None
):
    await agent_manager.connect(channel_id, websocket, metadata={
        "ip": ip,
        "mac_address": mac_address,
        "version": version,
        "connected_at": datetime.now().isoformat()
    })
    try:
        while True:
            # Nhận phản hồi hoặc dữ liệu định kỳ từ agent
            data = await websocket.receive_json()
            
            # Nếu message có request_id, đây là phản hồi cho một lệnh
            if isinstance(data, dict) and "request_id" in data:
                agent_manager.set_response(data["request_id"], data)
    except WebSocketDisconnect:
        agent_manager.disconnect(channel_id)

@app.on_event("startup")
def startup_event():
    client = get_clickhouse_client()
    if client:
        print(f"Connected to ClickHouse at {config.CLICKHOUSE_HOST}:{config.CLICKHOUSE_PORT}")
    else:
        print(f"Warning: Could not connect to ClickHouse at {config.CLICKHOUSE_HOST}")
