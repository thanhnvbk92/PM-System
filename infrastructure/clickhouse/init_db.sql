-- 1. Master Data Tables (Sử dụng ReplacingMergeTree để hỗ trợ cập nhật)

CREATE TABLE IF NOT EXISTS buyer (
    id UInt32,
    name String,
    remark String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS model_group (
    id UInt32,
    buyer_id UInt32,
    name String,
    remark String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS models (
    id UInt32,
    model_group_id UInt32,
    name String,
    remark String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS lines (
    id UInt32,
    name String,
    remark String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS stations (
    id UInt32,
    line_id UInt32,
    model_group_id UInt32,
    station_type String,
    name String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS channels (
    id UInt32,
    station_id UInt32,
    name String,
    ip_address String,
    mac_address String,
    gmes_name String,
    status String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS device_types (
    id UInt32,
    name String,
    remark String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS devices (
    id UInt32,
    channel_id UInt32,
    device_type_id UInt32,
    name String,
    model_partno String,
    serial_number String,
    status String,
    calibration_date DateTime,
    calibration_due_date DateTime,
    calibration_status String,
    remark String
) ENGINE = ReplacingMergeTree() ORDER BY id;

-- 2. Production Data Tables (Sử dụng MergeTree cho dữ liệu lớn)

CREATE TABLE IF NOT EXISTS pcb_results (
    id UUID,
    channel_id UInt32,
    model_id UInt32,
    pid String,
    fid String,
    pcba_partno String,
    start_time DateTime64(3),
    end_time DateTime64(3),
    test_time Float64,
    result Enum8('PASS' = 1, 'FAIL' = 2),
    file_path String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree() 
PARTITION BY toYYYYMM(start_time)
ORDER BY (channel_id, start_time);

CREATE TABLE IF NOT EXISTS test_steps (
    pcb_result_id UUID,
    step_type String,
    step_number UInt32,
    step_name String,
    value Float64,
    spec_min Float64,
    spec_max Float64,
    result Enum8('PASS' = 1, 'FAIL' = 2)
) ENGINE = MergeTree()
ORDER BY (pcb_result_id, step_number);

-- 3. System Logs

CREATE TABLE IF NOT EXISTS system_logs (
    timestamp DateTime64(3),
    level LowCardinality(String),
    message String,
    line_id UInt32,
    station_id UInt32,
    channel_id UInt32,
    device_id UInt32
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY timestamp;
