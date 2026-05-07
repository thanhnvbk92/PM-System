from fastapi import APIRouter, Query
from typing import Optional
from app.db.clickhouse import get_clickhouse_client

router = APIRouter(prefix="/api/logs")

@router.get("/search")
async def search_logs(
    limit: int = Query(100), offset: int = Query(0),
    buyer_id: Optional[int] = Query(None), line_id: Optional[int] = Query(None),
    station_id: Optional[int] = Query(None), result: Optional[str] = Query(None)
):
    client = get_clickhouse_client()
    if not client: return []
    where_clause = "WHERE 1=1"
    if buyer_id: where_clause += f" AND buyer_id = {buyer_id}"
    if line_id: where_clause += f" AND line_id = {line_id}"
    if station_id: where_clause += f" AND station_id = {station_id}"
    if result: where_clause += f" AND result = '{result}'"
    try:
        query = f"SELECT id, channel_id, model_id, pid, start_time, end_time, result, file_path FROM pcb_results {where_clause} ORDER BY start_time DESC LIMIT {limit} OFFSET {offset}"
        rows = client.execute(query)
        return [{"id": str(r[0]), "channel_id": r[1], "model_id": r[2], "pid": r[3], "timestamp": r[4], "end_time": r[5], "result": r[6], "message": f"PID: {r[3]} - Result: {r[6]}", "line_id": 0, "station_id": 0} for r in rows]
    except Exception as e:
        print(f"Error searching logs: {e}")
        return []
