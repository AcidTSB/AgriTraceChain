"""
Part 2: Product Service, Trace Service, Media Service Full Implementation
"""

import os
from pathlib import Path

BASE_PATH = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices")

def create_directories(service_name):
    base = BASE_PATH / service_name
    dirs = [
        "src/main/java/com/agritrace",
        "src/main/resources",
        "src/main/resources/db/migration",
        "src/test/java/com/agritrace"
    ]
    for dir_path in dirs:
        (base / dir_path).mkdir(parents=True, exist_ok=True)
    return base

# ===== PRODUCT SERVICE =====

PRODUCT_SERVICE_POM = """<?xml version="1.0" encoding="UTF-8"?>
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
    <artifactId>product-service</artifactId>
    <version>1.0.0</version>
    <name>AgriTrace Product Service</name>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>net.devh</groupId>
            <artifactId>grpc-spring-boot-starter</artifactId>
            <version>2.15.0.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>com.agritrace</groupId>
            <artifactId>common-proto</artifactId>
            <version>1.0.0</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
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

PRODUCT_SERVICE_APPLICATION_YML = """spring:
  application:
    name: product-service
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5434/product_db}
    username: ${SPRING_DATASOURCE_USERNAME:agritrace}
    password: ${SPRING_DATASOURCE_PASSWORD:agritrace2026}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true
    baseline-on-migrate: true
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

server:
  port: ${SERVER_PORT:8082}

grpc:
  server:
    port: ${GRPC_SERVER_PORT:9092}
  client:
    user-service:
      address: ${GRPC_USER_SERVICE:static://localhost:9091}
      negotiationType: plaintext

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
"""

PRODUCT_SERVICE_DOCKERFILE = """FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY ../common-proto /common-proto
WORKDIR /common-proto
RUN mvn clean install -DskipTests
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
EXPOSE 8082 9092
ENTRYPOINT ["java", "-jar", "app.jar"]
"""

PRODUCT_SERVICE_APPLICATION = """package com.agritrace.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ProductServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProductServiceApplication.class, args);
    }
}
"""

BATCH_ENTITY = """package com.agritrace.product.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Batch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "batch_code", unique = true, nullable = false)
    private String batchCode;
    
    @Column(name = "product_name", nullable = false)
    private String productName;
    
    @Column(name = "product_type")
    private String productType;
    
    @Column(name = "harvest_date")
    private LocalDateTime harvestDate;
    
    private Integer quantity;
    
    private String unit;
    
    @Column(name = "facility_id")
    private UUID facilityId;
    
    @Column(name = "facility_name")
    private String facilityName;
    
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    
    @Column(name = "owner_name")
    private String ownerName;
    
    @Column(name = "is_compromised", nullable = false)
    @Builder.Default
    private Boolean isCompromised = false;
    
    @Column(name = "qr_code_url")
    private String qrCodeUrl;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
"""

BATCH_REPOSITORY = """package com.agritrace.product.repository;

import com.agritrace.product.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BatchRepository extends JpaRepository<Batch, UUID> {
    Optional<Batch> findByBatchCode(String batchCode);
}
"""

BATCH_GRPC_SERVICE = """package com.agritrace.product.grpc;

import com.agritrace.proto.batch.*;
import com.agritrace.proto.common.Status;
import com.agritrace.product.entity.Batch;
import com.agritrace.product.repository.BatchRepository;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
@Slf4j
public class BatchGrpcService extends BatchServiceGrpc.BatchServiceImplBase {
    
    private final BatchRepository batchRepository;
    
