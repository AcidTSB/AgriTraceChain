package com.agritrace.product.dto;

import com.agritrace.product.entity.ProductRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * ProductRequestResponse
 *
 * Returned to both FARMER (own requests) and ADMIN (all requests).
 * similarProducts is populated at query-time by the service (not persisted).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequestResponse {

    private UUID id;
    private UUID farmerId;
    private String productName;
    private String category;
    private String description;
    private String unit;
    private String imageUrl;
    private String note;
    private ProductRequestStatus status;
    private String rejectionReason;
    private UUID reviewedByAdminId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Similar existing products detected by name/category token search.
     * Computed on-the-fly; not stored in DB.
     * Populated only in Admin view to help with duplicate detection.
     */
    private List<SimilarProductDto> similarProducts;

    /** Lightweight representation for the similar-products hint */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimilarProductDto {
        private UUID id;
        private String name;
        private String category;
        private String sku;
    }
}
