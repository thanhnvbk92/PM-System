import os
from clickhouse_driver import Client

def verify_connection():
    host = os.getenv("CLICKHOUSE_HOST", "localhost")
    port = int(os.getenv("CLICKHOUSE_PORT", 9000))
    
    print(f"--- Checking connection to ClickHouse ({host}:{port}) ---")
    
    try:
        client = Client(host, port=port)
        # 1. Basic connection check
        result = client.execute("SELECT now()")
        print(f"OK: Connected! Server time: {result[0][0]}")
        
        # 2. Check table list
        tables = client.execute("SHOW TABLES")
        print(f"OK: Tables count ({len(tables)}):")
        for t in tables:
            print(f"  - {t[0]}")
            
        # 3. Check sample data (Table buyer)
        buyer_count = client.execute("SELECT count() FROM buyer")
        print(f"OK: Number of records in 'buyer' table: {buyer_count[0][0]}")
        
        if buyer_count[0][0] > 0:
            print("OK: Seed Data verified.")
        else:
            print("WARN: 'buyer' table is empty. You may need to run seed_data.sql.")
            
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check if Docker is running on VM (`docker ps`).")
        print("2. Check VM firewall (Ubuntu): run `sudo ufw allow 9000` and `sudo ufw allow 8123`.")
        print(f"3. Ensure you can ping {host} from this machine.")

if __name__ == "__main__":
    verify_connection()
