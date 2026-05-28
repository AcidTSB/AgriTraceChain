package com.agritrace.trace.repository;

import com.agritrace.trace.entity.TraceOutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TraceOutboxRepository extends JpaRepository<TraceOutboxEvent, UUID> {

    /**
     * Fetch PENDING events ordered by creation time (FIFO delivery).
     * Limit to a batch size to avoid processing too many at once.
     *
     * <p>Note: In a multi-instance deployment, use SELECT FOR UPDATE SKIP LOCKED
     * to prevent multiple instances processing the same event. For single-instance
     * demo this simple query is sufficient.</p>
     */
    @Query("""
            SELECT e FROM TraceOutboxEvent e
            WHERE e.status IN ('PENDING', 'FAILED')
              AND e.retryCount < 3
            ORDER BY e.createdAt ASC
            LIMIT :batchSize
            """)
    List<TraceOutboxEvent> findPendingEvents(@Param("batchSize") int batchSize);

    /**
     * Cleanup: delete successfully published events older than given cutoff.
     * Run periodically (e.g., daily) to prevent outbox table growth.
     */
    @Modifying
    @Query("""
            DELETE FROM TraceOutboxEvent e
            WHERE e.status = 'PUBLISHED'
              AND e.publishedAt < :cutoff
            """)
    int deletePublishedBefore(@Param("cutoff") LocalDateTime cutoff);

    /**
     * Count events by status for monitoring/alerting.
     */
    long countByStatus(String status);
}