    @Override
    public void getBatchById(GetBatchByIdRequest request,
                            StreamObserver<BatchResponse> responseObserver) {
        log.debug("gRPC call: getBatchById - batchId={}", request.getBatchId());
        
        try {
            UUID batchId = UUID.fromString(request.getBatchId());
            Batch batch = batchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
            
            BatchResponse response = buildBatchResponse(batch, 200, "Success");
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error in getBatchById", e);
            BatchResponse errorResponse = BatchResponse.newBuilder()
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage("Batch not found: " + e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void getBatchByCode(GetBatchByCodeRequest request,
                              StreamObserver<BatchResponse> responseObserver) {
        try {
            Batch batch = batchRepository.findByBatchCode(request.getBatchCode())
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
            
            BatchResponse response = buildBatchResponse(batch, 200, "Success");
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            BatchResponse errorResponse = BatchResponse.newBuilder()
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage(e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void validateBatchOwnership(ValidateBatchOwnershipRequest request,
                                      StreamObserver<BatchOwnershipResponse> responseObserver) {
        try {
            UUID batchId = UUID.fromString(request.getBatchId());
            UUID userId = UUID.fromString(request.getUserId());
            
            Batch batch = batchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
            
            boolean isOwner = batch.getOwnerId().equals(userId);
            
            BatchOwnershipResponse response = BatchOwnershipResponse.newBuilder()
                    .setBatchId(batch.getId().toString())
                    .setUserId(userId.toString())
                    .setIsOwner(isOwner)
                    .setStatus(Status.newBuilder()
                            .setCode(200)
                            .setMessage("Validation complete")
                            .build())
                    .build();
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            BatchOwnershipResponse errorResponse = BatchOwnershipResponse.newBuilder()
                    .setIsOwner(false)
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage(e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    private BatchResponse buildBatchResponse(Batch batch, int statusCode, String statusMessage) {
        return BatchResponse.newBuilder()
                .setId(batch.getId().toString())
                .setBatchCode(batch.getBatchCode())
                .setProductName(batch.getProductName())
                .setProductType(batch.getProductType() != null ? batch.getProductType() : "")
                .setQuantity(batch.getQuantity() != null ? batch.getQuantity() : 0)
                .setUnit(batch.getUnit() != null ? batch.getUnit() : "")
                .setOwnerId(batch.getOwnerId().toString())
                .setOwnerName(batch.getOwnerName() != null ? batch.getOwnerName() : "")
                .setIsCompromised(batch.getIsCompromised())
                .setCreatedAt(batch.getCreatedAt().toString())
                .setStatus(Status.newBuilder()
                        .setCode(statusCode)
                        .setMessage(statusMessage)
                        .build())
                .build();
    }
}
"""

USER_GRPC_CLIENT = """package com.agritrace.product.grpc;

import com.agritrace.proto.user.*;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class UserGrpcClient {
    
    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;
    
    public UserResponse getUserById(String userId) {
        log.debug("Calling user-service via gRPC: getUserById({})", userId);
        GetUserByIdRequest request = GetUserByIdRequest.newBuilder()
                .setUserId(userId)
                .build();
        return userServiceStub.getUserById(request);
    }
    
    public UserResponse getUserByUsername(String username) {
        log.debug("Calling user-service via gRPC: getUserByUsername({})", username);
        GetUserByUsernameRequest request = GetUserByUsernameRequest.newBuilder()
                .setUsername(username)
                .build();
        return userServiceStub.getUserByUsername(request);
    }
}
"""

PRODUCT_FLYWAY = """-- Product Service Database Schema

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(100),
    harvest_date TIMESTAMP,
    quantity INTEGER,
    unit VARCHAR(50),
    facility_id UUID,
    facility_name VARCHAR(255),
    owner_id UUID NOT NULL,
    owner_name VARCHAR(255),
    is_compromised BOOLEAN NOT NULL DEFAULT false,
    qr_code_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_code ON batches(batch_code);
CREATE INDEX idx_batches_owner ON batches(owner_id);
CREATE INDEX idx_batches_facility ON batches(facility_id);
"""

# ===== TRACE SERVICE =====

TRACE_SERVICE_POM = """<?xml version="1.0" encoding="UTF-8"?>
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
    <artifactId>trace-service</artifactId>
    <version>1.0.0</version>
    <name>AgriTrace Trace Service</name>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>net.devh</groupId>
            <artifactId>grpc-spring-boot-starter</artifactId>
            <version>2.15.0.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>com.agritrace</groupId>
            <artifactId>common-proto</artifactId>
            <version>1.0.0</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
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

TRACE_SERVICE_APPLICATION_YML = """spring:
  application:
    name: trace-service
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5435/trace_db}
    username: ${SPRING_DATASOURCE_USERNAME:agritrace}
    password: ${SPRING_DATASOURCE_PASSWORD:agritrace2026}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true
    baseline-on-migrate: true
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

server:
  port: ${SERVER_PORT:8083}

grpc:
  server:
    port: ${GRPC_SERVER_PORT:9093}
  client:
    user-service:
      address: ${GRPC_USER_SERVICE:static://localhost:9091}
      negotiationType: plaintext
    product-service:
      address: ${GRPC_PRODUCT_SERVICE:static://localhost:9092}
      negotiationType: plaintext

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
"""

TRACE_SERVICE_DOCKERFILE = """FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY ../common-proto /common-proto
WORKDIR /common-proto
RUN mvn clean install -DskipTests
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
EXPOSE 8083 9093
ENTRYPOINT ["java", "-jar", "app.jar"]
"""

TRACE_SERVICE_APPLICATION = """package com.agritrace.trace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TraceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TraceServiceApplication.class, args);
    }
}
"""

TRACE_LOG_ENTITY = """package com.agritrace.trace.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trace_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "batch_id", nullable = false)
    private UUID batchId;
    
    @Column(name = "batch_code")
    private String batchCode;
    
    @Column(name = "action_type", nullable = false)
    private String actionType;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String location;
    
    private String latitude;
    
    private String longitude;
    
    @Column(name = "current_hash", columnDefinition = "TEXT", nullable = false)
    private String currentHash;
    
    @Column(name = "previous_hash", columnDefinition = "TEXT")
    private String previousHash;
    
    @Column(columnDefinition = "TEXT")
    private String signature;
    
    @Column(name = "signature_algorithm", length = 50)
    private String signatureAlgorithm;
    
    @Column(name = "signed_by")
    private UUID signedBy;
    
    @Column(name = "signed_at")
    private LocalDateTime signedAt;
    
    @Column(name = "signature_verified")
    @Builder.Default
    private Boolean signatureVerified = false;
    
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;
    
    @Column(name = "verified_by")
    private UUID verifiedBy;
    
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
"""

TRACE_LOG_REPOSITORY = """package com.agritrace.trace.repository;

import com.agritrace.trace.entity.TraceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TraceLogRepository extends JpaRepository<TraceLog, UUID> {
    
    List<TraceLog> findByBatchIdOrderByCreatedAtAsc(UUID batchId);
    
    @Query("SELECT t FROM TraceLog t WHERE t.batchId = :batchId ORDER BY t.createdAt DESC")
    Optional<TraceLog> findLatestByBatchId(UUID batchId);
}
"""

DIGITAL_SIGNATURE_SERVICE = """package com.agritrace.trace.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Service
@Slf4j
public class DigitalSignatureService {
    
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";
    
    /**
     * Sign data using private key
     */
    public String signData(String data, PrivateKey privateKey) throws Exception {
        Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
        signature.initSign(privateKey);
        signature.update(data.getBytes(StandardCharsets.UTF_8));
        byte[] signatureBytes = signature.sign();
        return Base64.getEncoder().encodeToString(signatureBytes);
    }
    
    /**
     * Verify signature using public key
     */
    public boolean verifySignature(String data, String signatureBase64, String publicKeyBase64) {
        try {
            byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyBase64);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicKeyBytes);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            PublicKey publicKey = keyFactory.generatePublic(keySpec);
            
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initVerify(publicKey);
            signature.update(data.getBytes(StandardCharsets.UTF_8));
            
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            return signature.verify(signatureBytes);
            
        } catch (Exception e) {
            log.error("Signature verification failed", e);
            return false;
        }
    }
    
    /**
     * Generate hash for trace log (used before signing)
     */
    public String generateHash(UUID batchId, String action, String timestamp, String previousHash) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String data = batchId.toString() + action + timestamp + (previousHash != null ? previousHash : "");
            byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("Hash generation failed", e);
        }
    }
}
"""

TRACE_FLYWAY = """-- Trace Service Database Schema

CREATE TABLE IF NOT EXISTS trace_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    batch_code VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    location TEXT,
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    current_hash TEXT NOT NULL,
    previous_hash TEXT,
    signature TEXT,
    signature_algorithm VARCHAR(50),
    signed_by UUID,
    signed_at TIMESTAMP,
    signature_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verified_by UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trace_logs_batch ON trace_logs(batch_id);
CREATE INDEX idx_trace_logs_created ON trace_logs(created_at);
"""

# ===== MEDIA SERVICE =====

MEDIA_SERVICE_POM = """<?xml version="1.0" encoding="UTF-8"?>
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
    <artifactId>media-service</artifactId>
    <version>1.0.0</version>
    <name>AgriTrace Media Service</name>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>com.google.zxing</groupId>
            <artifactId>core</artifactId>
            <version>3.5.3</version>
        </dependency>
        <dependency>
            <groupId>com.google.zxing</groupId>
            <artifactId>javase</artifactId>
            <version>3.5.3</version>
        </dependency>
        <dependency>
            <groupId>net.devh</groupId>
            <artifactId>grpc-spring-boot-starter</artifactId>
            <version>2.15.0.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>com.agritrace</groupId>
            <artifactId>common-proto</artifactId>
            <version>1.0.0</version>
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

MEDIA_SERVICE_APPLICATION_YML = """spring:
  application:
    name: media-service

server:
  port: ${SERVER_PORT:8084}

grpc:
  client:
    product-service:
      address: ${GRPC_PRODUCT_SERVICE:static://localhost:9092}
      negotiationType: plaintext

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics

qrcode:
  width: 300
  height: 300
"""

MEDIA_SERVICE_DOCKERFILE = """FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY ../common-proto /common-proto
WORKDIR /common-proto
RUN mvn clean install -DskipTests
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
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
"""

MEDIA_SERVICE_APPLICATION = """package com.agritrace.media;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MediaServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MediaServiceApplication.class, args);
    }
}
"""

QR_CODE_SERVICE = """package com.agritrace.media.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
@Slf4j
public class QRCodeService {
    
    @Value("${qrcode.width:300}")
    private int width;
    
    @Value("${qrcode.height:300}")
    private int height;
    
    public String generateQRCodeBase64(String data) {
        try {
            BitMatrix bitMatrix = new MultiFormatWriter()
                    .encode(data, BarcodeFormat.QR_CODE, width, height);
            
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            
            byte[] qrCodeBytes = outputStream.toByteArray();
            return Base64.getEncoder().encodeToString(qrCodeBytes);
            
        } catch (Exception e) {
            log.error("QR Code generation failed", e);
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }
}
"""

def generate_product_service():
    print("📦 Generating Product Service...")
    base = create_directories("product-service")
    
    with open(base / "pom.xml", 'w', encoding='utf-8') as f:
        f.write(PRODUCT_SERVICE_POM)
    with open(base / "Dockerfile", 'w', encoding='utf-8') as f:
        f.write(PRODUCT_SERVICE_DOCKERFILE)
    with open(base / "src/main/resources/application.yml", 'w', encoding='utf-8') as f:
        f.write(PRODUCT_SERVICE_APPLICATION_YML)
    with open(base / "src/main/resources/db/migration/V1__init_product_schema.sql", 'w', encoding='utf-8') as f:
        f.write(PRODUCT_FLYWAY)
    
    java_base = base / "src/main/java/com/agritrace/product"
    java_base.mkdir(parents=True, exist_ok=True)
    with open(java_base / "ProductServiceApplication.java", 'w', encoding='utf-8') as f:
        f.write(PRODUCT_SERVICE_APPLICATION)
    
    (java_base / "entity").mkdir(exist_ok=True)
    with open(java_base / "entity/Batch.java", 'w', encoding='utf-8') as f:
        f.write(BATCH_ENTITY)
    
    (java_base / "repository").mkdir(exist_ok=True)
    with open(java_base / "repository/BatchRepository.java", 'w', encoding='utf-8') as f:
        f.write(BATCH_REPOSITORY)
    
    (java_base / "grpc").mkdir(exist_ok=True)
    with open(java_base / "grpc/BatchGrpcService.java", 'w', encoding='utf-8') as f:
        f.write(BATCH_GRPC_SERVICE)
    with open(java_base / "grpc/UserGrpcClient.java", 'w', encoding='utf-8') as f:
        f.write(USER_GRPC_CLIENT)
    
    print("✅ Product Service generated!")

def generate_trace_service():
    print("📦 Generating Trace Service...")
    base = create_directories("trace-service")
    
    with open(base / "pom.xml", 'w', encoding='utf-8') as f:
        f.write(TRACE_SERVICE_POM)
    with open(base / "Dockerfile", 'w', encoding='utf-8') as f:
        f.write(TRACE_SERVICE_DOCKERFILE)
    with open(base / "src/main/resources/application.yml", 'w', encoding='utf-8') as f:
        f.write(TRACE_SERVICE_APPLICATION_YML)
    with open(base / "src/main/resources/db/migration/V1__init_trace_schema.sql", 'w', encoding='utf-8') as f:
        f.write(TRACE_FLYWAY)
    
    java_base = base / "src/main/java/com/agritrace/trace"
    java_base.mkdir(parents=True, exist_ok=True)
    with open(java_base / "TraceServiceApplication.java", 'w', encoding='utf-8') as f:
        f.write(TRACE_SERVICE_APPLICATION)
    
    (java_base / "entity").mkdir(exist_ok=True)
    with open(java_base / "entity/TraceLog.java", 'w', encoding='utf-8') as f:
        f.write(TRACE_LOG_ENTITY)
    
    (java_base / "repository").mkdir(exist_ok=True)
    with open(java_base / "repository/TraceLogRepository.java", 'w', encoding='utf-8') as f:
        f.write(TRACE_LOG_REPOSITORY)
    
    (java_base / "service").mkdir(exist_ok=True)
    with open(java_base / "service/DigitalSignatureService.java", 'w', encoding='utf-8') as f:
        f.write(DIGITAL_SIGNATURE_SERVICE)
    
    print("✅ Trace Service generated!")

def generate_media_service():
    print("📦 Generating Media Service...")
    base = create_directories("media-service")
    
    with open(base / "pom.xml", 'w', encoding='utf-8') as f:
        f.write(MEDIA_SERVICE_POM)
    with open(base / "Dockerfile", 'w', encoding='utf-8') as f:
        f.write(MEDIA_SERVICE_DOCKERFILE)
    with open(base / "src/main/resources/application.yml", 'w', encoding='utf-8') as f:
        f.write(MEDIA_SERVICE_APPLICATION_YML)
    
    java_base = base / "src/main/java/com/agritrace/media"
    java_base.mkdir(parents=True, exist_ok=True)
    with open(java_base / "MediaServiceApplication.java", 'w', encoding='utf-8') as f:
        f.write(MEDIA_SERVICE_APPLICATION)
    
    (java_base / "service").mkdir(exist_ok=True)
    with open(java_base / "service/QRCodeService.java", 'w', encoding='utf-8') as f:
        f.write(QR_CODE_SERVICE)
    
    print("✅ Media Service generated!")

def main():
    print("🚀 Generating Remaining Services...")
    print()
    
    generate_product_service()
    generate_trace_service()
    generate_media_service()
    
    print()
    print("✅ All Services Generated!")
    print("Services: Product ✓ Trace ✓ Media ✓")
    print()
    print("Next: API Gateway")

if __name__ == "__main__":
    main()
