package com.smartchain;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.dto.SensorTelemetryDto;
import com.smartchain.entity.StorageProfile;
import com.smartchain.model.BlockchainBlock;
import com.smartchain.service.AiShelfLifePredictionService;
import com.smartchain.service.BlockchainLedgerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SmartChainSystemTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BlockchainLedgerService blockchainLedgerService;

    @Autowired
    private AiShelfLifePredictionService aiShelfLifePredictionService;

    @Test
    @Order(1)
    @DisplayName("1. [BUG-01 & BUG-02] Kiểm tra Xác thực BCrypt & Chặn Mật khẩu Sai / Không có JWT")
    void testAuthenticationAndJwtFilterProtection() throws Exception {
        // 1A. Gọi API tạo lô hàng không có JWT Token -> Phải bị chặn 401 Unauthorized
        mockMvc.perform(post("/api/v1/batches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"batch_code\":\"LOT-UNAUTH-01\",\"product_name\":\"Test\"}"))
                .andExpect(status().isUnauthorized());

        // 1B. Gọi API với Token giả mạo -> Phải bị chặn 401 Unauthorized
        mockMvc.perform(post("/api/v1/batches")
                        .header("Authorization", "Bearer tampered.jwt.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"batch_code\":\"LOT-UNAUTH-01\",\"product_name\":\"Test\"}"))
                .andExpect(status().isUnauthorized());

        // 1C. Đăng nhập sai mật khẩu -> Phải trả về 401 Unauthorized (Không còn backdoor)
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong_password_999\"}"))
                .andExpect(status().isUnauthorized());

        // 1D. Đăng nhập đúng mật khẩu BCrypt ('123') -> Thành công 200 OK kèm JWT Token
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @Order(2)
    @DisplayName("2. [BUG-03 & RBAC] Chặn Tự Đăng ký Quyền ADMIN & Phân quyền 8 Actor")
    void testPrivilegeEscalationPreventionAndRbac() throws Exception {
        // 2A. Cố tình tự đăng ký tài khoản với role = ADMIN -> Phải bị chặn 403 Forbidden
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"hacker_admin\",\"password\":\"123\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ADMIN_SELF_REGISTRATION_FORBIDDEN"));

        // 2B. Đăng nhập bằng tài khoản CASHIER (pos_01) và cố tình gọi API Thu hồi Khẩn cấp của ADMIN -> 403 Forbidden
        MvcResult cashierLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"pos_01\",\"password\":\"123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Map<?, ?> loginData = objectMapper.readValue(cashierLogin.getResponse().getContentAsString(), Map.class);
        String cashierToken = String.valueOf(loginData.get("token"));

        mockMvc.perform(post("/api/v1/admin/recall")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"batchCode\":\"LOT-VEG-2026-001\",\"reason\":\"Unauthorized Recall Attempt\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    @DisplayName("3. [BUG-04] Kiểm tra Chữ ký số Bất đối xứng ECDSA (SHA256withECDSA) & Phát hiện Giả mạo Khối")
    void testBlockchainEcdsaSignatureAndTamperDetection() {
        String testBatch = "LOT-CRYPTO-TEST-001";
        BlockchainBlock b0 = blockchainLedgerService.mintBlock(
                testBatch, "GENESIS_BATCH_CREATED", "Farm Da Lat", "PRODUCER",
                Map.of("product", "Dau Tay", "qty", 100), List.of("LEAF_1", "LEAF_2")
        );
        BlockchainBlock b1 = blockchainLedgerService.mintBlock(
                testBatch, "INBOUND_QC_APPROVED", "QC Gate", "QC_INSPECTOR",
                Map.of("decision", "ACCEPTED", "tti", 92.5), List.of("LEAF_1", "LEAF_2", "LEAF_3")
        );

        assertTrue(b0.getDigitalSignature().startsWith("ECDSA-SHA256:"));
        assertTrue(blockchainLedgerService.verifyEcdsaSignature(b0.getCurrentHash(), b0.getDigitalSignature()));
        assertTrue(blockchainLedgerService.verifyEcdsaSignature(b1.getCurrentHash(), b1.getDigitalSignature()));

        // Chuỗi nguyên bản phải hợp lệ
        Map<String, Object> verifyOk = blockchainLedgerService.verifyChainIntegrity(testBatch);
        assertEquals(Boolean.TRUE, verifyOk.get("chainValid"));

        // Cố tình sửa đổi dữ liệu bên trong Block #1 mà không có khóa bí mật ECDSA -> Phải phát hiện TAMPERED!
        b1.getDataPayload().put("tti", 100.0);
        Map<String, Object> verifyTampered = blockchainLedgerService.verifyChainIntegrity(testBatch);
        assertEquals(Boolean.FALSE, verifyTampered.get("chainValid"));
    }

    @Test
    @Order(4)
    @DisplayName("4. Kiểm tra Động học Tích phân Arrhenius (TTI Shelf-Life & Chilling Injury)")
    void testArrheniusShelfLifePrediction() {
        StorageProfile vegProfile = new StorageProfile("VEG_FRUIT", "Rau củ quả", 8.0, 12.0, 85.0, 95.0, "C2H4", 30.0, 6);

        SensorTelemetryDto normalSample = new SensorTelemetryDto();
        normalSample.setTemperature(9.5);
        normalSample.setHumidity(89.0);
        normalSample.setGasPpm(10.0);
        normalSample.setTimestamp(Instant.now());

        Map<String, Object> optimalEval = aiShelfLifePredictionService.evaluateBatchFreshnessAndTti(
                "LOT-VEG-OPT", vegProfile, List.of(normalSample, normalSample, normalSample)
        );
        double optScore = ((Number) optimalEval.get("ttiFreshnessScore")).doubleValue();
        assertTrue(optScore >= 80.0, "Điểm độ tươi ở nhiệt độ chuẩn phải >= 80%");

        SensorTelemetryDto chillingBreachSample = new SensorTelemetryDto();
        chillingBreachSample.setTemperature(2.0); // Chilling injury < 8.0°C
        chillingBreachSample.setHumidity(88.0);
        chillingBreachSample.setGasPpm(45.0);    // Vượt ngưỡng C2H4 > 30 ppm
        chillingBreachSample.setTimestamp(Instant.now());

        Map<String, Object> breachEval = aiShelfLifePredictionService.evaluateBatchFreshnessAndTti(
                "LOT-VEG-BREACH", vegProfile, List.of(chillingBreachSample, chillingBreachSample, chillingBreachSample)
        );
        double breachScore = ((Number) breachEval.get("ttiFreshnessScore")).doubleValue();
        assertTrue(breachScore < optScore, "Điểm độ tươi khi vi phạm Chilling Injury + Khí Ethylene phải giảm mạnh");
        assertTrue(((Number) breachEval.get("chillingInjuryCount")).intValue() > 0);
    }

    @Test
    @Order(5)
    @DisplayName("5. Kiểm tra POS Redlock Chống Sao chép Mã QR (409 Conflict) & Thu hồi Đồ thị Neo4j")
    void testPosRedlockAntiCounterfeitAndNeo4jRecall() throws Exception {
        MvcResult adminLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = String.valueOf(objectMapper.readValue(adminLogin.getResponse().getContentAsString(), Map.class).get("token"));

        String testSerial = "QR-ITEM-VEG-2026-001-005";

        // Quét lần 1 -> 200 OK
        mockMvc.perform(post("/api/v1/pos/checkout")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serialCode\":\"" + testSerial + "\",\"cashierId\":\"CASHIER-JUNIT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fraudDetected").value(false));

        // Quét lần 2 cùng mã QR -> 409 CONFLICT (ALREADY_SOLD)
        mockMvc.perform(post("/api/v1/pos/checkout")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serialCode\":\"" + testSerial + "\",\"cashierId\":\"CASHIER-JUNIT-02\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fraudDetected").value(true))
                .andExpect(jsonPath("$.error").value("ALREADY_SOLD"));

        // Kích hoạt Thu hồi Khẩn cấp Neo4j
        mockMvc.perform(post("/api/v1/recall")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"batchCode\":\"LOT-DAIRY-2026-005\",\"reason\":\"JUnit Recall Test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMERGENCY_RECALL_COMPLETED"));
    }
}

