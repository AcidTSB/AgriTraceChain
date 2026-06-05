package com.agritrace.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ProductResponse - Phase 3.1
 * 
 * DTO for product response
 * 
 * Contains product details for API responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {

    private UUID id;
    private String name;
    private String description;
    /** SKU — manually assigned code, e.g. AT-TOM-001. Null if not yet assigned. */
    private String sku;
    /** Product category, e.g. Rau củ, Trái cây. Null if not yet assigned. */
    private String category;
    /** Unit of measure, e.g. kg, tấn, hộp. */
    private String unit;
    /** Optional product image URL. */
    private String imageUrl;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
