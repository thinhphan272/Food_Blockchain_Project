package com.smartchain.document;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Document(collection = "blockchain_ledger")
public class BlockchainBlockDocument {

    @Id
    private String id;

    @Field("index")
    private Integer index;

    @Field("timestamp")
    private Instant timestamp = Instant.now();

    @Indexed
    @Field("batch_code")
    @JsonProperty("batch_code")
    private String batchCode;

    @Field("category")
    private String category;

    @Field("event_type")
    @JsonProperty("event_type")
    private String eventType;

    @Field("actor")
    private String actor;

    @Field("payload")
    private Map<String, Object> payload = new HashMap<>();

    @Field("merkle_root")
    @JsonProperty("merkle_root")
    private String merkleRoot;

    @Field("previous_hash")
    @JsonProperty("previous_hash")
    private String previousHash;

    @Indexed(unique = true)
    @Field("current_hash")
    @JsonProperty("current_hash")
    private String currentHash;

    @Field("digital_signature")
    @JsonProperty("digital_signature")
    private String digitalSignature;

    public BlockchainBlockDocument() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getIndex() {
        return index;
    }

    public void setIndex(Integer index) {
        this.index = index;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getBatchCode() {
        return batchCode;
    }

    public void setBatchCode(String batchCode) {
        this.batchCode = batchCode;
    }

    @JsonProperty("batchCode")
    public String getBatchCodeCamel() {
        return batchCode;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    @JsonProperty("eventType")
    public String getEventTypeCamel() {
        return eventType;
    }

    public String getActor() {
        return actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    public void setPayload(Map<String, Object> payload) {
        this.payload = payload;
    }

    public String getMerkleRoot() {
        return merkleRoot;
    }

    public void setMerkleRoot(String merkleRoot) {
        this.merkleRoot = merkleRoot;
    }

    @JsonProperty("merkleRoot")
    public String getMerkleRootCamel() {
        return merkleRoot;
    }

    public String getPreviousHash() {
        return previousHash;
    }

    public void setPreviousHash(String previousHash) {
        this.previousHash = previousHash;
    }

    @JsonProperty("previousHash")
    public String getPreviousHashCamel() {
        return previousHash;
    }

    public String getCurrentHash() {
        return currentHash;
    }

    public void setCurrentHash(String currentHash) {
        this.currentHash = currentHash;
    }

    @JsonProperty("currentHash")
    public String getCurrentHashCamel() {
        return currentHash;
    }

    public String getDigitalSignature() {
        return digitalSignature;
    }

    public void setDigitalSignature(String digitalSignature) {
        this.digitalSignature = digitalSignature;
    }

    @JsonProperty("digitalSignature")
    public String getDigitalSignatureCamel() {
        return digitalSignature;
    }
}

