package com.agritrace.common.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;

/**
 * HashUtils - Phase 3.3 Architect-Level Refinement
 * 
 * CRITICAL: Centralized hash calculation for data integrity
 * 
 * Design Principles:
 * 1. **Single Responsibility**: Only hash calculation logic
 * 2. **DRY (Don't Repeat Yourself)**: Used by both creation and verification
 * 3. **Encapsulation**: Algorithm changes only affect this class
 * 4. **Testability**: Easy to unit test hash consistency
 * 
 * Used By:
 * - TraceLogServiceImpl (Phase 3.2): Hash creation during log creation
 * - TraceLogVerificationServiceImpl (Phase 3.3): Hash verification
 * 
 * Algorithm Evolution:
 * - Current: SHA-256
 * - Future: SHA-512, Blake2b, or custom algorithm
 * - Change ONLY HERE, all services auto-update
 * 
 * Hash Format:
 * SHA-256(batchId | action | createdAt | createdBy)
 * - Pipe delimiter (|) prevents concatenation collision
 * - Null-safe conversion
 * - Deterministic (same input → same output)
 * 
 * Why Static Methods?
 * - Stateless utility (no instance state)
 * - Thread-safe by design
 * - Easy to call from any service
 * 
 * CRITICAL CONSISTENCY RULES:
 * - MUST use Instant.toString() for timestamp (NO formatting)
 * - MUST use pipe delimiter (|) for collision prevention
 * - MUST use safe() for null protection
 * - DO NOT change algorithm without migration plan
 */
@Slf4j
public final class HashUtils {

    // Private constructor prevents instantiation
    private HashUtils() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }

    /**
     * Calculate SHA-256 hash for trace log integrity
     * 
     * CRITICAL: This is THE SINGLE SOURCE OF TRUTH for hash calculation
     * 
     * Algorithm:
     * SHA-256(batchId | action | createdAt | createdBy)
     * 
     * Parameters MUST be strings:
     * - batchId: UUID.toString()
     * - action: String (action type)
     * - createdAt: Instant.toString() (CRITICAL - NO formatting!)
     * - createdBy: UUID.toString()
     * 
     * Why This Format?
     * - Pipe delimiter (|): Prevents concatenation collision
     *   Example: "12" + "3" = "123" vs "12|3" ≠ "1|23"
     * - Null-safe: Converts null to empty string
     * - Deterministic: Same input → same output (always)
     * 
     * Usage Example:
     * ```java
     * // Creation (Phase 3.2)
     * String hash = HashUtils.calculateTraceLogHash(
     *     batch.getId().toString(),
     *     "PLANTING",
     *     Instant.now().toString(),
     *     user.getId().toString()
     * );
     * traceLog.setHash(hash);
     * 
     * // Verification (Phase 3.3)
     * String recalculated = HashUtils.calculateTraceLogHash(
     *     log.getBatch().getId().toString(),
     *     log.getAction(),
     *     log.getCreatedAt().toString(),
     *     log.getCreatedBy().getId().toString()
     * );
     * boolean valid = recalculated.equals(log.getHash());
     * ```
     * 
     * @param batchId Batch ID as string
     * @param action Activity type
     * @param createdAt Timestamp as Instant.toString()
     * @param createdBy User ID as string
     * @return SHA-256 hash (64-character hex string)
     */
    public static String calculateTraceLogHash(String batchId, String action, 
                                                String createdAt, String createdBy) {
        // CRITICAL: Use pipe delimiter to prevent concatenation collision
        String raw = String.join("|",
                safe(batchId),
                safe(action),
                safe(createdAt),
                safe(createdBy)
        );

        // SHA-256 hash (64 characters hex)
        String hash = DigestUtils.sha256Hex(raw);

        log.trace("Hash calculation - Raw: {}, Hash: {}...",
                raw.substring(0, Math.min(50, raw.length())),
                hash.substring(0, 8));

        return hash;
    }

    /**
     * Null-safe string conversion
     * 
     * Prevents "null" string in hash when field is null
     * 
     * Example:
     * - Without safe(): location=null → "null" in hash
     * - With safe(): location=null → "" in hash
     * 
     * @param value Object to convert
     * @return String value or empty string if null
     */
    private static String safe(Object value) {
        return value == null ? "" : value.toString();
    }

    /**
     * FUTURE: Algorithm migration helper
     * 
     * When upgrading hash algorithm (e.g., SHA-256 → SHA-512):
     * 1. Create new method: calculateTraceLogHashV2()
     * 2. Add version field to TraceLog entity
     * 3. Migration script recalculates all hashes
     * 4. Verification checks version and uses correct algorithm
     * 
     * Example:
     * ```java
     * public static String calculateTraceLogHashV2(...) {
     *     String raw = String.join("|", ...);
     *     return DigestUtils.sha512Hex(raw);  // SHA-512
     * }
     * 
     * // In verification
     * String recalculated = log.getHashVersion() == 2
     *     ? HashUtils.calculateTraceLogHashV2(...)
     *     : HashUtils.calculateTraceLogHash(...);
     * ```
     */
    // TODO Phase 4: Implement versioned hash algorithm support

    /**
     * Validate hash format
     * 
     * Checks if string is valid SHA-256 hash
     * - Length: 64 characters
     * - Characters: 0-9, a-f (hexadecimal)
     * 
     * Use for input validation
     * 
     * @param hash Hash string to validate
     * @return true if valid SHA-256 hash format
     */
    public static boolean isValidSha256Hash(String hash) {
        if (hash == null || hash.length() != 64) {
            return false;
        }
        return hash.matches("^[a-f0-9]{64}$");
    }
}
