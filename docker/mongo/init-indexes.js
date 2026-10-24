// Khởi tạo Indexes cho MongoDB Collection
db = db.getSiblingDB('supermarket_mongo');

// 1. Indexes cho collection Lô hàng thực phẩm đa hình
db.food_batches.createIndex({ "batch_code": 1 }, { unique: true });
db.food_batches.createIndex({ "category": 1 });
db.food_batches.createIndex({ "created_at": -1 });

// 2. Indexes cho collection Sổ cái khối Blockchain
db.blockchain_ledger.createIndex({ "batch_code": 1, "index": 1 }, { unique: true });
db.blockchain_ledger.createIndex({ "current_hash": 1 }, { unique: true });
db.blockchain_ledger.createIndex({ "timestamp": -1 });

print("Khoi tao Indexes cho MongoDB supermarket_mongo thanh cong!");
