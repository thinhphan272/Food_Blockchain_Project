package com.smartchain.document;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "food_batches")
public class FoodBatchDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("batch_code")
    @JsonProperty("batch_code")
    private String batchCode;

    @Indexed
    @Field("category")
    @JsonProperty("category")
    private String category;

    @Field("product_name")
    @JsonProperty("product_name")
    private String productName;

    @Field("farm_name")
    @JsonProperty("farm_name")
    private String farmName;

    @Field("producer")
    @JsonProperty("producer")
    private Map<String, Object> producer = new HashMap<>();

    @Field("cultivation_details")
    @JsonProperty("cultivation_details")
    private Map<String, Object> cultivationDetails;

    @Field("fishery_details")
    @JsonProperty("fishery_details")
    private Map<String, Object> fisheryDetails;

    @Field("livestock_details")
    @JsonProperty("livestock_details")
    private Map<String, Object> livestockDetails;

    @Field("dairy_details")
    @JsonProperty("dairy_details")
    private Map<String, Object> dairyDetails;

    @Field("safety_tests")
    @JsonProperty("safety_tests")
    private Map<String, Object> safetyTests;

    @Field("certifications")
    @JsonProperty("certifications")
    private List<Map<String, Object>> certifications = new ArrayList<>();

    @Field("standards")
    @JsonProperty("standards")
    private List<String> standards = new ArrayList<>();

    @Field("unit_count")
    @JsonProperty("unit_count")
    private Integer unitCount = 100;

    @Field("unit_weight_kg")
    @JsonProperty("unit_weight_kg")
    private Double unitWeightKg = 0.5;

    @Field("unit_price")
    @JsonProperty("unit_price")
    private Double unitPrice = 45000.0;

    @Field("package_count")
    @JsonProperty("package_count")
    private Integer packageCount = 50;

    @Field("weight_per_package_kg")
    @JsonProperty("weight_per_package_kg")
    private Double weightPerPackageKg = 10.0;

    @Field("package_unit")
    @JsonProperty("package_unit")
    private String packageUnit = "Thùng carton tiêu chuẩn";

    @Field("units_per_package")
    @JsonProperty("units_per_package")
    private Integer unitsPerPackage = 20;

    @Field("total_weight_kg")
    @JsonProperty("total_weight_kg")
    private Double totalWeightKg = 500.0;

    @Field("status")
    @JsonProperty("status")
    private String status = "CREATED";

    @Field("vehicle_plate")
    @JsonProperty("vehicle_plate")
    private String vehiclePlate;

    @Field("device_id")
    @JsonProperty("device_id")
    private String deviceId;

    @Field("shelf_section")
    @JsonProperty("shelf_section")
    private String shelfSection;

    @Field("created_at")
    @JsonProperty("created_at")
    private Instant createdAt = Instant.now();

    public FoodBatchDocument() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    @JsonProperty("productName")
    public String getProductNameCamel() {
        return productName;
    }

    public String getFarmName() {
        return farmName;
    }

    public void setFarmName(String farmName) {
        this.farmName = farmName;
    }

    public Map<String, Object> getProducer() {
        return producer;
    }

    public void setProducer(Map<String, Object> producer) {
        this.producer = producer;
    }

    public Map<String, Object> getCultivationDetails() {
        return cultivationDetails;
    }

    public void setCultivationDetails(Map<String, Object> cultivationDetails) {
        this.cultivationDetails = cultivationDetails;
    }

    public Map<String, Object> getFisheryDetails() {
        return fisheryDetails;
    }

    public void setFisheryDetails(Map<String, Object> fisheryDetails) {
        this.fisheryDetails = fisheryDetails;
    }

    public Map<String, Object> getLivestockDetails() {
        return livestockDetails;
    }

    public void setLivestockDetails(Map<String, Object> livestockDetails) {
        this.livestockDetails = livestockDetails;
    }

    public Map<String, Object> getDairyDetails() {
        return dairyDetails;
    }

    public void setDairyDetails(Map<String, Object> dairyDetails) {
        this.dairyDetails = dairyDetails;
    }

    public Map<String, Object> getSafetyTests() {
        return safetyTests;
    }

    public void setSafetyTests(Map<String, Object> safetyTests) {
        this.safetyTests = safetyTests;
    }

    public List<Map<String, Object>> getCertifications() {
        return certifications;
    }

    public void setCertifications(List<Map<String, Object>> certifications) {
        this.certifications = certifications;
    }

    public List<String> getStandards() {
        return standards;
    }

    public void setStandards(List<String> standards) {
        this.standards = standards;
    }

    public Integer getUnitCount() {
        return unitCount;
    }

    public void setUnitCount(Integer unitCount) {
        this.unitCount = unitCount;
    }

    public Double getUnitWeightKg() {
        return unitWeightKg;
    }

    public void setUnitWeightKg(Double unitWeightKg) {
        this.unitWeightKg = unitWeightKg;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Integer getPackageCount() {
        return packageCount;
    }

    public void setPackageCount(Integer packageCount) {
        this.packageCount = packageCount;
    }

    public Double getWeightPerPackageKg() {
        return weightPerPackageKg;
    }

    public void setWeightPerPackageKg(Double weightPerPackageKg) {
        this.weightPerPackageKg = weightPerPackageKg;
    }

    public String getPackageUnit() {
        return packageUnit;
    }

    public void setPackageUnit(String packageUnit) {
        this.packageUnit = packageUnit;
    }

    public Integer getUnitsPerPackage() {
        return unitsPerPackage;
    }

    public void setUnitsPerPackage(Integer unitsPerPackage) {
        this.unitsPerPackage = unitsPerPackage;
    }

    public Double getTotalWeightKg() {
        if (totalWeightKg != null && totalWeightKg > 0) return totalWeightKg;
        if (packageCount != null && weightPerPackageKg != null) return packageCount * weightPerPackageKg;
        return 500.0;
    }

    public void setTotalWeightKg(Double totalWeightKg) {
        this.totalWeightKg = totalWeightKg;
    }

    @JsonProperty("weight_kg")
    public Double getWeightKg() {
        return getTotalWeightKg();
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVehiclePlate() {
        return vehiclePlate;
    }

    public void setVehiclePlate(String vehiclePlate) {
        this.vehiclePlate = vehiclePlate;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getShelfSection() {
        return shelfSection;
    }

    public void setShelfSection(String shelfSection) {
        this.shelfSection = shelfSection;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

