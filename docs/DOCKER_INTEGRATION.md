# 🐳 Hướng Dẫn Tích Hợp Docker Engine & Tự Động Hóa Nhãn (Labels)

**Service Hub** tích hợp cơ chế giao tiếp trực tiếp với Docker Engine Daemon trên máy chủ thông qua Unix Socket (`/var/run/docker.sock`). Nhờ đó, ứng dụng có thể:
1. Tự động phát hiện (Auto-Discovery) mọi container đang chạy hoặc đã dừng.
2. Đọc thông số tài nguyên CPU, RAM, Network I/O thời gian thực.
3. Stream nhật ký (Logs) trực tiếp từ container ra giao diện web.
4. Cho phép khởi động lại (Restart) container chỉ với một nút bấm an toàn.

---

## 1. Cơ chế hoạt động của Docker Socket

Khi bạn mount `/var/run/docker.sock:/var/run/docker.sock:ro` vào container của Service Hub:
- Cờ `:ro` (Read-Only) đảm bảo container chỉ đọc thông tin và không thể chỉnh sửa file socket của hệ điều hành chủ.
- Backend của Service Hub gửi các HTTP request tiêu chuẩn theo chuẩn **Docker Engine API v1.40+** để lấy danh sách container và thông số hệ thống.

```text
┌───────────────────────────┐         Unix Socket         ┌───────────────────────────┐
│     Service Hub Portal    │  ─────────────────────────> │    Docker Daemon Host     │
│   (Backend in Node.js)    │   /var/run/docker.sock:ro   │     (dockerd process)     │
└───────────────────────────┘                             └───────────────────────────┘
```

---

## 2. Tự động hóa cấu hình bằng Docker Labels

Bạn có thể gắn thêm các nhãn (Labels) trực tiếp vào các service khác trong file `docker-compose.yml` của mình. Service Hub sẽ tự động nhận diện và gán đúng tên, icon, danh mục, mô tả mà bạn không cần phải nhập tay!

### Bảng danh sách các nhãn hỗ trợ:

| Tên nhãn (Docker Label) | Ví dụ giá trị | Ý nghĩa & Mô tả |
| :--- | :--- | :--- |
| `servicehub.enable` | `"true"` | Cho phép Service Hub nhận diện container này. |
| `servicehub.name` | `"Nextcloud"` | Tên hiển thị trên thẻ flashcard. |
| `servicehub.title` | `"Nextcloud Hub"` | Tiêu đề chi tiết của dịch vụ. |
| `servicehub.description`| `"Lưu trữ đám mây cá nhân"`| Mô tả ngắn gọn về dịch vụ. |
| `servicehub.category` | `"Storage"` | Nhóm danh mục (ví dụ: Media, Storage, DevOps...). |
| `servicehub.icon` | `"Cloud"` | Tên icon Lucide (hoặc đường dẫn URL ảnh PNG/SVG). |
| `servicehub.port` | `"8080"` | Cổng truy cập chính của dịch vụ. |
| `servicehub.tags` | `"cloud, sync, files"` | Các từ khóa tìm kiếm phân cách bằng dấu phẩy. |

---

## 3. Ví dụ thực tế trong `docker-compose.yml`

Dưới đây là mẫu một file `docker-compose.yml` tích hợp nhãn Service Hub cho các ứng dụng phổ biến:

```yaml
version: '3.8'

services:
  # 1. Ứng dụng Nextcloud
  nextcloud:
    image: nextcloud:latest
    container_name: nextcloud-app
    restart: unless-stopped
    ports:
      - "8080:80"
    labels:
      - "servicehub.enable=true"
      - "servicehub.name=Nextcloud"
      - "servicehub.title=Nextcloud Private Cloud"
      - "servicehub.description=Đồng bộ dữ liệu, lịch và danh bạ tự lưu trữ"
      - "servicehub.category=Storage"
      - "servicehub.icon=Cloud"
      - "servicehub.port=8080"
      - "servicehub.tags=cloud, files, backup"

  # 2. Ứng dụng Pi-hole
  pihole:
    image: pihole/pihole:latest
    container_name: pihole-dns
    restart: unless-stopped
    ports:
      - "8081:80"
      - "53:53/tcp"
      - "53:53/udp"
    labels:
      - "servicehub.enable=true"
      - "servicehub.name=Pi-hole"
      - "servicehub.title=Pi-hole DNS Sinkhole"
      - "servicehub.description=Chặn quảng cáo và mã độc trên toàn bộ mạng LAN"
      - "servicehub.category=Networking"
      - "servicehub.icon=Shield"
      - "servicehub.port=8081"
      - "servicehub.tags=dns, adblock, security"

  # 3. Ứng dụng Home Assistant
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant-hub
    restart: unless-stopped
    network_mode: host
    labels:
      - "servicehub.enable=true"
      - "servicehub.name=Home Assistant"
      - "servicehub.title=Smart Home Automation"
      - "servicehub.description=Trung tâm điều khiển nhà thông minh và IoT"
      - "servicehub.category=IoT"
      - "servicehub.icon=Home"
      - "servicehub.port=8123"
```

---

## 4. Quét & Nhập container từ trang Admin

1. Đăng nhập vào trang **Admin Dashboard** (`/admin`).
2. Chọn tab **"Docker Discovery"**.
3. Bạn sẽ thấy danh sách toàn bộ container đang chạy trên hệ thống:
   - Các container đã được import vào portal sẽ có dấu tích màu xanh lá.
   - Các container mới phát hiện sẽ có nút **"Import Service"**.
4. Bấm **"Import Service"**: Hệ thống sẽ tự động điền sẵn tên, port, danh mục và icon tương ứng. Bạn chỉ cần bấm lưu là thẻ sẽ xuất hiện ngay lập tức trên trang chủ!
