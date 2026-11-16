package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.dto.SensorTelemetryDto;
import com.smartchain.entity.StorageProfile;
import com.smartchain.repository.mysql.StorageProfileRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class MqttIngestionService implements MqttCallback {

    private static final Logger log = LoggerFactory.getLogger(MqttIngestionService.class);

    @Value("${mqtt.broker:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.clientId:smartchain-backend-service}")
    private String clientId;

    @Value("${mqtt.defaultTopic:smartchain/telemetry/#}")
    private String defaultTopic;

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final StorageProfileRepository profileRepository;
    private final CassandraTelemetryService cassandraTelemetryService;
    private final RedisPolyglotService redisPolyglotService;

    private MqttClient mqttClient;
    private volatile String activeBatchCode = null;
    private volatile String activeCategoryCode = null;
    private volatile String activeVehicleId = null;
    private volatile String activeProductName = null;
    private volatile String activeDemoScenario = "NORMAL"; // NORMAL, DEMO2_VEG_CHILLING_INJURY, DEMO3_SEAFOOD_GAS, DEMO4_FROZEN_DEFROST
    private volatile boolean manualRelayOverride = false;
    private volatile long lastRealTelemetryReceived = 0;
    private volatile long lastOtaSyncSentTime = 0;

    private String toAsciiSafe(String input) {
        if (input == null || input.isBlank()) return "Nong san Chuoi lanh";
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.replaceAll("[^\\x20-\\x7E]", "").trim();
    }

    // Tuyến đường vận chuyển chuẩn Quốc lộ 20 & Cao tốc Dầu Giây (Đà Lạt -> TP.HCM)
    private static final double[][] ROUTE_WAYPOINTS = {
        {11.9404, 108.4583}, // 1. Nông trại Công nghệ cao Đà Lạt
        {11.5479, 107.8077}, // 2. Trạm trung chuyển Bảo Lộc
        {11.1254, 107.1862}, // 3. Trạm kiểm dịch Định Quán - Đồng Nai
        {10.9465, 107.1258}, // 4. Cao tốc Dầu Giây - Long Thành
        {10.8012, 106.7554}, // 5. Tổng Kho Lạnh Cát Lái - TP. Thủ Đức
        {10.7295, 106.7068}  // 6. Siêu Thị Co.opmart Quận 7 - TP.HCM
    };
    private double routeProgress = 0.0; // Tiến độ hành trình di chuyển

    public synchronized double[] calculateRoutePosition() {
        routeProgress += 0.002; // Tốc độ di chuyển chậm rãi, chân thực (~4-5 phút toàn tuyến)
        if (routeProgress > 1.0) routeProgress = 0.0; // Quay đầu lặp lại hành trình

        int numSegments = ROUTE_WAYPOINTS.length - 1;
        double scaled = routeProgress * numSegments;
        int segIndex = (int) scaled;
        if (segIndex >= numSegments) segIndex = numSegments - 1;
        double fraction = scaled - segIndex;

        double lat = ROUTE_WAYPOINTS[segIndex][0] + fraction * (ROUTE_WAYPOINTS[segIndex + 1][0] - ROUTE_WAYPOINTS[segIndex][0]);
        double lng = ROUTE_WAYPOINTS[segIndex][1] + fraction * (ROUTE_WAYPOINTS[segIndex + 1][1] - ROUTE_WAYPOINTS[segIndex][1]);
        return new double[]{Math.round(lat * 10000.0) / 10000.0, Math.round(lng * 10000.0) / 10000.0};
    }

    public MqttIngestionService(ObjectMapper objectMapper,
                                SimpMessagingTemplate messagingTemplate,
                                StorageProfileRepository profileRepository,
                                CassandraTelemetryService cassandraTelemetryService,
                                RedisPolyglotService redisPolyglotService) {
        this.objectMapper = objectMapper;
        this.messagingTemplate = messagingTemplate;
        this.profileRepository = profileRepository;
        this.cassandraTelemetryService = cassandraTelemetryService;
        this.redisPolyglotService = redisPolyglotService;
    }

    @PostConstruct
    public void initMqtt() {
        try {
            mqttClient = new MqttClient(brokerUrl, clientId + "-" + System.currentTimeMillis(), new MemoryPersistence());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);
            options.setConnectionTimeout(5);
            mqttClient.setCallback(this);
            mqttClient.connect(options);
            mqttClient.subscribe(defaultTopic, 1);
            log.info("[MQTT-INGESTION] Connected to broker {} and subscribed to {}", brokerUrl, defaultTopic);
        } catch (MqttException e) {
            log.info("[MQTT-INGESTION] Broker {} not reachable yet. Built-in Wokwi Multi-Zone Simulator is ACTIVE.", brokerUrl);
        }
    }

    @Scheduled(fixedRate = 10000, initialDelay = 5000)
    public void ensureMqttConnection() {
        if (mqttClient == null || !mqttClient.isConnected()) {
            try {
                if (mqttClient == null) {
                    mqttClient = new MqttClient(brokerUrl, clientId + "-" + System.currentTimeMillis(), new MemoryPersistence());
                    mqttClient.setCallback(this);
                }
                MqttConnectOptions options = new MqttConnectOptions();
                options.setAutomaticReconnect(true);
                options.setCleanSession(true);
                options.setConnectionTimeout(5);
                mqttClient.connect(options);
                mqttClient.subscribe(defaultTopic, 1);
                log.info("[MQTT-INGESTION] Reconnected to broker {} and subscribed to {}", brokerUrl, defaultTopic);
            } catch (Exception e) {
                log.debug("[MQTT-INGESTION] Reconnect retry: {}", e.getMessage());
            }
        }
    }

    /**
     * BỘ PHÁT REAL-TIME TELEMETRY THỜI GIAN THỰC (Chu kỳ 2.5 giây khi xe đang chạy):
     * - Nếu phần cứng ESP32 Wokwi đang phát dữ liệu (lastRealTelemetryReceived < 4000ms), nhường quyền 100% cho phần cứng.
     * - Nếu phần cứng Wokwi đang khởi động hoặc chưa kịp phát, backend duy trì nhịp tim thời gian thực (Instant.now())
     *   đẩy đồng thời lên HiveMQ (smartchain/telemetry/{batchCode}) và Spring WebSocket (/topic/telemetry),
     *   đảm bảo biểu đồ luôn cập nhật mượt mà theo giờ hiện tại.
     */
    @Scheduled(fixedRate = 2500, initialDelay = 2000)
    public void autoStreamLiveTelemetryWhenTripActive() {
        if (activeBatchCode == null || "STANDBY".equalsIgnoreCase(activeBatchCode)) {
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastRealTelemetryReceived < 4000) {
            return;
        }

        SensorTelemetryDto dto = buildScenarioTelemetry(activeDemoScenario != null ? activeDemoScenario : "NORMAL");
        dto.setTimestamp(Instant.now());
        evaluateAndEnforceThresholds(dto);

        // Đẩy lên HiveMQ Broker để HiveMQ WebSocket Client nhận được ngay
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                String topic = "smartchain/telemetry/" + activeBatchCode;
                Map<String, Object> payloadMap = objectMapper.convertValue(dto, Map.class);
                payloadMap.put("source", "SIMULATED_HEARTBEAT");
                byte[] bytes = objectMapper.writeValueAsBytes(payloadMap);
                MqttMessage msg = new MqttMessage(bytes);
                msg.setQos(1);
                mqttClient.publish(topic, msg);
            }
        } catch (Exception ignored) {
        }
    }

    public SensorTelemetryDto triggerDemoScenarioNow(String scenarioMode) {
        this.activeDemoScenario = scenarioMode.toUpperCase();
        switch (this.activeDemoScenario) {
            case "DEMO2_VEG_CHILLING_INJURY":
                this.activeBatchCode = "LOT-VEG-2026-001";
                this.activeCategoryCode = "VEG_FRUIT";
                this.activeVehicleId = "49C-567.89";
                break;
            case "DEMO3_SEAFOOD_GAS":
                this.activeBatchCode = "LOT-FISH-2026-001";
                this.activeCategoryCode = "FRESH_SEAFOOD";
                this.activeVehicleId = "51D-998.12";
                break;
            case "DEMO4_FROZEN_DEFROST":
                this.activeBatchCode = "LOT-FROZEN-2026-001";
                this.activeCategoryCode = "DEEP_FROZEN";
                this.activeVehicleId = "51C-777.99";
                break;
            default:
                this.activeDemoScenario = "NORMAL";
                break;
        }
        SensorTelemetryDto dto = buildScenarioTelemetry(this.activeDemoScenario);
        evaluateAndEnforceThresholds(dto);
        return dto;
    }

    public Map<String, Object> syncDynamicProfileToEsp32(String batchCode, String categoryCode, String vehicleId, String deviceId) {
        return syncDynamicProfileToEsp32(batchCode, categoryCode, vehicleId, deviceId, null);
    }

    public Map<String, Object> syncDynamicProfileToEsp32(String batchCode, String categoryCode, String vehicleId, String deviceId, String productName) {
        this.activeBatchCode = batchCode;
        this.activeCategoryCode = categoryCode;
        this.activeVehicleId = vehicleId;
        this.routeProgress = 0.0; // Bắt đầu lại từ điểm xuất phát của tuyến đường
        if (productName != null && !productName.isBlank()) {
            this.activeProductName = toAsciiSafe(productName);
        }
        this.activeDemoScenario = "NORMAL";

        StorageProfile profile = profileRepository.findById(categoryCode)
                .orElse(new StorageProfile(categoryCode, categoryCode, 0.0, 4.0, 85.0, 95.0, "NH3", 25.0, 7));

        redisPolyglotService.cacheStorageProfile(profile);

        String devId = deviceId != null ? deviceId : "ESP32-MULTI-01";
        Map<String, Object> otaPayload = new LinkedHashMap<>();
        otaPayload.put("command", "SET_PROFILE");
        otaPayload.put("batch_code", batchCode);
        otaPayload.put("product_name", this.activeProductName != null ? this.activeProductName : "Thuc pham");
        otaPayload.put("category", categoryCode);
        otaPayload.put("min_temp", profile.getMinTemp());
        otaPayload.put("max_temp", profile.getMaxTemp());
        otaPayload.put("gas_type", profile.getGasType());
        otaPayload.put("max_gas", profile.getMaxGas());
        otaPayload.put("vehicle_id", vehicleId != null ? vehicleId : "49C-567.89");
        otaPayload.put("device_id", devId);

        String cmdTopic = "smartchain/device/" + devId + "/cmd";
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                byte[] bytes = objectMapper.writeValueAsBytes(otaPayload);
                MqttMessage cmdMsg = new MqttMessage(bytes);
                cmdMsg.setQos(1);
                mqttClient.publish(cmdTopic, cmdMsg);
                log.info("[MQTT] Published OTA profile for batch {}: {}", batchCode, new String(bytes, StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            log.warn("[MQTT] Failed to publish OTA profile: {}", e.getMessage());
        }

        messagingTemplate.convertAndSend("/topic/ota-sync", otaPayload);
        return otaPayload;
    }

    public void resetEsp32ToStandby(String deviceId) {
        this.activeBatchCode = null;
        this.activeCategoryCode = null;
        this.activeProductName = null;
        this.activeVehicleId = null;
        this.routeProgress = 0.0;
        String devId = deviceId != null ? deviceId : "ESP32-MULTI-01";
        Map<String, Object> standbyPayload = Map.of(
                "command", "END_TRIP",
                "action", "STANDBY",
                "device_id", devId
        );
        String cmdTopic = "smartchain/device/" + devId + "/cmd";
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                byte[] bytes = objectMapper.writeValueAsBytes(standbyPayload);
                MqttMessage cmdMsg = new MqttMessage(bytes);
                cmdMsg.setQos(1);
                mqttClient.publish(cmdTopic, cmdMsg);
                log.info("[MQTT] Reset ESP32 {} to STANDBY mode.", devId);
            }
        } catch (Exception e) {
            log.warn("[MQTT] Failed to send STANDBY command: {}", e.getMessage());
        }
        messagingTemplate.convertAndSend("/topic/ota-sync", standbyPayload);
    }

    private SensorTelemetryDto buildScenarioTelemetry(String scenario) {
        SensorTelemetryDto dto = new SensorTelemetryDto();
        dto.setDeviceId("ESP32-MULTI-01");
        dto.setVehicleId(activeVehicleId);
        dto.setBatchCode(activeBatchCode);
        dto.setCategoryCode(activeCategoryCode);
        dto.setTimestamp(Instant.now());

        double[] pos = calculateRoutePosition();
        dto.setLatitude(pos[0]);
        dto.setLongitude(pos[1]);

        double jitter = (Math.random() - 0.5) * 0.4;

        switch (scenario) {
            case "DEMO2_VEG_CHILLING_INJURY":
                // Kịch bản 2: Rau củ quả bị hạ nhiệt xuống 3.0°C (< 8°C) -> Tổn thương lạnh (Chilling Injury)
                dto.setTemperature(Math.round((3.0 + jitter * 0.3) * 10.0) / 10.0);
                dto.setHumidity(88.5);
                dto.setGasType("C2H4");
                dto.setGasPpm(16.0);
                dto.setDoorOpen(false);
                break;

            case "DEMO3_SEAFOOD_GAS":
                // Kịch bản 3: Thủy hải sản phát sinh khí TMA = 42.5 ppm (> 25 ppm) + Nhiệt tăng 5.8°C
                dto.setTemperature(Math.round((5.8 + jitter) * 10.0) / 10.0);
                dto.setHumidity(91.0);
                dto.setGasType("TMA");
                dto.setGasPpm(42.5);
                dto.setDoorOpen(false);
                break;

            case "DEMO4_FROZEN_DEFROST":
                // Kịch bản 4: Hàng Đông lạnh sâu bị mở cửa container -> Nhiệt tăng lên -10.0°C (> -18°C)
                dto.setTemperature(Math.round((-10.0 + jitter) * 10.0) / 10.0);
                dto.setHumidity(82.0);
                dto.setGasType("NONE");
                dto.setGasPpm(0.0);
                dto.setDoorOpen(true);
                break;

            default:
                StorageProfile profile = profileRepository.findById(activeCategoryCode).orElse(null);
                if (profile != null) {
                    double midTemp = (profile.getMinTemp() + profile.getMaxTemp()) / 2.0;
                    double midHum = (profile.getMinHumidity() + profile.getMaxHumidity()) / 2.0;
                    dto.setTemperature(Math.round((midTemp + jitter) * 10.0) / 10.0);
                    dto.setHumidity(Math.round((midHum + jitter * 2) * 10.0) / 10.0);
                    dto.setGasType(profile.getGasType());
                    dto.setGasPpm("NONE".equalsIgnoreCase(profile.getGasType()) ? 0.0 : 11.4);
                } else {
                    dto.setTemperature(9.5);
                    dto.setHumidity(89.0);
                    dto.setGasType("C2H4");
                    dto.setGasPpm(11.4);
                }
                dto.setDoorOpen(false);
                break;
        }
        return dto;
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.warn("[MQTT] Connection lost: {}", cause.getMessage());
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        try {
            String jsonPayload = new String(message.getPayload(), StandardCharsets.UTF_8);
            if (jsonPayload.contains("\"source\":\"SIMULATED_HEARTBEAT\"") || jsonPayload.contains("\"source\": \"SIMULATED_HEARTBEAT\"")) {
                return; // Bỏ qua gói tin heartbeat do backend phát, giữ quyền ưu tiên tuyệt đối cho ESP32 Wokwi thật
            }
            log.info("[MQTT Inbound Real ESP32] Topic: {} -> Payload: {}", topic, jsonPayload);
            SensorTelemetryDto telemetry = objectMapper.readValue(jsonPayload, SensorTelemetryDto.class);
            lastRealTelemetryReceived = System.currentTimeMillis();

            // Nếu thiết bị đang ở chế độ STANDBY (chờ lệnh từ Web), không đưa vào pipeline xử lý lô hàng
            if (telemetry == null || "STANDBY".equalsIgnoreCase(telemetry.getBatchCode())) {
                log.debug("[MQTT] ESP32 in STANDBY mode, awaiting trip start.");
                return;
            }

            // Nếu thiết bị Wokwi chưa kịp cập nhật sang mã lô đang chạy (activeBatchCode), tự động đồng bộ lại xuống ESP32
            if (activeBatchCode != null && !activeBatchCode.equalsIgnoreCase(telemetry.getBatchCode())) {
                long now = System.currentTimeMillis();
                if (now - lastOtaSyncSentTime > 5000) {
                    lastOtaSyncSentTime = now;
                    syncDynamicProfileToEsp32(activeBatchCode, activeCategoryCode, activeVehicleId, "ESP32-MULTI-01", activeProductName);
                }
                telemetry.setBatchCode(activeBatchCode);
                telemetry.setCategoryCode(activeCategoryCode);
            }
            if (telemetry.getVehicleId() == null || telemetry.getVehicleId().isBlank()) {
                telemetry.setVehicleId(activeVehicleId);
            }
            double[] pos = calculateRoutePosition();
            telemetry.setLatitude(pos[0]);
            telemetry.setLongitude(pos[1]);

            evaluateAndEnforceThresholds(telemetry);
        } catch (Exception e) {
            log.error("[MQTT] Failed to parse incoming telemetry: {}", e.getMessage());
        }
    }

    public void evaluateAndEnforceThresholds(SensorTelemetryDto dto) {
        String catCode = dto.getCategoryCode() != null ? dto.getCategoryCode().toUpperCase() : "VEG_FRUIT";
        Optional<StorageProfile> profileOpt = profileRepository.findById(catCode);

        if (profileOpt.isPresent()) {
            StorageProfile profile = profileOpt.get();
            boolean tempHigh = dto.getTemperature() != null && dto.getTemperature() > profile.getMaxTemp();
            boolean tempLow = dto.getTemperature() != null && dto.getTemperature() < profile.getMinTemp();
            boolean gasHigh = dto.getGasPpm() != null && profile.getMaxGas() != null
                    && !"NONE".equalsIgnoreCase(profile.getGasType())
                    && dto.getGasPpm() > profile.getMaxGas();
            boolean doorOpen = Boolean.TRUE.equals(dto.getDoorOpen());

            // Phân loại chính xác loại vi phạm và kích hoạt dàn lạnh dự phòng (Relay Cooling)
            // khi nhiệt độ vượt trần đối với hàng lạnh (không áp dụng cho DELI_HOT hoặc Chilling Injury của VEG_FRUIT)
            // hoặc khi nồng độ khí phân hủy vượt ngưỡng.
            if (tempHigh || tempLow || gasHigh || doorOpen) {
                String breachType = "THRESHOLD_BREACH";
                if (tempLow && "VEG_FRUIT".equalsIgnoreCase(catCode)) {
                    breachType = "CHILLING_INJURY_RISK (Tổn thương lạnh Rau củ < 8°C)";
                } else if (tempHigh && "DEEP_FROZEN".equalsIgnoreCase(catCode)) {
                    breachType = "DEFROST_HAZARD (Nguy cơ rã đông > -18°C)";
                } else if (tempLow && "DELI_HOT".equalsIgnoreCase(catCode)) {
                    breachType = "BACTERIAL_GROWTH_ZONE (Thực phẩm nóng < 60°C)";
                } else if (gasHigh) {
                    breachType = "SPOILAGE_GAS_BREACH (" + profile.getGasType() + " > " + profile.getMaxGas() + " ppm)";
                } else if (tempHigh) {
                    breachType = "HIGH_TEMP_BREACH (> " + profile.getMaxTemp() + "°C)";
                } else if (doorOpen) {
                    breachType = "CONTAINER_DOOR_OPEN (Mở cửa thùng lạnh)";
                }
                dto.setAlertTriggered(breachType);
                dto.setIsBreached(true);

                boolean shouldAutoCool = (!"DELI_HOT".equalsIgnoreCase(catCode) && tempHigh) || gasHigh;
                dto.setRelayCooling(manualRelayOverride || shouldAutoCool);
                if (shouldAutoCool) {
                    sendDownlinkCommand(dto.getDeviceId() != null ? dto.getDeviceId() : "ESP32-MULTI-01", "{\"action\": \"RELAY_ON\"}");
                }

                // Tăng điểm rủi ro vào Redis Sorted Set theo danh mục (Mục 2.3 & 6.3)
                redisPolyglotService.incrementRiskScore(catCode, dto.getBatchCode(), 10.0);

                Map<String, Object> alertMsg = new LinkedHashMap<>();
                alertMsg.put("batchCode", dto.getBatchCode());
                alertMsg.put("deviceId", dto.getDeviceId());
                alertMsg.put("vehicleId", dto.getVehicleId());
                alertMsg.put("categoryCode", catCode);
                alertMsg.put("breachType", breachType);
                alertMsg.put("currentTemp", dto.getTemperature());
                alertMsg.put("allowedRange", profile.getMinTemp() + "°C .. " + profile.getMaxTemp() + "°C");
                alertMsg.put("currentGasPpm", dto.getGasPpm());
                alertMsg.put("gasLimitPpm", profile.getMaxGas());
                alertMsg.put("relayAutoActivated", dto.getRelayCooling());
                alertMsg.put("timestamp", Instant.now().toString());
                messagingTemplate.convertAndSend("/topic/alerts", alertMsg);
            } else {
                dto.setAlertTriggered("NORMAL");
                dto.setIsBreached(false);
                dto.setRelayCooling(manualRelayOverride);
            }
        }

        // Cập nhật Redis key telemetry:latest:{batchCode} (TTL 30s) theo chuẩn Mục 2.3 & 7.3
        try {
            redisPolyglotService.cacheLatestTelemetry(dto.getBatchCode(), objectMapper.writeValueAsString(dto));
        } catch (Exception ignored) {
        }

        // Lưu vào Cassandra Wide-Column Time-Series
        cassandraTelemetryService.appendTelemetryRow(dto);

        // Đẩy Real-time WebSocket xuống React Dashboard
        messagingTemplate.convertAndSend("/topic/telemetry", dto);
    }

    public void sendDownlinkCommand(String deviceId, String commandJson) {
        if (commandJson != null && commandJson.contains("RELAY_ON")) {
            this.manualRelayOverride = true;
        } else if (commandJson != null && commandJson.contains("RELAY_OFF")) {
            this.manualRelayOverride = false;
        }
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                String cmdTopic = "smartchain/device/" + deviceId + "/cmd";
                MqttMessage msg = new MqttMessage(commandJson.getBytes(StandardCharsets.UTF_8));
                msg.setQos(1);
                mqttClient.publish(cmdTopic, msg);
            }
        } catch (MqttException e) {
            log.debug("[MQTT-DOWNLINK] Simulated downlink to {}: {}", deviceId, commandJson);
        }
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
    }

    @PreDestroy
    public void disconnect() {
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                mqttClient.disconnect();
            }
        } catch (MqttException ignored) {
        }
    }
}
