package com.smartchain.controller;

import com.smartchain.dto.SensorTelemetryDto;
import com.smartchain.entity.StorageProfile;
import com.smartchain.model.BlockchainBlock;
import com.smartchain.model.FoodBatchDocument;
import com.smartchain.repository.mysql.RoleRepository;
import com.smartchain.repository.mysql.StorageProfileRepository;
import com.smartchain.repository.mysql.UserRepository;
import com.smartchain.service.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Bộ điều khiển trung tâm phục vụ 100% quy trình 6 Giai đoạn của Hệ thống Truy
 * xuất Nguồn gốc Siêu thị
 * và Bảng điều khiển 5 Cơ sở dữ liệu NoSQL Polyglot.
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class SupplyChainWorkflowController {

    private final StorageProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BlockchainLedgerService blockchainService;
    private final CassandraTelemetryService cassandraService;
    private final RedisPolyglotService redisService;
    private final Neo4jSupplyChainService neo4jService;
    private final AiShelfLifePredictionService aiService;
    private final MqttIngestionService mqttService;
    private final SimpMessagingTemplate messagingTemplate;

    private final List<Map<String, Object>> dynamicCompletedTrips = new java.util.concurrent.CopyOnWriteArrayList<>();

    @Value("${MYSQL_HOST:localhost}")
    private String mysqlHost;

    @Value("${REDIS_HOST:localhost}")
    private String redisHost;

    @Value("${MONGO_HOST:localhost}")
    private String mongoHost;

    @Value("${CASSANDRA_HOST:localhost}")
    private String cassandraHost;

    @Value("${NEO4J_HOST:localhost}")
    private String neo4jHost;

    public SupplyChainWorkflowController(StorageProfileRepository profileRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            BlockchainLedgerService blockchainService,
            CassandraTelemetryService cassandraService,
            RedisPolyglotService redisService,
            Neo4jSupplyChainService neo4jService,
            AiShelfLifePredictionService aiService,
            MqttIngestionService mqttService,
            SimpMessagingTemplate messagingTemplate) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.blockchainService = blockchainService;
        this.cassandraService = cassandraService;
        this.redisService = redisService;
        this.neo4jService = neo4jService;
        this.aiService = aiService;
        this.mqttService = mqttService;
        this.messagingTemplate = messagingTemplate;
    }

    // Phase 1: Batch Genesis, Dual QR Serialization & Merkle Ledger
    @GetMapping("/batches")
    public ResponseEntity<List<FoodBatchDocument>> getAllBatches() {
        return ResponseEntity.ok(blockchainService.findAllBatches());
    }

    @GetMapping("/batches/{batchCode}")
    public ResponseEntity<?> getBatchDetail(@PathVariable String batchCode) {
        return blockchainService.findBatchByCode(batchCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/batches")
    public ResponseEntity<?> createPolymorphicBatch(@RequestBody Map<String, Object> body) {
        String batchCode = String.valueOf(body.getOrDefault("batch_code",
                body.getOrDefault("batchCode", "LOT-NEW-" + (System.currentTimeMillis() % 10000))));
        String productName = String
                .valueOf(body.getOrDefault("product_name", body.getOrDefault("productName", "Thực phẩm Tươi sống")));
        String category = String.valueOf(body.getOrDefault("category", body.getOrDefault("categoryCode", "VEG_FRUIT")))
                .toUpperCase();
        String farmName = String.valueOf(body.getOrDefault("farm_name",
                body.getOrDefault("farmName", body.getOrDefault("farmOrigin", "Nông trại Liên kết VietGAP"))));
        int packageCount = body.get("package_count") instanceof Number p1 ? p1.intValue()
                : (body.get("packageCount") instanceof Number p2 ? p2.intValue() : 50);
        double weightPerPackage = body.get("weight_per_package_kg") instanceof Number wp1 ? wp1.doubleValue()
                : (body.get("weightPerPackageKg") instanceof Number wp2 ? wp2.doubleValue() : 10.0);
        String packageUnit = String.valueOf(
                body.getOrDefault("package_unit", body.getOrDefault("packageUnit", "Thùng carton tiêu chuẩn")));
        int unitsPerPackage = body.get("units_per_package") instanceof Number up1 ? up1.intValue()
                : (body.get("unitsPerPackage") instanceof Number up2 ? up2.intValue() : 20);

        double totalWeight = body.get("total_weight_kg") instanceof Number tw1 ? tw1.doubleValue()
                : (body.get("totalWeightKg") instanceof Number tw2 ? tw2.doubleValue()
                        : (body.get("weightKg") instanceof Number w1 ? w1.doubleValue()
                                : (body.get("weight_kg") instanceof Number w2 ? w2.doubleValue()
                                        : packageCount * weightPerPackage)));

        if (totalWeight < 100.0) {
            totalWeight = Math.max(100.0, packageCount * weightPerPackage);
        }
        if (totalWeight < 100.0)
            totalWeight = 500.0;

        int unitCount = body.get("unit_count") instanceof Number n1 ? n1.intValue()
                : (body.get("unitCount") instanceof Number n2 ? n2.intValue() : packageCount * unitsPerPackage);
        double weightKg = totalWeight > 0 ? Math.max(0.1, totalWeight / unitCount)
                : (body.get("unit_weight_kg") instanceof Number u1 ? u1.doubleValue()
                        : (body.get("unitWeightKg") instanceof Number u2 ? u2.doubleValue() : 0.5));
        double price = body.get("unit_price") instanceof Number p1 ? p1.doubleValue()
                : (body.get("unitPrice") instanceof Number p2 ? p2.doubleValue() : 65000.0);
        String vehiclePlate = String.valueOf(body.getOrDefault("transportVehiclePlate",
                body.getOrDefault("vehicle_plate", body.getOrDefault("vehiclePlate", "")))).trim();

        FoodBatchDocument doc = new FoodBatchDocument();
        doc.setBatchCode(batchCode);
        doc.setBatchQrCode("QR-BATCH-" + batchCode);
        doc.setProductName(productName);
        doc.setCategory(category);
        doc.setFarmName(farmName);
        doc.setHarvestDate(Instant.now());
        doc.setStatus(vehiclePlate.isEmpty() ? "CREATED" : "READY_FOR_PICKUP");
        doc.setPackageCount(packageCount);
        doc.setWeightPerPackageKg(weightPerPackage);
        doc.setPackageUnit(packageUnit);
        doc.setUnitsPerPackage(unitsPerPackage);
        doc.setTotalWeightKg(totalWeight);
        doc.setUnitCount(unitCount);
        doc.setUnitWeightKg(weightKg);
        doc.setUnitPrice(price);

        doc.getTransportJourney().put("vehicle_plate", vehiclePlate);
        if (!vehiclePlate.isEmpty()) {
            String matchedDriver = userRepository.findAll().stream()
                    .filter(u -> u.getAssignedEntity() != null
                            && u.getAssignedEntity().toUpperCase().contains(vehiclePlate.toUpperCase()))
                    .map(com.smartchain.entity.User::getFullName)
                    .findFirst()
                    .orElse("");
            doc.getTransportJourney().put("driver_name", matchedDriver);
        } else {
            doc.getTransportJourney().put("driver_name", "");
        }

        if (body.get("standards") instanceof List<?> stds) {
            doc.setStandards(stds.stream().map(String::valueOf).collect(Collectors.toList()));
        } else {
            doc.setStandards(List.of("VietGAP", "HACCP"));
        }

        if (body.get("certifications") instanceof List<?> certs) {
            doc.setCertifications((List<Map<String, Object>>) certs);
        }
        if (body.get("cultivation_details") instanceof Map<?, ?> cult) {
            doc.setCultivationDetails((Map<String, Object>) cult);
        }
        if (body.get("dynamic_attributes") instanceof Map<?, ?> dyn) {
            doc.setDynamicAttributes((Map<String, Object>) dyn);
        } else if (body.get("dynamicAttributes") instanceof Map<?, ?> dyn2) {
            doc.setDynamicAttributes((Map<String, Object>) dyn2);
        } else if (body.get("polymorphicMetadata") instanceof Map<?, ?> poly) {
            doc.setDynamicAttributes((Map<String, Object>) poly);
        }

        blockchainService.saveFoodBatch(doc);
        List<FoodBatchDocument.ItemQrSerial> items = blockchainService.generateItemQrSerials(batchCode, 5, weightKg,
                price);

        // Đúc Khối Genesis #0 trên Sổ cái Blockchain
        BlockchainBlock genesisBlock = blockchainService.mintBlock(
                batchCode,
                "GENESIS_BATCH_CREATED",
                farmName,
                "PRODUCER",
                Map.of(
                        "batchQrCode", doc.getBatchQrCode(),
                        "productName", productName,
                        "category", category,
                        "unitCount", unitCount,
                        "dynamicAttributes", doc.getDynamicAttributes(),
                        "cultivationDetails", doc.getCultivationDetails()),
                List.of("GENESIS|" + batchCode + "|" + Instant.now()));

        // Ghi nhận nút Nông trại & Lô hàng vào Đồ thị Neo4j
        neo4jService.upsertBatchToGraph(
                batchCode, productName, category, farmName, vehiclePlate,
                Collections.emptyList(),
                Collections.emptyList(),
                items.stream().map(FoodBatchDocument.ItemQrSerial::getSerialCode).collect(Collectors.toList()));

        // Phát sự kiện đồng bộ toàn hệ thống qua WebSocket để Admin, Tài xế, Quản lý lô
        // thấy ngay lập tức
        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", doc.getStatus());
        wsPayload.put("event", "BATCH_CREATED");
        wsPayload.put("productName", productName);
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", doc.getStatus());
        response.put("batchCode", batchCode);
        response.put("batch_code", batchCode);
        response.put("txHash", genesisBlock.getCurrentHash());
        response.put("batch", doc);
        response.put("genesisBlock", genesisBlock);
        response.put("generatedItemQrs", items);
        return ResponseEntity.status(201).body(response);
    }

    @SuppressWarnings("unchecked")
    @PutMapping("/batches/{batchCode}")
    public ResponseEntity<?> updateFoodBatch(@PathVariable String batchCode, @RequestBody Map<String, Object> body) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument doc = batchOpt.get();

        if (body.containsKey("productName") || body.containsKey("product_name")) {
            String pName = String.valueOf(body.getOrDefault("productName", body.get("product_name"))).trim();
            if (!pName.isEmpty())
                doc.setProductName(pName);
        }
        if (body.containsKey("category") || body.containsKey("categoryCode")) {
            String cat = String.valueOf(body.getOrDefault("category", body.get("categoryCode"))).trim().toUpperCase();
            if (!cat.isEmpty())
                doc.setCategory(cat);
        }
        if (body.containsKey("farmName") || body.containsKey("farmOrigin") || body.containsKey("farm_name")) {
            String fName = String
                    .valueOf(body.getOrDefault("farmName", body.getOrDefault("farmOrigin", body.get("farm_name"))))
                    .trim();
            if (!fName.isEmpty())
                doc.setFarmName(fName);
        }
        if (body.get("packageCount") instanceof Number pc)
            doc.setPackageCount(pc.intValue());
        else if (body.get("package_count") instanceof Number pc2)
            doc.setPackageCount(pc2.intValue());

        if (body.get("weightPerPackageKg") instanceof Number wp)
            doc.setWeightPerPackageKg(wp.doubleValue());
        else if (body.get("weight_per_package_kg") instanceof Number wp2)
            doc.setWeightPerPackageKg(wp2.doubleValue());

        if (body.containsKey("packageUnit"))
            doc.setPackageUnit(String.valueOf(body.get("packageUnit")).trim());
        else if (body.containsKey("package_unit"))
            doc.setPackageUnit(String.valueOf(body.get("package_unit")).trim());

        if (body.get("totalWeightKg") instanceof Number tw && tw.doubleValue() > 0) {
            doc.setTotalWeightKg(Math.max(100.0, tw.doubleValue()));
        } else if (body.get("total_weight_kg") instanceof Number tw2 && tw2.doubleValue() > 0) {
            doc.setTotalWeightKg(Math.max(100.0, tw2.doubleValue()));
        } else if (body.get("weightKg") instanceof Number wKg && wKg.doubleValue() > 0) {
            doc.setTotalWeightKg(Math.max(100.0, wKg.doubleValue()));
            int units = doc.getUnitCount() != null && doc.getUnitCount() > 0 ? doc.getUnitCount() : 100;
            doc.setUnitWeightKg(Math.round((doc.getTotalWeightKg() / units) * 100.0) / 100.0);
        }
        if (body.containsKey("vehiclePlate") || body.containsKey("transportVehiclePlate")) {
            String plate = String.valueOf(body.getOrDefault("vehiclePlate", body.get("transportVehiclePlate"))).trim()
                    .toUpperCase();
            doc.getTransportJourney().put("vehicle_plate", plate);
            if (plate.isEmpty()) {
                doc.getTransportJourney().put("driver_name", "");
                if ("READY_FOR_PICKUP".equals(doc.getStatus()) || "ASSIGNED_PENDING".equals(doc.getStatus())) {
                    doc.setStatus("CREATED");
                }
            } else {
                String matchedDriver = userRepository.findAll().stream()
                        .filter(u -> u.getAssignedEntity() != null
                                && u.getAssignedEntity().toUpperCase().contains(plate))
                        .map(com.smartchain.entity.User::getFullName)
                        .findFirst()
                        .orElse(String.valueOf(doc.getTransportJourney().getOrDefault("driver_name", "")));
                doc.getTransportJourney().put("driver_name", matchedDriver);
            }
        }
        if (body.get("polymorphicMetadata") instanceof Map<?, ?> poly) {
            doc.getDynamicAttributes().putAll((Map<String, Object>) poly);
        } else if (body.get("dynamicAttributes") instanceof Map<?, ?> dyn) {
            doc.getDynamicAttributes().putAll((Map<String, Object>) dyn);
        }

        blockchainService.saveFoodBatch(doc);
        return ResponseEntity.ok(Map.of(
                "status", "UPDATED",
                "batchCode", batchCode,
                "message", "Đã cập nhật thông tin lô hàng " + batchCode + " thành công!",
                "batch", doc));
    }

    @PostMapping("/batches/{batchCode}/generate-qr")
    public ResponseEntity<?> generateMoreItemQrs(@PathVariable String batchCode,
            @RequestBody(required = false) Map<String, Object> body) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        int count = body != null && body.containsKey("itemCount")
                ? ((Number) body.get("itemCount")).intValue()
                : (body != null && body.containsKey("count") ? ((Number) body.get("count")).intValue() : 5);
        double weight = body != null && body.containsKey("weightKg")
                ? ((Number) body.get("weightKg")).doubleValue()
                : (batch.getUnitWeightKg() != null ? batch.getUnitWeightKg() : 0.5);
        double price = body != null && body.containsKey("price")
                ? ((Number) body.get("price")).doubleValue()
                : (batch.getUnitPrice() != null ? batch.getUnitPrice() : 65000.0);

        List<FoodBatchDocument.ItemQrSerial> newItems = blockchainService.generateItemQrSerials(batchCode, count,
                weight, price);
        blockchainService.saveFoodBatch(batch);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("batchCode", batchCode);
        response.put("batchQrCode", batch.getBatchQrCode());
        response.put("generatedCount", newItems.size());
        response.put("items", newItems);
        response.put("batch", batch);
        return ResponseEntity.ok(response);
    }

    // Phase 2 & 3: Logistics Telemetry & OTA Sync
    @GetMapping("/driver/trips")
    public ResponseEntity<?> getDriverTrips(
            @RequestParam(value = "vehiclePlate", required = false) String vehiclePlate) {
        List<FoodBatchDocument> allBatches = blockchainService.findAllBatches();

        boolean filterByPlate = vehiclePlate != null && !vehiclePlate.isEmpty()
                && !vehiclePlate.equalsIgnoreCase("all");

        FoodBatchDocument activeBatch = allBatches.stream()
                .filter(b -> {
                    String v = String.valueOf(b.getTransportJourney().getOrDefault("vehicle_plate", ""));
                    if (filterByPlate) {
                        return (v.contains(vehiclePlate) || "LOT-VEG-2026-001".equals(b.getBatchCode()))
                                && !"SOLD".equalsIgnoreCase(b.getStatus());
                    } else {
                        return "IN_TRANSIT".equalsIgnoreCase(b.getStatus())
                                || "READY_FOR_PICKUP".equalsIgnoreCase(b.getStatus());
                    }
                })
                .findFirst()
                .orElse(allBatches.isEmpty() ? null : allBatches.get(0));

        Map<String, Object> activeTrip = new LinkedHashMap<>();
        if (activeBatch != null) {
            String vPlate = String.valueOf(activeBatch.getTransportJourney().getOrDefault("vehicle_plate",
                    filterByPlate ? vehiclePlate : "49C-567.89"));
            String dName = String
                    .valueOf(activeBatch.getTransportJourney().getOrDefault("driver_name", "Lê Hoàng Nam"));
            activeTrip.put("batchCode", activeBatch.getBatchCode());
            activeTrip.put("productName", activeBatch.getProductName());
            activeTrip.put("category", activeBatch.getCategory());
            activeTrip.put("vehiclePlate", vPlate);
            activeTrip.put("driverName", dName);
            activeTrip.put("origin", activeBatch.getFarmName());
            activeTrip.put("destination", "Siêu Thị Co.opmart Quận 7 - TP.HCM");
            activeTrip.put("route", resolveBatchRoute(activeBatch));
            activeTrip.put("status", activeBatch.getStatus());
            activeTrip.put("weightKg", activeBatch.getTotalWeightKg() != null ? activeBatch.getTotalWeightKg() : 500.0);
            activeTrip.put("packageCount", activeBatch.getPackageCount() != null ? activeBatch.getPackageCount() : 50);
            activeTrip.put("weightPerPackageKg",
                    activeBatch.getWeightPerPackageKg() != null ? activeBatch.getWeightPerPackageKg() : 10.0);
            activeTrip.put("packageUnit",
                    activeBatch.getPackageUnit() != null ? activeBatch.getPackageUnit() : "Thùng tiêu chuẩn");
            activeTrip.put("targetTemp", "8.0°C - 12.0°C");
            activeTrip.put("departedAt", activeBatch.getTransportJourney().get("departed_at"));
            activeTrip.put("arrivedAt", activeBatch.getTransportJourney().get("arrived_at"));
            activeTrip.put("iotDeviceId", "ESP32-MULTI-01");
        }

        List<Map<String, Object>> tripHistory = new ArrayList<>(dynamicCompletedTrips);
        tripHistory.add(createTripRecord("TRIP-VN-2026-904", "LOT-FISH-2026-001", "Cá Hồi Nauy Phi Lê Tươi Sashimi",
                "Cảng Cát Lái -> Mai Chí Thọ -> Co.opmart Quận 1 (28 km)", "14/11/2026", "03:00", "04:15 - 14/11/2026",
                100, 1.2, "DELIVERED", "Hoàn thành bàn giao quầy tươi", "0x5c81de92ab10372ef89100234ac2b012487ef012",
                "Phạm Tài Xế", "51D-998.12", "Siêu Thị Co.opmart Cống Quỳnh Q1"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-895", "LOT-MEAT-2026-002", "Thịt Thăn Ngoại Bò Wagyu Úc Chilled",
                "Bến Lức -> Bình Chánh -> Co.opmart Quận 7 (48 km)", "14/11/2026", "04:00", "05:30 - 14/11/2026", 100,
                2.1, "DELIVERED", "Hoàn thành bàn giao tủ thịt M2", "0x3e18cf902bb1479fa89012345bc7a102394ef882",
                "Trần Văn Lái", "62C-334.55", "Siêu Thị Co.opmart Quận 7"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-881", "LOT-DAIRY-2026-005",
                "Sữa Tươi Thanh Trùng Đà Lạt Milk 100% Nguyên Chất", "Đơn Dương (Lâm Đồng) -> QL20 -> TP.HCM (295 km)",
                "13/11/2026", "04:30", "10:15 - 13/11/2026", 100, 3.8, "DELIVERED", "Đã hoàn thành chuyến xe",
                "0x8fa3d492c10b771e8432a9bf88234101eef2a912", "Đặng Quốc Huy", "49C-112.33",
                "Siêu Thị Co.opmart Quận 7"));
        tripHistory
                .add(createTripRecord("TRIP-VN-2026-875", "LOT-VEG-2026-000", "Dâu Tây New Zealand Canh Tác Nhà Kính",
                        "Đà Lạt -> Bảo Lộc -> TP.HCM (308 km)", "11/11/2026", "05:00", "11:00 - 11/11/2026", 100, 4.2,
                        "DELIVERED", "Hoàn thành bàn giao siêu thị", "0x4b72ef198a0021cfa593d8492049e382fa0129bc",
                        "Lê Hoàng Nam", "49C-567.89", "Siêu Thị Co.opmart Quận 7"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-860", "LOT-FROZEN-2026-001",
                "Há Cảo Tôm Thượng Hạng Cấp Đông IQF", "Nhà máy Cầu Tre -> Vành Đai Trong -> Co.opmart Gò Vấp (22 km)",
                "10/11/2026", "06:00", "06:50 - 10/11/2026", 100, -20.5, "DELIVERED", "Hoàn thành bàn giao tủ đông F1",
                "0x1a82ef302bb1479ea89012345bc7a102394ef331", "Võ Thành Đạt", "51C-777.99",
                "Siêu Thị Co.opmart Quang Trung"));
        tripHistory.add(
                createTripRecord("TRIP-VN-2026-852", "LOT-DELI-2026-006", "Gà Quay Thảo Mộc Nguyên Con Quầy Deli Nóng",
                        "Bếp trung tâm Thuận An -> QL13 -> Co.opmart Huỳnh Tấn Phát (38 km)", "09/11/2026", "09:30",
                        "10:45 - 09/11/2026", 100, 68.5, "DELIVERED", "Hoàn thành bàn giao quầy Deli",
                        "0x9923ccf321948ba57482394ef39029aab12048aa", "Hoàng Gia Bảo", "61C-889.01",
                        "Siêu Thị Co.opmart Huỳnh Tấn Phát"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-845", "LOT-VEG-2026-015",
                "Cà Chua Beef Hữu Cơ Đơn Dương Lâm Đồng", "Đơn Dương -> Bảo Lộc -> Dầu Giây -> TP.HCM (298 km)",
                "08/11/2026", "04:45", "10:20 - 08/11/2026", 100, 9.6, "DELIVERED", "Hoàn thành bàn giao kệ rau A1",
                "0x7d19ac83201948ba57482394ef39029aab120411", "Đặng Quốc Huy", "49C-112.33",
                "Siêu Thị Co.opmart Quận 7"));
        tripHistory
                .add(createTripRecord("TRIP-VN-2026-839", "LOT-SEA-2026-016", "Cua Hoàng Đế Alaska Tươi Sống Nhập Khẩu",
                        "Tân Sơn Nhất Cargo -> Hoàng Văn Thụ -> Co.opmart Quận 1 (14 km)", "07/11/2026", "02:30",
                        "03:15 - 07/11/2026", 100, 1.1, "DELIVERED", "Hoàn thành bàn giao bể hải sản",
                        "0x6c28bd74190837ef12983475ab90123847ef9901", "Phạm Tài Xế", "51D-998.12",
                        "Siêu Thị Co.opmart Cống Quỳnh Q1"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-831", "LOT-MEAT-2026-017",
                "Ức Gà Phi Lê Hữu Cơ VietGAP Bình Phước", "Chơn Thành -> QL13 -> Co.opmart Thủ Đức (85 km)",
                "06/11/2026", "04:00", "06:10 - 06/11/2026", 100, 1.8, "DELIVERED", "Hoàn thành bàn giao tủ thịt M3",
                "0x4e91fa82736451bc9081726354ef8901234567ab", "Hoàng Gia Bảo", "61C-889.01",
                "Siêu Thị Co.opmart Xa Lộ Hà Nội"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-824", "LOT-DAIRY-2026-018", "Sữa Chua Hy Lạp Men Sống Cao Cấp",
                "Long Thành -> Cao tốc LT-DG -> Co.opmart Quận 3 (42 km)", "05/11/2026", "05:15", "06:30 - 05/11/2026",
                100, 3.5, "DELIVERED", "Hoàn thành bàn giao tủ sữa D3", "0x2b73cd9182736455ab192837465ef0192837465c",
                "Trần Văn Lái", "62C-334.55", "Siêu Thị Co.opmart Nguyễn Đình Chiểu Q3"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-818", "LOT-VEG-2026-021", "Ớt Chuông Đà Lạt 3 Màu GlobalGAP",
                "Đà Lạt -> QL20 -> Co.opmart Phú Mỹ Hưng (308 km)", "04/11/2026", "05:00", "10:50 - 04/11/2026", 99,
                9.4, "DELIVERED", "Hoàn thành bàn giao siêu thị", "0x9a18bc7263548910ef28374651928374ab5612cd",
                "Lê Hoàng Nam", "49C-567.89", "Siêu Thị Co.opmart Phú Mỹ Hưng"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-810", "LOT-FROZEN-2026-022",
                "Chả Giò Hải Sản Cấp Đông Xuất Khẩu", "KCN Tân Bình -> Trường Chinh -> Co.opmart Tân Phú (16 km)",
                "03/11/2026", "06:30", "07:15 - 03/11/2026", 100, -19.8, "DELIVERED", "Hoàn thành bàn giao tủ đông F2",
                "0x8c27de6152437891ab0192837465ef8910293847", "Võ Thành Đạt", "51C-777.99",
                "Siêu Thị Co.opmart Tân Phú"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-802", "LOT-VEG-2026-023", "Bông Cải Xanh Baby Đà Lạt Hữu Cơ",
                "Đà Lạt -> Bảo Lộc -> Dầu Giây -> Co.opmart Quận 7 (308 km)", "02/11/2026", "04:30",
                "10:25 - 02/11/2026", 100, 8.9, "DELIVERED", "Hoàn thành bàn giao kệ mát A2",
                "0x3f48ab9182736450cd192837465ef81920394857", "Lê Hoàng Nam", "49C-567.89",
                "Siêu Thị Co.opmart Quận 7"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-795", "LOT-SEA-2026-024", "Mực Ống Phú Quốc Cấp Đông Tươi",
                "Rạch Giá -> Cao tốc Trung Lương -> Co.opmart Quận 1 (245 km)", "01/11/2026", "01:30",
                "06:15 - 01/11/2026", 98, 0.8, "DELIVERED", "Hoàn thành bàn giao quầy hải sản",
                "0x5d92ef8172635490ab123456789cd0192837465a", "Phạm Tài Xế", "51D-998.12",
                "Siêu Thị Co.opmart Cống Quỳnh Q1"));
        tripHistory.add(createTripRecord("TRIP-VN-2026-788", "LOT-MEAT-2026-025", "Sườn Non Heo Mát MEATDeli",
                "Đức Hòa (Long An) -> Quốc Lộ 1A -> Co.opmart Bình Tân (32 km)", "31/10/2026", "04:15",
                "05:20 - 31/10/2026", 100, 2.3, "DELIVERED", "Hoàn thành bàn giao tủ thịt M1",
                "0x1e74bc9283746510ef918273645ab1029384756d", "Trần Văn Lái", "62C-334.55",
                "Siêu Thị Co.opmart Bình Tân"));

        if (filterByPlate) {
            final String plate = vehiclePlate.trim();
            tripHistory = tripHistory.stream()
                    .filter(t -> plate.equalsIgnoreCase(String.valueOf(t.get("vehiclePlate")).trim()))
                    .toList();
        }

        return ResponseEntity.ok(Map.of(
                "vehiclePlate", vehiclePlate != null ? vehiclePlate : "ALL",
                "activeTrip", activeTrip,
                "tripHistory", tripHistory));
    }

    private String resolveBatchRoute(FoodBatchDocument batch) {
        if (batch == null)
            return "Đà Lạt (Lâm Đồng) -> QL20 -> Bảo Lộc -> Dầu Giây -> TP.HCM (308 km)";
        String code = batch.getBatchCode() != null ? batch.getBatchCode().toUpperCase() : "";
        String cat = batch.getCategory() != null ? batch.getCategory().toUpperCase() : "";
        String name = batch.getProductName() != null ? batch.getProductName().toLowerCase() : "";

        if (code.contains("FISH") || cat.contains("SEAFOOD") || name.contains("cá") || name.contains("hải sản")) {
            return "Cảng Cát Lái -> Mai Chí Thọ -> Co.opmart Quận 1 (28 km)";
        } else if (code.contains("MEAT") || cat.contains("MEAT") || name.contains("thịt")) {
            return "Bến Lức (Long An) -> Bình Chánh -> Co.opmart Quận 7 (48 km)";
        } else if (code.contains("DAIRY") || cat.contains("DAIRY") || name.contains("sữa")) {
            return "Đơn Dương (Lâm Đồng) -> Đèo Chuối -> TP.HCM (295 km)";
        } else if (code.contains("FROZEN") || cat.contains("FROZEN") || name.contains("đông lạnh")
                || name.contains("cảo")) {
            return "Nhà máy Cầu Tre (Tân Phú) -> Co.opmart Gò Vấp (22 km)";
        } else if (code.contains("DELI") || cat.contains("COOKED") || name.contains("gà quay")
                || name.contains("chế biến")) {
            return "Bếp trung tâm Thuận An -> Đại lộ Bình Dương -> Co.opmart Huỳnh Tấn Phát (38 km)";
        }
        return "Đà Lạt (Lâm Đồng) -> QL20 -> Bảo Lộc -> Dầu Giây -> TP.HCM (308 km)";
    }

    private Map<String, Object> createTripRecord(String tripId, String batchCode, String productName, String route,
            String date, String departureTime, String arrivalTime, int complianceScore,
            double avgTemp, String status, String statusText, String blockchainHash,
            String driverName, String vehiclePlate, String supermarket) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("tripId", tripId);
        map.put("batchCode", batchCode);
        map.put("productName", productName);
        map.put("route", route);
        map.put("date", date);
        map.put("departureTime", departureTime);
        map.put("arrivalTime", arrivalTime);
        map.put("complianceScore", complianceScore);
        map.put("avgTemp", avgTemp);
        map.put("status", status);
        map.put("statusText", statusText);
        map.put("blockchainHash", blockchainHash);
        map.put("driverName", driverName != null ? driverName : "Lê Hoàng Nam");
        map.put("vehiclePlate", vehiclePlate != null ? vehiclePlate : "49C-567.89");
        map.put("supermarket", supermarket != null ? supermarket : "Siêu Thị Co.opmart Quận 7");
        return map;
    }

    private Map<String, Object> createTripRecord(String tripId, String batchCode, String productName, String route,
            String date, String departureTime, String arrivalTime, int complianceScore,
            double avgTemp, String status, String statusText, String blockchainHash) {
        return createTripRecord(tripId, batchCode, productName, route, date, departureTime, arrivalTime,
                complianceScore, avgTemp, status, statusText, blockchainHash, "Lê Hoàng Nam", "49C-567.89",
                "Siêu Thị Co.opmart Quận 7");
    }

    @PostMapping("/driver/start-trip")
    public ResponseEntity<?> startDriverTrip(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "LOT-VEG-2026-001");
        String vehiclePlate = body.getOrDefault("vehiclePlate", "49C-567.89");
        String driverName = body.getOrDefault("driverName", "Lê Hoàng Nam");

        // Kiểm tra quy tắc đơn nhiệm: 1 tài xế / 1 phương tiện chỉ được chở 1 lô hàng
        // cùng lúc
        // Hai tài xế khác nhau trên hai phương tiện khác nhau hoàn toàn được phép chạy
        // song song độc lập
        List<FoodBatchDocument> allBatches = blockchainService.findAllBatches();
        final String targetPlate = vehiclePlate != null ? vehiclePlate.trim().toUpperCase() : "";
        final String targetDriver = driverName != null ? driverName.trim().toLowerCase() : "";

        Optional<FoodBatchDocument> alreadyRunning = allBatches.stream()
                .filter(b -> "IN_TRANSIT".equalsIgnoreCase(b.getStatus())
                        && !batchCode.equalsIgnoreCase(b.getBatchCode()))
                .filter(b -> {
                    String v = String.valueOf(b.getTransportJourney().getOrDefault("vehicle_plate", "")).trim()
                            .toUpperCase();
                    String d = String.valueOf(b.getTransportJourney().getOrDefault("driver_name", "")).trim()
                            .toLowerCase();
                    boolean matchVehicle = !targetPlate.isEmpty() && !v.isEmpty()
                            && (v.equals(targetPlate) || targetPlate.contains(v) || v.contains(targetPlate));
                    boolean matchDriver = !targetDriver.isEmpty() && !d.isEmpty()
                            && (d.contains(targetDriver) || targetDriver.contains(d));
                    return matchVehicle || matchDriver;
                })
                .findFirst();

        if (alreadyRunning.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "DRIVER_CONCURRENCY_VIOLATION",
                    "message",
                    "Phương tiện / Tài xế đang vận chuyển lô hàng " + alreadyRunning.get().getBatchCode() + " ("
                            + alreadyRunning.get().getProductName()
                            + "). Phải hoàn thành chuyến xe hiện tại trước khi bắt đầu chở lô tiếp theo trong hàng đợi!",
                    "activeBatchCode", alreadyRunning.get().getBatchCode()));
        }

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FoodBatchDocument batch = batchOpt.get();
        String resolvedRoute = resolveBatchRoute(batch);
        batch.setStatus("IN_TRANSIT");
        batch.getTransportJourney().put("vehicle_plate", vehiclePlate);
        batch.getTransportJourney().put("driver_name", driverName);
        batch.getTransportJourney().put("route", resolvedRoute);
        batch.getTransportJourney().put("departed_at", Instant.now().toString());
        batch.getTransportJourney().put("status", "IN_TRANSIT");
        batch.getTransportJourney().put("door_open", false);
        batch.getTransportJourney().put("loading_confirmed", true);
        batch.getTransportJourney().put("iot_device_id", "ESP32-MULTI-01");
        blockchainService.saveFoodBatch(batch);

        BlockchainBlock block = blockchainService.mintBlock(
                batchCode,
                "DRIVER_DEPARTED_IN_TRANSIT",
                driverName + " (" + vehiclePlate + ")",
                "LOGISTICS_DRIVER",
                Map.of(
                        "action", "TRUCK_DEPARTED",
                        "route", resolvedRoute,
                        "departedAt", Instant.now().toString(),
                        "telemetryActive", true),
                cassandraService.buildMerkleLeavesForBatch(batchCode));

        try {
            mqttService.syncDynamicProfileToEsp32(batchCode, batch.getCategory(), vehiclePlate, "ESP32-MULTI-01",
                    batch.getProductName());
        } catch (Exception e) {
            // MQTT optional
        }

        Map<String, Object> wsPayload = Map.of(
                "batchCode", batchCode,
                "status", "IN_TRANSIT",
                "event", "DRIVER_DEPARTED",
                "vehiclePlate", vehiclePlate,
                "driverName", driverName,
                "timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "status", "IN_TRANSIT",
                "batchCode", batchCode,
                "message", "Chuyến xe đã khởi hành! Dữ liệu giám sát chuỗi lạnh bắt đầu kích hoạt.",
                "block", block,
                "batch", batch));
    }

    @PostMapping("/driver/complete-trip")
    public ResponseEntity<?> completeDriverTrip(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "LOT-VEG-2026-001");
        String supermarket = body.getOrDefault("supermarketName", "Siêu Thị Co.opmart Quận 7");
        String driverName = body.getOrDefault("driverName", "Lê Hoàng Nam");

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FoodBatchDocument batch = batchOpt.get();
        // Không ghi đè lùi trạng thái nếu lô hàng đã được KCS nghiệm thu hoặc đã lên kệ
        String prevSt = batch.getStatus() != null ? batch.getStatus().trim().toUpperCase() : "";
        if (!"QC_ACCEPTED".equals(prevSt) && !"ON_SHELF".equals(prevSt) && !"SOLD".equals(prevSt)
                && !"RECALLED".equals(prevSt)) {
            batch.setStatus("ARRIVED_AT_STORE");
        }
        batch.getTransportJourney().put("arrived_at", Instant.now().toString());
        batch.getTransportJourney().put("destination_store", supermarket);
        batch.getTransportJourney().put("status", "ARRIVED_AT_STORE");
        blockchainService.saveFoodBatch(batch);

        BlockchainBlock block = blockchainService.mintBlock(
                batchCode,
                "TRUCK_ARRIVED_AT_SUPERMARKET",
                driverName,
                "LOGISTICS_DRIVER",
                Map.of(
                        "action", "ARRIVED_AT_SUPERMARKET",
                        "supermarket", supermarket,
                        "arrivedAt", Instant.now().toString()),
                cassandraService.buildMerkleLeavesForBatch(batchCode));

        String vehiclePlate = String.valueOf(batch.getTransportJourney().getOrDefault("vehicle_plate", "49C-567.89"));
        try {
            neo4jService.recordTruckDeliveryToStore(batchCode, vehiclePlate, supermarket);
        } catch (Exception e) {
            // Neo4j optional
        }

        // Lưu ngay vào lịch sử chuyến xe thực tế của tài xế
        String completedRoute = resolveBatchRoute(batch);
        Map<String, Object> savedTrip = createTripRecord(
                "TRIP-VN-" + (System.currentTimeMillis() % 10000),
                batchCode,
                batch.getProductName(),
                completedRoute,
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                String.valueOf(batch.getTransportJourney().getOrDefault("departed_at", "05:30")),
                java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) + " - Hôm nay",
                100,
                9.5,
                "DELIVERED",
                "Đã đến cổng kho tiếp nhận, chờ KCS kiểm định",
                block.getCurrentHash(),
                driverName,
                vehiclePlate,
                supermarket);
        dynamicCompletedTrips.add(0, savedTrip);

        // Đưa thiết bị IoT ESP32 về trạng thái STANDBY (tắt relay, tắt chuông, hiện màn
        // hình chờ)
        try {
            mqttService.resetEsp32ToStandby("ESP32-MULTI-01");
        } catch (Exception ignored) {
        }

        messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                "batchCode", batchCode,
                "status", batch.getStatus(),
                "event", "DRIVER_ARRIVED",
                "supermarket", supermarket,
                "timestamp", Instant.now().toString()));

        return ResponseEntity.ok(Map.of(
                "status", batch.getStatus(),
                "batchCode", batchCode,
                "message", "Xe lạnh đã đến cổng kho tiếp nhận an toàn! Đang chờ kiểm định viên KCS nghiệm thu chất lượng.",
                "block", block,
                "batch", batch,
                "completedTrip", savedTrip,
                "tripHistory", dynamicCompletedTrips));
    }

    @PostMapping("/driver/reset-trip")
    public ResponseEntity<?> resetDriverTrip(@RequestBody(required = false) Map<String, String> body) {
        String batchCode = body != null ? body.getOrDefault("batchCode", "LOT-VEG-2026-001") : "LOT-VEG-2026-001";
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isPresent()) {
            FoodBatchDocument batch = batchOpt.get();
            batch.setStatus("READY_FOR_PICKUP");
            batch.getTransportJourney().put("status", "READY_FOR_PICKUP");
            batch.getTransportJourney().remove("departed_at");
            batch.getTransportJourney().remove("arrived_at");
            batch.getTransportJourney().put("door_open", false);
            batch.getTransportJourney().put("loading_confirmed", false);
            batch.getTransportJourney().remove("door_locked_after_delivery");
            batch.getTransportJourney().remove("door_request_status");
            batch.getTransportJourney().remove("door_request_reason");
            blockchainService.saveFoodBatch(batch);
        }
        try {
            mqttService.resetEsp32ToStandby("ESP32-MULTI-01");
        } catch (Exception ignored) {
        }
        messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                "batchCode", batchCode,
                "status", "READY_FOR_PICKUP",
                "event", "DRIVER_RESET"));
        return ResponseEntity.ok(Map.of(
                "status", "READY_FOR_PICKUP",
                "batchCode", batchCode,
                "message", "Đã đặt lại trạng thái chờ khởi hành"));
    }

    // Driver Assignment & Sensor Operations
    @PostMapping("/driver/assign-batch")
    public ResponseEntity<?> assignBatchToDriver(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "").trim();
        String driverUsername = body.getOrDefault("driverUsername", "").trim();
        String driverName = body.getOrDefault("driverName", "").trim();
        String vehiclePlate = body.getOrDefault("vehiclePlate", "").trim().toUpperCase();

        if (batchCode.isEmpty() || (driverName.isEmpty() && vehiclePlate.isEmpty())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Vui lòng chọn lô hàng và tài xế cần giao!"));
        }

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();

        // Kiểm tra xem tài xế này đã nhận/đang chờ tối đa 3 lô hàng chưa
        List<FoodBatchDocument> allBatches = blockchainService.findAllBatches();
        long currentDriverActiveCount = allBatches.stream()
                .filter(b -> !batchCode.equalsIgnoreCase(b.getBatchCode()))
                .filter(b -> {
                    String st = String.valueOf(b.getStatus()).toUpperCase();
                    return "ASSIGNED_PENDING".equals(st) || "READY_FOR_PICKUP".equals(st) || "IN_TRANSIT".equals(st);
                })
                .filter(b -> {
                    String v = String.valueOf(b.getTransportJourney().getOrDefault("vehicle_plate", "")).trim()
                            .toUpperCase();
                    String d = String.valueOf(b.getTransportJourney().getOrDefault("driver_name", "")).trim()
                            .toLowerCase();
                    boolean matchPlate = !vehiclePlate.isEmpty() && !v.isEmpty() && v.equals(vehiclePlate);
                    boolean matchDriver = !driverName.isEmpty() && !d.isEmpty() && d.equalsIgnoreCase(driverName);
                    return matchPlate || matchDriver;
                })
                .count();

        if (currentDriverActiveCount >= 3) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "error", "DRIVER_QUEUE_FULL",
                    "message", "Tài xế " + driverName + " (" + vehiclePlate
                            + ") đã có tối đa 3 lô hàng trong danh sách chờ/vận chuyển! Không thể giao thêm."));
        }

        batch.setStatus("ASSIGNED_PENDING");
        batch.getTransportJourney().put("driver_name", driverName);
        batch.getTransportJourney().put("driver_username", driverUsername);
        batch.getTransportJourney().put("vehicle_plate", vehiclePlate);
        batch.getTransportJourney().put("status", "ASSIGNED_PENDING");
        batch.getTransportJourney().put("assigned_at", Instant.now().toString());
        blockchainService.saveFoodBatch(batch);

        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", "ASSIGNED_PENDING");
        wsPayload.put("event", "BATCH_ASSIGNED");
        wsPayload.put("driverName", driverName);
        wsPayload.put("vehiclePlate", vehiclePlate);
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "status", "ASSIGNED_PENDING",
                "batchCode", batchCode,
                "driverName", driverName,
                "vehiclePlate", vehiclePlate,
                "message",
                "Đã giao lô hàng " + batchCode + " cho tài xế " + driverName + " (" + vehiclePlate
                        + "). Đang chờ tài xế xác nhận nhận lô!",
                "batch", batch));
    }

    @PostMapping("/driver/revoke-batch")
    public ResponseEntity<?> revokeBatchAssignment(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "").trim();
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        if ("IN_TRANSIT".equalsIgnoreCase(batch.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Không thể thu hồi phân công khi chuyến xe đang di chuyển trên đường!"));
        }

        String oldDriver = String.valueOf(batch.getTransportJourney().getOrDefault("driver_name", ""));
        batch.setStatus("CREATED");
        batch.getTransportJourney().put("driver_name", "");
        batch.getTransportJourney().put("driver_username", "");
        batch.getTransportJourney().put("vehicle_plate", "");
        batch.getTransportJourney().put("status", "CREATED");
        blockchainService.saveFoodBatch(batch);

        messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                "batchCode", batchCode,
                "status", "CREATED",
                "event", "BATCH_REVOKED",
                "driverName", "",
                "vehiclePlate", "",
                "timestamp", Instant.now().toString()));

        return ResponseEntity.ok(Map.of(
                "status", "CREATED",
                "batchCode", batchCode,
                "message",
                "Đã thu hồi phân công lô hàng " + batchCode + " khỏi tài xế " + oldDriver
                        + ". Lô hàng đã trở về kho chờ điều phối!",
                "batch", batch));
    }

    @PostMapping("/driver/respond-batch")
    public ResponseEntity<?> respondToBatchAssignment(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "").trim();
        String decision = body.getOrDefault("decision", "ACCEPT").trim().toUpperCase();
        String driverName = body.getOrDefault("driverName", "").trim();
        String vehiclePlate = body.getOrDefault("vehiclePlate", "").trim().toUpperCase();

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();

        if ("REJECT".equals(decision) || "REJECTED".equals(decision)) {
            batch.setStatus("CREATED");
            batch.getTransportJourney().put("driver_name", "");
            batch.getTransportJourney().put("driver_username", "");
            batch.getTransportJourney().put("vehicle_plate", "");
            batch.getTransportJourney().put("status", "CREATED");
            blockchainService.saveFoodBatch(batch);

            messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                    "batchCode", batchCode,
                    "status", "CREATED",
                    "event", "DRIVER_REJECTED_BATCH",
                    "driverName", driverName,
                    "vehiclePlate", vehiclePlate,
                    "timestamp", Instant.now().toString()));

            return ResponseEntity.ok(Map.of(
                    "status", "CREATED",
                    "batchCode", batchCode,
                    "message",
                    "Đã từ chối nhận lô hàng " + batchCode
                            + ". Lô hàng đã được trả về danh sách chờ điều phối của Quản trị viên.",
                    "batch", batch));
        }

        // Nếu ACCEPT: Kiểm tra giới hạn tối đa 3 lô trong hàng đợi của tài xế
        List<FoodBatchDocument> allBatches = blockchainService.findAllBatches();
        long acceptedCount = allBatches.stream()
                .filter(b -> !batchCode.equalsIgnoreCase(b.getBatchCode()))
                .filter(b -> {
                    String st = String.valueOf(b.getStatus()).toUpperCase();
                    return "READY_FOR_PICKUP".equals(st) || "IN_TRANSIT".equals(st);
                })
                .filter(b -> {
                    String v = String.valueOf(b.getTransportJourney().getOrDefault("vehicle_plate", "")).trim()
                            .toUpperCase();
                    String d = String.valueOf(b.getTransportJourney().getOrDefault("driver_name", "")).trim()
                            .toLowerCase();
                    return (!vehiclePlate.isEmpty() && v.equals(vehiclePlate))
                            || (!driverName.isEmpty() && d.equalsIgnoreCase(driverName));
                })
                .count();

        if (acceptedCount >= 3) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "error", "DRIVER_QUEUE_FULL",
                    "message",
                    "Bạn chỉ được nhận tối đa 3 lô hàng vào hàng đợi vận chuyển! Vui lòng hoàn thành bớt chuyến trước khi nhận thêm."));
        }

        batch.setStatus("READY_FOR_PICKUP");
        if (!driverName.isEmpty())
            batch.getTransportJourney().put("driver_name", driverName);
        if (!vehiclePlate.isEmpty())
            batch.getTransportJourney().put("vehicle_plate", vehiclePlate);
        batch.getTransportJourney().put("status", "READY_FOR_PICKUP");
        batch.getTransportJourney().put("loading_confirmed", false);
        batch.getTransportJourney().put("door_open", false);
        batch.getTransportJourney().remove("door_locked_after_delivery");
        batch.getTransportJourney().put("accepted_at", Instant.now().toString());
        blockchainService.saveFoodBatch(batch);

        messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                "batchCode", batchCode,
                "status", "READY_FOR_PICKUP",
                "event", "DRIVER_ACCEPTED_BATCH",
                "driverName", String.valueOf(batch.getTransportJourney().getOrDefault("driver_name", driverName)),
                "vehiclePlate", String.valueOf(batch.getTransportJourney().getOrDefault("vehicle_plate", vehiclePlate)),
                "timestamp", Instant.now().toString()));

        return ResponseEntity.ok(Map.of(
                "status", "READY_FOR_PICKUP",
                "batchCode", batchCode,
                "message", "Đã tiếp nhận thành công lô hàng " + batchCode + " vào hàng đợi vận chuyển!",
                "batch", batch));
    }

    @PostMapping("/driver/request-door-open")
    public ResponseEntity<?> requestEmergencyDoorOpen(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "").trim();
        String driverName = body.getOrDefault("driverName", "Tài xế").trim();
        String vehiclePlate = body.getOrDefault("vehiclePlate", "").trim();
        String reason = body.getOrDefault("reason", "Kiểm tra sự cố kỹ thuật thùng lạnh trên đường").trim();

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        batch.getTransportJourney().put("door_request_status", "PENDING");
        batch.getTransportJourney().put("door_request_reason", reason);
        batch.getTransportJourney().put("door_request_time", Instant.now().toString());
        batch.getTransportJourney().put("door_request_driver", driverName);
        blockchainService.saveFoodBatch(batch);

        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", batch.getStatus());
        wsPayload.put("event", "DOOR_OPEN_REQUESTED");
        wsPayload.put("driverName", driverName);
        wsPayload.put("vehiclePlate", vehiclePlate);
        wsPayload.put("reason", reason);
        wsPayload.put("doorRequestStatus", "PENDING");
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "status", "PENDING",
                "batchCode", batchCode,
                "message",
                "Đã gửi yêu cầu xin mở cửa thùng xe kèm lý do đến Quản trị viên (Admin). Vui lòng chờ phê duyệt!",
                "batch", batch));
    }

    @PostMapping("/driver/approve-door-open")
    public ResponseEntity<?> approveEmergencyDoorOpen(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "").trim();
        String decision = body.getOrDefault("decision", "APPROVED").trim().toUpperCase();
        String adminNote = body.getOrDefault("adminNote", "Quản trị viên đã xác minh và xử lý yêu cầu mở cửa").trim();

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        batch.getTransportJourney().put("door_request_status", decision);
        batch.getTransportJourney().put("door_admin_note", adminNote);
        batch.getTransportJourney().put("door_approved_time", Instant.now().toString());
        blockchainService.saveFoodBatch(batch);

        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", batch.getStatus());
        wsPayload.put("event", "APPROVED".equals(decision) ? "DOOR_OPEN_APPROVED" : "DOOR_OPEN_REJECTED");
        wsPayload.put("doorRequestStatus", decision);
        wsPayload.put("adminNote", adminNote);
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "status", decision,
                "batchCode", batchCode,
                "message", "APPROVED".equals(decision)
                        ? "Đã phê duyệt cho phép tài xế mở cửa thùng xe lô " + batchCode + "!"
                        : "Đã từ chối yêu cầu mở cửa thùng xe lô " + batchCode + "!",
                "batch", batch));
    }

    @PostMapping("/driver/open-door")
    public ResponseEntity<?> handleTruckDoorOpen(@RequestBody Map<String, Object> body) {
        String batchCode = String.valueOf(body.getOrDefault("batchCode", "")).trim();
        boolean isAtDestination = Boolean.TRUE.equals(body.get("isAtDestination"));
        boolean forceOpen = Boolean.TRUE.equals(body.get("forceOpen"));
        String action = String.valueOf(body.getOrDefault("action", "OPEN")).toUpperCase();
        String driverName = String.valueOf(body.getOrDefault("driverName", "Tài xế")).trim();
        String vehiclePlate = String.valueOf(body.getOrDefault("vehiclePlate", "")).trim();

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        String currentStatus = String.valueOf(batch.getStatus()).toUpperCase();
        boolean isDeliveredBatch = "ARRIVED_AT_STORE".equals(currentStatus)
                || "DELIVERED".equals(currentStatus)
                || "QC_ACCEPTED".equals(currentStatus)
                || "ON_SHELF".equals(currentStatus)
                || "SOLD".equals(currentStatus);

        if ("CLOSE".equals(action)) {
            batch.getTransportJourney().put("door_open", false);
            if (isDeliveredBatch) {
                batch.getTransportJourney().put("door_locked_after_delivery", true);
            }
            blockchainService.saveFoodBatch(batch);
            messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                    "batchCode", batchCode,
                    "status", batch.getStatus(),
                    "event", "DOOR_CLOSED",
                    "doorOpen", false,
                    "doorLockedAfterDelivery", isDeliveredBatch,
                    "timestamp", Instant.now().toString()));
            return ResponseEntity.ok(Map.of(
                    "status", "DOOR_CLOSED",
                    "doorOpen", false,
                    "doorLockedAfterDelivery", isDeliveredBatch,
                    "message", isDeliveredBatch
                            ? "Đã đóng cửa thùng xe sau bàn giao! Cửa thùng xe đã khóa an toàn cho đến khi chọn lô tiếp theo."
                            : "Đã đóng khóa bảo mật cửa thùng xe lạnh.",
                    "batch", batch));
        }

        // BƯỚC 1 TRƯỚC KHI XUẤT BẾN: Mở cửa thùng xe tại kho để bốc hàng lên xe
        if ("OPEN_FOR_LOADING".equals(action)) {
            batch.getTransportJourney().put("door_open", true);
            batch.getTransportJourney().put("loading_confirmed", false);
            blockchainService.saveFoodBatch(batch);
            messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                    "batchCode", batchCode,
                    "status", batch.getStatus(),
                    "event", "DOOR_OPENED_FOR_LOADING",
                    "doorOpen", true,
                    "timestamp", Instant.now().toString()));
            return ResponseEntity.ok(Map.of(
                    "status", "DOOR_OPENED_FOR_LOADING",
                    "doorOpen", true,
                    "loadingConfirmed", false,
                    "message",
                    "Đã mở cửa thùng xe tại điểm tập kết! Vui lòng kiểm tra bốc hàng và bấm Xác nhận vận chuyển lô hàng & Đóng cửa thùng xe.",
                    "batch", batch));
        }

        // BƯỚC 2 TRƯỚC KHI XUẤT BẾN: Xác nhận đã bốc lô hàng lên xe & đóng kín cửa niêm
        // phong để mở khóa nút Bắt đầu chuyến xe
        if ("CONFIRM_LOADING_AND_CLOSE".equals(action)) {
            batch.getTransportJourney().put("door_open", false);
            batch.getTransportJourney().put("loading_confirmed", true);
            blockchainService.saveFoodBatch(batch);

            try {
                mqttService.syncDynamicProfileToEsp32(
                        batchCode,
                        batch.getCategory(),
                        vehiclePlate.isEmpty()
                                ? String.valueOf(
                                        batch.getTransportJourney().getOrDefault("vehicle_plate", "49C-567.89"))
                                : vehiclePlate,
                        "ESP32-MULTI-01",
                        batch.getProductName());
            } catch (Exception ignored) {
            }

            messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                    "batchCode", batchCode,
                    "status", batch.getStatus(),
                    "event", "LOADING_CONFIRMED_DOOR_CLOSED",
                    "doorOpen", false,
                    "loadingConfirmed", true,
                    "timestamp", Instant.now().toString()));
            return ResponseEntity.ok(Map.of(
                    "status", "LOADING_CONFIRMED",
                    "doorOpen", false,
                    "loadingConfirmed", true,
                    "message",
                    "Đã xác nhận bốc lô hàng " + batchCode
                            + " lên xe, đồng bộ cấu hình thiết bị IoT và đóng niêm phong cửa thùng xe! Bạn có thể bấm Bắt đầu chuyến xe.",
                    "batch", batch));
        }

        // Nếu lô hàng đã bàn giao và đã đóng cửa -> Khóa không cho mở lại nữa cho tới
        // khi chọn lô tiếp theo!
        if (isDeliveredBatch && (Boolean.TRUE.equals(batch.getTransportJourney().get("door_locked_after_delivery"))
                || !Boolean.TRUE.equals(batch.getTransportJourney().get("door_open")))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "DOOR_LOCKED_AFTER_DELIVERY",
                    "message",
                    "Lô hàng đã được bàn giao và đóng cửa thùng xe! Bạn không thể mở lại cửa thùng xe cho tới khi chọn lô hàng tiếp theo."));
        }

        String requestStatus = String.valueOf(batch.getTransportJourney().getOrDefault("door_request_status", "NONE"));
        boolean isApproved = "APPROVED".equalsIgnoreCase(requestStatus);

        batch.getTransportJourney().put("door_open", true);
        blockchainService.saveFoodBatch(batch);

        if (isAtDestination) {
            messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                    "batchCode", batchCode,
                    "status", batch.getStatus(),
                    "event", "DOOR_OPENED_AT_DESTINATION",
                    "doorOpen", true,
                    "driverName", driverName,
                    "vehiclePlate", vehiclePlate,
                    "timestamp", Instant.now().toString()));
            return ResponseEntity.ok(Map.of(
                    "status", "DOOR_OPENED_SAFE",
                    "doorOpen", true,
                    "unauthorized", false,
                    "message", "Đã mở cửa thùng xe tại điểm đích để bốc dỡ & bàn giao lô hàng!",
                    "batch", batch));
        }

        if (isApproved) {
            messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                    "batchCode", batchCode,
                    "status", batch.getStatus(),
                    "event", "DOOR_OPENED_APPROVED",
                    "doorOpen", true,
                    "driverName", driverName,
                    "vehiclePlate", vehiclePlate,
                    "timestamp", Instant.now().toString()));
            return ResponseEntity.ok(Map.of(
                    "status", "DOOR_OPENED_APPROVED",
                    "doorOpen", true,
                    "unauthorized", false,
                    "message", "Đã mở cửa thùng xe theo lệnh phê duyệt khẩn cấp của Quản trị viên.",
                    "batch", batch));
        }

        // TRƯỜNG HỢP MỞ CỬA KHI CHƯA ĐẾN NƠI VÀ CHƯA ĐƯỢC ADMIN PHÊ DUYỆT -> PHÁT CẢNH
        // BÁO ĐỎ KHẨN CẤP!
        if (forceOpen) {
            blockchainService.mintBlock(
                    batchCode,
                    "UNAUTHORIZED_DOOR_OPEN_BREACH",
                    driverName + " (" + vehiclePlate + ")",
                    "LOGISTICS_DRIVER",
                    Map.of(
                            "alert", "CẢNH BÁO MỞ CỬA THÙNG XE TRÁI PHÉP KHI CHƯA TỚI ĐÍCH",
                            "driverName", driverName,
                            "vehiclePlate", vehiclePlate,
                            "timestamp", Instant.now().toString()),
                    cassandraService.buildMerkleLeavesForBatch(batchCode));

            Map<String, Object> alertPayload = new LinkedHashMap<>();
            alertPayload.put("batchCode", batchCode);
            alertPayload.put("status", batch.getStatus());
            alertPayload.put("event", "UNAUTHORIZED_DOOR_OPEN");
            alertPayload.put("doorOpen", true);
            alertPayload.put("driverName", driverName);
            alertPayload.put("vehiclePlate", vehiclePlate);
            alertPayload.put("message",
                    "CẢNH BÁO KHẨN CẤP: Tài xế " + driverName + " (" + vehiclePlate + ") đã tự ý mở cửa thùng xe lô "
                            + batchCode + " khi chưa tới điểm đích và chưa có lệnh phê duyệt của Admin!");
            alertPayload.put("timestamp", Instant.now().toString());

            messagingTemplate.convertAndSend("/topic/batch-status", alertPayload);
            messagingTemplate.convertAndSend("/topic/alerts", alertPayload);

            return ResponseEntity.ok(Map.of(
                    "status", "UNAUTHORIZED_DOOR_OPEN",
                    "doorOpen", true,
                    "unauthorized", true,
                    "message",
                    "CẢNH BÁO VI PHẠM AN NINH CHUỖI LẠNH: Đã ghi nhận hành vi mở cửa thùng xe khi chưa được phép và gửi báo động khẩn cấp đến Admin!",
                    "batch", batch));
        }

        return ResponseEntity.badRequest().body(Map.of(
                "status", "CONFIRMATION_REQUIRED",
                "message", "Xe chưa đến điểm đích và chưa có lệnh phê duyệt của Admin!"));
    }

    @PostMapping("/iot/sync-profile")
    public ResponseEntity<?> syncProfileToTruckAndEsp32(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "LOT-VEG-2026-001");
        String deviceId = body.getOrDefault("deviceId", "ESP32-MULTI-01");

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        String categoryCode = batchOpt.map(FoodBatchDocument::getCategory)
                .orElse(body.getOrDefault("categoryCode", "VEG_FRUIT"));
        String vehiclePlate = batchOpt
                .map(b -> String.valueOf(b.getTransportJourney().getOrDefault("vehicle_plate", "")))
                .filter(v -> !v.isEmpty())
                .orElse(body.getOrDefault("vehiclePlate", "49C-567.89"));

        // Không tự động chuyển trạng thái lô hàng sang IN_TRANSIT hoặc ghi đè biển số
        // xe khi chỉ đồng bộ OTA!
        batchOpt.ifPresent(b -> {
            b.getTransportJourney().put("iot_device_id", deviceId);
            blockchainService.saveFoodBatch(b);
        });

        String productName = batchOpt.map(FoodBatchDocument::getProductName).orElse(null);
        Map<String, Object> otaCommand = mqttService.syncDynamicProfileToEsp32(batchCode, categoryCode, vehiclePlate,
                deviceId, productName);

        return ResponseEntity.ok(Map.of(
                "status", "OTA_SYNCED",
                "categoryCode", categoryCode,
                "mqttTopic", "smartchain/device/" + deviceId + "/cmd",
                "otaPayload", otaCommand));
    }

    @PostMapping("/iot/scenario/{scenarioMode}")
    public ResponseEntity<?> triggerWokwiDemoScenario(@PathVariable String scenarioMode) {
        SensorTelemetryDto telemetry = mqttService.triggerDemoScenarioNow(scenarioMode);
        return ResponseEntity.ok(Map.of(
                "status", "SCENARIO_ACTIVATED",
                "scenarioMode", scenarioMode.toUpperCase(),
                "telemetry", telemetry));
    }

    @PostMapping("/iot/command")
    public ResponseEntity<?> sendDownlinkRelayCommand(@RequestBody Map<String, String> payload) {
        String deviceId = payload.getOrDefault("deviceId", "ESP32-MULTI-01");
        String action = payload.getOrDefault("action", "RELAY_ON");
        String reason = payload.getOrDefault("reason", "Manual Remote Actuation from Dashboard");

        String cmdJson = String.format("{\"command\":\"%s\",\"action\":\"%s\",\"reason\":\"%s\",\"timestamp\":\"%s\"}",
                action, action, reason, Instant.now().toString());
        mqttService.sendDownlinkCommand(deviceId, cmdJson);

        return ResponseEntity.ok(Map.of(
                "status", "COMMAND_DISPATCHED",
                "deviceId", deviceId,
                "action", action,
                "mqttTopic", "smartchain/device/" + deviceId + "/cmd",
                "timestamp", Instant.now().toString()));
    }

    @GetMapping("/telemetry/{batchCode}")
    public ResponseEntity<List<SensorTelemetryDto>> getTelemetryByBatch(@PathVariable String batchCode) {
        return ResponseEntity.ok(cassandraService.getTelemetryByBatch(batchCode));
    }

    @GetMapping("/telemetry/latest/{batchCode}")
    public ResponseEntity<?> getLatestTelemetryByBatch(@PathVariable String batchCode) {
        List<SensorTelemetryDto> list = cassandraService.getTelemetryByBatch(batchCode);
        if (list.isEmpty()) {
            SensorTelemetryDto fallback = new SensorTelemetryDto();
            fallback.setBatchCode(batchCode);
            fallback.setDeviceId("ESP32-MULTI-01");
            fallback.setVehicleId("49C-567.89");
            fallback.setCategoryCode("VEG_FRUIT");
            fallback.setTemperature(9.5);
            fallback.setHumidity(90.0);
            fallback.setGasType("C2H4");
            fallback.setGasPpm(0.0);
            fallback.setWeightKg(0.0);
            fallback.setDoorOpen(false);
            fallback.setRelayCooling(false);
            fallback.setAlertTriggered("NORMAL");
            fallback.setTimestamp(Instant.now());
            return ResponseEntity.ok(fallback);
        }
        return ResponseEntity.ok(list.get(0));
    }

    @GetMapping("/blockchain/verify/{batchCode}")
    public ResponseEntity<?> verifyBlockchainIntegrity(@PathVariable String batchCode) {
        return ResponseEntity.ok(blockchainService.verifyChainIntegrity(batchCode));
    }

    // Phase 4: Inbound QC Audit & AI TTI Engine
    @GetMapping("/qc/audit/{batchCode}")
    public ResponseEntity<?> auditBatchAtInboundGate(@PathVariable String batchCode) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        StorageProfile profile = profileRepository.findById(batch.getCategory()).orElse(null);
        List<SensorTelemetryDto> history = cassandraService.getTelemetryByBatch(batchCode);
        List<String> merkleLeaves = cassandraService.buildMerkleLeavesForBatch(batchCode);
        String merkleRoot = blockchainService.computeMerkleRoot(merkleLeaves);

        Map<String, Object> aiEvaluation = aiService.evaluateBatchFreshnessAndTti(batchCode, profile, history);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("batch", batch);
        res.put("storageProfile", profile);
        res.put("telemetryCount", history.size());
        res.put("merkleRoot", merkleRoot);
        res.put("merkle_valid", true);
        res.put("ttiScore", aiEvaluation.get("ttiFreshnessScore"));
        res.put("freshness_score", aiEvaluation.get("ttiFreshnessScore"));
        res.put("breachCount", aiEvaluation.get("breachSamplesCount"));
        res.put("history", history.stream().limit(25).collect(Collectors.toList()));
        res.put("aiTtiEvaluation", aiEvaluation);
        res.put("recentTelemetry", history.stream().limit(25).collect(Collectors.toList()));
        res.put("blockchainVerification", blockchainService.verifyChainIntegrity(batchCode));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/qc/approve/{batchCode}")
    public ResponseEntity<?> approveOrRejectBatchSmartContract(@PathVariable String batchCode,
            @RequestBody Map<String, Object> qcPayload) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        String inspector = String.valueOf(qcPayload.getOrDefault("inspector", "Trần Minh Khoa (QA/QC)"));
        String decision = String.valueOf(qcPayload.getOrDefault("decision", "ACCEPTED")).toUpperCase();
        String supermarketName = String.valueOf(qcPayload.getOrDefault("supermarketName", "Siêu Thị Co.opmart Quận 7"));
        double nitrateTestPpm = ((Number) qcPayload.getOrDefault("nitratePpm", 15.0)).doubleValue();
        String microbioResult = String.valueOf(qcPayload.getOrDefault("microbiologicalTest", "Âm tính (Đạt QCVN)"));

        StorageProfile profile = profileRepository.findById(batch.getCategory()).orElse(null);
        List<SensorTelemetryDto> history = cassandraService.getTelemetryByBatch(batchCode);
        Map<String, Object> aiEval = aiService.evaluateBatchFreshnessAndTti(batchCode, profile, history);

        boolean accepted = "ACCEPTED".equalsIgnoreCase(decision) || "ACCEPT".equalsIgnoreCase(decision)
                || "APPROVE".equalsIgnoreCase(decision) || "APPROVED".equalsIgnoreCase(decision);
        batch.setStatus(accepted ? "QC_ACCEPTED" : "RECALL_PENDING_PRODUCER");

        Map<String, Object> qcRecord = new LinkedHashMap<>();
        qcRecord.put("inspector", inspector);
        qcRecord.put("decision", accepted ? "ACCEPTED" : "REJECTED");
        qcRecord.put("supermarketName", supermarketName);
        qcRecord.put("nitrateTestPpm", nitrateTestPpm);
        qcRecord.put("microbiologicalTest", microbioResult);
        qcRecord.put("ttiFreshnessScore", aiEval.get("ttiFreshnessScore"));
        qcRecord.put("remainingShelfLifeHours", aiEval.get("remainingShelfLifeHours"));
        String reason = String.valueOf(qcPayload.getOrDefault("reason", qcPayload.getOrDefault("inspectorNotes", "Kiểm định không đạt chuẩn chất lượng / vi phạm an toàn chuỗi lạnh")));
        qcRecord.put("reason", reason);
        qcRecord.put("signedAt", Instant.now().toString());
        batch.setQcInspection(qcRecord);
        if (!accepted) {
            if (batch.getDynamicAttributes() == null) {
                batch.setDynamicAttributes(new LinkedHashMap<>());
            }
            batch.getDynamicAttributes().put("recall_reason", reason);
        }
        blockchainService.saveFoodBatch(batch);

        List<String> merkleLeaves = cassandraService.buildMerkleLeavesForBatch(batchCode);
        BlockchainBlock qcBlock = blockchainService.mintBlock(
                batchCode,
                accepted ? "INBOUND_QC_SMART_CONTRACT_APPROVED" : "INBOUND_QC_SMART_CONTRACT_REJECTED",
                inspector,
                "QC_INSPECTOR",
                qcRecord,
                merkleLeaves);

        String vehiclePlate = String.valueOf(batch.getTransportJourney().getOrDefault("vehicle_plate", "49C-567.89"));
        if (accepted) {
            neo4jService.recordTruckDeliveryToStore(batchCode, vehiclePlate, supermarketName);
        }

        // Phát sự kiện đồng bộ toàn hệ thống qua WebSocket để Quản lý Kệ và Nông trại tự động cập nhật ngay
        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", batch.getStatus());
        wsPayload.put("event", accepted ? "QC_APPROVED" : "QC_REJECTED_RECALL_SENT");
        wsPayload.put("decision", accepted ? "ACCEPTED" : "REJECTED");
        wsPayload.put("inspector", inspector);
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "batchCode", batchCode,
                "status", batch.getStatus(),
                "accepted", accepted,
                "qcInspection", qcRecord,
                "block", qcBlock));
    }

    @PostMapping("/batches/{batchCode}/confirm-recall")
    public ResponseEntity<?> confirmRecallByProducer(@PathVariable String batchCode,
                                                     @RequestBody(required = false) Map<String, String> body) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        String producerName = body != null && body.containsKey("producerName") ? body.get("producerName") : batch.getFarmName();
        String farmNote = body != null && body.containsKey("note") ? body.get("note") : "Nông trại đã xác nhận lệnh thu hồi và tiếp nhận xử lý lô hàng tại gốc.";

        batch.setStatus("RECALLED");
        batch.getDynamicAttributes().put("recall_confirmed_by_farm", true);
        batch.getDynamicAttributes().put("recall_confirmed_at", Instant.now().toString());
        batch.getDynamicAttributes().put("farm_recall_note", farmNote);

        for (FoodBatchDocument.ItemQrSerial item : batch.getItemQrSerials()) {
            item.setStatus("RECALLED_BLACKLISTED");
        }
        blockchainService.saveFoodBatch(batch);

        BlockchainBlock block = blockchainService.mintBlock(
                batchCode,
                "CONFIRM_RECALL_ACCEPTED",
                producerName,
                "PRODUCER",
                Map.of(
                        "action", "RECALL_CONFIRMED_BY_FARM",
                        "batchCode", batchCode,
                        "farmName", batch.getFarmName(),
                        "note", farmNote,
                        "confirmedAt", Instant.now().toString()
                ),
                cassandraService.buildMerkleLeavesForBatch(batchCode)
        );

        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", "RECALLED");
        wsPayload.put("event", "RECALL_CONFIRMED_BY_FARM");
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "status", "RECALLED",
                "batchCode", batchCode,
                "message", "Nông trại đã xác nhận lệnh thu hồi lô hàng " + batchCode + " thành công!",
                "block", block
        ));
    }

    // Phase 5: Smart Shelf Allocation (Redis ZSET) & POS Checkout (Redlock)
    @PostMapping("/shelf/stock/{batchCode}")
    public ResponseEntity<?> stockBatchOnSmartShelfFefo(@PathVariable String batchCode,
            @RequestBody Map<String, Object> body) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FoodBatchDocument batch = batchOpt.get();
        String shelfName = String
                .valueOf(body.getOrDefault("shelfName", "Kệ Lạnh Thông Minh FEFO #" + batch.getCategory()));

        StorageProfile profile = profileRepository.findById(batch.getCategory()).orElse(null);
        List<SensorTelemetryDto> history = cassandraService.getTelemetryByBatch(batchCode);
        Map<String, Object> aiEval = aiService.evaluateBatchFreshnessAndTti(batchCode, profile, history);
        double remHours = ((Number) aiEval.get("remainingShelfLifeHours")).doubleValue();

        batch.setStatus("ON_SHELF");
        List<String> serials = new ArrayList<>();
        for (FoodBatchDocument.ItemQrSerial item : batch.getItemQrSerials()) {
            if ("GENERATED".equals(item.getStatus())) {
                item.setStatus("ON_SHELF");
            }
            serials.add(item.getSerialCode());
        }
        blockchainService.saveFoodBatch(batch);

        // Cập nhật Redis Sorted Set `fefo:shelf:{category}`
        redisService.updateFefoPriorityQueue(batch.getCategory(), batchCode, remHours);

        // Cập nhật Neo4j `(Batch)-[:STOCKED_AT]->(Shelf)`
        neo4jService.recordBatchStockedOnShelf(batchCode, shelfName, serials);

        // Đúc Block #3 trên Sổ cái Blockchain
        BlockchainBlock shelfBlock = blockchainService.mintBlock(
                batchCode,
                "SHELF_STOCKED_FEFO_ACTIVE",
                "Nhân viên Kệ hàng (" + shelfName + ")",
                "SHELF_OPERATOR",
                Map.of("shelfName", shelfName, "remainingShelfLifeHours", remHours, "stockedItemCount", serials.size()),
                cassandraService.buildMerkleLeavesForBatch(batchCode));

        // Phát sự kiện đồng bộ toàn hệ thống qua WebSocket để Quản lý Kệ, POS, Admin tự
        // động cập nhật
        Map<String, Object> wsPayload = new LinkedHashMap<>();
        wsPayload.put("batchCode", batchCode);
        wsPayload.put("status", "ON_SHELF");
        wsPayload.put("shelfName", shelfName);
        wsPayload.put("event", "SHELF_STOCKED");
        wsPayload.put("timestamp", Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);

        return ResponseEntity.ok(Map.of(
                "batchCode", batchCode,
                "shelfName", shelfName,
                "remainingShelfLifeHours", remHours,
                "fefoQueueForCategory", redisService.getFefoSortedBatches(batch.getCategory()),
                "stockedSerials", serials,
                "block", shelfBlock));
    }

    @GetMapping("/shelf/fefo")
    public ResponseEntity<Map<String, List<Map<String, Object>>>> getAllFefoShelfQueues() {
        return ResponseEntity.ok(redisService.getAllFefoQueues());
    }

    @PostMapping("/pos/checkout")
    public ResponseEntity<?> posCheckoutItemWithRedlock(@RequestBody Map<String, String> body) {
        String serialCode = body.getOrDefault("serialCode", "").trim();
        String cashierId = body.getOrDefault("cashierId", "CASHIER-POS-01");

        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByQrOrSerial(serialCode);
        String batchCode = batchOpt.map(FoodBatchDocument::getBatchCode).orElse("LOT-VEG-2026-001");
        String productName = batchOpt.map(FoodBatchDocument::getProductName).orElse("Sản phẩm Siêu thị");
        double price = batchOpt.map(b -> b.getUnitPrice() != null ? b.getUnitPrice() : 45000.0).orElse(45000.0);

        Map<String, Object> posResult = redisService.processPosCheckoutWithRedlock(
                serialCode, batchCode, productName, price, cashierId);

        int httpStatus = (int) posResult.getOrDefault("httpStatus", 200);
        boolean success = Boolean.TRUE.equals(posResult.get("success"));

        if (success) {
            blockchainService.findItemSerial(serialCode).ifPresent(item -> {
                item.setStatus("SOLD_SEAL_VOID");
                item.setSoldAt(Instant.now());
                posResult.put("item", item);
            });

            // Kiểm tra số lượng tem chưa bán còn lại trong lô hàng
            boolean[] allSoldHolder = new boolean[] { false };
            batchOpt.ifPresent(b -> {
                long unsold = b.getItemQrSerials().stream()
                        .filter(it -> !"SOLD_SEAL_VOID".equalsIgnoreCase(it.getStatus()) && !"VOID".equalsIgnoreCase(it.getStatus()) && !"RECALLED_BLACKLISTED".equalsIgnoreCase(it.getStatus()))
                        .count();
                if (unsold == 0 && !b.getItemQrSerials().isEmpty()) {
                    b.setStatus("SOLD");
                    allSoldHolder[0] = true;
                }
                blockchainService.saveFoodBatch(b);
            });

            @SuppressWarnings("unchecked")
            Map<String, Object> receipt = (Map<String, Object>) posResult.get("receipt");
            String receiptId = String.valueOf(receipt.get("receiptId"));

            neo4jService.recordPosCheckoutItem(batchCode, serialCode, receiptId);

            BlockchainBlock posBlock = blockchainService.mintBlock(
                    batchCode,
                    "POS_ITEM_SOLD_SEAL_VOID",
                    "Quầy Thu Ngân " + cashierId,
                    "CASHIER",
                    Map.of("serialCode", serialCode, "receiptId", receiptId, "priceVnd", price, "sealStatus", "VOID"),
                    List.of("POS_SOLD|" + serialCode + "|" + receiptId));
            posResult.put("block", posBlock);
            posResult.put("isBatchSoldOut", allSoldHolder[0]);

            // Phát sự kiện đồng bộ toàn hệ thống qua WebSocket để quầy POS, Admin, Quản lý kệ và Nông trại nhận ngay
            Map<String, Object> wsPayload = new LinkedHashMap<>();
            wsPayload.put("batchCode", batchCode);
            wsPayload.put("serialCode", serialCode);
            wsPayload.put("status", allSoldHolder[0] ? "SOLD" : "ON_SHELF");
            wsPayload.put("event", allSoldHolder[0] ? "BATCH_SOLD_OUT" : "POS_ITEM_SOLD");
            wsPayload.put("isSoldOut", allSoldHolder[0]);
            wsPayload.put("timestamp", Instant.now().toString());
            messagingTemplate.convertAndSend("/topic/batch-status", wsPayload);
        } else {
            // Đẩy cảnh báo gian lận QR / hàng thu hồi lên WebSocket
            messagingTemplate.convertAndSend("/topic/pos-alerts", posResult);
        }

        return ResponseEntity.status(httpStatus).body(posResult);
    }

    // Phase 6: Consumer Traceability & Neo4j Emergency Recall
    @GetMapping("/trace/{code}")
    public ResponseEntity<?> traceProductByQrOrSerial(@PathVariable String code, HttpServletRequest request) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByQrOrSerial(code);
        if (batchOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "found", false,
                    "code", code,
                    "message", "Không tìm thấy Lô hàng hoặc Mã QR sản phẩm trong hệ thống!"));
        }

        FoodBatchDocument batch = batchOpt.get();
        String batchCode = batch.getBatchCode();
        StorageProfile profile = profileRepository.findById(batch.getCategory()).orElse(null);
        List<SensorTelemetryDto> telemetry = cassandraService.getTelemetryByBatch(batchCode);
        Map<String, Object> aiEval = aiService.evaluateBatchFreshnessAndTti(batchCode, profile, telemetry);
        List<BlockchainBlock> chain = blockchainService.getChainByBatch(batchCode);
        Map<String, Object> chainVerify = blockchainService.verifyChainIntegrity(batchCode);

        Optional<FoodBatchDocument.ItemQrSerial> itemOpt = blockchainService.findItemSerial(code);
        boolean isSold = redisService.isSerialSold(code);
        boolean isRecalled = redisService.isSerialRecalled(code) || "RECALLED".equalsIgnoreCase(batch.getStatus());

        // Ghi nhận nhật ký quét mã QR (Scan Audit Log) từ Smartphone hoặc Web
        String ua = request != null ? request.getHeader("User-Agent") : "";
        String device = "Trình duyệt Máy tính";
        if (ua != null) {
            if (ua.contains("iPhone"))
                device = "Apple iPhone (iOS Safari)";
            else if (ua.contains("iPad"))
                device = "Apple iPad (iPadOS)";
            else if (ua.contains("Android"))
                device = "Smartphone Android (Mobile)";
            else if (ua.contains("Mobile"))
                device = "Thiết bị Di động";
            else if (ua.contains("Macintosh"))
                device = "Apple Mac (macOS)";
            else if (ua.contains("Windows"))
                device = "Máy tính Windows";
        }
        String clientIp = request != null ? request.getRemoteAddr() : "127.0.0.1";
        if (request != null && request.getHeader("X-Forwarded-For") != null) {
            clientIp = request.getHeader("X-Forwarded-For").split(",")[0].trim();
        }

        int scanCount = 1;
        if (itemOpt.isPresent()) {
            FoodBatchDocument.ItemQrSerial itm = itemOpt.get();
            itm.setScanCount(itm.getScanCount() + 1);
            itm.setLastScannedAt(Instant.now());
            scanCount = itm.getScanCount();
        } else {
            Object currentBCount = batch.getDynamicAttributes().get("batchScanCount");
            int bCount = (currentBCount instanceof Number n ? n.intValue() : 0) + 1;
            batch.getDynamicAttributes().put("batchScanCount", bCount);
            scanCount = bCount;
        }

        Map<String, Object> scanRecord = new LinkedHashMap<>();
        scanRecord.put("scannedCode", code);
        scanRecord.put("batchCode", batchCode);
        scanRecord.put("timestamp", Instant.now().toString());
        scanRecord.put("clientIp", clientIp);
        scanRecord.put("device", device);
        scanRecord.put("scanCount", scanCount);
        scanRecord.put("statusAtScan",
                isSold ? "SEAL_VOID" : (itemOpt.isPresent() ? itemOpt.get().getStatus() : "ACTIVE"));
        scanRecord.put("isWarning", isSold);
        batch.getScanHistory().add(0, scanRecord);
        blockchainService.saveFoodBatch(batch);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("found", true);
        res.put("scannedCode", code);
        res.put("scanType", itemOpt.isPresent() ? "ITEM_UNIT_QR" : "MASTER_BATCH_QR");
        res.put("itemUnit", itemOpt.orElse(null));
        res.put("sealVoidAlreadySold", isSold);
        res.put("emergencyRecalled", isRecalled);
        res.put("scanCount", scanCount);
        res.put("scanHistory", batch.getScanHistory());
        res.put("batch", batch);
        res.put("storageProfile", profile);
        res.put("aiFreshnessEvaluation", aiEval);
        res.put("coldChainTelemetry", telemetry.stream().limit(30).collect(Collectors.toList()));
        res.put("blockchainLedger", chain);
        res.put("blockchainVerification", chainVerify);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/batches/{batchCode}/scan-history")
    public ResponseEntity<?> getBatchScanHistory(@PathVariable String batchCode) {
        Optional<FoodBatchDocument> batchOpt = blockchainService.findBatchByCode(batchCode);
        return batchOpt
                .map(b -> ResponseEntity.ok(b.getScanHistory()))
                .orElse(ResponseEntity.ok(Collections.emptyList()));
    }

    @PostMapping({ "/recall", "/admin/recall" })
    public ResponseEntity<?> triggerEmergencyRecallNeo4j(@RequestBody Map<String, String> body) {
        String batchCode = body.getOrDefault("batchCode", "LOT-FISH-2026-001");
        String reason = body.getOrDefault("reason",
                "Phát hiện vi phạm chuỗi lạnh / Cảnh báo An toàn Thực phẩm khẩn cấp");

        Map<String, Object> neo4jRecallReport = neo4jService.executeEmergencyRecall(batchCode, reason);

        @SuppressWarnings("unchecked")
        List<String> serials = (List<String>) neo4jRecallReport.getOrDefault("affectedItemSerials",
                Collections.emptyList());

        blockchainService.findBatchByCode(batchCode).ifPresent(b -> {
            b.setStatus("RECALLED");
            if (b.getDynamicAttributes() == null) {
                b.setDynamicAttributes(new LinkedHashMap<>());
            }
            b.getDynamicAttributes().put("recall_reason", reason);
            for (FoodBatchDocument.ItemQrSerial item : b.getItemQrSerials()) {
                item.setStatus("RECALLED_BLACKLISTED");
                if (!serials.contains(item.getSerialCode())) {
                    serials.add(item.getSerialCode());
                }
            }
            blockchainService.saveFoodBatch(b);
        });

        // Đưa toàn bộ mã QR của lô hàng vào Redis Blacklist Set
        // `recall:blacklisted_qrs`
        redisService.blacklistRecalledSerials(batchCode, serials);

        BlockchainBlock recallBlock = blockchainService.mintBlock(
                batchCode,
                "EMERGENCY_RECALL_ISSUED",
                "Trung Tâm Kiểm Soát An Toàn Thực Phẩm (Admin/QC)",
                "ADMIN",
                Map.of("reason", reason, "blacklistedItemCount", serials.size(), "neo4jExecTimeSec",
                        neo4jRecallReport.get("executionTimeSeconds")),
                List.of("RECALL|" + batchCode + "|" + reason));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "EMERGENCY_RECALL_COMPLETED");
        response.put("neo4jRecallReport", neo4jRecallReport);
        response.put("redisBlacklistedSerials", serials);
        response.put("block", recallBlock);

        messagingTemplate.convertAndSend("/topic/alerts", Map.of(
                "batchCode", batchCode,
                "breachType", "EMERGENCY_RECALL (" + reason + ")",
                "timestamp", Instant.now().toString()));

        // Phát sự kiện đồng bộ toàn hệ thống qua WebSocket để mọi trang (Admin, Shelf,
        // POS, Consumer) lập tức khóa hàng thu hồi
        messagingTemplate.convertAndSend("/topic/batch-status", Map.of(
                "batchCode", batchCode,
                "status", "RECALLED",
                "event", "EMERGENCY_RECALL",
                "reason", reason,
                "timestamp", Instant.now().toString()));

        return ResponseEntity.ok(response);
    }

    // Polyglot Overview & Metric APIs
    @GetMapping("/nosql/overview")
    public ResponseEntity<Map<String, Object>> getPolyglotNoSqlOverview() {
        Map<String, Object> res = new LinkedHashMap<>();

        // 1. MySQL Relational (Config & RBAC)
        res.put("mysql", Map.of(
                "engine", "MySQL 8.0 Relational DB (ACID)",
                "host", "jdbc:mysql://" + mysqlHost + ":3306/supermarket_db",
                "tables", List.of("roles", "users", "storage_profiles", "order_items"),
                "rolesCount", roleRepository.count(),
                "usersCount", userRepository.count(),
                "storageProfilesCount", profileRepository.count(),
                "profiles", profileRepository.findAll()));

        // 2. MongoDB Document Store (Polymorphic Batches & Blockchain Ledger)
        res.put("mongodb", Map.of(
                "engine", "MongoDB 6.0 Document Store (BSON Schema-less)",
                "uri", "mongodb://" + mongoHost + ":27017/supermarket_mongo",
                "collections", List.of("food_batches", "blockchain_ledger"),
                "foodBatchesCount", blockchainService.findAllBatches().size(),
                "blockchainBlocksCount", blockchainService.getAllBlocks().size(),
                "recentBlocks", blockchainService.getAllBlocks().stream()
                        .sorted(Comparator.comparing(BlockchainBlock::getTimestamp).reversed())
                        .limit(8)
                        .collect(Collectors.toList())));

        // 3. Redis In-Memory Data Structure Store (Hash, Sorted Set, Set, Redlock)
        res.put("redis", Map.of(
                "engine", "Redis 7.2 In-Memory (Hash + ZSET FEFO + Set + Redlock NX EX)",
                "endpoint", redisHost + ":6379",
                "profileHashesCount", redisService.getAllProfileHashes().size(),
                "fefoQueues", redisService.getAllFefoQueues(),
                "posSoldQrCount", redisService.getPosSoldQrSet().size(),
                "posSoldQrs", redisService.getPosSoldQrSet(),
                "recalledBlacklistCount", redisService.getRecalledBlacklistQrSet().size(),
                "recalledBlacklistedQrs", redisService.getRecalledBlacklistQrSet(),
                "recentCommands", redisService.getRecentRedisCommands()));

        // 4. Apache Cassandra Wide-Column Time-Series Store
        Map<String, Object> cassandraOverview = new LinkedHashMap<>(cassandraService.getCassandraClusterOverview());
        cassandraOverview.put("contactPoint", cassandraHost + ":9042");
        res.put("cassandra", cassandraOverview);

        // 5. Neo4j Graph Database
        Map<String, Object> neo4jOverview = new LinkedHashMap<>(neo4jService.getGraphOverview());
        neo4jOverview.put("boltUri", "bolt://" + neo4jHost + ":7687");
        res.put("neo4j", neo4jOverview);

        return ResponseEntity.ok(res);
    }

    @GetMapping("/nosql/export/cassandra")
    public ResponseEntity<byte[]> exportCassandraTelemetryCsv() {
        List<SensorTelemetryDto> allRows = cassandraService.getAllRecentTelemetry(500);
        StringBuilder csv = new StringBuilder();
        csv.append(
                "batch_code,year_month,recorded_at,device_id,vehicle_id,category_code,temperature_c,humidity_pct,gas_type,gas_ppm,door_open,relay_cooling,alert_triggered,latitude,longitude\n");
        for (SensorTelemetryDto r : allRows) {
            String ym = YearMonth.from(r.getTimestamp().atZone(ZoneOffset.UTC)).toString();
            csv.append(String.format(Locale.US, "%s,%s,%s,%s,%s,%s,%.2f,%.2f,%s,%.2f,%s,%s,\"%s\",%.5f,%.5f\n",
                    r.getBatchCode(), ym, r.getTimestamp(), r.getDeviceId(), r.getVehicleId(),
                    r.getCategoryCode(),
                    r.getTemperature() != null ? r.getTemperature() : 0.0,
                    r.getHumidity() != null ? r.getHumidity() : 0.0,
                    r.getGasType(),
                    r.getGasPpm() != null ? r.getGasPpm() : 0.0,
                    r.getDoorOpen(), r.getRelayCooling(),
                    r.getAlertTriggered() != null ? r.getAlertTriggered() : "NORMAL",
                    r.getLatitude(), r.getLongitude()));
        }
        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cassandra_sensor_telemetry.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    @GetMapping("/nosql/export/mongodb")
    public ResponseEntity<Map<String, Object>> exportMongoDbCollectionsJson() {
        Map<String, Object> dump = new LinkedHashMap<>();
        dump.put("exportedAt", Instant.now().toString());
        dump.put("database", "supermarket_mongo");
        dump.put("food_batches", blockchainService.findAllBatches());
        dump.put("blockchain_ledger", blockchainService.getAllBlocks());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mongodb_supermarket_mongo.json\"")
                .body(dump);
    }
}
