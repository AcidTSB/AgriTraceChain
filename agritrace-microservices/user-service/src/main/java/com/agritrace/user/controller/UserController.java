package com.agritrace.user.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.user.dto.UpdateProfileRequest;
import com.agritrace.user.dto.UserResponse;
import com.agritrace.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * User Controller - Phase 2.5 (RBAC Enforced)
 * 
 * Handles user management endpoints with role-based access control
 * 
 * Authorization Rules:
 * - Get user by ID: ADMIN only (user management)
 * 
 * RBAC Examples:
 * - @PreAuthorize("hasRole('ADMIN')") - Admin only
 * - @PreAuthorize("hasAnyRole('ADMIN', 'FARMER')") - Multiple roles
 * - @PreAuthorize("isAuthenticated()") - Any authenticated user
 * 
 * Note: Roles in JWT must be in format: ROLE_ADMIN, ROLE_FARMER, ROLE_INSPECTOR
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserService userService;

    /**
     * Get user by ID
     * 
     * Authorization: ADMIN only
     * Phase 2.5: Changed from isAuthenticated() to hasRole('ADMIN')
     * 
     * @param id user ID
     * @return user response
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")  // Phase 2.5: ADMIN only for user management
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "User retrieved", response));
    }

    /**
     * Get current authenticated user profile.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @RequestHeader("X-User-Id") String userId) {
        UserResponse response = userService.getCurrentUser(UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Current user profile retrieved", response));
    }

    /**
     * Update current authenticated user profile.
     */
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse response = userService.updateCurrentUser(UUID.fromString(userId), request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Current user profile updated", response));
    }

    /**
     * Get total user count (admin only)
     */
    @GetMapping("/count")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> getUserCount() {
        long count = userService.countUsers();
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "User count retrieved", count));
    }

    /**
     * Master-data pagination for user administration.
     */
    @GetMapping("/page")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsersPage(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort,
            @RequestParam(defaultValue = "") String q) {
        if (!hasRole(role, "ADMIN")) {
            throw new AccessDeniedException("Only ADMIN can access users");
        }
        Pageable pageable = buildPageable(page, size, sort);
        Page<UserResponse> result = userService.getUsersPage(q, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Users page retrieved", result));
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
