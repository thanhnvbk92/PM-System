from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.db.clickhouse import get_clickhouse_client

router = APIRouter(prefix="/api/logs")

@router.get("/search")
async def search_logs(
    limit: int = Query(100), offset: int = Query(0),
    pid: Optional[str] = Query(None),
    buyer_id: Optional[int] = Query(None), 
    line_id: Optional[int] = Query(None),
    station_id: Optional[int] = Query(None), 
    result: Optional[str] = Query(None)
):
    client = get_clickhouse_client()
    if not client: return []
    
    where_clauses = ["1=1"]
    if pid: where_clauses.append(f"pid ILIKE '%{pid}%'")
    if buyer_id: where_clauses.append(f"l.buyer_id = {buyer_id}")
    if line_id: where_clauses.append(f"l.line_id = {line_id}")
    if station_id: where_clauses.append(f"l.station_id = {station_id}")
    if result: where_clauses.append(f"result = '{result}'")
    
    where_str = " AND ".join(where_clauses)
    
    try:
        # Truy vấn lấy dữ liệu kèm LEFT JOIN để lấy tên các cấp và bước lỗi
        query = f"""
            SELECT 
                l.id, l.pid, l.start_time, l.result, l.file_path, l.jobfile,
                ln.name as line_name, 
                s.name as station_name, 
                c.name as channel_name,
                c.ip_address as ip,
                ng.step_name as step_ng,
                l.channel_id
            FROM pcb_results l
            ANY LEFT JOIN channels c ON l.channel_id = c.id
            ANY LEFT JOIN stations s ON c.station_id = s.id
            ANY LEFT JOIN lines ln ON s.line_id = ln.id
            LEFT JOIN (
                SELECT pcb_result_id, any(step_name) as step_name
                FROM test_steps 
                WHERE result = 'NG' 
                GROUP BY pcb_result_id
            ) ng ON l.id = ng.pcb_result_id
            WHERE {where_str}
            ORDER BY start_time DESC 
            LIMIT {limit} OFFSET {offset}
        """
        rows = client.execute(query)
        return [
            {
                "id": str(r[0]), "pid": r[1], "timestamp": r[2], "result": r[3], 
                "file_path": r[4], "jobfile": r[5],
                "line_name": r[6] if r[6] else "-", 
                "station_name": r[7] if r[7] else "-", 
                "channel_name": r[8] if r[8] else (f"Unknown (ID: {r[11]})" if r[11] else "Unknown"),
                "ip": r[9] if r[9] else "-", 
                "step_ng": r[10] if r[10] else "-"
            } for r in rows
        ]
    except Exception as e:
        print(f"Error searching logs: {e}")
        return []

@router.get("/{pcb_id}")
async def get_log_detail(pcb_id: str):
    client = get_clickhouse_client()
    if not client: raise HTTPException(status_code=503, detail="DB Error")
    try:
        # Lấy thông tin tổng quát kèm LEFT JOIN
        query_pcb = f"""
            SELECT 
                l.id, l.pid, l.start_time, l.end_time, l.result, l.test_time, l.file_path, l.jobfile,
                ln.name as line_name, s.name as station_name, c.name as channel_name
            FROM pcb_results l
            LEFT JOIN channels c ON l.channel_id = c.id
            LEFT JOIN stations s ON c.station_id = s.id
            LEFT JOIN lines ln ON s.line_id = ln.id
            WHERE l.id = '{pcb_id}'
        """
        pcb_info = client.execute(query_pcb)
        if not pcb_info:
            raise HTTPException(status_code=404, detail="Log not found")
        
        r = pcb_info[0]
        info_dict = {
            "id": str(r[0]), "pid": r[1], "start_time": r[2], "end_time": r[3],
            "result": r[4], "test_time": r[5], "file_path": r[6], "jobfile": r[7],
            "line_name": r[8], "station_name": r[9], "channel_name": r[10]
        }

        # Lấy chi tiết các bước
        steps_raw = client.execute(f"SELECT step_number, step_name, value, spec_min, spec_max, result FROM test_steps WHERE pcb_result_id = '{pcb_id}' ORDER BY step_number")
        steps = [
            {
                "step_number": s[0], "step_name": s[1], "value": s[2],
                "spec_min": s[3], "spec_max": s[4], "result": s[5]
            } for s in steps_raw
        ]
        
        return {
            "info": info_dict,
            "steps": steps
        }
    except Exception as e:
        print(f"Error in detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))
