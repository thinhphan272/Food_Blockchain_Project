#!/bin/bash
# Script tự động seed dữ liệu mẫu ban đầu cho 5 Database NoSQL
echo "=== DANG BOM DU LIEU MAU CHO HE THONG SMARTCHAIN TRACEABILITY ==="

# 1. Khởi tạo Cassandra Keyspace & Table
echo "1. Dang khoi tao Cassandra Keyspace..."
docker exec -i smartchain-cassandra cqlsh < docker/cassandra/init.cql

# 2. Khởi tạo MongoDB Indexes & Dữ liệu mẫu
echo "2. Dang khoi tao MongoDB Indexes & Lô hàng mẫu..."
docker exec -i smartchain-mongodb mongosh -u mongoadmin -p mongopassword < docker/mongo/init-indexes.js

# Bơm 1 Lô hàng mẫu và Genesis Block đầy đủ trường vào MongoDB
docker exec -i smartchain-mongodb mongosh -u mongoadmin -p mongopassword --eval '
db = db.getSiblingDB("supermarket_mongo");
db.food_batches.replaceOne(
  { "batch_code": "LOT-VEG-2026-001" },
  {
    "batch_code": "LOT-VEG-2026-001",
    "category": "VEG_FRUIT",
    "product_name": "Xà Lách Thủy Canh Mỡ Đà Lạt",
    "farm_name": "Hợp Tác Xã Rau Sạch Đà Lạt",
    "unit_count": 200,
    "unit_weight_kg": 0.3,
    "unit_price": 35000,
    "status": "ON_SHELF",
    "vehicle_plate": "49C-567.89",
    "device_id": "ESP32-MULTI-01",
    "shelf_section": "Kệ Mát Phun Sương Tạo Ẩm Rau Quả (8-12°C)",
    "standards": ["VietGAP", "GlobalGAP"],
    "created_at": new Date()
  },
  { upsert: true }
);
if (db.blockchain_ledger.countDocuments({ "batch_code": "LOT-VEG-2026-001", "index": 0 }) === 0) {
  db.blockchain_ledger.insertOne({
    "index": 0,
    "batch_code": "LOT-VEG-2026-001",
    "category": "VEG_FRUIT",
    "event_type": "GENESIS_BLOCK",
    "actor": "Hợp Tác Xã Rau Sạch Đà Lạt",
    "payload": {
      "productName": "Xà Lách Thủy Canh Mỡ Đà Lạt",
      "farm": "Hợp Tác Xã Rau Sạch Đà Lạt",
      "unitCount": 200,
      "standards": ["VietGAP", "GlobalGAP"]
    },
    "merkle_root": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
    "current_hash": "3f9a7b5c1d8e2f4a6b0c9e7d5f3a1b8c6e4d2f0a8b7c5e3d1f9a6b4c2e0d8f1a",
    "digital_signature": "MEYCIQDx8vK3zL9n1pR4tW7yB2mC5vN8qM1kJ4hG7fD0sA3eFQIhAJ2mN5pQ8rT1uW4yZ7bC0vF3gH6jK9lM2nP5qR8sT1uV",
    "timestamp": new Date()
  });
}
'

# 3. Bơm Node đồ thị vào Neo4j (Đồng bộ tên Siêu thị Co.opmart Huỳnh Tấn Phát)
echo "3. Dang khoi tao Do thi Neo4j..."
docker exec -i smartchain-neo4j cypher-shell -u neo4j -p neo4jpassword '
MERGE (p:Producer {id: "PROD-DALAT-01"}) SET p.name = "Hợp Tác Xã Rau Sạch Đà Lạt", p.type = "CROP_FARM"
MERGE (b:Batch {code: "LOT-VEG-2026-001"}) SET b.category = "VEG_FRUIT", b.name = "Xà Lách Thủy Canh Mỡ Đà Lạt"
MERGE (sm:Supermarket {id: "SM-HCMC-01"}) SET sm.name = "Siêu Thị Co.opmart Huỳnh Tấn Phát", sm.address = "1362 Huỳnh Tấn Phát, Quận 7, TP.HCM"
MERGE (p)-[:HARVESTS]->(b)
MERGE (b)-[:DELIVERED_TO {qcStatus: "PASSED"}]->(sm)
RETURN "Do thi khoi tao thanh cong!" AS result;
'

echo "=== DA HOAN TAT BOM DU LIEU MAU CHO TOAN HE THONG ==="
