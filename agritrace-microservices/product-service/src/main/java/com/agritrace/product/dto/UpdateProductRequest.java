package com.agritrace.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Partial update DTO for product lifecycle and catalog fields.
 * Null fields are ignored and existing values are preserved.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProductRequest {

    private String name;
    private String description;
    private String sku;
    private String category;
    private Boolean isActive;
}
