package com.agritrace.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ReviewProductRequestDto
 *
 * Sent by ADMIN when approving or rejecting a product request.
 * - action = "APPROVE" → creates the Product and marks request APPROVED
 * - action = "REJECT"  → marks request REJECTED; rejectionReason is required
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewProductRequestDto {

    @NotBlank(message = "action is required (APPROVE or REJECT)")
    private String action; // "APPROVE" | "REJECT"

    /** Required when action = REJECT */
    private String rejectionReason;
}
