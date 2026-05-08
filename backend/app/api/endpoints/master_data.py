from fastapi import APIRouter, Query, HTTPException, Request
from typing import Optional, List
from datetime import datetime
from app.db.clickhouse import get_clickhouse_client

router = APIRouter(prefix="/api/master")

from app.models import schemas
from app.db.clickhouse import get_all, upsert_entity, upsert_entities, delete_entity

# Buyer
@router.get("/buyer")
async def list_buyers(): return get_all("buyer")
@router.post("/buyer")
async def add_buyer(request: Request):
    data = await request.json()
    return upsert_entity("buyer", data)
@router.delete("/buyer/{item_id}")
async def remove_buyer(item_id: int): return delete_entity("buyer", item_id)

# Lines
@router.get("/lines")
async def list_lines(): return get_all("lines")
@router.post("/lines")
async def add_line(request: Request):
    data = await request.json()
    return upsert_entity("lines", data)
@router.delete("/lines/{item_id}")
async def remove_line(item_id: int): return delete_entity("lines", item_id)

# Station Types
@router.get("/station_types")
async def list_station_types(): return get_all("station_types")
@router.post("/station_types")
async def add_station_type(request: Request):
    data = await request.json()
    return upsert_entity("station_types", data)
@router.delete("/station_types/{item_id}")
async def remove_station_type(item_id: int): return delete_entity("station_types", item_id)

# Stations
@router.get("/stations")
async def list_stations(): return get_all("stations")
@router.post("/stations")
async def add_station(request: Request):
    data = await request.json()
    return upsert_entity("stations", data)
@router.delete("/stations/{item_id}")
async def remove_station(item_id: int): return delete_entity("stations", item_id)

# Model Groups
@router.get("/model_group")
async def list_model_groups(): return get_all("model_group")
@router.post("/model_group")
async def add_model_group(request: Request):
    data = await request.json()
    return upsert_entity("model_group", data)
@router.delete("/model_group/{item_id}")
async def remove_model_group(item_id: int): return delete_entity("model_group", item_id)

# Models
@router.get("/models")
async def list_models(): return get_all("models")
@router.post("/models")
async def add_model_info(request: Request):
    data = await request.json()
    return upsert_entity("models", data)
@router.delete("/models/{item_id}")
async def remove_model_info(item_id: int): return delete_entity("models", item_id)

# Channels
@router.get("/channels")
async def list_channels(): return get_all("channels")
@router.post("/channels")
async def add_channel(request: Request):
    data = await request.json()
    return upsert_entity("channels", data)
@router.delete("/channels/{item_id}")
async def remove_channel(item_id: int): return delete_entity("channels", item_id)

from pydantic import BaseModel

class HeartbeatRequest(BaseModel):
    mac_address: Optional[str] = None
    channel_id: Optional[int] = None

@router.post("/channels/heartbeat")
async def channel_heartbeat(data: HeartbeatRequest):
    mac_address = data.mac_address
    channel_id = data.channel_id
    
    client = get_clickhouse_client()
    if not client:
        return {"success": False, "error": "Database not connected"}
        
    if not channel_id and mac_address:
        # Resolve channel_id from mac_address
        res = client.execute(f"SELECT id FROM channels FINAL WHERE mac_address = '{mac_address}' LIMIT 1")
        if res:
            channel_id = res[0][0]
            
    if channel_id:
        # Ensure table exists (for development environments that haven't run the updated init script)
        client.execute("""
            CREATE TABLE IF NOT EXISTS channel_heartbeats (
                channel_id UInt32,
                last_heartbeat DateTime DEFAULT now()
            ) ENGINE = ReplacingMergeTree(last_heartbeat) ORDER BY channel_id
        """)
        # Insert heartbeat
        client.execute("INSERT INTO channel_heartbeats (channel_id, last_heartbeat) VALUES", [(channel_id, datetime.now())])
        return {"success": True}
        
    return {"success": False, "error": "Channel not found"}

@router.get("/channels/trace/{mac_address}")
async def trace_channel_by_mac(mac_address: str):
    client = get_clickhouse_client()
    if not client:
        return {"exists": False, "error": "Database not connected"}
    
    query = f"SELECT * FROM channels FINAL WHERE mac_address = '{mac_address}'"
    rows = client.execute(query)
    
    if rows:
        # Lấy tên cột để format thành dict
        columns_info = client.execute("DESCRIBE TABLE channels")
        col_names = [col[0] for col in columns_info]
        channel_data = dict(zip(col_names, rows[0]))
        return {"exists": True, "data": channel_data}
    
    return {"exists": False}

# Device Types
@router.get("/device_types")
async def list_device_types(): return get_all("device_types")
@router.post("/device_types")
async def add_device_type(request: Request):
    data = await request.json()
    return upsert_entity("device_types", data)
@router.delete("/device_types/{item_id}")
async def remove_device_type(item_id: int): return delete_entity("device_types", item_id)

# Devices
@router.get("/devices")
async def list_devices(): return get_all("devices")
@router.post("/devices")
async def add_device(request: Request):
    data = await request.json()
    return upsert_entity("devices", data)
@router.delete("/devices/{item_id}")
async def remove_device(item_id: int): return delete_entity("devices", item_id)

# Bulk Import
@router.post("/{entity}/bulk")
async def add_bulk_master_data(entity: str, items: List[dict]):
    return upsert_entities(entity, items)
