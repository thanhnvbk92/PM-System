# Kế hoạch Dự án: Hệ thống Thu thập và Phân tích Log Thời gian thực

## 1. Tổng quan
Hệ thống dùng để thu thập các file log từ các máy client và đẩy dữ liệu về server theo thời gian thực để phân tích và hiển thị lên dashboard.

## 2. Kiến trúc Hệ thống
### Các thành phần chính
- **ClientApp (C# WPF)**:
    - Theo dõi các file log cục bộ.
    - Gửi dữ liệu về Server.
    - Tính năng: MVVM, DI, Tự động cập nhật (Auto-update).
- **Server (Python)**:
    - Tiếp nhận dữ liệu từ Client.
    - Xử lý và lưu trữ dữ liệu.
    - Cung cấp API cho Web Dashboard.
- **Database**:
    - Lưu trữ hiệu năng cao, tối ưu cho dữ liệu chuỗi thời gian (time-series) và phân tích (OLAP).
- **Web Dashboard (Web Frontend)**:
    - Hiển thị biểu đồ, thống kê và log trực tiếp.

### Luồng dữ liệu
`File Log tại Client` -> `ClientApp (C#)` -> `Server (Python/FastAPI)` -> `Database (ClickHouse/TimescaleDB)` -> `Web Dashboard (React/Vue)`

## 3. Công nghệ sử dụng (Tech Stack)
### ClientApp
- **Ngôn ngữ/Framework**: C# / WPF
- **Pattern**: MVVM (sử dụng `CommunityToolkit.Mvvm`)
- **Dependency Injection**: `Microsoft.Extensions.DependencyInjection`
- **Giao thức truyền tải**: `gRPC` hoặc `WebSockets` (để đạt hiệu năng cao nhất)
- **Theo dõi file**: `FileSystemWatcher`
- **Logging nội bộ**: `Serilog`

### Server
- **Ngôn ngữ**: Python
- **Framework**: `FastAPI` (Asynchronous, hiệu năng cao)
- **Xử lý dữ liệu**: `Pandas` hoặc `Polars`
- **Task Queue (nếu cần)**: `Celery` + `Redis`

### Database
- **Lựa chọn chính**: `ClickHouse` (Tối ưu cho việc truy vấn dữ liệu log cực lớn) hoặc `TimescaleDB`.

### Web Frontend
- **Framework**: `React.js` hoặc `Vue.js`
- **Visualization**: `Chart.js` hoặc `Plotly`
- **Giao tiếp thời gian thực**: `WebSockets`

## 4. Lộ trình thực hiện (Roadmap)

### Giai đoạn 1: Nền tảng & Kiến trúc
- [x] Xác định kiến trình và công nghệ (Đã xong)
- [x] Khởi tạo cấu trúc thư mục dự án (Backend, Client, Web)
- [x] Thiết lập Database (ClickHouse) - Đã triển khai xong trên VM

### Giai đoạn 2: Phát triển Backend
- [/] Xây dựng API tiếp nhận dữ liệu (FastAPI) - Đã có Pcb Result & System Logs
- [/] Xây dựng logic xử lý và lưu trữ dữ liệu
- [ ] Xây dựng API phục vụ Dashboard (REST/WebSockets) - Đang triển khai CRUD Master Data

### Giai đoạn 3: Phát triển ClientApp
- [ ] Triển khai tính năng theo dõi file (FileSystemWatcher)
- [ ] Triển khai cơ chế gửi dữ liệu (gRPC/WebSockets)
- [ ] Xây dựng cấu trúc MVVM và DI
- [ ] Triển khai tính năng Auto-update

### Giai đoạn 4: Phát triển Web Frontend
- [/] Xây dựng giao diện Dashboard - Đang phát triển CRUD
- [ ] Triển khai hiển thị log thời gian thực (WebSockets)
- [ ] Triển khai các biểu động trực quan hóa dữ liệu

### Giai đoạn 5: Kiểm thử & Triển khai
- [ ] Kiểm thử tích hợp (Integration Testing)
- [ ] Kiểm thử tải (Load Testing - Giả lập 500k records/ngày)
- [x] Thiết lập Docker để triển khai (Đã xong Database)
