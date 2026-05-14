package com.agritrace.user.dto;

import com.agritrace.user.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for User entity
 * Does NOT include password_hash for security
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;

    private String username;

    private String fullName;

    private String email;

    private UserRole role;

    private String branch;

    private String publicKey;

    private String walletAddress;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
