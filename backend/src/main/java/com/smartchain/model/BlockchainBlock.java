package com.smartchain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public class BlockchainBlock {

    private String id;
    private int index;
    private String batchCode;
    private String eventType;
    private String actor;
    private String actorRole;
    private Map<String, Object> dataPayload = new LinkedHashMap<>();
    private String merkleRoot;
    private String previousHash;
    private String currentHash;
    private String digitalSignature;
    private Long nonce = 1024L;
    private Instant timestamp = Instant.now();

    public BlockchainBlock() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    @JsonProperty("block_index")
    public int getBlockIndex() {
        return index;
    }

    public String getBatchCode() {
        return batchCode;
    }

    public void setBatchCode(String batchCode) {
        this.batchCode = batchCode;
    }

    @JsonProperty("batch_code")
    public String getBatchCodeSnake() {
        return batchCode;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    @JsonProperty("event_type")
    public String getEventTypeSnake() {
        return eventType;
    }

    public String getActor() {
        return actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    @JsonProperty("actor_role")
    public String getActorRoleSnake() {
        return actorRole != null ? actorRole : "PRODUCER";
    }

    @JsonProperty("details")
    public String getDetails() {
        if (dataPayload != null && dataPayload.containsKey("description")) {
            return String.valueOf(dataPayload.get("description"));
        }
        if (dataPayload != null && dataPayload.containsKey("message")) {
            return String.valueOf(dataPayload.get("message"));
        }
        if (dataPayload != null && dataPayload.containsKey("reason")) {
            return "Lý do: " + String.valueOf(dataPayload.get("reason"));
        }
        switch (eventType != null ? eventType : "") {
            case "GENESIS_BATCH_CREATED":
                return "Khai báo nguồn gốc lô hàng tại nông trại, niêm phong nguồn gốc và đúc khối Genesis #0.";
            case "DRIVER_DEPARTED_IN_TRANSIT":
                return "Tài xế tiếp nhận lô hàng, niêm phong thùng xe và khởi hành vận chuyển trên tuyến đường lạnh.";
            case "TRUCK_ARRIVED_AT_SUPERMARKET":
                return "Xe tải lạnh cập bến an toàn tại cổng tiếp nhận siêu thị Co.opmart, chuyển giao cho KCS kiểm định.";
            case "COLD_CHAIN_IOT_SYNCED":
            case "OTA_PROFILE_SYNCED_TO_TRUCK":
                return "Đồng bộ ngưỡng nhiệt độ và cấu hình cảm biến IoT xuống thùng xe lạnh.";
            case "INBOUND_QC_SMART_CONTRACT_APPROVED":
                return "Kiểm định viên KCS nghiệm thu đạt chuẩn độ tươi TTI và ký hợp đồng thông minh tiếp nhận.";
            case "INBOUND_QC_SMART_CONTRACT_REJECTED":
                return "Kiểm định viên KCS từ chối tiếp nhận do phát hiện suy giảm chất lượng / vi phạm chuỗi lạnh.";
            case "SHELF_STOCKED_FEFO_ACTIVE":
                return "Phân bổ lô hàng lên quầy kệ thông minh theo nguyên tắc hết hạn trước xuất trước (FEFO).";
            case "POS_ITEM_SOLD_SEAL_VOID":
                return "Khách hàng quét mã mua lẻ tại quầy thu ngân, hệ thống xác thực thanh toán và hủy niêm phong tem QR.";
            case "EMERGENCY_RECALL_ISSUED":
                return "Ban hành lệnh thu hồi khẩn cấp: Vô hiệu hóa toàn bộ mã QR của lô hàng trên toàn hệ thống.";
            case "UNAUTHORIZED_DOOR_OPEN_BREACH":
                return "Cảnh báo vi phạm an ninh: Cửa thùng xe mở trái phép khi đang di chuyển trên đường.";
            case "CONFIRM_RECALL_ACCEPTED":
                return "Nông trại xác nhận lệnh thu hồi lô hàng và tiến hành xử lý tiêu hủy / thu hồi tại gốc.";
            default:
                return "Ghi nhận sự kiện chuỗi cung ứng vào sổ cái bất biến.";
        }
    }

    public Map<String, Object> getDataPayload() {
        return dataPayload;
    }

    public void setDataPayload(Map<String, Object> dataPayload) {
        this.dataPayload = dataPayload;
    }

    @JsonProperty("payload")
    public Map<String, Object> getPayload() {
        return dataPayload;
    }

    public String getMerkleRoot() {
        return merkleRoot;
    }

    public void setMerkleRoot(String merkleRoot) {
        this.merkleRoot = merkleRoot;
    }

    @JsonProperty("merkle_root")
    public String getMerkleRootSnake() {
        return merkleRoot;
    }

    public String getPreviousHash() {
        return previousHash;
    }

    public void setPreviousHash(String previousHash) {
        this.previousHash = previousHash;
    }

    @JsonProperty("previous_hash")
    public String getPreviousHashSnake() {
        return previousHash;
    }

    public String getCurrentHash() {
        return currentHash;
    }

    public void setCurrentHash(String currentHash) {
        this.currentHash = currentHash;
    }

    @JsonProperty("current_hash")
    public String getCurrentHashSnake() {
        return currentHash;
    }

    public String getDigitalSignature() {
        return digitalSignature;
    }

    public void setDigitalSignature(String digitalSignature) {
        this.digitalSignature = digitalSignature;
    }

    @JsonProperty("digital_signature")
    public String getDigitalSignatureSnake() {
        return digitalSignature;
    }

    public Long getNonce() {
        return nonce;
    }

    public void setNonce(Long nonce) {
        this.nonce = nonce;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}

