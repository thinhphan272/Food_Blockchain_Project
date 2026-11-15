package com.smartchain.repository.mongo;

import com.smartchain.document.BlockchainBlockDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlockchainLedgerRepository extends MongoRepository<BlockchainBlockDocument, String> {
    List<BlockchainBlockDocument> findByBatchCodeOrderByIndexAsc(String batchCode);
    Optional<BlockchainBlockDocument> findFirstByBatchCodeOrderByIndexDesc(String batchCode);
}

