-- 1. Master Data Tables

CREATE TABLE IF NOT EXISTS buyer (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS model_group (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES buyer(id),
    name VARCHAR(255) NOT NULL,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,
    model_group_id INTEGER REFERENCES model_group(id),
    name VARCHAR(255) NOT NULL,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    line_id INTEGER REFERENCES lines(id),
    model_group_id INTEGER REFERENCES model_group(id),
    station_type VARCHAR(100),
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id),
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    gmes_name VARCHAR(255),
    status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS device_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id),
    device_type_id INTEGER REFERENCES device_types(id),
    name VARCHAR(255) NOT NULL,
    model_partno VARCHAR(255),
    serial_number VARCHAR(255),
    status VARCHAR(50),
    calibration_date TIMESTAMP,
    calibration_due_date TIMESTAMP,
    calibration_status VARCHAR(50),
    remark TEXT
);

-- 2. Production Data Tables

CREATE TYPE test_result AS ENUM ('PASS', 'FAIL');

CREATE TABLE IF NOT EXISTS pcb_results (
    id UUID PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id),
    model_id INTEGER REFERENCES models(id),
    pid VARCHAR(255),
    fid VARCHAR(255),
    pcba_partno VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    test_time DOUBLE PRECISION,
    result test_result NOT NULL,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_steps (
    id SERIAL PRIMARY KEY,
    pcb_result_id UUID REFERENCES pcb_results(id),
    step_type VARCHAR(100),
    step_number INTEGER,
    step_name VARCHAR(255),
    value DOUBLE PRECISION,
    spec_min DOUBLE PRECISION,
    spec_max DOUBLE PRECISION,
    result test_result NOT NULL
);

-- Indices for performance
CREATE INDEX idx_pcb_results_start_time ON pcb_results(start_time);
CREATE INDEX idx_pcb_results_channel_id ON pcb_results(channel_id);
CREATE INDEX idx_test_steps_pcb_result_id ON test_steps(pcb_result_id);

-- 3. System Logs

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(50),
    message TEXT,
    line_id INTEGER,
    station_id INTEGER,
    channel_id INTEGER,
    device_id INTEGER
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
