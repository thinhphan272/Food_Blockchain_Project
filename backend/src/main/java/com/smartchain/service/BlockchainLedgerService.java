package com.smartchain.service;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.ReplaceOptions;
import com.mongodb.client.model.Sorts;
import com.smartchain.model.BlockchainBlock;
import com.smartchain.model.FoodBatchDocument;
import jakarta.annotation.PostConstruct;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * MongoDB Polyglot Service:
 * 1. Collection `food_batches`: Lưu trữ Document Đa hình (Polymorphic Schema) cho 6 ngành hàng.
 * 2. Collection `blockchain_ledger`: Sổ cái Bất biến SHA-256 + Merkle Tree + Chữ ký số Bất đối xứng ECDSA (SHA256withECDSA).
 */
@Service
public class BlockchainLedgerService {

    private static final Logger log = LoggerFactory.getLogger(BlockchainLedgerService.class);
    public static final String GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    private final Map<String, FoodBatchDocument> batchCollection = new ConcurrentHashMap<>();
    private final Map<String, FoodBatchDocument.ItemQrSerial> qrSerialIndex = new ConcurrentHashMap<>();
    private final List<BlockchainBlock> ledgerCollection = new CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> dynamicCompletedTrips = new CopyOnWriteArrayList<>();

    // Hệ thống PKI Bất đối xứng ECDSA (secp256r1 / prime256v1) cho các Actor
    private final Map<String, KeyPair> actorKeyPairs = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private MongoClient mongoClient;

    @Value("${MONGO_DATABASE:supermarket_mongo}")
    private String mongoDbName;

    // 1. Food Batches Operations
    @SuppressWarnings("unchecked")
    public FoodBatchDocument mapDocToBatch(Document doc) {
        String code = doc.getString("batch_code");
        FoodBatchDocument b = new FoodBatchDocument();
        b.setId(doc.getString("_id") != null ? doc.getString("_id") : "mongo_batch_" + code);
        b.setBatchCode(code);
        b.setBatchQrCode(doc.getString("batch_qr_code") != null ? doc.getString("batch_qr_code") : "QR-BATCH-" + code);
        b.setProductName(doc.getString("product_name"));
        b.setCategory(doc.getString("category"));
        b.setStatus(doc.getString("status"));
        b.setFarmName(doc.getString("farm_name"));
        b.setUnitCount(doc.getInteger("unit_count", 100));
        b.setUnitWeightKg(doc.get("unit_weight_kg") instanceof Number n ? n.doubleValue() : 0.5);
        b.setUnitPrice(doc.get("unit_price") instanceof Number n ? n.doubleValue() : 65000.0);
        b.setPackageCount(doc.get("package_count") instanceof Number n ? n.intValue() : 50);
        b.setWeightPerPackageKg(doc.get("weight_per_package_kg") instanceof Number n ? n.doubleValue() : 10.0);
        b.setPackageUnit(doc.getString("package_unit") != null ? doc.getString("package_unit") : "Thùng carton tiêu chuẩn");
        b.setUnitsPerPackage(doc.get("units_per_package") instanceof Number n ? n.intValue() : 20);
        b.setTotalWeightKg(doc.get("total_weight_kg") instanceof Number n ? n.doubleValue() : 500.0);
        if (doc.getString("harvest_date") != null) {
            try {
                b.setHarvestDate(Instant.parse(doc.getString("harvest_date")));
            } catch (Exception ignored) {}
        }
        if (doc.get("certifications") instanceof List<?> certs) {
            b.setCertifications(new ArrayList<>((List<Map<String, Object>>) certs));
        }
        if (doc.get("standards") instanceof List<?> stds) {
            b.setStandards(stds.stream().map(String::valueOf).collect(Collectors.toList()));
        }
        if (doc.get("cultivation_details") instanceof Map<?, ?> cult) {
            b.setCultivationDetails(new HashMap<>((Map<String, Object>) cult));
        }
        if (doc.get("dynamic_attributes") instanceof Map<?, ?> dyn) {
            b.setDynamicAttributes(new HashMap<>((Map<String, Object>) dyn));
        }
        if (doc.get("transport_journey") instanceof Map<?, ?> tj) {
            b.setTransportJourney(new HashMap<>((Map<String, Object>) tj));
        }
        if (doc.get("qc_inspection") instanceof Map<?, ?> qc) {
            b.setQcInspection(new HashMap<>((Map<String, Object>) qc));
        }
        if (doc.get("item_qr_serials") instanceof List<?> itemsList) {
            for (Object obj : itemsList) {
                if (obj instanceof Document iDoc) {
                    FoodBatchDocument.ItemQrSerial s = new FoodBatchDocument.ItemQrSerial(
                            iDoc.getString("serial_code"),
                            iDoc.getString("batch_code"),
                            iDoc.get("weight_kg") instanceof Number n ? n.doubleValue() : 0.5,
                            iDoc.get("price") instanceof Number n ? n.doubleValue() : 0.0,
                            iDoc.getString("status")
                    );
                    if (iDoc.get("scan_count") instanceof Number sc) {
                        s.setScanCount(sc.intValue());
                    }
                    if (iDoc.getString("sold_at") != null) {
                        try {
                            s.setSoldAt(Instant.parse(iDoc.getString("sold_at")));
                        } catch (Exception ignored) {}
                    }
                    if (iDoc.getString("last_scanned_at") != null) {
                        try {
                            s.setLastScannedAt(Instant.parse(iDoc.getString("last_scanned_at")));
                        } catch (Exception ignored) {}
                    }
                    b.getItemQrSerials().add(s);
                    qrSerialIndex.put(s.getSerialCode(), s);
                }
            }
        }
        if (doc.get("scan_history") instanceof List<?> sHist) {
            b.setScanHistory(new ArrayList<>((List<Map<String, Object>>) sHist));
        }
        return b;
    }

