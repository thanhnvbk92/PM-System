import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.clickhouse import get_clickhouse_client

def cleanup_ng_pcbs():
    client = get_clickhouse_client()
    if not client:
        print("Could not connect to ClickHouse")
        return

    try:
        print("Submitting deletion for pcb_results where result is 'NG [GMES] STEP_CHECK'...")
        # Note: Mutations in ClickHouse are asynchronous
        client.execute("ALTER TABLE test_steps DELETE WHERE pcb_result_id IN (SELECT id FROM pcb_results WHERE result = 'NG [GMES] STEP_CHECK')")
        client.execute("ALTER TABLE pcb_results DELETE WHERE result = 'NG [GMES] STEP_CHECK'")
        print("Deletion commands submitted successfully.")
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    cleanup_ng_pcbs()
