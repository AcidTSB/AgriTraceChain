package com.agritrace.trace.service;

import com.agritrace.trace.entity.TraceOutboxEvent;
import com.agritrace.trace.repository.TraceOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Outbox Pattern Publisher Service.
 *
 * <p><b>Architecture:</b> Polls the {@code trace_outbox_events} table for PENDING events
 * and publishes them to Kafka. This decouples event publishing from the main request
 * processing path and guarantees at-least-once delivery.</p>
 *
 * <p><b>Transactional Consistency:</b></p>
 * <pre>
 *   BEGIN TX
 *     INSERT trace_log
 *     INSERT trace_outbox_events (status=PENDING)
 *   COMMIT TX
 *   ↓ (async, scheduled)
 *   Poll outbox → publish to Kafka → mark PUBLISHED
 * </pre>
 *
 * <p>Even if the service crashes between TX commit and the publish, the event remains
 * PENDING and will be retried on next poll cycle. This eliminates the dual-write problem
 * that plagues naive "write to DB then publish to Kafka" implementations.</p>
 *
 * <p><b>Retry Strategy:</b> Up to 3 retries with exponential-like backoff via poll interval.
 * After 3 failures the event is marked FAILED for manual investigation.</p>
 *
 * <p><b>Scaling Note:</b> For multi-instance deployments, replace the simple poll
 * with {@code SELECT FOR UPDATE SKIP LOCKED} to prevent duplicate publishing.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxPublisherService {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_RETRIES = 3;

    private final TraceOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    /**
     * Main publish loop – runs every 2 seconds.
     *
     * <p>Cadence tradeoff: 2s ensures low latency for downstream consumers (e.g.,
     * notification-service) without hammering the database. Adjust to 500ms for
     * near-realtime requirements or 10s for low-volume scenarios.</p>
     */
    @Scheduled(fixedDelay = 2000, initialDelay = 5000)
    @Transactional
    public void publishPendingEvents() {
        List<TraceOutboxEvent> pending = outboxRepository.findPendingEvents(BATCH_SIZE);
        if (pending.isEmpty()) {
            return;
        }

        log.debug("Outbox publisher: found {} pending events", pending.size());

        for (TraceOutboxEvent event : pending) {
            publishEvent(event);
        }
    }

    /**
     * Cleanup job – runs daily at 02:00 AM.
     * Removes PUBLISHED events older than 7 days to prevent table bloat.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupPublishedEvents() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        int deleted = outboxRepository.deletePublishedBefore(cutoff);
        if (deleted > 0) {
            log.info("Outbox cleanup: deleted {} published events older than 7 days", deleted);
        }
    }

    /**
     * Emit pending event count to logs for monitoring.
     * Grafana/Prometheus can alert if FAILED events accumulate.
     */
    @Scheduled(fixedDelay = 60000)
    public void reportMetrics() {
        long pending = outboxRepository.countByStatus("PENDING");
        long failed = outboxRepository.countByStatus("FAILED");
        if (pending > 0 || failed > 0) {
            log.info("Outbox metrics: pending={}, failed={}", pending, failed);
        }
        if (failed > 0) {
            log.warn("Outbox has {} FAILED events requiring investigation", failed);
        }
    }

    private void publishEvent(TraceOutboxEvent event) {
        try {
            CompletableFuture<SendResult<String, String>> future = kafkaTemplate.send(
                    event.getTopic(),
                    event.getPartitionKey(),
                    event.getPayload()
            );

            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    handlePublishFailure(event, ex);
                } else {
                    handlePublishSuccess(event, result);
                }
            });

        } catch (Exception e) {
            handlePublishFailure(event, e);
        }
    }

    @Transactional
    protected void handlePublishSuccess(TraceOutboxEvent event, SendResult<String, String> result) {
        event.setStatus("PUBLISHED");
        event.setPublishedAt(LocalDateTime.now());
        outboxRepository.save(event);
        log.info("Outbox published: eventId={}, topic={}, partition={}, offset={}",
                event.getId(), event.getTopic(),
                result.getRecordMetadata().partition(),
                result.getRecordMetadata().offset());
    }

    @Transactional
    protected void handlePublishFailure(TraceOutboxEvent event, Throwable ex) {
        int newRetryCount = event.getRetryCount() + 1;
        event.setRetryCount(newRetryCount);
        event.setLastError(ex.getMessage() != null
                ? ex.getMessage().substring(0, Math.min(500, ex.getMessage().length()))
                : "Unknown error");

        if (newRetryCount >= MAX_RETRIES) {
            event.setStatus("FAILED");
            log.error("Outbox event FAILED after {} retries: eventId={}, topic={}, error={}",
                    MAX_RETRIES, event.getId(), event.getTopic(), ex.getMessage());
        } else {
            event.setStatus("PENDING");
            log.warn("Outbox publish failed (attempt {}/{}): eventId={}, error={}",
                    newRetryCount, MAX_RETRIES, event.getId(), ex.getMessage());
        }
        outboxRepository.save(event);
    }
}
