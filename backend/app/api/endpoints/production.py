from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime
from app.models.schemas import PCBResultInput, SystemLogInput
from app.db.clickhouse import get_clickhouse_client
from app.core.websocket import manager

router = APIRouter(prefix="/api")

# In-memory cache for fast ID lookups during ingestion
channel_map = {}

async def get_channel_hierarchy(channel_id: int):
    global channel_map
    if channel_id in channel_map:
        return channel_map[channel_id]
    
    # If not in cache, try to fetch (This could be optimized to fetch all at once)
    client = get_clickhouse_client()
    query = f"""
        SELECT c.id, c.station_id, s.line_id, mg.buyer_id
        FROM channels c FINAL
        LEFT JOIN stations s FINAL ON c.station_id = s.id
        LEFT JOIN model_group mg FINAL ON s.model_group_id = mg.id
        WHERE c.id = {channel_id}
    """
    res = client.execute(query)
    if res:
        info = {"station_id": res[0][1], "line_id": res[0][2], "buyer_id": res[0][3]}
        channel_map[channel_id] = info
        return info
    return {"station_id": 0, "line_id": 0, "buyer_id": 0}

@router.post("/production/submit")
async def submit_pcb_result(data: PCBResultInput):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    # Get hierarchy info for de-normalization (Essential for scale)
    hierarchy = await get_channel_hierarchy(data.channel_id)
    
    pcb_id = uuid.uuid4()
    try:
        pcb_row = [[
            pcb_id, data.channel_id, data.model_id, data.pid, data.fid,
            data.pcba_partno, data.start_time, data.end_time, data.test_time,
            data.result, data.file_path, data.jobfile,
            hierarchy["station_id"], hierarchy["line_id"], hierarchy["buyer_id"]
        ]]
        client.execute(
            """INSERT INTO pcb_results (
                id, channel_id, model_id, pid, fid, pcba_partno, 
                start_time, end_time, test_time, result, file_path, jobfile,
                station_id, line_id, buyer_id
            ) VALUES""",
            pcb_row
        )
        if data.steps:
            steps_rows = [[pcb_id, s.step_type, s.step_number, s.step_name, s.value, s.spec_min, s.spec_max, s.result] for s in data.steps]
            client.execute(
                "INSERT INTO test_steps (pcb_result_id, step_type, step_number, step_name, value, spec_min, spec_max, result) VALUES",
                steps_rows
            )
        
        # Broadcast via WebSocket for real-time view
        await manager.broadcast({
            "type": "NEW_RESULT",
            "data": {
                "id": str(pcb_id),
                "channel_id": data.channel_id,
                "model_id": data.model_id,
                "pid": data.pid,
                "fid": data.fid,
                "pcba_partno": data.pcba_partno,
                "start_time": data.start_time.isoformat() if data.start_time else None,
                "end_time": data.end_time.isoformat() if data.end_time else None,
                "test_time": data.test_time,
                "result": data.result,
                "file_path": data.file_path,
                "jobfile": data.jobfile
            }
        })

        return {"status": "success", "id": str(pcb_id), "steps_count": len(data.steps)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/system/logs")
async def ingest_system_logs(logs: List[SystemLogInput]):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        rows = [[datetime.now(), l.level, l.message, l.line_id, l.station_id, l.channel_id, l.device_id] for l in logs]
        client.execute(
            "INSERT INTO system_logs (timestamp, level, message, line_id, station_id, channel_id, device_id) VALUES",
            rows
        )
        return {"status": "success", "count": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
