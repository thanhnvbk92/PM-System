from clickhouse_driver import Client
from fastapi import HTTPException
from app.core import config
from typing import List, Optional

def get_clickhouse_client():
    try:
        client = Client(config.CLICKHOUSE_HOST, port=config.CLICKHOUSE_PORT)
        client.execute("SELECT 1")
        return client
    except Exception as e:
        print(f"FAILED to connect to ClickHouse at {config.CLICKHOUSE_HOST}:{config.CLICKHOUSE_PORT}: {e}")
        return None

def get_all(table_name: str):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        columns_info = client.execute(f"DESCRIBE TABLE {table_name}")
        col_names = [col[0] for col in columns_info]
        # Lấy data - dùng FINAL để lấy bản ghi mới nhất (tránh trùng ID do ReplacingMergeTree)
        rows = client.execute(f"SELECT * FROM {table_name} FINAL")
        return [dict(zip(col_names, row)) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_next_id(table_name: str):
    client = get_clickhouse_client()
    if not client: return 1
    try:
        # Lấy max id hiện tại, nếu ko có thì bắt đầu từ 1
        res = client.execute(f"SELECT max(id) FROM {table_name}")
        max_id = res[0][0] if res and res[0][0] is not None else 0
        return max_id + 1
    except:
        return 1

def upsert_entity(table_name: str, data: dict):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        # Lấy danh sách cột thực tế của bảng để lọc dữ liệu đầu vào
        columns_info = client.execute(f"DESCRIBE TABLE {table_name}")
        valid_columns = [col[0] for col in columns_info]
        
        # Chỉ giữ lại các trường có tồn tại trong bảng
        filtered_data = {k: v for k, v in data.items() if k in valid_columns}
        
        # Logic kiểm tra trùng cho Channel: (Tên + Station) HOẶC (MAC)
        if table_name == "channels":
            name_val = filtered_data.get("name")
            mac_val = filtered_data.get("mac_address")
            station_id = filtered_data.get("station_id")
            item_id = filtered_data.get("id") if filtered_data.get("id") is not None else 0
            
            # 1. Kiểm tra trùng Tên + Station
            if name_val and station_id:
                check_query = f"SELECT id, name FROM channels FINAL WHERE name = '{name_val}' AND station_id = {station_id} AND id != {item_id} LIMIT 1"
                existing = client.execute(check_query)
                if existing:
                    ex_id, ex_name = existing[0]
                    raise HTTPException(status_code=400, detail=f"Trùng tên: '{name_val}' đã tồn tại ở trạm này (Channel ID: {ex_id}).")
            
            # 2. Kiểm tra trùng MAC (toàn hệ thống)
            if mac_val:
                check_query = f"SELECT id, name FROM channels FINAL WHERE mac_address = '{mac_val}' AND id != {item_id} LIMIT 1"
                existing = client.execute(check_query)
                if existing:
                    ex_id, ex_name = existing[0]
                    raise HTTPException(status_code=400, detail=f"Trùng MAC: '{mac_val}' đang được dùng bởi Kênh '{ex_name}' (ID: {ex_id}).")
        
        # Logic kiểm tra trùng cho các bảng khác
        elif "name" in filtered_data:
            name_val = filtered_data["name"]
            item_id = filtered_data.get("id") if filtered_data.get("id") is not None else 0
            where_clauses = [f"name = '{name_val}'", f"id != {item_id}"]
            parents = ["channel_id", "line_id", "model_group_id", "buyer_id", "station_type_id", "device_type_id"]
            for p in parents:
                if p in filtered_data and filtered_data[p] is not None:
                    where_clauses.append(f"{p} = {filtered_data[p]}")
                    break
            
            check_query = f"SELECT id FROM {table_name} FINAL WHERE {' AND '.join(where_clauses)} LIMIT 1"
            existing = client.execute(check_query)
            if existing:
                raise HTTPException(status_code=400, detail=f"Tên '{name_val}' đã tồn tại (ID: {existing[0][0]}).")

        if not filtered_data.get("id"):
            filtered_data["id"] = get_next_id(table_name)
        
        keys = ", ".join(filtered_data.keys())
        values = list(filtered_data.values())
        client.execute(f"INSERT INTO {table_name} ({keys}) VALUES", [values])
        return {"status": "success", "message": "Item saved", "id": filtered_data["id"]}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

def upsert_entities(table_name: str, items: List[dict]):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connecteld")
    try:
        # Lấy danh sách cột thực tế để lọc
        columns_info = client.execute(f"DESCRIBE TABLE {table_name}")
        valid_columns = [col[0] for col in columns_info]
        
        results = []
        for data in items:
            # Chỉ giữ lại các trường có tồn tại trong bảng
            filtered_item = {k: v for k, v in data.items() if k in valid_columns}
            if not filtered_item: continue

            # Logic kiểm tra trùng cho Channel
            if table_name == "channels":
                name_val = filtered_item.get("name")
                mac_val = filtered_item.get("mac_address")
                station_id = filtered_item.get("station_id")
                item_id = filtered_item.get("id") if filtered_item.get("id") is not None else 0

                check_query = f"""
                    SELECT id FROM channels FINAL 
                    WHERE ((name = '{name_val}' AND station_id = {station_id}) OR (mac_address = '{mac_val}'))
                    AND id != {item_id} LIMIT 1
                """
                if client.execute(check_query):
                    continue
            
            # Logic kiểm tra trùng cho các bảng khác
            elif "name" in filtered_item:
                name_val = filtered_item["name"]
                item_id = filtered_item.get("id") if filtered_item.get("id") is not None else 0
                where_clauses = [f"name = '{name_val}'", f"id != {item_id}"]
                parents = ["channel_id", "line_id", "model_group_id", "buyer_id", "station_type_id", "device_type_id"]
                for p in parents:
                    if p in filtered_item and filtered_item[p] is not None:
                        where_clauses.append(f"{p} = {filtered_item[p]}")
                        break
                
                if client.execute(f"SELECT id FROM {table_name} FINAL WHERE {' AND '.join(where_clauses)} LIMIT 1"):
                    continue

            if not filtered_item.get("id"):
                filtered_item["id"] = get_next_id(table_name)
            
            keys = ", ".join(filtered_item.keys())
            values = list(filtered_item.values())
            client.execute(f"INSERT INTO {table_name} ({keys}) VALUES", [values])
            results.append(filtered_item["id"])
        
        return {"status": "success", "count": len(results), "ids": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def delete_entity(table_name: str, item_id: int):
    client = get_clickhouse_client()
    if not client:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        client.execute(f"ALTER TABLE {table_name} DELETE WHERE id = {item_id}")
        return {"status": "success", "message": "Delete command submitted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
