# ClientApp - C# WPF Log Monitor

Đây là ứng dụng desktop (WPF) được sử dụng để theo dõi các file log cục bộ và gửi dữ liệu về Backend Server (Python/FastAPI).

## 🎯 Chức năng
- **Theo dõi file log:** Sử dụng `FileSystemWatcher` để phát hiện các thay đổi trong file log.
- **Gửi dữ liệu:** Gửi các log entries tới Backend Server thông qua REST API.
- **Giao diện thân thiện:** Giao diện WPF cho phép người dùng dễ dàng quản lý việc theo dõi log.
- **MVVM Pattern:** Cấu trúc code theo MVVM để dễ bảo trì và mở rộng.
- **Dependency Injection:** Sử dụng Microsoft.Extensions.DependencyInjection để quản lý dependencies.
- **Logging:** Sử dụng Serilog để ghi lại nhật ký hoạt động của ứng dụng.

## 📦 Cấu trúc thư mục
```
client/
├── Models/
│   └── LogEntry.cs              # Data models cho log entries
├── Services/
│   ├── LogApiClient.cs          # HTTP client gửi log tới Backend
│   └── FileLogMonitor.cs        # Theo dõi file log
├── ViewModels/
│   └── MainViewModel.cs         # ViewModel cho cửa sổ chính
├── Views/
│   └── (Thư mục cho các views XAML khác - nếu cần)
├── App.xaml                     # Application definition
├── App.xaml.cs                  # Application code-behind
├── MainWindow.xaml              # Main window UI
├── MainWindow.xaml.cs           # Main window code-behind
├── PMSystem.Client.csproj       # Project file
├── requirements.txt             # File hướng dẫn này
└── README.md                    # File hướng dẫn
```

## 🔧 Yêu cầu
- **.NET 6.0 SDK** hoặc cao hơn
- **Visual Studio 2022** hoặc `dotnet` CLI

## 📦 Dependencies
Project sử dụng các thư viện sau (tự động cài khi build):
- `CommunityToolkit.Mvvm` - MVVM Toolkit
- `Microsoft.Extensions.DependencyInjection` - Dependency Injection
- `System.Net.Http` - HTTP Client
- `Serilog` - Logging framework

## 🚀 Cách chạy

### Tùy chọn 1: Dùng Visual Studio
1. Mở file `PMSystem.Client.csproj` trong Visual Studio.
2. Nhấn `F5` để build và chạy ứng dụng.

### Tùy chọn 2: Dùng .NET CLI
```bash
# Build project
dotnet build

# Run project
dotnet run
```

## 💡 Hướng dẫn sử dụng

### 1. Chọn file log để theo dõi
- Nhập đường dẫn tới file log trong trường "Log File Path"
- Ví dụ: `C:\Logs\Application.log`

### 2. Bắt đầu theo dõi
- Nhấn nút "Start Monitoring"
- Ứng dụng sẽ bắt đầu lắng nghe các thay đổi trong file log
- Các log entries mới sẽ được thêm vào danh sách

### 3. Gửi logs tới Server
- Nhấn nút "Send Logs"
- Ứng dụng sẽ gửi tất cả các log đã thu thập tới Backend Server
- Kiểm tra trạng thái kết nối Server ở phía trên

### 4. Dừng theo dõi
- Nhấn nút "Stop Monitoring" để dừng theo dõi file log

## 🔌 Kết nối tới Backend

Mặc định, ClientApp sẽ kết nối tới Backend Server tại `http://localhost:8000`.

Nếu Backend Server chạy ở địa chỉ khác, bạn cần sửa đổi trong file `App.xaml.cs`:
```csharp
services.AddSingleton<ILogApiClient>(new LogApiClient("http://YOUR_SERVER_URL:PORT"));
```

## 📝 Ghi chú
- **Log Format:** Ứng dụng mong đợi file log có định dạng: `[timestamp] [level] message`
  - Ví dụ: `[2024-04-26 10:30:00] [INFO] Application started`
- **Auto-save logs:** Các logs được gửi thành công sẽ được ghi lại trong file `logs/pm-client-*.txt`
- **MainThread:** Khi phát hiện log mới, ứng dụng sẽ cập nhật UI thông qua `MainThread.BeginInvokeOnMainThread()` để đảm bảo thread-safe.

## 🛠️ Phát triển tiếp theo
- Triển khai tính năng **Auto-update** (kiểm tra version mới từ server)
- Thêm hỗ trợ **multiple log files** cùng một lúc
- Thêm **settings/preferences** UI để cho phép người dùng cấu hình
- Triển khai **retry logic** nếu gửi log thất bại
