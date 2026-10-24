-- Khởi tạo Cơ sở Dữ liệu MySQL cho Hệ thống SmartChain Traceability
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

-- 2. Bảng Cấu hình Ngưỡng Bảo Quản Vi Khí Hậu Chuẩn cho 6 ngành hàng thực phẩm
CREATE TABLE IF NOT EXISTS storage_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(30) NOT NULL UNIQUE, -- "CHILLED_MEAT", "FRESH_SEAFOOD", "VEG_FRUIT", "DAIRY", "DEEP_FROZEN", "DELI_HOT"
    category_name VARCHAR(100) NOT NULL,
    min_temp DECIMAL(5,2) NOT NULL,            -- Độ C (Hỗ trợ cả nhiệt độ âm sâu -30 C)
    max_temp DECIMAL(5,2) NOT NULL,
    min_humidity DECIMAL(5,2) NOT NULL,        -- % RH
    max_humidity DECIMAL(5,2) NOT NULL,
    target_gas_type VARCHAR(20) NOT NULL,      -- "NH3", "TMA", "C2H4", "CO2", "NONE"
    max_gas_threshold DECIMAL(6,2) NOT NULL,   -- ppm
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

-- Bơm dữ liệu mẫu cho Roles
INSERT IGNORE INTO roles (role_id, role_name, description) VALUES
(1, 'ROLE_ADMIN', 'Quản trị viên toàn hệ thống'),
(2, 'ROLE_SUPPLIER', 'Chủ nông trại / Nhà cung cấp'),
(3, 'ROLE_QC', 'Chuyên viên kiểm định chất lượng'),
(4, 'ROLE_DRIVER', 'Tài xế xe lạnh / Điều phối viên'),
(5, 'ROLE_POS', 'Thu ngân siêu thị');

-- Bơm dữ liệu mẫu cho Users (Mật khẩu mặc định: '123456')
INSERT IGNORE INTO users (user_id, username, password_hash, full_name, role_id, department) VALUES
('USER-001', 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'Thịnh Phan (Tech Lead)', 1, 'MANAGEMENT'),
('USER-002', 'farm_dalat', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'Hợp Tác Xã Rau Đà Lạt', 2, 'PRODUCE'),
('USER-003', 'cashier_01', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'Thu Ngân Quầy 1 Tân Phú', 5, 'POS');

-- Bơm dữ liệu chuẩn cho 6 ngành hàng thực phẩm siêu thị
INSERT IGNORE INTO storage_profiles (category_code, category_name, min_temp, max_temp, min_humidity, max_humidity, target_gas_type, max_gas_threshold, base_shelf_life_hours, arrhenius_activation_energy) VALUES
('CHILLED_MEAT', 'Thịt Tươi Sống Mát', 0.0, 4.0, 80.0, 85.0, 'NH3', 40.0, 120, 65.5),
('FRESH_SEAFOOD', 'Thủy Hải Sản Tươi Ướp Đá', 0.0, 2.0, 90.0, 98.0, 'TMA', 25.0, 72, 85.2),
('VEG_FRUIT', 'Rau Củ Quả & Trái Cây Tươi', 8.0, 12.0, 85.0, 95.0, 'C2H4', 30.0, 168, 50.0),
('DAIRY', 'Sữa Tươi & Bơ Sữa Thanh Trùng', 2.0, 6.0, 60.0, 70.0, 'NONE', 0.0, 240, 75.0),
('DEEP_FROZEN', 'Thực Phẩm Đông Lạnh Sâu', -30.0, -18.0, 70.0, 85.0, 'NONE', 0.0, 2160, 40.0),
('DELI_HOT', 'Thực Phẩm Nóng Chế Biến Sẵn', 60.0, 85.0, 40.0, 60.0, 'NONE', 0.0, 12, 30.0);
