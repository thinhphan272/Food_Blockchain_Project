package com.smartchain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(name = "department", length = 50)
    private String department;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "identity_card", length = 30)
    private String identityCard;

    @Column(name = "assigned_entity", length = 100)
    private String assignedEntity;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public User() {
        this.userId = "U-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public User(String username, String passwordHash, String fullName, String department, Role role) {
        this.userId = "U-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.department = department;
        this.role = role;
        this.isActive = true;
        this.createdAt = Instant.now();
    }

    public User(String userId, String username, String passwordHash, String fullName, Role role, String department, Boolean isActive) {
        this.userId = userId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.role = role;
        this.department = department;
        this.isActive = isActive;
        this.createdAt = Instant.now();
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Integer getRoleId() {
        return role != null ? role.getRoleId() : null;
    }

    public String getRoleName() {
        return role != null ? role.getRoleName() : "CONSUMER";
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getIdentityCard() {
        return identityCard;
    }

    public void setIdentityCard(String identityCard) {
        this.identityCard = identityCard;
    }

    public String getAssignedEntity() {
        return assignedEntity;
    }

    public void setAssignedEntity(String assignedEntity) {
        this.assignedEntity = assignedEntity;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
