from fastapi import FastAPI
from pydantic import BaseModel
from clickhouse_driver import Client
from typing import List
from datetime import datetime

# ===== Configuration =====
CLICKHOUSE_HOST = "localhost"
CLICKHOUSE_PORT = 9000

# ===== Initialize FastAPI App =====
app = FastAPI(
    title="PM System Backend",
    description="API for Log Collection and Analysis",
    version="1.0.0"
)

# ===== ClickHouse Connection =====
try:
    clickhouse_client = Client(CLICKHOUSE_HOST, port=CLICKHOUSE_PORT)
    print("✓ Connected to ClickHouse successfully")
except Exception as e:
    print(f"✗ Failed to connect to ClickHouse: {e}")
    clickhouse_client = None

# ===== Data Models =====
class LogEntry(BaseModel):
    """Schema for a single log entry from ClientApp"""
    timestamp: datetime
    level: str  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message: str
    source: str  # e.g., "Application.log", "System.log"
    host: str  # Machine name or IP
    user: str = None  # Optional: User who triggered the log
    custom_fields: dict = {}  # For extensibility


class LogBatch(BaseModel):
    """Schema for batch log submission"""
    logs: List[LogEntry]


# ===== API Endpoints =====
@app.get("/health")
def health_check():
    """Health check endpoint"""
    db_status = "healthy" if clickhouse_client else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.now()
    }


@app.post("/api/logs/ingest")
def ingest_logs(batch: LogBatch):
    """
    Endpoint to receive logs from ClientApp
    
    Example request:
    {
        "logs": [
            {
                "timestamp": "2024-04-26T10:30:00",
                "level": "INFO",
                "message": "Application started",
                "source": "Application.log",
                "host": "CLIENT-01",
                "user": "admin"
            }
        ]
    }
    """
    if not clickhouse_client:
        return {
            "status": "error",
            "message": "ClickHouse is not connected"
        }
    
    try:
        # Insert logs into ClickHouse
        # Note: Assuming the table "logs" already exists in ClickHouse
        # We'll create the table schema in the next step
        
        logs_data = []
        for log in batch.logs:
            logs_data.append({
                "timestamp": log.timestamp,
                "level": log.level,
                "message": log.message,
                "source": log.source,
                "host": log.host,
                "user": log.user,
                "custom_fields": log.custom_fields
            })
        
        # Insert into ClickHouse
        # This is a placeholder; we'll implement the actual insert logic
        # clickhouse_client.execute(
        #     "INSERT INTO logs VALUES",
        #     logs_data
        # )
        
        return {
            "status": "success",
            "message": f"Received {len(batch.logs)} log entries",
            "count": len(batch.logs)
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to ingest logs: {str(e)}"
        }


@app.get("/api/logs/search")
def search_logs(
    host: str = None,
    level: str = None,
    start_time: datetime = None,
    end_time: datetime = None,
    limit: int = 100
):
    """
    Search and retrieve logs from ClickHouse
    
    Query parameters:
    - host: Filter by host name
    - level: Filter by log level (INFO, ERROR, etc.)
    - start_time: Start timestamp
    - end_time: End timestamp
    - limit: Maximum number of results (default: 100)
    """
    if not clickhouse_client:
        return {
            "status": "error",
            "message": "ClickHouse is not connected"
        }
    
    # Build query dynamically
    query = "SELECT * FROM logs WHERE 1=1"
    params = []
    
    if host:
        query += " AND host = %s"
        params.append(host)
    
    if level:
        query += " AND level = %s"
        params.append(level)
    
    if start_time:
        query += " AND timestamp >= %s"
        params.append(start_time)
    
    if end_time:
        query += " AND timestamp <= %s"
        params.append(end_time)
    
    query += f" LIMIT {limit}"
    
    try:
        # Execute query
        # results = clickhouse_client.execute(query, params)
        # This is a placeholder
        
        return {
            "status": "success",
            "data": [],  # Will contain actual log entries
            "count": 0
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to search logs: {str(e)}"
        }


# ===== ClickHouse Table Creation =====
def init_clickhouse_tables():
    """Initialize ClickHouse tables on startup"""
    if not clickhouse_client:
        print("ClickHouse is not connected. Skipping table initialization.")
        return
    
    try:
        # Create logs table if it doesn't exist
        create_table_query = """
        CREATE TABLE IF NOT EXISTS logs (
            timestamp DateTime,
            level String,
            message String,
            source String,
            host String,
            user Nullable(String),
            custom_fields Map(String, String)
        ) ENGINE = MergeTree()
        ORDER BY timestamp
        """
        
        clickhouse_client.execute(create_table_query)
        print("✓ ClickHouse table 'logs' initialized successfully")
    
    except Exception as e:
        print(f"✗ Failed to initialize ClickHouse tables: {e}")


# ===== Startup Event =====
@app.on_event("startup")
def startup_event():
    """Run on application startup"""
    init_clickhouse_tables()


# ===== Main =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True
    )
