# Security Policy & Vulnerability Reporting

## Supported Versions

Các phiên bản Service Hub được hỗ trợ bản vá an ninh:

| Phiên bản | Hỗ trợ bảo mật |
| :--- | :--- |
| `latest` (main) | :white_check_mark: Được hỗ trợ cập nhật vá lỗi |
| `v1.x` | :white_check_mark: Được hỗ trợ các lỗi nghiêm trọng |
| `< v1.0` | :x: Ngừng hỗ trợ |

---

## Báo cáo Lỗ hổng Bảo mật (Reporting a Vulnerability)

Nếu bạn phát hiện bất kỳ lỗ hổng bảo mật nào trong **Service Hub & Homelab Portal**, vui lòng thực hiện theo quy trình **Responsible Disclosure (Tiết lộ có trách nhiệm)**:

1. **KHÔNG** tạo Public Issue trên GitHub để công khai lỗ hổng trước khi có bản vá.
2. Gửi email chi tiết về mã lỗi, các bước tái hiện (Proof-of-Concept) tới: `security@service-hub.local` (hoặc liên hệ riêng qua GitHub Security Advisories).
3. Nhóm phát triển sẽ phản hồi trong vòng **48 giờ** và cung cấp bản vá trong thời gian sớm nhất.

---

## Mô hình Nguy cơ & Bề mặt Tấn công (Threat Model)

Trong môi trường máy chủ gia đình (Homelab) hoặc VPS, Service Hub đóng vai trò là cổng điều hướng trung tâm (Unified Gateway), có khả năng giao tiếp với Docker daemon và các thiết bị mạng LAN. Do đó, các bề mặt rủi ro chính bao gồm:

### 1. Docker Socket (`/var/run/docker.sock`)
* **Nguy cơ**: Docker Socket cấp quyền tương đương `root` trên máy chủ host. Nếu một ứng dụng có quyền ghi vào socket bị chiếm quyền, kẻ tấn công có thể tạo container độc hại và thoát vùng cách ly (container breakout).
* **Biện pháp phòng thủ mặc định của dự án**:
  * Mã nguồn dự án chỉ sử dụng các truy vấn **GET** (read-only) để đọc danh sách container, trạng thái (`/containers/json`), và thông số tài nguyên (`/containers/{id}/stats`).
  * File cấu hình mẫu `docker-compose.yml` luôn gắn cờ `:ro` (Read-Only):
    ```yaml
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ```
  * Khuyến nghị triển khai thêm **Docker Socket Proxy** (`tecnativa/docker-socket-proxy`) để lọc chỉ mở các HTTP endpoint an toàn.

### 2. Thông tin Quản trị viên & Khóa JWT (Admin Credentials & Session Tokens)
* **Nguy cơ**: Sử dụng mật khẩu mặc định (`admin` / `admin123_doi_ngay_khi_dung`) hoặc chuỗi `JWT_SECRET` mặc định dẫn đến việc kẻ xấu có thể đoán mật khẩu hoặc giả mạo token đăng nhập.
* **Biện pháp phòng thủ của dự án**:
  * Mật khẩu được băm bằng thuật toán **Bcrypt** an toàn.
  * Cơ chế **Anti-Brute Force**: Tự động khóa IP trong **15 phút** nếu đăng nhập thất bại liên tiếp 5 lần.
  * JWT Token có thời hạn sử dụng giới hạn (**24 giờ**) và cookie lưu trữ được gắn cờ `HttpOnly`, `SameSite=Lax`.
  * Tính năng **Security Audit Tab** trong Admin Panel tự động cảnh báo đỏ nếu phát hiện hệ thống còn dùng mật khẩu hoặc JWT mặc định.

### 3. Công cụ Mạng: Wake-on-LAN & TCP Ping (SSRF & DoS Prevention)
* **Nguy cơ**: Tính năng dò cổng TCP có thể bị lạm dụng để tấn công Server-Side Request Forgery (SSRF) vào các dịch vụ nội bộ hoặc Cloud Metadata (AWS/GCP/Azure 169.254.169.254). Gói tin Wake-on-LAN có thể bị spam gây nghẽn mạng LAN.
* **Biện pháp phòng thủ của dự án**:
  * **SSRF Protection Guard**: Tự động chặn các yêu cầu quét đến địa chỉ Cloud Metadata `169.254.169.254`, `metadata.google.internal`, link-local IP.
  * **Rate Limiting**: Giới hạn tần suất tối đa **40 lượt TCP ping/phút** và **15 lượt WoL packet/phút** theo từng địa chỉ IP.
  * **Admin Authorization**: Chỉ quản trị viên đã đăng nhập mới có quyền thêm, sửa hoặc xóa thiết bị trong sổ danh bạ mạng nội bộ.

### 4. HTTP Security Headers
Hệ thống tự động trả về các Header bảo mật theo tiêu chuẩn OWASP:
* `X-Content-Type-Options: nosniff` (Chống đánh tráo định dạng MIME)
* `X-Frame-Options: SAMEORIGIN` (Chống tấn công Clickjacking)
* `X-XSS-Protection: 1; mode=block` (Chống XSS phản chiếu)
* `Referrer-Policy: strict-origin-when-cross-origin`

---

## Hướng dẫn Thắt chặt An ninh Khuyến nghị (Hardening Checklist)

1. [ ] **Đổi mật khẩu ngay**: Đổi mật khẩu ngay lần đăng nhập đầu tiên hoặc khai báo `ADMIN_PASSWORD` trong `.env`.
2. [ ] **Tạo khóa bí mật JWT ngẫu nhiên**: Tạo chuỗi ký tự ngẫu nhiên tối thiểu 32 ký tự cho `JWT_SECRET`.
3. [ ] **Không mở cổng (Port Forward) 3000 trực tiếp ra ngoài Internet**: Sử dụng **Cloudflare Tunnel** (Zero Trust) hoặc VPN (**Tailscale / WireGuard**).
4. [ ] **Triển khai Reverse Proxy với HTTPS**: Sử dụng **Nginx Proxy Manager**, **Caddy** hoặc **Traefik** để tự động cấp phát chứng chỉ SSL/TLS miễn phí từ Let's Encrypt.
5. [ ] **Mount Docker socket ở chế độ `:ro`**: Đảm bảo không bỏ cờ `:ro` trong file `docker-compose.yml`.

> 💡 Xem hướng dẫn cấu hình từng bước chi tiết tại [Tài liệu Thắt chặt An ninh (docs/SECURITY_HARDENING.md)](docs/SECURITY_HARDENING.md).
