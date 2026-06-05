package com.agritrace.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ProductRequest Entity
 *
 * Represents a Farmer's request to add a new product to the official catalog.
 * Admin reviews the request and either approves (creating the Product) or rejects it.
 *
 * Table: product_requests
 * Lifecycle: PENDING → APPROVED | REJECTED  (terminal states — no reversal)
 */
@Entity
@Table(name = "product_requests", indexes = {
    @Index(name = "idx_product_requests_farmer_id", columnList = "farmer_id"),
    @Index(name = "idx_product_requests_status",    columnList = "status"),
    @Index(name = "idx_product_requests_created",   columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** UUID of the Farmer who submitted this request */
    @Column(name = "farmer_id", nullable = false)
    private UUID farmerId;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Unit of measure: kg, tấn, hộp, thùng… */
    @Column(name = "unit", length = 50)
    private String unit;

    /** Optional product image URL (no file upload required) */
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    /** Farmer's reason / additional context for this request */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ProductRequestStatus status = ProductRequestStatus.PENDING;

    /** Populated by Admin when rejecting */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /** UUID of the Admin who reviewed this request */
    @Column(name = "reviewed_by_admin_id")
    private UUID reviewedByAdminId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
