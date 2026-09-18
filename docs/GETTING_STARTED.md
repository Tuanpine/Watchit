# 🔰 Hướng Dẫn Bắt Đầu Dành Cho Người Mới (Getting Started)

Tài liệu này hướng dẫn chi tiết từng bước từ số 0 để bạn có thể tự cài đặt, vận hành và cấu hình **Service Hub & Homelab Project Portal** trên hệ thống của mình (máy chủ cá nhân, Raspberry Pi, Mini PC hoặc VPS đám mây).

> ⚠️ **CẢNH BÁO AN NINH QUAN TRỌNG:**
> * **KHÔNG sử dụng mật khẩu mặc định** khi triển khai công khai.
> * **Mount Docker Socket ở chế độ chỉ đọc (`:ro`)**: Đảm bảo không bỏ cờ `:ro` để tránh rủi ro bảo mật cho máy chủ.
> * **Xem tài liệu an ninh chi tiết**: [Chính sách Bảo mật (SECURITY.md)](../SECURITY.md) và [Hướng dẫn Thắt chặt An ninh (docs/SECURITY_HARDENING.md)](SECURITY_HARDENING.md).

---

## 📑 Mục lục
1. [Yêu cầu tiên quyết](#1-yêu-cầu-tiên-quyết)
2. [Cài đặt Docker & Docker Compose](#2-cài-đặt-docker--docker-compose)
3. [Triển khai Service Hub](#3-triển-khai-service-hub)
4. [Đăng nhập và Cấu hình lần đầu](#4-đăng-nhập-và-cấu-hình-lần-đầu)
5. [Cấu hình Reverse Proxy & Tên miền (Domain / SSL)](#5-cấu-hình-reverse-proxy--tên-miền-domain--ssl)
6. [Kiểm toán An ninh Tự động (Security Audit)](#6-kiểm-toán-an-ninh-tự-động-security-audit)
7. [Các lỗi thường gặp và cách xử lý](#7-các-lỗi-thường-gặp-và-cách-xử-lý)

---

## 1. Yêu cầu tiên quyết

- **Hệ điều hành**: Linux (Ubuntu 20.04/22.04/24.04, Debian 11/12, Rocky Linux, Alpine...) hoặc macOS / Windows (đã cài Docker Desktop / WSL2).
- **Phần cứng tối thiểu**:
  - CPU: 1 Core trở lên
  - RAM: Tối thiểu 256MB RAM trống (Service Hub rất nhẹ, tiêu thụ ~40-70MB RAM khi chạy).
  - Ổ đĩa: 200MB dung lượng trống.
- **Cổng mạng**: Mở cổng `3000` (hoặc bất kỳ cổng nào bạn muốn ánh xạ ra ngoài).

---

## 2. Cài đặt Docker & Docker Compose

Nếu máy chủ của bạn chưa có Docker, hãy chạy các lệnh sau (áp dụng cho Ubuntu/Debian):

```bash
# Cập nhật danh sách gói phần mềm
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker bằng script chính thức từ Docker Inc.
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cho phép tài khoản người dùng hiện tại chạy Docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra phiên bản Docker đã cài đặt
docker --version
docker compose version
```

---

## 3. Triển khai Service Hub

### Bước 3.1: Tạo thư mục chứa dự án
```bash
mkdir -p ~/homelab/service-hub
cd ~/homelab/service-hub
```

### Bước 3.2: Tạo file `docker-compose.yml`
```bash
nano docker-compose.yml
```

Dán nội dung cấu hình sau vào:

```yaml
version: '3.8'

services:
  service-portal:
    image: ghcr.io/your-username/service-hub-portal:latest
    container_name: service-hub-portal
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - ADMIN_PASSWORD=mat_khau_admin_cua_ban_123 # Thay đổi mật khẩu này!
      - JWT_SECRET=tao_mot_chuoi_that_dai_ngau_nhien_64_ky_tu
      - DOCKER_SOCKET_PATH=/var/run/docker.sock
    volumes:
      # Thư mục lưu dữ liệu trên máy chủ (không bị mất khi container khởi động lại)
      - ./data:/app/data
      # Mount Docker socket ở chế độ Chỉ Đọc (ro = read-only)
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - homelab-net

networks:
  homelab-net:
    driver: bridge
```

Lưu file bằng cách bấm `Ctrl + O` rồi `Enter`, sau đó thoát bằng `Ctrl + X`.

### Bước 3.3: Khởi chạy
```bash
docker compose up -d
```

Để kiểm tra xem container đã chạy ổn định hay chưa:
```bash
docker compose ps
docker compose logs -f
```

---

## 4. Đăng nhập và Cấu hình lần đầu

1. Mở trình duyệt web của bạn và gõ địa chỉ: `http://<IP_MÁY_CHỦ>:3000` (Ví dụ: `http://192.168.1.50:3000`).
2. Bạn sẽ thấy ngay giao diện Flashcard Dashboard với các dịch vụ mẫu được nạp sẵn.
3. Ở góc trên cùng bên phải, nhấp vào nút **"⚙️ Admin Login"**.
4. Điền thông tin đăng nhập:
   - **Tên người dùng**: `admin`
   - **Mật khẩu**: Giá trị bạn đã đặt tại biến `ADMIN_PASSWORD` (mặc định trong ví dụ trên là `mat_khau_admin_cua_ban_123`).
5. Sau khi đăng nhập thành công, bạn có thể:
   - Thêm dịch vụ mới bằng nút **"+ Add Service"**.
   - Chuyển sang tab **"Docker Discovery"** để quét các container đang chạy và thêm vào bảng chỉ với 1 click.
   - Chuyển sang tab **"Settings"** để đổi tên tiêu đề Portal, đổi mật khẩu quản trị và lấy mã **Webhook Token**.

---

## 5. Cấu hình Reverse Proxy & Tên miền (Domain / SSL)

Để truy cập bảng điều khiển từ xa qua tên miền riêng (ví dụ: `https://hub.yourdomain.com`) có chứng chỉ bảo mật HTTPS miễn phí, bạn có thể lựa chọn 1 trong 2 phương án phổ biến sau:

### Phương án A: Dùng Nginx Proxy Manager (Khuyến nghị cho Homelab)
Nếu bạn đã cài đặt Nginx Proxy Manager:
1. Vào trang quản trị NPM > **Proxy Hosts** > **Add Proxy Host**.
2. **Domain Names**: `hub.yourdomain.com`
3. **Forward Hostname / IP**: Điền IP nội bộ của máy chủ (ví dụ `192.168.1.50`).
4. **Forward Port**: `3000`.
5. Bật các mục: `Cache Assets`, `Block Common Exploits`, `Websockets Support`.
6. Sang tab **SSL**: Chọn `Request a new SSL Certificate`, bật `Force SSL` và `HTTP/2 Support`. Bấm **Save**.

### Phương án B: Dùng Cloudflare Tunnel (Không cần mở port Modem / Không cần IP tĩnh)
1. Truy cập **Cloudflare Zero Trust** > **Networks** > **Tunnels**.
2. Tạo Tunnel mới (chọn Docker hoặc Linux connector).
3. Trong mục **Public Hostname**:
   - Subdomain: `hub`
   - Domain: `yourdomain.com`
   - Type: `HTTP`
   - URL: `localhost:3000`
4. Cloudflare sẽ tự động mã hóa toàn bộ lưu lượng bằng chứng chỉ SSL mà không cần mở bất kỳ cổng nào trên router mạng gia đình.

---

## 6. Kiểm toán An ninh Tự động (Security Audit)

Service Hub tích hợp sẵn công cụ tự đánh giá an ninh ngay trên Admin Panel:
1. Đăng nhập vào trang Quản trị > Nhấp vào tab **"Security Audit"**.
2. Hệ thống sẽ chấm điểm xếp hạng bảo mật của máy chủ theo thang điểm **Grade A / B / C**:
   - Kiểm tra mật khẩu quản trị mặc định (phát hiện và cảnh báo đỏ ngay nếu còn dùng `admin`/`admin123...`).
   - Kiểm tra chuỗi ký tự bí mật `JWT_SECRET`.
   - Kiểm tra chế độ gắn kết Docker Socket (`/var/run/docker.sock`).
   - Kiểm tra trạng thái tường lửa chống tấn công dò mật khẩu (Anti-Brute Force Lockout).
   - Kiểm tra các Header bảo vệ trình duyệt (X-Frame-Options, nosniff, XSS-Protection).
3. Làm theo các khuyến nghị hiển thị trực quan trên màn hình để đạt mức xếp hạng an toàn **Grade A** trước khi chia sẻ link portal.

> 📖 **Xem hướng dẫn thắt chặt an ninh chuyên sâu:** [docs/SECURITY_HARDENING.md](SECURITY_HARDENING.md)

---

## 7. Các lỗi thường gặp và cách xử lý

### Lỗi 1: Không kết nối được Docker Socket (Docker Discovery báo lỗi "Socket not available")
- **Nguyên nhân**: Quyền truy cập file `/var/run/docker.sock` trên máy host bị hạn chế.
- **Cách khắc phục**:
  Chạy lệnh kiểm tra quyền trên host:
  ```bash
  ls -la /var/run/docker.sock
  ```
  Đảm bảo user chạy docker nằm trong nhóm `docker`:
  ```bash
  sudo usermod -aG docker $USER
  sudo chmod 666 /var/run/docker.sock
  ```

### Lỗi 2: Bấm vào thẻ dịch vụ trên điện thoại bị lỗi kết nối (URL trỏ về `localhost`)
- **Nguyên nhân**: Thẻ dịch vụ đang lưu link dưới dạng `http://localhost:8080`. Khi mở từ điện thoại, điện thoại sẽ tự tìm đến cổng của chính nó.
- **Cách khắc phục**:
  Bật công tắc **"Dynamic LAN Host: ON"** ngay trên thanh công cụ của Service Hub. Hệ thống sẽ tự động chuyển đổi `localhost` thành IP máy chủ thực tế (ví dụ: `192.168.1.50:8080`) hoàn toàn tự động!

---

*Nếu bạn gặp khó khăn khác, vui lòng mở issue trên GitHub để được hỗ trợ nhanh nhất.*
