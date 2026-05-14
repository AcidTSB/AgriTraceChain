package com.agritrace.product.service;

import com.agritrace.product.dto.BatchResponse;
import com.agritrace.product.dto.CreateBatchRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Batch Service Interface - Phase 3.1 (Updated)
 * 
 * Business logic for batch management with IDOR protection
 */
public interface BatchService {

    /**
     * Create a new batch
     * 
     * CRITICAL: Includes IDOR protection (farm ownership validation)
     *
     * @param request batch creation data
     * @return created batch response
     * @throws org.springframework.security.access.AccessDeniedException if user doesn't own the farm
     * @throws com.agritrace.common.exception.ResourceNotFoundException if farm or product not found
     */
    BatchResponse createBatch(CreateBatchRequest request);

    /**
     * Get batch by batch code
     * Public access for traceability
     *
     * @param batchCode unique batch code
     * @return batch response
     * @throws com.agritrace.common.exception.ResourceNotFoundException if batch not found
     */
    BatchResponse getBatchByCode(String batchCode);
    
    /**
     * Get all batches for a specific farm
     * Public access for transparency
     *
     * @param farmId farm ID
     * @return list of batches
     * @throws com.agritrace.common.exception.ResourceNotFoundException if farm not found
     */
    List<BatchResponse> getBatchesByFarm(UUID farmId);

    /**
     * Get batch by ID (legacy method)
     *
     * @param id batch ID
     * @return batch response
     * @throws com.agritrace.common.exception.ResourceNotFoundException if batch not found
     */
    BatchResponse getBatchById(UUID id);

    /**
     * Offset pagination for transactional batch data with filter support.
     */
    Page<BatchResponse> getBatchesPage(UUID ownerId, UUID farmId, String status, String keyword, Pageable pageable);
}
