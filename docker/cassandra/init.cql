-- Khởi tạo Keyspace và Bảng Time-Series cho Cassandra
CREATE KEYSPACE IF NOT EXISTS supermarket_telemetry_ks 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE supermarket_telemetry_ks;

-- Bảng Time-Series Big Data lưu hàng triệu bản ghi từ mọi loại khoang lạnh và xe hàng
CREATE TABLE IF NOT EXISTS sensor_telemetry (
    batch_code text,
    year_month text,              -- Partition Key tránh hotspot
    recorded_at timestamp,        -- Clustering Key sắp xếp giảm dần theo thời gian
    device_id text,
    category text,                -- "CHILLED_MEAT", "FRESH_SEAFOOD", "VEG_FRUIT", "DEEP_FROZEN"
    temperature double,
    humidity double,
    gas_value double,             -- Giá trị khí đo được
    gas_type text,                -- Loại khí: "NH3", "TMA", "C2H4", "CO2"
    weight_kg double,
    door_open boolean,
    is_breached boolean,
    PRIMARY KEY ((batch_code, year_month), recorded_at)
) WITH CLUSTERING ORDER BY (recorded_at DESC)
AND comment = 'Bang luu tru Telemetry vi khi hau sieu thi da nganh hang IoT';
