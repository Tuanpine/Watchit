# Hướng Dẫn Thắt Chặt An Ninh & Phòng Thủ Đa Lớp (Security Hardening Guide)

> ⚠️ **CẢNH BÁO QUAN TRỌNG:**
> Khi tự triển khai máy chủ gia đình (Self-hosted Homelab) hoặc đưa dịch vụ lên Internet (Public VPS), việc bảo đảm an ninh là trách nhiệm cốt lõi. Mặc định, Service Hub đã tích hợp nhiều lớp bảo vệ (Bcrypt, Rate Limiting, SSRF Guard, HTTP Security Headers), tuy nhiên bạn **BẮT BUỘC** phải tuân thủ các bước dưới đây để triệt tiêu các bề mặt rủi ro.

---

## Mục Lục
1. [Quản lý Thông tin Xác thực & Khóa Bí mật](#1-quản-lý-thông-tin-xác-thực--khóa-bí-mật)
2. [Bảo vệ Docker Socket An toàn](#2-bảo-vệ-docker-socket-an-toàn)
3. [Thiết lập Reverse Proxy & HTTPS / TLS](#3-thiết-lập-reverse-proxy--https--tls)
4. [Truy cập Từ xa An toàn: Cloudflare Tunnel & VPN](#4-truy-cập-từ-xa-an-toàn-cloudflare-tunnel--vpn)
5. [Cơ chế Chống Tấn công SSRF & Bảo vệ Công cụ Mạng](#5-cơ-chế-chống-tấn-công-ssrf--bảo-vệ-công-cụ-mạng)
6. [Tường lửa Máy chủ (UFW) & Phân đoạn Mạng (VLAN)](#6-tường-lửa-máy-chủ-ufw--phân-đoạn-mạng-vlan)
7. [Checklist 10 Bước Kiểm tra An ninh Trước khi Go-Live](#7-checklist-10-bước-kiểm-tra-an-ninh-trước-khi-go-live)

---

## 1. Quản lý Thông tin Xác thực & Khóa Bí mật

### 1.1. Đổi mật khẩu Quản trị viên Mặc định
Mặc định hệ thống tạo mật khẩu ban đầu là:
* **Tài khoản**: `admin`
* **Mật khẩu**: `admin123_doi_ngay_khi_dung`

**Cách đổi ngay:**
* **Cách 1 (Qua Giao diện):** Đăng nhập vào Admin Panel > Chuyển sang tab **Settings** > Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 8 ký tự, khuyến nghị có chữ hoa, số và ký tự đặc biệt) > Bấm **"Đổi Mật khẩu"**.
* **Cách 2 (Qua Biến môi trường):** Thiết lập biến `ADMIN_PASSWORD` trong file `.env` hoặc `docker-compose.yml`:
  ```bash
  ADMIN_PASSWORD="MotMatKhauSieuKhoDoan_2026!#$@%"
  ```

### 1.2. Tạo Khóa Bí mật JWT (JWT_SECRET) Ngẫu nhiên
Session đăng nhập của quản trị viên được ký số bằng thuật toán HMAC-SHA256 với khóa `JWT_SECRET`. Nếu dùng khóa mặc định trong mã nguồn mở, kẻ tấn công có thể tự tạo token quản trị giả mạo.

Tạo khóa ngẫu nhiên 32–64 ký tự bằng lệnh shell:
```bash
# Tạo chuỗi bí mật ngẫu nhiên
openssl rand -base64 32
# Ví dụ kết quả: v7R+xK3pL9...Z2Q==
```
Điền vào file `.env`:
```env
JWT_SECRET=v7R+xK3pL9mO1n0qB8xYzW2eD4fG6hJ8kL0aC2eG4iK=
```

### 1.3. Bảo vệ Webhook Token (CI/CD Auto-Discovery)
Webhook URL dùng để tiếp nhận tín hiệu từ các pipeline CI/CD (GitHub Actions, GitLab CI, Watchtower) có định dạng:
```
POST /api/webhook/docker-update?token=wh_sec_xxxxxxxxxxxx
```
* **Không chia sẻ công khai** đường link này trên kho mã nguồn (GitHub public repo).
* Nếu nghi ngờ token bị rò rỉ, hãy vào tab **Settings** trong Admin Panel và nhấn **"Tạo lại Token mới"** để vô hiệu hóa token cũ ngay lập tức.

---

## 2. Bảo vệ Docker Socket An toàn

Docker daemon socket (`/var/run/docker.sock`) là một UNIX Domain Socket cho phép giao tiếp trực tiếp với Docker Engine. Người dùng có quyền ghi vào socket này có quyền lực tương đương tài khoản `root` của hệ điều hành máy chủ.

### Cấp độ 1: Mount Chế độ Chỉ Đọc (Read-Only) - Khuyến nghị Tiêu chuẩn
Service Hub chỉ cần đọc danh sách container (`GET /containers/json`) và đo tài nguyên RAM/CPU (`GET /containers/{id}/stats`). Ứng dụng **không bao giờ** yêu cầu quyền tạo, xóa hoặc sửa container qua socket.

Luôn gắn cờ `:ro` trong cấu hình `docker-compose.yml`:
```yaml
services:
  service-hub:
    image: service-hub:latest
    volumes:
      # Cờ :ro đảm bảo container KHÔNG THỂ ghi hoặc thực thi lệnh nguy hiểm lên socket
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./data:/app/data
```

### Cấp độ 2: Sử dụng Docker Socket Proxy (Phòng thủ Cực hạn)
Nếu bạn triển khai trên môi trường nhạy cảm, bạn có thể triển khai container trung gian `tecnativa/docker-socket-proxy`. Proxy này chỉ mở các API GET an toàn và chặn hoàn toàn các API POST/DELETE/EXEC.

**Cấu hình mẫu với Docker Socket Proxy:**
```yaml
version: '3.8'

services:
  # Container Proxy cách ly Docker Socket
  docker-proxy:
    image: tecnativa/docker-socket-proxy:latest
    container_name: docker-socket-proxy
    environment:
      - CONTAINERS=1   # Cho phép GET /containers/*
      - POST=0         # Chặn mọi lệnh ghi
      - DELETE=0       # Chặn mọi lệnh xóa
      - INFO=1         # Cho phép GET /info
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-net
    restart: unless-stopped

  # Service Hub kết nối qua proxy qua mạng nội bộ
  service-hub:
    image: service-hub:latest
    container_name: service-hub
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
      - ADMIN_PASSWORD=ThayDoiNgayLapTuc123!
      - JWT_SECRET=ChuoiNgauNhienDai32KyTuTroLenNhe
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    networks:
      - socket-net
      - default
    depends_on:
      - docker-proxy

networks:
  socket-net:
    internal: true  # Mạng cách ly, không kết nối ra Internet
```

---

## 3. Thiết lập Reverse Proxy & HTTPS / TLS

> 🛑 **NGUY HIỂM:** Không bao giờ truyền cookie đăng nhập quản trị qua HTTP không mã hóa qua mạng công cộng. Kẻ xấu cùng mạng Wi-Fi hoặc nhà mạng có thể bắt gói tin (Packet Sniffing) để lấy cắp token.

Hãy đặt Service Hub phía sau một Reverse Proxy để tự động cấp phát chứng chỉ SSL/TLS miễn phí từ Let's Encrypt.

### Cách A: Sử dụng Caddy Server (Đơn giản & Tự động 100%)
Tạo file `Caddyfile`:
```caddy
hub.yourdomain.com {
    reverse_proxy service-hub:3000

    # Kích hoạt nén gzip/zstd
    encode gzip zstd

    # Header bảo mật bổ sung
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### Cách B: Sử dụng Nginx Proxy Manager (Giao diện Web trực quan)
1. Trong giao diện Nginx Proxy Manager, chọn **Add Proxy Host**.
2. **Domain Names**: Nhập tên miền (ví dụ: `hub.homelab.local` hoặc `hub.example.com`).
3. **Forward Hostname / IP**: Nhập `service-hub` (hoặc IP máy chủ).
4. **Forward Port**: `3000`.
5. Tích chọn **Block Common Exploits**, **Websockets Support**.
6. Sang tab **SSL**: Chọn **Request a new SSL Certificate**, tích **Force SSL** và **HTTP/2 Support**.

---

## 4. Truy cập Từ xa An toàn: Cloudflare Tunnel & VPN

> ⛔ **CẢNH BÁO NAT / PORT FORWARDING:**
> Tránh mở cổng port forwarding `3000 -> 3000` trực tiếp trên Router gia đình. Khi mở port, máy chủ của bạn sẽ trở thành mục tiêu quét tự động của botnet (Shodan, Censys) suốt 24/7.

### Giải pháp 1: Cloudflare Zero Trust (Cloudflare Tunnel) - Khuyên dùng
Cloudflare Tunnel tạo một kết nối mã hóa chiều đi (outbound) từ máy chủ của bạn tới máy chủ Cloudflare. Bạn **không cần mở bất kỳ cổng nào trên Router**.

**Cấu hình mẫu `docker-compose.yml` với Cloudflare Tunnel:**
```yaml
services:
  service-hub:
    image: service-hub:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./data:/app/data

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=eyJhIjoi...TokenLayTuCloudflareZeroTrust...
```
* **Lợi ích:**
  * Ẩn hoàn toàn địa chỉ IP thật của nhà mạng.
  * Tận dụng tường lửa Web Application Firewall (WAF) và chống DDoS miễn phí của Cloudflare.
  * Có thể thêm lớp xác thực Email OTP / Google Login trước khi cho phép truy cập portal qua **Cloudflare Access**.

### Giải pháp 2: Mạng Riêng Ảo Mesh VPN (Tailscale / WireGuard)
Nếu bạn chỉ muốn một mình bạn hoặc các thành viên gia đình truy cập, hãy sử dụng **Tailscale**:
* Cài đặt Tailscale trên máy chủ Homelab và điện thoại/laptop.
* Truy cập Service Hub an toàn qua địa chỉ IP nội bộ Tailscale (ví dụ: `http://100.x.y.z:3000`).
* Hoàn toàn không lộ bất kỳ dữ liệu nào ra mạng Internet công cộng.

---

## 5. Cơ chế Chống Tấn công SSRF & Bảo vệ Công cụ Mạng

### 5.1. Bảo vệ SSRF (Server-Side Request Forgery)
Tính năng **TCP Ping** cho phép đo độ trễ và kiểm tra mở cổng của các thiết bị. Tuy nhiên, nếu không kiểm soát, kẻ tấn công có thể lợi dụng server để quét cổng mạng nội bộ hoặc truy vấn các địa chỉ Cloud Metadata nhạy cảm.

**Các lớp phòng ngự đã tích hợp sẵn trong mã nguồn:**
1. **Lọc Hostname & IP:** Tự động cắt bỏ các tiền tố protocol (`http://`, `https://`), đường dẫn (`/path`), chỉ giữ lại địa chỉ IP hoặc Hostname thuần túy.
2. **Chặn Cloud Metadata Endpoint:** Tự động từ chối kết nối tới các dải địa chỉ nhạy cảm:
   * `169.254.169.254` (AWS, GCP, Azure, OpenStack instance metadata)
   * `metadata.google.internal`
   * Link-local IPv4/IPv6 addresses
3. **Giới hạn thời gian chờ (Timeout Clamping):** Khóa thời gian timeout tối đa 5000ms để ngăn chặn tấn công treo socket (Slowloris DoS).

### 5.2. Chống lạm dụng Gói tin Wake-on-LAN (UDP Flood Protection)
* Gói tin Magic Packet gửi tới cổng broadcast UDP 9/7 được kiểm soát bằng thuật toán **Rate Limiting**:
  * Tối đa **15 yêu cầu WoL / phút / IP**.
  * Tối đa **40 yêu cầu TCP Ping / phút / IP**.
* Nếu vượt quá ngưỡng, hệ thống trả về mã lỗi `HTTP 429 Too Many Requests` và yêu cầu chờ thời gian làm mát.

### 5.3. Phân quyền Quản lý Thiết bị (RBAC)
* Danh sách thiết bị (`GET /api/network/devices`) là **Read-Only** đối với người dùng công cộng.
* Thao tác Thêm (`POST`), Chỉnh sửa hoặc Xóa (`DELETE`) thiết bị **bắt buộc phải có Token Quản trị viên (Bearer JWT)**.

---

## 6. Tường lửa Máy chủ (UFW) & Phân đoạn Mạng (VLAN)

### 6.1. Cấu hình Tường lửa UFW (Ubuntu / Debian)
Chỉ cho phép truy cập cổng 3000 từ dải mạng nội bộ gia đình (LAN) hoặc VPN:
```bash
# Bật tường lửa
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Mở cổng SSH quản trị
sudo ufw allow 22/tcp

# Chỉ cho phép mạng LAN (ví dụ dải 192.168.1.0/24) truy cập Service Hub
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp

# Hoặc nếu chạy sau Reverse Proxy cục bộ trên cùng máy chủ
# Khóa cổng 3000 ngoài và chỉ lắng nghe trên localhost (127.0.0.1:3000:3000 trong docker)
sudo ufw enable
sudo ufw status verbose
```

### 6.2. Phân đoạn Mạng Nội bộ (VLAN Isolation)
* **VLAN 1 (Trusted/LAN):** Chứa máy tính cá nhân, điện thoại tin cậy.
* **VLAN 2 (Servers/Homelab):** Nơi đặt máy chủ chạy Service Hub, NAS, Docker hosts.
* **VLAN 3 (IoT & Guest):** Các thiết bị camera, công tắc thông minh, khách vãng lai.
* Thiết lập tường lửa trên Router (pfSense, OPNsense, UniFi) để **chặn VLAN IoT truy cập vào VLAN Servers**.

---

## 7. Checklist 10 Bước Kiểm tra An ninh Trước khi Go-Live

Trước khi chia sẻ đường link hoặc đưa portal vào sử dụng chính thức, hãy hoàn thành danh sách kiểm tra sau:

| STT | Mục Kiểm Tra | Trạng Thái Khuyến Nghị | Mức Độ |
| :---: | :--- | :--- | :---: |
| 1 | Mật khẩu quản trị mặc định | Đã đổi thành mật khẩu mạnh (≥ 12 ký tự) | **Cực kỳ nghiêm trọng** |
| 2 | Khóa `JWT_SECRET` | Đã gán chuỗi ngẫu nhiên dài trong `.env` | **Nghiêm trọng** |
| 3 | Quyền Docker Socket | Đã kiểm tra cờ `/var/run/docker.sock:...:ro` | **Nghiêm trọng** |
| 4 | Mở cổng NAT trên Router | Đã tắt mở cổng 3000 trực tiếp, chuyển sang Cloudflare Tunnel / VPN | **Nghiêm trọng** |
| 5 | Chứng chỉ SSL/TLS | Trang web hiển thị biểu tượng ổ khóa xanh (HTTPS hợp lệ) | **Cao** |
| 6 | File dữ liệu `./data` | Được mount vào phân vùng an toàn, phân quyền `chmod 700` | **Cao** |
| 7 | File `.env` chứa mật khẩu | Đã nằm trong `.gitignore`, không đưa lên Git công khai | **Nghiêm trọng** |
| 8 | Webhook CI/CD Token | Giữ bí mật, không ghi vào tài liệu public | **Trung bình** |
| 9 | Kiểm toán An ninh tự động | Tab **Security Audit** trên Admin Panel đạt điểm **Grade A** | **Cao** |
| 10 | Sao lưu dữ liệu dự phòng | Đã tải file JSON Backup dự phòng qua nút **Export JSON** | **Trung bình** |

---

*Tài liệu được cập nhật và kiểm duyệt theo tiêu chuẩn an ninh Homelab 2026.*
