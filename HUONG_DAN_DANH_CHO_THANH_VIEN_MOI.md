# HƯỚNG DẪN DÀNH CHO THÀNH VIÊN MỚI (ONBOARDING QUICKSTART GUIDE)
## DỰ ÁN: HỆ THỐNG TRUY XUẤT NGUỒN GỐC THỰC PHẨM SIÊU THỊ ĐA NGÀNH HÀNG
### (BLOCKCHAIN + INTERNET OF THINGS + POLYGLOT NOSQL)
> **Trưởng nhóm (Tech Lead):** Thịnh Phan (GitHub: `@thinhphan272`)  
> **Áp dụng cho:** Toàn bộ 3 thành viên trong nhóm (Thịnh Phan, Dev 2, Dev 3)  
> **Thời gian đọc:** ~5 phút — Đọc xong là bắt tay vào code được ngay lập tức!

---

## 1. DỰ ÁN NÀY LÀM GÌ? (BỐI CẢNH & MỤC TIÊU CỐT LÕI)

Chào mừng bạn đến với dự án **SmartChain Supermarket Food Traceability**!

Đây là đồ án kết hợp giữa **Internet of Things (IoT)**, **Blockchain** và **Cơ sở dữ liệu NoSQL**:
- **Bài toán thực tế:** Trong siêu thị bán lẻ thực phẩm tươi sống (Rau củ quả, Thịt mát, Thủy hải sản, Sữa, Đồ đông lạnh), thực phẩm rất dễ bị hư hỏng nếu bị đứt gãy chuỗi lạnh trong lúc vận chuyển xe tải hoặc bị kẻ gian tráo hàng, làm giả tem QR đã qua sử dụng.
- **Giải pháp của nhóm chúng ta:**
  1. **IoT (Wokwi ESP32):** Gắn cảm biến nhiệt độ DHT22, biến trở đo khí sinh học ($NH_3$, TMA, Ethylene), biến trở cân nặng Loadcell và công tắc cửa vào thùng xe lạnh để giám sát vi khí hậu liên tục 5s/lần; nếu sốc nhiệt thì còi kêu và tự động kích hoạt Rơ-le làm mát khẩn cấp.
  2. **Blockchain:** Toàn bộ lịch sử thu hoạch, kiểm định chất lượng QC và bằng chứng chuỗi lạnh được băm SHA-256 đóng thành từng khối Block bất biến, không ai có thể sửa chữa gian lận ngày giờ hay số liệu.
  3. **NoSQL Đa mô hình (Polyglot NoSQL):** Dùng đúng 5 loại CSDL cho 5 thế mạnh:
     - **MySQL:** Quản lý tài khoản, phân quyền RBAC và bảng cấu hình ngưỡng nhiệt độ chuẩn.
     - **MongoDB:** Lưu trữ hồ sơ Lô hàng đa hình (Schemaless) và Sổ cái khối Blockchain.
     - **Redis:** Lưu Cache nhiệt độ tức thời, khóa phân tán Redlock chống bán trùng tem tại quầy POS.
     - **Cassandra:** Lưu Big Data chuỗi thời gian hàng triệu bản ghi cảm biến mà không bị nghẽn.
     - **Neo4j:** Lưu đồ thị chuỗi cung ứng, tìm ra danh sách các siêu thị đang giữ hàng lỗi để thu hồi khẩn cấp chỉ trong **0.02 giây**.

---

