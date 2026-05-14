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
    private UUID farmId;
    private String batchCode;
    private String farmName;      // Display name of farm
    private String productName;   // Display name of product
    private Double quantity;
    private BatchStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
