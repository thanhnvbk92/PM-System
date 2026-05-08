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
    
    # Use deterministic UUID to prevent duplicates
    # Generate a unique ID based on PID, channel_id, and exact start_time
    unique_string = f"{data.pid}_{data.channel_id}_{data.start_time.timestamp()}"
    pcb_id = uuid.uuid5(uuid.NAMESPACE_OID, unique_string)
    
    try:
        # Check if this record already exists to prevent duplicate (compatible with old random UUIDs)
        existing = client.execute(f"SELECT id FROM pcb_results WHERE pid = '{data.pid}' AND channel_id = {data.channel_id} AND start_time = '{data.start_time}'")
        if existing:
            # Already exists, just return success without inserting
            return {"status": "success", "id": str(pcb_id), "steps_count": len(data.steps), "duplicate": True}

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
                "jobfile": data.jobfile,
                "station_id": hierarchy["station_id"],
                "line_id": hierarchy["line_id"],
                "buyer_id": hierarchy["buyer_id"]
            }
        })

        return {"status": "success", "id": str(pcb_id), "steps_count": len(data.steps)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/production/submit_batch")
async def submit_pcb_result_batch(items: List[PCBResultInput]):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    pcb_rows = []
    steps_rows = []
    ng_results = []
    ws_messages = []

    try:
        # Pre-calculate deterministic UUIDs and keys for the batch
        batch_ids = []
        batch_keys = []
        for data in items:
            unique_string = f"{data.pid}_{data.channel_id}_{data.start_time.timestamp()}"
            batch_ids.append(uuid.uuid5(uuid.NAMESPACE_OID, unique_string))
            # Format datetime properly for ClickHouse tuple query
            time_str = data.start_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            batch_keys.append(f"('{data.pid}', {data.channel_id}, '{time_str}')")
        
        # Check which ones already exist
        existing_keys = set()
        if batch_keys:
            query = f"SELECT pid, channel_id, start_time FROM pcb_results WHERE (pid, channel_id, start_time) IN ({','.join(batch_keys)})"
            res = client.execute(query)
            # res contains tuples like (pid, channel_id, datetime_obj)
            for row in res:
                # Format to compare easily
                existing_keys.add(f"{row[0]}_{row[1]}_{row[2].timestamp()}")

        for i, data in enumerate(items):
            pcb_id = batch_ids[i]
            key_check = f"{data.pid}_{data.channel_id}_{data.start_time.timestamp()}"
            
            # Skip if it already exists (compatible with old random UUIDs)
            if key_check in existing_keys:
                continue
                
            hierarchy = await get_channel_hierarchy(data.channel_id)
            
            pcb_rows.append([
                pcb_id, data.channel_id, data.model_id, data.pid, data.fid,
                data.pcba_partno, data.start_time, data.end_time, data.test_time,
                data.result, data.file_path, data.jobfile,
                hierarchy["station_id"], hierarchy["line_id"], hierarchy["buyer_id"]
            ])
            
            if data.steps:
                for s in data.steps:
                    steps_rows.append([pcb_id, s.step_type, s.step_number, s.step_name, s.value, s.spec_min, s.spec_max, s.result])
            
            # Prepare WebSocket broadcast data
            ws_messages.append({
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
                    "jobfile": data.jobfile,
                    "station_id": hierarchy["station_id"],
                    "line_id": hierarchy["line_id"],
                    "buyer_id": hierarchy["buyer_id"]
                }
            })

            # Track NG results
            if data.result != "OK":
                ng_results.append({
                    "pid": data.pid,
                    "result": data.result,
                    "channel_id": data.channel_id,
                    "start_time": data.start_time
                })

        if pcb_rows:
            client.execute(
                """INSERT INTO pcb_results (
                    id, channel_id, model_id, pid, fid, pcba_partno, 
                    start_time, end_time, test_time, result, file_path, jobfile,
                    station_id, line_id, buyer_id
                ) VALUES""",
                pcb_rows
            )
            
        if steps_rows:
            client.execute(
                "INSERT INTO test_steps (pcb_result_id, step_type, step_number, step_name, value, spec_min, spec_max, result) VALUES",
                steps_rows
            )
        
        # Broadcast via WebSocket for real-time view (batch or sequentially)
        for msg in ws_messages:
            await manager.broadcast(msg)

        return {
            "status": "success", 
            "count": len(items), 
            "ng_count": len(ng_results),
            "ng_results": ng_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during batch insert: {str(e)}")

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
