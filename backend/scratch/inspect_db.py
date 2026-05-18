from clickhouse_driver import Client
import os
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv('d:/1. Project/PM System/backend/.env')

host = os.getenv("CLICKHOUSE_HOST", "localhost")
port = int(os.getenv("CLICKHOUSE_PORT", 9000))

print(f"Connecting to {host}:{port}...")
client = Client(host, port=port)

tables = client.execute("SHOW TABLES")
print("Tables:", tables)

for table in tables:
    table_name = table[0]
    print(f"\nSchema for {table_name}:")
    schema = client.execute(f"DESCRIBE TABLE {table_name}")
    for col in schema:
        print(f"  {col[0]}: {col[1]}")
