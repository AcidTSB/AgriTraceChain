package com.agritrace.trace.service;

import com.agritrace.trace.dto.AuditLogCursorResponse;
import com.agritrace.trace.dto.AuditLogItemResponse;
import com.agritrace.trace.dto.AuditLogStatsResponse;
import com.agritrace.trace.dto.InternalSearchResultResponse;
import com.agritrace.trace.repository.TraceAuditLogCursorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogQueryService {

    private static final long MAX_SEARCH_RESULTS = 100L;

    private final TraceAuditLogCursorRepository cursorRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public AuditLogCursorResponse getAuditLogsByCursor(Long cursor, int limit) {
        List<AuditLogItemResponse> fetched = cursorRepository.findByCursor(cursor, limit + 1);
        boolean hasMore = fetched.size() > limit;
        List<AuditLogItemResponse> data = hasMore
                ? new ArrayList<>(fetched.subList(0, limit))
                : fetched;

        Long nextCursor = null;
        if (hasMore && !data.isEmpty()) {
            nextCursor = data.get(data.size() - 1).getId();
        }

        return AuditLogCursorResponse.builder()
                .data(data)
                .nextCursor(nextCursor)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<InternalSearchResultResponse> searchInternal(String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        String likePattern = "%" + normalizedKeyword + "%";
        long offset = pageable.getOffset();
        int pageSize = pageable.getPageSize();

        long totalElements = countTopN(normalizedKeyword, likePattern);
        if (offset >= MAX_SEARCH_RESULTS || totalElements == 0) {
            return new PageImpl<>(List.of(), pageable, totalElements);
        }

        String sql = """
                WITH ranked AS (
                    SELECT
                        al.id AS audit_id,
                        al.trace_log_id,
                        al.batch_code,
                        al.operation,
                        al.actor_role,
                        al.notes,
                        al.created_at,
                        tl.action_type AS trace_action,
                        tl.location AS trace_location
                    FROM trace_audit_logs al
                    LEFT JOIN trace_logs tl ON tl.id = al.trace_log_id
                    WHERE (? = ''
                        OR LOWER(COALESCE(al.batch_code, '')) LIKE ?
                        OR LOWER(COALESCE(al.operation, '')) LIKE ?
                        OR LOWER(COALESCE(al.actor_role, '')) LIKE ?
                        OR LOWER(COALESCE(al.notes, '')) LIKE ?
                        OR LOWER(COALESCE(tl.action_type, '')) LIKE ?
                        OR LOWER(COALESCE(tl.location, '')) LIKE ?)
                    ORDER BY al.id DESC
                    LIMIT 100
                )
                SELECT *
                FROM ranked
                ORDER BY audit_id DESC
                LIMIT ? OFFSET ?
                """;

        List<InternalSearchResultResponse> rows = jdbcTemplate.query(
                sql,
                internalSearchRowMapper(),
                normalizedKeyword,
                likePattern,
                likePattern,
                likePattern,
                likePattern,
                likePattern,
                likePattern,
                pageSize,
                offset
        );
        return new PageImpl<>(rows, pageable, totalElements);
    }

    private long countTopN(String normalizedKeyword, String likePattern) {
        String countSql = """
                SELECT COUNT(*) FROM (
                    SELECT al.id
                    FROM trace_audit_logs al
                    LEFT JOIN trace_logs tl ON tl.id = al.trace_log_id
                    WHERE (? = ''
                        OR LOWER(COALESCE(al.batch_code, '')) LIKE ?
                        OR LOWER(COALESCE(al.operation, '')) LIKE ?
                        OR LOWER(COALESCE(al.actor_role, '')) LIKE ?
                        OR LOWER(COALESCE(al.notes, '')) LIKE ?
                        OR LOWER(COALESCE(tl.action_type, '')) LIKE ?
                        OR LOWER(COALESCE(tl.location, '')) LIKE ?)
                    ORDER BY al.id DESC
                    LIMIT 100
                ) capped
                """;
        Long total = jdbcTemplate.queryForObject(
                countSql,
                Long.class,
                normalizedKeyword,
                likePattern,
                likePattern,
                likePattern,
                likePattern,
                likePattern,
                likePattern
        );
        if (total == null) {
            return 0L;
        }
        return Math.min(total, MAX_SEARCH_RESULTS);
    }

    private RowMapper<InternalSearchResultResponse> internalSearchRowMapper() {
        return (rs, rowNum) -> InternalSearchResultResponse.builder()
                .auditId(rs.getLong("audit_id"))
                .traceLogId(toUuid(rs.getString("trace_log_id")))
                .batchCode(rs.getString("batch_code"))
                .operation(rs.getString("operation"))
                .actorRole(rs.getString("actor_role"))
                .traceAction(rs.getString("trace_action"))
                .location(rs.getString("trace_location"))
                .notes(rs.getString("notes"))
                .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                .build();
    }

    private UUID toUuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return UUID.fromString(raw);
    }

    @Transactional(readOnly = true)
    public AuditLogStatsResponse getAuditLogStats() {
        return cursorRepository.getAuditLogStats();
    }
}
