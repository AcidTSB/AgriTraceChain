package com.agritrace.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * TokenBlacklistService
 * 
 * Purpose: In-memory blacklist for revoked access tokens
 * Architecture: Stateless JWT + In-memory blacklist for logout
 * 
 * Design Decisions:
 * - ConcurrentHashMap for thread-safe O(1) operations
 * - Auto-cleanup: Remove expired tokens during lookup
 * - No database: Pure in-memory for performance
 * - Survives app restart: Tokens naturally expire (15 min default)
 * 
 * Trade-offs:
 * - Pro: O(1) lookup, zero DB load, extremely fast
 * - Pro: Auto-cleanup on expiry check
 * - Con: Lost on app restart (acceptable - tokens expire quickly)
 * - Con: Not shared across instances (use Redis for clusters)
 * 
 * Performance:
 * - Lookup: O(1)
 * - Insert: O(1)
 * - Memory: Minimal (tokens expire in 15 minutes)
 * 
 * Scalability Notes:
 * - Single instance: Perfect (current implementation)
 * - Clustered/Cloud: Replace with Redis/Valkey
 * - Microservices: Use distributed cache
 */
@Service
@Slf4j
public class TokenBlacklistService {

    /**
     * In-memory blacklist
     * Key: Access token (JWT string)
     * Value: Expiration time (for auto-cleanup)
     */
    private final ConcurrentHashMap<String, Instant> blacklist = new ConcurrentHashMap<>();

    /**
     * Add token to blacklist
     * Called during logout to invalidate access token
     * 
     * Auto-cleanup: Removes expired tokens from map
     * 
     * @param token The access token to blacklist
     * @param expiration Token expiration time
     */
    public void blacklistToken(String token, Instant expiration) {
        if (token == null || token.isBlank()) {
            log.warn("Attempted to blacklist null or empty token");
            return;
        }

        // Only blacklist if not already expired
        if (expiration.isAfter(Instant.now())) {
            blacklist.put(token, expiration);
            log.debug("Token blacklisted. Current blacklist size: {}", blacklist.size());
        } else {
            log.debug("Token already expired, not adding to blacklist");
        }

        // Perform cleanup after adding token
        cleanupExpiredTokens();
    }

    /**
     * Check if token is blacklisted
     * Called by JwtAuthenticationFilter for every request
     * 
     * Performance: O(1) lookup
     * Side effect: Auto-cleanup if token found but expired
     * 
     * @param token The access token to check
     * @return true if token is blacklisted and not expired
     */
    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        Instant expiration = blacklist.get(token);
        
        if (expiration == null) {
            // Token not in blacklist
            return false;
        }

        // Check if blacklist entry has expired
        if (expiration.isBefore(Instant.now())) {
            // Token expired, remove from blacklist
            blacklist.remove(token);
            log.debug("Removed expired token from blacklist");
            return false;
        }

        // Token is blacklisted and still valid
        log.debug("Token found in blacklist");
        return true;
    }

    /**
     * Clean up expired tokens from blacklist
     * Called periodically during blacklist operations
     * 
     * Performance: O(n) but n is small (tokens expire in 15 min)
     * Frequency: On every blacklist addition
     */
    private void cleanupExpiredTokens() {
        Instant now = Instant.now();
        int sizeBefore = blacklist.size();

        blacklist.entrySet().removeIf(entry -> entry.getValue().isBefore(now));

        int sizeAfter = blacklist.size();
        int removed = sizeBefore - sizeAfter;

        if (removed > 0) {
            log.debug("Cleaned up {} expired tokens from blacklist. Current size: {}", removed, sizeAfter);
        }
    }

    /**
     * Get current blacklist size
     * For monitoring and debugging
     * 
     * @return Number of tokens in blacklist
     */
    public int getBlacklistSize() {
        return blacklist.size();
    }

    /**
     * Clear all tokens from blacklist
     * For testing or emergency situations
     */
    public void clear() {
        int size = blacklist.size();
        blacklist.clear();
        log.info("Cleared {} tokens from blacklist", size);
    }
}
