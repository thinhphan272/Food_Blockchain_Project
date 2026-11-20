package com.smartchain.service;

import com.smartchain.dto.SensorTelemetryDto;
import com.smartchain.entity.Role;
import com.smartchain.entity.StorageProfile;
import com.smartchain.entity.User;
import com.smartchain.model.BlockchainBlock;
import com.smartchain.model.FoodBatchDocument;
import com.smartchain.repository.mysql.RoleRepository;
import com.smartchain.repository.mysql.StorageProfileRepository;
import com.smartchain.repository.mysql.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Khởi tạo dữ liệu mẫu chuẩn chỉnh cho toàn bộ 5 Cơ sở dữ liệu Polyglot:
 * 1. MySQL: 8 Vai trò RBAC + 8 Tài khoản Demo + 6 Cấu hình Ngưỡng Bảo quản Động
 * 2. Redis: Cache Hash 6 Profile + Hàng đợi FEFO Sorted Set
 * 3. MongoDB: 6 Lô hàng Đa hình (Polymorphic) + Chuỗi khối Blockchain SHA-256 + ECDSA
 * 4. Cassandra: Lịch sử Telemetry 72h cho các lô hàng
 * 5. Neo4j: Đồ thị liên kết Nông trại -> Lô hàng -> Xe lạnh -> Siêu thị -> Kệ hàng -> Sản phẩm QR
 */
