package com.agritrace.trace.entity;

/**
 * TraceAction Enum - Phase 3.2 Production Hardening
 * 
 * Standardized action types for batch traceability
 * 
 * Lifecycle stages:
 * - PLANTING: Initial planting/seeding
 * - FERTILIZING: Fertilizer application
 * - WATERING: Irrigation activities
 * - SPRAYING: Pesticide/herbicide application
 * - HARVESTING: Crop harvesting
 * - INSPECTION: Quality inspection
 * - PACKAGING: Product packaging
 * - SHIPPING: Dispatch/distribution
 * 
 * Usage:
 * - Entity: Can be stored as String or Enum (currently String for flexibility)
 * - DTO: Validated via enum constraints
 * - Service: Converted to String for hash calculation
 */
public enum TraceAction {
    /**
     * Planting/Seeding activity
     */
    PLANTING,
    
    /**
     * Fertilizer application
     */
    FERTILIZING,
    
    /**
     * Irrigation/Watering
     */
    WATERING,
    
    /**
     * Pesticide or herbicide application
     */
    SPRAYING,
    
    /**
     * Crop harvesting
     */
    HARVESTING,
    
    /**
     * Quality inspection by inspector
     */
    INSPECTION,
    
    /**
     * Product packaging
     */
    PACKAGING,
    
    /**
     * Shipping/Distribution
     */
    SHIPPING
}
