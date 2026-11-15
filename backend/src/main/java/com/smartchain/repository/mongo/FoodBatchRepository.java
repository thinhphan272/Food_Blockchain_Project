package com.smartchain.repository.mongo;

import com.smartchain.document.FoodBatchDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FoodBatchRepository extends MongoRepository<FoodBatchDocument, String> {
    Optional<FoodBatchDocument> findByBatchCode(String batchCode);
    List<FoodBatchDocument> findByCategory(String category);
}

