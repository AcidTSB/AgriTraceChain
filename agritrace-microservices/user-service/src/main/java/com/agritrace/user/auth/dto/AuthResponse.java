package com.agritrace.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Authentication Response DTO - Phase 2.3
 * 
 * Response body for POST /api/v1/auth/login
 * 
 * Contains:
 * - accessToken: JWT access token (15 minutes)
 * - refreshToken: JWT refresh token (7 days)
 * - tokenType: "Bearer"
 * - expiresIn: Token expiration time in seconds
 * - username: Authenticated username
 * - role: User role
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    
    @Builder.Default
    private String tokenType = "Bearer";
    
    private Long expiresIn;  // Expiration in seconds
    private String username;
    private String role;
}
