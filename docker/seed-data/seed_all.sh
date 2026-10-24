#!/bin/bash
# Script tự động seed dữ liệu mẫu ban đầu cho 5 Database NoSQL
echo "=== DANG BOM DU LIEU MAU CHO HE THONG SMARTCHAIN TRACEABILITY ==="

# 1. Khởi tạo Cassandra Keyspace & Table
echo "1. Dang khoi tao Cassandra Keyspace..."
docker exec -i smartchain-cassandra cqlsh < docker/cassandra/init.cql

# 2. Khởi tạo MongoDB Indexes & Dữ liệu mẫu
echo "2. Dang khoi tao MongoDB Indexes & Lô hàng mẫu..."
docker exec -i smartchain-mongodb mongosh -u mongoadmin -p mongopassword < docker/mongo/init-indexes.js

# Bơm 1 Lô hàng mẫu vào MongoDB
docker exec -i smartchain-mongodb mongosh -u mongoadmin -p mongopassword --eval '
db = db.getSiblingDB("supermarket_mongo");
db.food_batches.insertOne({
  "batch_code": "LOT-VEG-2026-001",
  "category": "VEG_FRUIT",
  "product_name": "Xà Lách Thủy Canh Mỡ Đà Lạt",
  "farm_name": "Hợp Tác Xã Rau Sạch Đà Lạt",
  "unit_count": 100,
  "standards": ["VietGAP"],
  "created_at": new Date()
});
db.blockchain_ledger.insertOne({
  "index": 0,
  "batch_code": "LOT-VEG-2026-001",
  "event_type": "GENESIS_BLOCK",
  "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "current_hash": "3f9a7b5c1d8e2f4a6b0c9e7d5f3a1b8c6e4d2f0a8b7c5e3d1f9a6b4c2e0d8f1a",
  "timestamp": new Date()
});
'

# 3. Bơm Node đồ thị vào Neo4j
echo "3. Dang khoi tao Do thi Neo4j..."
docker exec -i smartchain-neo4j cypher-shell -u neo4j -p neo4jpassword '
CREATE (p:Producer {id: "PROD-DALAT-01", name: "HTX Rau Sạch Đà Lạt", type: "CROP_FARM"})
CREATE (b:Batch {code: "LOT-VEG-2026-001", category: "VEG_FRUIT", name: "Xà Lách Thủy Canh"})
CREATE (sm:Supermarket {id: "SM-HCMC-01", name: "Siêu Thị Co.opmart Tân Phú"})
CREATE (p)-[:HARVESTS]->(b)
CREATE (b)-[:DELIVERED_TO]->(sm)
RETURN "Do thi khoi tao thanh cong!" AS result;
'

echo "=== DA HOAN TAT BOM DU LIEU MAU CHO TOAN HE THONG ==="