    @SuppressWarnings("unchecked")
    public Object canonicalizeObject(Object obj) {
        if (obj instanceof Map<?, ?> map) {
            Map<String, Object> sorted = new LinkedHashMap<>();
            map.entrySet().stream()
                    .sorted((e1, e2) -> String.valueOf(e1.getKey()).compareTo(String.valueOf(e2.getKey())))
                    .forEach(e -> sorted.put(String.valueOf(e.getKey()), canonicalizeObject(e.getValue())));
            return sorted;
        } else if (obj instanceof List<?> list) {
            List<Object> res = new ArrayList<>();
            for (Object item : list) {
                res.add(canonicalizeObject(item));
            }
            return res;
        }
        return obj;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> canonicalizePayload(Map<String, Object> payload) {
        if (payload == null) return new LinkedHashMap<>();
        return (Map<String, Object>) canonicalizeObject(payload);
    }

    @SuppressWarnings("unchecked")
    public BlockchainBlock mapDocToBlock(Document bDoc) {
        BlockchainBlock blk = new BlockchainBlock();
        blk.setId(bDoc.getString("_id"));
        Integer idx = bDoc.getInteger("index");
        if (idx == null) idx = bDoc.getInteger("block_index", 0);
        blk.setIndex(idx);
        blk.setBatchCode(bDoc.getString("batch_code"));
        blk.setEventType(bDoc.getString("event_type"));
        blk.setActor(bDoc.getString("actor"));
        blk.setActorRole(bDoc.getString("actor_role"));
        if (bDoc.get("payload") instanceof Map<?, ?> pMap) {
            blk.setDataPayload((Map<String, Object>) canonicalizeObject(pMap));
        }
        blk.setMerkleRoot(bDoc.getString("merkle_root"));
        blk.setPreviousHash(bDoc.getString("previous_hash"));
        blk.setCurrentHash(bDoc.getString("current_hash"));
        blk.setDigitalSignature(bDoc.getString("digital_signature"));
        blk.setNonce(bDoc.getLong("nonce") != null ? bDoc.getLong("nonce") : 1024L);
        String tsStr = bDoc.getString("timestamp");
        if (tsStr != null) {
            try {
                blk.setTimestamp(Instant.parse(tsStr));
            } catch (Exception ignored) {
                blk.setTimestamp(Instant.now());
            }
        }
        return blk;
    }

    @PostConstruct
    @SuppressWarnings("unchecked")
    public void loadExistingFromMongo() {
        if (mongoClient == null) return;
        try {
            MongoDatabase db = mongoClient.getDatabase(mongoDbName);
            // 1. Load food_batches
            MongoCollection<Document> col = db.getCollection("food_batches");
            for (Document doc : col.find()) {
                String code = doc.getString("batch_code");
                if (code != null && !batchCollection.containsKey(code)) {
                    FoodBatchDocument b = mapDocToBatch(doc);
                    batchCollection.put(code, b);
                }
            }

            // 2. Load blockchain_ledger: Đọc đầy đủ sổ cái bất biến từ MongoDB
            MongoCollection<Document> ledgerCol = db.getCollection("blockchain_ledger");
            for (Document bDoc : ledgerCol.find().sort(Sorts.ascending("index"))) {
                String currentHash = bDoc.getString("current_hash");
                if (currentHash != null && ledgerCollection.stream().noneMatch(x -> currentHash.equals(x.getCurrentHash()))) {
                    BlockchainBlock blk = mapDocToBlock(bDoc);
                    ledgerCollection.add(blk);
                }
            }

            // 3. Load driver_trips: Đọc lịch sử các chuyến xe đã hoàn thành từ MongoDB
            loadDriverTrips();

            log.info("[MONGODB-SYNC] Loaded {} batches, {} blockchain blocks, and {} driver trips from MongoDB '{}'",
                    batchCollection.size(), ledgerCollection.size(), dynamicCompletedTrips.size(), mongoDbName);
        } catch (Exception e) {
            log.debug("[MONGODB-SYNC] Skip loading existing MongoDB docs: {}", e.getMessage());
        }
    }

    public synchronized void saveDriverTrip(Map<String, Object> tripRecord) {
        if (tripRecord == null) return;
        String tripId = String.valueOf(tripRecord.getOrDefault("tripId", "TRIP-VN-" + (System.currentTimeMillis() % 10000)));
        dynamicCompletedTrips.removeIf(t -> tripId.equals(t.get("tripId")));
        dynamicCompletedTrips.add(0, tripRecord);

        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("driver_trips");
                Document doc = new Document(tripRecord);
                col.replaceOne(Filters.eq("tripId", tripId), doc, new ReplaceOptions().upsert(true));
                log.info("[MONGODB-TRIP] Persisted trip {} to collection 'driver_trips'", tripId);
            } catch (Exception e) {
                log.debug("[MONGODB-TRIP] Non-fatal error persisting trip {}: {}", tripId, e.getMessage());
            }
        }
    }

    public synchronized List<Map<String, Object>> loadDriverTrips() {
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("driver_trips");
                for (Document doc : col.find()) {
                    Map<String, Object> map = new LinkedHashMap<>(doc);
                    map.remove("_id");
                    String tid = String.valueOf(map.get("tripId"));
                    if (tid != null && dynamicCompletedTrips.stream().noneMatch(x -> tid.equals(x.get("tripId")))) {
                        dynamicCompletedTrips.add(0, map);
                    }
                }
            } catch (Exception e) {
                log.debug("[MONGODB-TRIP-LOAD] Error loading driver trips: {}", e.getMessage());
            }
        }
        return new ArrayList<>(dynamicCompletedTrips);
    }

    public synchronized void removeDriverTripByBatchCode(String batchCode) {
        if (batchCode == null) return;
        dynamicCompletedTrips.removeIf(t -> batchCode.equalsIgnoreCase(String.valueOf(t.get("batchCode"))));
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("driver_trips");
                col.deleteMany(Filters.eq("batchCode", batchCode));
            } catch (Exception ignored) {}
        }
    }

    public FoodBatchDocument saveFoodBatch(FoodBatchDocument batch) {
        if (batch.getId() == null) {
            batch.setId("mongo_doc_" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (batch.getBatchQrCode() == null) {
            batch.setBatchQrCode("QR-BATCH-" + batch.getBatchCode());
        }
        batchCollection.put(batch.getBatchCode(), batch);

        List<Document> itemDocs = new ArrayList<>();
        if (batch.getItemQrSerials() != null) {
            for (FoodBatchDocument.ItemQrSerial item : batch.getItemQrSerials()) {
                qrSerialIndex.put(item.getSerialCode(), item);
                Document itemDoc = new Document("serial_code", item.getSerialCode())
                        .append("batch_code", item.getBatchCode())
                        .append("weight_kg", item.getWeightKg())
                        .append("price", item.getPrice())
                        .append("status", item.getStatus())
                        .append("scan_count", item.getScanCount());
                if (item.getSoldAt() != null) {
                    itemDoc.append("sold_at", item.getSoldAt().toString());
                }
                if (item.getLastScannedAt() != null) {
                    itemDoc.append("last_scanned_at", item.getLastScannedAt().toString());
                }
                itemDocs.add(itemDoc);
            }
        }

        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("food_batches");
                Document doc = new Document("_id", batch.getId())
                        .append("batch_code", batch.getBatchCode())
                        .append("batch_qr_code", batch.getBatchQrCode())
                        .append("product_name", batch.getProductName())
                        .append("category", batch.getCategory())
                        .append("status", batch.getStatus())
                        .append("farm_name", batch.getFarmName())
                        .append("unit_count", batch.getUnitCount())
                        .append("unit_weight_kg", batch.getUnitWeightKg())
                        .append("unit_price", batch.getUnitPrice())
                        .append("package_count", batch.getPackageCount())
                        .append("weight_per_package_kg", batch.getWeightPerPackageKg())
                        .append("package_unit", batch.getPackageUnit())
                        .append("units_per_package", batch.getUnitsPerPackage())
                        .append("total_weight_kg", batch.getTotalWeightKg())
                        .append("harvest_date", batch.getHarvestDate() != null ? batch.getHarvestDate().toString() : null)
                        .append("certifications", batch.getCertifications())
                        .append("standards", batch.getStandards())
                        .append("cultivation_details", batch.getCultivationDetails())
                        .append("dynamic_attributes", batch.getDynamicAttributes())
                        .append("transport_journey", batch.getTransportJourney())
                        .append("qc_inspection", batch.getQcInspection())
                        .append("scan_history", batch.getScanHistory())
                        .append("item_qr_serials", itemDocs)
                        .append("created_at", batch.getCreatedAt() != null ? batch.getCreatedAt().toString() : Instant.now().toString());
                col.replaceOne(Filters.eq("batch_code", batch.getBatchCode()), doc, new ReplaceOptions().upsert(true));
            } catch (Exception e) {
                log.debug("[MONGODB-WRITE] Non-fatal error saving batch to Mongo: {}", e.getMessage());
            }
        }
        return batch;
    }

    public Optional<FoodBatchDocument> findBatchByCode(String batchCode) {
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("food_batches");
                Document doc = col.find(Filters.eq("batch_code", batchCode)).first();
                if (doc != null) {
                    FoodBatchDocument b = mapDocToBatch(doc);
                    batchCollection.put(b.getBatchCode(), b);
                    return Optional.of(b);
                }
            } catch (Exception e) {
                log.debug("[MONGODB-READ] Error fetching batch {}: {}", batchCode, e.getMessage());
            }
        }
        return Optional.ofNullable(batchCollection.get(batchCode));
    }

    public List<FoodBatchDocument> findAllBatches() {
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("food_batches");
                List<FoodBatchDocument> list = new ArrayList<>();
                for (Document doc : col.find()) {
                    FoodBatchDocument b = mapDocToBatch(doc);
                    list.add(b);
                    batchCollection.put(b.getBatchCode(), b);
                }
                if (!list.isEmpty()) {
                    return list;
                }
            } catch (Exception e) {
                log.debug("[MONGODB-READ-ALL] Error fetching batches: {}", e.getMessage());
            }
        }
        return new ArrayList<>(batchCollection.values());
    }

    /**
     * Dọn dẹp các lô hàng test tự động sinh ra trùng lặp (LOT-WEB-*, LOT-MOB-*, LOT-E2E-*)
     * để đảm bảo cơ sở dữ liệu chỉ chứa các lô hàng thực tế đa dạng.
     */
    public void purgeTestBatches() {
        batchCollection.keySet().removeIf(code ->
                code != null && (code.startsWith("LOT-WEB-") || code.startsWith("LOT-MOB-") || code.startsWith("LOT-E2E-"))
        );
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("food_batches");
                col.deleteMany(Filters.or(
                        Filters.regex("batch_code", "^LOT-WEB-"),
                        Filters.regex("batch_code", "^LOT-MOB-"),
                        Filters.regex("batch_code", "^LOT-E2E-")
                ));
            } catch (Exception e) {
                log.debug("[MONGODB-PURGE] Non-fatal error purging test batches: {}", e.getMessage());
            }
        }
    }

    public Optional<FoodBatchDocument> findBatchByQrOrSerial(String code) {
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("food_batches");
                Document doc = col.find(Filters.or(
                        Filters.eq("batch_code", code),
                        Filters.eq("batch_qr_code", code),
                        Filters.eq("item_qr_serials.serial_code", code)
                )).first();
                if (doc != null) {
                    FoodBatchDocument b = mapDocToBatch(doc);
                    batchCollection.put(b.getBatchCode(), b);
                    return Optional.of(b);
                }
            } catch (Exception e) {
                log.debug("[MONGODB-SEARCH] Error searching batch by {}: {}", code, e.getMessage());
            }
        }
        if (batchCollection.containsKey(code)) {
            return Optional.of(batchCollection.get(code));
        }
        for (FoodBatchDocument b : batchCollection.values()) {
            if (code.equalsIgnoreCase(b.getBatchQrCode())) {
                return Optional.of(b);
            }
        }
        FoodBatchDocument.ItemQrSerial serial = qrSerialIndex.get(code);
        if (serial != null) {
            return Optional.ofNullable(batchCollection.get(serial.getBatchCode()));
        }
        return Optional.empty();
    }

    public Optional<FoodBatchDocument.ItemQrSerial> findItemSerial(String serialCode) {
        return Optional.ofNullable(qrSerialIndex.get(serialCode));
    }

    public List<FoodBatchDocument.ItemQrSerial> generateItemQrSerials(String batchCode, int count, double weightKg, double price) {
        FoodBatchDocument batch = batchCollection.get(batchCode);
        if (batch == null) {
            throw new IllegalArgumentException("Batch not found: " + batchCode);
        }
        List<FoodBatchDocument.ItemQrSerial> generated = new ArrayList<>();
        String shortPrefix = batchCode.replace("LOT-", "");
        int startIdx = batch.getItemQrSerials().size() + 1;

        for (int i = 0; i < count; i++) {
            String serialCode = String.format("QR-ITEM-%s-%03d", shortPrefix, startIdx + i);
            FoodBatchDocument.ItemQrSerial item = new FoodBatchDocument.ItemQrSerial(
                    serialCode, batchCode, weightKg, price, "GENERATED"
            );
            batch.getItemQrSerials().add(item);
            qrSerialIndex.put(serialCode, item);
            generated.add(item);
        }
        saveFoodBatch(batch);
        return generated;
    }

    // 2. Blockchain Ledger Operations
    public synchronized BlockchainBlock mintBlock(String batchCode,
                                                  String eventType,
                                                  String actor,
                                                  String actorRole,
                                                  Map<String, Object> payload,
                                                  List<String> telemetryLeavesForMerkle) {
        List<BlockchainBlock> batchChain = getChainByBatch(batchCode);
        int nextIndex = batchChain.size();
        String prevHash = batchChain.isEmpty()
                ? GENESIS_PREV_HASH
                : batchChain.get(batchChain.size() - 1).getCurrentHash();

        String merkleRoot = computeMerkleRoot(telemetryLeavesForMerkle);
        Instant now = Instant.now();
        long nonce = 1024L + (nextIndex * 317L);

        // Chuẩn hóa payload sang LinkedHashMap có thứ tự ổn định để kiểm chứng lại Hash bất kỳ lúc nào
        Map<String, Object> canonicalPayload = canonicalizePayload(payload);

        String rawBlockData = buildCanonicalBlockString(
                nextIndex, batchCode, eventType, actor, merkleRoot, prevHash, canonicalPayload, nonce, now
        );
        String currentHash = sha256Hex(rawBlockData);

        // Ký số bất đối xứng bằng thuật toán ECDSA (SHA256withECDSA)
        String digitalSignature = signWithEcdsaPki(actorRole != null ? actorRole : actor, currentHash);

        BlockchainBlock block = new BlockchainBlock();
        block.setId("blk_" + UUID.randomUUID().toString().substring(0, 10));
        block.setIndex(nextIndex);
        block.setBatchCode(batchCode);
        block.setEventType(eventType);
        block.setActor(actor);
        block.setActorRole(actorRole);
        block.setDataPayload(canonicalPayload);
        block.setMerkleRoot(merkleRoot);
        block.setPreviousHash(prevHash);
        block.setCurrentHash(currentHash);
        block.setDigitalSignature(digitalSignature);
        block.setNonce(nonce);
        block.setTimestamp(now);

        ledgerCollection.add(block);

        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> col = db.getCollection("blockchain_ledger");
                // Tuyệt đối KHÔNG gọi col.deleteOne(...) để bảo toàn tính bất biến (Immutability) của Sổ cái
                Document bDoc = new Document("_id", block.getId())
                        .append("index", block.getIndex())
                        .append("block_index", block.getIndex())
                        .append("batch_code", block.getBatchCode())
                        .append("event_type", block.getEventType())
                        .append("actor", block.getActor())
                        .append("actor_role", block.getActorRole())
                        .append("payload", block.getDataPayload())
                        .append("merkle_root", block.getMerkleRoot())
                        .append("previous_hash", block.getPreviousHash())
                        .append("current_hash", block.getCurrentHash())
                        .append("digital_signature", block.getDigitalSignature())
                        .append("nonce", block.getNonce())
                        .append("timestamp", block.getTimestamp().toString());
                col.replaceOne(Filters.eq("current_hash", block.getCurrentHash()), bDoc, new ReplaceOptions().upsert(true));
            } catch (Exception e) {
                log.debug("[MONGODB-LEDGER] Non-fatal error saving block: {}", e.getMessage());
            }
        }
        return block;
    }

    private String buildCanonicalBlockString(int index,
                                             String batchCode,
                                             String eventType,
                                             String actor,
                                             String merkleRoot,
                                             String prevHash,
                                             Map<String, Object> payload,
                                             long nonce,
                                             Instant timestamp) {
        return index + "|" + batchCode + "|" + eventType + "|" + actor + "|"
                + merkleRoot + "|" + prevHash + "|" + payload.toString() + "|" + nonce + "|" + timestamp.toString();
    }

    public synchronized void clearChainForBatch(String batchCode) {
        if (batchCode == null) return;
        ledgerCollection.removeIf(b -> batchCode.equalsIgnoreCase(b.getBatchCode()));
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                db.getCollection("blockchain_ledger").deleteMany(Filters.eq("batch_code", batchCode));
            } catch (Exception e) {
                log.debug("[MONGODB-CLEAR] Non-fatal error clearing ledger for {}: {}", batchCode, e.getMessage());
            }
        }
    }

    public List<BlockchainBlock> getChainByBatch(String batchCode) {
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> ledgerCol = db.getCollection("blockchain_ledger");
                for (Document bDoc : ledgerCol.find(Filters.eq("batch_code", batchCode)).sort(Sorts.ascending("index"))) {
                    String currentHash = bDoc.getString("current_hash");
                    if (currentHash != null && ledgerCollection.stream().noneMatch(x -> currentHash.equals(x.getCurrentHash()))) {
                        ledgerCollection.add(mapDocToBlock(bDoc));
                    }
                }
            } catch (Exception e) {
                log.debug("[MONGODB-LEDGER-READ] Error fetching blocks for {}: {}", batchCode, e.getMessage());
            }
        }
        return ledgerCollection.stream()
                .filter(b -> batchCode.equalsIgnoreCase(b.getBatchCode()))
                .sorted(Comparator.comparingInt(BlockchainBlock::getIndex))
                .collect(Collectors.toList());
    }

    public List<BlockchainBlock> getAllBlocks() {
        if (mongoClient != null) {
            try {
                MongoDatabase db = mongoClient.getDatabase(mongoDbName);
                MongoCollection<Document> ledgerCol = db.getCollection("blockchain_ledger");
                for (Document bDoc : ledgerCol.find().sort(Sorts.ascending("index"))) {
                    String currentHash = bDoc.getString("current_hash");
                    if (currentHash != null && ledgerCollection.stream().noneMatch(x -> currentHash.equals(x.getCurrentHash()))) {
                        ledgerCollection.add(mapDocToBlock(bDoc));
                    }
                }
            } catch (Exception e) {
                log.debug("[MONGODB-LEDGER-ALL] Error fetching all blocks: {}", e.getMessage());
            }
        }
        return new ArrayList<>(ledgerCollection);
    }

    /**
     * Kiểm tra tính toàn vẹn của chuỗi Blockchain 3 lớp:
     * 1. Liên kết mắt xích (previousHash == prev.currentHash)
     * 2. Băm lại nội dung khối (recomputed SHA-256 == block.currentHash)
     * 3. Xác thực chữ ký số bất đối xứng ECDSA (SHA256withECDSA) bằng PublicKey
     */
    public Map<String, Object> verifyChainIntegrity(String batchCode) {
        List<BlockchainBlock> chain = getChainByBatch(batchCode);
        boolean isValid = true;
        List<String> verificationSteps = new ArrayList<>();

        for (int i = 0; i < chain.size(); i++) {
            BlockchainBlock current = chain.get(i);
            String expectedPrev = (i == 0) ? GENESIS_PREV_HASH : chain.get(i - 1).getCurrentHash();

            // 1. Kiểm tra liên kết previousHash
            boolean prevLinkOk = expectedPrev.equals(current.getPreviousHash());

            // 2. Băm lại dữ liệu của Block và đối chiếu currentHash
            Map<String, Object> canonicalPayload = canonicalizePayload(current.getDataPayload());
            String recomputedRaw = buildCanonicalBlockString(
                    current.getIndex(),
                    current.getBatchCode(),
                    current.getEventType(),
                    current.getActor(),
                    current.getMerkleRoot(),
                    current.getPreviousHash(),
                    canonicalPayload,
                    current.getNonce() != null ? current.getNonce() : 1024L,
                    current.getTimestamp()
            );
            String recomputedHash = sha256Hex(recomputedRaw);
            boolean hashMatches = recomputedHash.equals(current.getCurrentHash());

            // 3. Kiểm tra chữ ký số ECDSA
            boolean signatureValid = verifyEcdsaSignature(current.getCurrentHash(), current.getDigitalSignature());

            if (!prevLinkOk || !hashMatches || !signatureValid) {
                isValid = false;
                verificationSteps.add(String.format(
                        "Block #%d [%s]: TAMPERED! (prevLink=%s, hashMatch=%s, ecdsaSig=%s)",
                        current.getIndex(), current.getEventType(), prevLinkOk, hashMatches, signatureValid
                ));
            } else {
                verificationSteps.add(String.format(
                        "Block #%d [%s]: VALID (Hash=%s..., ECDSA=VERIFIED)",
                        current.getIndex(), current.getEventType(), current.getCurrentHash().substring(0, 12)
                ));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("batchCode", batchCode);
        result.put("totalBlocks", chain.size());
        result.put("chainValid", isValid);
        result.put("hashAlgorithm", "SHA-256 + Merkle Tree + ECDSA (secp256r1)");
        result.put("verificationSteps", verificationSteps);
        result.put("verifiedAt", Instant.now().toString());
        return result;
    }

    /**
     * Tính toán Merkle Root từ danh sách bản ghi Telemetry (72h IoT Audit).
     */
    public String computeMerkleRoot(List<String> leaves) {
        if (leaves == null || leaves.isEmpty()) {
            return sha256Hex("EMPTY_MERKLE_TREE");
        }
        List<String> currentLevel = leaves.stream()
                .map(this::sha256Hex)
                .collect(Collectors.toList());

        while (currentLevel.size() > 1) {
            List<String> nextLevel = new ArrayList<>();
            for (int i = 0; i < currentLevel.size(); i += 2) {
                String left = currentLevel.get(i);
                String right = (i + 1 < currentLevel.size()) ? currentLevel.get(i + 1) : left;
                nextLevel.add(sha256Hex(left + right));
            }
            currentLevel = nextLevel;
        }
        return currentLevel.get(0);
    }

    public String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encoded.length);
            for (byte b : encoded) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failure", e);
        }
    }

    private KeyPair getOrCreateActorKeyPair(String actorKey) {
        return actorKeyPairs.computeIfAbsent(actorKey, k -> {
            try {
                KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EC");
                keyGen.initialize(new ECGenParameterSpec("secp256r1"), new SecureRandom());
                return keyGen.generateKeyPair();
            } catch (Exception e) {
                throw new RuntimeException("ECDSA KeyPair generation failed", e);
            }
        });
    }

    /**
     * Ký số Bất đối xứng ECDSA (SHA256withECDSA) và nhúng kèm PublicKey X.509 Base64
     * theo định dạng: "ECDSA-SHA256:<sigBase64>:<pubKeyBase64>"
     */
    private String signWithEcdsaPki(String actorKey, String hashData) {
        try {
            KeyPair kp = getOrCreateActorKeyPair(actorKey != null ? actorKey : "SYSTEM");
            Signature ecdsaSign = Signature.getInstance("SHA256withECDSA");
            ecdsaSign.initSign(kp.getPrivate());
            ecdsaSign.update(hashData.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = ecdsaSign.sign();

            String sigB64 = Base64.getEncoder().encodeToString(signatureBytes);
            String pubB64 = Base64.getEncoder().encodeToString(kp.getPublic().getEncoded());
            return "ECDSA-SHA256:" + sigB64 + ":" + pubB64;
        } catch (Exception e) {
            throw new RuntimeException("ECDSA signing error", e);
        }
    }

    public boolean verifyEcdsaSignature(String hashData, String formattedSignature) {
        if (formattedSignature == null || !formattedSignature.startsWith("ECDSA-SHA256:")) {
            return false;
        }
        try {
            String[] parts = formattedSignature.split(":");
            if (parts.length != 3) {
                return false;
            }
            byte[] sigBytes = Base64.getDecoder().decode(parts[1]);
            byte[] pubBytes = Base64.getDecoder().decode(parts[2]);

            KeyFactory kf = KeyFactory.getInstance("EC");
            PublicKey publicKey = kf.generatePublic(new X509EncodedKeySpec(pubBytes));

            Signature verifier = Signature.getInstance("SHA256withECDSA");
            verifier.initVerify(publicKey);
            verifier.update(hashData.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(sigBytes);
        } catch (Exception e) {
            return false;
        }
    }
}
