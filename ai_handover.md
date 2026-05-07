# AI Handover Document

Tài liệu này dành cho các AI Agent tiếp theo để nắm bắt nhanh trạng thái dự án.

## 📌 Bối cảnh dự án
Hệ thống giám sát PCB với lưu lượng dữ liệu cực lớn (hàng tỉ dòng). Đã tối ưu hóa bằng mô hình **OLAP (ClickHouse)**.

## 🔑 Thông tin kỹ thuật quan trọng
1. **Dữ liệu lớn (Big Data)**:
   - Sử dụng các cột phi chuẩn hóa (`buyer_id`, `line_id`, `station_id`) trong bảng `pcb_results` để lọc dữ liệu trực tiếp.
   - Khi truy vấn thống kê, luôn dùng bảng `pcb_stats_hourly` và các hàm `-Merge`.

2. **Deduplication Logic**:
   - **Master Data**: Dùng `ReplacingMergeTree`. Luôn dùng `ANY LEFT JOIN` khi truy vấn để tránh nhân đôi dòng dữ liệu nếu metadata có nhiều phiên bản.

3. **Search Logic**:
   - Tìm kiếm PID hỗ trợ dạng **LIKE** (không phân biệt chữ hoa chữ thường) bằng toán tử `ILIKE '%{pid}%'`.

4. **UI & WebSocket Cleanup**:
   - **Đã loại bỏ tất cả thông báo Toast/Notification liên quan đến WebSocket** (Active, Disconnected, New Result). Hệ thống cập nhật dữ liệu âm thầm để tối ưu trải nghiệm người dùng khi dữ liệu đổ về nhanh.
   - Luôn duy trì kết nối WebSocket thời gian thực ở chế độ "Always Live".

## 📝 Lưu ý cho Agent tiếp theo
- Giao diện LogViewer không còn hiện thông báo khi có data mới, nhưng bảng vẫn sẽ cập nhật real-time.
- Nếu search PID ra nhiều dòng cùng ID: Kiểm tra lại logic `ANY LEFT JOIN`.
