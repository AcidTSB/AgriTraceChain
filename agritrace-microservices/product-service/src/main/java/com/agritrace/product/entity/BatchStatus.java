package com.agritrace.product.entity;

/**
 * Batch Status Enum - Supply Chain Standard
 * Defines the lifecycle status of a product batch
 * 
 * Phase 3.1: Core statuses (CREATED → PROCESSING → DISTRIBUTED)
 */
public enum BatchStatus {
    /**
     * Initial state - batch just created
     */
    CREATED,
    
    /**
     * Batch is being processed (harvesting, packaging, etc.)
     */
    PROCESSING,
    
    /**
     * Batch has been distributed to supply chain
     */
    DISTRIBUTED,

    /**
     * Awaiting inspector verification.
     */
    PENDING_INSPECTION,

    /**
     * Integrity compromised.
     */
    COMPROMISED
}
