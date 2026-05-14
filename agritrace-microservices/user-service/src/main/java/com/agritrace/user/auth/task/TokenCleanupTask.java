package com.agritrace.auth.task;

import com.agritrace.auth.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * TokenCleanupTask - Phase 2.5
 * 
 * Background scheduled task for token maintenance
 * 
 * Purpose:
 * - Periodically cleanup expired refresh tokens from database
 * - Prevents database bloat from accumulating expired tokens
 * - Runs automatically without manual intervention
 * 
 * Schedule:
 * - Runs every hour (cron: "0 0 * * * *")
 * - At the start of each hour (00:00, 01:00, 02:00, etc.)
 * 
 * Safety:
 * - Does not throw exceptions (catches and logs errors)
 * - Does not affect request processing (runs in background)
 * - Transaction managed by RefreshTokenService
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TokenCleanupTask {

    private final RefreshTokenService refreshTokenService;

    /**
     * Cleanup expired refresh tokens
     * 
     * Scheduled to run every hour at minute 0
     * Example: 00:00:00, 01:00:00, 02:00:00, etc.
     */
    @Scheduled(cron = "0 0 * * * *")  // Run at the start of every hour
    public void cleanupExpiredTokens() {
        log.info("🧹 [Scheduled Task] Starting cleanup of expired refresh tokens");

        try {
            int deletedCount = refreshTokenService.cleanupExpiredTokens();

            if (deletedCount > 0) {
                log.info("✅ [Scheduled Task] Cleanup completed - {} expired token(s) deleted", deletedCount);
            } else {
                log.debug("✅ [Scheduled Task] Cleanup completed - No expired tokens found");
            }

        } catch (Exception e) {
            log.error("❌ [Scheduled Task] Error during token cleanup: {}", e.getMessage(), e);
        }
    }
}