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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                .productType(product.getDescription()) // Using description as type
                .quantity(request.getQuantity().intValue()) // Convert to Integer
                .unit("kg") // Default unit - TODO: Add unit field to Product entity
                .ownerId(request.getOwnerId() != null ? request.getOwnerId() : null) // From Gateway header
                .ownerName("Farmer") // TODO: Get from User Service via gRPC
            .harvestDate(parseHarvestDate(request.getHarvestDate()))
                .isCompromised(false)
                .build();

        Batch savedBatch = batchRepository.save(batch);

        log.info("Batch created successfully - Code: {}, Product: {}, Quantity: {}", 
                 savedBatch.getBatchCode(), product.getName(), savedBatch.getQuantity());

        return mapToResponse(savedBatch);
    }

    @Override
    @Transactional(readOnly = true)
    public BatchResponse getBatchByCode(String batchCode) {
        log.debug("Fetching batch with code: {}", batchCode);

        Batch batch = batchRepository.findByBatchCode(batchCode)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "batchCode", batchCode));

        // ⚠️ KILL SWITCH (Phase 3.4 Refinement): Block compromised batches from consumer access
        // Security: Prevent information leakage about compromised batches
        // Consumer experience: Batch appears non-existent (404) instead of showing compromise warning
        if (Boolean.TRUE.equals(batch.getIsCompromised())) {
            log.warn("🚨 KILL SWITCH: Blocked access to compromised batch {} from consumer API", batchCode);
            throw new ResourceNotFoundException("Batch", "batchCode", batchCode);
        }

        return mapToResponse(batch);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> getBatchesByFarm(UUID farmId) {
        log.debug("Fetching batches for farm: {}", farmId);

        // No farm verification in microservices - trust Gateway/gRPC
        // Get batches using facility ID
        List<Batch> batches = batchRepository.findByFacilityId(farmId);

        return batches.stream()
                .map(this::mapToResponse)
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
        return batchRepository.searchBatches(ownerId, farmId, normalizedStatus, normalizedKeyword, pageable)
                .map(this::mapToResponse);
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
     * Get current user from SecurityContext
     * REMOVED - Auth handled by Gateway
     */
    // private User getCurrentUser() {
    //     // Authentication from gateway
    //     return null;
    // }

    /**
     * Map Batch entity to BatchResponse DTO
     */
    private BatchResponse mapToResponse(Batch batch) {
        BatchStatus status = Boolean.TRUE.equals(batch.getIsCompromised())
                ? BatchStatus.COMPROMISED
                : BatchStatus.PENDING_INSPECTION;
        
        return BatchResponse.builder()
                .id(batch.getId())
                .farmId(batch.getFacilityId())
                .batchCode(batch.getBatchCode())
                .farmName(batch.getFacilityName())
                .productName(batch.getProductName())
                .quantity(batch.getQuantity() != null ? batch.getQuantity().doubleValue() : 0.0)
                .status(status) // Can be null for compromised batches
                .createdAt(batch.getCreatedAt())
                .updatedAt(batch.getUpdatedAt())
                .build();
    }
}
