package com.agritrace.gateway.config;

import com.agritrace.gateway.filter.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class GatewayConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("user-service-v1", r -> r
                        .path("/api/v1/users/**", "/api/v1/auth/**", "/api/v1/farms/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("lb://user-service"))
                .route("user-service-legacy", r -> r
                        .path("/api/users/**", "/api/auth/**", "/api/farms/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter)
                                .rewritePath("/api/(?<segment>.*)", "/api/v1/${segment}"))
                        .uri("lb://user-service"))
                .route("product-service-v1", r -> r
                        .path("/api/v1/batches/**", "/api/v1/products/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("lb://product-service"))
                .route("product-service-legacy", r -> r
                        .path("/api/batches/**", "/api/products/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter)
                                .rewritePath("/api/(?<segment>.*)", "/api/v1/${segment}"))
                        .uri("lb://product-service"))
                .route("trace-service-v1", r -> r
                        .path("/api/v1/trace/**", "/api/v1/trace-logs/**", "/api/v1/audit-logs/**", "/api/v1/internal/search/**", "/api/public/trace/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter)
                                .rewritePath("/api/public/trace/(?<segment>.*)", "/api/v1/trace-logs/public/${segment}"))
                        .uri("lb://trace-service"))
                .route("trace-service-legacy", r -> r
                        .path("/api/trace/**", "/api/trace-logs/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter)
                                .rewritePath("/api/trace-logs/(?<segment>.*)", "/api/v1/trace-logs/${segment}")
                                .rewritePath("/api/trace/(?<segment>.*)", "/api/v1/trace/${segment}"))
                        .uri("lb://trace-service"))
                .route("media-service-v1", r -> r
                        .path("/api/v1/media/**", "/api/v1/qrcode/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("lb://media-service"))
                .route("media-service-legacy", r -> r
                        .path("/api/media/**", "/api/qrcode/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter)
                                .rewritePath("/api/media/(?<segment>.*)", "/api/v1/media/${segment}")
                                .rewritePath("/api/qrcode/(?<segment>.*)", "/api/v1/qrcode/${segment}"))
                        .uri("lb://media-service"))
                .build();
    }
}
