package com.agritrace.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.List; // <--- DÒNG IMPORT BỊ THIẾU ĐÃ ĐƯỢC THÊM VÀO
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * JWT Service - Phase 2.2
 * * Production-ready JWT token management service
 * Handles token generation, validation, and claims extraction
 * * Features:
 * - Access Token generation (15 minutes)
 * - Refresh Token generation (7 days)
 * - Token validation
 * - Claims extraction
 * - Thread-safe operations
 * * Security:
 * - HMAC SHA-256 algorithm
 * - 256-bit secret key
 * - Secure token signing
 * - No sensitive data exposure
 */
@Service
@Slf4j
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    /**
     * Generate access token with default claims
     * * Wrapper method that delegates to the core token generation method
     * with empty extra claims
     * * @param userDetails Spring Security UserDetails
     * @return JWT access token string
     */
    public String generateAccessToken(UserDetails userDetails) {
        return generateAccessToken(new HashMap<>(), userDetails);
    }

    /**
     * Generate access token with custom claims (CORE METHOD)
     * * This is the core token generation method that:
     * - Merges extra claims with default claims
     * - Adds user roles/authorities as array
     * - Sets expiration time
     * - Signs token with secret key
     * * @param extraClaims Additional claims to include in token (e.g., user ID, permissions)
     * @param userDetails Spring Security UserDetails containing username and authorities
     * @return JWT access token string
     */
    public String generateAccessToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        log.debug("Generating access token for user: {}", userDetails.getUsername());
        
        // Extract roles as List (not comma-separated string)
        // This makes it easier for frontend to parse and use for RBAC/ABAC
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        
        // Build token with all claims
        return Jwts.builder()
                .claims(extraClaims)  // Add extra claims first
                .subject(userDetails.getUsername())  // Set subject (username)
                .claim("roles", roles)  // Add roles as array (not comma-separated string)
                .issuedAt(new Date(System.currentTimeMillis()))  // Token issue time
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))  // Expiration time
                .signWith(getSigningKey())  // Sign with secret key (HMAC SHA-256)
                .compact();
    }

    /**
     * Generate refresh token
     * * Refresh tokens:
     * - Have longer expiration (7 days)
     * - Used to obtain new access tokens
     * - Don't need to include roles (reduced payload)
     * - Still include username for validation
     * * @param userDetails Spring Security UserDetails
     * @return JWT refresh token string
     */
    public String generateRefreshToken(UserDetails userDetails) {
        log.debug("Generating refresh token for user: {}", userDetails.getUsername());
        
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extract username from token
     * * @param token JWT token string
     * @return Username (subject claim)
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extract specific claim from token using resolver function
     * * Generic method that allows extracting any claim using a resolver function
     * This provides flexibility for extracting different claim types
     * * @param token JWT token string
     * @param claimsResolver Function to extract specific claim from Claims object
     * @param <T> Type of the claim to extract
     * @return Extracted claim value
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extract all claims from token
     * * Parses and validates the JWT token, then extracts all claims
     * Uses the signing key to verify token integrity
     * * @param token JWT token string
     * @return Claims object containing all token claims
     * @throws io.jsonwebtoken.JwtException if token is invalid or expired
     */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())  // Verify signature
                .build()
                .parseSignedClaims(token)  // Parse and validate
                .getPayload();  // Extract claims
    }

    /**
     * Validate token against UserDetails
     * * Checks:
     * 1. Username in token matches UserDetails username
     * 2. Token is not expired
     * * @param token JWT token string
     * @param userDetails Spring Security UserDetails to validate against
     * @return true if token is valid, false otherwise
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            boolean isValid = username.equals(userDetails.getUsername()) && !isTokenExpired(token);
            
            if (isValid) {
                log.debug("Token validation successful for user: {}", username);
            } else {
                log.warn("Token validation failed for user: {}", username);
            }
            
            return isValid;
        } catch (Exception e) {
            log.error("Token validation error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Validate token (Phase 2.4 - Stateless validation)
     * * Checks ONLY:
     * 1. Token signature is valid
     * 2. Token is not expired
     * * NO database query needed - fully stateless
     * Used by JwtAuthenticationFilter for high-performance validation
     * * @param token JWT token string
     * @return true if token is valid (signature + not expired), false otherwise
     */
    public boolean isTokenValid(String token) {
        try {
            // This will throw exception if signature invalid or token expired
            extractAllClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            log.debug("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Check if token is expired
     * * @param token JWT token string
     * @return true if token is expired, false otherwise
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extract expiration date from token
     * * @param token JWT token string
     * @return Expiration date
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Get signing key from secret
     * * Converts the secret string into a SecretKey object
     * Uses HMAC SHA-256 algorithm
     * * Security Note:
     * - Secret key must be at least 256 bits (32 bytes)
     * - Key is generated from UTF-8 bytes of the secret string
     * - Same key used for signing and verification
     * * @return SecretKey for HMAC SHA-256
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}