package com.agritrace.auth.service;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        // Extract Authorization header
        final String authHeader = request.getHeader("Authorization");
        
        // Check if header exists and starts with "Bearer "
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No Bearer token found in request to: {}", request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            // Extract JWT token (remove "Bearer " prefix)
            final String jwt = authHeader.substring(7);

            // ========================================
            // PHASE 2.4: Check if token is blacklisted
            // O(1) lookup, in-memory only, NO DB
            // ========================================
            if (tokenBlacklistService.isBlacklisted(jwt)) {
                log.debug("Token is blacklisted, rejecting request");
                filterChain.doFilter(request, response);
                return;
            }
            
            // Extract username from token
            final String username = jwtService.extractUsername(jwt);
            
            log.debug("JWT token found for user: {}", username);
            
            // Check if user is not already authenticated
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                
                // ========================================
                // PHASE 2.4 OPTIMIZATION: NO DATABASE QUERY
                // Validate token signature and expiration
                // ========================================
                if (jwtService.isTokenValid(jwt)) {
                    log.debug("Token is valid for user: {}", username);

                    // Extract roles from JWT claims (NO DB QUERY)
                    @SuppressWarnings("unchecked")
                    List<String> roles = jwtService.extractClaim(jwt, claims -> claims.get("roles", List.class));

                    // Convert roles to GrantedAuthority
                    List<SimpleGrantedAuthority> authorities = roles != null 
                        ? roles.stream()
                            .map(SimpleGrantedAuthority::new)
                            .toList()
                        : List.of();
                    
                    // Create authentication token with username and roles from JWT
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username,   // Principal (username from token)
                            null,       // Credentials (not needed after authentication)
                            authorities // Authorities (roles from token)
                    );
                    
                    // Set additional details (IP address, session ID, etc.)
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    
                    // Set authentication in SecurityContext
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    log.debug("Authentication set in SecurityContext for user: {} with roles: {}", 
                            username, roles);
                } else {
                    log.warn("Invalid token for user: {}", username);
                }
            }
            
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.warn("JWT token expired: {}", e.getMessage());
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.warn("Invalid JWT signature: {}", e.getMessage());
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.warn("Malformed JWT token: {}", e.getMessage());
        } catch (io.jsonwebtoken.UnsupportedJwtException e) {
            log.warn("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT claims string is empty: {}", e.getMessage());
        } catch (Exception e) {
            log.error("JWT authentication error: {}", e.getMessage());
            // Don't set authentication - request will be treated as unauthenticated
        }
        
        // Continue filter chain
        filterChain.doFilter(request, response);
    }
}