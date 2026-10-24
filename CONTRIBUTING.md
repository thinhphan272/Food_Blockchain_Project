# TIÊU CHUẨN KỸ THUẬT & QUY TRÌNH PHỐI HỢP DỰ ÁN
## PROJECT DEVELOPMENT WORKFLOW & COLLABORATION GUIDELINES
> **Dự án:** Hệ thống Quản trị & Truy xuất Nguồn gốc Thực phẩm Đa Ngành Hàng Siêu thị (SmartChain Traceability)  
> **Tech Lead & Repository Maintainer:** Thịnh Phan (GitHub: `@thinhphan272`)  
> **Phạm vi áp dụng:** Toàn bộ thành viên đội ngũ phát triển (Dev 1, Dev 2, Dev 3)  
> **Tiêu chuẩn vận hành:** Monorepo Architecture | Contract-First Development | Enterprise Git Flow

---

## 1. TỔNG QUAN HỆ THỐNG & MỤC TIÊU DỰ ÁN

Dự án **SmartChain Supermarket Food Traceability** là giải pháp chuyển đổi số toàn diện cho chuỗi cung ứng lạnh thực phẩm siêu thị từ Nông trại đến Bàn ăn (**Farm to Fork**).

Hệ thống tích hợp 3 trụ cột công nghệ cốt lõi:
1. **Internet of Things (IoT Edge & Wokwi Simulator):** Giám sát vi khí hậu liên tục 5s/lần (nhiệt độ đa dải từ $-30^\circ\text{C}$ đến $+85^\circ\text{C}$, khí sinh học $NH_3$/TMA/Ethylene, tải trọng Loadcell, công tắc niêm phong cửa); kích hoạt còi cảnh báo tại chỗ và điều khiển phản xạ Rơ-le cưỡng bức hai chiều.
2. **Sổ Cái Khối Bất Biến (Supply Chain Blockchain Ledger):** Toàn bộ dữ liệu chứng nhận VietGAP, nhật ký canh tác và kết quả đối soát vi khí hậu được băm SHA-256, tổ chức theo Cây Merkle và ký số điện tử RSA/ECC, bảo đảm tính minh bạch tuyệt đối và chống gian lận tem nhãn.
3. **Lưu Trữ Đa Mô Hình (Polyglot NoSQL Persistence):** Tối ưu hóa phân chia dữ liệu trên 5 công cụ CSDL chuyên biệt:
   - **MySQL 8.0:** Quản trị phân quyền RBAC và cấu hình ngưỡng bảo quản chuẩn 6 ngành hàng (`storage_profiles`).
   - **MongoDB 6.0:** Lưu trữ hồ sơ Lô hàng Đa hình (Polymorphic Documents) và Sổ cái khối Blockchain.
   - **Redis 7.0:** Cache vi khí hậu thời gian thực, bảng xếp hạng rủi ro (Sorted Set), và Khóa phân tán Redlock chống bán trùng tem POS.
   - **Apache Cassandra 4.1:** Lưu trữ Big Data Time-Series hàng triệu bản ghi cảm biến không bao giờ nghẽn.
   - **Neo4j 5.x:** Lưu trữ đồ thị chuỗi cung ứng đa tầng, thực thi truy vấn Cypher thu hồi khẩn cấp (*Emergency Recall*) dưới **0.02 giây**.

---

## 2. CƠ CẤU PHÂN CHIA VAI TRÒ & PHÂN HỆ PHỤ TRÁCH

