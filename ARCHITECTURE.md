# System Architecture & Data Flow

Tài liệu này mô tả chi tiết cách hệ thống xử lý dữ liệu từ quy trình Ingestion đến Visualization.

## 1. Luồng dữ liệu (Data Flow)

### Ingestion (Ghi dữ liệu)
1. Các thiết bị/client gửi kết quả PCB qua POST API `/api/production/submit`.
2. Backend thực hiện **De-normalization**: Tra cứu thông tin Chuyền/Trạm từ cache để lấy `buyer_id`, `line_id`, `station_id`.
3. Dữ liệu được ghi vào ClickHouse bảng `pcb_results` (bao gồm cả các ID đã phi chuẩn hóa).
4. Ngay sau khi ghi, Backend phát tín hiệu qua **WebSocket** (`NEW_RESULT`) tới các client đang kết nối.

### Materialized Views (Xử lý dữ liệu lớn)
Để Dashboard có thể chạy trên hàng tỉ dòng, hệ thống sử dụng:
- **Table `pcb_stats_hourly`**: Sử dụng `AggregatingMergeTree` để lưu trữ các trạng thái tổng hợp (Total Count, Error Count) theo từng giờ và từng phân cấp (Buyer/Line/Station/Channel).
- **MV `pcb_stats_hourly_mv`**: Tự động tính toán lại các con số tổng hợp mỗi khi có dữ liệu mới chèn vào `pcb_results`.

## 2. Cơ chế Real-time (WebSocket)

Hệ thống sử dụng `ConnectionManager` để quản lý các kết nối WebSocket tại `/ws/logs`.
- **Throttling**: Tại Dashboard, chúng tôi giới hạn việc làm mới dữ liệu tối đa 5 giây một lần để bảo vệ tài nguyên máy chủ khi có lượng lớn dữ liệu đổ về đồng thời.
- **Mapping**: Frontend tự động ánh xạ ID sang Tên hiển thị bằng dữ liệu danh mục (Master Data) được lưu trong Store, giúp giảm tải cho Backend.

## 3. Cấu trúc Database (ClickHouse)

### Bảng `pcb_results`
- **Engine**: `MergeTree`
- **Partition**: Theo tháng (`toYYYYMM(start_time)`) để dễ dàng quản lý và xóa dữ liệu cũ.
- **Order BY**: `(channel_id, start_time)` giúp truy vấn lịch sử theo kênh cực nhanh.

### Bảng `pcb_stats_hourly`
- **Engine**: `AggregatingMergeTree`
- **Mục đích**: Phục vụ Dashboard. Tất cả các truy vấn Dashboard chỉ đọc từ bảng này.

## 4. Khả năng mở rộng (Scalability)
- **Hàng tỉ dòng**: ClickHouse xử lý việc nén dữ liệu cực tốt (tỉ lệ 10:1) và truy vấn song song trên nhiều nhân CPU.
- **Nhiều Viewer**: Lớp Cache ngắn hạn ở Backend và cơ chế Throttling ở Frontend đảm bảo hệ thống không bị treo khi có nhiều người cùng xem Dashboard.
