import os
import sys
from clickhouse_driver import Client

# Add current directory to path to import app
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
        print("Truncating pcb_stats_hourly...")
        client.execute("TRUNCATE TABLE pcb_stats_hourly")
        
        print("Re-populating pcb_stats_hourly from pcb_results...")
        populate_query = """
            INSERT INTO pcb_stats_hourly
            SELECT
                toStartOfHour(start_time) AS hour,
                buyer_id,
                line_id,
                station_id,
                channel_id,
                result,
                countState(toUInt8(1)) AS total_count,
                sumState(assumeNotNull(test_time)) AS total_test_time
            FROM pcb_results
            GROUP BY
                hour,
                buyer_id,
                line_id,
                station_id,
                channel_id,
                result
        """
        client.execute(populate_query)
        print("pcb_stats_hourly has been refreshed successfully.")
        
    except Exception as e:
        print(f"Error during stats refresh: {e}")

if __name__ == "__main__":
    refresh_stats()
