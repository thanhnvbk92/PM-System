# AI Handover Document

Tài liệu này dành cho các AI Agent tiếp theo để nắm bắt nhanh trạng thái dự án.

## 📌 Bối cảnh dự án
Hệ thống giám sát PCB với lưu lượng dữ liệu cực lớn (hàng tỉ dòng). Đã tối ưu hóa bằng mô hình **OLAP (ClickHouse)**.

## 🔑 Thông tin kỹ thuật quan trọng
1. **Dữ liệu lớn (Big Data)**:
   - Sử dụng các cột phi chuẩn hóa (`buyer_id`, `line_id`, `station_id`) trong bảng `pcb_results` để lọc dữ liệu trực tiếp.
   - Các API thống kê sử dụng bảng `pcb_stats_hourly` (AggregatingMergeTree) để truy vấn với tốc độ cực nhanh.

2. **Deduplication Logic**:
   - **Master Data**: Dùng `ReplacingMergeTree`. Luôn dùng `ANY LEFT JOIN` khi truy vấn để tránh nhân đôi dòng dữ liệu.

3. **Dashboard & Trend Analysis**:
   - **Trends**: Hỗ trợ xem xu hướng theo 7 ngày, 5 tuần và 12 tháng. Dữ liệu được tính toán dựa trên các hàm `toStartOfMonth`, `toStartOfWeek`, `toStartOfDay` trong ClickHouse.
   - **Channel Status**: Trạng thái "Disconnected" được tính toán động (Offline nếu không có log trong vòng 10 phút qua).

4. **Real-time Updates**:
   - Sử dụng WebSocket trên cổng **8000** để cập nhật cả LogViewer và Dashboard.
   - Dashboard có cơ chế `throttle` 5 giây để tối ưu hóa hiệu năng.

## 📝 Lưu ý cho Agent tiếp theo
- API Trends nằm tại `/api/stats/trends`.
- API Channel Status nằm tại `/api/stats/channel-status`.
- Nếu biểu đồ xu hướng không hiện dữ liệu: Kiểm tra xem bảng `pcb_stats_hourly` đã được populate dữ liệu lịch sử chưa.
