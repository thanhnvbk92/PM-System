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
        # Truy vấn từ bảng tổng hợp (Materialized View) - Cực nhanh
        query = f"""
            SELECT 
                countMerge(total_count) as total,
                countMergeIf(total_count, result = 2) as errors
            FROM pcb_stats_hourly
            {where_clause}
        """
        res = client.execute(query)
        total = res[0][0] if res else 0
        errors = res[0][1] if res else 0
        
        # Model count vẫn cần query bảng gốc hoặc tạo MV riêng cho model. 
        # Vì model_id có thể trùng lặp qua các giờ, nên count(DISTINCT) cần chính xác.
        # Với 1 tỉ dòng, ta nên dùng uniq() để xấp xỉ hoặc một MV khác.
        models_query = f"SELECT uniq(model_id) FROM pcb_results {where_clause}"
        models = client.execute(models_query)[0][0]
        
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
        # Sử dụng bảng tổng hợp và JOIN trực tiếp với buyer
        query = f"""
            SELECT b.name, countMerge(total_count) as total 
            FROM pcb_stats_hourly l
            INNER JOIN buyer b ON l.buyer_id = b.id
            {where_clause} 
            GROUP BY b.name 
            ORDER BY total DESC
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
        # Sử dụng bảng tổng hợp - Không cần JOIN
        query = f"""
            SELECT 
                CASE WHEN result = 1 THEN 'OK' ELSE 'NG' END as res_text,
                countMerge(total_count) as total
            FROM pcb_stats_hourly
            {where_clause}
            GROUP BY result
        """
        result = client.execute(query)
        return [{"name": row[0], "value": row[1]} for row in result]
    except Exception as e:
        print(f"Error getting by-result: {e}")
        return []

@router.get("/trends")
async def get_production_trends():
    client = get_clickhouse_client()
    if not client: return {"months": [], "weeks": [], "days": []}
    try:
        # 12 Months Trend
        query_months = """
            SELECT toStartOfMonth(hour) as m, countMerge(total_count) as total
            FROM pcb_stats_hourly
            WHERE hour >= addMonths(now(), -12)
            GROUP BY m ORDER BY m
        """
        # 5 Weeks Trend
        query_weeks = """
            SELECT toStartOfWeek(hour) as w, countMerge(total_count) as total
            FROM pcb_stats_hourly
            WHERE hour >= addWeeks(now(), -5)
            GROUP BY w ORDER BY w
        """
        # 7 Days Trend
        query_days = """
            SELECT toDate(hour) as d, countMerge(total_count) as total
            FROM pcb_stats_hourly
            WHERE hour >= addDays(now(), -7)
            GROUP BY d ORDER BY d
        """
        
        res_m = client.execute(query_months)
        res_w = client.execute(query_weeks)
        res_d = client.execute(query_days)
        
        return {
            "months": [{"date": r[0].strftime("%Y-%m"), "value": r[1]} for r in res_m],
            "weeks": [{"date": r[0].strftime("%Y-W%W"), "value": r[1]} for r in res_w],
            "days": [{"date": r[0].strftime("%m-%d"), "value": r[1]} for r in res_d]
        }
    except Exception as e:
        print(f"Error getting trends: {e}")
        return {"months": [], "weeks": [], "days": []}

@router.get("/channel-status")
async def get_channels_status():
    client = get_clickhouse_client()
    if not client: return {"total": 0, "online": 0, "offline": 0}
    try:
        # Lấy tổng số channel từ bảng master data
        total_res = client.execute("SELECT count() FROM channels")
        total = total_res[0][0] if total_res else 0
        
        # Một channel được coi là online nếu có log trong 10 phút qua
        online_query = """
            SELECT count(DISTINCT channel_id) 
            FROM pcb_results 
            WHERE start_time >= subtractMinutes(now(), 10)
        """
        online_res = client.execute(online_query)
        online = online_res[0][0] if online_res else 0
        
        return {
            "total": total,
            "online": online,
            "offline": max(0, total - online)
        }
    except Exception as e:
        print(f"Error getting channel status: {e}")
        return {"total": 0, "online": 0, "offline": 0}
