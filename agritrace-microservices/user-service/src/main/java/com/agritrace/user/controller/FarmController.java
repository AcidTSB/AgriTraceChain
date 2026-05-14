package com.agritrace.user.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.user.dto.CreateFarmRequest;
import com.agritrace.user.dto.FarmResponse;
import com.agritrace.user.service.FarmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/farms")
@RequiredArgsConstructor
@Slf4j
public class FarmController {

    private static final int MAX_PAGE_SIZE = 50;

    private final FarmService farmService;

    @PostMapping
    public ResponseEntity<ApiResponse<FarmResponse>> createFarm(
            @Valid @RequestBody CreateFarmRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!hasRole(role, "FARMER")) {
            throw new AccessDeniedException("Only FARMER can create farm");
        }

        log.info("POST /api/v1/farms - Create farm request: {}", request.getName());
        FarmResponse response = farmService.createFarm(request, UUID.fromString(userId), username);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Farm created successfully", response));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<FarmResponse>>> getMyFarms(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!hasRole(role, "FARMER")) {
            throw new AccessDeniedException("Only FARMER can access own farms");
        }

        log.info("GET /api/v1/farms/my - Get current user's farms");
        List<FarmResponse> response = farmService.getMyFarms(UUID.fromString(userId), username);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Farms retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FarmResponse>>> getAllFarms(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!hasRole(role, "ADMIN")) {
            throw new AccessDeniedException("Only ADMIN can access all farms");
        }
        List<FarmResponse> response = farmService.getAllFarms();
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "All farms retrieved successfully", response));
    }

    /**
     * Master-data pagination endpoint with hard-limit guard (max size=50).
     */
    @GetMapping("/page")
    public ResponseEntity<ApiResponse<Page<FarmResponse>>> getFarmsPage(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort,
            @RequestParam(defaultValue = "") String q) {
        if (!hasRole(role, "ADMIN")) {
            throw new AccessDeniedException("Only ADMIN can access farms");
        }
        Pageable pageable = buildPageable(page, size, sort);
        Page<FarmResponse> response = farmService.getAllFarmsPage(q, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Farms page retrieved", response));
    }

    @GetMapping("/count")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> getFarmCount() {
        long count = farmService.countFarms();
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Farm count retrieved", count));
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
}
