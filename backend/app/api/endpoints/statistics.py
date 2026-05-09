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
            SELECT 
                toStartOfMonth(hour) as m, 
                countMerge(total_count) as total,
                countMergeIf(total_count, result = 2) as errors
            FROM pcb_stats_hourly
            WHERE hour >= addMonths(now(), -12)
            GROUP BY m ORDER BY m
        """
        
        res_m = client.execute(query_months)
        
        # Calculate ratio: (total - errors) / total * 100
        months_data = []
        for r in res_m:
            date_str = r[0].strftime("%Y-%m")
            total = r[1]
            errors = r[2]
            ratio = round(((total - errors) / total) * 100, 2) if total > 0 else 100
            months_data.append({"date": date_str, "ratio": ratio, "total": total})
            
        return {
            "months": months_data,
            "weeks": [],
            "days": []
        }
    except Exception as e:
        print(f"Error getting trends: {e}")
        return {"months": [], "weeks": [], "days": []}

@router.get("/channel-status")
async def get_channels_status():
    client = get_clickhouse_client()
    if not client: return {"total": 0, "online": 0, "offline": 0}
    try:
        total_res = client.execute("SELECT count() FROM channels")
        total = total_res[0][0] if total_res else 0
        
        # Đảm bảo bảng tồn tại
        client.execute("""
            CREATE TABLE IF NOT EXISTS channel_heartbeats (
                channel_id UInt32,
                last_heartbeat DateTime DEFAULT now()
            ) ENGINE = ReplacingMergeTree(last_heartbeat) ORDER BY channel_id
        """)
        
        online_query = """
            SELECT count(DISTINCT channel_id) 
            FROM (
                SELECT channel_id FROM pcb_results WHERE start_time >= subtractMinutes(now(), 10)
                UNION ALL
                SELECT channel_id FROM channel_heartbeats FINAL WHERE last_heartbeat >= subtractMinutes(now(), 10)
            )
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

@router.get("/active-channel-ids")
async def get_active_channel_ids():
    """Lấy danh sách ID của các channel đang có log gửi về trong 10 phút qua hoặc có heartbeat"""
    client = get_clickhouse_client()
    if not client: return []
    try:
        # Đảm bảo bảng tồn tại
        client.execute("""
            CREATE TABLE IF NOT EXISTS channel_heartbeats (
                channel_id UInt32,
                last_heartbeat DateTime DEFAULT now()
            ) ENGINE = ReplacingMergeTree(last_heartbeat) ORDER BY channel_id
        """)
        
        query = """
            SELECT DISTINCT channel_id 
            FROM (
                SELECT channel_id FROM pcb_results WHERE start_time >= subtractMinutes(now(), 10)
                UNION ALL
                SELECT channel_id FROM channel_heartbeats FINAL WHERE last_heartbeat >= subtractMinutes(now(), 10)
            )
        """
        result = client.execute(query)
        return [row[0] for row in result]
    except Exception as e:
        print(f"Error getting active channel IDs: {e}")
        return []

