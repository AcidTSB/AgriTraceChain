"""
Part 3: API Gateway Implementation
"""

import os
from pathlib import Path

BASE_PATH = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices")

def create_directories(service_name):
    base = BASE_PATH / service_name
    dirs = [
        "src/main/java/com/agritrace",
        "src/main/resources",
        "src/test/java/com/agritrace"
    ]
    for dir_path in dirs:
        (base / dir_path).mkdir(parents=True, exist_ok=True)
    return base

# ===== API GATEWAY =====

API_GATEWAY_POM = """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.3</version>
    </parent>

    <groupId>com.agritrace</groupId>
    <artifactId>api-gateway</artifactId>
    <version>1.0.0</version>
    <name>AgriTrace API Gateway</name>

    <properties>
        <java.version>21</java.version>
        <spring-cloud.version>2023.0.3</spring-cloud.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-gateway</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.5</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.5</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.5</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
"""

API_GATEWAY_APPLICATION_YML = """spring:
  application:
    name: api-gateway
  
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: ${USER_SERVICE_URL:http://localhost:8081}
          predicates:
            - Path=/api/users/**, /api/auth/**
          filters:
            - StripPrefix=0
        
        - id: product-service
          uri: ${PRODUCT_SERVICE_URL:http://localhost:8082}
          predicates:
            - Path=/api/batches/**, /api/products/**
          filters:
            - StripPrefix=0
        
        - id: trace-service
          uri: ${TRACE_SERVICE_URL:http://localhost:8083}
          predicates:
            - Path=/api/trace/**, /api/trace-logs/**
          filters:
            - StripPrefix=0
        
        - id: media-service
          uri: ${MEDIA_SERVICE_URL:http://localhost:8084}
          predicates:
            - Path=/api/media/**, /api/qrcode/**
          filters:
            - StripPrefix=0
      
      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins: "*"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
            allowedHeaders: "*"

server:
  port: ${SERVER_PORT:8080}

jwt:
  secret: ${JWT_SECRET:agritrace-super-secret-key-2026-must-be-at-least-256-bits}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,gateway
  endpoint:
    health:
      show-details: always

logging:
  level:
    org.springframework.cloud.gateway: DEBUG
    com.agritrace: DEBUG
"""

API_GATEWAY_DOCKERFILE = """FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S agritrace && adduser -S agritrace -G agritrace
COPY --from=build /app/target/*.jar app.jar
RUN chown -R agritrace:agritrace /app
USER agritrace
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
"""

API_GATEWAY_APPLICATION = """package com.agritrace.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
"""

JWT_AUTHENTICATION_FILTER = """package com.agritrace.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
@Slf4j
public class JwtAuthenticationFilter implements GatewayFilter {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        
        // Skip auth for public endpoints
        String path = request.getPath().toString();
        if (isPublicEndpoint(path)) {
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
            
            // Add headers to downstream services
            ServerHttpRequest modifiedRequest = request.mutate()
                    .header("X-User-Id", userId)
                    .header("X-Username", username)
                    .header("X-User-Role", role)
                    .build();
            
            log.debug("JWT validated - userId={}, role={}", userId, role);
            
            return chain.filter(exchange.mutate().request(modifiedRequest).build());
            
        } catch (Exception e) {
            log.error("JWT validation failed", e);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }
    
    private boolean isPublicEndpoint(String path) {
        return path.contains("/auth/login") || 
               path.contains("/auth/register") ||
               path.contains("/actuator/");
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
"""

GATEWAY_CONFIG = """package com.agritrace.gateway.config;

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
                .route("user-service", r -> r
                        .path("/api/users/**", "/api/auth/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("http://localhost:8081"))
                .route("product-service", r -> r
                        .path("/api/batches/**", "/api/products/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("http://localhost:8082"))
                .route("trace-service", r -> r
                        .path("/api/trace/**", "/api/trace-logs/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("http://localhost:8083"))
                .route("media-service", r -> r
                        .path("/api/media/**", "/api/qrcode/**")
                        .filters(f -> f.filter(jwtAuthenticationFilter))
                        .uri("http://localhost:8084"))
                .build();
    }
}
"""

def generate_api_gateway():
    print("📦 Generating API Gateway...")
    base = create_directories("api-gateway")
    
    with open(base / "pom.xml", 'w', encoding='utf-8') as f:
        f.write(API_GATEWAY_POM)
    with open(base / "Dockerfile", 'w', encoding='utf-8') as f:
        f.write(API_GATEWAY_DOCKERFILE)
    with open(base / "src/main/resources/application.yml", 'w', encoding='utf-8') as f:
        f.write(API_GATEWAY_APPLICATION_YML)
    
    java_base = base / "src/main/java/com/agritrace/gateway"
    java_base.mkdir(parents=True, exist_ok=True)
    
    with open(java_base / "ApiGatewayApplication.java", 'w', encoding='utf-8') as f:
        f.write(API_GATEWAY_APPLICATION)
    
    (java_base / "filter").mkdir(exist_ok=True)
    with open(java_base / "filter/JwtAuthenticationFilter.java", 'w', encoding='utf-8') as f:
        f.write(JWT_AUTHENTICATION_FILTER)
    
    (java_base / "config").mkdir(exist_ok=True)
    with open(java_base / "config/GatewayConfig.java", 'w', encoding='utf-8') as f:
        f.write(GATEWAY_CONFIG)
    
    print("✅ API Gateway generated!")

def main():
    print("🚀 Generating API Gateway...")
    print()
    
    generate_api_gateway()
    
    print()
    print("✅ API Gateway Complete!")
    print()
    print("🎉 ALL MICROSERVICES GENERATED!")
    print("=" * 50)
    print("Services created:")
    print("  1. User Service     (8081 / gRPC 9091)")
    print("  2. Product Service  (8082 / gRPC 9092)")
    print("  3. Trace Service    (8083 / gRPC 9093)")
    print("  4. Media Service    (8084)")
    print("  5. API Gateway      (8080)")
    print("=" * 50)

if __name__ == "__main__":
    main()
