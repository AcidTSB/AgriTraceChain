package com.agritrace.auth.service;

import com.agritrace.auth.dto.AuthResponse;
import com.agritrace.auth.dto.LoginRequest;
import com.agritrace.user.entity.User;
import com.agritrace.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit Tests for AuthService
 *
 * Tests:
 * 1. Login success → tokens generated
 * 2. Login failure → BadCredentialsException thrown
 * 3. Refresh token rotation → old revoked, new issued
 * 4. Logout → token blacklisted, refresh tokens revoked
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Tests")
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private CustomUserDetails testUserDetails;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .username("farmer01")
                .email("farmer01@agritrace.vn")
                .role(com.agritrace.user.entity.UserRole.FARMER)
                .build();

        testUserDetails = new CustomUserDetails(testUser);

        // Inject @Value field via reflection
        ReflectionTestUtils.setField(authService, "accessTokenExpiration", 900000L);
    }

    // =========================================================
    // Login Tests
    // =========================================================

    @Test
    @DisplayName("login: valid credentials → returns AuthResponse with tokens")
    void login_validCredentials_returnsTokens() {
        LoginRequest request = new LoginRequest("farmer01", "password123");

        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(testUserDetails);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(jwtService.generateAccessToken(anyMap(), eq(testUserDetails)))
                .thenReturn("mock.access.token");
        when(jwtService.generateRefreshToken(testUserDetails))
                .thenReturn("mock.refresh.token");

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock.access.token");
        assertThat(response.getRefreshToken()).isEqualTo("mock.refresh.token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getUsername()).isEqualTo("farmer01");
        assertThat(response.getRole()).isEqualTo("FARMER");
        assertThat(response.getExpiresIn()).isEqualTo(900L);

        // Verify refresh token was persisted
        verify(refreshTokenService).createRefreshToken(eq(testUser), eq("mock.refresh.token"));
    }

    @Test
    @DisplayName("login: invalid credentials → throws BadCredentialsException")
    void login_invalidCredentials_throwsBadCredentials() {
        LoginRequest request = new LoginRequest("farmer01", "wrongpassword");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid username or password");

        // Verify no tokens were generated on failed login
        verifyNoInteractions(jwtService);
        verifyNoInteractions(refreshTokenService);
    }

    @Test
    @DisplayName("login: generates different claims for ADMIN vs FARMER role")
    void login_differentRoles_differentClaims() {
        // Test ADMIN user
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .username("admin01")
                .role(com.agritrace.user.entity.UserRole.ADMIN)
                .build();
        CustomUserDetails adminDetails = new CustomUserDetails(adminUser);

        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(adminDetails);
        when(authenticationManager.authenticate(any())).thenReturn(mockAuth);
        when(jwtService.generateAccessToken(anyMap(), eq(adminDetails))).thenReturn("admin.token");
        when(jwtService.generateRefreshToken(adminDetails)).thenReturn("admin.refresh");

        AuthResponse response = authService.login(new LoginRequest("admin01", "pass"));

        assertThat(response.getRole()).isEqualTo("ADMIN");
        // Verify the claims map includes userId, username, role
        verify(jwtService).generateAccessToken(
                argThat(claims ->
                        "ADMIN".equals(claims.get("role")) &&
                        "admin01".equals(claims.get("username")) &&
                        adminUser.getId().toString().equals(claims.get("userId"))
                ),
                eq(adminDetails)
        );
    }

    // =========================================================
    // Refresh Token Tests
    // =========================================================

    @Test
    @DisplayName("refresh: valid token → rotates tokens (old revoked, new issued)")
    void refresh_validToken_rotatesTokens() {
        String oldRefreshToken = "old.refresh.token";
        when(jwtService.extractUsername(oldRefreshToken)).thenReturn("farmer01");
        when(refreshTokenService.verifyToken(oldRefreshToken)).thenReturn(new com.agritrace.auth.entity.RefreshToken());
        when(userRepository.findByUsername("farmer01")).thenReturn(Optional.of(testUser));
        when(jwtService.generateAccessToken(anyMap(), any())).thenReturn("new.access.token");
        when(jwtService.generateRefreshToken(any())).thenReturn("new.refresh.token");

        AuthResponse response = authService.refresh(oldRefreshToken);

        assertThat(response.getAccessToken()).isEqualTo("new.access.token");
        assertThat(response.getRefreshToken()).isEqualTo("new.refresh.token");

        // Critical: old token MUST be revoked before new one is issued
        var inOrder = inOrder(refreshTokenService);
        inOrder.verify(refreshTokenService).revokeToken(oldRefreshToken);
        inOrder.verify(refreshTokenService).createRefreshToken(eq(testUser), eq("new.refresh.token"));
    }

    @Test
    @DisplayName("refresh: reused/revoked token → throws RuntimeException")
    void refresh_revokedToken_throwsException() {
        String revokedToken = "revoked.refresh.token";
        when(jwtService.extractUsername(revokedToken)).thenReturn("farmer01");
        doThrow(new RuntimeException("Token has been revoked"))
                .when(refreshTokenService).verifyToken(revokedToken);

        assertThatThrownBy(() -> authService.refresh(revokedToken))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to refresh token");

        // Verify no new tokens were issued
        verify(jwtService, never()).generateAccessToken(anyMap(), any());
    }

    // =========================================================
    // Logout Tests
    // =========================================================

    @Test
    @DisplayName("logout: valid token → blacklisted + all refresh tokens revoked")
    void logout_validToken_blacklistsAndRevokes() {
        String accessToken = "valid.access.token";
        when(jwtService.extractUsername(accessToken)).thenReturn("farmer01");
        when(userRepository.findByUsername("farmer01")).thenReturn(Optional.of(testUser));

        // Mock extractClaim to return a future expiry
        java.util.Date futureDate = new java.util.Date(System.currentTimeMillis() + 900_000L);
        when(jwtService.extractClaim(eq(accessToken), any())).thenReturn(futureDate);
        when(refreshTokenService.revokeAllUserTokens(testUser)).thenReturn(2);

        authService.logout(accessToken);

        // Verify blacklist was called
        verify(tokenBlacklistService).blacklistToken(eq(accessToken), any());
        // Verify ALL refresh tokens were revoked
        verify(refreshTokenService).revokeAllUserTokens(testUser);
    }
}
