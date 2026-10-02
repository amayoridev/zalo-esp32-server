# Node.js Server Cho Hộp Thuốc Thông Minh ESP32 & Zalo Bot Integrations

Máy chủ Node.js được thiết kế để host trên tên miền public (Northflank, Render, Railway, VPS...) đóng vai trò trung tâm kết nối giữa **Mạch ESP32**, **Zalo Bot API**, và **Giao diện Web Admin**.

---

## 🚀 Hướng Dẫn Deploy Chi Tiết Lên Northflank (northflank.com)

Northflank hỗ trợ deploy cực kỳ nhanh chóng qua GitHub và Dockerfile đã được chuẩn bị sẵn.

### Bước 1: Đẩy Mã Nguồn Lên GitHub
Đẩy toàn bộ mã nguồn thư mục này lên một Repository trên GitHub của bạn.

### Bước 2: Tạo Service Trển Northflank
1. Đăng nhập vào [Northflank Dashboard](https://app.northflank.com).
2. Tạo mới một **Combined Service** (hoặc Deployment Service).
3. Mục **Service Name**: Điền `esp32-pillbox-server`.
4. Mục **Source**: Chọn **Build & Deploy from Repository** -> Chọn tài khoản GitHub và chọn Repo bạn vừa tạo.
5. Mục **Build Option**: Chọn **Dockerfile** (Northflank sẽ tự động nhận diện file `Dockerfile` ở thư mục gốc).

### Bước 3: Cấu Hình Networking & Ports (Cực Kỳ Quan Trọng)
1. Trong phần **Networking**, thêm một cổng:
   - **Port**: `3000`
   - **Protocol**: `HTTP`
   - **Public Exposure**: BẬT (Enable Public Access / Public domain)
2. Sau khi Bật Public Exposure, Northflank sẽ cấp cho bạn một tên miền public dạng: `https://esp32-pillbox-server-xxxx.northflank.app`.

### Bước 4: Khai Báo Biến Môi Trường (Environment Variables)
Trong mục **Environment Variables** trên Northflank, thêm các biến sau:
- `PORT`: `3000`
- `ZALO_BOT_TOKEN`: `3516935780710466264:ugSstUzvFeZmZfcybnQrfsiuegGQekOlaVOxAzbPqtOnWjqsADfSVjQcraMywtBt`
- `ZALO_CHAT_ID`: `zgr-283fb837225acb04924b`

### Bước 5: Cấu Hình Health Check (Tùy Chọn)
- **Path**: `/esp-ping` hoặc `/`
- **Port**: `3000`

---

## 📡 Cấu Hình Trong Mã Nguồn ESP32 (Arduino C++)

Sau khi Northflank cấp tên miền Public Domain (ví dụ `https://esp32-pillbox-server-xxxx.northflank.app`), bạn copy URL đó dán vào biến `serverUrl` trong code ESP32:

```cpp
// Dán URL Northflank của bạn vào đây (Lưu ý: KHÔNG thêm dấu / ở cuối URL)
String serverUrl = "https://esp32-pillbox-server-xxxx.northflank.app";
```

---

## 💡 Quy Trình Kết Nối & Giải Pháp Bypass Firewall (Không Cần Port Forwarding)

1. **Khởi động Ping (`GET /esp-ping`)**: ESP32 kết nối Wi-Fi -> Gửi `GET /esp-ping` -> Server trả về `OK` (200) -> LCD ESP32 in ` SERVER LINK: OK`.
2. **Ghi nhận & Ghi đè IP**: Server đọc header IP client, nếu đổi IP -> Ghi đè IP cũ.
3. **Bypass Port Forwarding Router (`GET /esp-pull`)**: Lệnh đổi giờ từ Zalo / Web Admin được lưu vào Hàng đợi (Queue) trên Server. ESP32 tự động gửi `GET /esp-pull` mỗi 3s để rút lệnh về cập nhật.
