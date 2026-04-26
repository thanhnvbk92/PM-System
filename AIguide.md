Dây là hệ thống client-server chó chức năng thu thập thông tin logfile của client và đẩy data về server theo thời gian thực
Server backend viết bằng python (đẻ sau này có thể dùng AI phân tích dữ liệu)
Client web frontend để hiển thị dashbaord và giao diện để phân tích dữ liệu
ClientApp viết bằng C# WPM, MVVM, DI, Logger, sử dụng MVVM Toolkit, có tính năng update
1 ngày có thể có đến 500k reccord đổ về server
DB cần thiết kế để có thể đọc và phân tích dữ liệu nhanh chóng