package com.agritrace.trace.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.trace.dto.AuditLogCursorResponse;
import com.agritrace.trace.dto.AuditLogStatsResponse;
import com.agritrace.trace.dto.InternalSearchResultResponse;
import com.agritrace.trace.service.AuditLogQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AuditLogController {

    private static final int DEFAULT_CURSOR_LIMIT = 20;
    private static final int MAX_CURSOR_LIMIT = 100;
    private static final int MAX_SEARCH_PAGE_SIZE = 10;
    private static final int MAX_SEARCH_PAGE_INDEX = 9;

    private final AuditLogQueryService auditLogQueryService;

    /**
     * Immutable log access using cursor pagination (no OFFSET).
     */
    @GetMapping("/api/v1/audit-logs")
    public ResponseEntity<ApiResponse<AuditLogCursorResponse>> getAuditLogs(
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "" + DEFAULT_CURSOR_LIMIT) int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), MAX_CURSOR_LIMIT);
        AuditLogCursorResponse response = auditLogQueryService.getAuditLogsByCursor(cursor, safeLimit);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Audit logs retrieved", response));
    }

    /**
     * Get aggregate statistics of all audit logs (total events, success, failed, warning/blocked).
     */
    @GetMapping("/api/v1/audit-logs/stats")
    public ResponseEntity<ApiResponse<AuditLogStatsResponse>> getAuditLogStats() {
        AuditLogStatsResponse stats = auditLogQueryService.getAuditLogStats();
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Audit log statistics retrieved", stats));
    }

    /**
     * Internal multi-table search with top-100 cap and pageable contract.
     */
    @GetMapping("/api/v1/internal/search")
    public ResponseEntity<ApiResponse<Page<InternalSearchResultResponse>>> searchInternal(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int safePage = Math.min(Math.max(page, 0), MAX_SEARCH_PAGE_INDEX);
        int safeSize = Math.min(Math.max(size, 1), MAX_SEARCH_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<InternalSearchResultResponse> response = auditLogQueryService.searchInternal(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Internal search retrieved", response));
    }
}
