# ⚡ Hướng Dẫn Cấu Hình Wake-on-LAN (WoL) & Kiểm Tra Mạng (TCP Ping)

Tính năng **Wake-on-LAN (WoL)** và **TCP Port Ping** trong Service Hub giúp bạn biến bảng điều khiển thành trung tâm điều khiển mạng nội bộ (Network Command Center) mạnh mẽ, có khả năng đánh thức máy chủ ngủ quên và kiểm tra tình trạng kết nối tới từng dịch vụ trong Homelab.

---

## 1. Wake-on-LAN (WoL) hoạt động như thế nào?

Wake-on-LAN dựa trên việc card mạng (NIC) của máy chủ vẫn duy trì một dòng điện nhỏ ở trạng thái chờ khi máy tính tắt hoặc ở chế độ ngủ (S3 Sleep, S4 Hibernate, hoặc S5 Soft-Off).

Khi bạn bấm nút **"Đánh thức (WoL)"**, Service Hub sẽ tạo một gói tin đặc biệt gọi là **Magic Packet**:
- Gói tin gồm **6 byte giá trị `0xFF`** (`FF FF FF FF FF FF`).
- Tiếp theo là **16 lần lặp liên tiếp địa chỉ MAC (48-bit hex)** của card mạng máy đích.
- Gói tin được đóng gói trong giao thức UDP (thường gửi qua cổng 9 hoặc 7) và phát sóng (Broadcast) trên toàn bộ dải mạng LAN.
- Khi card mạng của máy chủ nhận diện đúng địa chỉ MAC của mình lặp lại 16 lần, nó sẽ kích hoạt chân cắm nguồn trên bo mạch chủ (Motherboard) để khởi động máy tính.

---

## 2. Các bước bật Wake-on-LAN trên máy đích

Để máy chủ của bạn có thể nhận lệnh đánh thức, bạn cần bật tính năng này ở cả cấp độ phần cứng (BIOS) và hệ điều hành (OS).

### Bước 2.1: Bật trong BIOS / UEFI Bo mạch chủ
1. Khởi động lại máy tính cần đánh thức, nhấn phím `Del`, `F2`, hoặc `F12` để vào cài đặt BIOS/UEFI.
2. Tìm đến mục **Power Management** hoặc **Advanced Settings**.
3. Bật các tùy chọn liên quan đến:
   - **Wake on LAN (WoL)**: `Enabled`
   - **Power On By PCIE/PCI Devices**: `Enabled`
   - **EuP / ErP Ready**: `Disabled` *(Lưu ý: Nếu bật ErP, máy sẽ ngắt hoàn toàn nguồn cấp cho card mạng khi tắt, khiến WoL không hoạt động)*.
4. Lưu và khởi động lại (`F10`).

### Bước 2.2: Bật trên hệ điều hành Linux (Ubuntu / Debian / Proxmox)
Kiểm tra tên card mạng:
```bash
ip link
```
*(Giả sử card mạng của bạn tên là `eth0` hoặc `enp3s0`)*.

Cài đặt công cụ `ethtool` và kiểm tra trạng thái WoL:
```bash
sudo apt install ethtool -y
sudo ethtool enp3s0 | grep Wake-on
```
Nếu dòng `Wake-on: d` (disabled), hãy kích hoạt bằng lệnh:
```bash
sudo ethtool -s enp3s0 wol g
```
Để giữ cấu hình này sau mỗi lần reboot, bạn có thể tạo một systemd service hoặc cấu hình trong file `/etc/network/interfaces`.

### Bước 2.3: Bật trên Windows Server / Windows 10/11
1. Mở **Device Manager** > Tìm đến mục **Network adapters**.
2. Chuột phải vào card mạng LAN (Realtek / Intel...) > Chọn **Properties**.
3. Ở tab **Advanced**:
   - Tìm mục **Wake on Magic Packet** > Chọn `Enabled`.
   - Tìm mục **Shutdown Wake-On-Lan** > Chọn `Enabled`.
4. Ở tab **Power Management**:
   - Tích chọn: `Allow this device to wake the computer`.
   - Tích chọn: `Only allow a magic packet to wake the computer`.

---

## 3. Tìm địa chỉ MAC & Tính toán Broadcast IP

- **Tìm địa chỉ MAC**:
  - Trên Linux: `ip link` hoặc `cat /sys/class/net/eth0/address`
  - Trên Windows: `getmac /v` hoặc `ipconfig /all`
  - Định dạng chuẩn: `AA:BB:CC:DD:EE:FF` hoặc `AA-BB-CC-DD-EE-FF`.

- **Địa chỉ Broadcast IP**:
  - Thông thường trong mạng gia đình: Nếu IP máy là `192.168.1.50` (Subnet mask `255.255.255.0`), thì địa chỉ Broadcast là `192.168.1.255`.
  - Bạn cũng có thể dùng địa chỉ Global Broadcast: `255.255.255.255`.

---

## 4. Sử dụng công cụ trên Service Hub

1. Nhấp vào nút **"⚡ WoL & TCP Tools"** trên thanh điều hướng hoặc trên Mini-Dashboard.
2. Cửa sổ công cụ sẽ mở ra với 3 tab:
   - **Thiết bị mạng đã lưu**: Danh bạ các thiết bị trong nhà (NAS, Proxmox, Switch, Printer) kèm nút **"Đánh thức"** và **"Ping TCP"** 1 chạm.
   - **Gửi Magic Packet WoL tự do**: Nhập MAC address bất kỳ và bấm gửi ngay lập tức.
   - **Dò cổng TCP / Ping Host**: Nhập IP và Port (ví dụ `192.168.1.1:80` hoặc `192.168.1.180:9100`) để đo độ trễ kết nối.

---

## 5. Danh sách các cổng TCP thông dụng trong Homelab

| Tên dịch vụ | Cổng mặc định | Công dụng |
| :--- | :--- | :--- |
| **HTTP Web** | `80` | Trang web thông thường / Dashboard router |
| **HTTPS SSL** | `443` | Trang web bảo mật SSL / NAS WebUI |
| **SSH** | `22` | Quản trị dòng lệnh máy chủ Linux / Switch |
| **SMB / CIFS** | `445` | Chia sẻ file ổ cứng mạng Windows / Samba |
| **DNS** | `53` | Máy chủ phân giải tên miền Pi-hole / AdGuard |
| **RDP** | `3389` | Điều khiển máy tính từ xa Windows Remote Desktop |
| **Network Printer** | `9100` | In ấn mạng RAW qua cổng JetDirect |
| **Proxmox VE** | `8006` | Giao diện quản trị máy ảo Hypervisor |
| **Portainer CE** | `9443` | Giao diện quản lý Docker Container |
| **Synology DSM** | `5000` / `5001` | Giao diện hệ điều hành ổ cứng mạng Synology NAS |
