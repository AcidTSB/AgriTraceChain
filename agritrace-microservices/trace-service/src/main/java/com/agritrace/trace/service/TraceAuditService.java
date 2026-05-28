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

    public void recordPublicRead(String batchCode, String operation, String note, String receiverUserId) {
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
