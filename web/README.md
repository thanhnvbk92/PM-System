# Web Dashboard - React.js

Đây là ứng dụng web frontend được xây dựng bằng **React.js**. Nó cung cấp giao diện người dùng để xem và phân tích dữ liệu log từ ClickHouse.

## 🎯 Chức năng
- **Dashboard:** Hiển thị thống kê và biểu đồ về dữ liệu log.
- **Log Viewer:** Tìm kiếm và xem chi tiết các log entries.
- **Real-time Updates:** Kết nối với Backend API để lấy dữ liệu mới nhất.
- **Responsive Design:** Giao diện tương thích với các thiết bị khác nhau (desktop, tablet, mobile).

## 📦 Cấu trúc thư mục
```
web/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── Header.js           # Header component
│   │   ├── Header.css
│   │   ├── Dashboard.js        # Dashboard component
│   │   ├── Dashboard.css
│   │   ├── LogViewer.js        # Log search component
│   │   └── LogViewer.css
│   ├── services/
│   │   └── api.js              # API client
│   ├── App.js                  # Main App component
│   ├── App.css
│   ├── index.js                # Entry point
│   ├── index.css               # Global styles
│   └── README.md
├── package.json                # Project dependencies
├── .gitignore
└── README.md                   # This file
```

## 🔧 Yêu cầu
- **Node.js** 14.0 hoặc cao hơn
- **npm** hoặc **yarn**

## 📦 Dependencies
- `react` - UI framework
- `react-dom` - React DOM renderer
- `axios` - HTTP client
- `chart.js` & `react-chartjs-2` - Charts and visualization
- `date-fns` - Date formatting (optional)

## 🚀 Cách chạy

### 1. Cài đặt dependencies
```bash
cd web
npm install
```

### 2. Cấu hình kết nối Backend
Tạo file `.env` trong thư mục `web/`:
```
REACT_APP_API_URL=http://localhost:8000
```

Nếu Backend chạy ở một địa chỉ khác, hãy thay đổi giá trị này.

### 3. Chạy ứng dụng trong môi trường phát triển
```bash
npm start
```

Ứng dụng sẽ mở tại `http://localhost:3000` trong browser mặc định của bạn.

### 4. Build cho production
```bash
npm run build
```

Đầu ra sẽ được lưu trong thư mục `build/`.

## 🌐 API Endpoints được sử dụng

| Endpoint | Phương thức | Mô tả |
|----------|-------------|-------|
| `/health` | GET | Kiểm tra trạng thái server |
| `/api/logs/search` | GET | Tìm kiếm logs với filters |
| `/api/logs/statistics` | GET | Lấy thống kê logs |
| `/api/logs/levels-distribution` | GET | Lấy phân bố theo mức độ log |
| `/api/logs/hosts` | GET | Lấy danh sách các hosts |

## 📊 Trang chính

### Dashboard
- Hiển thị 4 thẻ thống kê (Total Logs, Today's Logs, Error Logs, Warning Logs)
- Biểu đồ đường: Logs trong 7 ngày gần nhất
- Biểu đồ hình tròn: Phân bố logs theo mức độ
- Bảng tóm tắt: Thông tin tổng hợp

### Log Viewer
- Filters: Host, Log Level, Message (search text), Limit
- Bảng hiển thị chi tiết các log entries
- Badges màu để phân biệt mức độ log

## 🎨 Styling

### Color Palette
- **Primary**: `#3498db` (Blue)
- **Success**: `#27ae60` (Green)
- **Warning**: `#f39c12` (Orange)
- **Danger**: `#e74c3c` (Red)
- **Dark**: `#2c3e50` (Dark Blue)
- **Light**: `#ecf0f1` (Light Gray)

## 🔄 Component Architecture

```
App
├── Header (server status, navigation)
├── Navigation Tabs (Dashboard, Log Viewer)
└── Content
    ├── Dashboard
    │   ├── Stats Cards
    │   ├── Charts (Line, Pie)
    │   └── Summary Table
    └── LogViewer
        ├── Filter Form
        └── Results Table
```

## 🛠️ Phát triển tiếp theo
- Thêm WebSocket support để real-time log updates
- Triển khai tính năng **export logs** (CSV, JSON)
- Thêm **advanced filters** (date range picker, regex search)
- Triển khai **saved searches** và **bookmarks**
- Thêm **dark mode** support
- Triển khai **user authentication** nếu cần
- Tối ưu hóa hiệu năng (virtualization cho large datasets)

## 🐛 Lưu ý
- Hiện tại, dữ liệu được mock. Khi Backend sẵn sàng, hãy bỏ comment các lời gọi API thực tế trong `components/Dashboard.js` và `components/LogViewer.js`.
- Ứng dụng sẽ tự động kiểm tra kết nối server mỗi 30 giây. Nếu server không kết nối được, các endpoint sẽ hiển thị thông báo lỗi.
