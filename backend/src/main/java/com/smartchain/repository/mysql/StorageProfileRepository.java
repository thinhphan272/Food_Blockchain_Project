package com.smartchain.repository.mysql;

import com.smartchain.entity.StorageProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StorageProfileRepository extends JpaRepository<StorageProfile, String> {
    Optional<StorageProfile> findByCategoryCode(String categoryCode);
}
