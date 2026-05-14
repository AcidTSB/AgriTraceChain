package com.agritrace.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * RefreshRequest DTO
 * 
 * Purpose: Request body for token refresh endpoint
 * Endpoint: POST /api/v1/auth/refresh
 * 
 * Contains:
 * - refreshToken: The JWT refresh token to exchange for new access token
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshRequest {

    /**
     * The refresh token (JWT string)
     * Used to generate a new access token
     */
    @NotBlank(message = "Refresh token is required")
    private String refreshToken;
}
