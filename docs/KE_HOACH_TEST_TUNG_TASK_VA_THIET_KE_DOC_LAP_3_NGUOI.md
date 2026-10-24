# KẾ HOẠCH KIỂM THỬ TỪNG TASK & THIẾT KẾ PHÁT TRIỂN ĐỘC LẬP CHO NHÓM 3 NGƯỜI
## CHIẾN LƯỢC "CONTRACT-FIRST & ZERO-DEPENDENCY" — CODE RIÊNG BIỆT, TEST TỰ ĐỘNG, MERGE KHÔNG XUNG ĐỘT
> **Mã tài liệu:** TEST-PLAN-INDEPENDENT-WORKFLOW-2026  
> **Dự án:** Hệ thống Quản trị & Truy xuất Nguồn gốc Thực phẩm Đa Ngành Hàng Siêu thị (Blockchain + IoT + Polyglot NoSQL)  
> **Nguyên tắc cốt lõi:**  
> 1. **Phát triển Độc lập (Unblocked Parallelism):** 3 người làm song song 100%, không ai phải ngồi chờ người kia code xong mới làm được phần mình.  
> 2. **Kiểm thử Tự thân (Self-Verification):** Mỗi task đều có hướng dẫn test chi tiết (Input, Lệnh chạy, Output mong đợi). Đạt 100% tiêu chí mới được tạo Pull Request (PR).  
> 3. **Hợp nhất Liền mạch (Frictionless Merge):** Trưởng nhóm chỉ việc review code logic và bấm nút Merge, không cần tinh chỉnh hay sửa lỗi tích hợp.

---

## MỤC LỤC TỔNG QUAN

