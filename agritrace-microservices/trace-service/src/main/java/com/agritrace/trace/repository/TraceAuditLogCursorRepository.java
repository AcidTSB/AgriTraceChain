package com.agritrace.trace.repository;

import com.agritrace.trace.dto.AuditLogItemResponse;
import com.agritrace.trace.dto.AuditLogStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class TraceAuditLogCursorRepository {

    private final JdbcTemplate jdbcTemplate;

    public List<AuditLogItemResponse> findByCursor(Long cursor, int limit) {
        if (cursor == null) {
            String sql = """
                    SELECT id, trace_log_id, batch_code, operation, actor_id, actor_role, actor_region, actor_facility_id, notes, created_at
                    FROM trace_audit_logs
                    ORDER BY id DESC
                    LIMIT ?
                    """;
            return jdbcTemplate.query(sql, rowMapper(), limit);
        } else {
            String sql = """
                    SELECT id, trace_log_id, batch_code, operation, actor_id, actor_role, actor_region, actor_facility_id, notes, created_at
                    FROM trace_audit_logs
                    WHERE id < ?
                    ORDER BY id DESC
                    LIMIT ?
                    """;
            return jdbcTemplate.query(sql, rowMapper(), cursor, limit);
        }
    }

    private RowMapper<AuditLogItemResponse> rowMapper() {
        return (rs, rowNum) -> AuditLogItemResponse.builder()
                .id(rs.getLong("id"))
                .traceLogId(toUuid(rs.getString("trace_log_id")))
                .batchCode(rs.getString("batch_code"))
                .operation(rs.getString("operation"))
                .actorId(toUuid(rs.getString("actor_id")))
                .actorRole(rs.getString("actor_role"))
                .actorRegion(rs.getString("actor_region"))
                .actorFacilityId(toUuid(rs.getString("actor_facility_id")))
                .notes(rs.getString("notes"))
                .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                .build();
    }

    public AuditLogStatsResponse getAuditLogStats() {
        String sql = """
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) NOT LIKE '%FAILED%'
                             AND UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) NOT LIKE '%REJECT%'
                             AND (UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) NOT LIKE '%COMPROMISED%'
                                  OR UPPER(operation) = 'READ_COMPROMISED')
                             AND UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) NOT LIKE '%COMPROMISE_DETECTED%'
                             AND UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) NOT LIKE '%ALERT%'
                        THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) LIKE '%FAILED%'
                        THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) LIKE '%REJECT%'
                             OR (UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) LIKE '%COMPROMISED%'
                                 AND UPPER(operation) != 'READ_COMPROMISED')
                             OR UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) LIKE '%COMPROMISE_DETECTED%'
                             OR UPPER(CONCAT(COALESCE(operation, ''), ' ', COALESCE(notes, ''))) LIKE '%ALERT%'
                        THEN 1 ELSE 0 END) as warning_or_blocked
                FROM trace_audit_logs
                """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> 
            AuditLogStatsResponse.builder()
                .totalEvents(rs.getLong("total"))
                .successCount(rs.getLong("success"))
                .failedCount(rs.getLong("failed"))
                .warningOrBlockedCount(rs.getLong("warning_or_blocked"))
                .build()
        );
    }

    private UUID toUuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return UUID.fromString(raw);
    }
}
