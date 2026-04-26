-- Dữ liệu mẫu (Seed Data) cho các bảng Master

-- 1. Buyer
INSERT INTO buyer (id, name, remark) VALUES
(1, 'BMW', 'Bayerische Motoren Werke AG'),
(2, 'VW', 'Volkswagen Group'),
(3, 'JLR', 'Jaguar Land Rover');

-- 2. Model Group
INSERT INTO model_group (id, buyer_id, name, remark) VALUES
(1, 1, 'G30', 'BMW 5 Series'),
(2, 1, 'G20', 'BMW 3 Series'),
(3, 2, 'MEB', 'VW Electric Platform');

-- 3. Models
INSERT INTO models (id, model_group_id, name, remark) VALUES
(1, 1, 'HU_HIGH', 'Head Unit High'),
(2, 1, 'HU_ENTRY', 'Head Unit Entry'),
(3, 3, 'ICAS3', 'In-Car Application Server');

-- 4. Lines
INSERT INTO lines (id, name, remark) VALUES
(1, 'Line 1', 'Main Production Line'),
(2, 'Line 2', 'Support Line');

-- 5. Stations
INSERT INTO stations (id, line_id, model_group_id, station_type, name) VALUES
(1, 1, 1, 'Power', 'STATION_POWER_01'),
(2, 1, 1, 'RF4G', 'STATION_RF_01'),
(3, 2, 3, 'GPS', 'STATION_GPS_01');

-- 6. Channels
INSERT INTO channels (id, station_id, name, ip_address, mac_address, gmes_name) VALUES
(1, 1, 'CH_PWR_01', '192.168.1.10', 'AA:BB:CC:DD:EE:01', 'GMES_P1'),
(2, 1, 'CH_PWR_02', '192.168.1.11', 'AA:BB:CC:DD:EE:02', 'GMES_P2');

-- 7. Device Types
INSERT INTO device_types (id, name, remark) VALUES
(1, 'Equipment', 'Main testing equipment'),
(2, 'Jig', 'Mechanical fixture'),
(3, 'Tool', 'Handheld tool');

-- 8. Devices
INSERT INTO devices (id, channel_id, device_type_id, name, model_partno, serial_number, status) VALUES
(1, 1, 1, 'Power Supply Agilent', 'N6705B', 'MY12345678', 'OK'),
(2, 2, 1, 'Multimeter Keysight', '34461A', 'MY87654321', 'OK');