Hệ thống được thiết kế theo cấu trúc **Monorepo** với ranh giới phân tách vật lý rõ ràng để loại trừ hoàn toàn nguy cơ xung đột mã nguồn:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CƠ CẤU PHÂN CÔNG KỸ SƯ PHÁT TRIỂN                               │
├─────────────────────┬───────────────────┬──────────────────────────────────────────────┤
│ Thành viên          │ Chức danh kỹ thuật│ Phân hệ phụ trách & Trọng tâm công việc      │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ **Thịnh Phan**      │ **Tech Lead &     │ Thư mục: `backend/`, `docker/`               │
│ (@thinhphan272)     │ Backend Architect │ - Quản trị kiến trúc hệ thống, Review & Merge│
│                     │                   │ - Spring Boot 3.x, Security JWT, MQTT Paho   │
│                     │                   │ - Tích hợp 5 Database NoSQL, Blockchain Core │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ **Dev 2**           │ **Frontend Lead   │ Thư mục: `frontend/`                         │
│ (Kỹ sư Frontend)    │ (UI/UX & PWA)**   │ - React 18+ (Vite) & TailwindCSS             │
│                     │                   │ - Biểu đồ Realtime Chart.js & Bản đồ Leaflet │
│                     │                   │ - Tích hợp quét mã QR Camera & Web POS       │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ **Dev 3**           │ **IoT & Embedded  │ Thư mục: `firmware/`, `scripts/`             │
│ (Kỹ sư Phần cứng)   │ Systems Lead**    │ - Lập trình C++ ESP32 trên PlatformIO & Wokwi│
│                     │                   │ - Thu thập cảm biến DHT22, biến trở Gas/Load │
│                     │                   │ - Màn hình OLED SSD1306, Còi, Rơ-le Actuator │
└─────────────────────┴───────────────────┴──────────────────────────────────────────────┘
```

---

## 3. THIẾT LẬP MÔI TRƯỜNG PHÁT TRIỂN (ENVIRONMENT SETUP)

Mọi thành viên thực hiện chuẩn hóa môi trường làm việc trên máy tính cá nhân theo 3 bước:

### Bước 1: Yêu cầu cài đặt công cụ
- **Git:** Quản lý mã nguồn phân tán.
- **Docker Desktop:** Ảo hóa cụm 5 CSDL NoSQL và Message Broker.
- **Visual Studio Code (VSCode):** IDE phát triển chính.

### Bước 2: Clone mã nguồn dự án
```bash
# Clone kho mã nguồn về máy tính cá nhân
git clone https://github.com/thinhphan272/Food_Blockchain_Project.git
cd Food_Blockchain_Project

# Khởi tạo file biến môi trường cục bộ
cp .env.example .env
```

### Bước 3: Khởi chạy cụm Cơ sở Dữ liệu qua Docker Compose
```bash
docker compose up -d
```
*Kiểm tra trạng thái:* Chạy lệnh `docker compose ps` để bảo đảm cả 6 container (`mosquitto`, `mysql`, `mongodb`, `redis`, `cassandra`, `neo4j`) đều ở trạng thái `Up`.

---

## 4. CHIẾN LƯỢC PHÁT TRIỂN ĐỘC LẬP (DECOUPLED PARALLEL DEVELOPMENT)

Để đẩy nhanh tiến độ và không bị phụ thuộc vào tiến độ của nhau, dự án áp dụng chiến lược **Contract-First & Mocking**:

### 🎯 Phân hệ Frontend (Dev 2):
- Vào thư mục `frontend/`, chạy `npm install` và `npm run dev`.
- Trong file `frontend/.env`, cờ `VITE_USE_MOCK=true` đã được kích hoạt sẵn:
  - Mọi API và luồng WebSocket sẽ được giả lập tự động từ file `frontend/src/services/mockData.js`.
  - Kỹ sư Frontend hoàn toàn tự chủ xây dựng $100\%$ giao diện, biểu đồ động, giao diện quét mã QR và thu ngân POS mà **không cần chờ Backend triển khai**.

### 🎯 Phân hệ IoT Firmware (Dev 3):
- Vào thư mục `firmware/`, mở file `diagram.json` trên VSCode, khởi chạy Wokwi Simulator.
- Sử dụng lệnh Mosquitto CLI để kiểm tra đường truyền gói tin và kiểm tra cơ cấu chấp hành:
  ```bash
  # Theo dõi dữ liệu Telemetry ESP32 gửi lên
  docker exec -it smartchain-mosquitto mosquitto_sub -t "smartchain/telemetry/#" -v

  # Giả lập lệnh từ xa kích hoạt Rơ-le cưỡng bức
  docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/cmd" -m '{"action": "RELAY_ON"}'
  ```

### 🎯 Phân hệ Backend (Thịnh Phan):
- Khởi chạy script giả lập thiết bị IoT:
  ```bash
  python scripts/mock_iot_telemetry.py
  ```
- Script tự động sinh số liệu vi khí hậu định kỳ 5s để phục vụ kiểm thử phân hệ Ingestion, Cassandra, Redis và thuật toán Blockchain mà không cần mở phần cứng mô phỏng.

---

## 5. QUY CHUẨN ĐÓNG GÓP MÃ NGUỒN (ENTERPRISE GIT FLOW)

Dự án áp dụng mô hình **Trunk-Based Development kết hợp Branch Protection**:

```
[Nhánh main được bảo vệ] ───(git checkout -b)───> [Nhánh feature/task-XX]
                                                            │
                                                   (Lập trình & Tự kiểm thử)
                                                            │
                                                   (git commit & git push)
                                                            │
                                                            ▼
