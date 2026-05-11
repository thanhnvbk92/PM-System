import os
import sys
from clickhouse_driver import Client

# Add current directory to path to import app
sys.path.append(os.getcwd())
try:
    from app.core import config
except ImportError:
    # Try alternate path if running from different location
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    from app.core import config

def cleanup_gmes_errors():
    print(f"Connecting to ClickHouse at {config.CLICKHOUSE_HOST}:{config.CLICKHOUSE_PORT}...")
    client = Client(config.CLICKHOUSE_HOST, port=config.CLICKHOUSE_PORT)
    
    try:
        # 1. Identify PCB IDs to delete
        # We find PCBs that have at least one step '[GMES] STEP_CHECK' with result '2' (NG)
        # OR PCBs where the final result is 'NG [GMES] STEP_CHECK'
        
        find_query = """
            SELECT DISTINCT pcb_result_id 
            FROM test_steps 
            WHERE step_name = '[GMES] STEP_CHECK' AND result = '2'
        """
        bad_pcb_ids_from_steps = client.execute(find_query)
        bad_ids = [str(r[0]) for r in bad_pcb_ids_from_steps]
        
        # Also find from pcb_results directly
        find_pcb_query = "SELECT id FROM pcb_results WHERE result = 'NG [GMES] STEP_CHECK'"
        bad_pcb_ids_from_results = client.execute(find_pcb_query)
        for r in bad_pcb_ids_from_results:
            if str(r[0]) not in bad_ids:
                bad_ids.append(str(r[0]))
        
        if not bad_ids:
            print("No matching records found to delete.")
            return

        print(f"Found {len(bad_ids)} PCBs to delete.")
        
        # ClickHouse DELETE is done via ALTER TABLE ... DELETE
        # We need to be careful with large lists in IN clause, but for a few thousands it's fine.
        
        batch_size = 1000
        for i in range(0, len(bad_ids), batch_size):
            batch = bad_ids[i:i+batch_size]
            ids_str = ", ".join([f"'{id}'" for id in batch])
            
            print(f"Deleting batch {i//batch_size + 1} ({len(batch)} records)...")
            
            # Delete from test_steps
            client.execute(f"ALTER TABLE test_steps DELETE WHERE pcb_result_id IN ({ids_str})")
            
            # Delete from pcb_results
            client.execute(f"ALTER TABLE pcb_results DELETE WHERE id IN ({ids_str})")

        print("Cleanup command submitted to ClickHouse.")
        print("Note: ALTER TABLE DELETE is asynchronous in ClickHouse. It may take some time to reflect in queries.")
        
        # Verify if any specific '[GMES] STEP_CHECK' steps remain in test_steps regardless of PCB result
        # Just in case some steps exist without matching the above criteria but we want them gone anyway
        print("Cleaning up any remaining [GMES] STEP_CHECK steps...")
        client.execute("ALTER TABLE test_steps DELETE WHERE step_name = '[GMES] STEP_CHECK'")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    cleanup_gmes_errors()
