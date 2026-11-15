package com.smartchain.controller;

import com.smartchain.entity.StorageProfile;
import com.smartchain.repository.mysql.StorageProfileRepository;
import com.smartchain.service.RedisPolyglotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profiles")
@CrossOrigin(origins = "*")
public class StorageProfileController {

    private final StorageProfileRepository profileRepository;
    private final RedisPolyglotService redisPolyglotService;

    public StorageProfileController(StorageProfileRepository profileRepository,
                                    RedisPolyglotService redisPolyglotService) {
        this.profileRepository = profileRepository;
        this.redisPolyglotService = redisPolyglotService;
    }

    @GetMapping
    public ResponseEntity<List<StorageProfile>> getAllProfiles() {
        return ResponseEntity.ok(profileRepository.findAll());
    }

    @GetMapping("/{categoryCode}")
    public ResponseEntity<StorageProfile> getProfileByCode(@PathVariable String categoryCode) {
        return profileRepository.findById(categoryCode.toUpperCase())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<StorageProfile> createProfile(@RequestBody StorageProfile newProfile) {
        if (newProfile.getCategoryCode() == null || newProfile.getCategoryCode().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        newProfile.setCategoryCode(newProfile.getCategoryCode().trim().toUpperCase());
        if (newProfile.getShelfLifeDays() == null) {
            newProfile.setShelfLifeDays(7);
        }
        newProfile.setUpdatedAt(LocalDateTime.now());
        StorageProfile saved = profileRepository.save(newProfile);
        redisPolyglotService.cacheStorageProfile(saved);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{categoryCode}")
    public ResponseEntity<StorageProfile> updateProfile(@PathVariable String categoryCode,
                                                        @RequestBody StorageProfile updated) {
        return profileRepository.findById(categoryCode.toUpperCase())
                .map(existing -> {
                    if (updated.getCategoryName() != null) {
                        existing.setCategoryName(updated.getCategoryName());
                    }
                    if (updated.getMinTemp() != null) {
                        existing.setMinTemp(updated.getMinTemp());
                    }
                    if (updated.getMaxTemp() != null) {
                        existing.setMaxTemp(updated.getMaxTemp());
                    }
                    if (updated.getMinHumidity() != null) {
                        existing.setMinHumidity(updated.getMinHumidity());
                    }
                    if (updated.getMaxHumidity() != null) {
                        existing.setMaxHumidity(updated.getMaxHumidity());
                    }
                    if (updated.getGasType() != null) {
                        existing.setGasType(updated.getGasType());
                    }
                    if (updated.getMaxGas() != null) {
                        existing.setMaxGas(updated.getMaxGas());
                    }
                    if (updated.getShelfLifeDays() != null) {
                        existing.setShelfLifeDays(updated.getShelfLifeDays());
                    }
                    existing.setUpdatedAt(LocalDateTime.now());
                    StorageProfile saved = profileRepository.save(existing);

                    // Đồng bộ tức thời lên Redis Hash profile:{categoryCode}
                    redisPolyglotService.cacheStorageProfile(saved);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{categoryCode}")
    public ResponseEntity<Map<String, Object>> deleteProfile(@PathVariable String categoryCode) {
        String code = categoryCode.toUpperCase();
        if (!profileRepository.existsById(code)) {
            return ResponseEntity.notFound().build();
        }
        profileRepository.deleteById(code);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "deletedCategoryCode", code,
                "message", "Đã xóa cấu hình bảo quản " + code
        ));
    }
}
