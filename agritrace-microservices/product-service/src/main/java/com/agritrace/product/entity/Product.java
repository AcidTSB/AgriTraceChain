package com.agritrace.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Product Entity - Phase 3.1
 * 
 * Represents a product in the agricultural supply chain
 * Examples: Tomato, Rice, Lettuce, Strawberry
 * 
 * Table: products
 * Module: PRODUCT
 * 
 * Audit: Uses Spring Data JPA auditing for createdAt/updatedAt
 * Note: @EnableJpaAuditing is already enabled in AgriTraceApplication
 */
@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_products_name", columnList = "name"),
    @Index(name = "idx_products_sku", columnList = "sku"),
    @Index(name = "idx_products_category", columnList = "category")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * SKU — Stock Keeping Unit.
     * Manually assigned by Admin (e.g. AT-TOM-001).
     * Nullable: not required on creation, can be added later.
     */
    @Column(name = "sku", unique = true, length = 50)
    private String sku;

    /**
     * Product category for display and filtering.
     * Examples: Rau củ, Trái cây, Ngũ cốc, Thủy sản, Cây công nghiệp.
     */
    @Column(name = "category", length = 100)
    private String category;

    /**
     * Soft activation flag for traceability catalog governance.
     * True = selectable in admin/farmer UI. False = suspended.
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
