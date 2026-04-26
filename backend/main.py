from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from clickhouse_driver import Client
from typing import List, Optional
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ===== Configuration =====
# Mặc định là localhost, nhưng khi chạy thực tế sẽ trỏ tới IP của Linux VM
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", 9000))

from fastapi.middleware.cors import CORSMiddleware
import uuid

# ===== Initialize FastAPI App =====
app = FastAPI(
    title="PM System Backend",
    description="API for Log Collection and Production Analysis (ClickHouse Version)",
    version="1.3.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong sản xuất nên giới hạn IP cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== ClickHouse Connection =====
def get_clickhouse_client():
    try:
        client = Client(CLICKHOUSE_HOST, port=CLICKHOUSE_PORT)
        # Kiểm tra kết nối nhanh (ping)
        client.execute("SELECT 1")
        return client
    except Exception as e:
        print(f"FAILED to connect to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}: {e}")
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

# --- Master Data Models ---

class BuyerModel(BaseModel):
    id: int
    name: str
    remark: Optional[str] = ""

class LineModel(BaseModel):
    id: int
    name: str
    remark: Optional[str] = ""

class StationModel(BaseModel):
    id: int
    line_id: int
    model_group_id: int
    station_type: str
    name: str

class ModelGroupModel(BaseModel):
    id: int
    buyer_id: int
    name: str
    remark: Optional[str] = ""

class ModelInfoModel(BaseModel):
    id: int
    model_group_id: int
    name: str
    remark: Optional[str] = ""

class ChannelModel(BaseModel):
    id: int
    station_id: int
    name: str
    ip_address: Optional[str] = ""
    mac_address: Optional[str] = ""
    gmes_name: Optional[str] = ""
    status: Optional[str] = "Running"

class DeviceTypeModel(BaseModel):
    id: int
    name: str
    remark: Optional[str] = ""

class DeviceModel(BaseModel):
    id: int
    channel_id: int
    device_type_id: int
    name: str
    model_partno: Optional[str] = ""
    serial_number: Optional[str] = ""
    status: Optional[str] = "OK"
    remark: Optional[str] = ""

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

# ===== Statistics Endpoints with Filtering =====
@app.get("/api/stats/summary")
async def get_stats_summary(
    buyer_id: Optional[int] = Query(None), 
    line_id: Optional[int] = Query(None), 
    station_id: Optional[int] = Query(None)
):
    client = get_clickhouse_client()
    if not client:
        return {"total_logs": 0, "error_logs": 0, "success_rate": 0, "total_models": 0}
    
    where_clause = "WHERE 1=1"
    if buyer_id: where_clause += f" AND buyer_id = {buyer_id}"
    if line_id: where_clause += f" AND line_id = {line_id}"
    if station_id: where_clause += f" AND station_id = {station_id}"

    try:
        total = client.execute(f"SELECT count() FROM pcb_results {where_clause}")[0][0]
        errors = client.execute(f"SELECT count() FROM pcb_results {where_clause} AND result = 'NG'")[0][0]
        models = client.execute(f"SELECT count(DISTINCT model_id) FROM pcb_results {where_clause}")[0][0]
        
        success_rate = ((total - errors) / total * 100) if total > 0 else 100
        
        return {
            "total_logs": int(total),
            "error_logs": int(errors),
            "success_rate": round(float(success_rate), 2),
            "total_models": int(models)
        }
    except Exception as e:
        print(f"Error getting summary from ClickHouse: {e}")
        return {"total_logs": 0, "error_logs": 0, "success_rate": 0, "total_models": 0}

@app.get("/api/stats/by-buyer")
async def get_stats_by_buyer(
    line_id: Optional[int] = Query(None), 
    station_id: Optional[int] = Query(None)
):
    client = get_clickhouse_client()
    if not client: return []
    
    where_clause = "WHERE 1=1"
    if line_id: where_clause += f" AND line_id = {line_id}"
    if station_id: where_clause += f" AND station_id = {station_id}"
    
    try:
        # Join pcb_results with channels -> stations -> lines -> buyer
        # Use LEFT JOIN to ensure we see data even if some relations are missing (for debugging)
        query = f"""
            SELECT b.name, count() as count
            FROM pcb_results l
            INNER JOIN channels c ON l.channel_id = c.id
            INNER JOIN stations s ON c.station_id = s.id
            INNER JOIN lines ln ON s.line_id = ln.id
            INNER JOIN buyer b ON ln.buyer_id = b.id
            {where_clause}
            GROUP BY b.name
            ORDER BY count DESC
        """
        result = client.execute(query)
        return [{"name": row[0], "value": row[1]} for row in result]
    except Exception as e:
        print(f"Error getting by-buyer: {e}")
        return []

@app.get("/api/stats/by-result")
async def get_stats_by_result(
    buyer_id: Optional[int] = Query(None), 
    line_id: Optional[int] = Query(None), 
    station_id: Optional[int] = Query(None)
):
    client = get_clickhouse_client()
    if not client: return []
    
    where_clause = "WHERE 1=1"
    if buyer_id: where_clause += f" AND buyer_id = {buyer_id}"
    if line_id: where_clause += f" AND line_id = {line_id}"
    if station_id: where_clause += f" AND station_id = {station_id}"
    
    try:
        query = f"SELECT result, count() as count FROM pcb_results {where_clause} GROUP BY result"
        result = client.execute(query)
        return [{"name": row[0], "value": row[1]} for row in result]
    except Exception as e:
        print(f"Error getting by-result: {e}")
        return []

@app.get("/api/logs/search")
async def search_logs(
    limit: int = Query(100),
    offset: int = Query(0),
    buyer_id: Optional[int] = Query(None),
    line_id: Optional[int] = Query(None),
    station_id: Optional[int] = Query(None),
    result: Optional[str] = Query(None)
):
    client = get_clickhouse_client()
    if not client: return []
    
    where_clause = "WHERE 1=1"
    if buyer_id: where_clause += f" AND buyer_id = {buyer_id}"
    if line_id: where_clause += f" AND line_id = {line_id}"
    if station_id: where_clause += f" AND station_id = {station_id}"
    if result: where_clause += f" AND result = '{result}'"
    
    try:
        # Join to get nice names if needed, but for now just raw logs
        query = f"""
            SELECT id, channel_id, model_id, pid, start_time, end_time, result, file_path 
            FROM pcb_results 
            {where_clause} 
            ORDER BY start_time DESC 
            LIMIT {limit} OFFSET {offset}
        """
        rows = client.execute(query)
        return [
            {
                "id": str(r[0]), "channel_id": r[1], "model_id": r[2], 
                "pid": r[3], "timestamp": r[4], "end_time": r[5], 
                "result": r[6], "message": f"PID: {r[3]} - Result: {r[6]}", 
                "line_id": 0, "station_id": 0 # Placeholder for now
            } for r in rows
        ]
    except Exception as e:
        print(f"Error searching logs: {e}")
        return []

# ===== Master Data CRUD Endpoints =====

def get_all(table_name: str):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        # Lấy column names
        columns_info = client.execute(f"DESCRIBE TABLE {table_name}")
        col_names = [col[0] for col in columns_info]
        
        # Lấy data
        rows = client.execute(f"SELECT * FROM {table_name}")
        
        # Chuyển thành list dict
        return [dict(zip(col_names, row)) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def upsert_entity(table_name: str, data: dict):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        # ClickHouse ReplacingMergeTree dùng ORDER BY để xác định bản ghi mới nhất.
        # Chúng ta chỉ cần INSERT, ClickHouse sẽ tự handle việc 'update' (replace) khi merge.
        keys = ", ".join(data.keys())
        values = list(data.values())
        placeholders = ", ".join(["%s"] * len(values))
        
        client.execute(f"INSERT INTO {table_name} ({keys}) VALUES", [values])
        return {"status": "success", "message": "Item saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def delete_entity(table_name: str, item_id: int):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        # ClickHouse DELETE (ALTER TABLE ... DELETE) là một mutation, chạy bất đồng bộ.
        client.execute(f"ALTER TABLE {table_name} DELETE WHERE id = {item_id}")
        return {"status": "success", "message": "Delete command submitted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -- Buyer --
@app.get("/api/master/buyer")
async def list_buyers(): return get_all("buyer")

@app.post("/api/master/buyer")
async def add_buyer(item: BuyerModel): return upsert_entity("buyer", item.dict())

@app.delete("/api/master/buyer/{item_id}")
async def remove_buyer(item_id: int): return delete_entity("buyer", item_id)

# -- Line --
@app.get("/api/master/lines")
async def list_lines(): return get_all("lines")

@app.post("/api/master/lines")
async def add_line(item: LineModel): return upsert_entity("lines", item.dict())

@app.delete("/api/master/lines/{item_id}")
async def remove_line(item_id: int): return delete_entity("lines", item_id)

# -- Station --
@app.get("/api/master/stations")
async def list_stations(): return get_all("stations")

@app.post("/api/master/stations")
async def add_station(item: StationModel): return upsert_entity("stations", item.dict())

@app.delete("/api/master/stations/{item_id}")
async def remove_station(item_id: int): return delete_entity("stations", item_id)

# -- Model Group --
@app.get("/api/master/model_group")
async def list_model_groups(): return get_all("model_group")

@app.post("/api/master/model_group")
async def add_model_group(item: ModelGroupModel): return upsert_entity("model_group", item.dict())

# -- Models --
@app.get("/api/master/models")
async def list_models(): return get_all("models")

@app.post("/api/master/models")
async def add_model_info(item: ModelInfoModel): return upsert_entity("models", item.dict())

@app.on_event("startup")
def startup_event():
    client = get_clickhouse_client()
    if client:
        print(f"Connected to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
    else:
        print(f"Warning: Could not connect to ClickHouse at {CLICKHOUSE_HOST}")

if __name__ == "__main__":
    import uvicorn
    # Đọc cổng từ biến môi trường, mặc định là 8100
    api_port = int(os.getenv("API_PORT", 8100))
    uvicorn.run(app, host="0.0.0.0", port=api_port)
