package com.agritrace.auth.service;

import com.agritrace.auth.entity.RefreshToken;
import com.agritrace.auth.repository.RefreshTokenRepository;
import com.agritrace.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * RefreshTokenService
 * 
 * Purpose: Manage refresh tokens lifecycle (create, verify, revoke)
 * Strategy: Database-backed whitelist approach
 * 
 * Operations:
 * - Create: Generate new refresh token for user
 * - Verify: Validate refresh token from database
 * - Revoke: Mark token as revoked
 * 
 * Security:
 * - Tokens stored in database (can be revoked)
 * - Expiration enforced
 * - One user can have multiple tokens (multi-device support)
 * - All tokens can be revoked on logout
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    /**
     * Persist a refresh token for user.
     *
     * @param user User who owns this token
     * @param tokenValue refresh token string returned to client
     * @return Created RefreshToken entity
     */
    @Transactional
    public RefreshToken createRefreshToken(User user, String tokenValue) {
        log.debug("Creating refresh token for user: {}", user.getUsername());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(tokenValue)
                .expiryDate(Instant.now().plusMillis(refreshTokenExpiration))
                .revoked(false)
                .createdAt(Instant.now())
                .build();

        refreshToken = refreshTokenRepository.save(refreshToken);
        
        log.info("Refresh token created for user: {} (expires: {})", 
                user.getUsername(), refreshToken.getExpiryDate());

        return refreshToken;
    }

    /**
     * Verify refresh token and return if valid
     * 
     * Validation checks:
     * 1. Token exists in database
     * 2. Token not revoked
     * 3. Token not expired
     * 
     * @param token The refresh token string to verify
     * @return Verified RefreshToken entity
     * @throws RuntimeException if token invalid, expired, or revoked
     */
    @Transactional(readOnly = true)
    public RefreshToken verifyToken(String token) {
        log.debug("Verifying refresh token");

        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("Refresh token not found in database");
                    return new RuntimeException("Invalid refresh token");
                });

        // Check if revoked
        if (refreshToken.isRevoked()) {
            log.warn("Refresh token has been revoked for user: {}", 
                    refreshToken.getUser().getUsername());
            throw new RuntimeException("Refresh token has been revoked");
        }

        // Check if expired
        if (refreshToken.isExpired()) {
            log.warn("Refresh token expired for user: {} (expired: {})", 
                    refreshToken.getUser().getUsername(), 
                    refreshToken.getExpiryDate());
            throw new RuntimeException("Refresh token has expired");
        }

        log.debug("Refresh token verified successfully for user: {}", 
                refreshToken.getUser().getUsername());

        return refreshToken;
    }

    /**
     * Revoke a specific refresh token
     * Marks token as revoked without deleting (audit trail)
     * 
     * @param token The token string to revoke
     */
    @Transactional
    public void revokeToken(String token) {
        log.debug("Revoking refresh token");

        refreshTokenRepository.findByToken(token).ifPresent(refreshToken -> {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            log.info("Refresh token revoked for user: {}", 
                    refreshToken.getUser().getUsername());
        });
    }

    /**
     * Revoke all refresh tokens for a user
     * Used during logout to end all sessions
     * 
     * @param user User whose tokens should be revoked
     * @return Number of tokens deleted
     */
    @Transactional
    public int revokeAllUserTokens(User user) {
        log.debug("Revoking all refresh tokens for user: {}", user.getUsername());

        int count = refreshTokenRepository.deleteByUser(user);
        
        log.info("Revoked {} refresh token(s) for user: {}", count, user.getUsername());

        return count;
    }

    /**
     * Clean up expired tokens
     * Should be called periodically (e.g., scheduled task)
     * 
     * @return Number of tokens deleted
     */
    @Transactional
    public int cleanupExpiredTokens() {
        log.debug("Cleaning up expired refresh tokens");

        int count = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
        
        if (count > 0) {
            log.info("Cleaned up {} expired refresh token(s)", count);
        }

        return count;
    }

    /**
     * Count active tokens for a user
     * Useful for implementing token limits (e.g., max 5 devices)
     * 
     * @param user User to count tokens for
     * @return Number of active tokens
     */
    @Transactional(readOnly = true)
    public long countActiveTokens(User user) {
        return refreshTokenRepository.countActiveTokensByUser(user, Instant.now());
    }
}
