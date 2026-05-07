# PM System - Project Handover Document

Tài liệu này cung cấp cái nhìn tổng quan về hệ thống PM System, kiến trúc, trạng thái hiện tại và các ưu tiên tiếp theo. Các AI agent trong tương lai nên đọc tài liệu này (`ai_handover.md`) cùng với `db_schema.md` trước khi bắt đầu bất kỳ task nào.

## 1. Project Overview & Tech Stack
PM System là hệ thống giám sát và quản lý dữ liệu sản xuất cho nhà máy, tập trung vào việc thu thập log (files, Database, TCP/UDP) từ các máy trạm (Stations) và cung cấp giao diện Analytics Dashboard.

- **Frontend**: React 18, Vite, Ant Design (Cổng mặc định: 3000)
    - **UI/UX Strategy**: Ưu tiên giao diện hiện đại (Glassmorphism), tối giản không gian (Compact Tables, loại bỏ Scroll ngang), trải nghiệm người dùng cao cấp.
- **Backend**: FastAPI (Python 3.10+), Pydantic (Cổng mặc định: 8100)
    - **Architecture**: Modular structure (`app/api`, `app/models`, `app/db`, `app/core`).
- **Database**: ClickHouse (Host: 192.168.100.10, Port: 9000, DB: `default`)
    - Sử dụng trình điều khiển (driver): `clickhouse-driver` (native TCP) cho hiệu năng chèn cực nhanh.

## 2. Directory Structure (Key Paths)
- `d:\1. Project\PM System\backend\`: API chạy FastAPI.
    - `app/db/clickhouse.py`: Chứa mọi logic kết nối và query ClickHouse. Đặc biệt lưu ý các hàm xử lý dữ liệu hàng loạt (`upsert_entities`).
    - `app/models/schemas.py`: Các Pydantic model (`PCBResultInput`, `SystemLogInput`, ...).
    - `app/api/endpoints/`: Chia route theo tính năng (`master_data.py`, `logs.py`, `stats.py`).
- `d:\1. Project\PM System\web\`: Giao diện React.
    - `src/components/MasterData.jsx`: Component phức tạp quản lý toàn bộ Master Data với tính năng Import/Export CSV, tự động map Name từ Foreign IDs, và UI Compact.
    - `src/services/api.js`: File tổng hợp các Axios API calls.

## 3. Database Schema Overview
*Lưu ý: Luôn đọc file `db_schema.md` nằm ở thư mục gốc của dự án để xem định nghĩa chi tiết nhất.*
Hệ thống sử dụng mô hình Hierarchical Master Data:
- `buyer` -> `lines` -> `stations` -> `channels` -> `devices`
- Có thêm các bảng phụ cho Master Data: `model_group`, `models`, `station_types`, `device_types`.
Dữ liệu giao dịch (Transaction Data):
- `pcb_results`: Chứa kết quả test PASS/FAIL (Lưu ý: Đã bổ sung trường `jobfile`).
- `test_steps`: Chi tiết các bước test của từng PCB.
- `system_logs`: Log sự kiện của máy tính (tích hợp với Elastic stack hoặc query trực tiếp ClickHouse).

## 4. Key Implementation Patterns (Phải Tuân Thủ)
1. **Master Data Integrity**: Database ClickHouse không kiểm tra Unique/Foreign Key chặt chẽ. Backend đảm nhận việc tạo **Auto-increment ID tự động** (`max(id) + 1`) và kiểm tra trùng lặp (vd: Name) trước khi Insert/Update. Tồn tại logic này trong `app/db/clickhouse.py`.
2. **Frontend Lookup Mapping**: Trên UI, tuyệt đối **không** hiển thị ID trần (Raw ID) cho các Foreign Keys (như `line_id`, `buyer_id`). Phải sử dụng cơ chế `lookupMap` để dịch ID thành Name thực tế (ví dụ: hiển thị "BMW" thay vì `buyer_id: 1`).
3. **Data Ingestion Standard**: Với dữ liệu tĩnh (như cấu hình Master Data), ưu tiên các cơ chế Import CSV hàng loạt (`/bulk`) thay vì Insert từng bản ghi để tiết kiệm thời gian.

## 5. Current State (Những gì đã hoàn thành gần nhất)
1. Cấu trúc lại toàn bộ Backend từ một file monolithic (`main.py`) sang cấu trúc FastAPI Modular.
2. Thiết kế và phát triển `MasterData.jsx` theo phong cách cực đại thẩm mỹ (Glassmorphism), nén bảng (Compact table remove horizontal scroll), sử dụng dấu `...` (ellipsis) cho nội dung dài.
3. Hoàn thiện tính năng Backup/Restore (Export/Import CSV) trực tiếp trên Client Browser cho toàn bộ nhánh Master Data.
4. Đã bổ sung thành công trường dữ liệu `jobfile` (String) vào bảng `pcb_results` (kể cả Schema, Backend API).

## 6. Next Steps (Các công việc cần AI tiếp theo thực hiện)
Theo lộ trình (plan.md), dự án cần chuyển trọng tâm từ "Xây dựng cấu trúc Dashboard" sang "Thu thập và hiển thị dữ liệu":
1. **Giai đoạn 3 (plan.md) - Phát triển Client App (PMSystem.Client)**: 
    - Tạo ứng dụng Desktop (ví dụ: Windows Service / Worker bằng C#/.NET hoặc Python) chạy ở các Station để bắt Log (.txt, XML, Event Viewer).
    - Client này phải đọc danh mục `station_id` của chính nó và đẩy log về backend FastAPI thông qua API chuẩn.
2. **Phân tích dữ liệu & Báo cáo nâng cao**:
    - Dựa trên dữ liệu thu thập được trong `pcb_results` (bây giờ đã có thêm `jobfile`) và `test_steps`, xây dựng các trang Dashboard Analytics mới (ví dụ: Biểu đồ tỉ lệ Yield Rate PASS/FAIL theo từng Line/Station, Phân tích First Pass Yield (FPY)).
3. **Xử lý Real-time (Tùy chọn)**: Nếu khối lượng dữ liệu cập nhật quá lớn, cân nhắc thay HTTP Polling ở Dashboard bằng WebSockets để đẩy sự kiện.
