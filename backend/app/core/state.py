from datetime import datetime
from typing import Dict

# Dictionary lưu trữ mốc thời gian heartbeat cuối cùng của từng channel_id
# Key: channel_id (int), Value: timestamp (datetime)
last_heartbeats: Dict[int, datetime] = {}

def update_heartbeat(channel_id: int):
    """Cập nhật mốc thời gian mới nhất cho channel"""
    last_heartbeats[channel_id] = datetime.now()

def get_active_channels(timeout_seconds: int = 30) -> list:
    """Lấy danh sách các channel ID đang online (có ping trong vòng timeout)"""
    now = datetime.now()
    active_ids = []
    for cid, last_ping in last_heartbeats.items():
        if (now - last_ping).total_seconds() <= timeout_seconds:
            active_ids.append(cid)
    return active_ids
