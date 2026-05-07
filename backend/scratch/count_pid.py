from clickhouse_driver import Client
client = Client(host='192.168.100.10')
pid = '605HS0C6364'
count = client.execute(f"SELECT count() FROM pcb_results WHERE pid = '{pid}'")[0][0]
print(f"Current total for {pid}: {count}")
