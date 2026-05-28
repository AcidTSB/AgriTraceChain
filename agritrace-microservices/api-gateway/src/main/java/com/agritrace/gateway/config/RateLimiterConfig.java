package com.agritrace.gateway.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

import java.util.Objects;

/**
 * Rate Limiting Configuration using Redis Token Bucket Algorithm.
 *
 * <p>Architecture Decision: We use RedisRateLimiter (Token Bucket) via Spring Cloud Gateway's
 * built-in support. Redis is required because the gateway may scale horizontally; an in-memory
 * counter would be per-instance only.</p>
 *
 * <p>Security Impact: Prevents brute-force on /auth/login, protects downstream services from
 * overload, enforces fair-use per user/IP.</p>
 *
 * <p>Tradeoffs: Requires Redis availability. If Redis is down, rate-limiting is bypassed
 * (fail-open by default). For stricter security, set gateway.default-filters to deny on error.</p>
 */
@Slf4j
@Configuration
public class RateLimiterConfig {

    /**
     * Primary KeyResolver: extracts JWT subject from X-Username header injected by JwtAuthenticationFilter.
     * Falls back to remote IP address for unauthenticated requests.
     *
     * <p>This ensures per-user limiting for authenticated calls, preventing a single
     * compromised account from exhausting resources.</p>
     */
    @Bean
    @Primary
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // Try JWT username header (set by JwtAuthenticationFilter for authenticated requests)
            String username = exchange.getRequest().getHeaders().getFirst("X-Username");
            if (username != null && !username.isBlank()) {
                return Mono.just("user:" + username);
            }
            // Fallback to IP address for anonymous requests
            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? Objects.requireNonNull(exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress()
                    : "unknown";
            return Mono.just("ip:" + ip);
        };
    }

    /**
     * IP-only KeyResolver for auth endpoints (login, register).
     * Login attempts must be rate-limited strictly by IP to prevent credential stuffing.
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? Objects.requireNonNull(exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress()
                    : "unknown";
            return Mono.just("ip:" + ip);
        };
    }

    /**
     * Default rate limiter: 20 requests/second sustained, burst up to 40.
     * Applied to most API routes.
     *
     * <p>replenishRate = tokens added per second (sustained throughput)
     * burstCapacity = max tokens in bucket (peak burst)</p>
     */
    @Bean
    @Primary
    public RedisRateLimiter defaultRateLimiter() {
        // replenishRate=20, burstCapacity=40, requestedTokens=1
        return new RedisRateLimiter(20, 40, 1);
    }

    /**
     * Strict rate limiter for auth endpoints.
     * 5 req/s sustained, burst 10 – prevents brute-force login attacks.
     */
    @Bean
    public RedisRateLimiter authRateLimiter() {
        return new RedisRateLimiter(5, 10, 1);
    }

    /**
     * Relaxed rate limiter for public read endpoints (product catalog, public trace).
     * 50 req/s – allows high-traffic consumer-facing QR scan pages.
     */
    @Bean
    public RedisRateLimiter publicRateLimiter() {
        return new RedisRateLimiter(50, 100, 1);
    }
}
