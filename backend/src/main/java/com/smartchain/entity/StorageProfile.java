package com.smartchain.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "storage_profiles")
public class StorageProfile {

    @Id
    @Column(name = "category_code", length = 30)
    @JsonProperty("categoryCode")
    @JsonAlias({"category_code"})
    private String categoryCode;

    @Column(name = "category_name", nullable = false, length = 100)
    @JsonProperty("categoryName")
    @JsonAlias({"category_name"})
    private String categoryName;

    @Column(name = "min_temp", nullable = false)
    @JsonProperty("minTemp")
    @JsonAlias({"min_temp"})
    private Double minTemp;

    @Column(name = "max_temp", nullable = false)
    @JsonProperty("maxTemp")
    @JsonAlias({"max_temp"})
    private Double maxTemp;

    @Column(name = "min_humidity", nullable = false)
    @JsonProperty("minHumidity")
    @JsonAlias({"min_humidity"})
    private Double minHumidity;

    @Column(name = "max_humidity", nullable = false)
    @JsonProperty("maxHumidity")
    @JsonAlias({"max_humidity"})
    private Double maxHumidity;

    @Column(name = "gas_type", length = 20)
    @JsonProperty("gasType")
    @JsonAlias({"gas_type", "gasSensorType"})
    private String gasType;

    @Column(name = "max_gas")
    @JsonProperty("maxGas")
    @JsonAlias({"max_gas", "maxGasPpm"})
    private Double maxGas;

    @Column(name = "shelf_life_days")
    @JsonProperty("shelfLifeDays")
    @JsonAlias({"shelf_life_days", "maxAllowedMinutesOut"})
    private Integer shelfLifeDays = 7;

    @Column(name = "base_shelf_life_hours")
    @JsonProperty("baseShelfLifeHours")
    @JsonAlias({"base_shelf_life_hours"})
    private Integer baseShelfLifeHours = 168;

    @Column(name = "arrhenius_activation_energy")
    @JsonProperty("arrheniusActivationEnergy")
    @JsonAlias({"arrhenius_activation_energy", "activationEnergy"})
    private Double arrheniusActivationEnergy = 65.5;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public StorageProfile() {
    }

    public StorageProfile(String categoryCode, String categoryName, Double minTemp, Double maxTemp,
                          Double minHumidity, Double maxHumidity, String gasType, Double maxGas,
                          Integer shelfLifeDays) {
        this.categoryCode = categoryCode;
        this.categoryName = categoryName;
        this.minTemp = minTemp;
        this.maxTemp = maxTemp;
        this.minHumidity = minHumidity;
        this.maxHumidity = maxHumidity;
        this.gasType = gasType;
        this.maxGas = maxGas;
        this.shelfLifeDays = shelfLifeDays;
        this.baseShelfLifeHours = (shelfLifeDays != null) ? shelfLifeDays * 24 : 168;
        this.updatedAt = LocalDateTime.now();
    }

    public StorageProfile(String categoryCode, String categoryName, Double minTemp, Double maxTemp,
                          Double minHumidity, Double maxHumidity, String gasType, Double maxGas,
                          Integer baseShelfLifeHours, Double arrheniusActivationEnergy) {
        this.categoryCode = categoryCode;
        this.categoryName = categoryName;
        this.minTemp = minTemp;
        this.maxTemp = maxTemp;
        this.minHumidity = minHumidity;
        this.maxHumidity = maxHumidity;
        this.gasType = gasType;
        this.maxGas = maxGas;
        this.baseShelfLifeHours = baseShelfLifeHours;
        this.shelfLifeDays = (baseShelfLifeHours != null) ? baseShelfLifeHours / 24 : 7;
        this.arrheniusActivationEnergy = arrheniusActivationEnergy;
        this.updatedAt = LocalDateTime.now();
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public void setCategoryCode(String categoryCode) {
        this.categoryCode = categoryCode;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public Double getMinTemp() {
        return minTemp;
    }

    public void setMinTemp(Double minTemp) {
        this.minTemp = minTemp;
    }

    public Double getMaxTemp() {
        return maxTemp;
    }

    public void setMaxTemp(Double maxTemp) {
        this.maxTemp = maxTemp;
    }

    public Double getMinHumidity() {
        return minHumidity;
    }

    public void setMinHumidity(Double minHumidity) {
        this.minHumidity = minHumidity;
    }

    public Double getMaxHumidity() {
        return maxHumidity;
    }

    public void setMaxHumidity(Double maxHumidity) {
        this.maxHumidity = maxHumidity;
    }

    public String getGasType() {
        return gasType;
    }

    public void setGasType(String gasType) {
        this.gasType = gasType;
    }

    public Double getMaxGas() {
        return maxGas;
    }

    public void setMaxGas(Double maxGas) {
        this.maxGas = maxGas;
    }

    public Integer getShelfLifeDays() {
        if (shelfLifeDays != null) return shelfLifeDays;
        return (baseShelfLifeHours != null) ? baseShelfLifeHours / 24 : 7;
    }

    public void setShelfLifeDays(Integer shelfLifeDays) {
        this.shelfLifeDays = shelfLifeDays;
        if (shelfLifeDays != null) {
            this.baseShelfLifeHours = shelfLifeDays * 24;
        }
    }

    public Integer getBaseShelfLifeHours() {
        if (baseShelfLifeHours != null) return baseShelfLifeHours;
        return (shelfLifeDays != null) ? shelfLifeDays * 24 : 168;
    }

    public void setBaseShelfLifeHours(Integer baseShelfLifeHours) {
        this.baseShelfLifeHours = baseShelfLifeHours;
        if (baseShelfLifeHours != null) {
            this.shelfLifeDays = baseShelfLifeHours / 24;
        }
    }

    public Double getArrheniusActivationEnergy() {
        return arrheniusActivationEnergy != null ? arrheniusActivationEnergy : 65.5;
    }

    public void setArrheniusActivationEnergy(Double arrheniusActivationEnergy) {
        this.arrheniusActivationEnergy = arrheniusActivationEnergy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
