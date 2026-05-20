package com.agritrace.auth.service;

import com.agritrace.auth.dto.AuthResponse;
import com.agritrace.auth.dto.LoginRequest;
import com.agritrace.auth.service.CustomUserDetails;
import com.agritrace.user.entity.User;
import com.agritrace.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * AuthService - Phase 2.4
 * 
 * Business logic layer for authentication operations
 * 
 * Responsibilities:
 * - Handle login logic
 * - Coordinate authentication with Spring Security
 * - Generate JWT tokens
 * - Manage refresh tokens
 * - Handle logout and token revocation
 * 
 * Operations:
 * - Login: Authenticate and generate tokens
 * - Refresh: Generate new access token from refresh token
 * - Logout: Revoke access and refresh tokens
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final TokenBlacklistService tokenBlacklistService;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    /**
     * Login user and generate JWT tokens
     * 
     * Process:
     * 1. Authenticate username/password with Spring Security
     * 2. Extract UserDetails from Authentication (no additional DB query)
     * 3. Generate access token (15 minutes)
     * 4. Create refresh token in database (7 days)
     * 5. Generate JWT refresh token
     * 6. Build and return authentication response
     * 
     * @param request Login request containing username and password
     * @return AuthResponse with JWT tokens and user info
     * @throws BadCredentialsException if credentials are invalid
     * @throws UsernameNotFoundException if user not found
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());

        try {
            // Step 1: Authenticate with Spring Security
            // This will:
            // - Call CustomUserDetailsService.loadUserByUsername()
            // - Verify password with PasswordEncoder
            // - Throw BadCredentialsException if credentials invalid
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            log.debug("Authentication successful for user: {}", request.getUsername());

            // Step 2: Extract UserDetails from Authentication (no additional DB query)
            // Authentication already contains loaded UserDetails from CustomUserDetailsService
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            User user = userDetails.getUser();

            // Step 3: Generate access token (JWT) with gateway-compatible claims
            Map<String, Object> accessClaims = new HashMap<>();
            accessClaims.put("userId", user.getId().toString());
            accessClaims.put("username", user.getUsername());
            accessClaims.put("role", user.getRole().name());
            String accessToken = jwtService.generateAccessToken(accessClaims, userDetails);

            // Step 4: Generate JWT refresh token
            String refreshToken = jwtService.generateRefreshToken(userDetails);
            // Step 5: Persist the exact refresh token returned to client
            refreshTokenService.createRefreshToken(user, refreshToken);

            log.info("Login successful for user: {} with role: {}", user.getUsername(), user.getRole());

            // Step 6: Build response
            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(accessTokenExpiration / 1000)  // Convert to seconds
                    .username(user.getUsername())
                    .role(user.getRole().name())
                    .build();

        } catch (BadCredentialsException e) {
            log.warn("Login failed for user: {} - Invalid credentials", request.getUsername());
            throw new BadCredentialsException("Invalid username or password");
        } catch (Exception e) {
            log.error("Login error for user: {} - {}", request.getUsername(), e.getMessage());
            throw e;
        }
    }

    /**
     * Refresh access token using refresh token WITH ROTATION
     * 
     * Security: Refresh Token Rotation Strategy
     * - Old refresh token is revoked immediately
     * - New refresh token is generated
     * - Prevents token reuse if leaked
     * - Limits attack window to single use
     * 
     * Process:
     * 1. Verify refresh token (check DB, expiration, revocation)
     * 2. Extract user from refresh token
     * 3. Generate new access token
     * 4. ROTATE: Revoke old refresh token + Generate new one
     * 5. Return new tokens
     * 
     * Security Benefits:
     * - If token leaked: Only usable once
     * - Legitimate user gets new token
     * - Attacker's token becomes invalid
     * 
     * @param refreshToken The refresh token JWT string
     * @return AuthResponse with new access token AND new refresh token
     * @throws RuntimeException if refresh token invalid
     */
    @Transactional
    public AuthResponse refresh(String refreshToken) {
        log.info("Refresh token request received");

        try {
            // Step 1: Extract username from JWT refresh token
            String username = jwtService.extractUsername(refreshToken);
            
            log.debug("Extracted username from refresh token: {}", username);

            // Step 2: Verify refresh token exists in database and is valid
            // This will throw exception if token invalid, expired, or revoked
            refreshTokenService.verifyToken(refreshToken);

            // Step 3: Load user
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

            // Step 4: Create UserDetails
            CustomUserDetails userDetails = new CustomUserDetails(user);

            // Step 5: Generate new access token with gateway-compatible claims
            Map<String, Object> accessClaims = new HashMap<>();
            accessClaims.put("userId", user.getId().toString());
            accessClaims.put("username", user.getUsername());
            accessClaims.put("role", user.getRole().name());
            String newAccessToken = jwtService.generateAccessToken(accessClaims, userDetails);

            // ========================================
            // PHASE 2.4 SECURITY: REFRESH TOKEN ROTATION
            // ========================================
            // Step 6: Revoke old refresh token (prevent reuse)
            refreshTokenService.revokeToken(refreshToken);
            log.debug("Old refresh token revoked for security");

            // Step 7: Create new refresh token in database
            // Step 7: Generate JWT for new refresh token
            String newRefreshToken = jwtService.generateRefreshToken(userDetails);
            // Step 8: Persist rotated refresh token
            refreshTokenService.createRefreshToken(user, newRefreshToken);

            log.info("Tokens rotated successfully for user: {}", username);

            // Step 9: Build response with NEW tokens
            return AuthResponse.builder()
                    .accessToken(newAccessToken)           // NEW access token
                    .refreshToken(newRefreshToken)         // NEW refresh token (rotated)
                    .tokenType("Bearer")
                    .expiresIn(accessTokenExpiration / 1000)
                    .username(user.getUsername())
                    .role(user.getRole().name())
                    .build();

        } catch (Exception e) {
            log.error("Token refresh error: {}", e.getMessage());
            throw new RuntimeException("Failed to refresh token: " + e.getMessage());
        }
    }

    /**
     * Logout user and revoke tokens
     * 
     * Process:
     * 1. Extract username from access token
     * 2. Load user from database
     * 3. Blacklist access token (in-memory)
     * 4. Revoke ALL refresh tokens (database)
     * 
     * Security:
     * - Access token blacklisted until expiration
     * - All refresh tokens deleted (ends all sessions)
     * - User must login again on all devices
     * 
     * @param accessToken The access token to revoke
     */
    @Transactional
    public void logout(String accessToken) {
        log.info("Logout request received");

        try {
            // Step 1: Extract username from access token
            String username = jwtService.extractUsername(accessToken);
            
            log.debug("Logout for user: {}", username);

            // Step 2: Load user
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

            // Step 3: Blacklist access token (in-memory)
            // Extract expiration from token for auto-cleanup
            java.time.Instant expiration = jwtService.extractClaim(accessToken, 
                    io.jsonwebtoken.Claims::getExpiration).toInstant();
            tokenBlacklistService.blacklistToken(accessToken, expiration);

            // Step 4: Revoke ALL refresh tokens (delete from database)
            int revokedCount = refreshTokenService.revokeAllUserTokens(user);

            log.info("Logout successful for user: {} - Revoked {} refresh token(s)", 
                    username, revokedCount);

        } catch (Exception e) {
            log.error("Logout error: {}", e.getMessage());
            throw new RuntimeException("Failed to logout: " + e.getMessage());
        }
    }
}
