# TỔNG HỢP TOÀN BỘ CÔNG NGHỆ SỬ DỤNG TRONG HỆ THỐNG
## HỆ THỐNG TRUY XUẤT NGUỒN GỐC THỰC PHẨM ĐA NGÀNH HÀNG SIÊU THỊ
### (BLOCKCHAIN + INTERNET OF THINGS + POLYGLOT NOSQL)
> **Mã tài liệu:** TECH-STACK-SPECIFICATION-2026  
> **Dự án:** Web Truy Vết Thực Phẩm Chuỗi Lạnh Siêu Thị Đa Nhiệt Độ (Farm to Fork)  
> **Kiến trúc trọng tâm:** Phân tầng 5 Lớp + Lưu trữ Đa mô hình Polyglot Persistence + Tích hợp IoT Biên & Sổ cái Khối Bất biến  
> **Môi trường vận hành:** Docker Containerization | Môi trường phát triển: VSCode, PlatformIO, Wokwi

---

## MỤC LỤC TỔNG QUAN

1. [PHẦN 1: BẢN ĐỒ TỔNG THỂ CÔNG NGHỆ 5 PHÂN TẦNG](#phần-1-bản-đồ-tổng-thể-công-nghệ-5-phân-tầng)
2. [PHẦN 2: TẦNG GIAO DIỆN & TRÌNH DIỄN (FRONTEND - WEB & MOBILE PWA)](#phần-2-tầng-giao-diện--trình-diễn-frontend---web--mobile-pwa)
3. [PHẦN 3: TẦNG DỊCH VỤ XỬ LÝ TRUNG TÂM & LÕI BLOCKCHAIN (BACKEND)](#phần-3-tầng-dịch-vụ-xử-lý-trung-tâm--lõi-blockchain-backend)
4. [PHẦN 4: HỆ LƯU TRỮ ĐA MÔ HÌNH POLYGLOT NOSQL (5 CƠ SỞ DỮ LIỆU)](#phần-4-hệ-lưu-trữ-đa-mô-hình-polyglot-nosql-5-cơ-sở-dữ-liệu)
5. [PHẦN 5: TẦNG THIẾT BỊ IOT & PHẦN CỨNG MÔ PHỎNG (EMBEDDED FIRMWARE)](#phần-5-tầng-thiết-bị-iot--phần-cứng-mô-phỏng-embedded-firmware)
6. [PHẦN 6: GIAO THỨC TRUYỀN THÔNG & MẠNG KẾT NỐI (NETWORKING & PROTOCOLS)](#phần-6-giao-thức-truyền-thông--mạng-kết-nối-networking--protocols)
7. [PHẦN 7: TẦNG HẠ TẦNG, ĐÓNG GÓI & QUẢN TRỊ DỰ ÁN (DEVOPS & TOOLS)](#phần-7-tầng-hạ-tầng-đóng-gói--quản-trị-dự-án-devops--tools)
8. [PHẦN 8: MA TRẬN PHỐI HỢP CÔNG NGHỆ GIỮA CÁC TÁC NHÂN & CHỨC NĂNG](#phần-8-ma-trận-phối-hợp-công-nghệ-giữa-các-tác-nhân--chức-năng)

---

## PHẦN 1: BẢN ĐỒ TỔNG THỂ CÔNG NGHỆ 5 PHÂN TẦNG

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TẦNG 1: ỨNG DỤNG & GIAO DIỆN (FRONTEND)                          │
│                                                                                        │
│   • Core: React 18+ (Vite)                       • Styling: TailwindCSS 3.x            │
│   • Biểu đồ: Chart.js 4.x & Recharts             • Bản đồ: Leaflet.js (OpenStreetMap)  │
│   • Quét Camera QR: html5-qrcode 2.3.x           • Realtime: StompJS & SockJS-client   │
│   • Icons & UI: Lucide React                     • HTTP Client: Axios                  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ RESTful HTTPS / WebSocket STOMP
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                  TẦNG 2: XỬ LÝ TRUNG TÂM & LÕI BLOCKCHAIN (BACKEND)                    │
│                                                                                        │
│   • Ngôn ngữ: Java 17 LTS / 21                   • Framework: Spring Boot 3.2.x        │
│   • Bảo mật & Phân quyền: Spring Security 6.x + JJWT (Stateless RBAC)                   │
│   • Giao tiếp IoT: Eclipse Paho Java MQTT 1.2.5 • WebSocket Broker: Spring WebSocket    │
│   • Blockchain Core: SHA-256 Hash-chain + Merkle Tree + Chữ ký số RSA/ECC              │
│   • Thuật toán Động học: Arrhenius TTI Engine (Đo tuổi thọ sinh học theo nhiệt độ)    │
│   • Chống gian lận POS: Khóa phân tán Redis Redlock Service                            │
│   • Quản lý thư viện & Build: Apache Maven 3.9+                                        │
└────────────▲──────────────────────────────┬─────────────────────────────▲──────────────┘
             │ Giao thức MQTT               │ Native NoSQL Database Drivers
┌────────────┴─────────────┐   ┌────────────▼─────────────────────────────┴──────────────┐
│  TẦNG 3: MẠNG & GIAO THỨC│   │       TẦNG 4: LƯU TRỮ ĐA MÔ HÌNH (POLYGLOT NOSQL)        │
│                          │   │                                                         │
│  • Mosquitto MQTT 2.0    │   │  • MySQL 8.0: RDBMS ACID, Quản lý Users, Roles, Profile │
│    (Cổng 1883 & 9001 WS) │   │  • MongoDB 6.0: Document Store, Lô hàng đa hình, Ledger │
│  • WebSocket STOMP (8080)│   │  • Redis 7.0: In-Memory Cache, Redlock POS, Risk ZSET   │
│  • Bolt Protocol (7687)  │   │  • Cassandra 4.1: Wide-Column Big Data Telemetry        │
│  • CQL Protocol (9042)   │   │  • Neo4j 5.x: Graph Database, Truy vết & Thu hồi 0.02s  │
└────────────▲─────────────┘   └─────────────────────────────────────────────────────────┘
             │
┌────────────┴───────────────────────────────────────────────────────────────────────────┐
│              TẦNG 5: THIẾT BỊ IOT & PHẦN CỨNG MÔ PHỎNG (EMBEDDED FIRMWARE)              │
│                                                                                        │
│   • Nền tảng mô phỏng: Wokwi Simulator            • Môi trường phát triển: PlatformIO   │
│   • Vi điều khiển lõi: ESP32 DevKit V1 (Arduino C++)                                    │
│   • Cảm biến:                                                                          │
│     - wokwi-dht22: Đo nhiệt độ đa dải (-40°C đến 80°C) và độ ẩm                        │
│     - wokwi-potentiometer: Biến trở khí gas (NH3 thịt, TMA cá, C2H4 hoa quả)           │
│     - wokwi-potentiometer: Biến trở tải trọng Loadcell giám sát hao hụt khối lượng     │
│     - wokwi-slide-switch: Công tắc hành trình cửa / kẹp chì niêm phong                 │
│   • Thiết bị cảnh báo & chấp hành tại chỗ:                                             │
│     - wokwi-ssd1306: Màn hình OLED 128x64 I2C hiển thị thông số vi khí hậu             │
│     - wokwi-led (Đỏ & Xanh) + wokwi-buzzer: Báo động âm thanh & ánh sáng               │
│     - wokwi-relay-module: Rơ-le điều khiển máy lạnh phụ / quạt xả Ethylene cưỡng bức  │
│   • Thư viện C++ nhúng: PubSubClient, ArduinoJson 6, DHT library, Adafruit GFX/SSD1306  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## PHẦN 2: TẦNG GIAO DIỆN & TRÌNH DIỄN (FRONTEND - WEB & MOBILE PWA)

Phân hệ giao diện phục vụ 8 nhóm tác nhân thực tế trong chuỗi cung ứng, được xây dựng theo phong cách hiện đại, responsive hoàn hảo cho cả máy tính để bàn (Desktop Web) và thiết bị di động cầm tay (Mobile PWA).

| Công nghệ | Phiên bản | Nhóm vai trò | Tính năng & Trách nhiệm cụ thể |
| :--- | :---: | :--- | :--- |
| **React** | **18.x** | Core Framework | Xây dựng ứng dụng Single Page Application (SPA), quản lý trạng thái động (Component-based architecture), tái sử dụng mã nguồn tối đa. |
| **Vite** | **5.x** | Build Tool | Công cụ đóng gói mã nguồn siêu tốc, thay thế Create-React-App; hỗ trợ Hot-Module Replacement (HMR) cập nhật giao diện trong **0.1 giây**. |
| **TailwindCSS** | **3.x** | Styling Framework | Thiết kế giao diện hiện đại với Utility-first CSS, tối ưu hóa kích thước bundle, đảm bảo giao diện hiển thị đồng nhất trên mọi độ phân giải. |
| **Chart.js** & **react-chartjs-2** | **4.x** | Biểu đồ Realtime | Vẽ đồ thị vi khí hậu đa trục (Trục trái: Nhiệt độ $^\circ\text{C}$ - Trục phải: Độ ẩm $\%$ & Khí Gas $\text{ppm}$) tự động cuộn sóng theo chu kỳ 5 giây. |
| **Leaflet.js** & **react-leaflet** | **1.9.x** | Bản đồ GPS | Hiển thị bản đồ hành trình số OpenStreetMap, theo dõi biểu tượng xe container di chuyển giữa Nông trại $\rightarrow$ Kho trung chuyển $\rightarrow$ Siêu thị. |
| **html5-qrcode** | **2.3.x** | Quét mã QR Camera | Kích hoạt camera của điện thoại thông minh hoặc laptop để quét mã vạch GS1 và mã QR (Batch QR & Item QR) với tốc độ nhận diện dưới 300ms. |
| **StompJS** & **SockJS-client** | **7.x** | WebSocket Client | Thiết lập kết nối hai chiều bền bỉ với Spring WebSocket STOMP, nhận luồng Telemetry vi khí hậu thời gian thực từ Backend mà không cần F5 trình duyệt. |
| **Axios** | **1.6.x** | HTTP Client | Thực hiện các yêu cầu RESTful API (GET, POST, PUT, DELETE), tự động gắn Token JWT vào Header `Authorization: Bearer <token>`, xử lý Interceptors bắt lỗi. |
| **Lucide React** | Mới nhất | UI Icons | Bộ biểu tượng vector sắc nét, đồng bộ cho các nút bấm, thanh điều hướng Navbar và chỉ số trạng thái an toàn. |

---

## PHẦN 3: TẦNG DỊCH VỤ XỬ LÝ TRUNG TÂM & LÕI BLOCKCHAIN (BACKEND)

Phân hệ Backend được xây dựng bằng Java Spring Boot doanh nghiệp, chịu trách nhiệm xử lý logic nghiệp vụ, bảo mật, tiếp nhận dòng dữ liệu IoT vi khí hậu và duy trì tính toàn vẹn của Sổ cái Blockchain.

| Công nghệ | Phiên bản | Nhóm vai trò | Tính năng & Trách nhiệm cụ thể |
| :--- | :---: | :--- | :--- |
| **Java OpenJDK** | **17 LTS / 21** | Nền tảng ngôn ngữ | Đảm bảo tính ổn định cao, an toàn kiểu dữ liệu (Strongly Typed), hỗ trợ tính năng Records, Virtual Threads (Java 21) tối ưu xử lý đồng thời hàng nghìn kết nối IoT. |
| **Spring Boot** | **3.2.x** | Microservice Core | Khung phát triển ứng dụng lõi, cung cấp Dependency Injection, Inversion of Control, quản lý vòng đời ứng dụng và cấu hình tự động. |
| **Spring Security** | **6.x** | Bảo mật hệ thống | Quản lý xác thực và phân quyền dựa trên vai trò (RBAC), kiểm soát quyền truy cập chi tiết đến từng API endpoint. |
| **JJWT (Java JWT)** | **0.11.5** | Quản lý Token | Tạo và xác thực mã Token JSON Web Token chuẩn HMAC-SHA256, thực thi kiến trúc không trạng thái (Stateless), an toàn trước các cuộc tấn công CSRF. |
| **Spring Data JPA** (Hibernate) | **3.2.x** | ORM RDBMS | Quản lý kết nối, giao dịch ACID và ánh xạ thực thể thực tế với cơ sở dữ liệu MySQL 8.0. |
| **Spring Data MongoDB** | **4.2.x** | Document ODM | Thao tác với MongoDB 6.0 thông qua `MongoTemplate`, hỗ trợ lưu trữ BSON Document Schemaless đa hình theo 6 ngành hàng thực phẩm. |
| **Spring Data Redis** | **3.2.x** | In-Memory Client | Quản lý bộ nhớ đệm qua `RedisTemplate`, thực thi cấu trúc dữ liệu String, Sets, và Sorted Sets (ZSET) với tốc độ truy xuất dưới 2ms. |
| **Spring Data Cassandra** | **4.2.x** | Time-Series ODM | Tương tác với cụm Apache Cassandra 4.1 thông qua `CassandraTemplate` và Driver nhị phân CQL tốc độ cao. |
| **Spring Data Neo4j** | **7.2.x** | Graph OGM | Quản lý các Node và Cạnh quan hệ chuỗi cung ứng, thực thi các truy vấn đồ thị Cypher đệ quy. |
| **Eclipse Paho MQTT** | **1.2.5** | IoT Message Ingestion | Client MQTT Java tiêu chuẩn kết nối tới Mosquitto Broker: Subscribe lắng nghe Telemetry cảm biến và Publish lệnh điều khiển Downlink tới ESP32. |
| **Spring WebSocket (STOMP)**| **3.2.x** | Realtime Messaging | Triển khai STOMP Message Broker đơn giản, phát sóng (broadcast) số đo vi khí hậu đến đúng kênh Topic `/topic/telemetry/{batchCode}`. |
| **Thuật toán SHA-256** | Native `java.security` | Mã hóa Blockchain | Hàm băm một chiều mật mã học tính toán băm khối `current_hash = SHA256(index + timestamp + prev_hash + merkle_root + data)`. |
| **Cấu trúc Cây Merkle (Merkle Tree)** | Thuật toán tự phát triển | Bằng chứng toàn vẹn | Gom hàng trăm giao dịch tem lẻ Item QR thành một giá trị băm `merkle_root` duy nhất đại diện trong khối Block. |
| **Chữ ký số (Digital Signature)** | RSA 2048-bit / ECC | Chống chối bỏ | Đóng dấu khóa riêng tư (Private Key) của tác nhân (Nông trại, QC, Siêu thị) vào Block, xác minh bằng khóa công khai (Public Key). |
| **Động học Arrhenius (TTI Engine)**| Thuật toán giải tích | Đánh giá độ tươi | Tích phân độ suy giảm chất lượng thực phẩm sinh học dựa trên nhiệt độ phơi nhiễm thực tế và năng lượng hoạt hóa $E_a$, sinh hạn dùng thực tế động (FEFO). |
| **Khóa phân tán Redlock** | Redis Distributed Lock | Bảo vệ quầy POS | Sử dụng cơ chế `SET resource_name my_random_value NX PX 5000` ngăn chặn hiện tượng Race Condition khi 2 quầy thu ngân cùng quét 1 mã tem giả mạo. |
| **Apache Maven** | **3.9+** | Build Management | Quản lý toàn bộ vòng đời ứng dụng, tải dependencies, biên dịch và đóng gói thành file thực thi `backend.jar`. |

---

## PHẦN 4: HỆ LƯU TRỮ ĐA MÔ HÌNH POLYGLOT NOSQL (5 CƠ SỞ DỮ LIỆU)

Để đáp ứng trọn vẹn yêu cầu môn học NoSQL và giải quyết hoàn hảo bài toán hiệu năng lưu trữ trong chuỗi cung ứng thực phẩm, hệ thống áp dụng chiến lược **Lưu trữ đa mô hình (Polyglot Persistence)**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             BẢN ĐỒ PHÂN CHIA TRÁCH NHIỆM LƯU TRỮ ĐA MÔ HÌNH (POLYGLOT)                │
├─────────────────────┬───────────────────┬──────────────────────────────────────────────┤
│ Cơ Sở Dữ Liệu       │ Mô hình dữ liệu   │ Trách nhiệm nghiệp vụ cụ thể                 │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ 1. MySQL 8.0        │ Relational (ACID) │ Users, Roles (RBAC), Bảng Storage Profiles   │
│ 2. MongoDB 6.0      │ Document (BSON)   │ Hồ sơ Lô hàng Đa hình, Sổ cái Blockchain     │
│ 3. Redis 7.0        │ In-Memory (KV)    │ Live Telemetry, Redlock POS, Risk Leaderboard│
│ 4. Cassandra 4.1    │ Wide-Column Time  │ Big Data Telemetry hàng triệu bản ghi 5s     │
│ 5. Neo4j 5.x        │ Graph (LPG)       │ Đồ thị Mạng lưới Phân phối & Thu hồi 0.02s   │
└─────────────────────┴───────────────────┴──────────────────────────────────────────────┘
```

### Chi tiết kỹ thuật từng Cơ sở Dữ liệu:

#### 1. MySQL 8.0 (Cơ sở dữ liệu Quan hệ - RDBMS)
- **Cơ chế lưu trữ:** Bảng quan hệ với ràng buộc toàn vẹn khóa ngoại (Foreign Keys), chuẩn hóa dữ liệu 3NF, bảo đảm tính chất ACID nghiêm ngặt.
- **Trách nhiệm trong hệ thống:**
  - Bảng `users` & `roles`: Quản lý tài khoản, mật khẩu băm BCrypt, thông tin tổ chức.
  - Bảng `storage_profiles`: Cấu hình thông số vi khí hậu chuẩn cho 6 ngành hàng (`min_temp`, `max_temp`, `max_gas`, `arrhenius_activation_energy`).
  - Bảng `orders` & `order_items`: Lưu trữ hóa đơn bán lẻ và danh sách tem đơn vị.
- **Cổng kết nối:** `3306` (TCP).

#### 2. MongoDB 6.0 (Cơ sở dữ liệu Tài liệu - Document Store)
- **Cơ chế lưu trữ:** Tài liệu nhị phân BSON (Binary JSON), cấu trúc phi cấu trúc (Schemaless) linh hoạt cao.
- **Trách nhiệm trong hệ thống:**
  - Collection `food_batches`: Lưu hồ sơ lô hàng đa hình theo ngành hàng:
    + *Rau củ quả:* Thửa đất canh tác, danh mục thuốc BVTV, ngày cách ly PHI, độ ngọt Brix.
    + *Thủy hải sản:* Tọa độ vùng biển FAO, số hiệu tàu cá, cảng cập bến, test Formol.
    + *Thịt tươi mát:* Giống vật nuôi, sổ tiêm vaccine, chứng nhận kiểm dịch thú y.
  - Collection `blockchain_ledger`: Lưu trữ từng khối Block của Sổ cái Blockchain (chứa `index`, `previous_hash`, `merkle_root`, `digital_signature`, `payload`).
- **Cổng kết nối:** `27017` (TCP).

#### 3. Redis 7.0 (Cơ sở dữ liệu In-Memory - Key-Value Store)
- **Cơ chế lưu trữ:** Toàn bộ dữ liệu nằm trên bộ nhớ RAM, lưu trữ dạng Key-Value kết hợp các cấu trúc dữ liệu nâng cao (Hashes, Sets, Sorted Sets).
- **Trách nhiệm trong hệ thống:**
  - Key `telemetry:latest:{batchCode}`: Lưu số đo vi khí hậu mới nhất với TTL = 30s để phục vụ Dashboard truy vấn tức thì ($< 2\text{ms}$).
  - Key `lock:pos:{serialCode}`: Khóa phân tán Redlock bảo vệ giao dịch thanh toán POS chống Race Condition.
  - Sorted Set `risk:leaderboard:{category}`: Tự động chấm điểm và xếp hạng các lô hàng có nguy cơ sốc nhiệt cao nhất theo từng ngành hàng.
  - Set `blacklist:items`: Danh sách tem bị thu hồi khẩn cấp, chặn quét bán tại mọi quầy POS.
- **Cổng kết nối:** `6379` (TCP).

#### 4. Apache Cassandra 4.1 (Cơ sở dữ liệu Chuỗi thời gian - Wide-Column Store)
- **Cơ chế lưu trữ:** Kiến trúc phân tán ngang (Masterless Peer-to-Peer), cấu trúc LSM-Tree tối ưu hóa cho tốc độ ghi cực đại, không bao giờ bị nghẽn (Zero Point of Failure).
- **Trách nhiệm trong hệ thống:**
  - Bảng `sensor_telemetry`: Lưu trữ Big Data vi khí hậu hành trình gửi về mỗi 5 giây/lần.
  - Cấu trúc khóa: `PRIMARY KEY ((batch_code, year_month), recorded_at) WITH CLUSTERING ORDER BY (recorded_at DESC)`.
  - Phân vùng theo tháng (`year_month`) tránh hiện tượng Hotspot partition; sắp xếp thời gian giảm dần giúp truy vấn 100 điểm đo mới nhất trong chớp mắt.
- **Cổng kết nối:** `9042` (Native CQL).

#### 5. Neo4j 5.x Community (Cơ sở dữ liệu Đồ thị - Graph Database)
- **Cơ chế lưu trữ:** Đồ thị thuộc tính có nhãn (Labeled Property Graph - LPG), quan hệ (Relationship) được lưu trực tiếp dưới dạng con trỏ bộ nhớ (Index-free Adjacency).
- **Trách nhiệm trong hệ thống:**
  - Lưu trữ đồ thị chuỗi cung ứng: `(Producer)-[:HARVESTS]->(Batch)-[:TRANSPORTED_BY]->(Vehicle)-[:DELIVERED_TO]->(Supermarket)-[:HAS_SECTION]->(Shelf)`.
  - Thực thi truy vấn Cypher đệ quy truy vết ngược nguồn gốc Farm-to-Fork.
  - Kích hoạt lệnh Thu hồi khẩn cấp (*Emergency Recall*) đa tầng: Tìm ra tất cả siêu thị và quầy kệ đang bày bán sản phẩm lỗi chỉ trong vòng **0.02 giây**, vượt trội hoàn toàn so với việc JOIN đệ quy hàng chục bảng SQL truyền thống.
- **Cổng kết nối:** `7474` (HTTP Web GUI Browser) & `7687` (Bolt Protocol).

---

## PHẦN 5: TẦNG THIẾT BỊ IOT & PHẦN CỨNG MÔ PHỎNG (EMBEDDED FIRMWARE)

Hệ thống IoT được thiết kế tối ưu hóa để mô phỏng hoàn chỉnh trên nền tảng **Wokwi** và biên dịch qua **PlatformIO** ngay trong VSCode, sử dụng 100% linh kiện chính thức được Wokwi hỗ trợ (định cấu hình sẵn qua file `diagram.json`).

| Thành phần phần cứng | Model trên Wokwi | Chân kết nối ESP32 | Vai trò mô phỏng thực tế |
| :--- | :--- | :--- | :--- |
| **Vi điều khiển trung tâm** | `wokwi-esp32-devkit-v1` | Trung tâm điều khiển | Vi xử lý lõi kép ESP32, chạy firmware nhúng C++, thu thập dữ liệu cảm biến, hiển thị OLED, chạy máy trạng thái cảnh báo tại chỗ và giao tiếp MQTT. |
| **Cảm biến Vi khí hậu** | `wokwi-dht22` | **GPIO 15** (Data) | Đo nhiệt độ đa dải ($-40^\circ\text{C}$ đến $+80^\circ\text{C}$) và độ ẩm không khí trong thùng bảo quản. |
| **Cảm biến Khí sinh học** | `wokwi-potentiometer` (1) | **ADC 34 (GPIO 34)** | Biến trở xoay analog giả lập nồng độ khí: Khí Amoniac $NH_3$ (thịt), Trimethylamine TMA (thủy sản), hoặc Khí Ethylene $C_2H_4$ (rau quả chín dập). |
| **Cảm biến Tải trọng** | `wokwi-potentiometer` (2) | **ADC 35 (GPIO 35)** | Biến trở analog giả lập cảm biến Loadcell HX711 giám sát khối lượng hàng hóa trên xe, phát hiện tráo hàng/hao hụt tải trọng. |
| **Công tắc Hành trình Cửa** | `wokwi-slide-switch` | **GPIO 13** | Công tắc trượt gạt bật/tắt giả lập trạng thái đóng/mở cửa thùng container hoặc niêm phong kẹp chì. |
| **Màn hình Hiển thị** | `wokwi-ssd1306` | **GPIO 21 (SDA)**<br>**GPIO 22 (SCL)** | Màn hình đồ họa OLED 128x64 giao tiếp I2C, hiển thị trực quan: Tên ngành hàng, Mã lô, Nhiệt độ, Độ ẩm, Khí gas, Trạng thái an toàn. |
| **Đèn LED Báo động** | `wokwi-led` (Màu Đỏ) | **GPIO 2** | Nhấp nháy liên tục khi nhiệt độ hoặc khí gas vượt khỏi ngưỡng sinh thái của ngành hàng đang bảo quản. |
| **Đèn LED Trạng thái** | `wokwi-led` (Màu Xanh) | **GPIO 4** | Sáng liên tục báo hiệu hệ thống bình thường và đã kết nối thành công tới Mosquitto Broker. |
| **Còi Báo động Âm thanh** | `wokwi-buzzer` | **GPIO 12** | Phát tín hiệu âm thanh cảnh báo tài xế tại chỗ khi có sự cố sốc nhiệt hoặc mở cửa thùng xe trái phép. |
| **Rơ-le Chấp hành** | `wokwi-relay-module` | **GPIO 14** (IN) | Cơ cấu chấp hành điều khiển cưỡng bức: Nhận lệnh MQTT Downlink từ Backend để đóng Rơ-le kích hoạt lốc lạnh phụ hoặc quạt xả khí Ethylene. |

### Các thư viện C++ nhúng (PlatformIO `platformio.ini`):
- `knolleary/PubSubClient@^2.8`: Thư viện giao tiếp MQTT nhẹ, tiết kiệm RAM.
- `bblanchon/ArduinoJson@^6.21`: Đóng gói và giải mã chuỗi JSON trên vi điều khiển.
- `adafruit/DHT sensor library@^1.4` & `Adafruit Unified Sensor@^1.1`: Đọc cảm biến nhiệt ẩm DHT22.
- `adafruit/Adafruit SSD1306@^2.5` & `Adafruit GFX Library@^1.11`: Điều khiển hiển thị đồ họa OLED I2C.

---

## PHẦN 6: GIAO THỨC TRUYỀN THÔNG & MẠNG KẾT NỐI (NETWORKING & PROTOCOLS)

Toàn bộ hệ thống giao tiếp thông qua 5 giao thức mạng chuẩn hóa:

```
[ESP32 Wokwi Node] ───────(MQTT Protocol: Port 1883)───────> [Mosquitto Broker]
                                                                     │
                                                              (MQTT Ingestion)
                                                                     ▼
[React Frontend] <────(WebSocket STOMP: Port 8080)──── [Spring Boot Backend]
       │                                                             │
       └──────────────(RESTful HTTPS: Port 8080)─────────────────────┤
                                                                     │
                                  ┌──────────────────────────────────┴──────────────────┐
                                  │ (Native Database Protocols)                         │
                                  ▼                                                     ▼
                           [Neo4j: Bolt 7687]                                 [Cassandra: CQL 9042]
                           [MySQL: JDBC 3306]                                 [MongoDB: MongoWire 27017]
                           [Redis: RESP 6379]
```

1. **Giao thức MQTT (Message Queuing Telemetry Transport - Version 3.1.1):**
   - Vận hành trên cổng TCP `1883` (và WebSocket `9001`).
   - Kiến trúc Publish/Subscribe nhẹ, phù hợp hoàn hảo với đường truyền mạng di động 4G/5G chập chờn của xe tải vận chuyển.
   - Các Topic chính:
     * `smartchain/telemetry/{batchCode}`: ESP32 publish dữ liệu vi khí hậu mỗi 5 giây.
     * `smartchain/device/{deviceId}/config`: Backend nạp cấu hình Profile OTA cho ESP32.
     * `smartchain/device/{deviceId}/cmd`: Backend gửi lệnh Downlink điều khiển Rơ-le.
2. **Giao thức WebSocket (STOMP Protocol):**
   - Vận hành trên cổng `8080` tại Endpoint `/ws-smartchain`.
   - Đẩy trực tiếp số đo vi khí hậu từ Backend ra màn hình React, giúp biểu đồ nhiệt độ tự động cập nhật mà không cần cơ chế Polling tốn tài nguyên.
3. **Giao thức HTTP/1.1 & HTTPS (RESTful APIs):**
   - Định dạng trao đổi dữ liệu: `application/json`.
   - Áp dụng các phương thức chuẩn: `GET` (truy vấn), `POST` (tạo lô hàng, đăng nhập, quét thanh toán), `PUT` (cập nhật), `DELETE` (hủy).
4. **Giao thức Bolt Protocol (Cổng 7687):**
   - Giao thức mạng nhị phân hướng kết nối độc quyền của Neo4j, tối ưu hóa tốc độ truyền tải đồ thị phức tạp giữa Spring Boot và máy chủ Neo4j.
5. **Giao thức Native CQL Binary Protocol (Cổng 9042):**
   - Giao thức kết nối nhị phân đa luồng của Apache Cassandra, cho phép Spring Boot ghi hàng nghìn dòng dữ liệu cảm biến cùng lúc với độ trễ cực thấp.

---

## PHẦN 7: TẦNG HẠ TẦNG, ĐÓNG GÓI & QUẢN TRỊ DỰ ÁN (DEVOPS & TOOLS)

| Hạng mục | Công nghệ / Công cụ | Vai trò & Mục đích sử dụng |
| :--- | :--- | :--- |
| **Containerization** | **Docker Engine 24.x+** | Ảo hóa ở cấp độ hệ điều hành, đóng gói mã nguồn và toàn bộ phụ thuộc của từng dịch vụ thành các Container độc lập, loại bỏ triệt để lỗi "chạy được trên máy này nhưng lỗi trên máy khác". |
| **Orchestration** | **Docker Compose V2** | Quản lý và điều phối cùng lúc 8 dịch vụ container chỉ với 1 câu lệnh (`docker compose up -d`). Đảm bảo cấu hình cổng, biến môi trường và ổ đĩa (Volumes) đồng nhất trên máy cả 3 thành viên. |
| **Cấu trúc Kho mã** | **Monorepo Architecture** | Gom toàn bộ mã nguồn của dự án (Backend, Frontend, Firmware, Docker, Scripts) vào 1 Repository duy nhất để dễ quản lý phiên bản và đồng bộ hóa tiến độ. |
| **Quy trình Git** | **Enterprise Git Flow** | Khóa nhánh `main` bằng **Branch Protection Rule**, bắt buộc tạo nhánh tính năng (`feature/task-XX-...`), commit theo chuẩn `[TASK-XX]`, và phải được Trưởng nhóm Code Review phê duyệt qua Pull Request mới được gộp vào main. |
| **Môi trường lập trình** | **Visual Studio Code (VSCode)** | Bộ công cụ phát triển chung tích hợp các Extension: *Extension Pack for Java, PlatformIO IDE, Wokwi Simulator, Docker, GitLens, Tailwind CSS IntelliSense, Prettier*. |

---

## PHẦN 8: MA TRẬN PHỐI HỢP CÔNG NGHỆ GIỮA CÁC TÁC NHÂN & CHỨC NĂNG

Bảng đối chiếu cho thấy từng nhóm người dùng trong thực tế sẽ tương tác với những công nghệ nào trong hệ thống:

| Tác nhân thực tế | Giao diện sử dụng (Frontend) | Dịch vụ xử lý (Backend) | Cơ sở dữ liệu tương tác (NoSQL / SQL) | Tương tác IoT / Phần cứng |
| :--- | :--- | :--- | :--- | :--- |
| **1. Quản trị viên (Admin)** | React Web Admin Portal (TailwindCSS, Lucide) | Spring Boot REST API, Emergency Recall Service | **MySQL** (`storage_profiles`), **Neo4j** (Cypher Thu hồi), **Redis** (Blacklist) | Giám sát trạng thái cụm IoT Gateway |
| **2. Nhà Cung Cấp (Nông trại, Tàu cá, Trại chăn nuôi)** | React Web Supplier Portal (Dynamic Form) | Blockchain Service (SHA-256 Hash, Merkle Tree, RSA Key) | **MongoDB** (`food_batches` đa hình, `blockchain_ledger`), **Neo4j** (Node Nguồn) | In mã tem QR kép dán lên thùng bảo quản |
| **3. Kiểm định viên (QC Inspector)** | Mobile Web / Tablet Inbound Gate Scanner | TTI Dynamic Quality Engine (Arrhenius Algorithm) | **Cassandra** (Đọc 72h vi khí hậu), **MongoDB** (Ký Block QC Pass) | Đối soát biểu đồ chuỗi lạnh độc lập |
| **4. Tài xế Xe lạnh (Driver / Logistics)** | Màn hình Cabin OLED & Mobile Web Leaflet Map | MQTT Ingestion Listener, Downlink Actuator Service | **Redis** (Live Cache), **Cassandra** (Time-series) | Màn hình OLED SSD1306, Còi Buzzer, Đèn LED, Rơ-le kích hoạt lốc lạnh |
| **5. Nhân viên Quầy Kệ (Shelf Operator)** | Mobile PWA Handheld Scanner | FEFO Shelf Recommendation Service | **MongoDB** (TTI Score), **Neo4j** (Gán Node `ShelfSection`) | Quét kiểm tra độ tươi, xếp hàng lên quầy chuyên dụng |
| **6. Thu ngân (Cashier / POS)** | Web POS Terminal (Quét mã vạch cực nhanh) | POS Checkout Service, Redlock Anti-Fraud Engine | **MySQL** (`order_items`), **Redis** (Redlock POS & Key Status), **MongoDB** (Block Bán) | Vô hiệu hóa tem (`SOLD`), hú còi nếu phát hiện tem tái sử dụng |
| **7. Người tiêu dùng (Consumer)** | Public Web Portal (Mobile Camera Scan) | Public Provenance Query API | **MongoDB** (Thông tin nguồn gốc), **Cassandra** (Biểu đồ chuỗi lạnh), **Blockchain** | Quét QR xem minh bạch 100% từ Nông trại đến Bàn ăn |

---

## PHẦN 9: TỔNG KẾT TÍNH ĐỒNG BỘ CỦA TOÀN BỘ CÔNG NGHỆ

Hệ thống là một thể thống nhất, trong đó:
1. **Tính IoT** được thể hiện ở khả năng thu thập vi khí hậu tự động, xử lý cảnh báo tại biên và phản xạ điều khiển hai chiều bằng Rơ-le qua giao thức MQTT.
2. **Tính Blockchain** được thể hiện ở cấu trúc Sổ cái Khối liên kết SHA-256 bất biến, cây Merkle, chữ ký số điện tử chống làm giả tem nhãn và Smart Contract tự động kiểm duyệt tiêu chuẩn chuỗi lạnh.
3. **Tính NoSQL** phát huy tối đa thế mạnh của 5 CSDL: Document linh hoạt cho hồ sơ đa ngành hàng (MongoDB), In-Memory siêu tốc cho bộ nhớ đệm và chống bán trùng tem (Redis), Wide-Column chịu tải lớn cho dữ liệu cảm biến (Cassandra), Graph kết nối đa tầng cho truy vết và thu hồi dưới 0.02s (Neo4j), và RDBMS cho tính toàn vẹn phân quyền ACID (MySQL).

---
*(Tài liệu tổng hợp công nghệ hoàn chỉnh phục vụ nghiên cứu, phát triển và báo cáo đồ án tốt nghiệp / đồ án môn học)*
