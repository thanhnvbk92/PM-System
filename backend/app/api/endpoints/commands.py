from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import httpx
from app.db.clickhouse import get_clickhouse_client
from app.core import config
import os

router = APIRouter(prefix="/api/commands")

# --- Models for UI Requests ---

class SearchParams(BaseModel):
    root_folder: str
    pattern: str = "*"
    include_subfolders: bool = True
    type: str = "both" # file|folder|both
    max_results: int = 100

class ExportParams(BaseModel):
    root_folder: str
    pattern: str
    include_subfolders: bool = True
    type: str = "file"

class PullParams(BaseModel):
    source_url: str
    destination_folder: str
    file_name: Optional[str] = None
    overwrite: bool = True

class PushParams(BaseModel):
    source_path: str
    destination_url: str
    pattern: str = "*"
    include_subfolders: bool = True

class UpdateParams(BaseModel):
    force: bool = False
    update_xml_path: Optional[str] = None

class ModelChangeParams(BaseModel):
    model_name: str

# --- Helper Logic ---

async def get_agent_base_url(channel_id: int):
    client = get_clickhouse_client()
    # Lấy IP từ bảng channels
    res = client.execute(f"SELECT ip_address FROM channels WHERE id = {channel_id} LIMIT 1")
    if not res or not res[0][0]:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy IP cho channel {channel_id}")
    
    ip = res[0][0]
    return f"http://{ip}:8100"

def get_auth_headers():
    token = os.getenv("AGENT_COMMAND_TOKEN", "your_secure_token_here")
    return {"X-Command-Token": token}

# --- Router Endpoints ---

@router.get("/{channel_id}/health")
async def agent_health(channel_id: int):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{base_url}/health", headers=get_auth_headers())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent unreachable: {str(e)}")

@router.post("/{channel_id}/files/search")
async def agent_file_search(channel_id: int, params: SearchParams):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{base_url}/files/search", headers=get_auth_headers(), json=params.dict())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {str(e)}")

@router.post("/{channel_id}/files/export")
async def agent_file_export(channel_id: int, params: ExportParams):
    base_url = await get_agent_base_url(channel_id)
    # Vì export có thể trả về file lớn, ta dùng streaming
    auth = get_auth_headers()
    
    async def stream_generator():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{base_url}/files/export", headers=auth, json=params.dict()) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail="Agent failed to export file")
                async for chunk in response.aiter_bytes():
                    yield chunk

    return StreamingResponse(stream_generator(), media_type="application/octet-stream")

@router.post("/{channel_id}/files/pull")
async def agent_file_pull(channel_id: int, params: PullParams):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{base_url}/files/pull", headers=get_auth_headers(), json=params.dict())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {str(e)}")

@router.post("/{channel_id}/files/push")
async def agent_file_push(channel_id: int, params: PushParams):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{base_url}/files/push", headers=get_auth_headers(), json=params.dict())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {str(e)}")

@router.post("/{channel_id}/update")
async def agent_update(channel_id: int, params: UpdateParams):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{base_url}/update", headers=get_auth_headers(), json=params.dict())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {str(e)}")

@router.post("/{channel_id}/model/change")
async def agent_model_change(channel_id: int, params: ModelChangeParams):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.post(f"{base_url}/model/change", headers=get_auth_headers(), json=params.dict())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {str(e)}")

@router.get("/{channel_id}/jobs/{job_id}")
async def agent_job_status(channel_id: int, job_id: str):
    base_url = await get_agent_base_url(channel_id)
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{base_url}/jobs/{job_id}", headers=get_auth_headers())
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent unreachable: {str(e)}")
