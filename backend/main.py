from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from clickhouse_driver import Client
from typing import List, Optional
from datetime import datetime
import uuid
import os

# ===== Configuration =====
# Mặc định là localhost, nhưng khi chạy thực tế sẽ trỏ tới IP của Linux VM
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", 9000))

# ===== Initialize FastAPI App =====
app = FastAPI(
    title="PM System Backend",
    description="API for Log Collection and Production Analysis (ClickHouse Version)",
    version="1.3.0"
)

# ===== ClickHouse Connection =====
def get_clickhouse_client():
    try:
        client = Client(CLICKHOUSE_HOST, port=CLICKHOUSE_PORT)
        # Kiểm tra kết nối nhanh (ping)
        client.execute("SELECT 1")
        return client
    except Exception as e:
        print(f"✗ Failed to connect to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}: {e}")
        return None

# ===== Data Models =====

class TestStepInput(BaseModel):
    """Chi tiết từng bước kiểm tra (Test Step)"""
    step_type: str
    step_number: int
    step_name: str
    value: float
    spec_min: float
    spec_max: float
    result: str # PASS/FAIL

class PCBResultInput(BaseModel):
    """Kết quả tổng quát của một bản mạch PCB"""
    channel_id: int
    model_id: int
    pid: str
    fid: str
    pcba_partno: str
    start_time: datetime
    end_time: datetime
    test_time: float
    result: str # PASS/FAIL
    file_path: Optional[str] = ""
    steps: List[TestStepInput] = []

class SystemLogInput(BaseModel):
    """Nhật ký hoạt động của hệ thống"""
    level: str
    message: str
    line_id: Optional[int] = 0
    station_id: Optional[int] = 0
    channel_id: Optional[int] = 0
    device_id: Optional[int] = 0

# ===== API Endpoints =====

@app.get("/health")
def health_check():
    client = get_clickhouse_client()
    db_status = "healthy" if client else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "database_host": CLICKHOUSE_HOST,
        "timestamp": datetime.now()
    }

@app.post("/api/production/submit")
async def submit_pcb_result(data: PCBResultInput):
    """Gửi kết quả test PCB và các bước chi tiết lên Database"""
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    pcb_id = uuid.uuid4()
    
    try:
        # 1. Insert vào bảng pcb_results
        pcb_row = [[
            pcb_id,
            data.channel_id,
            data.model_id,
            data.pid,
            data.fid,
            data.pcba_partno,
            data.start_time,
            data.end_time,
            data.test_time,
            data.result,
            data.file_path
        ]]
        
        client.execute(
            "INSERT INTO pcb_results (id, channel_id, model_id, pid, fid, pcba_partno, start_time, end_time, test_time, result, file_path) VALUES",
            pcb_row
        )
        
        # 2. Insert vào bảng test_steps (nếu có)
        if data.steps:
            steps_rows = []
            for s in data.steps:
                steps_rows.append([
                    pcb_id,
                    s.step_type,
                    s.step_number,
                    s.step_name,
                    s.value,
                    s.spec_min,
                    s.spec_max,
                    s.result
                ])
            
            client.execute(
                "INSERT INTO test_steps (pcb_result_id, step_type, step_number, step_name, value, spec_min, spec_max, result) VALUES",
                steps_rows
            )
            
        return {
            "status": "success",
            "id": str(pcb_id),
            "steps_count": len(data.steps)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/system/logs")
async def ingest_system_logs(logs: List[SystemLogInput]):
    """Ingest system logs into ClickHouse"""
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        rows = []
        now = datetime.now()
        for log in logs:
            rows.append([
                now,
                log.level,
                log.message,
                log.line_id,
                log.station_id,
                log.channel_id,
                log.device_id
            ])
            
        client.execute(
            "INSERT INTO system_logs (timestamp, level, message, line_id, station_id, channel_id, device_id) VALUES",
            rows
        )
        
        return {"status": "success", "count": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
def startup_event():
    client = get_clickhouse_client()
    if client:
        print(f"✓ Connected to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
    else:
        print(f"⚠ Warning: Could not connect to ClickHouse at {CLICKHOUSE_HOST}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
