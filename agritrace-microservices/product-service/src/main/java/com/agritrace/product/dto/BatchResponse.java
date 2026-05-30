package com.agritrace.product.dto;

import com.agritrace.product.entity.BatchStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * BatchResponse - Phase 3.1 (Updated)
 * 
 * DTO for batch response
 * 
 * Changes from V1:
 * - Added farmName (for display, no need to query farm separately)
 * - Added productName (for display, no need to query product separately)
 * - Added quantity
 * - Removed cropId (replaced by product)
 * - Removed facilityId (replaced by farmName)
 * - Removed currentHash (internal field)
 * 
 * Example:
 * {
 *   "batchCode": "BATCH-20260329-A3F4E9D1",
 *   "farmName": "Green Valley Farm",
 *   "productName": "Organic Tomato",
 *   "quantity": 150.5,
 *   "status": "CREATED",
 *   "createdAt": "2026-03-29T10:00:00",
 *   "updatedAt": "2026-03-29T10:00:00"
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchResponse {
    
    private UUID id;
    private UUID productId;
    private UUID farmId;
    private String batchCode;
    private String farmName;      // Display name of farm
    private String productName;   // Display name of product
    private String productType;   // Product type / category from batch record
    private Double quantity;
    /**
     * Unit of measurement for this batch (at Batch level — business decision).
     * Examples: kg, tấn, thùng. Defaults to "kg" if not specified.
     */
    private String unit;
    /** Harvest date — when the batch was harvested. */
    private LocalDateTime harvestDate;
    private BatchStatus status;
    /** Whether this batch has been flagged as compromised (integrity violation). */
    private Boolean isCompromised;
    private LocalDateTime compromisedAt;
    private String compromiseReason;
    private String compromisedByAuditId;
    private Boolean productActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
