package com.smartchain.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SensorTelemetryDto {

    @JsonProperty("device_id")
    @JsonAlias({"deviceId"})
    private String deviceId;

    @JsonProperty("vehicle_id")
    @JsonAlias({"vehicleId"})
    private String vehicleId;

    @JsonProperty("batch_code")
    @JsonAlias({"batchCode"})
    private String batchCode;

    @JsonProperty("category_code")
    @JsonAlias({"categoryCode", "category"})
    private String categoryCode;

    @JsonProperty("product_name")
    @JsonAlias({"productName"})
    private String productName;

    @JsonProperty("temperature")
    @JsonAlias({"temp"})
    private Double temperature;

    @JsonProperty("humidity")
    @JsonAlias({"hum"})
    private Double humidity;

    @JsonProperty("gas_type")
    @JsonAlias({"gasType"})
    private String gasType;

    @JsonProperty("gas_ppm")
    @JsonAlias({"gas", "gasPpm", "gas_value", "gasValue"})
    private Double gasPpm;

    @JsonProperty("weight_kg")
    @JsonAlias({"weightKg", "weight"})
    private Double weightKg;

    @JsonProperty("door_open")
    @JsonAlias({"doorOpen"})
    private Boolean doorOpen;

    @JsonProperty("relay_cooling")
    @JsonAlias({"relayCooling"})
    private Boolean relayCooling;

    @JsonProperty("is_breached")
    @JsonAlias({"isBreached", "breached"})
    private Boolean isBreached;

    @JsonProperty("alert_status")
    @JsonAlias({"alertTriggered", "alertStatus"})
    private String alertTriggered;

    @JsonProperty("latitude")
    @JsonAlias({"lat"})
    private Double latitude;

    @JsonProperty("longitude")
    @JsonAlias({"lng", "lon"})
    private Double longitude;

    @JsonProperty("recorded_at")
    @JsonAlias({"recordedAt", "timestamp"})
    private Instant timestamp = Instant.now();

    public SensorTelemetryDto() {
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public String getBatchCode() {
        return batchCode;
    }

    public void setBatchCode(String batchCode) {
        this.batchCode = batchCode;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public void setCategoryCode(String categoryCode) {
        this.categoryCode = categoryCode;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Double getTemperature() {
        return temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    @JsonProperty("temp")
    public Double getTemp() {
        return temperature;
    }

    public Double getHumidity() {
        return humidity;
    }

    public void setHumidity(Double humidity) {
        this.humidity = humidity;
    }

    @JsonProperty("hum")
    public Double getHum() {
        return humidity;
    }

    public String getGasType() {
        return gasType;
    }

    public void setGasType(String gasType) {
        this.gasType = gasType;
    }

    public Double getGasPpm() {
        return gasPpm;
    }

    public void setGasPpm(Double gasPpm) {
        this.gasPpm = gasPpm;
    }

    @JsonProperty("gas")
    public Double getGas() {
        return gasPpm;
    }

    @JsonProperty("gas_value")
    public Double getGasValue() {
        return gasPpm;
    }

    public void setGasValue(Double gasValue) {
        this.gasPpm = gasValue;
    }

    @JsonProperty("category")
    public String getCategory() {
        return categoryCode;
    }

    public void setCategory(String category) {
        this.categoryCode = category;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public Boolean getIsBreached() {
        return isBreached != null ? isBreached : (alertTriggered != null && !"NORMAL".equalsIgnoreCase(alertTriggered));
    }

    public void setIsBreached(Boolean isBreached) {
        this.isBreached = isBreached;
    }

    public Boolean getDoorOpen() {
        return doorOpen;
    }

    public void setDoorOpen(Boolean doorOpen) {
        this.doorOpen = doorOpen;
    }

    public Boolean getRelayCooling() {
        return relayCooling;
    }

    public void setRelayCooling(Boolean relayCooling) {
        this.relayCooling = relayCooling;
    }

    public String getAlertTriggered() {
        return alertTriggered;
    }

    public void setAlertTriggered(String alertTriggered) {
        this.alertTriggered = alertTriggered;
    }

    public Double getLatitude() {
        return latitude != null ? latitude : 11.4922;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude != null ? longitude : 107.8245;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Instant getTimestamp() {
        return timestamp != null ? timestamp : Instant.now();
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
