package com.smartchain.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @Column(name = "item_id", length = 36)
    private String itemId;

    @Column(name = "serial_code", nullable = false, unique = true, length = 100)
    private String serialCode;

    @Column(name = "batch_code", nullable = false, length = 50)
    private String batchCode;

    @Column(name = "category_code", nullable = false, length = 30)
    private String categoryCode;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "weight_kg", nullable = false)
    private Double weightKg;

    @Column(name = "price", nullable = false)
    private Double price;

    @Column(name = "status", length = 30)
    private String status = "PACKED";

    @Column(name = "cashier_id", length = 36)
    private String cashierId;

    @Column(name = "sold_at")
    private Instant soldAt;

    @Transient
    private String shelfSection;

    @Transient
    private Double remainingShelfLifeHours;

    public OrderItem() {
    }

    public OrderItem(String itemId, String serialCode, String batchCode, String categoryCode,
                     String productName, Double weightKg, Double price, String status) {
        this.itemId = itemId;
        this.serialCode = serialCode;
        this.batchCode = batchCode;
        this.categoryCode = categoryCode;
        this.productName = productName;
        this.weightKg = weightKg;
        this.price = price;
        this.status = status;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
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

    public String getCashierId() {
        return cashierId;
    }

    public void setCashierId(String cashierId) {
        this.cashierId = cashierId;
    }

    public Instant getSoldAt() {
        return soldAt;
    }

    public void setSoldAt(Instant soldAt) {
        this.soldAt = soldAt;
    }

    public String getShelfSection() {
        return shelfSection;
    }

    public void setShelfSection(String shelfSection) {
        this.shelfSection = shelfSection;
    }

    public Double getRemainingShelfLifeHours() {
        return remainingShelfLifeHours;
    }

    public void setRemainingShelfLifeHours(Double remainingShelfLifeHours) {
        this.remainingShelfLifeHours = remainingShelfLifeHours;
    }
}

