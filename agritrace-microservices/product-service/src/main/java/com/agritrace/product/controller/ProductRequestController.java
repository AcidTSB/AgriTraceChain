package com.agritrace.product.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.product.dto.CreateProductRequestDto;
import com.agritrace.product.dto.ProductRequestResponse;
import com.agritrace.product.dto.ReviewProductRequestDto;
import com.agritrace.product.service.ProductRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * ProductRequestController
 *
 * REST API for the Product Creation Request workflow.
 *
 * Base path: /api/v1/product-requests
 *
 * Endpoints:
 *   POST   /api/v1/product-requests             — FARMER: submit request
 *   GET    /api/v1/product-requests/my          — FARMER: view own requests
 *   GET    /api/v1/product-requests             — ADMIN: view all requests
 *   POST   /api/v1/product-requests/{id}/review — ADMIN: approve or reject
 *
 * Authorization: header-based (X-User-Role, X-User-Id, X-Gateway-Token)
 * consistent with existing ProductController pattern.
 */
@RestController
@RequestMapping("/api/v1/product-requests")
@RequiredArgsConstructor
@Slf4j
public class ProductRequestController {

    private static final String GATEWAY_TOKEN = "agritrace-gateway-trusted-token";
    private static final int    MAX_PAGE_SIZE = 50;

    private final ProductRequestService productRequestService;

    // ─────────────────────────────────────────────────────────────────────────
    // FARMER endpoints
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Submit a new product creation request.
     * Authorization: FARMER only
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ProductRequestResponse>> submitRequest(
            @Valid @RequestBody CreateProductRequestDto dto,
            @RequestHeader(value = "X-User-Id",    required = false) String userId,
            @RequestHeader(value = "X-User-Role",  required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

        requireGateway(gatewayToken);
        requireRole(role, "FARMER");

        UUID farmerId = parseUserId(userId);
        log.info("POST /api/v1/product-requests — Farmer {} submitting request: '{}'",
                farmerId, dto.getProductName());

        ProductRequestResponse response = productRequestService.submitRequest(farmerId, dto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(),
                        "Yêu cầu tạo sản phẩm đã được gửi thành công", response));
    }

    /**
     * Farmer: view own requests (paginated).
     * Authorization: FARMER only
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<ProductRequestResponse>>> getMyRequests(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Id",    required = false) String userId,
            @RequestHeader(value = "X-User-Role",  required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

        requireGateway(gatewayToken);
        requireRole(role, "FARMER");

        UUID farmerId = parseUserId(userId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));

        Page<ProductRequestResponse> result = productRequestService.getMyRequests(farmerId, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Danh sách yêu cầu của bạn", result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN endpoints
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin: view all requests, optionally filter by status.
     * Authorization: ADMIN only
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProductRequestResponse>>> getAllRequests(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "20")  int size,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestHeader(value = "X-User-Role",  required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

        requireGateway(gatewayToken);
        requireRole(role, "ADMIN");

        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        Page<ProductRequestResponse> result = productRequestService.getAllRequests(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Danh sách yêu cầu sản phẩm", result));
    }

    /**
     * Admin: approve or reject a request.
     * Authorization: ADMIN only
     * Idempotency: only PENDING requests can be reviewed; otherwise 409 is returned.
     */
    @PostMapping("/{id}/review")
    public ResponseEntity<ApiResponse<ProductRequestResponse>> reviewRequest(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewProductRequestDto dto,
            @RequestHeader(value = "X-User-Id",    required = false) String userId,
            @RequestHeader(value = "X-User-Role",  required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

        requireGateway(gatewayToken);
        requireRole(role, "ADMIN");

        UUID adminId = parseUserId(userId);
        log.info("POST /api/v1/product-requests/{}/review — Admin {} action: {}",
                id, adminId, dto.getAction());

        try {
            ProductRequestResponse response = productRequestService.reviewRequest(id, adminId, dto);
            return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                    "Đã xử lý yêu cầu thành công", response));
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void requireGateway(String token) {
        if (!GATEWAY_TOKEN.equals(token)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid gateway token");
        }
    }

    private void requireRole(String roleHeader, String expectedRole) {
        if (!hasRole(roleHeader, expectedRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only " + expectedRole + " can perform this action");
        }
    }

    private boolean hasRole(String roleHeader, String expectedRole) {
        if (roleHeader == null || roleHeader.isBlank()) return false;
        String normalized = roleHeader.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) normalized = normalized.substring(5);
        return expectedRole.equals(normalized);
    }

    private UUID parseUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-User-Id header is required");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid X-User-Id format");
        }
    }

    private int clampSize(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }
}
