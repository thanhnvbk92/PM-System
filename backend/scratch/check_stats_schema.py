import os
import sys
from clickhouse_driver import Client

# Add backend to path to import config
sys.path.append(os.getcwd())
try:
    from app.core import config
except ImportError:
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    from app.core import config

def refresh_stats():
    print(f"Connecting to ClickHouse at {config.CLICKHOUSE_HOST}:{config.CLICKHOUSE_PORT}...")
    client = Client(config.CLICKHOUSE_HOST, port=config.CLICKHOUSE_PORT)
    
    try:
        # Get schema of pcb_stats_hourly
        print("Getting schema of pcb_stats_hourly...")
        res = client.execute("SHOW CREATE TABLE pcb_stats_hourly")
        print(res[0][0])
        
        # Usually, pcb_stats_hourly is an AggregatingMergeTree or SummingMergeTree
        # populated by a Materialized View.
        
        # Let's find the Materialized View
        print("Finding Materialized Views...")
        mv_res = client.execute("SELECT name FROM system.tables WHERE engine = 'MaterializedView'")
        print(f"Found MVs: {mv_res}")
        
        # To refresh:
        # 1. Truncate the target table
        print("Truncating pcb_stats_hourly...")
        client.execute("TRUNCATE TABLE pcb_stats_hourly")
        
        # 2. Re-populate from pcb_results
        # We need to know the mapping. Based on statistics.py:
        # total_count, result, hour, buyer_id, line_id, station_id
        
        # Let's check columns
        cols = client.execute("DESCRIBE TABLE pcb_stats_hourly")
        col_names = [c[0] for c in cols]
        print(f"Columns in pcb_stats_hourly: {col_names}")
        
        # Populate query (Inferring from usage in statistics.py)
        # We use countState and countIfState for AggregatingMergeTree
        
        populate_query = """
            INSERT INTO pcb_stats_hourly
            SELECT 
                toStartOfHour(start_time) as hour,
                buyer_id,
                line_id,
                station_id,
                if(result = 'OK', 1, 2) as result_code,
                countState() as total_count
            FROM pcb_results
            GROUP BY hour, buyer_id, line_id, station_id, result_code
        """
        
        # Note: result_code mapping might be different. 
        # In statistics.py: result = 2 is NG.
        
        # Let's see if we can find the MV definition to be sure.
        for mv_name in [r[0] for r in mv_res]:
            mv_create = client.execute(f"SHOW CREATE TABLE {mv_name}")[0][0]
            if "pcb_stats_hourly" in mv_create:
                print(f"Found relevant MV: {mv_name}")
                print(mv_create)
                # We can extract the SELECT part of the MV
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    refresh_stats()
