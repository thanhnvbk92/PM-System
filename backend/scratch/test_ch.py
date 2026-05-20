import sys
import os
import threading
import time

# Thêm thư mục backend vào sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from clickhouse_driver import Client
from app.core import config

_local_storage = threading.local()

def get_thread_client():
    if not hasattr(_local_storage, 'client') or _local_storage.client is None:
        _local_storage.client = Client(config.CLICKHOUSE_HOST, port=config.CLICKHOUSE_PORT)
    return _local_storage.client

def run_query(thread_id):
    try:
        print(f"Thread-{thread_id} starting...")
        client = get_thread_client()
        # Chạy query nhiều lần để mô phỏng concurrency
        for i in range(5):
            res = client.execute("SELECT 1")
            print(f"Thread-{thread_id} execution {i+1} success: {res}")
            time.sleep(0.1)
        print(f"✅ Thread-{thread_id} finished successfully!")
    except Exception as e:
        print(f"❌ Thread-{thread_id} failed: {e}")

# Tạo 5 thread chạy đồng thời
threads = []
for i in range(5):
    t = threading.Thread(target=run_query, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print("All threads completed!")
