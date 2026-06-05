package com.agritrace.trace.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.agritrace.trace.entity.TraceLog;

@Repository
public interface TraceLogRepository extends JpaRepository<TraceLog, UUID> {
    
    List<TraceLog> findByBatchIdOrderByCreatedAtAsc(UUID batchId);

    List<TraceLog> findByBatchCodeOrderByCreatedAtAsc(String batchCode);
    
    List<TraceLog> findByBatchIdOrderByCreatedAtDesc(UUID batchId);

    Optional<TraceLog> findFirstByBatchIdOrderByCreatedAtDesc(UUID batchId);

    @Query("SELECT COALESCE(SUM(t.quantity), 0) FROM TraceLog t WHERE t.batchId = :batchId AND t.actionType = :actionType")
    BigDecimal sumQuantityByBatchIdAndActionType(UUID batchId, String actionType);

    @Query("SELECT DISTINCT t.batchCode, t.batchId FROM TraceLog t WHERE t.batchCode IS NOT NULL")
    List<Object[]> findDistinctBatchCodesAndIds();
}
