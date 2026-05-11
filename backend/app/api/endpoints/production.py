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
    
    # Filter out NG [GMES] STEP_CHECK (Main Result)
    if data.result == "NG [GMES] STEP_CHECK":
        return {
            "status": "skipped",
            "message": "Filtered out NG [GMES] STEP_CHECK",
            "id": None
        }
        
    # Filter out if any individual step is [GMES] STEP_CHECK and it is NG
    # In this system, result can be "NG" (from JSON) or "2" (internal representation)
    if any(s.step_name == "[GMES] STEP_CHECK" and s.result in ["NG", "2"] for s in data.steps):
        return {
            "status": "skipped",
            "message": "Filtered out because of NG [GMES] STEP_CHECK step",
            "id": None
        }
    
    # Get hierarchy info for de-normalization
    hierarchy = await get_channel_hierarchy(data.channel_id)
    
    # Use deterministic UUID based on PID, channel_id, and start_time
    unique_string = f"{data.pid}_{data.channel_id}_{data.start_time.timestamp()}"
    pcb_id = uuid.uuid5(uuid.NAMESPACE_OID, unique_string)
    
    try:
        # 1. Check if PCB already exists
        pcb_exists = client.execute(f"SELECT id FROM pcb_results WHERE id = '{str(pcb_id)}'")
        
        # 2. Check if Steps already exist for this PCB
        steps_exist = False
        if data.steps:
            steps_check = client.execute(f"SELECT pcb_result_id FROM test_steps WHERE pcb_result_id = '{str(pcb_id)}' LIMIT 1")
            steps_exist = bool(steps_check)

        inserted_pcb = False
        inserted_steps = 0

        # Logic: Insert PCB if not exists
        if not pcb_exists:
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
            inserted_pcb = True

        # Logic: Insert Steps if they don't exist yet (even if PCB existed)
        if data.steps and not steps_exist:
            steps_rows = [[pcb_id, s.step_type, s.step_number, s.step_name, s.value, s.spec_min, s.spec_max, s.result] for s in data.steps]
            client.execute(
                "INSERT INTO test_steps (pcb_result_id, step_type, step_number, step_name, value, spec_min, spec_max, result) VALUES",
                steps_rows
            )
            inserted_steps = len(data.steps)
        
        # Determine final status
        if not inserted_pcb and inserted_steps == 0:
            return {
                "status": "success", 
                "message": "Record already fully exists", 
                "id": str(pcb_id), 
                "duplicate": True
            }

        # Broadcast via WebSocket (only for new PCB results)
        if inserted_pcb:
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

        return {
            "status": "success", 
            "id": str(pcb_id), 
            "inserted_pcb": inserted_pcb,
            "inserted_steps": inserted_steps
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/production/submit_batch")
async def submit_pcb_result_batch(items: List[PCBResultInput]):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    results = []
    pcb_rows_to_insert = []
    steps_rows_to_insert = []
    ws_messages = []
    
    # Summary counters
    summary = {"total": len(items), "success": 0, "failed": 0, "skipped": 0}

    # Filter items
    original_count = len(items)
    # Filter if main result is NG [GMES] STEP_CHECK
    items = [item for item in items if item.result != "NG [GMES] STEP_CHECK"]
    # Filter if any step is NG [GMES] STEP_CHECK
    items = [
        item for item in items 
        if not any(s.step_name == "[GMES] STEP_CHECK" and s.result in ["NG", "2"] for s in item.steps)
    ]
    summary["skipped"] += (original_count - len(items))

    try:
        # 1. Pre-calculate IDs and unique channels
        item_ids = []
        channel_ids = set()
        for item in items:
            unique_string = f"{item.pid}_{item.channel_id}_{item.start_time.timestamp()}"
            pcb_id = uuid.uuid5(uuid.NAMESPACE_OID, unique_string)
            item_ids.append(pcb_id)
            channel_ids.add(item.channel_id)
        
        # 2. Pre-fetch Hierarchy (Bulk)
        hierarchy_map = {}
        if channel_ids:
            ids_str = ",".join(map(str, channel_ids))
            h_query = f"""
                SELECT c.id, c.station_id, s.line_id, mg.buyer_id
                FROM channels c FINAL
                LEFT JOIN stations s FINAL ON c.station_id = s.id
                LEFT JOIN model_group mg FINAL ON s.model_group_id = mg.id
                WHERE c.id IN ({ids_str})
            """
            h_rows = client.execute(h_query)
            for r in h_rows:
                hierarchy_map[r[0]] = {"station_id": r[1], "line_id": r[2], "buyer_id": r[3]}

        # 3. Check existing records (Bulk)
        existing_pcb_ids = set()
        existing_step_pcb_ids = set()
        if item_ids:
            ids_sql = ",".join([f"'{str(id)}'" for id in item_ids])
            
            # Check PCBs
            pcb_exists_rows = client.execute(f"SELECT id FROM pcb_results WHERE id IN ({ids_sql})")
            existing_pcb_ids = {row[0] for row in pcb_exists_rows}
            
            # Check Steps
            step_exists_rows = client.execute(f"SELECT DISTINCT pcb_result_id FROM test_steps WHERE pcb_result_id IN ({ids_sql})")
            existing_step_pcb_ids = {row[0] for row in step_exists_rows}

        # 4. Process each item
        for i, item in enumerate(items):
            pcb_id = item_ids[i]
            try:
                # Validation: Hierarchy
                if item.channel_id not in hierarchy_map:
                    raise ValueError(f"Channel ID {item.channel_id} has no valid hierarchy in Master Data")
                
                h = hierarchy_map[item.channel_id]
                
                inserted_this_pcb = False
                inserted_this_steps = 0

                # Need PCB?
                if pcb_id not in existing_pcb_ids:
                    pcb_rows_to_insert.append([
                        pcb_id, item.channel_id, item.model_id, item.pid, item.fid,
                        item.pcba_partno, item.start_time, item.end_time, item.test_time,
                        item.result, item.file_path, item.jobfile,
                        h["station_id"], h["line_id"], h["buyer_id"]
                    ])
                    inserted_this_pcb = True
                    
                    # Prepare WS message
                    ws_messages.append({
                        "type": "NEW_RESULT",
                        "data": {
                            "id": str(pcb_id),
                            "channel_id": item.channel_id,
                            "model_id": item.model_id,
                            "pid": item.pid,
                            "fid": item.fid,
                            "pcba_partno": item.pcba_partno,
                            "start_time": item.start_time.isoformat(),
                            "end_time": item.end_time.isoformat() if item.end_time else None,
                            "test_time": item.test_time,
                            "result": item.result,
                            "file_path": item.file_path,
                            "jobfile": item.jobfile,
                            "station_id": h["station_id"],
                            "line_id": h["line_id"],
                            "buyer_id": h["buyer_id"]
                        }
                    })

                # Need Steps?
                if item.steps and pcb_id not in existing_step_pcb_ids:
                    for s in item.steps:
                        steps_rows_to_insert.append([
                            pcb_id, s.step_type, s.step_number, s.step_name, 
                            s.value, s.spec_min, s.spec_max, s.result
                        ])
                    inserted_this_steps = len(item.steps)

                # Report status
                if not inserted_this_pcb and inserted_this_steps == 0:
                    summary["skipped"] += 1
                else:
                    summary["success"] += 1
                    results.append({
                        "pid": item.pid,
                        "start_time": item.start_time.isoformat(),
                        "status": "success",
                        "inserted_pcb": inserted_this_pcb,
                        "inserted_steps": inserted_this_steps
                    })

            except Exception as item_err:
                summary["failed"] += 1
                results.append({
                    "pid": item.pid,
                    "start_time": item.start_time.isoformat(),
                    "status": "error",
                    "error": str(item_err),
                    "data": item.dict() # Return original data so client can fix
                })

        # 5. Bulk Inserts
        if pcb_rows_to_insert:
            client.execute(
                """INSERT INTO pcb_results (
                    id, channel_id, model_id, pid, fid, pcba_partno, 
                    start_time, end_time, test_time, result, file_path, jobfile,
                    station_id, line_id, buyer_id
                ) VALUES""",
                pcb_rows_to_insert
            )
        
        if steps_rows_to_insert:
            client.execute(
                "INSERT INTO test_steps (pcb_result_id, step_type, step_number, step_name, value, spec_min, spec_max, result) VALUES",
                steps_rows_to_insert
            )

        # 6. WS Broadcast
        for msg in ws_messages:
            await manager.broadcast(msg)

        return {
            "status": "completed",
            "summary": summary,
            "details": results
        }

    except Exception as e:
        # This catch is for catastrophic failures (e.g. DB connection lost mid-process)
        raise HTTPException(status_code=500, detail=f"Catastrophic batch error: {str(e)}")

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
