package com.agritrace.product.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.product.dto.BatchResponse;
import com.agritrace.product.dto.CreateBatchRequest;
import com.agritrace.product.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * BatchController - Phase 3.1 (Updated)
 * 
 * REST API for Batch management with IDOR protection
 * 
 * Base path: /api/v1/batches
 * 
 * Endpoints:
 * - POST /api/v1/batches - Create batch (FARMER only, with IDOR protection)
 * - GET /api/v1/batches/{code} - Get batch by code (Public - for QR scan traceability)
 * - GET /api/v1/batches/farm/{farmId} - Get farm batches (Authenticated - prevents data leakage)
 * 
 * Authorization:
 * - POST: FARMER only, validates farm ownership (IDOR protection)
 * - GET /{code}: Public (QR code scanning for consumer transparency)
 * - GET /farm/{farmId}: Authenticated (prevents competitor bulk scraping)
 */
@RestController
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
@Slf4j
public class BatchController {

    private static final int MAX_PAGE_SIZE = 50;

    private final BatchService batchService;
    
    /**
     * Create a new batch
     * 
     * Authorization: FARMER only
     * Security: IDOR protection - validates farm ownership in service layer
     * 
     * @param request Batch creation data
     * @return ApiResponse with created batch
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BatchResponse>> createBatch(
                        @Valid @RequestBody CreateBatchRequest request,
                        @RequestHeader("X-User-Id") String userId,
                        @RequestHeader(value = "X-User-Role", required = false) String role,
                        @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

                if (!"agritrace-gateway-trusted-token".equals(gatewayToken) || !hasRole(role, "FARMER")) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only FARMER can create batch");
                }

                // Gateway injects authenticated user id; persist for ownership and DB not-null constraint.
                request.setOwnerId(UUID.fromString(userId));
        
        log.info("POST /api/v1/batches - Create batch request for farm: {}", request.getFarmId());

        BatchResponse response = batchService.createBatch(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        HttpStatus.CREATED.value(),
                        "Batch created successfully",
                        response
                ));
    }

    /**
     * Get batch by batch code
     * 
     * Authorization: Public (for QR code scanning and traceability)
     * 
     * @param code Unique batch code
     * @return ApiResponse with batch details
     */
    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<BatchResponse>> getBatchByCode(@PathVariable String code) {
        log.info("GET /api/v1/batches/{} - Get batch by code", code);

        // IDOR hardening: this public endpoint only accepts human-facing batch codes.
        // UUID-like identifiers are treated as not found to avoid direct ID probing.
        if (looksLikeUuid(code)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found");
        }

        BatchResponse response = batchService.getBatchByCode(code);

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Batch retrieved successfully",
                        response
                )
        );
    }

    public static class MarkCompromisedRequest {
        private String reason;
        private String auditId;

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public String getAuditId() { return auditId; }
        public void setAuditId(String auditId) { this.auditId = auditId; }
    }

    /**
     * Mark a batch as compromised.
     * Protected: Only internal service (with Gateway Token) AND ADMIN role can call.
     */
    @PutMapping("/{code}/compromise")
    public ResponseEntity<ApiResponse<BatchResponse>> markBatchCompromised(
            @PathVariable String code,
            @RequestBody MarkCompromisedRequest request,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {
        
        log.warn("PUT /api/v1/batches/{}/compromise - REST call to compromise, role={}, token={}", code, role, gatewayToken);
        
        boolean isGatewayApproved = "agritrace-gateway-trusted-token".equals(gatewayToken);
        boolean isAdmin = "ADMIN".equals(normalizeRole(role));

        if (!isGatewayApproved || !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: untrusted request path or insufficient privileges");
        }

        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required");
        }

        BatchResponse response = batchService.markCompromised(code, request.getReason(), request.getAuditId());
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Batch marked compromised successfully",
                        response
                )
        );
    }

    /**
     * Get all batches for a specific farm
     * 
     * Authorization: Authenticated users only (prevents competitor data leakage)
     * 
     * Security consideration:
     * - Public QR scan: /batches/{code} remains permitAll() for traceability
     * - Farm-level data: Requires authentication to prevent bulk competitor scraping
     * 
     * @param farmId Farm ID
     * @return ApiResponse with list of farm batches
     */
    @GetMapping("/farm/{farmId}")
    public ResponseEntity<ApiResponse<List<BatchResponse>>> getBatchesByFarm(
            @PathVariable UUID farmId) {
        
        log.info("GET /api/v1/batches/farm/{} - Get batches for farm (authenticated)", farmId);

        List<BatchResponse> response = batchService.getBatchesByFarm(farmId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Farm batches retrieved successfully",
                        response
                )
        );
    }

    /**
     * Get batches by product ID.
     *
     * Authorization: ADMIN only
     */
    @GetMapping(params = "productId")
    public ResponseEntity<ApiResponse<List<BatchResponse>>> getBatchesByProduct(
            @RequestParam UUID productId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {
        if (!"agritrace-gateway-trusted-token".equals(gatewayToken) || !hasRole(role, "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only ADMIN can query batches by product");
        }

        List<BatchResponse> response = batchService.getBatchesByProduct(productId);
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Product batches retrieved successfully",
                        response
                )
        );
    }

    /**
     * Transactional pagination with filters and default sort updatedAt DESC.
     */
    @GetMapping("/page")
    public ResponseEntity<ApiResponse<Page<BatchResponse>>> getBatchesPage(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort,
            @RequestParam(required = false) UUID farmId,
            @RequestParam(defaultValue = "PENDING_INSPECTION") String status,
            @RequestParam(defaultValue = "") String q) {
        if (!"agritrace-gateway-trusted-token".equals(gatewayToken)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: untrusted request path");
        }
        String normalizedRole = normalizeRole(role);
        if (!"ADMIN".equals(normalizedRole) && !"FARMER".equals(normalizedRole) && !"INSPECTOR".equals(normalizedRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role is required for paginated batch access");
        }

        UUID ownerId = "FARMER".equals(normalizedRole) ? UUID.fromString(userId) : null;
        Pageable pageable = buildPageable(page, size, sort);
        Page<BatchResponse> response = batchService.getBatchesPage(ownerId, farmId, status, q, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Batches page retrieved", response));
    }

    /**
     * Generate QR code for a batch
     * 
     * Authorization: Public (anyone can generate QR code for traceability)
     * 
     * Use cases:
     * - Farmer generates QR code to print on product label
     * - Distributor generates QR code for packaging
     * - Consumer scans QR code to view batch history
     * 
     * @param batchCode Batch code
     * @return QR code image (PNG format)
     */
    /*
    // QR Code generation moved to media-service
    @GetMapping("/{batchCode}/qr")
    public ResponseEntity<byte[]> getQRCode(@PathVariable String batchCode) {
        // Implementation moved to media-service
        throw new UnsupportedOperationException("QR generation moved to media-service");
    }
    */

    /**
     * PRODUCTION HARDENING: Generate QR code as Base64 Data URI
     * 
     * NOTE: This endpoint has been moved to media-service
     * Use GET /api/v1/media/qr/{batchCode} instead
     * 
     * Authorization: Public (anyone can generate QR code for traceability)
     * 
     * @param batchCode Batch code
     * @return ApiResponse with Data URI string
     */
    /*
    @GetMapping("/{batchCode}/qr/base64")
    public ResponseEntity<ApiResponse<String>> getQRCodeBase64(@PathVariable String batchCode) {
        // Implementation moved to media-service
        throw new UnsupportedOperationException("QR generation moved to media-service");
    }
    */

        private boolean hasRole(String roleHeader, String expectedRole) {
                if (roleHeader == null || roleHeader.isBlank()) {
                        return false;
                }

                String normalized = roleHeader.trim().toUpperCase();
                if (normalized.startsWith("ROLE_")) {
                        normalized = normalized.substring("ROLE_".length());
                }
                return expectedRole.equals(normalized);
        }

    private boolean looksLikeUuid(String value) {
                try {
                        UUID.fromString(value);
                        return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private String normalizeRole(String roleHeader) {
        if (roleHeader == null || roleHeader.isBlank()) {
            return "";
        }
        String normalized = roleHeader.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        return normalized;
    }

    private Pageable buildPageable(int page, int size, String sort) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Sort safeSort = parseSort(sort);
        return PageRequest.of(safePage, safeSize, safeSort);
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "updatedAt");
        }
        String[] parts = sort.split(",", 2);
        String field = parts[0].isBlank() ? "updatedAt" : parts[0];
        Sort.Direction direction = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1]))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }
}
