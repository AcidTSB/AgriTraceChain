package com.agritrace.auth.repository;

import com.agritrace.auth.entity.RefreshToken;
import com.agritrace.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * RefreshTokenRepository
 * 
 * Purpose: Database operations for refresh token management
 * 
 * Operations:
 * - Find token by token string (for validation)
 * - Delete all tokens for a user (for logout)
 * - Delete expired tokens (for cleanup)
 */
@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /**
     * Find refresh token by token string
     * Used during token refresh operation
     * 
     * @param token The refresh token string
     * @return Optional containing RefreshToken if found
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * Delete all refresh tokens for a specific user
     * Used during logout to revoke all user sessions
     * 
     * @param user The user whose tokens should be deleted
     * @return Number of tokens deleted
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user = :user")
    int deleteByUser(@Param("user") User user);

    /**
     * Delete all expired refresh tokens
     * Used for periodic cleanup
     * 
     * @param now Current timestamp
     * @return Number of tokens deleted
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiryDate < :now")
    int deleteByExpiryDateBefore(@Param("now") Instant now);

    /**
     * Count active (non-revoked, non-expired) tokens for a user
     * Useful for implementing token limits
     * 
     * @param user The user
     * @param now Current timestamp
     * @return Number of active tokens
     */
    @Query("SELECT COUNT(rt) FROM RefreshToken rt WHERE rt.user = :user AND rt.revoked = false AND rt.expiryDate > :now")
    long countActiveTokensByUser(@Param("user") User user, @Param("now") Instant now);
}
