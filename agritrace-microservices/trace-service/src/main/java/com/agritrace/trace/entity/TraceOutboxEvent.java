package com.agritrace.trace.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Transactional Outbox Event Entity.
 *
 * <p>Part of the Outbox Pattern implementation. This entity is persisted in the SAME
 * database transaction as the TraceLog to guarantee that the Kafka event is never
 * lost due to a crash between DB commit and Kafka publish.</p>
 *
 * <p>Lifecycle: PENDING → (PUBLISHING) → PUBLISHED | FAILED</p>
 */
@Entity
@Table(name = "trace_outbox_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TraceOutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Reference to the trace log that triggered this event. Nullable for system-generated events. */
    @Column(name = "trace_log_id")
    private UUID traceLogId;

    /** Kafka topic to publish to (e.g., "trace-events", "batch-events"). */
    @Column(name = "topic", nullable = false, length = 255)
    private String topic;

    /**
     * Partition key for Kafka – usually batchId.
     * Ensures all events for the same batch land on the same partition,
     * preserving ordering within a batch trace chain.
     */
    @Column(name = "partition_key", length = 255)
    private String partitionKey;

    /** JSON-serialized event payload. Must be non-null and valid JSON. */
    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    /** Event type discriminator for consumer-side routing. */
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    /**
     * Processing status.
     *
     * <ul>
     *   <li>PENDING  – Ready to be picked up by publisher</li>
     *   <li>PUBLISHED – Successfully ACKed by Kafka</li>
     *   <li>FAILED   – Exceeded max retry count, requires manual intervention</li>
     * </ul>
     */
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    /** Number of publish attempts (for exponential backoff decisions). */
    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    /** Last error message for debugging failed events. */
    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    /** Timestamp when the event was successfully published to Kafka. */
    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
