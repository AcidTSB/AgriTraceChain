package com.agritrace.product.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.agritrace.product.entity.Batch;

@Repository
public interface BatchRepository extends JpaRepository<Batch, UUID> {
    Optional<Batch> findByBatchCode(String batchCode);
    List<Batch> findByFacilityId(UUID facilityId);
    List<Batch> findByOwnerId(UUID ownerId);

    @Query("""
           SELECT b FROM Batch b
           WHERE (:ownerId IS NULL OR b.ownerId = :ownerId)
             AND (:farmId IS NULL OR b.facilityId = :farmId)
             AND (:keyword = '' OR LOWER(b.batchCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR LOWER(b.productName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR LOWER(b.facilityName) LIKE LOWER(CONCAT('%', :keyword, '%')))
             AND (:status = '' OR :status = 'ALL'
                  OR (:status = 'PENDING_INSPECTION' AND b.isCompromised = false)
                  OR (:status = 'COMPROMISED' AND b.isCompromised = true))
           """)
    Page<Batch> searchBatches(
            @Param("ownerId") UUID ownerId,
            @Param("farmId") UUID farmId,
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
