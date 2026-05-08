import re

with open("app/api/endpoints/statistics.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find where get_trend_analysis starts
match_start = re.search(r'@router\.get\("/trend-analysis"\)', content)
start_idx = match_start.start()

new_endpoint = """@router.get("/dashboard")
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

        filter_conds = [date_filter, "r.result = 2"]

        if line:
            filter_conds.append(f"l.name = '{line.replace('\'', '')}'")
        if station:
            filter_conds.append(f"st.name = '{station.replace('\'', '')}'")
        if channel:
            filter_conds.append(f"c.name = '{channel.replace('\'', '')}'")
        
        base_where = " AND ".join(filter_conds)
        
        if step_name:
            step_join = f"JOIN test_steps ts_filter ON r.id = ts_filter.pcb_result_id"
            step_where = f" AND ts_filter.step_name = '{step_name.replace('\'', '')}' AND ts_filter.result = 2"
        else:
            step_join = ""
            step_where = ""

        base_query = f\"\"\"
            FROM pcb_results r
            JOIN channels c ON r.channel_id = c.id
            JOIN stations st ON c.station_id = st.id
            JOIN lines l ON st.line_id = l.id
            {step_join}
            WHERE {base_where} {step_where}
        \"\"\"

        q_trend = f\"\"\"
            SELECT {date_func} as time_label, count() as errors
            {base_query}
            GROUP BY time_label
            ORDER BY time_label
        \"\"\"

        q_line = f\"\"\"
            SELECT if(empty(l.name), 'Unknown', l.name) as name, count() as errors
            {base_query}
            GROUP BY name
            ORDER BY errors DESC
        \"\"\"

        q_station = f\"\"\"
            SELECT if(empty(st.name), 'Unknown', st.name) as name, count() as errors
            {base_query}
            GROUP BY name
            ORDER BY errors DESC
            LIMIT 20
        \"\"\"

        q_channel = f\"\"\"
            SELECT if(empty(c.name), 'Unknown', c.name) as name, count() as errors
            {base_query}
            GROUP BY name
            ORDER BY errors DESC
            LIMIT 20
        \"\"\"

        q_errors = f\"\"\"
            SELECT ts_out.step_name as name, count() as errors
            FROM test_steps ts_out
            INNER JOIN (
                SELECT r.id
                FROM pcb_results r
                JOIN channels c ON r.channel_id = c.id
                JOIN stations st ON c.station_id = st.id
                JOIN lines l ON st.line_id = l.id
                WHERE {base_where}
            ) filtered_r ON ts_out.pcb_result_id = filtered_r.id
            WHERE ts_out.result = 2 AND notEmpty(ts_out.step_name)
            GROUP BY name
            ORDER BY errors DESC
            LIMIT 10
        \"\"\"

        res_trend = client.execute(q_trend)
        res_line = client.execute(q_line)
        res_station = client.execute(q_station)
        res_channel = client.execute(q_channel)
        res_errors = client.execute(q_errors)

        trend_time_labels = []
        trend_series_data = []
        for row in res_trend:
            t_label = row[0].strftime(format_str) if hasattr(row[0], 'strftime') else str(row[0])
            trend_time_labels.append(t_label)
            trend_series_data.append(row[1])
            
        top_errors_data = [{"name": r[0], "value": r[1]} for r in res_errors]
        top_errors_data.reverse()
        
        return {
            "trend": {
                "time_labels": trend_time_labels,
                "series": [{"name": "NG Count", "type": "line", "smooth": True, "data": trend_series_data}]
            },
            "by_line": [{"name": r[0], "value": r[1]} for r in res_line],
            "by_station": [{"name": r[0], "value": r[1]} for r in res_station],
            "by_channel": [{"name": r[0], "value": r[1]} for r in res_channel],
            "top_errors": top_errors_data
        }
    except Exception as e:
        print(f"Error getting dashboard data: {e}")
        return {}
"""

new_content = content[:start_idx] + new_endpoint

with open("app/api/endpoints/statistics.py", "w", encoding="utf-8") as f:
    f.write(new_content)
