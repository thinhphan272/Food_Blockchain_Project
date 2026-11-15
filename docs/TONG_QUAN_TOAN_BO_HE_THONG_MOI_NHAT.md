# TỔNG QUAN KIẾN TRÚC & HƯỚNG DẪN VẬN HÀNH TOÀN BỘ HỆ THỐNG SMARTCHAIN (PHIÊN BẢN HOÀN THIỆN)

> **Đề tài:** Hệ thống Truy xuất Nguồn gốc Thực phẩm Đa ngành hàng trong Siêu thị kết hợp Chuỗi lạnh IoT (Wokwi ESP32), Sổ cái Bất biến Blockchain (SHA-256 + Merkle Tree + Chữ ký số Bất đối xứng ECDSA) và Kiến trúc Đa mô hình 5 Cơ sở dữ liệu (MySQL, MongoDB, Redis, Cassandra, Neo4j).

---

## 1. Kiến Trúc Tổng Thể 5 Cơ Sở Dữ Liệu Polyglot (Polyglot Persistence)

| STT | Hệ Quản Trị CSDL | Cổng | Mô Hình Dữ Liệu | Vai Trò Cốt Lõi Trong Hệ Thống SmartChain |
| :-: | :--- | :-: | :--- | :--- |
| **1** | **MySQL 8.0** | `3306` | Relational (ACID) | Lưu trữ 8 Vai trò RBAC (`roles`), Nhân sự (`users` mã hóa BCrypt chuẩn) và 6 Cấu hình Ngưỡng Bảo quản Động (`storage_profiles`: `gas_type`, `max_gas`, `min_temp`, `max_temp`). |
| **2** | **MongoDB 7.0** | `27017` | Document Store (BSON) | Lưu trữ Hồ sơ Lô hàng Đa hình (`food_batches`) thay đổi linh hoạt theo 6 ngành hàng và Sổ cái Blockchain Bất biến (`blockchain_ledger`). |
| **3** | **Redis 7.2** | `6379` | In-Memory Key-Value | Cache ngưỡng động (`HSET profile:*`), Xếp kệ ưu tiên hạn dùng FEFO (`ZADD fefo:shelf:*`), Khóa phân tán chống quét trùng POS (`SET lock:pos:* NX EX 5`) và Tập hợp tem đã bán/thu hồi (`SADD pos:sold_qrs`, `recall:blacklisted_qrs`). |
| **4** | **Apache Cassandra 4.1** | `9042` | Wide-Column Time-Series | Ghi nhận luồng dữ liệu cảm biến IoT tần suất cao (`sensor_telemetry`) phân vùng theo `((batch_code, year_month), recorded_at DESC)` kèm tọa độ GPS (`latitude`, `longitude`) và TTL 180 ngày. |
| **5** | **Neo4j 5.x** | `7687` | Graph Database (Cypher) | Mô hình hóa đồ thị liên kết `(Farm)-[:PRODUCED]->(Batch)-[:LOADED_ON]->(Vehicle)-[:DELIVERED_TO]->(Supermarket)` phục vụ truy vết và Thu hồi Khẩn cấp đa chặng (`< 0.02s`). |

---

## 2. Cơ Chế Bảo Mật, Mật Mã Học & Động Học Tích Phân Arrhenius

1. **Xác thực & Phân quyền 8 Actor RBAC (`SecurityConfig` + `JwtAuthenticationFilter`)**:
   - Mật khẩu lưu trữ bằng băm **BCrypt** (`BCryptPasswordEncoder`), hoàn toàn không có backdoor mật khẩu cứng.
   - Mọi thao tác ghi dữ liệu đều được kiểm tra chữ ký **JWT (HMAC-SHA256)** qua `OncePerRequestFilter` và kiểm soát quyền theo đúng 8 vai trò (`ADMIN`, `PRODUCER`, `QC_INSPECTOR`, `LOGISTICS_DRIVER`, `INBOUND_GATE`, `SHELF_OPERATOR`, `CASHIER`, `CONSUMER`).
2. **Sổ cái Blockchain Bất biến & Chữ ký số Bất đối xứng ECDSA (`secp256r1`)**:
   - Mỗi khối (`BlockchainBlock`) tính toán **Merkle Root** từ danh sách mẫu cảm biến IoT, băm **SHA-256** liên kết `previousHash -> currentHash`, và ký số bằng khóa riêng **ECDSA (`SHA256withECDSA`)** của từng Actor.
   - Hàm `verifyChainIntegrity()` kiểm chứng đồng thời 3 lớp: liên kết mắt xích `previousHash`, băm lại nội dung khối `currentHash`, và xác thực chữ ký `ECDSA` bằng `PublicKey`.
3. **Mô hình Động học Tích phân Arrhenius (`AiShelfLifePredictionService`)**:
   - Tính toán tốc độ suy giảm chất lượng thực phẩm theo phương trình động học bậc 1 kết hợp phương trình Arrhenius $k(T) = k_{\text{ref}} \cdot \exp\left(-\frac{E_a}{R}\left(\frac{1}{T} - \frac{1}{T_{\text{ref}}}\right)\right)$, cộng hệ số phạt Tổn thương lạnh (*Chilling Injury* khi Rau củ $< 8^\circ\text{C}$) và phạt khí phân hủy sinh học ($\text{NH}_3, \text{TMA}, \text{C}_2\text{H}_4$).

---

## 3. Quy Trình Nghiệp Vụ 6 Giai Đoạn Trên Giao Diện Web & Mobile

- **Giai đoạn 1 & 2 (`1-2. Lô Hàng & QR Kép`)**: Khởi tạo lô hàng với Form Đa hình tự động thay đổi trường dữ liệu theo 6 ngành hàng, đúc Genesis Block #0, sinh Ma trận Mã QR Kép (`QrMatrixSvg`) và đẩy cấu hình ngưỡng động OTA xuống vi điều khiển ESP32 (`SET_PROFILE`).
- **Giai đoạn 3 (`3. Chuỗi Lạnh IoT & GPS`)**: Nhận luồng Telemetry thời gian thực qua WebSocket STOMP (`/ws-smartchain` -> `/topic/telemetry`), vẽ Biểu đồ Kép 2 Trục (`DualAxisTelemetryChart` - Nhiệt độ & Khí sinh học), hiển thị Bản đồ GPS Việt Nam (`VietnamColdChainMap` từ Đà Lạt về TP.HCM), kích hoạt 4 Kịch bản Phần cứng Wokwi và điều khiển đóng/ngắt Relay dàn lạnh GPIO 14.
- **Giai đoạn 4 (`4. Cổng QC & AI Arrhenius`)**: Kiểm toán lịch sử 72h, đối chiếu Merkle Root, đánh giá chỉ số độ tươi TTI và ký Smart Contract chấp nhận/từ chối lô hàng.
- **Giai đoạn 5 (`5. Kệ FEFO & Thu Ngân POS`)**: Đưa hàng lên kệ thông minh tự động sắp xếp theo hạn dùng còn lại trên Redis Sorted Set (`fefo:shelf:*`), quét mã QR thanh toán tại quầy POS (tích hợp Camera `html5-qrcode`) và chặn đứng hành vi sao chép/tái sử dụng tem QR bằng khóa phân tán Redis Redlock (`HTTP 409 CONFLICT - ALREADY_SOLD`).
- **Giai đoạn 6 (`6. Truy Xuất & Thu Hồi Neo4j` + Route `/trace/:code`)**: Cổng tra cứu công khai cho người tiêu dùng và Trung tâm Thu hồi Khẩn cấp truy vết đồ thị Neo4j (`SupplyChainGraphView`).
