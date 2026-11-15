package com.smartchain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class FoodBatchDocument {

    public static class ItemQrSerial {
        private String serialCode;
        private String batchCode;
        private Double weightKg;
        private Double price;
        private String status;
        private Instant soldAt;

        public ItemQrSerial() {
        }

        public ItemQrSerial(String serialCode, String batchCode, Double weightKg, Double price, String status) {
            this.serialCode = serialCode;
            this.batchCode = batchCode;
            this.weightKg = weightKg;
            this.price = price;
            this.status = status;
        }

        public String getSerialCode() {
            return serialCode;
        }

        public void setSerialCode(String serialCode) {
            this.serialCode = serialCode;
        }

        public String getBatchCode() {
            return batchCode;
        }

        public void setBatchCode(String batchCode) {
            this.batchCode = batchCode;
        }

        public Double getWeightKg() {
            return weightKg;
        }

        public void setWeightKg(Double weightKg) {
            this.weightKg = weightKg;
        }

        public Double getPrice() {
            return price;
        }

        public void setPrice(Double price) {
            this.price = price;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Instant getSoldAt() {
            return soldAt;
        }

        public void setSoldAt(Instant soldAt) {
            this.soldAt = soldAt;
        }

        private int scanCount = 0;
        private Instant lastScannedAt;

        public int getScanCount() {
            return scanCount;
        }

        public void setScanCount(int scanCount) {
            this.scanCount = scanCount;
        }

        public Instant getLastScannedAt() {
            return lastScannedAt;
        }

        public void setLastScannedAt(Instant lastScannedAt) {
            this.lastScannedAt = lastScannedAt;
        }
    }

    private String id;
    private String batchCode;
    private String batchQrCode;
    private String productName;
    private String category;
    private String farmName;
    private Instant harvestDate = Instant.now();
    private String status = "CREATED";
    private Integer unitCount = 100;
    private Double unitWeightKg = 0.5;
    private Double unitPrice = 45000.0;
    private Integer packageCount = 50;
    private Double weightPerPackageKg = 10.0;
    private String packageUnit = "Thùng carton tiêu chuẩn";
    private Integer unitsPerPackage = 20;
    private Double totalWeightKg = 500.0;
    private List<String> standards = new ArrayList<>();
    private List<Map<String, Object>> certifications = new ArrayList<>();
    private Map<String, Object> cultivationDetails = new LinkedHashMap<>();
    private Map<String, Object> dynamicAttributes = new LinkedHashMap<>();
    private Map<String, Object> transportJourney = new LinkedHashMap<>();
    private Map<String, Object> qcInspection = new LinkedHashMap<>();
    private List<ItemQrSerial> itemQrSerials = new ArrayList<>();
    private List<Map<String, Object>> scanHistory = new ArrayList<>();
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

    @JsonProperty("batch_code")
    public String getBatchCodeSnake() {
        return batchCode;
    }

    public String getBatchQrCode() {
        return batchQrCode;
    }

    public void setBatchQrCode(String batchQrCode) {
        this.batchQrCode = batchQrCode;
    }

    @JsonProperty("batch_qr_code")
    public String getBatchQrCodeSnake() {
        return batchQrCode;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    @JsonProperty("product_name")
    public String getProductNameSnake() {
        return productName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getFarmName() {
        return farmName;
    }

    public void setFarmName(String farmName) {
        this.farmName = farmName;
    }

    @JsonProperty("farm_name")
    public String getFarmNameSnake() {
        return farmName;
    }

    public Instant getHarvestDate() {
        return harvestDate;
    }

    public void setHarvestDate(Instant harvestDate) {
        this.harvestDate = harvestDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getUnitCount() {
        return unitCount;
    }

    public void setUnitCount(Integer unitCount) {
        this.unitCount = unitCount;
    }

    @JsonProperty("unit_count")
    public Integer getUnitCountSnake() {
        return unitCount;
    }

    public Double getUnitWeightKg() {
        return unitWeightKg;
    }

    public void setUnitWeightKg(Double unitWeightKg) {
        this.unitWeightKg = unitWeightKg;
    }

    @JsonProperty("unit_weight_kg")
    public Double getUnitWeightKgSnake() {
        return unitWeightKg;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }

    @JsonProperty("unit_price")
    public Double getUnitPriceSnake() {
        return unitPrice;
    }

    public Integer getPackageCount() {
        return packageCount;
    }

    public void setPackageCount(Integer packageCount) {
        this.packageCount = packageCount;
    }

    @JsonProperty("package_count")
    public Integer getPackageCountSnake() {
        return packageCount;
    }

    public Double getWeightPerPackageKg() {
        return weightPerPackageKg;
    }

    public void setWeightPerPackageKg(Double weightPerPackageKg) {
        this.weightPerPackageKg = weightPerPackageKg;
    }

    @JsonProperty("weight_per_package_kg")
    public Double getWeightPerPackageKgSnake() {
        return weightPerPackageKg;
    }

    public String getPackageUnit() {
        return packageUnit;
    }

    public void setPackageUnit(String packageUnit) {
        this.packageUnit = packageUnit;
    }

    @JsonProperty("package_unit")
    public String getPackageUnitSnake() {
        return packageUnit;
    }

    public Integer getUnitsPerPackage() {
        return unitsPerPackage;
    }

    public void setUnitsPerPackage(Integer unitsPerPackage) {
        this.unitsPerPackage = unitsPerPackage;
    }

    @JsonProperty("units_per_package")
    public Integer getUnitsPerPackageSnake() {
        return unitsPerPackage;
    }

    public Double getTotalWeightKg() {
        if (totalWeightKg != null && totalWeightKg > 0) return totalWeightKg;
        if (packageCount != null && weightPerPackageKg != null) return packageCount * weightPerPackageKg;
        if (unitCount != null && unitWeightKg != null) return unitCount * unitWeightKg;
        return 500.0;
    }

    public void setTotalWeightKg(Double totalWeightKg) {
        this.totalWeightKg = totalWeightKg;
    }

    @JsonProperty("total_weight_kg")
    public Double getTotalWeightKgSnake() {
        return getTotalWeightKg();
    }

    @JsonProperty("weight_kg")
    public Double getWeightKgSnake() {
        return getTotalWeightKg();
    }

    public List<String> getStandards() {
        return standards;
    }

    public void setStandards(List<String> standards) {
        this.standards = standards;
    }

    public List<Map<String, Object>> getCertifications() {
        return certifications;
    }

    public void setCertifications(List<Map<String, Object>> certifications) {
        this.certifications = certifications;
    }

    public Map<String, Object> getCultivationDetails() {
        return cultivationDetails;
    }

    public void setCultivationDetails(Map<String, Object> cultivationDetails) {
        this.cultivationDetails = cultivationDetails;
    }

    @JsonProperty("cultivation_details")
    public Map<String, Object> getCultivationDetailsSnake() {
        return cultivationDetails;
    }

    public Map<String, Object> getDynamicAttributes() {
        return dynamicAttributes;
    }

    public void setDynamicAttributes(Map<String, Object> dynamicAttributes) {
        this.dynamicAttributes = dynamicAttributes;
    }

    @JsonProperty("dynamic_attributes")
    public Map<String, Object> getDynamicAttributesSnake() {
        return dynamicAttributes;
    }

    public Map<String, Object> getTransportJourney() {
        return transportJourney;
    }

    public void setTransportJourney(Map<String, Object> transportJourney) {
        this.transportJourney = transportJourney;
    }

    public Map<String, Object> getQcInspection() {
        return qcInspection;
    }

    public void setQcInspection(Map<String, Object> qcInspection) {
        this.qcInspection = qcInspection;
    }

    public List<ItemQrSerial> getItemQrSerials() {
        return itemQrSerials;
    }

    public void setItemQrSerials(List<ItemQrSerial> itemQrSerials) {
        this.itemQrSerials = itemQrSerials;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<Map<String, Object>> getScanHistory() {
        if (scanHistory == null) {
            scanHistory = new ArrayList<>();
        }
        return scanHistory;
    }

    public void setScanHistory(List<Map<String, Object>> scanHistory) {
        this.scanHistory = scanHistory;
    }
}