## 2. PHÂN CHIA VAI TRÒ 3 THÀNH VIÊN TRONG NHÓM

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        BẢNG PHÂN CHIA VAI TRÒ & PHÂN HỆ PHỤ TRÁCH                      │
├─────────────────────┬───────────────────┬──────────────────────────────────────────────┤
│ Thành viên          │ Vai trò chính     │ Thư mục làm việc & Trách nhiệm chính         │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ **Thịnh Phan**      │ **Tech Lead &     │ Thư mục: `backend/`, `docker/`               │
│ (@thinhphan272)     │ Backend Lead**    │ - Quản trị GitHub Repo, duyệt Pull Request   │
│                     │                   │ - Spring Boot 3.x, Security JWT, MQTT Paho   │
│                     │                   │ - Tích hợp 5 Database NoSQL & Blockchain     │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ **Dev 2**           │ **Frontend Lead   │ Thư mục: `frontend/`                         │
│ (Bạn thứ 2)         │ (UI/UX & PWA)**   │ - React 18+ (Vite) & TailwindCSS             │
│                     │                   │ - Vẽ biểu đồ Chart.js vi khí hậu Realtime    │
│                     │                   │ - Bản đồ số GPS Leaflet & Quét mã QR Camera  │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ **Dev 3**           │ **IoT Lead &      │ Thư mục: `firmware/`, `scripts/`             │
│ (Bạn thứ 3)         │ Embedded QA**     │ - Viết mã C++ ESP32 trên PlatformIO & Wokwi  │
│                     │                   │ - Đọc cảm biến DHT22, biến trở Gas/Loadcell  │
│                     │                   │ - Xuất màn hình OLED, phát còi, đóng Rơ-le   │
└─────────────────────┴───────────────────┴──────────────────────────────────────────────┘
```

---

## 3. CÀI ĐẶT MÔI TRƯỜNG TRONG 3 BƯỚC (DÀNH CHO BẠN MỚI)

Bạn chỉ cần thực hiện 3 bước sau trên máy tính cá nhân là môi trường sẵn sàng:

### Bước 3.1: Cài đặt các công cụ bắt buộc
- Cài đặt **Git** (nếu máy chưa có): [Tải Git](https://git-scm.com/)
- Cài đặt **Docker Desktop**: [Tải Docker](https://www.docker.com/products/docker-desktop/) *(Bắt buộc phải bật Docker Desktop lên trước khi code)*.
- Cài đặt **Visual Studio Code (VSCode)** và cài các Extension gợi ý:
  - Cho cả 3: `Docker`, `GitLens`.
  - Cho Dev 2 (Frontend): `Tailwind CSS IntelliSense`, `ES7+ React snippets`.
  - Cho Dev 3 (IoT): `PlatformIO IDE`, `Wokwi Simulator`.

### Bước 3.2: Clone Repository về máy
Mở Terminal trên máy tính của bạn và chạy:
```bash
# Clone repo về máy (thay URL bằng link repo của Thịnh)
git clone https://github.com/thinhphan272/Food_Blockchain_Project.git
cd Food_Blockchain_Project

# Tạo file cấu hình môi trường cá nhân từ file mẫu
cp .env.example .env
```

### Bước 3.3: Bật toàn bộ 5 CSDL NoSQL bằng 1 lệnh duy nhất
```bash
docker compose up -d
```
*Kiểm tra: Chạy `docker compose ps`, nếu thấy cả 6 container (`mosquitto`, `mysql`, `mongodb`, `redis`, `cassandra`, `neo4j`) đều hiển thị trạng thái `Up` là máy của bạn đã sẵn sàng 100%!*

---

## 4. CHIẾN LƯỢC LÀM VIỆC ĐỘC LẬP (KHÔNG AI PHẢI CHỜ AI)

Để nhóm không bị tắc nghẽn, mỗi bạn có công cụ hỗ trợ để làm việc **độc lập 100%**:

### 🎯 Dành riêng cho Dev 2 (Frontend React):
- Bạn vào thư mục `frontend/`, chạy `npm install` rồi `npm run dev`.
- Mở file `frontend/.env.development` hoặc `frontend/.env`, bạn sẽ thấy dòng:
  ```env
  VITE_USE_MOCK=true
  ```
- **Ý nghĩa:** Khi cờ này bật, toàn bộ dữ liệu mẫu (danh mục 6 ngành hàng, thông tin lô hàng, lịch sử vi khí hậu 72h, quét tem POS) sẽ được đọc trực tiếp từ file `frontend/src/services/mockData.js`.
- **Kết quả:** Bạn có thể dựng xong $100\%$ giao diện, vẽ biểu đồ Chart.js tự cuộn sóng, quét camera QR, bấm nút thanh toán POS như thật **mà không cần chờ Backend Java của Thịnh phải chạy!**

### 🎯 Dành riêng cho Dev 3 (IoT Firmware Wokwi):
- Bạn vào thư mục `firmware/`, mở file `diagram.json` trong VSCode.
- Bấm tổ hợp phím **Ctrl + Shift + P** $\rightarrow$ Chọn `Wokwi: Start Simulator`.
- Để kiểm tra ESP32 có gửi dữ liệu MQTT lên không, bạn mở Terminal gõ:
  ```bash
  docker exec -it smartchain-mosquitto mosquitto_sub -t "smartchain/telemetry/#" -v
  ```
- Để giả lập lệnh của Backend điều khiển bật Rơ-le trên mạch Wokwi, bạn gõ:
  ```bash
  docker exec -it smartchain-mosquitto mosquitto_pub -t "smartchain/device/ESP32-MULTI-01/cmd" -m '{"action": "RELAY_ON"}'
  ```
- **Kết quả:** Bạn thấy đèn Rơ-le sáng lên ngay lập tức, chứng minh mạch và firmware hoạt động hoàn hảo **mà không cần chờ Backend Java của Thịnh!**

### 🎯 Dành riêng cho Dev 1 (Thịnh - Backend Lead):
- Thịnh mở thư mục `scripts/` và chạy script `python mock_iot_telemetry.py`.
- Script này tự động đóng vai thiết bị IoT bắn số liệu vi khí hậu mỗi 5s vào Mosquitto để Thịnh tha hồ test Cassandra, Redis, TTI và Blockchain **mà không cần chờ mạch Wokwi của Dev 3!**

---

## 5. QUY TRÌNH LÀM VIỆC VÀ NỘP CODE HÀNG NGÀY (GIT FLOW)

Để tránh xung đột và bảo vệ nhánh `main`, nhóm tuân thủ nghiêm ngặt 5 bước sau:

### ❌ QUY TẮC SỐNG CÒN: TUYỆT ĐỐI KHÔNG CODE TRỰC TIẾP TRÊN NHÁNH `main`!

```
[Nhánh main sạch] ───(git checkout -b)───> [Nhánh feature/task-XX]
                                                    │
                                           (Code & Tự test đạt 100%)
                                                    │
                                           (git commit & git push)
                                                    │
                                                    ▼