1. [PHẦN 1: CHIẾN LƯỢC THIẾT KẾ KIẾN TRÚC PHÁT TRIỂN ĐỘC LẬP (DECOUPLING STRATEGY)](#phần-1-chiến-lược-thiết-kế-kiến-trúc-phát-triển-độc-lập-decoupling-strategy)
   - 1.1. Tại sao các nhóm thường bị tắc nghẽn (Block) và giải pháp khắc phục triệt để?
   - 1.2. Bộ Hợp Đồng Giao Tiếp Bất Biến (Interface Contracts): REST API, MQTT Topics, WebSocket STOMP
   - 1.3. Cơ chế Mocking độc lập cho Dev 2 (Frontend Mock Mode)
   - 1.4. Cơ chế Giả lập IoT độc lập cho Dev 1 (Python / Mosquitto Mock Publisher)
   - 1.5. Cơ chế Giả lập Backend độc lập cho Dev 3 (Mosquitto Downlink CLI Tester)
2. [PHẦN 2: BẢNG KẾ HOẠCH TEST CHI TIẾT TỪNG TASK (TỰ KIỂM THỬ TRƯỚC KHI COMMIT)](#phần-2-bảng-kế-hoạch-test-chi-tiết-từng-task-tự-kiểm-thử-trước-khi-commit)
   - 2.1. Phân hệ Backend Java & Polyglot NoSQL (Dev 1 — Từ Task 01 đến Task 28)
   - 2.2. Phân hệ Frontend React Vite & PWA UI/UX (Dev 2 — Từ Task 03 đến Task 27)
   - 2.3. Phân hệ IoT Firmware Wokwi & QA (Dev 3 — Từ Task 04 đến Task 29)
3. [PHẦN 3: BỘ CÔNG CỤ TEST NHANH CHO TỪNG PHÂN HỆ (SCRIPTS & POSTMAN COLLECTION)](#phần-3-bộ-công-cụ-test-nhanh-cho-từng-phân-hệ-scripts--postman-collection)
   - 3.1. Script Mock IoT bắn dữ liệu tự động cho Dev 1 (`scripts/mock_iot_telemetry.py`)
   - 3.2. File cấu hình Mock API cho Dev 2 (`frontend/src/services/mockData.js`)
   - 3.3. Bộ lệnh CLI kiểm tra Wokwi tức thời cho Dev 3
4. [PHẦN 4: CHECKLIST BẮT BUỘC TRƯỚC KHI TẠO PULL REQUEST (PR TEMPLATE)](#phần-4-checklist-bắt-buộc-trước-khi-tạo-pull-request-pr-template)
5. [PHẦN 5: KỊCH BẢN KIỂM THỬ KHÓI TÍCH HỢP TOÀN HỆ THỐNG (SMOKE INTEGRATION TEST)](#phần-5-kịch-bản-kiểm-thử-khói-tích-hợp-toàn-hệ-thống-smoke-integration-test)

---

## PHẦN 1: CHIẾN LƯỢC THIẾT KẾ KIẾN TRÚC PHÁT TRIỂN ĐỘC LẬP (DECOUPLING STRATEGY)

### 1.1. Tại sao các nhóm thường bị tắc nghẽn (Block) và giải pháp khắc phục triệt để?

Trong đồ án kết hợp IoT + Backend + Frontend, các thành viên thường rơi vào "vòng luẩn quẩn phụ thuộc":
- *Dev 2 (Frontend) than thở:* "Chưa có API của Dev 1 thì làm sao em code giao diện và vẽ biểu đồ được?" $\rightarrow$ **Bị block!**
- *Dev 1 (Backend) than thở:* "Chưa có mạch Wokwi của Dev 3 gửi MQTT thì làm sao em test Cassandra và viết API Telemetry?" $\rightarrow$ **Bị block!**
- *Dev 3 (IoT) than thở:* "Chưa có Backend Java của Dev 1 gửi lệnh thì làm sao em test Rơ-le và còi báo động?" $\rightarrow$ **Bị block!**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               GIẢI PHÁP: PHÁ VỠ SỰ PHỤ THUỘC BẰNG "CONTRACT-FIRST"                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [Dev 2: Frontend React]          [HỢP ĐỒNG GIAO TIẾP]        [Dev 1: Backend Java]   │
│   Chạy với MOCK DATA               (Định nghĩa JSON,            Chạy với PYTHON MOCK    │
│   Code xong 100% UI,               Endpoints & Topics           Simulate MQTT, test     │
│   Biểu đồ, QR Scanner              ngay từ Ngày đầu tiên)       xong 100% 5 DB NoSQL   │
│            ▲                                                            ▲              │
│            │                                                            │              │
│            └──────────────────────────────┬─────────────────────────────┘              │
│                                           │                                            │
│                                [Dev 3: IoT Wokwi ESP32]                                │
│                                Chạy với MOSQUITTO CLI                                  │
│                                Test xong 100% cảm biến,                                │
│                                OLED, Buzzer & Relay                                    │
│                                                                                        │
│   ===> KHI CẢ 3 CODE XONG: TẮT MOCK -> GHÉP VÀO MAIN CHẠY NGAY MƯỢT MÀ!                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc triển khai:**
1. Ngay từ Ngày đầu tiên, nhóm thống nhất một **Hợp đồng giao tiếp (Interface Contract)** gồm danh sách URL API, cấu trúc JSON Request/Response, và định dạng bản tin MQTT.
2. Mỗi thành viên sử dụng công cụ Mock/Giả lập của riêng mình để tự kiểm thử độc lập mà không cần 2 thành viên kia phải chạy code.
3. Khi merge code vào nhánh `main`, chỉ cần chuyển cờ môi trường từ `MOCK=true` sang `MOCK=false`, toàn hệ thống sẽ khớp nối hoàn hảo như các khối xếp hình Lego!

---

### 1.2. Bộ Hợp Đồng Giao Tiếp Bất Biến (Interface Contracts)

Cả 3 thành viên cam kết tuân thủ $100\%$ các định dạng dữ liệu sau đây, không tự ý đổi tên trường:

#### A. Hợp đồng RESTful API giữa Frontend (Dev 2) và Backend (Dev 1):

| Phương thức & Endpoint | Mục đích nghiệp vụ | Dữ liệu gửi lên (Request JSON) | Dữ liệu trả về (Response JSON) & HTTP Status |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/auth/login` | Đăng nhập hệ thống | `{"username": "admin", "password": "123"}` | `{"token": "eyJhbGciOi...", "role": "ADMIN", "fullName": "Nguyen Van A"}` (200 OK) |
| `GET /api/v1/profiles` | Lấy danh mục ngưỡng bảo quản | *None* | `[{"categoryCode": "VEG_FRUIT", "minTemp": 8.0, "maxTemp": 12.0, "maxGas": 30.0, "gasType": "C2H4"}, ...]` (200 OK) |
| `POST /api/v1/batches` | Tạo lô hàng & Genesis Block | `{"category": "VEG_FRUIT", "productName": "Xa lach", "unitCount": 100, "farmId": "FARM-01", "details": {...}}` | `{"batchCode": "LOT-VEG-2026-001", "txHash": "3f9a7b...", "status": "CREATED"}` (201 Created) |
| `GET /api/v1/telemetry/latest/{batchCode}` | Lấy số đo vi khí hậu mới nhất | *None* (Đọc từ Redis) | `{"temp": 9.5, "hum": 90.0, "gas": 15.0, "gasType": "C2H4", "weightKg": 150.0, "doorOpen": false, "isBreached": false}` (200 OK) |
| `GET /api/v1/qc/audit/{batchCode}` | Đối soát lịch sử chuỗi lạnh 72h | *None* (Đọc từ Cassandra) | `{"batchCode": "LOT-VEG-2026-001", "ttiScore": 99.1, "breachCount": 0, "history": [{"time": "...", "temp": 9.5}, ...]}` (200 OK) |
| `POST /api/v1/pos/checkout` | Quét bán & Vô hiệu hóa tem | `{"serialCode": "QR-ITEM-VEG-001-005", "cashierId": "CASHIER-01"}` | Thành công: `{"status": "SOLD", "soldAt": "..."}` (200 OK)<br>Bị tái sử dụng: `{"error": "ALREADY_SOLD"}` (409 Conflict) |
| `POST /api/v1/recall` | Kích hoạt thu hồi khẩn cấp | `{"batchCode": "LOT-VEG-2026-001", "reason": "Nhiem khuan"}` | `{"affectedSupermarkets": [{"name": "Coopmart Tan Phu", "remainingItems": 45}], "queryTimeMs": 20}` (200 OK) |

#### B. Hợp đồng MQTT Topics giữa IoT Wokwi (Dev 3) và Backend (Dev 1):

1. **Topic Telemetry (ESP32 $\rightarrow$ Mosquitto $\rightarrow$ Backend):**
   - **Topic:** `smartchain/telemetry/{batchCode}` (Ví dụ: `smartchain/telemetry/LOT-VEG-2026-001`)
   - **Tần suất:** Định kỳ 5000ms (5 giây)
   - **Định dạng Payload JSON:**
     ```json
     {
       "batch_code": "LOT-VEG-2026-001",
       "category": "VEG_FRUIT",
       "device_id": "ESP32-MULTI-01",
       "temperature": 9.5,
       "humidity": 90.0,
       "gas_value": 15.0,
       "gas_type": "C2H4",
       "weight_kg": 150.0,
       "door_open": false,
       "is_breached": false,
       "timestamp": 1729730000000
     }
     ```
     *(Lưu ý: Vi điều khiển ESP32 gửi `millis()`, Backend Spring Boot khi lưu trữ vào Cassandra và Redis sẽ gán `Instant.now()` của máy chủ vào trường `recorded_at`)*.

2. **Topic Cấu hình Profile OTA (Backend $\rightarrow$ Mosquitto $\rightarrow$ ESP32):**
   - **Topic:** `smartchain/device/ESP32-MULTI-01/config`
   - **Định dạng Payload JSON:**
     ```json
     {
       "category": "VEG_FRUIT",
       "batch": "LOT-VEG-2026-001",
       "minTemp": 8.0,
       "maxTemp": 12.0,
       "maxGas": 30.0,
       "gasType": "C2H4"
     }
     ```

3. **Topic Điều khiển Rơ-le Cưỡng bức Downlink (Backend $\rightarrow$ Mosquitto $\rightarrow$ ESP32):**
   - **Topic:** `smartchain/device/ESP32-MULTI-01/cmd`
   - **Định dạng Payload JSON:**
     ```json
     {
       "action": "RELAY_ON"
     }
     ```
     *(Hoặc `{"action": "RELAY_OFF"}`)*.

#### C. Hợp đồng WebSocket STOMP giữa Backend (Dev 1) và Frontend (Dev 2):
- **Endpoint kết nối SockJS:** `http://localhost:8080/ws-smartchain`
- **Topic lắng nghe số đo vi khí hậu:** `/topic/telemetry/{batchCode}`
- **Định dạng Payload STOMP WebSocket đẩy tới Frontend (Khớp 100% với Redis Cache & DTO):**
  ```json
  {
    "batchCode": "LOT-VEG-2026-001",
    "temp": 9.5,
    "hum": 90.0,
    "gas": 15.0,
    "gasType": "C2H4",
    "weightKg": 150.0,
    "doorOpen": false,
    "isBreached": false,
    "recordedAt": "2026-10-24T08:00:00Z"
  }
  ```

#### D. Bảng Ánh Xạ Chuẩn Hóa Tên Trường (Field Mapping Matrix Giữa Các Tầng):
| Ý nghĩa nghiệp vụ | MQTT Inbound & CSDL (Cassandra/MySQL) | Redis Cache & REST DTO & WebSocket STOMP |
| :--- | :--- | :--- |
| Mã lô hàng | `batch_code` | `batchCode` |
| Nhiệt độ | `temperature` | `temp` |
| Độ ẩm | `humidity` | `hum` |
| Giá trị khí đo | `gas_value` | `gas` |
| Loại khí sinh học | `gas_type` | `gasType` |
| Khối lượng khay/thùng | `weight_kg` | `weightKg` |
| Trạng thái mở cửa | `door_open` | `doorOpen` |
| Cảnh báo vi phạm | `is_breached` | `isBreached` |
| Mã tem bán lẻ | `serial_code` (MySQL/Neo4j) | `serialCode` |
| Thời gian ghi nhận | `recorded_at` (Cassandra/MySQL) | `recordedAt` |

---

### 1.3. Cơ chế Mocking độc lập cho Dev 2 (Frontend Mock Mode)

Dev 2 tạo file `frontend/src/services/mockData.js` chứa toàn bộ dữ liệu mẫu theo đúng Interface Contract ở mục 1.2.
Trong file `frontend/.env.development`, Dev 2 thiết lập:
```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

- **Cách hoạt động:**
  - Khi `VITE_USE_MOCK=true`: Các hàm gọi API trong `apiService.js` sẽ trả về dữ liệu mẫu từ `mockData.js` với độ trễ nhân tạo 300ms (dùng `setTimeout`).
  - WebSocket Component dùng một hàm `setInterval(..., 5000)` để tự sinh số đo ngẫu nhiên (nhiệt độ dao động $8.5^\circ\text{C} - 10.5^\circ\text{C}$).
- **Lợi ích:** Dev 2 có thể lập trình xong $100\%$ giao diện, vẽ biểu đồ Chart.js tự động cuộn sóng, quét mã QR qua Camera, bấm nút thanh toán POS và hiển thị thông báo lỗi **hoàn toàn độc lập mà không cần Backend Java phải chạy!**

---

### 1.4. Cơ chế Giả lập IoT độc lập cho Dev 1 (Python / Mosquitto Mock Publisher)

Dev 1 không cần cài đặt PlatformIO hay mở Wokwi. Để kiểm thử phân hệ Backend, Cassandra, Redis và WebSocket, Dev 1 chỉ cần dùng script Python siêu nhẹ `scripts/mock_iot_telemetry.py` (chạy bằng lệnh `python scripts/mock_iot_telemetry.py`):
- Script tự động kết nối Mosquitto trên `localhost:1883` và bắn gói tin JSON cảm biến cứ mỗi 5 giây 1 lần.
- Script có thể giả lập sốc nhiệt (gửi nhiệt độ $15^\circ\text{C}$) hoặc mở cửa xe để Dev 1 kiểm tra xem Backend Rule Engine có tự ghi vào Cassandra và gửi lệnh Downlink bật Rơ-le hay không.
- **Lợi ích:** Dev 1 hoàn thành $100\%$ tính năng lưu trữ NoSQL và Ingestion mà không cần chờ Dev 3 viết firmware ESP32.

---

### 1.5. Cơ chế Giả lập Backend độc lập cho Dev 3 (Mosquitto Downlink CLI Tester)

Dev 3 không cần chạy Spring Boot Java nặng nề. Khi code Firmware C++ trên Wokwi, Dev 3 kiểm tra độc lập bằng cách mở 2 cửa sổ Terminal sử dụng Mosquitto Client có sẵn:
- **Terminal 1 (Kiểm tra ESP32 có gửi dữ liệu lên không):**
  ```bash
  docker exec -it smartchain-mosquitto mosquitto_sub -t "smartchain/telemetry/#" -v
  ```
  *(Nếu thấy JSON hiện lên mỗi 5 giây $\rightarrow$ ESP32 gửi tin thành công)*.
- **Terminal 2 (Giả lập Backend gửi lệnh đổi Profile hoặc bật Rơ-le):**
  ```bash
  # Test đổi Profile sang Thịt mát
  docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/config" -m '{"category": "CHILLED_MEAT"}'
  
  # Test gửi lệnh bật Rơ-le
  docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/cmd" -m '{"action": "RELAY_ON"}'
  ```
- **Lợi ích:** Dev 3 nhìn thấy màn hình OLED Wokwi đổi chữ và đèn Rơ-le sáng lên ngay lập tức, chứng minh firmware hoạt động hoàn hảo mà không cần Backend Java!

> [!TIP]
> **Kết nối Wokwi tự động cho Dev 3:** Trong file `firmware/src/main.cpp`, biến `mqtt_server` đã được cài sẵn mặc định là `"10.0.0.1"` (Gateway Wokwi trỏ thẳng về host port 1883). Dev 3 chỉ cần mở Wokwi là bo mạch ảo tự kết nối Mosquitto container ngay lập tức mà không cần cấu hình thêm!

---

## PHẦN 2: BẢNG KẾ HOẠCH TEST CHI TIẾT TỪNG TASK (TỰ KIỂM THỬ TRƯỚC KHI COMMIT)

Trước khi gõ lệnh `git commit` và tạo Pull Request, thành viên phụ trách **BẮT BUỘC** phải thực hiện đúng các bước kiểm tra trong bảng sau và xác nhận kết quả khớp với **Output mong đợi**:

### 2.1. Phân hệ Backend Java & Polyglot NoSQL (Phụ trách: Dev 1)

| Mã Task | Tên công việc | Hướng dẫn & Lệnh kiểm thử tự thân | Dữ liệu đầu vào (Input) | Kết quả mong đợi (Expected Output) | Tiêu chí Đạt (Pass) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Khởi tạo Monorepo & Khóa main | Kiểm tra branch protection trên GitHub | Thử dùng tài khoản Dev 2 push trực tiếp vào `main` | GitHub báo lỗi: `remote: error: GH006: Protected branch hook declined` | Không ai push đè được vào main |
| **TASK-02** | Docker Compose 5 DB NoSQL + MQTT | Chạy lệnh `docker compose ps` | Lệnh terminal | Cả 6 container đều hiển thị `Up` hoặc `Up (healthy)`. Không container nào bị `Exit` | Tất cả cổng 1883, 3306, 27017, 6379, 9042, 7474 đều mở |
| **TASK-05** | MySQL JPA Storage Profiles | Gọi cURL hoặc mở DBeaver xem bảng | `curl -X GET http://localhost:8080/api/v1/profiles` | Trả về JSON HTTP 200 chứa 6 bản ghi (`CHILLED_MEAT`, `VEG_FRUIT`, `FRESH_SEAFOOD`,...) | Đọc ghi được vào MySQL |
| **TASK-06** | Spring Security JWT & RBAC | Dùng Postman gọi API Login | `POST http://localhost:8080/api/v1/auth/login` với `{"username": "admin", "password": "123"}` | Trả về HTTP 200 kèm chuỗi `token: "eyJhbGciOi..."`. Gửi sai pass trả về 401 Unauthorized | Bảo vệ được các endpoint private |
| **TASK-10** | MQTT Ingestion Service | Chạy script Python mock hoặc dùng `mosquitto_pub` | Gửi gói tin JSON cảm biến vào topic `smartchain/telemetry/LOT-VEG-2026-001` | Console Spring Boot in ra log: `[MQTT Ingestion] Received telemetry for LOT-VEG-2026-001: Temp=9.5C` | Backend hứng được tin nhắn MQTT |
| **TASK-11** | Cassandra Time-Series Storage | Mở `cqlsh` trong container Cassandra | Truy vấn: `docker exec -it smartchain-cassandra cqlsh -e "SELECT * FROM supermarket_telemetry_ks.sensor_telemetry LIMIT 5;"` | Hiển thị bảng dữ liệu với các cột `batch_code`, `recorded_at`, `temperature`, `gas_value` | Dữ liệu time-series lưu thành công |
| **TASK-12** | Redis Cache & Leaderboard | Chạy lệnh Redis CLI kiểm tra | `docker exec -it smartchain-redis redis-cli -a redispassword GET telemetry:latest:LOT-VEG-2026-001` | Trả về chuỗi JSON nhiệt độ mới nhất; thời gian phản hồi dưới 2ms | Cache hoạt động, có TTL 30s, trả về đầy đủ batchCode, temp, hum, gas, gasType, weightKg, doorOpen, isBreached, recordedAt |
| **TASK-13** | WebSocket STOMP Broker | Mở trang test HTML WebSocket hoặc Postman WS | Kết nối tới `ws://localhost:8080/ws-smartchain`, subscribe `/topic/telemetry/LOT-VEG-2026-001` | Nhận được gói tin JSON cảm biến đẩy về liên tục mỗi 5 giây | Đẩy tin thời gian thực thành công |
| **TASK-16** | MongoDB Polymorphic Batches | Gọi API tạo lô hàng bằng Postman | `POST /api/v1/batches` kèm JSON rau củ (có thửa ruộng, ngày xịt thuốc PHI) | Trả về HTTP 201 kèm `batchCode: "LOT-VEG-2026-001"`. Mở Mongo Express thấy document lưu đầy đủ trường | Lưu trữ Document Schemaless chuẩn |
| **TASK-17** | Blockchain HashChain & Merkle | Mở MongoDB kiểm tra collection `blockchain_ledger` | `docker exec -it smartchain-mongodb mongosh -u mongoadmin -p mongopassword --eval "db.blockchain_ledger.find().pretty()"` | Khối Block #0 có `previous_hash: "000..."`, `current_hash` là chuỗi 64 ký tự SHA-256 hợp lệ | Chuỗi Hash-chain không bị gãy |
| **TASK-21** | Neo4j Graph OGM Integration | Mở trình duyệt `http://localhost:7474`, đăng nhập Neo4j | Chạy Cypher: `MATCH (p:Producer)-[r]->(b:Batch) RETURN p, r, b;` | Hiển thị các quả cầu Node (Trang trại, Lô hàng) và đường mũi tên nối giữa chúng trực quan | Đồ thị lưu đúng quan hệ |
| **TASK-24** | Thuật toán TTI (Arrhenius) | Gọi API audit kiểm định chất lượng | `GET /api/v1/qc/audit/LOT-VEG-2026-001` | Trả về HTTP 200 kèm `ttiScore: 99.1`, kết luận: `DAT_CHUAN_CHAT_LUONG` | Tích phân nhiệt độ tính chính xác |
| **TASK-26** | Redis Redlock POS Anti-Fraud | Dùng Postman gửi liên tiếp 2 request cùng 1 mã tem | `POST /api/v1/pos/checkout` với `serialCode: "QR-ITEM-VEG-001-005"` | Lần 1: Trả về HTTP 200 `SOLD`. Lần 2: Trả về HTTP 409 Conflict kèm lỗi `ALREADY_SOLD_FRAUD_DETECTED` | Chặn đứng hoàn toàn việc bán lại tem |
| **TASK-28** | Truy vấn Cypher Thu Hồi Khẩn | Gọi API thu hồi bằng Postman | `POST /api/v1/recall` với `{"batchCode": "LOT-VEG-2026-001"}` | Trả về danh sách siêu thị (Coopmart Tan Phu) và số lượng khay hàng tồn chưa bán; `queryTimeMs <= 50ms` | Định vị siêu thị dưới 0.05s |

---

### 2.2. Phân hệ Frontend React Vite & PWA UI/UX (Phụ trách: Dev 2)

*Lưu ý: Dev 2 có thể bật `VITE_USE_MOCK=true` để test toàn bộ giao diện độc lập trước khi Backend xong!*

| Mã Task | Tên công việc | Hướng dẫn & Lệnh kiểm thử tự thân | Thao tác UI người dùng | Kết quả mong đợi (Expected Output) | Tiêu chí Đạt (Pass) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **TASK-03** | Khởi tạo React Vite + Tailwind | Chạy `npm run dev` tại thư mục `frontend/` | Mở `http://localhost:3000` | Trang hiển thị mượt mà trong 1 giây, các style màu Tailwind hiển thị đúng, console không có lỗi đỏ | Không có cảnh báo hay lỗi cú pháp |
| **TASK-07** | Responsive Layout Navbar/Sidebar | Co giãn cửa sổ trình duyệt từ Desktop về Mobile | Thu nhỏ chiều rộng màn hình xuống dưới 768px | Menu Sidebar tự động thu gọn thành nút bấm Menu Hamburger, giao diện hiển thị chuẩn mobile | Thân thiện trên cả PC và Điện thoại |
| **TASK-14** | Component Biểu đồ Chart.js Real-time | Mở trang Giám sát Vi khí hậu | Quan sát biểu đồ nhiệt độ | Đường cong biểu đồ tự động dịch chuyển thêm điểm mới sau mỗi 5 giây, trục tung tự co giãn | Biểu đồ cuộn sóng không bị giật lag |
| **TASK-15** | Màn hình Tạo Lô Hàng Đa Hình | Vào trang `/supplier/create-batch` | Chọn Dropdown 6 ngành hàng: "Rau củ quả" rồi đổi sang "Thủy hải sản" | Form tự động đổi các ô nhập liệu: Rau quả thì hiện ô "Độ ngọt Brix / Thuốc BVTV", Hải sản thì hiện ô "Tàu cá / Vùng biển FAO" | Giao diện đa hình thích ứng chuẩn |
| **TASK-18** | Sinh Ma Trận Tem QR Kép Vector | Vào trang in tem, nhập số lượng 5 khay | Bấm nút "Tạo Tem & In Mã" | Màn hình render 1 mã Batch QR to và 5 mã Item QR nhỏ có viền cắt và mã vạch sắc nét | Quét thử bằng camera điện thoại đọc đúng chuỗi |
| **TASK-22** | Bản đồ GPS Leaflet Giám sát Xe | Vào trang Điều phối Logistics | Xem khu vực bản đồ OpenStreetMap | Hiển thị bản đồ Việt Nam, có biểu tượng xe tải xanh lá tại tọa độ xe đang chạy, bấm vào hiện Popup thông tin | Bản đồ zoom in/out mượt mà |
| **TASK-23** | Màn hình Cổng QC Đối Soát 72h | Vào trang `/qc/inbound-audit` | Nhập mã lô hoặc bấm nút quét QR giả lập | Màn hình hiện biểu đồ 72h, bảng chỉ số TTI (99.1%), nút bấm "Ký Duyệt Tiếp Nhận" bật sáng | Kiểm định viên xem rõ bằng chứng vi khí hậu |
| **TASK-25** | Giao diện Web POS Thu Ngân | Vào trang `/pos/checkout` | Quét mã tem `QR-ITEM-VEG-001-005`, bấm nút "Thu Tiền" | Hiện tên món (Xà lách 35.000đ), bấm thu tiền thành công in hóa đơn, tem chuyển sang trạng thái đã bán | Giao diện thu ngân tính tiền nhanh |
| **TASK-27** | Trang Tra Cứu Public Cho Khách Hàng | Mở trang `/public/trace/QR-ITEM-VEG-001-005` | Xem hành trình trên giao diện điện thoại | Hiển thị toàn bộ chuỗi Farm-to-Fork: Tên nông trại, ngày thu hoạch, chứng chỉ VietGAP, biểu đồ độ tươi $99\%$ | Khách hàng tra cứu không cần đăng nhập |

---

### 2.3. Phân hệ IoT Firmware Wokwi & QA (Phụ trách: Dev 3)

| Mã Task | Tên công việc | Hướng dẫn & Lệnh kiểm thử tự thân | Thao tác trên mạch mô phỏng Wokwi | Kết quả mong đợi (Expected Output) | Tiêu chí Đạt (Pass) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **TASK-04** | Khởi tạo PlatformIO & Mạch Wokwi | Mở `diagram.json` trên VSCode, bấm Start Wokwi | Quan sát cửa sổ mô phỏng | ESP32 khởi động, màn hình OLED SSD1306 sáng lên, LED xanh sáng báo hiệu kết nối | Mạch không bị báo lỗi thiếu chân cắm |
| **TASK-08** | Đọc cảm biến DHT22 & Biến trở Gas | Xoay biến trở Potentiometer và trượt nhiệt độ | Trượt nhiệt độ DHT22 lên 10°C, vặn biến trở lên mức 50% | Màn hình OLED lập tức cập nhật dòng chữ `T: 10.0C` và `C2H4: 50.0 ppm` | Cảm biến phản hồi tức thời |
| **TASK-09** | Gửi Telemetry MQTT định kỳ 5s | Mở terminal theo dõi Mosquitto | `docker exec -it smartchain-mosquitto mosquitto_sub -t "smartchain/telemetry/#" -v` | Cứ mỗi 5 giây, terminal in ra 1 chuỗi JSON chứa đầy đủ các trường `temperature`, `humidity`, `gas_value` | Gói tin JSON đúng 100% cú pháp |
| **TASK-19** | Cấu hình OTA đổi Profile bảo quản | Bắn lệnh MQTT đổi cấu hình từ Terminal | `docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/config" -m '{"category": "CHILLED_MEAT"}'` | Màn hình OLED đổi ngay dòng đầu thành `CAT: CHILLED_MEAT`, ngưỡng nhiệt đổi thành `(0-4C)`, đơn vị khí đổi thành `NH3` | Chuyển chế độ vi khí hậu mượt mà |
| **TASK-20** | Báo động Còi/LED & Bật Rơ-le cưỡng bức | Tạo lỗi sốc nhiệt trên Wokwi | Kéo nhiệt độ DHT22 lên 15°C (vượt ngưỡng cho phép) | Đèn LED đỏ nhấp nháy, còi Buzzer phát âm thanh ngắt quãng cảnh báo tài xế | Cảnh báo tại chỗ hoạt động chính xác |
| **TASK-20b**| Kiểm tra nhận lệnh Downlink bật Rơ-le | Bắn lệnh điều khiển Rơ-le từ Terminal | `docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/cmd" -m '{"action": "RELAY_ON"}'` | Đèn trên Rơ-le Module (chân GPIO 14) bật sáng đỏ, tiếng tiếp điểm đóng công tắc kích hoạt | Rơ-le chấp hành lệnh từ xa thành công |
| **TASK-29** | Diễn tập 5 Kịch bản Demo thực tế | Chạy lần lượt 5 kịch bản theo tài liệu | Thực hiện lần lượt 4 nhóm hàng (Rau, Thịt, Cá, Đông lạnh) và lỗi gian lận POS | Cả 5 kịch bản đều diễn ra trơn tru, không bị đơ mạch hay nghẽn mạng | Sẵn sàng báo cáo trước hội đồng |

### 2.4. Phân hệ Toàn diện End-to-End & Đóng gói Production (Phụ trách: Cả 3 thành viên)

| Mã Task | Tên công việc | Hướng dẫn & Lệnh kiểm thử tự thân | Dữ liệu đầu vào (Input) | Kết quả mong đợi (Expected Output) | Tiêu chí Đạt (Pass) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **TASK-30** | Đóng gói Docker Compose Prod & Smoke Test | Khởi chạy toàn bộ hệ thống bằng 1 lệnh | `docker compose -f docker-compose.prod.yml up -d` | Cả 8 container (5 DB NoSQL, Mosquitto, Backend Spring Boot, Frontend Nginx) đều `Up (healthy)` | Hệ thống hoạt động hoàn hảo End-to-End, sẵn sàng bàn giao |

---

## PHẦN 3: BỘ CÔNG CỤ TEST NHANH CHO TỪNG PHÂN HỆ

Để 3 người có thể copy và dùng ngay mà không cần cài đặt phức tạp, đây là mã nguồn của các công cụ hỗ trợ test độc lập:

### 3.1. Script Mock IoT bắn dữ liệu tự động cho Dev 1 (`scripts/mock_iot_telemetry.py`)
Dev 1 lưu file này tại `scripts/mock_iot_telemetry.py` và chạy bằng lệnh `python scripts/mock_iot_telemetry.py`:

```python
import time
import json
import random
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "smartchain/telemetry/LOT-VEG-2026-001"

# Tương thích tự động cả paho-mqtt phiên bản 1.x và 2.x
try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "Mock-IoT-Script")
except (AttributeError, TypeError):
    client = mqtt.Client("Mock-IoT-Script")

client.connect(BROKER, PORT, 60)
print(f"[MOCK IOT] Da ket noi Mosquitto tai {BROKER}:{PORT}. Dang ban Telemetry...")

try:
    while True:
        # Giả lập nhiệt độ rau quả dao động an toàn từ 8.5C đến 10.5C
        payload = {
            "batch_code": "LOT-VEG-2026-001",
            "category": "VEG_FRUIT",
            "device_id": "ESP32-MULTI-01",
            "temperature": round(random.uniform(8.5, 10.5), 2),
            "humidity": round(random.uniform(88.0, 93.0), 1),
            "gas_value": round(random.uniform(10.0, 18.0), 1),
            "gas_type": "C2H4",
            "weight_kg": 150.0,
            "door_open": False,
            "is_breached": False,
            "timestamp": int(time.time() * 1000)
        }
        json_data = json.dumps(payload)
        client.publish(TOPIC, json_data)
        print(f"[SENT] {json_data}")
        time.sleep(5)
except KeyboardInterrupt:
    print("\nDung mock script.")
    client.disconnect()
```

---

### 3.2. File cấu hình Mock API cho Dev 2 (`frontend/src/services/mockData.js`)
Dev 2 tạo file này để cung cấp dữ liệu giả cho toàn bộ màn hình React khi Backend chưa chạy:

```javascript
// Dữ liệu mẫu chuẩn khớp 100% với 6 ngành hàng trong MySQL storage_profiles
export const mockProfiles = [
  { categoryCode: "VEG_FRUIT", categoryName: "Rau Củ Quả & Trái Cây Tươi", minTemp: 8.0, maxTemp: 12.0, maxGas: 30.0, gasType: "C2H4" },
  { categoryCode: "CHILLED_MEAT", categoryName: "Thịt Tươi Sống Mát", minTemp: 0.0, maxTemp: 4.0, maxGas: 40.0, gasType: "NH3" },
  { categoryCode: "FRESH_SEAFOOD", categoryName: "Thủy Hải Sản Tươi Ướp Đá", minTemp: 0.0, maxTemp: 2.0, maxGas: 25.0, gasType: "TMA" },
  { categoryCode: "DAIRY", categoryName: "Sữa Tươi & Bơ Sữa Thanh Trùng", minTemp: 2.0, maxTemp: 6.0, maxGas: 0.0, gasType: "NONE" },
  { categoryCode: "DEEP_FROZEN", categoryName: "Thực Phẩm Đông Lạnh Sâu", minTemp: -30.0, maxTemp: -18.0, maxGas: 0.0, gasType: "NONE" },
  { categoryCode: "DELI_HOT", categoryName: "Thực Phẩm Nóng Chế Biến Sẵn", minTemp: 60.0, maxTemp: 85.0, maxGas: 0.0, gasType: "NONE" }
];

export const mockBatchResponse = {
  batchCode: "LOT-VEG-2026-001",
  productName: "Xà Lách Thủy Canh Mỡ Đà Lạt",
  category: "VEG_FRUIT",
  farmName: "Hợp Tác Xã Rau Sạch Đà Lạt",
  txHash: "3f9a7b5c1d8e2f4a6b0c9e7d5f3a1b8c6e4d2f0a8b7c5e3d1f9a6b4c2e0d8f1a",
  status: "CREATED",
  unitCount: 100
};

export const mockQcAudit = {
  batchCode: "LOT-VEG-2026-001",
  ttiScore: 99.1,
  freshnessStatus: "XUAT_SAC",
  tempCompliancePercent: 99.5,
  totalBreachDurationMinutes: 0,
  history: [
    { time: "08:00", temp: 9.2, hum: 90 },
    { time: "09:00", temp: 9.5, hum: 91 },
    { time: "10:00", temp: 10.1, hum: 89 },
    { time: "11:00", temp: 9.8, hum: 92 }
  ]
};

export const mockPosItem = {
  serialCode: "QR-ITEM-VEG-001-005",
  productName: "Xà Lách Thủy Canh (Túi 300g)",
  price: 35000,
  status: "PACKED"
};
```

---

### 3.3. Bộ lệnh CLI kiểm tra Wokwi tức thời cho Dev 3
Dev 3 có thể mở Terminal (PowerShell, CMD hoặc Git Bash) và sử dụng các câu lệnh Mosquitto CLI có sẵn trong container `smartchain-mosquitto` để kiểm tra hoạt động của vi điều khiển ESP32 mà không cần chờ Backend:

```bash
# 1. Lắng nghe toàn bộ bản tin Telemetry từ ESP32 Wokwi bắn lên Broker (Kiểm tra định kỳ 5s):
docker exec -it smartchain-mosquitto mosquitto_sub -t "smartchain/telemetry/#" -v

# 2. Giả lập Backend nạp cấu hình Profile OTA cho ESP32 Wokwi (Đổi sang thịt heo mát):
docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/config" -m '{"category":"CHILLED_MEAT","batch":"LOT-PORK-2026-001","minTemp":0.0,"maxTemp":4.0,"maxGas":40.0,"gasType":"NH3"}'

# 3. Giả lập Backend nạp cấu hình Profile OTA cho ESP32 Wokwi (Đổi sang thủy hải sản tươi):
docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/config" -m '{"category":"FRESH_SEAFOOD","batch":"LOT-FISH-2026-001","minTemp":0.0,"maxTemp":2.0,"maxGas":25.0,"gasType":"TMA"}'

# 4. Giả lập Backend gửi lệnh Downlink kích hoạt Rơ-le (Bật quạt thông gió / Lốc phụ):
docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/cmd" -m '{"action":"RELAY_ON"}'

# 5. Giả lập Backend gửi lệnh Downlink tắt Rơ-le:
docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/cmd" -m '{"action":"RELAY_OFF"}'
```

---

## PHẦN 4: CHECKLIST BẮT BUỘC TRƯỚC KHI TẠO PULL REQUEST (PR TEMPLATE)

Tạo file `.github/PULL_REQUEST_TEMPLATE.md` trong dự án. Khi bất kỳ ai (Dev 2 hay Dev 3) bấm tạo Pull Request trên GitHub, khung nội dung sau sẽ tự động hiện ra và **bắt buộc người gửi phải tick chọn đủ 5 tiêu chí**:

```markdown
### 1. Thông tin công việc
- **Mã Task:** [TASK-XX]
- **Người thực hiện:** @username
- **Tên tính năng / Sửa lỗi:** Mô tả ngắn gọn...

### 2. Danh sách file thay đổi
- [ ] Đã kiểm tra không vô tình commit các file nhạy cảm (`.env`, `target/`, `node_modules/`, `.pio/`)

### 3. Bằng chứng kiểm thử tự thân (Self-Verification)
- [ ] Tôi đã thực hiện đúng lệnh test trong file `KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md`.
- [ ] Kết quả kiểm thử khớp 100% với Output mong đợi.
- [ ] Đã đính kèm ảnh chụp màn hình hoặc log console chứng minh tính năng hoạt động bên dưới:

*(Dán ảnh chụp màn hình kết quả chạy hoặc log terminal vào đây)*

### 4. Cam kết không xung đột (Conflict-Free)
- [ ] Tôi đã chạy `git checkout main && git pull` và rebase vào nhánh của tôi trước khi tạo PR này.
```

---

## PHẦN 5: KỊCH BẢN KIỂM THỬ KHÓI TÍCH HỢP TOÀN HỆ THỐNG (SMOKE INTEGRATION TEST)

Sau khi Trưởng nhóm (Dev 1) duyệt và gộp tất cả các Pull Request của Dev 2 và Dev 3 vào nhánh `main`, nhóm thực hiện **Kiểm thử khói (Smoke Test)** trong vòng 5 phút để xác nhận toàn bộ hệ thống hoạt động thông suốt từ đầu đến cuối:

1. **Bước 1 (Khởi động hệ thống):**
   - Mở Terminal: `docker compose up -d` $\rightarrow$ 6 container sẵn sàng.
   - Chạy Backend Java: `Tomcat started on port 8080`.
   - Chạy Frontend React: `npm run dev` (Đặt `VITE_USE_MOCK=false` trong `.env`).
   - Mở VSCode: Chạy Wokwi Simulator ESP32.
2. **Bước 2 (Kiểm tra luồng Telemetry thời gian thực):**
   - Nhìn Wokwi gửi log `[Telemetry Sent]`.
   - Nhìn Terminal Spring Boot in log `[MQTT Ingestion]`.
   - Mở trình duyệt Web Frontend tại trang Giám sát: Biểu đồ Chart.js tự động cuộn sóng theo giá trị nhiệt độ của Wokwi $\rightarrow$ **ĐẠT!**
3. **Bước 3 (Kiểm tra phản ứng vi phạm vi khí hậu):**
   - Kéo nhiệt độ DHT22 trên Wokwi lên $16^\circ\text{C}$ $\rightarrow$ Còi Buzzer kêu, LED đỏ nhấp nháy.
   - Trên Web xuất hiện thông báo đỏ cảnh báo sốc nhiệt.
   - Bấm nút kích hoạt cưỡng bức trên Web $\rightarrow$ Rơ-le chân GPIO 14 trên Wokwi lập tức bật sáng $\rightarrow$ **ĐẠT!**
4. **Bước 4 (Kiểm tra thanh toán POS & Thu hồi khẩn cấp):**
   - Quét mã khay hàng tại POS thanh toán thành công.
   - Quét lại lần 2 $\rightarrow$ Báo lỗi tem đã bán.
   - Vào Admin bấm "Thu hồi khẩn cấp" $\rightarrow$ Đồ thị Neo4j hiện ra danh sách siêu thị trong 0.02s $\rightarrow$ **ĐẠT TOÀN DIỆN!**

---
*(Bản kế hoạch kiểm thử và phân tách độc lập này đảm bảo 3 thành viên tiến hành công việc mượt mà, độc lập 100%, không xung đột và sẵn sàng nghiệm thu xuất sắc)*
