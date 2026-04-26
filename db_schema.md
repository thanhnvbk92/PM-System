# Mô tả Cấu trúc Cơ sở dữ liệu (Định dạng dễ đọc)

## 1. Danh mục Phân cấp (Master Data)

### 1.1. Bảng `buyer` (Khách hàng)
- `id` (int, PK)
- `name` (string): BMW, VW, JLR...
- `remark` (string)

### 1.2. Bảng `model_group` (Nhóm Model)
- `id` (int, PK)
- `buyer_id` (int, FK): Liên kết tới bảng buyer
- `name` (string)
- `remark` (string)

### 1.3. Bảng `models` (Model chi tiết)
- `id` (int, PK)
- `model_group_id` (int, FK): Liên kết tới bảng model_group
- `name` (string)
- `remark` (string)

### 1.4. Bảng `lines` (Dây chuyền)
- `id` (int, PK)
- `name` (string): Line 1, Line 2...
- `remark` (string)

### 1.5. Bảng `stations` (Trạm)
- `id` (int, PK)
- `line_id` (int, FK): Liên kết tới bảng lines
- `model_group_id` (int, FK): Liên kết tới bảng model_group
- `station_type` (string): Power, RF4G, GPS_Audio...
- `name` (string)

### 1.6. Bảng `channels` (Kênh)
- `id` (int, PK)
- `station_id` (int, FK): Liên kết tới bảng stations
- `name` (string): Power#1, Power#2...
- `ip_address` (string)
- `mac_address` (string)
- `gmes_name` (string)
- `status` (string): online/offline

### 1.7. Bảng `device_types` (Loại thiết bị)
- `id` (int, PK)
- `name` (string): Equipment, Jig, Tool...
- `remark` (string)

### 1.8. Bảng `devices` (Thiết bị chi tiết)
- `id` (int, PK)
- `channel_id` (int, FK): Liên kết tới bảng channels
- `device_type_id` (int, FK): Liên kết tới bảng device_types
- `name` (string)
- `model_partno` (string)
- `serial_number` (string)
- `status` (string): OK/NG
- `calibration_date` (DateTime): Ngày hiệu chuẩn
- `calibration_due_date` (DateTime): Ngày hết hạn
- `calibration_status` (string): OK/NG
- `remark` (string)

---

## 2. Dữ liệu Sản xuất & Kiểm tra (Production Data)

### 2.1. Bảng `pcb_results` (Kết quả tổng quát PCB)
- `id` (UUID/Int, PK)
- `channel_id` (int, FK)
- `model_id` (int, FK)
- `pid` (string)
- `fid` (string)
- `pcba_partno` (string)
- `start_time` (DateTime)
- `end_time` (DateTime)
- `test_time` (double)
- `result` (string): PASS/FAIL
- `file_path` (string)

### 2.2. Bảng `test_steps` (Chi tiết các bước kiểm tra)
- `pcb_result_id` (int, FK): Liên kết tới pcb_results
- `step_type` (string): NG, Power_Current, TxPower...
- `step_number` (int)
- `step_name` (string)
- `value` (double)
- `spec_min` (double)
- `spec_max` (double)
- `result` (string): PASS/FAIL

---

## 3. Nhật ký Hệ thống (System Logs)

### 3.1. Bảng `system_logs`
- `timestamp` (DateTime)
- `level` (string)
- `message` (string)
- `line_id` (int)
- `station_id` (int)
- `channel_id` (int)
- `device_id` (int)
