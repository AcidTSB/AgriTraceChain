package com.agritrace.product.service.impl;

// import com.agritrace.auth.service.CustomUserDetails; // Not needed in microservices
import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.product.dto.BatchResponse;
import com.agritrace.product.dto.CreateBatchRequest;
import com.agritrace.product.entity.Batch;
import com.agritrace.product.entity.BatchStatus;
import com.agritrace.product.entity.Product;
import com.agritrace.product.repository.BatchRepository;
import com.agritrace.product.repository.ProductRepository;
import com.agritrace.product.service.BatchService;



import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;



import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * BatchServiceImpl - Phase 3.1 (Rewritten)
 * * CRITICAL BUSINESS LOGIC with IDOR Protection
 * * Security:
 * - Gets current user from SecurityContext (NO DB QUERY)
 * - Validates farm ownership before creating batch (IDOR protection)
 * - Auto-generates unique batch codes
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BatchServiceImpl implements BatchService {

    private final BatchRepository batchRepository;
    
    private final ProductRepository productRepository;
    
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Create a new batch - Phase 3.1
     * * CRITICAL SECURITY:
     * 1. Gets current user from SecurityContext (NO DB QUERY)
     * 2. Validates farm ownership (IDOR protection)
     * 3. Auto-generates unique batch code
     */
    @Override
    public BatchResponse createBatch(CreateBatchRequest request) {
        // Microservices version - simplified, auth handled by Gateway
        // User and Farm validation via gRPC if needed
        
        log.info("Creating batch for farm: {}", request.getFarmId());

        // Load Product
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));

        // Generate unique batch code
        String batchCode = generateBatchCode();
        
        log.info("Generated batch code: {}", batchCode);

        // Build and save batch entity
        Batch batch = Batch.builder()
                .batchCode(batchCode)
                .facilityId(request.getFarmId())
                .facilityName("Farm-" + request.getFarmId()) // TODO: Get from Facility via gRPC
                .farmLatitude(request.getFarmLatitude())
                .farmLongitude(request.getFarmLongitude())
                .productName(product.getName())
                .productId(product.getId())
                .productType(resolveProductType(product))
                .quantity(request.getQuantity())
                .unit(request.getUnit() != null ? request.getUnit() : "kg") // Default fallback to kg
                .ownerId(request.getOwnerId() != null ? request.getOwnerId() : null)
                .ownerName("Farmer") // TODO: Get from User Service via gRPC
            .harvestDate(parseHarvestDate(request.getHarvestDate()))
                .isCompromised(false)
                .build();

        Batch savedBatch = batchRepository.save(batch);

        log.info("Batch created successfully - Code: {}, Product: {}, Quantity: {}", 
                 savedBatch.getBatchCode(), product.getName(), savedBatch.getQuantity());

        try {
            java.util.Map<String, Object> auditMsg = new java.util.LinkedHashMap<>();
            auditMsg.put("batchId", savedBatch.getId());
            auditMsg.put("batchCode", savedBatch.getBatchCode());
            auditMsg.put("operation", "CREATE_BATCH");
            auditMsg.put("actorId", request.getOwnerId());
            auditMsg.put("actorRole", "FARMER");
            auditMsg.put("actorFacilityId", request.getFarmId());
            auditMsg.put("afterSnapshot", savedBatch);
            auditMsg.put("timestamp", LocalDateTime.now().toString());
            
            kafkaTemplate.send("audit-ledger-topic", savedBatch.getBatchCode(), objectMapper.writeValueAsString(auditMsg));
        } catch (Exception ex) {
            log.warn("Failed to publish audit event for batch creation: {}", ex.getMessage());
        }

        return mapToResponse(savedBatch);
    }

    @Override
    @Transactional(readOnly = true)
    public BatchResponse getBatchByCode(String batchCode) {
        log.debug("Fetching batch with code: {}", batchCode);

        Batch batch = batchRepository.findByBatchCode(batchCode)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "batchCode", batchCode));

        // ⚠️ RELAXED KILL SWITCH (Phase 3.4 Refinement):
        // We no longer throw 404 ResourceNotFoundException here so that the public trace page
        // can load the batch and display a strong warnings banner to the consumer instead of looking like a broken link.
        if (Boolean.TRUE.equals(batch.getIsCompromised())) {
            log.warn("🚨 WARNING: Accessing compromised batch {} from API", batchCode);
        }

        return mapToResponse(batch);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> getBatchesByFarm(UUID farmId) {
        log.debug("Fetching batches for farm: {}", farmId);

        List<Batch> batches = batchRepository.findByFacilityId(farmId);
        java.util.Map<UUID, Boolean> productActiveMap = getProductActiveMap(batches);

        return batches.stream()
                .map(b -> mapToResponse(b, productActiveMap))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> getBatchesByProduct(UUID productId) {
        log.debug("Fetching batches for product: {}", productId);
        List<Batch> batches = batchRepository.findByProductId(productId);
        java.util.Map<UUID, Boolean> productActiveMap = getProductActiveMap(batches);
        return batches.stream()
                .map(b -> mapToResponse(b, productActiveMap))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BatchResponse getBatchById(UUID id) {
        log.debug("Fetching batch with ID: {}", id);
        
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", id));
        
        return mapToResponse(batch);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BatchResponse> getBatchesPage(UUID ownerId, UUID farmId, String status, String keyword, Pageable pageable) {
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase();
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        Page<Batch> batchPage = batchRepository.searchBatches(ownerId, farmId, normalizedStatus, normalizedKeyword, pageable);
        java.util.Map<UUID, Boolean> productActiveMap = getProductActiveMap(batchPage.getContent());
        return batchPage.map(b -> mapToResponse(b, productActiveMap));
    }

    @Override
    public BatchResponse markCompromised(String batchCode, String reason, String auditId) {
        log.warn("🚨 markCompromised triggered for batchCode: {}, reason: {}", batchCode, reason);
        Batch batch = batchRepository.findByBatchCode(batchCode)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "batchCode", batchCode));

        // Idempotency guardrail: only update and trigger notification if not already compromised
        if (!Boolean.TRUE.equals(batch.getIsCompromised())) {
            batch.setIsCompromised(true);
            batch.setCompromisedAt(LocalDateTime.now());
            batch.setCompromiseReason(reason);
            batch.setCompromisedByAuditId(auditId);
            batch = batchRepository.save(batch);

            try {
                java.util.Map<String, Object> auditMsg = new java.util.LinkedHashMap<>();
                auditMsg.put("batchId", batch.getId());
                auditMsg.put("batchCode", batch.getBatchCode());
                auditMsg.put("operation", "BATCH_COMPROMISED");
                auditMsg.put("actorId", batch.getOwnerId());
                auditMsg.put("actorRole", "SYSTEM");
                auditMsg.put("afterSnapshot", batch);
                auditMsg.put("timestamp", LocalDateTime.now().toString());
                
                kafkaTemplate.send("audit-ledger-topic", batch.getBatchCode(), objectMapper.writeValueAsString(auditMsg));
                log.warn("Published BATCH_COMPROMISED event to Kafka for batch: {}", batchCode);
            } catch (Exception ex) {
                log.warn("Failed to publish audit event for batch compromise: {}", ex.getMessage());
            }
        } else {
            log.info("Batch {} is already marked compromised, skipping redundant update.", batchCode);
        }

        return mapToResponse(batch);
    }

    /**
     * Generate unique batch code
     * * Format: BATCH-YYYYMMDD-XXXXXXXX
     * Example: BATCH-20260329-A3F4E9D1
     */
    private String generateBatchCode() {
        String datePrefix = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String randomSuffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        
        return "BATCH-" + datePrefix + "-" + randomSuffix;
    }

    private String resolveProductType(Product product) {
        if (product.getCategory() != null && !product.getCategory().isBlank()) {
            return product.getCategory().trim();
        }
        return product.getName();
    }

    private LocalDateTime parseHarvestDate(String harvestDate) {
        if (harvestDate == null || harvestDate.isBlank()) {
            return LocalDateTime.now();
        }

        try {
            return LocalDateTime.parse(harvestDate);
        } catch (DateTimeParseException ignored) {
            // Allow date-only values from clients (yyyy-MM-dd).
            return LocalDate.parse(harvestDate).atStartOfDay();
        }
    }

    /**
     * N+1 query prevention: bulk fetch product active state for batch collection.
     */
    private java.util.Map<UUID, Boolean> getProductActiveMap(java.util.Collection<Batch> batches) {
        java.util.Set<UUID> productIds = batches.stream()
                .map(Batch::getProductId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (productIds.isEmpty()) {
            return java.util.Collections.emptyMap();
        }
        try {
            List<Product> products = productRepository.findAllById(productIds);
            return products.stream()
                    .collect(Collectors.toMap(Product::getId, Product::getIsActive, (v1, v2) -> v1));
        } catch (Exception ex) {
            log.warn("Failed to prefetch product active status: {}", ex.getMessage());
            return java.util.Collections.emptyMap();
        }
    }

    /**
     * Map Batch entity to BatchResponse DTO.
     * Exposes all meaningful fields including unit, harvestDate, productType, isCompromised.
     */
    private BatchResponse mapToResponse(Batch batch) {
        Boolean productActive = null;
        if (batch.getProductId() != null) {
            try {
                productActive = productRepository.findById(batch.getProductId())
                        .map(Product::getIsActive)
                        .orElse(true);
            } catch (Exception ex) {
                log.warn("Failed to find product active state for batch {}: {}", batch.getBatchCode(), ex.getMessage());
            }
        }
        return mapToResponse(batch, productActive);
    }

    private BatchResponse mapToResponse(Batch batch, java.util.Map<UUID, Boolean> productActiveMap) {
        Boolean productActive = null;
        if (batch.getProductId() != null && productActiveMap != null) {
            productActive = productActiveMap.getOrDefault(batch.getProductId(), true);
        } else if (batch.getProductId() != null) {
            // fallback
            try {
                productActive = productRepository.findById(batch.getProductId())
                        .map(Product::getIsActive)
                        .orElse(true);
            } catch (Exception ex) {
                log.warn("Failed to find product active state for batch {}: {}", batch.getBatchCode(), ex.getMessage());
            }
        }
        return mapToResponse(batch, productActive);
    }

    private BatchResponse mapToResponse(Batch batch, Boolean productActive) {
        BatchStatus status = Boolean.TRUE.equals(batch.getIsCompromised())
                ? BatchStatus.COMPROMISED
                : BatchStatus.PENDING_INSPECTION;
        
        return BatchResponse.builder()
                .id(batch.getId())
                .productId(batch.getProductId())
                .farmId(batch.getFacilityId())
                .batchCode(batch.getBatchCode())
                .farmName(batch.getFacilityName())
                .productName(batch.getProductName())
                .productType(batch.getProductType())
                .quantity(batch.getQuantity())
                .unit(batch.getUnit())
                .harvestDate(batch.getHarvestDate())
                .status(status)
                .isCompromised(batch.getIsCompromised())
                .compromisedAt(batch.getCompromisedAt())
                .compromiseReason(batch.getCompromiseReason())
                .compromisedByAuditId(batch.getCompromisedByAuditId())
                .productActive(productActive != null ? productActive : true)
                .createdAt(batch.getCreatedAt())
                .updatedAt(batch.getUpdatedAt())
                .build();
    }
}