@Service
public class DataInitializerService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializerService.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final StorageProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisPolyglotService redisPolyglotService;
    private final BlockchainLedgerService blockchainLedgerService;
    private final CassandraTelemetryService cassandraTelemetryService;
    private final Neo4jSupplyChainService neo4jSupplyChainService;
    private final AiShelfLifePredictionService aiShelfLifePredictionService;

    public DataInitializerService(RoleRepository roleRepository,
                                  UserRepository userRepository,
                                  StorageProfileRepository profileRepository,
                                  PasswordEncoder passwordEncoder,
                                  RedisPolyglotService redisPolyglotService,
                                  BlockchainLedgerService blockchainLedgerService,
                                  CassandraTelemetryService cassandraTelemetryService,
                                  Neo4jSupplyChainService neo4jSupplyChainService,
                                  AiShelfLifePredictionService aiShelfLifePredictionService) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.redisPolyglotService = redisPolyglotService;
        this.blockchainLedgerService = blockchainLedgerService;
        this.cassandraTelemetryService = cassandraTelemetryService;
        this.neo4jSupplyChainService = neo4jSupplyChainService;
        this.aiShelfLifePredictionService = aiShelfLifePredictionService;
    }

    @Override
    public void run(String... args) {
        initMySqlRolesAndUsers();
        initMySqlAndRedisStorageProfiles();
        blockchainLedgerService.loadExistingFromMongo();
        cassandraTelemetryService.loadExistingFromMongo();
        initPolyglotBatchesBlockchainCassandraAndNeo4j();
        log.info("================================================================================");
        log.info("  SMARTCHAIN POLYGLOT 5-DB ENGINE READY ON PORT 8080 (ONLINE / HYBRID MODE)");
        log.info("  Demo Accounts (Password: '123'): admin, farm_dalat, qc_gate, driver_01,");
        log.info("                                   inbound_01, shelf_staff, pos_01, customer");
        log.info("================================================================================");
    }

    private void initMySqlRolesAndUsers() {
        Map<String, String> roleDefs = new LinkedHashMap<>();
        roleDefs.put("ADMIN", "Quản trị viên Hệ thống & Thiết lập Ngưỡng Bảo quản Động");
        roleDefs.put("PRODUCER", "Nông trại / Nhà máy Chế biến & Đóng gói Gốc");
        roleDefs.put("QC_INSPECTOR", "Kiểm định viên Chất lượng An toàn Thực phẩm (QA/QC)");
        roleDefs.put("LOGISTICS_DRIVER", "Tài xế Xe tải Lạnh Đa Vùng Nhiệt (IoT Cold-Chain)");
        roleDefs.put("INBOUND_GATE", "Nhân viên Cổng Nhập Kho Siêu thị (Smart Contract Gate)");
        roleDefs.put("SHELF_OPERATOR", "Nhân viên Quản lý Kệ hàng & Tối ưu hạn dùng FEFO");
        roleDefs.put("CASHIER", "Thu ngân Quầy POS (Kiểm khóa phân tán Redlock & Hủy tem QR)");
        roleDefs.put("CONSUMER", "Khách hàng Tiêu dùng Quét mã QR Truy xuất Nguồn gốc");

        Map<String, Role> savedRoles = new HashMap<>();
        for (Map.Entry<String, String> entry : roleDefs.entrySet()) {
            Role role = roleRepository.findByRoleName(entry.getKey())
                    .orElseGet(() -> roleRepository.save(new Role(entry.getKey(), entry.getValue())));
            savedRoles.put(entry.getKey(), role);
        }

        // Xóa các tài khoản alias trùng lặp tên/đơn vị từ các bản thử nghiệm cũ
        List<String> duplicateAliases = List.of(
                "producer", "qc_inspector", "qc", "driver", "inbound", "shelf", "cashier_01", "cashier", "consumer"
        );
        for (String alias : duplicateAliases) {
            userRepository.findByUsername(alias).ifPresent(userRepository::delete);
        }

        // Khởi tạo 16 tài khoản nhân sự độc lập, thực tế (Đầy đủ các vai trò & hỗ trợ phân trang 12 tài khoản/trang)
        createOrUpdateDemoUser("admin", "123", "Nguyễn Quản Trị", "IT & Security", savedRoles.get("ADMIN"), "0909-001-001", "079090001111", "Trung Tâm Điều Hành Chuỗi Lạnh");
        createOrUpdateDemoUser("farm_dalat", "123", "Vũ Đình Trọng", "Farm & Processing", savedRoles.get("PRODUCER"), "0912-345-678", "068090002222", "Nông Trại Công Nghệ Cao LangBiang");
        createOrUpdateDemoUser("farm_mekong", "123", "Lý Hoàng Khang", "Farm & Processing", savedRoles.get("PRODUCER"), "0913-456-789", "092091003333", "HTX Nông Sản Hữu Cơ Tiền Giang");
        createOrUpdateDemoUser("farm_seafood", "123", "Bùi Thanh Hải", "Seafood Processing", savedRoles.get("PRODUCER"), "0914-567-890", "056092004444", "Nhà Máy Thủy Sản Biển Đông Cát Lái");

        // Đội ngũ 6 Tài xế xe lạnh độc lập với biển số xe riêng biệt
        createOrUpdateDemoUser("driver_01", "123", "Lê Hoàng Nam", "Cold-Chain Logistics", savedRoles.get("LOGISTICS_DRIVER"), "0918-234-567", "049092001234", "49C-567.89");
        createOrUpdateDemoUser("driver_02", "123", "Phạm Tài Xế", "Cold-Chain Logistics", savedRoles.get("LOGISTICS_DRIVER"), "0908-111-222", "079092008888", "51D-998.12");
        createOrUpdateDemoUser("driver_03", "123", "Trần Văn Lái", "Cold-Chain Logistics", savedRoles.get("LOGISTICS_DRIVER"), "0907-333-444", "062091005566", "62C-334.55");
        createOrUpdateDemoUser("driver_04", "123", "Võ Thành Đạt", "Cold-Chain Logistics", savedRoles.get("LOGISTICS_DRIVER"), "0906-555-666", "079093007788", "51C-777.99");
        createOrUpdateDemoUser("driver_05", "123", "Đặng Quốc Huy", "Cold-Chain Logistics", savedRoles.get("LOGISTICS_DRIVER"), "0905-777-888", "049094009900", "49C-112.33");
        createOrUpdateDemoUser("driver_06", "123", "Hoàng Gia Bảo", "Cold-Chain Logistics", savedRoles.get("LOGISTICS_DRIVER"), "0904-999-000", "074095001122", "61C-889.01");

        // Kiểm định KCS, Thủ kho, Quản lý kệ, Thu ngân, Khách hàng
        createOrUpdateDemoUser("qc_gate", "123", "Trần Minh Khoa", "Quality Assurance", savedRoles.get("QC_INSPECTOR"), "0903-888-999", "079091005678", "Trạm Kiểm Định KCS Co.opmart Quận 7");
        createOrUpdateDemoUser("qc_tuduc", "123", "Phan Thanh Thảo", "Quality Assurance", savedRoles.get("QC_INSPECTOR"), "0902-666-777", "079096002233", "Trạm Kiểm Định KCS Co.opmart Thủ Đức");
        createOrUpdateDemoUser("inbound_01", "123", "Phạm Thu Hà", "Warehouse Inbound", savedRoles.get("INBOUND_GATE"), "0938-112-233", "079093003344", "Cổng Tiếp Nhận Kho Trung Tâm Quận 7");
        createOrUpdateDemoUser("shelf_staff", "123", "Đỗ Quốc Bảo", "Store Operations", savedRoles.get("SHELF_OPERATOR"), "0945-667-788", "079094004455", "Quầy Kệ Mát FEFO A1 & B2 Quận 7");
        createOrUpdateDemoUser("pos_01", "123", "Nguyễn Mai Anh", "POS Checkout", savedRoles.get("CASHIER"), "0934-567-890", "079095009876", "Quầy Thu Ngân POS-01 Quận 7");
        createOrUpdateDemoUser("customer", "123", "Lê Minh Tuấn", "Public Consumer", savedRoles.get("CONSUMER"), "0988-123-456", "079098007788", "Khách Hàng Thành Viên Bạch Kim");

        // Tự động rà soát và chuẩn hóa mọi bản ghi bị lỗi font chữ (mojibake) hoặc role cũ từ cơ sở dữ liệu
        for (User u : userRepository.findAll()) {
            boolean modified = false;
            String name = u.getFullName();
            if (name != null && (name.contains("Ã") || name.contains("á»") || name.contains("Ä") || name.contains("º") || name.contains("»") || name.contains("§"))) {
                if (name.contains("Thá»") || "admin".equalsIgnoreCase(u.getUsername())) {
                    u.setFullName("Nguyễn Quản Trị (System Admin)");
                } else if (name.contains("Há»") || "farm_dalat".equalsIgnoreCase(u.getUsername())) {
                    u.setFullName("Hợp Tác Xã Rau Đà Lạt");
                } else if (name.contains("Thu NgÃ") || "cashier_01".equalsIgnoreCase(u.getUsername())) {
                    u.setFullName("Thu Ngân Quầy 1 Tân Phú");
                }
                modified = true;
            }
            if (u.getRole() != null) {
                String rName = u.getRole().getRoleName();
                if ("ROLE_ADMIN".equals(rName) && savedRoles.containsKey("ADMIN")) {
                    u.setRole(savedRoles.get("ADMIN"));
                    modified = true;
                } else if ("ROLE_SUPPLIER".equals(rName) && savedRoles.containsKey("PRODUCER")) {
                    u.setRole(savedRoles.get("PRODUCER"));
                    modified = true;
                } else if ("ROLE_POS".equals(rName) && savedRoles.containsKey("CASHIER")) {
                    u.setRole(savedRoles.get("CASHIER"));
                    modified = true;
                } else if ("ROLE_DRIVER".equals(rName) && savedRoles.containsKey("LOGISTICS_DRIVER")) {
                    u.setRole(savedRoles.get("LOGISTICS_DRIVER"));
                    modified = true;
                } else if ("ROLE_QC".equals(rName) && savedRoles.containsKey("QC_INSPECTOR")) {
                    u.setRole(savedRoles.get("QC_INSPECTOR"));
                    modified = true;
                }
            }
            if (modified) {
                userRepository.save(u);
            }
        }
    }

    private void createOrUpdateDemoUser(String username, String rawPass, String fullName, String dept, Role role,
                                        String phone, String identityCard, String assignedEntity) {
        Optional<User> existing = userRepository.findByUsername(username);
        if (existing.isEmpty()) {
            User u = new User(username, passwordEncoder.encode(rawPass), fullName, dept, role);
            u.setPhone(phone);
            u.setIdentityCard(identityCard);
            u.setAssignedEntity(assignedEntity);
            u.setIsActive(true);
            userRepository.save(u);
        } else {
            User u = existing.get();
            u.setFullName(fullName);
            u.setDepartment(dept);
            u.setRole(role);
            u.setPhone(phone);
            u.setIdentityCard(identityCard);
            u.setAssignedEntity(assignedEntity);
            u.setIsActive(true);
            if (!passwordEncoder.matches(rawPass, u.getPasswordHash())) {
                u.setPasswordHash(passwordEncoder.encode(rawPass));
            }
            userRepository.save(u);
        }
    }

    private void initMySqlAndRedisStorageProfiles() {
        List<StorageProfile> defaults = List.of(
                new StorageProfile("CHILLED_MEAT", "Thịt Tươi Sống Mát", 0.0, 4.0, 80.0, 85.0, "NH3", 40.0, 120, 65.5),
                new StorageProfile("FRESH_SEAFOOD", "Thủy Hải Sản Tươi Ướp Đá", 0.0, 2.0, 90.0, 98.0, "TMA", 25.0, 72, 85.2),
                new StorageProfile("VEG_FRUIT", "Rau Củ Quả & Trái Cây Tươi", 8.0, 12.0, 85.0, 95.0, "C2H4", 30.0, 168, 50.0),
                new StorageProfile("DAIRY", "Sữa Tươi & Bơ Sữa Thanh Trùng", 2.0, 6.0, 60.0, 70.0, "NONE", 0.0, 240, 75.0),
                new StorageProfile("DEEP_FROZEN", "Thực Phẩm Đông Lạnh Sâu", -30.0, -18.0, 70.0, 85.0, "NONE", 0.0, 2160, 40.0),
                new StorageProfile("DELI_HOT", "Thực Phẩm Nóng Chế Biến Sẵn", 60.0, 85.0, 40.0, 60.0, "NONE", 0.0, 12, 30.0)
        );

        for (StorageProfile p : defaults) {
            StorageProfile saved = profileRepository.save(p);
            redisPolyglotService.cacheStorageProfile(saved);
        }
    }

    private void initPolyglotBatchesBlockchainCassandraAndNeo4j() {
        // Dọn dẹp các lô hàng test tự động sinh ra trùng lặp (LOT-WEB-*, LOT-MOB-*, LOT-E2E-*)
        blockchainLedgerService.purgeTestBatches();

        // 1. Lô Rau củ quả Đà Lạt (LOT-VEG-2026-001) - Đã phân cho Tài xế Lê Hoàng Nam (Chờ xuất bến)
        seedBatchIfMissingOrClean(
                "LOT-VEG-2026-001",
                "Xà Lách Thủy Canh Đà Lạt VietGAP",
                "VEG_FRUIT",
                "Nông trại Công nghệ cao LangBiang - Đà Lạt",
                "49C-567.89",
                "Lê Hoàng Nam",
                List.of("Siêu Thị Co.opmart Quận 1", "Siêu Thị Co.opmart Quận 7", "Siêu Thị Co.opmart Thủ Đức"),
                List.of("Kệ Mát Rau Củ A1 (8°C - 12°C)", "Kệ Mát Rau Củ B2"),
                45000.0,
                0.5,
                Map.of(
                        "growing_method", "Thủy canh hồi lưu NFT trong nhà kính",
                        "nutrient_solution_ec", "1.6 mS/cm",
                        "pesticide_Test", "0.00 ppm (An toàn tuyệt đối)",
                        "harvest_time", "2026-10-18T05:30:00Z"
                ),
                9.5, 89.0, "C2H4", 12.4, "READY_FOR_PICKUP"
        );

        // 2. Lô Cá Hồi Phi Lê Tươi (LOT-FISH-2026-001) - Đã phân cho Tài xế Phạm Tài Xế (Chờ xuất bến)
        seedBatchIfMissingOrClean(
                "LOT-FISH-2026-001",
                "Cá Hồi Nauy Phi Lê Tươi Sashimi",
                "FRESH_SEAFOOD",
                "Nhà máy Chế biến Thủy sản Biển Đông - Cát Lái",
                "51D-998.12",
                "Phạm Tài Xế",
                List.of("Siêu Thị Co.opmart Quận 1", "Siêu Thị Co.opmart Quận 3", "Siêu Thị Co.opmart Phú Mỹ Hưng"),
                List.of("Quầy Hải Sản Tươi Sống S1 (0°C - 2°C)"),
                320000.0,
                0.4,
                Map.of(
                        "catch_origin", "Nhập khẩu đường hàng không (Oslo -> SGN)",
                        "histamine_ppm", "4.2 ppm (Chuẩn < 50 ppm)",
                        "parasite_screening", "Âm tính (Soi chiếu UV)",
                        "fillet_date", "2026-10-18T03:00:00Z"
                ),
                1.2, 91.0, "TMA", 14.8, "READY_FOR_PICKUP"
        );

        // 3. Lô Thịt Bò Wagyu Úc Mát (LOT-MEAT-2026-002) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-MEAT-2026-002",
                "Thịt Thăn Ngoại Bò Wagyu Úc Chilled",
                "CHILLED_MEAT",
                "Tổ hợp Chế biến Thịt Mát MEATDeli Long An",
                "62C-334.55",
                "Trần Văn Lái",
                List.of("Siêu Thị Co.opmart Quận 7", "Siêu Thị Co.opmart Gò Vấp"),
                List.of("Tủ Thịt Mát Chuyên Dụng M2 (0°C - 4°C)"),
                195000.0,
                0.5,
                Map.of(
                        "veterinary_cert", "VN-VET-2026-99281",
                        "slaughter_method", "Làm mát Chilled 24h ở 0°C..4°C",
                        "ph_level", "5.65 (Chuẩn thịt tươi)",
                        "antibiotic_residue", "Không phát hiện"
                ),
                2.1, 85.0, "NH3", 11.0, "ON_SHELF"
        );

        // 4. Lô Há Cảo Đông Lạnh Sâu (LOT-FROZEN-2026-001) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-FROZEN-2026-001",
                "Há Cảo Tôm Thượng Hạng Cấp Đông IQF",
                "DEEP_FROZEN",
                "Nhà máy Thực phẩm Đông lạnh Cầu Tre - Tân Phú",
                "51C-777.99",
                "Võ Thành Đạt",
                List.of("Siêu Thị Co.opmart Quận 1", "Siêu Thị Co.opmart Tân Bình"),
                List.of("Tủ Đông Âm Sâu F1 (-25°C đến -18°C)"),
                89000.0,
                0.5,
                Map.of(
                        "freezing_technology", "Cấp đông siêu tốc IQF ở -35°C",
                        "core_temperature", "-21.5°C",
                        "packaging_integrity", "Hút chân không 2 lớp PA/PE"
                ),
                -20.5, 68.0, "NONE", 0.0, "ON_SHELF"
        );

        // 5. Lô Sữa Tươi Thanh Trùng Đà Lạt (LOT-DAIRY-2026-005) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-DAIRY-2026-005",
                "Sữa Tươi Thanh Trùng Đà Lạt Milk 100% Nguyên Chất",
                "DAIRY",
                "Trang trại Bò sữa Công nghệ cao Đơn Dương - Lâm Đồng",
                "49C-112.33",
                "Đặng Quốc Huy",
                List.of("Siêu Thị Co.opmart Quận 1", "Siêu Thị Co.opmart Quận 7"),
                List.of("Tủ Mát Sữa Thanh Trùng D1 (2°C - 6°C)"),
                42000.0,
                1.0,
                Map.of(
                        "pasteurization_temp", "72°C trong 15 giây (HTST)",
                        "somatic_cell_count", "< 150,000 cells/ml (Chuẩn A)",
                        "melamine_test", "Âm tính",
                        "fat_content", "3.8%"
                ),
                3.8, 75.0, "NONE", 0.0, "ON_SHELF"
        );

        // 6. Lô Gà Quay Thảo Mộc Deli Giữ Nóng (LOT-DELI-2026-006) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-DELI-2026-006",
                "Gà Quay Thảo Mộc Nguyên Con Quầy Deli Nóng",
                "DELI_HOT",
                "Bếp Trung Tâm Central Kitchen Co.op - Bình Dương",
                "61C-889.01",
                "Hoàng Gia Bảo",
                List.of("Siêu Thị Co.opmart Quận 1", "Siêu Thị Co.opmart Huỳnh Tấn Phát"),
                List.of("Tủ Giữ Nóng Hồng Ngoại Deli H1 (60°C - 75°C)"),
                149000.0,
                1.2,
                Map.of(
                        "roasting_core_temp", "85°C trong 45 phút",
                        "holding_temperature", ">= 63°C liên tục",
                        "microbiological_test", "Salmonella / E.coli: Âm tính"
                ),
                66.5, 58.0, "NONE", 0.0, "ON_SHELF"
        );

        // 7. Lô Dâu Tây Đà Lạt (LOT-VEG-2026-007) - Admin đã giao cho Lê Hoàng Nam, chờ tài xế bấm Nhận lô (ASSIGNED_PENDING)
        seedBatchIfMissingOrClean(
                "LOT-VEG-2026-007",
                "Dâu Tây New Zealand Thủy Canh Đà Lạt",
                "VEG_FRUIT",
                "Nông trại Bio-Fresh Hồ Tuyền Lâm - Đà Lạt",
                "49C-567.89",
                "Lê Hoàng Nam",
                List.of("Siêu Thị Co.opmart Quận 7", "Siêu Thị Co.opmart Phú Mỹ Hưng"),
                List.of("Kệ Trái Cây Cao Cấp A2 (8°C - 12°C)"),
                185000.0,
                0.5,
                Map.of("brix_degree", "12.5 °Bx", "pesticide_Test", "0.00 ppm"),
                9.2, 88.0, "C2H4", 10.5, "ASSIGNED_PENDING"
        );

        // 8. Lô Tôm Hùm Bông Nha Trang (LOT-SEA-2026-008) - Admin đã giao cho Phạm Tài Xế, chờ tài xế bấm Nhận lô (ASSIGNED_PENDING)
        seedBatchIfMissingOrClean(
                "LOT-SEA-2026-008",
                "Tôm Hùm Bông Nha Trang Sống Giao Nhanh",
                "FRESH_SEAFOOD",
                "Vùng Nuôi Lồng Bè Vịnh Vân Phong - Khánh Hòa",
                "51D-998.12",
                "Phạm Tài Xế",
                List.of("Siêu Thị Co.opmart Quận 1", "Siêu Thị Co.opmart Quận 3"),
                List.of("Quầy Hải Sản Sống Cao Cấp S2 (0°C - 2°C)"),
                890000.0,
                1.2,
                Map.of("oxygen_saturation", "98%", "antibiotic_test", "Âm tính"),
                1.5, 92.0, "TMA", 9.8, "ASSIGNED_PENDING"
        );

        // 9. Lô Nho Xanh Ninh Thuận (LOT-VEG-2026-009) - Chưa phân công tài xế (CREATED)
        seedBatchIfMissingOrClean(
                "LOT-VEG-2026-009",
                "Nho Xanh Không Hạt Ninh Thuận VietGAP",
                "VEG_FRUIT",
                "Hợp Tác Xã Nho Sạch Ninh Phước - Ninh Thuận",
                "",
                "",
                List.of("Siêu Thị Co.opmart Thủ Đức"),
                List.of("Kệ Trái Cây Nội Địa A3"),
                95000.0,
                1.0,
                Map.of("brix_degree", "16.0 °Bx", "globalgap_cert", "GGN-405988312"),
                9.8, 87.0, "C2H4", 8.2, "CREATED"
        );

        // 10. Lô Thịt Heo Thảo Mộc BaF (LOT-MEAT-2026-010) - Chưa phân công tài xế (CREATED)
        seedBatchIfMissingOrClean(
                "LOT-MEAT-2026-010",
                "Thịt Ba Rọi Heo Thảo Mộc Chilled VietGAP",
                "CHILLED_MEAT",
                "Trang trại Chăn nuôi Sinh học BaF Tây Ninh",
                "",
                "",
                List.of("Siêu Thị Co.opmart Tân Bình"),
                List.of("Tủ Thịt Mát M1"),
                135000.0,
                0.5,
                Map.of("ph_level", "5.72", "herbal_feed", "100% Thảo mộc tự nhiên"),
                2.0, 84.0, "NH3", 7.5, "CREATED"
        );

        // 11. Lô Phô Mai Mozzarella Bảo Lộc (LOT-DAIRY-2026-011) - Chưa phân công tài xế (CREATED)
        seedBatchIfMissingOrClean(
                "LOT-DAIRY-2026-011",
                "Phô Mai Mozzarella Tươi Thủ Công Bảo Lộc",
                "DAIRY",
                "Nhà máy Chế biến Bơ Sữa Cao Nguyên Bảo Lộc",
                "",
                "",
                List.of("Siêu Thị Co.opmart Quận 7"),
                List.of("Tủ Bơ Sữa D2"),
                115000.0,
                0.25,
                Map.of("milk_origin", "100% Sữa bò tươi Bảo Lộc", "lactic_acid", "0.14%"),
                4.0, 72.0, "NONE", 0.0, "CREATED"
        );

        // 12. Lô Cá Tuyết Đại Tây Dương (LOT-FROZEN-2026-012) - Chưa phân công tài xế (CREATED)
        seedBatchIfMissingOrClean(
                "LOT-FROZEN-2026-012",
                "Phi Lê Cá Tuyết Đại Tây Dương Cấp Đông Sâu",
                "DEEP_FROZEN",
                "Kho Lạnh Ngoại Quan Cảng Cát Lái - TP.HCM",
                "",
                "",
                List.of("Siêu Thị Co.opmart Phú Mỹ Hưng"),
                List.of("Tủ Đông Hải Sản Nhập Khẩu F2"),
                420000.0,
                0.5,
                Map.of("core_temp", "-22.0°C", "glazing_ratio", "< 5%"),
                -21.0, 70.0, "NONE", 0.0, "CREATED"
        );

        // 13. Lô Vịt Quay Bắc Kinh Da Giòn (LOT-DELI-2026-013) - Chưa phân công tài xế (CREATED)
        seedBatchIfMissingOrClean(
                "LOT-DELI-2026-013",
                "Vịt Quay Bắc Kinh Da Giòn Quầy Deli Nóng",
                "DELI_HOT",
                "Bếp Trung Tâm Central Kitchen Co.op - Bình Dương",
                "",
                "",
                List.of("Siêu Thị Co.opmart Quận 1"),
                List.of("Tủ Giữ Nóng Deli H2"),
                245000.0,
                1.5,
                Map.of("roasting_temp", "90°C", "holding_temp", ">= 65°C"),
                67.0, 55.0, "NONE", 0.0, "CREATED"
        );

        // 14. Lô Bơ Sáp 034 Đắk Lắk (LOT-VEG-2026-014) - Chưa phân công tài xế (CREATED)
        seedBatchIfMissingOrClean(
                "LOT-VEG-2026-014",
                "Bơ Sáp 034 Đắk Lắk Tuyển Chọn Loại 1",
                "VEG_FRUIT",
                "HTX Nông Nghiệp Bền Vững Cư M'gar - Đắk Lắk",
                "",
                "",
                List.of("Siêu Thị Co.opmart Gò Vấp"),
                List.of("Kệ Trái Cây Đặc Sản Tây Nguyên A4"),
                78000.0,
                1.0,
                Map.of("dry_matter", "26.5%", "pesticide_residue", "0.00 ppm"),
                10.2, 86.0, "C2H4", 11.0, "CREATED"
        );

        // 15. Lô Cà Chua Beef Hữu Cơ (LOT-VEG-2026-015) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-VEG-2026-015",
                "Cà Chua Beef Hữu Cơ Đơn Dương Lâm Đồng",
                "VEG_FRUIT",
                "Trang trại Hữu cơ Organik Đơn Dương - Lâm Đồng",
                "49C-112.33",
                "Đặng Quốc Huy",
                List.of("Siêu Thị Co.opmart Quận 7"),
                List.of("Kệ Rau Hữu Cơ A1"),
                55000.0,
                0.5,
                Map.of("usda_organic", "USDA-ORG-2026", "brix", "6.8 °Bx"),
                9.6, 88.0, "C2H4", 10.2, "ON_SHELF"
        );

        // 16. Lô Cua Hoàng Đế Alaska (LOT-SEA-2026-016) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-SEA-2026-016",
                "Cua Hoàng Đế Alaska Tươi Sống Nhập Khẩu",
                "FRESH_SEAFOOD",
                "Trung tâm Hải sản Nhập khẩu Tân Sơn Nhất Cargo",
                "51D-998.12",
                "Phạm Tài Xế",
                List.of("Siêu Thị Co.opmart Quận 1"),
                List.of("Bể Hải Sản Lạnh S1"),
                1650000.0,
                2.2,
                Map.of("water_temp", "1.0°C", "salinity", "32 ppt"),
                1.1, 93.0, "TMA", 8.5, "ON_SHELF"
        );

        // 17. Lô Ức Gà Phi Lê Hữu Cơ (LOT-MEAT-2026-017) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-MEAT-2026-017",
                "Ức Gà Phi Lê Hữu Cơ VietGAP Bình Phước",
                "CHILLED_MEAT",
                "Nhà máy Chế biến Gia cầm CPV Bình Phước",
                "61C-889.01",
                "Hoàng Gia Bảo",
                List.of("Siêu Thị Co.opmart Thủ Đức"),
                List.of("Tủ Thịt Mát Gia Cầm M3"),
                88000.0,
                0.5,
                Map.of("salmonella_test", "Âm tính", "chill_temp", "1.8°C"),
                1.8, 83.0, "NH3", 9.0, "ON_SHELF"
        );

        // 18. Lô Sữa Chua Hy Lạp Mộc Châu (LOT-DAIRY-2026-018) - Đã lên kệ (ON_SHELF)
        seedBatchIfMissingOrClean(
                "LOT-DAIRY-2026-018",
                "Sữa Chua Hy Lạp Men Sống Cao Cấp",
                "DAIRY",
                "Nhà máy Sữa Thanh Trùng Long Thành - Đồng Nai",
                "62C-334.55",
                "Trần Văn Lái",
                List.of("Siêu Thị Co.opmart Quận 3"),
                List.of("Tủ Lạnh Sữa Chua D3"),
                68000.0,
                0.4,
                Map.of("probiotic_cfu", "> 10^9 CFU/g", "protein", "9.5g/100g"),
                3.5, 74.0, "NONE", 0.0, "ON_SHELF"
        );
    }

    private double[] resolveFarmCoordinates(String farmName, String category) {
        if (farmName == null) return new double[]{11.9404, 108.4583};
        String fn = farmName.toLowerCase();
        if (fn.contains("đà lạt") || fn.contains("langbiang") || fn.contains("đơn dương") || fn.contains("bio-fresh") || fn.contains("lâm đồng")) {
            return new double[]{11.9404, 108.4583};
        } else if (fn.contains("long an") || fn.contains("meatdeli")) {
            return new double[]{10.5348, 106.4116};
        } else if (fn.contains("nha trang") || fn.contains("vân phong") || fn.contains("khánh hòa")) {
            return new double[]{12.2388, 109.1967};
        } else if (fn.contains("ninh thuận") || fn.contains("ninh phước")) {
            return new double[]{11.5649, 108.9882};
        } else if (fn.contains("tây ninh") || fn.contains("baf")) {
            return new double[]{11.3100, 106.0980};
        } else if (fn.contains("bảo lộc")) {
            return new double[]{11.5470, 107.8070};
        } else if (fn.contains("bình dương")) {
            return new double[]{11.3254, 106.6343};
        } else if (fn.contains("đắk lắk") || fn.contains("cư m'gar")) {
            return new double[]{12.6667, 108.0500};
        } else if (fn.contains("bình phước") || fn.contains("cpv")) {
            return new double[]{11.7512, 106.9048};
        } else if (fn.contains("đồng nai") || fn.contains("long thành")) {
            return new double[]{10.7925, 106.9538};
        } else if (fn.contains("cát lái") || fn.contains("tân bình") || fn.contains("tân phú") || fn.contains("cầu tre") || fn.contains("tân sơn nhất")) {
            return new double[]{10.7600, 106.7750};
        }
        return new double[]{11.9404, 108.4583};
    }

    private void seedBatchIfMissingOrClean(
            String batchCode,
            String productName,
            String category,
            String farmName,
            String vehiclePlate,
            String driverName,
            List<String> supermarkets,
            List<String> shelves,
            double price,
            double weightKg,
            Map<String, Object> dynamicAttrs,
            double avgTemp,
            double avgHum,
            String gasType,
            double avgGas,
            String finalStatus) {
        Optional<FoodBatchDocument> existingOpt = blockchainLedgerService.findBatchByCode(batchCode);
        List<BlockchainBlock> existingChain = blockchainLedgerService.getChainByBatch(batchCode);

        // Bảo tồn nguyên vẹn 100% trạng thái người dùng/hệ thống đã thao tác:
        // Lô hàng đã tồn tại trong CSDL sẽ giữ nguyên trạng thái, lịch sử tài xế, kết quả kiểm định KCS,
        // vị trí quầy kệ, tem QR đã bán (SOLD_SEAL_VOID) và chuỗi khối Blockchain.
        if (existingOpt.isPresent()) {
            FoodBatchDocument existing = existingOpt.get();
            log.info("[PERSISTENCE] Lô {} đã tồn tại trong CSDL với trạng thái [{}], bảo toàn nguyên vẹn thao tác và {} khối sổ cái Blockchain.",
                    batchCode, existing.getStatus(), existingChain.size());
            if (existing.getPackageCount() == null || existing.getPackageCount() == 0) {
                applyPackagingProfile(existing, batchCode, category, price, weightKg);
                blockchainLedgerService.saveFoodBatch(existing);
            }
            return;
        }

        // Chỉ khởi tạo mẫu khi lô hàng hoàn toàn chưa có trong CSDL
        seedBatchWithFullWorkflow(
                batchCode, productName, category, farmName, vehiclePlate, driverName,
                supermarkets, shelves, price, weightKg, dynamicAttrs, avgTemp, avgHum, gasType, avgGas, finalStatus
        );
    }

    private void seedBatchWithFullWorkflow(
            String batchCode,
            String productName,
            String category,
            String farmName,
            String vehiclePlate,
            String driverName,
            List<String> supermarkets,
            List<String> shelves,
            double price,
            double weightKg,
            Map<String, Object> dynamicAttrs,
            double avgTemp,
            double avgHum,
            String gasType,
            double avgGas,
            String finalStatus) {

        // KIỂM TRA NẾU LÔ HÀNG ĐÃ TỒN TẠI TRONG CƠ SỞ DỮ LIỆU THÌ TUYỆT ĐỐI KHÔNG GHI ĐÈ!
        // Giữ nguyên toàn bộ trạng thái tiến độ người dùng đã thực hiện (DELIVERED, IN_TRANSIT, các khối Blockchain đã đúc, dữ liệu cảm biến Cassandra...)
        Optional<FoodBatchDocument> existing = blockchainLedgerService.findBatchByCode(batchCode);
        if (existing.isPresent()) {
            log.info("[DATA-INIT] Lô hàng {} đã tồn tại trong CSDL (Trạng thái: {}). Giữ nguyên trạng thái và dữ liệu thực tế, không ghi đè lại!",
                    batchCode, existing.get().getStatus());
            return;
        }

        // 1. Chỉ làm sạch dữ liệu sổ cái và dữ liệu cảm biến khi lô hàng chưa từng tồn tại
        blockchainLedgerService.clearChainForBatch(batchCode);
        cassandraTelemetryService.clearTelemetryForBatch(batchCode);

        boolean isDeliveredAndStocked = "ON_SHELF".equals(finalStatus) || "QC_ACCEPTED".equals(finalStatus) || "DELIVERED".equals(finalStatus);

        FoodBatchDocument batch = new FoodBatchDocument();
        batch.setBatchCode(batchCode);
        batch.setBatchQrCode("QR-BATCH-" + batchCode);
        batch.setProductName(productName);
        batch.setCategory(category);
        batch.setFarmName(farmName);
        batch.setHarvestDate(Instant.now().minus(18, ChronoUnit.HOURS));
        batch.setStatus(finalStatus);
        batch.setUnitPrice(price);
        applyPackagingProfile(batch, batchCode, category, price, weightKg);
        batch.setStandards(List.of("VietGAP", "HACCP", "ISO-22000:2018"));
        batch.getDynamicAttributes().putAll(dynamicAttrs);

        Map<String, Object> cert = new LinkedHashMap<>();
        cert.put("name", "Chứng nhận An toàn Chuỗi thực phẩm TP.HCM");
        cert.put("cert_no", "SAFE-FOOD-2026-" + batchCode.substring(batchCode.length() - 3));
        cert.put("issuer", "Sở An Toàn Thực Phẩm TP.HCM");
        cert.put("valid_until", "2027-12-31");
        batch.getCertifications().add(cert);

        batch.getTransportJourney().put("vehicle_plate", vehiclePlate != null ? vehiclePlate : "");
        batch.getTransportJourney().put("driver_name", driverName != null ? driverName : "");
        batch.getTransportJourney().put("door_open", false);

        if (isDeliveredAndStocked) {
            batch.getTransportJourney().put("iot_device_id", "ESP32-MULTI-01");
            batch.getTransportJourney().put("route", farmName + " -> Tổng Kho Phân Phối TP.HCM");
            batch.getTransportJourney().put("status", "DELIVERED");
            batch.getTransportJourney().put("loading_confirmed", true);
        } else {
            batch.getTransportJourney().put("iot_device_id", "SENSOR-STORAGE-FARM");
            batch.getTransportJourney().put("route", "Đang lưu kho ban đầu tại " + farmName);
            batch.getTransportJourney().put("status", finalStatus);
            batch.getTransportJourney().put("loading_confirmed", false);
            batch.getQcInspection().clear();
        }

        blockchainLedgerService.saveFoodBatch(batch);

        // Sinh 5 mã QR Đơn vị sản phẩm (Item-level QR Serial) cho mỗi lô
        List<FoodBatchDocument.ItemQrSerial> items = blockchainLedgerService.generateItemQrSerials(
                batchCode, 5, weightKg, price
        );
        if (isDeliveredAndStocked) {
            items.forEach(i -> i.setStatus("ON_SHELF"));
        }

        double[] coords = resolveFarmCoordinates(farmName, category);
        double farmLat = coords[0];
        double farmLon = coords[1];

        if (isDeliveredAndStocked) {
            // Lô đã bàn giao & lên kệ: Sinh 15 điểm hành trình trên xe tải lạnh theo cung đường vận chuyển
            for (int i = 15; i >= 1; i--) {
                SensorTelemetryDto t = new SensorTelemetryDto();
                t.setBatchCode(batchCode);
                t.setCategoryCode(category);
                t.setDeviceId("ESP32-MULTI-01");
                t.setVehicleId(vehiclePlate);
                t.setProductName(productName);
                double wave = Math.sin(i * 0.6) * 0.4;
                t.setTemperature(Math.round((avgTemp + wave) * 10.0) / 10.0);
                t.setHumidity(Math.round((avgHum + wave * 1.5) * 10.0) / 10.0);
                t.setGasType(gasType);
                t.setGasPpm("NONE".equals(gasType) ? 0.0 : Math.round((avgGas + Math.abs(wave) * 2) * 10.0) / 10.0);
                t.setDoorOpen(false);
                t.setRelayCooling(false);
                t.setAlertTriggered("NORMAL");
                t.setLatitude(farmLat - (15 - i) * 0.05);
                t.setLongitude(farmLon - (15 - i) * 0.04);
                t.setTimestamp(Instant.now().minus(i * 15L, ChronoUnit.MINUTES));
                cassandraTelemetryService.appendTelemetryRow(t);
            }
        } else {
            // Lô chưa vận chuyển: CHỈ CÓ NHIỆT ĐỘ ĐƯỢC BẢO QUẢN TRONG SUỐT QUÁ TRÌNH LƯU KHO BAN ĐẦU
            // Tuyệt đối không có xe chạy trên đường đi
            for (int i = 12; i >= 1; i--) {
                SensorTelemetryDto t = new SensorTelemetryDto();
                t.setBatchCode(batchCode);
                t.setCategoryCode(category);
                t.setDeviceId("SENSOR-STORAGE-FARM");
                t.setVehicleId(""); // Không có thông tin xe trên đường
                t.setProductName(productName);
                double jitter = Math.sin(i * 0.4) * 0.1;
                t.setTemperature(Math.round((avgTemp + jitter) * 10.0) / 10.0);
                t.setHumidity(Math.round((avgHum + jitter * 0.5) * 10.0) / 10.0);
                t.setGasType(gasType);
                t.setGasPpm("NONE".equals(gasType) ? 0.0 : Math.round(avgGas * 10.0) / 10.0);
                t.setDoorOpen(false);
                t.setRelayCooling(false);
                t.setAlertTriggered("NORMAL");
                t.setLatitude(farmLat);
                t.setLongitude(farmLon);
                t.setTimestamp(Instant.now().minus(i * 30L, ChronoUnit.MINUTES));
                cassandraTelemetryService.appendTelemetryRow(t);
            }
        }

        // Đúc Khối Block #0: GENESIS_BATCH_CREATED (Chứng thực xuất xứ nguồn gốc nông trại)
        blockchainLedgerService.mintBlock(
                batchCode,
                "GENESIS_BATCH_CREATED",
                farmName,
                "PRODUCER",
                Map.of("productName", productName, "category", category, "unitCount", 100, "attributes", dynamicAttrs),
                List.of("GENESIS|" + batchCode)
        );

        // NẾU LÔ ĐÃ LÊN KỆ: Mới đúc tiếp các khối Block #1 (IoT xe lạnh), Block #2 (Inbound QC), Block #3 (Shelf FEFO)
        if (isDeliveredAndStocked) {
            List<String> merkleLeaves = cassandraTelemetryService.buildMerkleLeavesForBatch(batchCode);

            blockchainLedgerService.mintBlock(
                    batchCode,
                    "COLD_CHAIN_IOT_SYNCED",
                    "Xe tải lạnh " + vehiclePlate + " (ESP32-MULTI-01)",
                    "LOGISTICS_DRIVER",
                    Map.of("vehiclePlate", vehiclePlate, "avgTempC", avgTemp, "avgHumidity", avgHum, "gasType", gasType, "avgGasPpm", avgGas),
                    merkleLeaves
            );

            StorageProfile profile = profileRepository.findById(category).orElse(null);
            List<SensorTelemetryDto> history = cassandraTelemetryService.getTelemetryByBatch(batchCode);
            Map<String, Object> aiEval = aiShelfLifePredictionService.evaluateBatchFreshnessAndTti(batchCode, profile, history);

            batch.getQcInspection().put("inspector", "Trần Minh Khoa (QA/QC)");
            batch.getQcInspection().put("ttiFreshnessScore", aiEval.get("ttiFreshnessScore"));
            batch.getQcInspection().put("remainingShelfLifeHours", aiEval.get("remainingShelfLifeHours"));
            batch.getQcInspection().put("decision", "ACCEPTED");
            batch.getQcInspection().put("inspectedAt", Instant.now().minus(2, ChronoUnit.HOURS).toString());
            blockchainLedgerService.saveFoodBatch(batch);

            blockchainLedgerService.mintBlock(
                    batchCode,
                    "INBOUND_QC_SMART_CONTRACT_APPROVED",
                    "Trần Minh Khoa (Cổng Nhập Kho Siêu Thị)",
                    "QC_INSPECTOR",
                    Map.of(
                            "decision", "ACCEPTED",
                            "ttiFreshnessScore", aiEval.get("ttiFreshnessScore"),
                            "remainingShelfLifeHours", aiEval.get("remainingShelfLifeHours"),
                            "telemetrySamplesVerified", history.size()
                    ),
                    merkleLeaves
            );

            blockchainLedgerService.mintBlock(
                    batchCode,
                    "SHELF_STOCKED_FEFO_ACTIVE",
                    "Vũ Thị Kệ Hàng (" + shelves.get(0) + ")",
                    "SHELF_OPERATOR",
                    Map.of("shelf", shelves.get(0), "itemQrCount", items.size(), "fefoRemainingHours", aiEval.get("remainingShelfLifeHours")),
                    merkleLeaves
            );

            double remHours = ((Number) aiEval.get("remainingShelfLifeHours")).doubleValue();
            redisPolyglotService.updateFefoPriorityQueue(category, batchCode, remHours);
        }

        // Chỉ tạo liên kết DELIVERED_TO và STOCKED_AT trong Neo4j cho lô đã lên kệ / đã bàn giao
        List<String> serialCodes = items.stream().map(FoodBatchDocument.ItemQrSerial::getSerialCode).collect(Collectors.toList());
        neo4jSupplyChainService.upsertBatchToGraph(
                batchCode,
                productName,
                category,
                farmName,
                vehiclePlate,
                isDeliveredAndStocked ? supermarkets : Collections.emptyList(),
                isDeliveredAndStocked ? shelves : Collections.emptyList(),
                serialCodes
        );
    }

    private void applyPackagingProfile(FoodBatchDocument batch, String batchCode, String category, double price, double unitWeightKg) {
        int packageCount;
        double weightPerPackageKg;
        String packageUnit;
        int unitsPerPackage;

        switch (batchCode) {
            case "LOT-VEG-2026-001":
                packageCount = 60; weightPerPackageKg = 10.0;
                packageUnit = "Thùng carton VietGAP 5 lớp"; unitsPerPackage = 20;
                break;
            case "LOT-FISH-2026-001":
                packageCount = 40; weightPerPackageKg = 12.0;
                packageUnit = "Thùng xốp bảo ôn ướp đá gel"; unitsPerPackage = 30;
                break;
            case "LOT-MEAT-2026-002":
                packageCount = 50; weightPerPackageKg = 15.0;
                packageUnit = "Thùng bảo ôn chân không Chilled"; unitsPerPackage = 30;
                break;
            case "LOT-FROZEN-2026-001":
                packageCount = 80; weightPerPackageKg = 10.0;
                packageUnit = "Thùng carton đông lạnh sâu IQF"; unitsPerPackage = 20;
                break;
            case "LOT-DAIRY-2026-005":
                packageCount = 70; weightPerPackageKg = 12.0;
                packageUnit = "Két bơ sữa chuyên dụng tiêu chuẩn"; unitsPerPackage = 12;
                break;
            case "LOT-DELI-2026-006":
                packageCount = 30; weightPerPackageKg = 12.0;
                packageUnit = "Thùng giữ nhiệt chân không Deli"; unitsPerPackage = 10;
                break;
            case "LOT-VEG-2026-007":
                packageCount = 50; weightPerPackageKg = 8.0;
                packageUnit = "Thùng carton lạnh lót mút chống dập"; unitsPerPackage = 16;
                break;
            case "LOT-SEA-2026-008":
                packageCount = 25; weightPerPackageKg = 12.0;
                packageUnit = "Thùng oxy giữ ẩm bọc xốp"; unitsPerPackage = 10;
                break;
            case "LOT-VEG-2026-009":
                packageCount = 50; weightPerPackageKg = 10.0;
                packageUnit = "Thùng carton đục lỗ thông khí"; unitsPerPackage = 10;
                break;
            case "LOT-MEAT-2026-010":
                packageCount = 60; weightPerPackageKg = 10.0;
                packageUnit = "Thùng bảo ôn Chilled MEATDeli"; unitsPerPackage = 20;
                break;
            case "LOT-DAIRY-2026-011":
                packageCount = 40; weightPerPackageKg = 8.0;
                packageUnit = "Thùng xốp lạnh mini cách nhiệt"; unitsPerPackage = 32;
                break;
            case "LOT-FROZEN-2026-012":
                packageCount = 50; weightPerPackageKg = 12.0;
                packageUnit = "Thùng carton xuất khẩu IQF"; unitsPerPackage = 24;
                break;
            case "LOT-DELI-2026-013":
                packageCount = 25; weightPerPackageKg = 15.0;
                packageUnit = "Thùng giữ nhiệt nhôm inox cách nhiệt"; unitsPerPackage = 10;
                break;
            case "LOT-VEG-2026-014":
                packageCount = 70; weightPerPackageKg = 12.0;
                packageUnit = "Thùng carton lót rơm bảo quản"; unitsPerPackage = 12;
                break;
            case "LOT-VEG-2026-015":
                packageCount = 60; weightPerPackageKg = 10.0;
                packageUnit = "Thùng giấy carton Kraft hữu cơ"; unitsPerPackage = 20;
                break;
            case "LOT-SEA-2026-016":
                packageCount = 20; weightPerPackageKg = 15.0;
                packageUnit = "Thùng xốp bảo ôn chuyên dụng sống"; unitsPerPackage = 7;
                break;
            case "LOT-MEAT-2026-017":
                packageCount = 80; weightPerPackageKg = 10.0;
                packageUnit = "Thùng bảo ôn Chilled kháng khuẩn"; unitsPerPackage = 20;
                break;
            case "LOT-DAIRY-2026-018":
                packageCount = 60; weightPerPackageKg = 8.0;
                packageUnit = "Thùng xốp lót đá khô bảo quản men"; unitsPerPackage = 20;
                break;
            default:
                packageCount = 50; weightPerPackageKg = 10.0;
                packageUnit = "Thùng carton tiêu chuẩn"; unitsPerPackage = 20;
                break;
        }

        double totalWeight = packageCount * weightPerPackageKg;
        batch.setPackageCount(packageCount);
        batch.setWeightPerPackageKg(weightPerPackageKg);
        batch.setPackageUnit(packageUnit);
        batch.setUnitsPerPackage(unitsPerPackage);
        batch.setTotalWeightKg(totalWeight);
        batch.setUnitCount(packageCount * unitsPerPackage);
        batch.setUnitWeightKg(unitWeightKg > 0 ? unitWeightKg : Math.round((weightPerPackageKg / unitsPerPackage) * 100.0) / 100.0);
    }
}
