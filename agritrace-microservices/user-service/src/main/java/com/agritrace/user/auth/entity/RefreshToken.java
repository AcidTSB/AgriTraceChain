package com.agritrace.auth.entity;

import com.agritrace.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * RefreshToken Entity
 * 
 * Purpose: Database-backed refresh token for JWT authentication
 * Strategy: Whitelist approach - only valid tokens exist in database
 * 
 * Lifecycle:
 * - Created: When user logs in
 * - Used: To generate new access tokens
 * - Revoked: When user logs out or token is rotated
 * - Cleaned: Expired tokens removed periodically
 * 
 * Security:
 * - Long-lived (7 days default)
 * - One-time use recommended (rotation strategy)
 * - Can be revoked immediately
 * - Tied to specific user
 */
@Entity
@Table(name = "refresh_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * The actual JWT refresh token string
     * Stored for verification and revocation
     */
    @Column(nullable = false, unique = true, length = 512)
    private String token;

    /**
     * User who owns this refresh token
     * Used to generate new access tokens
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Expiration timestamp
     * Tokens past this time are invalid
     */
    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    /**
     * Revocation flag
     * Set to true when token should no longer be valid
     * Used for logout or security incidents
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    /**
     * Creation timestamp
     * For audit and cleanup purposes
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    /**
     * Check if token is expired
     * 
     * @return true if current time is past expiry date
     */
    public boolean isExpired() {
        return Instant.now().isAfter(this.expiryDate);
    }

    /**
     * Check if token is valid (not expired and not revoked)
     * 
     * @return true if token can be used
     */
    public boolean isValid() {
        return !isExpired() && !revoked;
    }
}
