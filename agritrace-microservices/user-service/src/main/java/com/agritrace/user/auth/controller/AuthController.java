package com.agritrace.auth.controller;

import com.agritrace.auth.dto.AuthResponse;
import com.agritrace.auth.dto.LoginRequest;
import com.agritrace.auth.dto.RefreshRequest;
import com.agritrace.auth.service.AuthService;
import com.agritrace.common.dto.ApiResponse;
import com.agritrace.user.dto.CreateUserRequest;
import com.agritrace.user.dto.UserResponse;
import com.agritrace.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.access.prepost.PreAuthorize; // <--- DÒNG IMPORT BỊ THIẾU
import org.springframework.web.bind.annotation.*;

/**
 * AuthController - Phase 2.5 (RBAC Applied)
 * * Authentication REST API endpoints
 * * Base path: /api/v1/auth
 * * Endpoints:
 * - POST /api/v1/auth/login - User login with username/password (Public)
 * - POST /api/v1/auth/refresh - Refresh access token (Public)
 * - POST /api/v1/auth/logout - Logout and revoke tokens (Authenticated)
 * - POST /api/v1/auth/register - User registration (Public - Phase 1)
 * * Authorization:
 * - login, refresh, register: Public (permitAll in SecurityConfig)
 * - logout: Authenticated users only (@PreAuthorize)
 * * Response Format:
 * All responses use ApiResponse<T> wrapper for consistency
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    /**
     * Login endpoint - Phase 2.3/2.4
     * * Authenticates user and returns JWT tokens
     * * @param request Login request with username and password
     * @return ApiResponse with AuthResponse containing tokens
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("POST /api/v1/auth/login - Login request for user: {}", request.getUsername());

        try {
            AuthResponse authResponse = authService.login(request);

            return ResponseEntity.ok(
                    ApiResponse.success(
                            HttpStatus.OK.value(),
                            "Login successful",
                            authResponse
                    )
            );

        } catch (BadCredentialsException e) {
            log.warn("Login failed - Invalid credentials for user: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(
                            HttpStatus.UNAUTHORIZED.value(),
                            "Invalid username or password"
                    ));

        } catch (UsernameNotFoundException e) {
            log.warn("Login failed - User not found: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(
                            HttpStatus.UNAUTHORIZED.value(),
                            "Invalid username or password"
                    ));

        } catch (Exception e) {
            log.error("Login error for user: {}", request.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(
                            HttpStatus.INTERNAL_SERVER_ERROR.value(),
                            "An error occurred during login"
                    ));
        }
    }

    /**
     * Refresh token endpoint - Phase 2.4
     * * Exchanges refresh token for new access token
     * * Request body:
     * {
     * "refreshToken": "eyJhbGc..."
     * }
     * * @param request Refresh request with refresh token
     * @return ApiResponse with new AuthResponse
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        log.info("POST /api/v1/auth/refresh - Refresh token request");

        try {
            AuthResponse authResponse = authService.refresh(request.getRefreshToken());

            return ResponseEntity.ok(
                    ApiResponse.success(
                            HttpStatus.OK.value(),
                            "Token refreshed successfully",
                            authResponse
                    )
            );

        } catch (Exception e) {
            log.error("Token refresh error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(
                            HttpStatus.UNAUTHORIZED.value(),
                            "Invalid or expired refresh token"
                    ));
        }
    }

    /**
     * Logout endpoint - Phase 2.5
     * * Revokes access token and all refresh tokens for user
     * * Security:
     * - Access token extracted from Authorization header
     * - Access token blacklisted (in-memory)
     * - All refresh tokens revoked (database)
     * * Authorization: Authenticated users only (Phase 2.5)
     * * Authorization header:
     * Authorization: Bearer eyJhbGc...
     * * @param authHeader Authorization header containing Bearer token
     * @return ApiResponse with success message
     */
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")  // Phase 2.5: Require authentication
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader("Authorization") String authHeader) {
        log.info("POST /api/v1/auth/logout - Logout request");

        try {
            // Extract token from "Bearer <token>" header
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error(
                                HttpStatus.BAD_REQUEST.value(),
                                "Invalid Authorization header"
                        ));
            }

            String accessToken = authHeader.substring(7);

            // Perform logout
            authService.logout(accessToken);

            return ResponseEntity.ok(
                    ApiResponse.success(
                            HttpStatus.OK.value(),
                            "Logout successful",
                            null
                    )
            );

        } catch (Exception e) {
            log.error("Logout error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(
                            HttpStatus.INTERNAL_SERVER_ERROR.value(),
                            "An error occurred during logout"
                    ));
        }
    }

    /**
     * Register a new user - Phase 1 (kept for compatibility)
     *
     * @param request user registration data
     * @return created user response
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody CreateUserRequest request) {
        UserResponse response = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "User registered successfully", response));
    }
}
