# Hướng dẫn Thiết lập và Triển khai Hệ thống PM System

Chào mừng bạn đến với dự án Hệ thống Thu thập và Phân tích Log Thời gian thực.

## 🚀 Mục lục
1. [Kiến trúc hệ thống](#)
2. [Yêu cầu môi trường](#yêu-cầu-môi-trường)
3. [Thiết lập cơ sở dữ liệu (ClickHouse)](#thiết-lập-cơ-sở-dữ-liệu-clickhouse)
4. [Khởi tạo Backend (Python/FastAPI)](#khởi-tạo-backend-pythonfastapi)
5. [Triển khai toàn bộ hệ thống](#triển-khai-toàn-bộ-hệ-thống)

---

## 1. Kiến trúc hệ thống
Hệ thống được chia thành 4 thành phần chính:
*   **ClientApp (C# WPF):** Thu thập log và gửi dữ liệu.
*   **Server (Python/FastAPI):** API trung gian, nhận và xử lý dữ liệu.
*   **Database (ClickHouse):** Lưu trữ và phân tích dữ liệu log hiệu năng cao.
*   **Web Dashboard (React/Vue):** Giao diện người dùng để xem báo cáo.

## 2. Yêu cầu môi trường
*   **Docker:** Cần cài đặt Docker và Docker Compose.
*   **Python:** Phiên bản 3.10+
*   **C#:** .NET 6.0+

## 3. Thiết lập cơ sở dữ liệu (ClickHouse)
1.  **Chạy Docker Compose:**
    ```bash
    docker-compose up -d
    ```
2.  **Kiểm tra trạng thái:**
    ```bash
    docker-compose ps
    ```
    Đảm bảo container `pm_system_clickhouse` đang chạy.

## 4. Khởi tạo Backend (Python/FastAPI)
1.  **Cài đặt Dependencies:**
    Di chuyển vào thư mục `backend/` và cài đặt các thư viện cần thiết:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```
2.  **Chạy Server:**
    ```bash
    uvicorn main:app --reload
    ```

## 5. Triển khai toàn bộ hệ thống
Sau khi Backend và ClickHouse đã chạy ổn định, bạn sẽ tiếp tục phát triển ClientApp và Web Dashboard theo lộ trình đã định.

---
*Lưu ý: Các bước này chỉ là hướng dẫn ban đầu. Vui lòng tham khảo `plan.md` để xem lộ trình chi tiết.*