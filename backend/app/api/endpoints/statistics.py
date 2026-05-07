from fastapi import APIRouter, Query
from typing import Optional
from app.db.clickhouse import get_clickhouse_client

router = APIRouter(prefix="/api/stats")

@router.get("/summary")
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
            "total_logs": int(total), "error_logs": int(errors),
            "success_rate": round(float(success_rate), 2), "total_models": int(models)
        }
    except Exception as e:
        print(f"Error getting summary: {e}")
        return {"total_logs": 0, "error_logs": 0, "success_rate": 0, "total_models": 0}

@router.get("/by-buyer")
async def get_stats_by_buyer(line_id: Optional[int] = Query(None), station_id: Optional[int] = Query(None)):
    client = get_clickhouse_client()
    if not client: return []
    where_clause = "WHERE 1=1"
    if line_id: where_clause += f" AND line_id = {line_id}"
    if station_id: where_clause += f" AND station_id = {station_id}"
    try:
        query = f"""
            SELECT b.name, count() as count FROM pcb_results l
            INNER JOIN channels c ON l.channel_id = c.id
            INNER JOIN stations s ON c.station_id = s.id
            INNER JOIN lines ln ON s.line_id = ln.id
            INNER JOIN buyer b ON ln.buyer_id = b.id
            {where_clause} GROUP BY b.name ORDER BY count DESC
        """
        result = client.execute(query)
        return [{"name": row[0], "value": row[1]} for row in result]
    except Exception as e:
        print(f"Error getting by-buyer: {e}")
        return []

@router.get("/by-result")
async def get_stats_by_result(
    buyer_id: Optional[int] = Query(None), line_id: Optional[int] = Query(None), station_id: Optional[int] = Query(None)
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
