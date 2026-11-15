-- Khởi tạo Cơ sở Dữ liệu MySQL cho Hệ thống SmartChain Traceability
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS supermarket_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE supermarket_db;

-- 1. Bảng phân quyền RBAC
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL,
    department VARCHAR(50), -- "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "FROZEN", "POS"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 2. Bảng Cấu hình Ngưỡng Bảo Quản Vi Khí Hậu Chuẩn cho 6 ngành hàng thực phẩm (Mục 7.1)
CREATE TABLE IF NOT EXISTS storage_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(30) NOT NULL UNIQUE, -- "CHILLED_MEAT", "FRESH_SEAFOOD", "VEG_FRUIT", "DAIRY", "DEEP_FROZEN", "DELI_HOT"
    category_name VARCHAR(100) NOT NULL,
    min_temp DECIMAL(5,2) NOT NULL,            -- Độ C (Hỗ trợ cả nhiệt độ âm sâu -30 C)
    max_temp DECIMAL(5,2) NOT NULL,
    min_humidity DECIMAL(5,2) NOT NULL,        -- % RH
    max_humidity DECIMAL(5,2) NOT NULL,
    gas_type VARCHAR(20) NOT NULL,             -- "NH3", "TMA", "C2H4", "NONE"
    max_gas DECIMAL(6,2) NOT NULL,             -- ppm
    base_shelf_life_hours INT NOT NULL,        -- Giờ tuổi thọ tiêu chuẩn
    arrhenius_activation_energy DECIMAL(8,2)   -- Năng lượng hoạt hóa Ea (kJ/mol) dùng tính TTI
);

-- 3. Bảng sản phẩm đơn vị bán lẻ tại quầy
CREATE TABLE IF NOT EXISTS order_items (
    item_id VARCHAR(36) PRIMARY KEY,
    serial_code VARCHAR(100) NOT NULL UNIQUE,
    batch_code VARCHAR(50) NOT NULL,
    category_code VARCHAR(30) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    weight_kg DECIMAL(6,3) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PACKED', -- PACKED, ON_SHELF, SOLD, RECALLED
    cashier_id VARCHAR(36),
    sold_at TIMESTAMP NULL
);

-- Khởi tạo 8 Role chuẩn trong chuỗi cung ứng siêu thị đa ngành hàng (Mục 5.1 & 7.1)
INSERT IGNORE INTO roles (role_id, role_name, description) VALUES
(1, 'ADMIN', 'Quản trị viên hệ thống siêu thị'),
(2, 'PRODUCER', 'Nhà cung cấp nông trại / tàu cá'),
(3, 'QC_INSPECTOR', 'Chuyên viên kiểm định chất lượng'),
(4, 'LOGISTICS_DRIVER', 'Tài xế xe lạnh đa nhiệt độ'),
(5, 'INBOUND_GATE', 'Thủ kho cổng tiếp nhận'),
(6, 'SHELF_OPERATOR', 'Nhân viên quản lý quầy kệ'),
(7, 'CASHIER', 'Thu ngân quầy POS'),
(8, 'CONSUMER', 'Người tiêu dùng tra cứu');

-- Khởi tạo tài khoản mẫu (Mật khẩu chuẩn BCrypt cho chuỗi '123': $2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze)
INSERT IGNORE INTO users (user_id, username, password_hash, full_name, role_id, department, is_active) VALUES
('U001', 'admin', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Thịnh Phan (System Admin)', 1, 'ALL', TRUE),
('U002', 'producer', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'HTX Rau Sạch Đà Lạt', 2, 'PRODUCE', TRUE),
('U003', 'qc', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Trần Minh Khoa (QC Inspector)', 3, 'QC', TRUE),
('U004', 'driver', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Lê Hoàng Nam (Tài xế 49C-567.89)', 4, 'LOGISTICS', TRUE),
('U005', 'gate', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Phạm Thu Hà (Thủ kho Tiếp nhận)', 5, 'WAREHOUSE', TRUE),
('U006', 'shelf', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Đỗ Quốc Bảo (Quản lý Quầy kệ FEFO)', 6, 'SHELF', TRUE),
('U007', 'cashier', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Nguyễn Mai Anh (Thu ngân POS 01)', 7, 'POS', TRUE),
('U008', 'consumer', '$2a$10$Slqpc3cJ8HjA9PzHkobHV.L8ZG2ZuzEIPxYjvpmqpSwglBP5ALGze', 'Khách Hàng Tiêu Dùng', 8, 'PUBLIC', TRUE);

-- Khởi tạo dữ liệu chuẩn cho 6 ngành hàng thực phẩm siêu thị
INSERT IGNORE INTO storage_profiles (category_code, category_name, min_temp, max_temp, min_humidity, max_humidity, gas_type, max_gas, base_shelf_life_hours, arrhenius_activation_energy) VALUES
('CHILLED_MEAT', 'Thịt Tươi Sống Mát', 0.0, 4.0, 80.0, 85.0, 'NH3', 40.0, 120, 65.5),
('FRESH_SEAFOOD', 'Thủy Hải Sản Tươi Ướp Đá', 0.0, 2.0, 90.0, 98.0, 'TMA', 25.0, 72, 85.2),
('VEG_FRUIT', 'Rau Củ Quả & Trái Cây Tươi', 8.0, 12.0, 85.0, 95.0, 'C2H4', 30.0, 168, 50.0),
('DAIRY', 'Sữa Tươi & Bơ Sữa Thanh Trùng', 2.0, 6.0, 60.0, 70.0, 'NONE', 0.0, 240, 75.0),
('DEEP_FROZEN', 'Thực Phẩm Đông Lạnh Sâu', -30.0, -18.0, 70.0, 85.0, 'NONE', 0.0, 2160, 40.0),
('DELI_HOT', 'Thực Phẩm Nóng Chế Biến Sẵn', 60.0, 85.0, 40.0, 60.0, 'NONE', 0.0, 12, 30.0);

-- Khởi tạo dữ liệu mẫu khay thực phẩm dán tem Item QR (phục vụ test POS và tra cứu)
INSERT IGNORE INTO order_items (item_id, serial_code, batch_code, category_code, product_name, weight_kg, price, status) VALUES
('ITEM-VEG-001', 'QR-ITEM-VEG-001-005', 'LOT-VEG-2026-001', 'VEG_FRUIT', 'Xà Lách Thủy Canh (Túi 300g)', 0.300, 35000.00, 'ON_SHELF'),
('ITEM-VEG-002', 'QR-ITEM-VEG-001-015', 'LOT-VEG-2026-001', 'VEG_FRUIT', 'Xà Lách Thủy Canh (Túi 300g)', 0.300, 35000.00, 'ON_SHELF'),
('ITEM-PORK-001', 'QR-ITEM-PORK-001-001', 'LOT-PORK-2026-001', 'CHILLED_MEAT', 'Ba Rọi Heo Mát VietGAP (Khay 500g)', 0.500, 95000.00, 'ON_SHELF'),
('ITEM-FISH-001', 'QR-ITEM-FISH-001-002', 'LOT-FISH-2026-001', 'FRESH_SEAFOOD', 'Cá Hồi Phi Lê Tươi (Khay 400g)', 0.400, 165000.00, 'ON_SHELF');
