# API Guide for PM System

Tài liệu hướng dẫn tích hợp cho các thiết bị và ứng dụng ngoại vi.

## 1. Gửi kết quả kiểm tra (PCB Result)
**Endpoint**: `POST /api/production/submit`

### Request Body:
```json
{
  "channel_id": 10,
  "model_id": 5,
  "pid": "SN123456789",
  "fid": "FID_001",
  "pcba_partno": "P/N-100",
  "start_time": "2024-05-07T10:00:00",
  "end_time": "2024-05-07T10:00:15",
  "test_time": 15.5,
  "result": "OK",
  "file_path": "/storage/logs/log_001.txt",
  "jobfile": "Job_A.jbf",
  "steps": [
    {
      "step_type": "Measurement",
      "step_number": 1,
      "step_name": "Voltage Test",
      "value": "12.05",
      "spec_min": "11.50",
      "spec_max": "12.50",
      "result": "OK"
    }
  ]
}
```

## 2. Gửi nhật ký hệ thống (System Logs)
**Endpoint**: `POST /api/system/logs`

### Request Body:
```json
[
  {
    "level": "INFO",
    "message": "Application started",
    "line_id": 1,
    "station_id": 2,
    "channel_id": 10,
    "device_id": 1
  }
]
```

## 3. WebSocket Real-time
**URL**: `ws://<host>:<port>/ws/logs`

Khi kết nối thành công, bạn sẽ nhận được các gói tin JSON khi có dữ liệu mới:
```json
{
  "type": "NEW_RESULT",
  "data": { ... }
}
```

## 4. Thống kê (Dashboard APIs)
- `GET /api/stats/summary`: Lấy tổng quan (Yield, Rate, Models).
- `GET /api/stats/by-buyer`: Thống kê theo khách hàng.
- `GET /api/stats/by-result`: Thống kê theo kết quả OK/NG.

*Lưu ý: Các API thống kê hỗ trợ query params: `buyer_id`, `line_id`, `station_id`.*
