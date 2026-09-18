# 📚 Tài Liệu Đặc Tả Kỹ Thuật REST API (API Reference)

Tất cả các API của **Service Hub** trả về định dạng `application/json` và sử dụng các mã HTTP chuẩn (200, 201, 400, 401, 404, 500).

---

## 1. Dịch Vụ Công Cộng (Public Endpoints)

### 1.1. Lấy danh sách dịch vụ
```http
GET /api/services
```
**Response (200 OK):**
```json
{
  "services": [
    {
      "id": "srv-01",
      "name": "Nextcloud",
      "title": "Nextcloud Hub",
      "description": "Lưu trữ đám mây cá nhân",
      "url": "http://192.168.1.50:8080",
      "category": "Storage",
      "icon": "Cloud",
      "port": 8080,
      "healthCheckUrl": "http://192.168.1.50:8080",
      "tags": ["cloud", "files"],
      "display_order": 0
    }
  ]
}
```

---

### 1.2. Kiểm tra trạng thái một dịch vụ (Health Check)
```http
POST /api/services/:id/health
```
**Response (200 OK):**
```json
{
  "serviceId": "srv-01",
  "status": "online",
  "latencyMs": 14,
  "httpStatus": 200,
  "message": "HTTP 200 OK (14ms)",
  "lastChecked": "2026-09-17T23:00:00.000Z"
}
```

---

### 1.3. Lấy thông tin thời tiết
```http
GET /api/weather?city=Hanoi
```
**Query Parameters:**
- `city`: Tên thành phố (ví dụ `Hanoi`, `Hochiminh`, `Danang`, `Tokyo`, `Singapore`, `London`, `Newyork`).
- `lat`, `lon` *(tùy chọn)*: Tọa độ địa lý cụ thể.

**Response (200 OK):**
```json
{
  "city": "Hà Nội",
  "temperature": 28,
  "feelsLike": 30,
  "weatherCode": 1,
  "weatherDescription": "Nắng nhẹ, ít mây (Partly Cloudy)",
  "weatherIcon": "CloudSun",
  "humidity": 65,
  "windSpeed": 12,
  "unit": "C",
  "lastUpdated": "2026-09-17T23:00:00.000Z"
}
```

---

## 2. Công Cụ Mạng (Network Tools)

### 2.1. Phát sóng gói tin Wake-on-LAN
```http
POST /api/network/wol
Content-Type: application/json
```
**Request Body:**
```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "broadcastIp": "192.168.1.255",
  "port": 9
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Đã phát sóng gói tin Magic Packet thành công đến AA:BB:CC:DD:EE:FF (Broadcast: 192.168.1.255:9)",
  "mac": "AA:BB:CC:DD:EE:FF",
  "broadcastIp": "192.168.1.255",
  "port": 9,
  "timestamp": "2026-09-17T23:00:00.000Z"
}
```

---

### 2.2. Dò cổng TCP (TCP Ping)
```http
POST /api/network/tcp-ping
Content-Type: application/json
```
**Request Body:**
```json
{
  "host": "192.168.1.1",
  "port": 80,
  "timeoutMs": 2500
}
```
**Response (200 OK):**
```json
{
  "status": "open",
  "latencyMs": 3,
  "message": "Cổng TCP 80 trên host 192.168.1.1 đang MỞ (phản hồi trong 3ms)",
  "host": "192.168.1.1",
  "port": 80,
  "timestamp": "2026-09-17T23:00:00.000Z"
}
```

---

### 2.3. Quản lý danh bạ thiết bị mạng
- `GET /api/network/devices`: Lấy danh sách thiết bị đã lưu.
- `POST /api/network/devices`: Thêm mới hoặc cập nhật thiết bị.
- `DELETE /api/network/devices/:id`: Xóa thiết bị khỏi danh bạ.
- `POST /api/network/devices/:id/wol`: Gửi gói tin Magic Packet đến thiết bị cụ thể theo ID.
- `POST /api/network/devices/:id/ping`: Đo độ trễ cổng TCP của thiết bị cụ thể theo ID.

---

## 3. Webhook CI/CD Endpoint

Cho phép pipeline tự động đăng ký hoặc cập nhật dịch vụ:

```http
POST /api/webhook/service
Content-Type: application/json
X-Webhook-Token: your_secret_webhook_token_here
```

**Request Body:**
```json
{
  "name": "Grafana",
  "title": "Grafana Monitoring",
  "description": "Bảng điều khiển trực quan hóa số liệu",
  "url": "http://192.168.1.50:3000",
  "category": "Monitoring",
  "icon": "Activity",
  "port": 3000,
  "healthCheckUrl": "http://192.168.1.50:3000/api/health",
  "tags": ["metrics", "prometheus", "alerts"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Service Grafana registered successfully via webhook",
  "service": { ... }
}
```

---

## 4. Xác Thực Quản Trị (Admin Authentication & JWT)

### 4.1. Đăng nhập Admin
```http
POST /api/auth/login
Content-Type: application/json
```
**Request Body:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```
**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

### 4.2. Gọi các API Quản trị
Thêm header xác thực vào mọi request yêu cầu quyền admin:
```http
Authorization: Bearer <TOKEN_NHẬN_ĐƯỢC>
```

- `POST /api/admin/services`: Thêm dịch vụ thủ công.
- `PUT /api/admin/services/:id`: Chỉnh sửa dịch vụ.
- `DELETE /api/admin/services/:id`: Xóa dịch vụ.
- `POST /api/admin/services/reorder`: Lưu thứ tự sắp xếp dịch vụ.
- `GET /api/admin/docker/containers`: Quét danh sách container từ Docker socket.
- `POST /api/admin/docker/restart/:id`: Khởi động lại container Docker.
- `GET /api/admin/docker/logs/:id`: Xem 100 dòng log gần nhất của container.
- `GET /api/admin/export`: Xuất file backup JSON toàn bộ hệ thống.
- `POST /api/admin/import`: Nhập file backup JSON.
- `POST /api/admin/webhook/regenerate`: Cấp lại mã Webhook Token mới.
