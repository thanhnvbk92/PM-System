# Hướng dẫn Triển khai ClickHouse trên Ubuntu VM

Tài liệu này hướng dẫn bạn cách đưa Database lên máy ảo Linux và kết nối từ Windows.

## 1. Chuẩn bị trên Ubuntu VM

### Cài đặt Docker & Docker Compose
Nếu chưa cài đặt, hãy chạy các lệnh sau trên Ubuntu:
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker
```

### Copy source code
Copy thư mục `infrastructure` từ máy Windows sang Ubuntu (có thể dùng SCP, Git, hoặc Shared Folder).

### Chạy ClickHouse
Di chuyển vào thư mục `infrastructure` trên VM và chạy:
```bash
docker-compose up -d
```

### Kiểm tra trạng thái
```bash
docker-compose ps
docker logs pm_system_clickhouse
```

## 2. Kết nối từ Windows

### Tìm IP của VM
Trên Ubuntu VM, chạy `hostname -I` để lấy địa chỉ IP (ví dụ: `192.168.x.x`).

### Cấu hình Backend
Trên máy Windows, thiết lập biến môi trường trước khi chạy backend:
```powershell
$env:CLICKHOUSE_HOST="192.168.x.x"
cd backend
python main.py
```

## 3. Khởi tạo Dữ liệu (Dùng script SQL)
Để chèn dữ liệu mẫu, bạn có thể thực thi lệnh này ngay trên VM:
```bash
docker exec -i pm_system_clickhouse clickhouse-client -n < clickhouse/seed_data.sql
```
