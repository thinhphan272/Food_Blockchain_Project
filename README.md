# SMARTCHAIN SUPERMARKET FOOD TRACEABILITY SYSTEM
## HỆ THỐNG QUẢN TRỊ & TRUY XUẤT NGUỒN GỐC THỰC PHẨM ĐA NGÀNH HÀNG SIÊU THỊ
### (BLOCKCHAIN + INTERNET OF THINGS + POLYGLOT NOSQL)

[![Docker Compose](https://img.shields.io/badge/Docker-Compose%20v2-blue?logo=docker)](docker-compose.yml)
[![Spring Boot](https://img.shields.io/badge/Backend-Spring%20Boot%203.2-brightgreen?logo=springboot)](backend/)
[![React Vite](https://img.shields.io/badge/Frontend-React%2018%20(Vite)-cyan?logo=react)](frontend/)
[![Wokwi Simulator](https://img.shields.io/badge/IoT-Wokwi%20ESP32-orange?logo=espressif)](firmware/)
[![Polyglot NoSQL](https://img.shields.io/badge/Databases-5%20NoSQL%20Engines-red)](docker/)

> **Nhóm thực hiện:** Nhóm 3 — Đồ án IoT & CSDL NoSQL (Đại học Công Thương TP.HCM - HUIT)  
> **Tech Lead / Repo Owner:** Thịnh Phan (`@thinhphan272`)  
> **Mô hình kiến trúc:** Monorepo 5 Lớp + Hợp đồng giao tiếp Contract-First + Phát triển độc lập

---

## 📌 BẠN LÀ THÀNH VIÊN MỚI TRONG NHÓM?
👉 **HÃY ĐỌC NGAY FILE:** [HUONG_DAN_DANH_CHO_THANH_VIEN_MOI.md](HUONG_DAN_DANH_CHO_THANH_VIEN_MOI.md)  
*(Hướng dẫn chi tiết từ cài đặt Docker, phân công vai trò, cách code độc lập bằng Mock Data đến quy trình tạo Pull Request)*.

---

## 🚀 KHỞI ĐỘNG NHANH TOÀN BỘ HỆ THỐNG TRONG 3 BƯỚC

### 1. Chuẩn bị biến môi trường
```bash
cp .env.example .env
```

### 2. Khởi chạy 5 CSDL NoSQL & MQTT Broker qua Docker
```bash
docker compose up -d
```
*Kiểm tra trạng thái:* `docker compose ps` (Cả 6 container: `mosquitto`, `mysql`, `mongodb`, `redis`, `cassandra`, `neo4j` đều phải hiển thị `Up`).

### 3. Khởi chạy Backend, Frontend & Mô phỏng IoT
- **Frontend React:**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  Truy cập: `http://localhost:3000`
- **Backend Spring Boot:**
  ```bash
  cd backend
  ./mvnw spring-boot:run
  ```
  API sẵn sàng tại: `http://localhost:8080`
- **IoT Firmware (Wokwi):**
  Mở `firmware/diagram.json` trong VSCode, bấm **Ctrl + Shift + P** $\rightarrow$ chọn `Wokwi: Start Simulator`.

---

## 📁 CẤU TRÚC THƯ MỤC MONOREPO

```
Food_Blockchain_Project/
├── backend/          # Phân hệ Java Spring Boot 3.x, Security JWT, MQTT Ingestion & NoSQL DAOs
├── frontend/         # Phân hệ React 18+ (Vite), TailwindCSS, Chart.js, Leaflet.js, QR Scanner
├── firmware/         # Phân hệ IoT nhúng ESP32 C++, sơ đồ đấu nối Wokwi diagram.json
├── docker/           # Cấu hình Mosquitto và các script khởi tạo MySQL, Cassandra, MongoDB
├── scripts/          # Script mock dữ liệu IoT vi khí hậu phục vụ test độc lập
├── docs/             # Toàn bộ 4 tài liệu thiết kế kiến trúc, công nghệ và kế hoạch test chi tiết
├── .github/          # Template bắt buộc khi tạo Pull Request
├── .env.example      # File mẫu cấu hình biến môi trường
├── .gitignore        # Quy chuẩn bỏ qua các file rác, file build, file bảo mật
├── docker-compose.yml# File điều phối khởi chạy toàn bộ 5 CSDL NoSQL
├── HUONG_DAN_DANH_CHO_THANH_VIEN_MOI.md # Hướng dẫn gia nhập dự án cho thành viên
└── README.md         # Tài liệu tổng quan dự án này
```

---

## 📚 TÀI LIỆU KỸ THUẬT NỘI BỘ (TRONG THƯ MỤC `docs/`)

- [docs/KE_HOACH_KIEN_TRUC_HE_THONG_BLOCKCHAIN_IOT_NOSQL.md](docs/KE_HOACH_KIEN_TRUC_HE_THONG_BLOCKCHAIN_IOT_NOSQL.md): Bản kế hoạch kiến trúc chi tiết 5 tầng, 6 ngành hàng thực phẩm siêu thị, sơ đồ Wokwi và 5 kịch bản demo.
- [docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md](docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md): Hướng dẫn thiết lập Git Flow, Docker và danh mục 30 Task chi tiết.
- [docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md](docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md): Kế hoạch test tự thân cho từng task trước khi commit.
- [docs/TONG_HOP_TOAN_BO_CONG_NGHE_HE_THONG.md](docs/TONG_HOP_TOAN_BO_CONG_NGHE_HE_THONG.md): Bản tổng hợp toàn bộ các công nghệ, thư viện, cổng port và giao thức.
