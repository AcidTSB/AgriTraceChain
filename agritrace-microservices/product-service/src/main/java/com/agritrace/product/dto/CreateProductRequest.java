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

    /**
     * Optional SKU — manually assigned by Admin.
     * Example: AT-TOM-001
     * Must be unique across all products if provided.
     */
    private String sku;

    /**
     * Optional product category.
     * Examples: Rau củ, Trái cây, Ngũ cốc, Thủy sản, Cây công nghiệp
     */
    private String category;

    /** Unit of measure, e.g. kg, tấn, hộp, thùng. */
    private String unit;

    /** Optional product image URL. */
    private String imageUrl;

    /**
     * Optional activation flag for admin-managed catalog lifecycle.
     * Defaults to true when not provided.
     */
    private Boolean isActive;
}
