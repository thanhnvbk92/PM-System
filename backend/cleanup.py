import sys
import os
sys.path.append(r'd:\1. Project\PM System\backend')
from app.db.clickhouse import get_clickhouse_client

def cleanup():
    client = get_clickhouse_client()
    if not client:
        print('Could not connect to DB')
        return
    
    print('Fetching records...')
    query = 'SELECT id, pid, channel_id, start_time FROM pcb_results ORDER BY created_at ASC'
    results = client.execute(query)
    
    seen = set()
    to_delete = []
    
    for row in results:
        key = f'{row[1]}_{row[2]}_{row[3]}'
        if key in seen:
            to_delete.append(row[0])
        else:
            seen.add(key)
            
    if not to_delete:
        print('No duplicates found.')
        return
        
    print(f'Found {len(to_delete)} duplicate records. Deleting...')
    
    batch_size = 100
    for i in range(0, len(to_delete), batch_size):
        batch = to_delete[i:i+batch_size]
        ids_str = ','.join([f"'{x}'" for x in batch])
        client.execute(f'ALTER TABLE pcb_results DELETE WHERE id IN ({ids_str})')
        client.execute(f'ALTER TABLE test_steps DELETE WHERE pcb_result_id IN ({ids_str})')
        
    print('Cleanup complete!')

if __name__ == '__main__':
    cleanup()
