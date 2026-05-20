package com.agritrace.product.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Batch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "batch_code", unique = true, nullable = false)
    private String batchCode;
    
    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "product_id")
    private UUID productId;
    
    @Column(name = "product_type")
    private String productType;
    
    @Column(name = "harvest_date")
    private LocalDateTime harvestDate;
    
    private Double quantity;
    
    private String unit;
    
    @Column(name = "facility_id")
    private UUID facilityId;
    
    @Column(name = "facility_name")
    private String facilityName;

    @Column(name = "farm_latitude")
    private Double farmLatitude;

    @Column(name = "farm_longitude")
    private Double farmLongitude;
    
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    
    @Column(name = "owner_name")
    private String ownerName;
    
    @Column(name = "is_compromised", nullable = false)
    @Builder.Default
    private Boolean isCompromised = false;
    
    @Column(name = "qr_code_url")
    private String qrCodeUrl;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
