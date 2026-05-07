from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime
from app.models.schemas import PCBResultInput, SystemLogInput
from app.db.clickhouse import get_clickhouse_client

router = APIRouter(prefix="/api")

@router.post("/production/submit")
async def submit_pcb_result(data: PCBResultInput):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    pcb_id = uuid.uuid4()
    try:
        pcb_row = [[
            pcb_id, data.channel_id, data.model_id, data.pid, data.fid,
            data.pcba_partno, data.start_time, data.end_time, data.test_time,
            data.result, data.file_path, data.jobfile
        ]]
        client.execute(
            "INSERT INTO pcb_results (id, channel_id, model_id, pid, fid, pcba_partno, start_time, end_time, test_time, result, file_path, jobfile) VALUES",
            pcb_row
        )
        if data.steps:
            steps_rows = [[pcb_id, s.step_type, s.step_number, s.step_name, s.value, s.spec_min, s.spec_max, s.result] for s in data.steps]
            client.execute(
                "INSERT INTO test_steps (pcb_result_id, step_type, step_number, step_name, value, spec_min, spec_max, result) VALUES",
                steps_rows
            )
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
