# HƯỚNG DẪN SETUP DỰ ÁN TRÊN GITHUB & DOCKER CHO NHÓM 3 NGƯỜI

> **Dự án:** Hệ thống Truy xuất Nguồn gốc Thực phẩm Đa ngành hàng trong Siêu thị kết hợp Chuỗi lạnh IoT (Wokwi ESP32), Sổ cái Bất biến Blockchain (SHA-256 + Merkle Tree + ECDSA) và Kiến trúc 5 Cơ sở dữ liệu Polyglot (MySQL, MongoDB, Redis, Cassandra, Neo4j).

---

## 1. Cấu Trúc Nhánh Git Flow Cho Nhóm 3 Thành Viên

| Thành viên | Vai trò Phụ trách | Nhánh Làm việc (Feature Branch) | Thư mục Phụ trách Chính |
| :--- | :--- | :--- | :--- |
| **Người 1** | **IoT Edge & Docker Infrastructure** | `feature/p1-iot-docker` | `firmware/`, `docker/`, `docker-compose.yml`, `scripts/iot_simulator.py` |
| **Người 2** | **Backend Spring Boot & 5 DB Polyglot** | `feature/p2-backend-nosql` | `backend/`, `docker/mysql/`, `docker/mongo/`, `docker/cassandra/` |
| **Người 3** | **Frontend React Web & Mobile App** | `feature/p3-frontend-ui` | `frontend/`, `mobile/` |

### Quy tắc Nhánh (Branching Rules):
1. **`main`**: Nhánh Production ổn định, chỉ nhận Merge Request từ `develop` sau khi pass 100% CI/CD (`mvn test` + `npm run build` + `verify_full_system_e2e.py`).
2. **`develop`**: Nhánh tích hợp chung của cả 3 thành viên.
3. Mỗi thành viên tạo nhánh tính năng từ `develop`, commit theo chuẩn **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).

---

## 2. Các Bước Khởi Chạy Nhanh Trên Máy Local

### Bước 1: Clone dự án & Tạo file cấu hình môi trường
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd Food_Blockchain_Project
cp .env.example .env
```

### Bước 2: Khởi động cụm 6 Container Hạ tầng (Mosquitto + 5 DB)
```bash
docker compose up -d
```
Kiểm tra trạng thái `healthy` của cả 6 dịch vụ:
```bash
docker compose ps
```
Nạp dữ liệu khởi tạo chuẩn (Seed Data) cho cả 5 DB:
```bash
bash ./docker/seed-data/seed_all.sh
```

### Bước 3: Chạy Backend Spring Boot (Cổng 8080)
> **Lưu ý:** Ngay cả khi máy chưa bật Docker Desktop, Backend vẫn tự động kích hoạt cơ chế **Polyglot Hybrid Fallback** để khởi chạy mượt mà trên cổng `8080`.
```bash
cd backend
mvn spring-boot:run
```
Chạy bộ kiểm thử tự động JUnit 5:
```bash
mvn test
```

### Bước 4: Chạy Frontend React Vite (Cổng 5173)
```bash
cd frontend
npm install
npm run dev
```
- **Giao diện Quản trị & 6 Giai đoạn Chuỗi cung ứng:** `http://localhost:5173`
- **Cổng Truy xuất Công khai cho Người tiêu dùng (Quét QR):** `http://localhost:5173/trace/QR-ITEM-VEG-2026-001-001`

---

## 3. Chế Độ Làm Việc Độc Lập Không Cần Chờ Nhau

1. **Người 3 (Frontend) chạy độc lập không cần Backend:**
   - Mở `frontend/.env.development`, đổi `VITE_USE_MOCK=true` để sử dụng bộ dữ liệu giả lập 6 ngành hàng trong `frontend/src/services/mockData.js`.
2. **Người 1 (IoT Firmware) test cảm biến không cần mạch thật:**
   - Mở `firmware/` bằng VS Code PlatformIO + Wokwi Extension (`firmware/diagram.json`) hoặc chạy `python scripts/iot_simulator.py`.
3. **Kiểm thử tích hợp toàn hệ thống (End-to-End Verification):**
   ```bash
   python scripts/verify_full_system_e2e.py
   ```

