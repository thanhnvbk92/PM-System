# Mô tả Cấu trúc Cơ sở dữ liệu (Định dạng dễ đọc)

## 1. Danh mục Phân cấp (Master Data)
Sử dụng engine **ReplacingMergeTree** để cho phép cập nhật dữ liệu và tự động loại bỏ các bản ghi cũ dựa trên khóa chính (`id`).

### 1.1. Bảng `buyer` (Khách hàng)
- **Engine**: `ReplacingMergeTree`
- `id` (int, PK)
- `name` (string): BMW, VW, JLR...
- `remark` (string)

### 1.4. Bảng `lines` (Dây chuyền)
- **Engine**: `ReplacingMergeTree`
- `id` (int, PK)
- `name` (string): Line 1, Line 2...
- `remark` (string)

### 1.6. Bảng `stations` (Trạm)
- **Engine**: `ReplacingMergeTree`
- `id` (int, PK)
- `line_id` (int, FK)
- `name` (string)

### 1.7. Bảng `channels` (Kênh)
- **Engine**: `ReplacingMergeTree`
- `id` (int, PK)
- `station_id` (int, FK)
- `name` (string)
- `ip_address` (string)
- `status` (string): online/offline

---

## 2. Dữ liệu Sản xuất & Kiểm tra (Production Data)
Sử dụng engine **MergeTree** thuần túy để tối ưu hóa tốc độ ghi dữ liệu ở quy mô lớn (High-throughput ingestion).

### 2.1. Bảng `pcb_results` (Kết quả tổng quát PCB)
- **Engine**: `MergeTree`
- **Phân vùng (Partition)**: `toYYYYMM(start_time)`
- `id` (UUID, PK)
- `channel_id` (UInt32, FK)
- `pid` (String): Mã định danh PCB
- `start_time` (DateTime64)
- `result` (Enum8): OK/NG
- `station_id`, `line_id`, `buyer_id` (UInt32): **Cột phi chuẩn hóa**. Dữ liệu được điền ngay khi nạp để tránh các phép JOIN nặng nề khi lọc dữ liệu.

### 2.2. Bảng `test_steps` (Chi tiết các bước kiểm tra)
- **Engine**: `MergeTree`
- `pcb_result_id` (UUID, FK)
- `step_name` (String)
- `result` (String): OK/NG

---

## 3. Lưu ý Kỹ thuật về Truy vấn (SQL Optimization)
1. **Deduplication**: Vì các bảng Master Data dùng `ReplacingMergeTree`, khi truy vấn cần sử dụng `ANY LEFT JOIN` hoặc từ khóa `FINAL` để tránh lấy trùng các phiên bản cũ của metadata.
2. **Search Logic**: Tìm kiếm PID sử dụng so sánh chính xác (`=`) thay vì `LIKE` để đảm bảo độ chính xác và tận dụng chỉ số (index).
3. **Always Live**: Hệ thống sử dụng WebSocket để đẩy dữ liệu mới nhất từ ClickHouse lên Frontend ngay lập tức.