[Nhánh main sạch] <───(Thịnh Review & Merge)─── [Tạo Pull Request trên GitHub]
```

### Các bước thực hiện cho từng Task:

1. **Nhận Task:** Mở file `docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md` để xem mã Task của mình (Ví dụ: `TASK-03`, `TASK-04`, `TASK-08`,...).
2. **Cập nhật main và tạo nhánh mới:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/task-XX-ten-ngan-gon
   ```
   *(Ví dụ: `git checkout -b feature/task-03-init-react-vite`)*
3. **Lập trình tính năng:** Viết code trong thư mục phụ trách của bạn.
4. **Tự kiểm thử (Self-Verification):**
   - Mở file `docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md`.
   - Tìm đến đúng dòng mã Task của bạn, chạy đúng lệnh test và kiểm tra xem kết quả có khớp với cột "Output mong đợi" hay không.
   - Chụp lại 1 tấm ảnh màn hình kết quả chạy thành công.
5. **Commit và Push:**
   - Cú pháp commit bắt buộc phải có mã Task:
     ```bash
     git add .
     git commit -m "[TASK-XX] feat: Mô tả ngắn gọn tính năng vừa hoàn thành"
     git push -u origin feature/task-XX-ten-ngan-gon
     ```
6. **Tạo Pull Request (PR) trên GitHub:**
   - Vào link repo trên GitHub, thấy nút xanh **Compare & pull request** $\rightarrow$ Bấm vào.
   - Điền vào mẫu Template (tick chọn đủ 4 ô và dán ảnh chụp màn hình kết quả test).
   - Chọn Reviewer là `@thinhphan272`.
   - Bấm **Create pull request** và thông báo cho Thịnh. Thịnh sẽ vào xem và bấm Merge vào `main`!

---

## 6. DANH MỤC TÀI LIỆU CHI TIẾT ĐỂ TRA CỨU THÊM

Tất cả các tài liệu kỹ thuật chuyên sâu đều nằm sẵn trong thư mục `docs/` của dự án:
- 📖 [docs/KE_HOACH_KIEN_TRUC_HE_THONG_BLOCKCHAIN_IOT_NOSQL.md](docs/KE_HOACH_KIEN_TRUC_HE_THONG_BLOCKCHAIN_IOT_NOSQL.md): Bản kế hoạch kiến trúc chi tiết 5 tầng, đặc tả 6 ngành hàng thực phẩm, mạch Wokwi và kịch bản demo.
- 📋 [docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md](docs/KE_HOACH_SETUP_DU_AN_GITHUB_DOCKER_NHOM_3_NGUOI.md): Danh mục phân rã toàn bộ 30 Task chi tiết và lộ trình 4 tuần.
- 🧪 [docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md](docs/KE_HOACH_TEST_TUNG_TASK_VA_THIET_KE_DOC_LAP_3_NGUOI.md): Hướng dẫn test cho từng task cụ thể trước khi commit.
- ⚙️ [docs/TONG_HOP_TOAN_BO_CONG_NGHE_HE_THONG.md](docs/TONG_HOP_TOAN_BO_CONG_NGHE_HE_THONG.md): Danh mục toàn bộ công nghệ, phiên bản và vai trò trong hệ thống.

---
**Chúc nhóm 3 chúng ta phối hợp ăn ý, code mượt mà và đạt điểm tuyệt đối đồ án!** 🚀