[Nhánh main] <───(Code Review & Squash Merge)─── [Tạo Pull Request trên GitHub]
```

### 5.1. Quy định về Nhánh (Branching Convention)
- **Tuyệt đối không commit hoặc push trực tiếp lên nhánh `main`.**
- Tên nhánh phải bắt đầu bằng loại công việc và gắn mã Task:
  - Tính năng mới: `feature/task-{Mã_Task}-{tên-ngắn-gọn}` (Ví dụ: `feature/task-03-init-react-vite`)
  - Sửa lỗi: `bugfix/task-{Mã_Task}-{mô-tả-lỗi}` (Ví dụ: `bugfix/task-12-fix-redis-timeout`)

### 5.2. Quy chuẩn Thông điệp Commit (Commit Message Standard)
Mọi commit bắt buộc phải có mã Task để phục vụ truy vết lịch sử:
$$\mathbf{[TASK-XX] \ \text{type: Mô tả súc tích công việc đã thực hiện}}$$

*Ví dụ chuẩn:*
- `[TASK-03] feat: Khoi tao du an React Vite va cau hinh TailwindCSS`
- `[TASK-08] feat: Doc cam bien DHT22 bien tro va xuat thong so len OLED`
- `[TASK-11] feat: Cai dat Entity va Repository luu Telemetry vao Cassandra`

### 5.3. Tiêu Chuẩn Tạo Pull Request (PR Acceptance Criteria)
Khi hoàn thành một Task, kỹ sư thực hiện:
1. Đối chiếu kết quả với bảng kiểm thử trong file `docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md`.
2. Chụp ảnh màn hình hoặc trích xuất log terminal chứng minh tính năng hoạt động đạt chuẩn.
3. Tạo Pull Request trên GitHub, điền đầy đủ Checklist theo mẫu template có sẵn và gán Reviewer `@thinhphan272`.
4. Tech Lead sẽ tiến hành Code Review và hợp nhất vào nhánh `main` thông qua phương thức **Squash and Merge**.

---

## 6. DANH MỤC TÀI LIỆU KỸ THUẬT NỘI BỘ (THƯ MỤC `docs/`)

Mọi chi tiết kiến trúc, bảng mã lỗi và kịch bản demo được lưu trữ tập trung tại:
- 📘 [docs/KE_HOACH_KIEN_TRUC_HE_THONG_BLOCKCHAIN_IOT_NOSQL.md](docs/KE_HOACH_KIEN_TRUC_HE_THONG_BLOCKCHAIN_IOT_NOSQL.md): Bản kế hoạch kiến trúc chi tiết 5 tầng, 6 ngành hàng thực phẩm siêu thị, cấu trúc mạch Wokwi và kịch bản demo.
- 📋 [docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md](docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md): Danh mục phân rã 30 Task chi tiết và lộ trình triển khai 4 tuần.
- 🧪 [docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md](docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md): Bảng kế hoạch kiểm thử tự thân cho từng task cụ thể.
- ⚙️ [docs/TONG_HOP_TOAN_BO_CONG_NGHE_HE_THONG.md](docs/TONG_HOP_TOAN_BO_CONG_NGHE_HE_THONG.md): Danh mục toàn bộ các công nghệ, thư viện, cổng kết nối và giao thức mạng.

---
*(Quy chuẩn này là văn bản điều hành kỹ thuật bắt buộc áp dụng xuyên suốt vòng đời phát triển dự án)*
