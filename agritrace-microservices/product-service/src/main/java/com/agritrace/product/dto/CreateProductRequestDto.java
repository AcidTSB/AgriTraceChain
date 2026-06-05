package com.agritrace.product.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CreateProductRequestDto
 *
 * Sent by FARMER to submit a product creation request.
 * Only productName is required; the rest are optional context fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductRequestDto {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String productName;

    /** Product category, e.g. Rau củ, Trái cây */
    private String category;

    private String description;

    /** Unit of measure: kg, tấn, hộp, thùng… */
    private String unit;

    /** Optional image URL — no upload required */
    private String imageUrl;

    /** Farmer's reason / context for this request */
    private String note;
}
