# PM System - Production Monitoring & Analytics

Hệ thống quản lý và giám sát sản xuất thời gian thực, được thiết kế để xử lý quy mô dữ liệu lớn (hàng tỉ dòng) với độ trễ thấp.

## 🚀 Tính năng chính
- **Dashboard Real-time**: Giám sát Yield, Success Rate và xu hướng sản xuất tức thì qua WebSockets.
- **Production Data Explorer**: Xem nhật ký sản xuất chi tiết với chế độ "Live Mode".
- **Master Data Management**: Quản lý phân cấp Chuyền (Line) -> Trạm (Station) -> Kênh (Channel) -> Thiết bị (Device).
- **Big Data Ready**: Sử dụng ClickHouse với kiến trúc Materialized Views để đảm bảo tốc độ truy vấn trên hàng tỉ dòng dữ liệu.
- **De-normalized Ingestion**: Cơ chế tự động phi chuẩn hóa dữ liệu khi ghi để tối ưu hóa hiệu năng Dashboard.

## 🛠 Công nghệ sử dụng
- **Backend**: Python, FastAPI, ClickHouse (OLAP), PostgreSQL/ClickHouse (Master Data).
- **Frontend**: React, Ant Design, ECharts, Zustand (State Management).
- **Communication**: REST API & WebSockets.

## 🏗 Cấu trúc dự án
- `/backend`: Mã nguồn FastAPI và logic xử lý dữ liệu.
  - `/app/api/endpoints`: Các API endpoints (Production, Statistics, Master Data).
  - `/app/core`: Cấu hình hệ thống và quản lý WebSocket.
  - `/app/db`: Kết nối cơ sở dữ liệu ClickHouse/Postgres.
- `/web`: Mã nguồn giao diện React.
  - `/src/components`: Các thành phần giao diện chính (Dashboard, LogViewer, MasterData).
  - `/src/services`: Logic gọi API và WebSocket client.

## ⚙️ Cài đặt nhanh
1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```
2. **Setup Database (ClickHouse)**:
   ```bash
   python setup_mv.py  # Khởi tạo Materialized Views cho Dashboard
   ```
3. **Frontend**:
   ```bash
   cd web
   npm install
   npm run dev
   ```

## 📈 Quy mô hệ thống
Hệ thống hỗ trợ:
- Kết nối đồng thời từ hàng trăm client đẩy dữ liệu (Ingestion).
- 20+ kết nối view dashboard/logs đồng thời.
- Lưu trữ và phân tích hàng tỉ dòng dữ liệu nhờ ClickHouse.