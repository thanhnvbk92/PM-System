from clickhouse_driver import Client
client = Client(host='192.168.100.10')

tables = ['pcb_results', 'test_steps', 'pcb_stats_hourly']

print("Starting TRUNCATE operations...")
for table in tables:
    try:
        client.execute(f"TRUNCATE TABLE {table}")
        print(f"Successfully truncated: {table}")
    except Exception as e:
        print(f"Error truncating {table}: {e}")

print("Operations completed.")
