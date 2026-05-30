package com.agritrace.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
@Slf4j
public class JwtAuthenticationFilter implements GatewayFilter {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        
        // Skip auth for public endpoints
        if (isPublicEndpoint(request)) {
            return chain.filter(exchange);
        }
        
        // Extract token
        String token = extractToken(request);
        if (token == null) {
            log.warn("Missing Authorization header");
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        
        try {
            // Validate token
            Claims claims = validateToken(token);
            
            // Extract user info from token
            String userId = claims.get("userId", String.class);
            String username = claims.get("username", String.class);
            String role = claims.get("role", String.class);
            String facilityId = claims.get("facilityId", String.class);
            String region = claims.get("region", String.class);

            // Backward compatibility with tokens that only carry subject/roles
            if (username == null || username.isBlank()) {
                username = claims.getSubject();
            }
            if (role == null || role.isBlank()) {
                Object rolesClaim = claims.get("roles");
                if (rolesClaim instanceof List<?> roles && !roles.isEmpty() && roles.get(0) != null) {
                    role = String.valueOf(roles.get(0));
                }
            }

            if (!isAuthorized(request, role)) {
                log.warn("Authorization denied - path={}, method={}, role={}",
                        request.getPath(), request.getMethod(), role);
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }

            // userId is required for downstream ownership checks (e.g., trace-service)
            if (userId == null || userId.isBlank()) {
                log.warn("JWT missing required userId claim");
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            
            // Add headers to downstream services
            ServerHttpRequest.Builder requestBuilder = request.mutate()
                    .header("X-User-Id", userId)
                    .header("X-Gateway-Token", "agritrace-gateway-trusted-token");
            if (username != null && !username.isBlank()) {
                requestBuilder.header("X-Username", username);
            }
            if (role != null && !role.isBlank()) {
                requestBuilder.header("X-User-Role", role);
            }
            if (facilityId != null && !facilityId.isBlank()) {
                requestBuilder.header("X-User-Facility-Id", facilityId);
            }
            if (region != null && !region.isBlank()) {
                requestBuilder.header("X-User-Region", region);
            }
            ServerHttpRequest modifiedRequest = requestBuilder.build();
            
            log.debug("JWT validated - userId={}, role={}", userId, role);
            
            return chain.filter(exchange.mutate().request(modifiedRequest).build());
            
        } catch (Exception e) {
            log.error("JWT validation failed", e);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }
    
    private boolean isPublicEndpoint(ServerHttpRequest request) {
        String path = request.getPath().toString();
        HttpMethod method = request.getMethod();

        // Public read-only catalog endpoints for demo and consumer traceability.
        if (("/api/v1/products".equals(path) || path.startsWith("/api/v1/products/")) && HttpMethod.GET.equals(method)) {
            return true;
        }
        if (("/api/products".equals(path) || path.startsWith("/api/products/")) && HttpMethod.GET.equals(method)) {
            return true;
        }

        if (("/api/v1/batches".equals(path) || path.startsWith("/api/v1/batches/")) && HttpMethod.GET.equals(method)) {
            // /page endpoint requires authentication for X-User-Id and X-User-Role headers
            if (path.matches(".*/page/?$") || path.endsWith("/page")) {
                return false;
            }
            return true;
        }
        if (("/api/batches".equals(path) || path.startsWith("/api/batches/")) && HttpMethod.GET.equals(method)) {
            return true;
        }

        if ((path.startsWith("/api/public/trace/") || path.startsWith("/api/v1/trace-logs/public/")) && HttpMethod.GET.equals(method)) {
            return true;
        }

        if ((path.startsWith("/api/v1/media/qr/") || path.startsWith("/api/v1/qrcode/")) && HttpMethod.GET.equals(method)) {
            return true;
        }

        return path.contains("/auth/login") || 
               path.contains("/auth/register") ||
               path.contains("/auth/refresh") ||
               path.contains("/actuator/");
    }

    private boolean isAuthorized(ServerHttpRequest request, String roleHeader) {
        String role = normalizeRole(roleHeader);
        String path = request.getPath().toString();
        HttpMethod method = request.getMethod();

        if (method == null) {
            return false;
        }

        // Product catalog writes: ADMIN only.
        if ((path.startsWith("/api/v1/products") || path.startsWith("/api/products"))
                && !HttpMethod.GET.equals(method)) {
            return "ADMIN".equals(role);
        }

        // Batch creation and management: FARMER only.
        if ((path.startsWith("/api/v1/batches") || path.startsWith("/api/batches"))
                && !HttpMethod.GET.equals(method)) {
            return "FARMER".equals(role);
        }

        // Farm endpoints are farmer-owned resources.
        if (path.startsWith("/api/v1/farms") || path.startsWith("/api/farms")) {
            if (HttpMethod.GET.equals(method) && path.matches(".*/count/?$")) {
                return "ADMIN".equals(role);
            }
            if (HttpMethod.GET.equals(method) && path.matches(".*/my/?$")) {
                return "FARMER".equals(role);
            }
            if (HttpMethod.GET.equals(method) && path.matches(".*/page/?$")) {
                return "ADMIN".equals(role);
            }
            if (HttpMethod.GET.equals(method)
                    && ("/api/v1/farms".equals(path)
                    || "/api/v1/farms/".equals(path)
                    || "/api/farms".equals(path)
                    || "/api/farms/".equals(path))) {
                return "ADMIN".equals(role);
            }
            // POST create farm = FARMER; other GET endpoints = FARMER
            if (HttpMethod.GET.equals(method)) {
                return "FARMER".equals(role) || "ADMIN".equals(role);
            }
            return "FARMER".equals(role);
        }

        // User management endpoints: ADMIN only.
        if (path.startsWith("/api/v1/users") || path.startsWith("/api/users")) {
            if (isCurrentUserEndpoint(path) && (HttpMethod.GET.equals(method) || HttpMethod.PUT.equals(method))) {
                // Allow any authenticated token to read/update its own profile via /users/me.
                // Ownership is enforced downstream by X-User-Id from JWT.
                return true;
            }
            return "ADMIN".equals(role);
        }

        // Trace write: FARMER/INSPECTOR; read can stay authenticated/public via endpoint policy.
        if ((path.startsWith("/api/v1/trace-logs") || path.startsWith("/api/trace-logs"))
                && HttpMethod.POST.equals(method)) {
            return "FARMER".equals(role) || "INSPECTOR".equals(role);
        }

        // Audit logs: ADMIN only — contains security-sensitive event history.
        if (path.startsWith("/api/v1/audit-logs") || path.startsWith("/api/audit-logs")) {
            return "ADMIN".equals(role);
        }

        // Internal search: all authenticated roles — cross-role explorer feature.
        if (path.startsWith("/api/v1/internal/search") || path.startsWith("/api/internal/search")) {
            return role != null && !role.isBlank();
        }

        // Notification endpoints: any authenticated user (self-access enforced by X-User-Id downstream).
        if (path.startsWith("/api/v1/notifications") || path.startsWith("/api/notifications")) {
            return role != null && !role.isBlank();
        }

        return true;
    }

    private String normalizeRole(String roleHeader) {
        if (roleHeader == null || roleHeader.isBlank()) {
            return "";
        }

        String normalized = roleHeader.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        return normalized;
    }

    private boolean isCurrentUserEndpoint(String path) {
        return "/api/v1/users/me".equals(path)
                || "/api/v1/users/me/".equals(path)
                || "/api/users/me".equals(path)
                || "/api/users/me/".equals(path);
    }
    
    private String extractToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
    
    private Claims validateToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
