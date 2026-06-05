package com.agritrace.trace.service;

import com.agritrace.trace.entity.TraceLog;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TraceAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public void recordCreate(TraceLog traceLog, String actorRole, String actorRegion, UUID actorFacilityId) {
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("traceLogId", traceLog.getId());
        after.put("batchId", traceLog.getBatchId());
        after.put("batchCode", traceLog.getBatchCode());
        after.put("actionType", traceLog.getActionType());
        after.put("description", traceLog.getDescription());
        after.put("location", traceLog.getLocation());
        after.put("previousHash", traceLog.getPreviousHash());
        after.put("currentHash", traceLog.getCurrentHash());
        after.put("signature", traceLog.getSignature());
        after.put("createdBy", traceLog.getCreatedBy());
        after.put("createdAt", traceLog.getCreatedAt());

        writeAudit(
                traceLog.getId(),
                traceLog.getBatchCode(),
                "CREATE",
                traceLog.getCreatedBy(),
                actorRole,
                actorRegion,
                actorFacilityId,
                null,
                toJson(after),
                "Trace log created",
                null
        );
    }

    private final java.util.Map<String, Long> lastPublicReadMap = new java.util.concurrent.ConcurrentHashMap<>();

    public void recordPublicRead(String batchCode, String operation, String note, String receiverUserId) {
        String key = batchCode + ":" + operation;
        long now = System.currentTimeMillis();
        Long lastTime = lastPublicReadMap.get(key);
        
        // Skip if same operation on same batch happened within the last 30 seconds (debounce)
        if (lastTime != null && (now - lastTime) < 30000) {
            return;
        }
        lastPublicReadMap.put(key, now);

        writeAudit(
                null,
                batchCode,
                operation,
                null,
                "PUBLIC",
                null,
                null,
                null,
                null,
                note,
                receiverUserId
        );
    }

    public void recordReadCompromised(String batchCode,
                                      String actorId,
                                      String actorRole,
                                      String actorRegion,
                                      String actorFacilityId,
                                      String receiverUserId) {
        UUID actorUuid = null;
        if (actorId != null && !actorId.isBlank()) {
            try {
                actorUuid = UUID.fromString(actorId);
            } catch (Exception ignored) {}
        }
        UUID facilityUuid = null;
        if (actorFacilityId != null && !actorFacilityId.isBlank()) {
            try {
                facilityUuid = UUID.fromString(actorFacilityId);
            } catch (Exception ignored) {}
        }

        try {
            boolean recentLogExists;
            if (actorUuid == null) {
                recentLogExists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM trace_audit_logs WHERE batch_code = ? AND operation = 'READ_COMPROMISED' AND actor_id IS NULL AND created_at >= ?)",
                        Boolean.class,
                        batchCode,
                        LocalDateTime.now().minusMinutes(10)
                ));
            } else {
                recentLogExists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM trace_audit_logs WHERE batch_code = ? AND operation = 'READ_COMPROMISED' AND actor_id = ? AND created_at >= ?)",
                        Boolean.class,
                        batchCode,
                        actorUuid,
                        LocalDateTime.now().minusMinutes(10)
                ));
            }

            if (recentLogExists) {
                log.info("Duplicate READ_COMPROMISED audit log within 10 minutes for batchCode: {}, actorId: {}. Skipping.", batchCode, actorId);
                return;
            }
        } catch (Exception ex) {
            log.error("Failed to perform DB deduplication check for READ_COMPROMISED, proceeding as fallback", ex);
        }

        writeAudit(
                null,
                batchCode,
                "READ_COMPROMISED",
                actorUuid,
                actorRole != null ? actorRole : "PUBLIC",
                actorRegion,
                facilityUuid,
                null,
                null,
                "Trace returned with compromised integrity status",
                receiverUserId
        );
    }

    public void recordCompromiseDetected(String batchCode, String compromiseReason, String receiverUserId) {
        try {
            Boolean exists = jdbcTemplate.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM trace_audit_logs WHERE batch_code = ? AND operation = 'COMPROMISE_DETECTED')",
                    Boolean.class,
                    batchCode
            );
            if (Boolean.TRUE.equals(exists)) {
                log.info("COMPROMISE_DETECTED already exists in database for batchCode: {}, skipping.", batchCode);
                return;
            }

            writeAudit(
                    null,
                    batchCode,
                    "COMPROMISE_DETECTED",
                    null,
                    "SYSTEM",
                    null,
                    null,
                    null,
                    null,
                    compromiseReason != null ? compromiseReason : "Batch compromise detected",
                    receiverUserId
            );
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            log.info("COMPROMISE_DETECTED unique constraint violation for batchCode: {}, ignoring duplicate.", batchCode);
        } catch (Exception ex) {
            log.error("Failed to record COMPROMISE_DETECTED for batchCode: {}", batchCode, ex);
        }
    }


    private void writeAudit(UUID traceLogId,
                            String batchCode,
                            String operation,
                            UUID actorId,
                            String actorRole,
                            String actorRegion,
                            UUID actorFacilityId,
                            String beforeSnapshot,
                            String afterSnapshot,
                            String notes,
                            String receiverUserId) {
        try {
            Map<String, Object> kafkaMessage = new LinkedHashMap<>();
            kafkaMessage.put("traceLogId", traceLogId);
            kafkaMessage.put("batchCode", batchCode);
            kafkaMessage.put("operation", operation);
            kafkaMessage.put("actorId", actorId);
            kafkaMessage.put("actorRole", actorRole);
            kafkaMessage.put("actorRegion", actorRegion);
            kafkaMessage.put("actorFacilityId", actorFacilityId);
            kafkaMessage.put("beforeSnapshot", beforeSnapshot);
            kafkaMessage.put("afterSnapshot", afterSnapshot);
            kafkaMessage.put("notes", notes);
            if (receiverUserId != null) {
                kafkaMessage.put("receiverUserId", receiverUserId);
            }
            kafkaMessage.put("timestamp", LocalDateTime.now().toString());

            kafkaTemplate.send("audit-ledger-topic", batchCode, toJson(kafkaMessage));

            jdbcTemplate.update(
                    """
                    INSERT INTO trace_audit_logs (
                        trace_log_id, batch_code, operation, actor_id, actor_role, actor_region,
                        actor_facility_id, before_snapshot, after_snapshot, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), ?, ?)
                    """,
                    traceLogId,
                    batchCode,
                    operation,
                    actorId,
                    actorRole,
                    actorRegion,
                    actorFacilityId,
                    beforeSnapshot,
                    afterSnapshot,
                    notes,
                    LocalDateTime.now()
            );
        } catch (Exception ex) {
            // Audit logging must not break primary business flow.
            log.warn("Audit write skipped: operation={}, batchCode={}, reason={}", operation, batchCode, ex.getMessage());
        }
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize audit payload", e);
        }
    }
}
