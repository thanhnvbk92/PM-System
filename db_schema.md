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

### 1.5. Bảng `station_types` (Loại trạm)
- `id` (int, PK)
- `name` (string): FCT,ICT,X-Ray,Underfill,Curing,Router,...
- `remark` (string)

### 1.6. Bảng `stations` (Trạm)
- `id` (int, PK)
- `line_id` (int, FK): Liên kết tới bảng lines
- `model_group_id` (int, FK): Liên kết tới bảng model_group
- `station_type_id` (int, FK): Liên kết tới bảng station_types
- `name` (string)

### 1.7. Bảng `channels` (Kênh)
- `id` (int, PK)
- `station_id` (int, FK): Liên kết tới bảng stations
- `name` (string): Power#1, Power#2...
- `machine_partno` (string)
- `ip_address` (string)
- `mac_address` (string)
- `gmes_name` (string)
- `status` (string): online/offline
- `remark` (string)

### 1.8. Bảng `device_types` (Loại thiết bị)
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
- `id` (UUID, PK): Không được NULL
- `channel_id` (int, FK): Không được NULL
- `model_id` (int, FK): Không được NULL
- `pid` (string): Không được NULL
- `fid` (string): Nullable
- `pcba_partno` (string): Nullable
- `start_time` (DateTime): Không được NULL
- `end_time` (DateTime): Nullable
- `test_time` (double): Nullable
- `result` (string): OK/NG (Không được NULL)
- `file_path` (string): Không được NULL
- `jobfile` (string): Không được NULL

### 2.2. Bảng `test_steps` (Chi tiết các bước kiểm tra)
- `pcb_result_id` (UUID, FK): Liên kết tới pcb_results
- `step_type` (string): Nullable
- `step_number` (int): Không được NULL
- `step_name` (string): Nullable
- `value` (double): Nullable
- `spec_min` (double): Nullable
- `spec_max` (double): Nullable
- `result` (string): OK/NG (Không được NULL)

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
