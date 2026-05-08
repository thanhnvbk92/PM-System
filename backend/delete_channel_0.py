import sys
import os
sys.path.append(r'd:\1. Project\PM System\backend')
from app.db.clickhouse import get_clickhouse_client

def cleanup():
    client = get_clickhouse_client()
    if not client:
        print('Could not connect to DB')
        return
    
    print('Fetching records with channel_id = 0...')
    query = 'SELECT id FROM pcb_results WHERE channel_id = 0'
    results = client.execute(query)
    
    to_delete = [row[0] for row in results]
    
    if not to_delete:
        print('No records found with channel_id = 0.')
        return
        
    print(f'Found {len(to_delete)} records. Deleting...')
    
    batch_size = 1000
    for i in range(0, len(to_delete), batch_size):
        batch = to_delete[i:i+batch_size]
        ids_str = ','.join([f"'{x}'" for x in batch])
        client.execute(f"ALTER TABLE test_steps DELETE WHERE pcb_result_id IN ({ids_str})")
        print(f'Deleted batch {i//batch_size + 1} from test_steps')
        
    client.execute("ALTER TABLE pcb_results DELETE WHERE channel_id = 0")
    print('Deleted from pcb_results')
    
    print('Cleanup complete!')

if __name__ == '__main__':
    cleanup()
