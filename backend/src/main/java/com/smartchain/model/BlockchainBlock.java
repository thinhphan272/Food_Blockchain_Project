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
        if (dataPayload != null && dataPayload.containsKey("reason")) {
            return String.valueOf(dataPayload.get("reason"));
        }
        switch (eventType != null ? eventType : "") {
            case "GENESIS_BATCH_CREATED":
                return "Khai báo nguồn gốc lô hàng tại nông trại, niêm phong nguồn gốc và đúc khối Genesis #0.";
            case "COLD_CHAIN_IOT_SYNCED":
            case "OTA_PROFILE_SYNCED_TO_TRUCK":
                return "Bàn giao vận chuyển và đồng bộ quy chuẩn vi khí hậu xuống xe lạnh.";
            case "INBOUND_QC_SMART_CONTRACT_APPROVED":
                return "Đối soát vi khí hậu Merkle Root, đánh giá độ tươi TTI và ký số Smart Contract nhận hàng.";
            case "SHELF_STOCKED_FEFO_ACTIVE":
                return "Nhập kệ hàng thông minh, phân bổ vị trí theo hạn dùng thực tế FEFO.";
            case "POS_ITEM_SOLD_SEAL_VOID":
                return "Thanh toán POS, kích hoạt khóa phân tán Redlock và hủy tem niêm phong.";
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

