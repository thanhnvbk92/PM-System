# Project Development Plan & Status

## 🏁 Mục tiêu đã hoàn thành
- [x] Thiết lập Backend FastAPI & ClickHouse.
- [x] Xây dựng UI Master Data (Glassmorphism design).
- [x] Triển khai Real-time WebSockets cho Log Viewer và Dashboard.
- [x] **Big Data Optimization**:
  - [x] Phi chuẩn hóa (De-normalization) bảng `pcb_results`.
  - [x] Sửa lỗi trùng lặp dữ liệu (Duplication) bằng `ANY LEFT JOIN`.
  - [x] Tối ưu hóa tìm kiếm PID (Exact match) đạt tốc độ sub-second.
  - [x] Thiết lập Materialized Views (`pcb_stats_hourly`) để tính toán thống kê tức thời.

## 🛠 Công việc đang thực hiện
- [x] **Always Live Mode**: Loại bỏ nút gạt, hệ thống luôn ở trạng thái cập nhật thời gian thực ổn định.
- [ ] Tối ưu hóa bộ nhớ đệm (Caching) cho Master Data ở Backend.
- [ ] Cải thiện UI Dashboard với nhiều biểu đồ phân tích sâu hơn.

## 🚀 Kế hoạch tiếp theo
- [ ] Triển khai phân quyền (Authentication/Authorization) cho các kết nối WebSocket.
- [ ] Xây dựng hệ thống cảnh báo (Alerting) tự động gửi Telegram/Email khi tỉ lệ NG vượt ngưỡng.
- [ ] Dockerize toàn bộ ứng dụng để dễ dàng triển khai.
