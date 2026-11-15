package com.smartchain.repository.mysql;

import com.smartchain.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, String> {
    Optional<OrderItem> findBySerialCode(String serialCode);
    List<OrderItem> findByBatchCode(String batchCode);
    List<OrderItem> findByStatus(String status);
}