@router.get("/dashboard")
async def get_analytics_dashboard(
    timeframe: str = Query("7d"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    line: str = Query(None),
    station: str = Query(None),
    channel: str = Query(None),
    step_name: str = Query(None)
):
    client = get_clickhouse_client()
    if not client: return {}

    try:
        # Time parsing
        if start_date and end_date:
            start_date = start_date.replace("'", "")
            end_date = end_date.replace("'", "")
            date_filter = f"r.start_time >= '{start_date} 00:00:00' AND r.start_time <= '{end_date} 23:59:59'"
            date_func = "toStartOfDay(r.start_time)"
            format_str = "%Y-%m-%d"
        elif timeframe == "7d":
            date_filter = "r.start_time >= subtractDays(toStartOfDay(now()), 6)"
            date_func = "toStartOfDay(r.start_time)"
            format_str = "%Y-%m-%d"
        elif timeframe == "5w":
            date_filter = "r.start_time >= subtractWeeks(toStartOfWeek(now(), 1), 4)"
            date_func = "toStartOfWeek(r.start_time, 1)"
            format_str = "%Y-W%W"
        else: # 12m
            date_filter = "r.start_time >= subtractMonths(toStartOfMonth(now()), 11)"
            date_func = "toStartOfMonth(r.start_time)"
            format_str = "%Y-%m"

        filter_conds = [date_filter]

        if line:
            filter_conds.append(f"l.name = '{line.replace(chr(39), '')}'")
        if station:
            filter_conds.append(f"st.name = '{station.replace(chr(39), '')}'")
        if channel:
            filter_conds.append(f"c.name = '{channel.replace(chr(39), '')}'")
        
        base_where = " AND ".join(filter_conds)
        
        # SQL structure parts
        base_from_joins = """
            FROM pcb_results r
            JOIN channels c ON r.channel_id = c.id
            JOIN stations st ON c.station_id = st.id
            JOIN lines l ON st.line_id = l.id
        """

        # Step filtering logic for aggregation
        if step_name:
            # Join with specific error only to count it as numerator
            step_join = f"LEFT JOIN test_steps ts_agg ON r.id = ts_agg.pcb_result_id AND ts_agg.step_name = '{step_name.replace(chr(39), '')}' AND ts_agg.result = 2"
            error_count_expr = "countIf(notEmpty(ts_agg.step_name))"
        else:
            step_join = ""
            error_count_expr = "countIf(r.result = 2)"

        q_trend = f"""
            SELECT {date_func} as time_label, 
                   {error_count_expr} as errors,
                   count() as total,
                   if(total > 0, round(errors * 100 / total, 2), 0) as rate
            {base_from_joins}
            {step_join}
            WHERE {base_where}
            GROUP BY time_label
            ORDER BY time_label
        """

        q_line = f"""
            SELECT if(empty(l.name), 'Unknown', l.name) as name, 
                   {error_count_expr} as errors,
                   count() as total,
                   if(total > 0, round(errors * 100 / total, 2), 0) as rate
            {base_from_joins}
            {step_join}
            WHERE {base_where}
            GROUP BY name
            ORDER BY errors DESC
        """

        q_station = f"""
            SELECT if(empty(st.name), 'Unknown', st.name) as name, 
                   {error_count_expr} as errors,
                   count() as total,
                   if(total > 0, round(errors * 100 / total, 2), 0) as rate
            {base_from_joins}
            {step_join}
            WHERE {base_where}
            GROUP BY name
            ORDER BY rate DESC
            LIMIT 10
        """

        q_channel = f"""
            SELECT if(empty(c.name), 'Unknown', c.name) as name, 
                   {error_count_expr} as errors,
                   count() as total,
                   if(total > 0, round(errors * 100 / total, 2), 0) as rate
            {base_from_joins}
            {step_join}
            WHERE {base_where}
            GROUP BY name
            ORDER BY rate DESC
            LIMIT 10
        """

        q_errors = f"""
            SELECT ts_out.step_name as name, count() as errors
            FROM test_steps ts_out
            INNER JOIN (
                SELECT r.id as pcb_result_id
                FROM pcb_results r
                JOIN channels c ON r.channel_id = c.id
                JOIN stations st ON c.station_id = st.id
                JOIN lines l ON st.line_id = l.id
                WHERE {base_where} AND r.result = 2
            ) filtered_r USING (pcb_result_id)
            WHERE ts_out.result = 2 AND notEmpty(ts_out.step_name)
            GROUP BY name
            ORDER BY errors DESC
            LIMIT 10
        """

        res_trend = client.execute(q_trend)
        res_line = client.execute(q_line)
        res_station = client.execute(q_station)
        res_channel = client.execute(q_channel)
        res_errors = client.execute(q_errors)

        trend_time_labels = []
        trend_series_data = []
        trend_rate_data = []
        for row in res_trend:
            t_label = row[0].strftime(format_str) if hasattr(row[0], 'strftime') else str(row[0])
            trend_time_labels.append(t_label)
            trend_series_data.append(row[1])
            trend_rate_data.append(row[3]) # Index 3 is rate
            
        top_errors_data = [{"name": r[0], "value": r[1]} for r in res_errors]
        top_errors_data.reverse()
        
        return {
            "trend": {
                "time_labels": trend_time_labels,
                "series": [{"name": "NG Count", "type": "line", "smooth": True, "data": trend_series_data, "rates": trend_rate_data}]
            },
            "by_line": [{"name": r[0], "value": r[1], "rate": r[3]} for r in res_line],
            "by_station": [{"name": r[0], "value": r[1], "rate": r[3]} for r in res_station],
            "by_channel": [{"name": r[0], "value": r[1], "rate": r[3]} for r in res_channel],
            "top_errors": top_errors_data
        }
    except Exception as e:
        print(f"Error getting dashboard data: {e}")
        return {}
