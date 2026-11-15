# QUY TẮC ĐÓNG GÓP MÃ NGUỒN (CONTRIBUTING GUIDE & GIT FLOW)

Tài liệu này quy định quy trình làm việc nhóm 3 người cho dự án **SmartChain Multi-Category Supermarket Traceability**.

## 1. Quy Trình Git Flow
- **Nhánh chính (`main`)**: Chỉ chứa mã nguồn đã vượt qua toàn bộ kiểm thử tự động (JUnit 5 + Vite Build + E2E Python Suite).
- **Nhánh tích hợp (`develop`)**: Nhánh hợp nhất code hàng ngày của 3 thành viên.
- **Nhánh tính năng (`feature/*`)**:
  - `feature/p1-iot-wokwi-ota` (Người 1 - IoT & Docker)
  - `feature/p2-backend-polyglot-security` (Người 2 - Backend & 5 NoSQL)
  - `feature/p3-frontend-dashboard-qr` (Người 3 - Frontend Web & Mobile)

## 2. Chuẩn Thông Điệp Commit (Conventional Commits)
- `feat(iot): reset median filter window on OTA profile change`
- `fix(security): enforce JWT authentication filter and remove password backdoor`
- `feat(blockchain): implement real SHA256withECDSA signature verification`
- `feat(frontend): add dual-axis telemetry chart and Leaflet Vietnam route map`
- `test(backend): add JUnit 5 suite for RBAC, ECDSA, Arrhenius and POS Redlock`

## 3. Danh Mục Kiểm Tra Trước Khi Tạo Pull Request (PR Checklist)
1. **Backend (`backend/`)**: Chạy `mvn clean test` đạt `BUILD SUCCESS` (0 lỗi).
2. **Frontend (`frontend/`)**: Chạy `npm run build` hoàn tất không có lỗi biên dịch.
3. **End-to-End (`scripts/verify_full_system_e2e.py`)**: Chạy `python scripts/verify_full_system_e2e.py` đạt 100% `PASS`.
4. Không commit các thư mục sinh tự động (`target/`, `node_modules/`, `dist/`, `.pio/`, `.env`).

