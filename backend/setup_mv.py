from app.db.clickhouse import get_clickhouse_client

def setup_materialized_views():
    client = get_clickhouse_client()
    if not client:
        print("Could not connect to ClickHouse")
        return

    print("Dropping existing MV/Table if any...")
    client.execute("DROP TABLE IF EXISTS pcb_stats_hourly_mv")
    client.execute("DROP TABLE IF EXISTS pcb_stats_hourly")

    print("Creating pcb_stats_hourly...")
    # 1. Bảng lưu trữ số liệu tổng hợp theo giờ
    client.execute("""
    CREATE TABLE pcb_stats_hourly (
        hour DateTime,
        buyer_id UInt32,
        line_id UInt32,
        station_id UInt32,
        channel_id UInt32,
        result Enum8('OK' = 1, 'NG' = 2),
        total_count AggregateFunction(count, UInt8),
        total_test_time AggregateFunction(sum, Float64)
    ) ENGINE = AggregatingMergeTree()
    ORDER BY (hour, buyer_id, line_id, station_id, channel_id, result)
    """)

    print("Creating pcb_stats_hourly_mv...")
    # 2. Materialized View
    client.execute("""
    CREATE MATERIALIZED VIEW pcb_stats_hourly_mv 
    TO pcb_stats_hourly
    AS SELECT 
        toStartOfHour(start_time) as hour,
        buyer_id,
        line_id,
        station_id,
        channel_id,
        result,
        countState(toUInt8(1)) as total_count,
        sumState(assumeNotNull(test_time)) as total_test_time
    FROM pcb_results
    GROUP BY hour, buyer_id, line_id, station_id, channel_id, result
    """)

    print("Materialized Views setup completed successfully!")

if __name__ == "__main__":
    setup_materialized_views()
