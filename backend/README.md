# Backend - Python/FastAPI

Đây là thành phần Backend của hệ thống PM System. Nó được xây dựng bằng **FastAPI** và kết nối trực tiếp đến **ClickHouse** để lưu trữ dữ liệu log.

## 🎯 Chức năng
- **Tiếp nhận dữ liệu log** từ ClientApp (C# WPF) qua REST API.
- **Lưu trữ dữ liệu** vào ClickHouse một cách hiệu quả.
- **Truy vấn và phân tích** dữ liệu log.
- **Cung cấp API** cho Web Dashboard để truy cập dữ liệu.

## 📦 Cấu trúc thư mục
```
backend/
├── main.py                  # Ứng dụng FastAPI chính
├── requirements.txt         # Danh sách thư viện Python
└── README.md               # File hướng dẫn này
```

## 🚀 Cách chạy

### 1. Cài đặt các thư viện phụ thuộc
```bash
pip install -r requirements.txt
```

### 2. Đảm bảo ClickHouse đang chạy
Trước tiên, bạn cần khởi động ClickHouse thông qua Docker Compose:
```bash
cd ../infrastructure
docker-compose up -d
```

### 3. Chạy ứng dụng FastAPI
```bash
uvicorn main:app --reload
```

Server sẽ chạy tại `http://localhost:8000`

## 📡 API Endpoints

### 1. Health Check
```
GET /health
```
Kiểm tra trạng thái của server và kết nối ClickHouse.

**Response:**
```json
{
  "status": "healthy",
  "database": "healthy",
  "timestamp": "2024-04-26T10:30:00"
}
```

### 2. Ingest Logs
```
POST /api/logs/ingest
```
Tiếp nhận một lô các log entries từ ClientApp.

**Request Body:**
```json
{
  "logs": [
    {
      "timestamp": "2024-04-26T10:30:00",
      "level": "INFO",
      "message": "Application started",
      "source": "Application.log",
      "host": "CLIENT-01",
      "user": "admin",
      "custom_fields": {}
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Received 1 log entries",
  "count": 1
}
```

### 3. Search Logs
```
GET /api/logs/search?host=CLIENT-01&level=ERROR&limit=100
```
Tìm kiếm các log entries từ ClickHouse.

**Query Parameters:**
- `host` (optional): Lọc theo tên máy host
- `level` (optional): Lọc theo mức độ log (INFO, ERROR, WARNING, etc.)
- `start_time` (optional): Thời gian bắt đầu
- `end_time` (optional): Thời gian kết thúc
- `limit` (optional, default: 100): Số lượng bản ghi tối đa

**Response:**
```json
{
  "status": "success",
  "data": [...],
  "count": 0
}
```

## 🔧 Cấu hình

### ClickHouse Connection
Để thay đổi thông tin kết nối ClickHouse, chỉnh sửa các biến tại đầu file `main.py`:
```python
CLICKHOUSE_HOST = "localhost"
CLICKHOUSE_PORT = 9000
```

Nếu bạn chạy ClickHouse trên một máy chủ khác hoặc khác port, hãy cập nhật các giá trị này.

## 📝 Ghi chú
- Hiện tại, các endpoint `/api/logs/search` và `/api/logs/ingest` chỉ là placeholder. Chúng cần được hoàn thành với logic ClickHouse thực tế.
- Bảng ClickHouse `logs` được tạo tự động khi ứng dụng khởi động.
