from clickhouse_driver import Client
from datetime import datetime, timedelta
import uuid
import random

# Cấu hình ClickHouse
HOST = '192.168.100.10'
PORT = 9000

def seed_data():
    try:
        client = Client(HOST, port=PORT)
        client.execute("SELECT 1")
    except:
        client = Client('localhost', port=PORT)

    print("Cleaning old data...")
    client.execute("TRUNCATE TABLE pcb_results")

    print("Seeding valid data...")
    
    # Lấy IDs thực tế
    try:
        channel_ids = [r[0] for r in client.execute("SELECT id FROM channels")]
        model_ids = [r[0] for r in client.execute("SELECT id FROM models")]
        if not channel_ids or not model_ids:
            print("Master data empty. Please seed master data first.")
            return
    except Exception as e:
        print(f"Error fetching IDs: {e}")
        return

    logs_data = []
    now = datetime.now()
    
    for i in range(100):
        pcb_id = uuid.uuid4()
        offset = random.randint(0, 1440) # Last 24 hours
        start_time = now - timedelta(minutes=offset)
        end_time = start_time + timedelta(seconds=random.randint(20, 60))
        result = random.choice(['OK', 'OK', 'NG', 'OK']) # 75% OK
        
        logs_data.append([
            pcb_id,
            random.choice(channel_ids),
            random.choice(model_ids),
            f"PID-LATEST-{random.randint(1000, 9999)}",
            "FID-001",
            "PART-ABC",
            start_time,
            end_time,
            (end_time - start_time).total_seconds(),
            result,
            "/mock/path.xml",
            "sample_job.xml"
        ])

    client.execute(
        "INSERT INTO pcb_results (id, channel_id, model_id, pid, fid, pcba_partno, start_time, end_time, test_time, result, file_path, jobfile) VALUES",
        logs_data
    )
    print(f"Success: {len(logs_data)} valid records seeded.")

if __name__ == "__main__":
    seed_data()
