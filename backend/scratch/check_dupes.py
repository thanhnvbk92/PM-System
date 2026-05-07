from clickhouse_driver import Client
import json

client = Client(host='192.168.100.10')
pid = '605HS0C6364'
query = f"SELECT pid, start_time, result, channel_id, id FROM pcb_results WHERE pid = '{pid}' ORDER BY start_time DESC LIMIT 20"
rows = client.execute(query)

print(f"Total records found for {pid}: {len(rows)}")
for r in rows:
    print(r)
