package com.agritrace.product.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CreateProductRequest - Phase 3.1
 * 
 * DTO for creating a new product
 * 
 * Validation:
 * - name: Required, cannot be blank
 * - description: Optional
 * 
 * Example:
 * {
 *   "name": "Organic Tomato",
 *   "description": "Fresh organic tomatoes from local farms"
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;
}
