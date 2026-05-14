package com.agritrace.trace.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "trace_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "batch_id", nullable = false)
    private UUID batchId;
    
    @Column(name = "batch_code")
    private String batchCode;
    
    @Column(name = "action_type", nullable = false)
    private String actionType;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String location;

    @Column(name = "quantity", precision = 18, scale = 3)
    private BigDecimal quantity;
    
    private String latitude;
    
    private String longitude;

    @Column(name = "distance_from_farm_km", precision = 10, scale = 3)
    private BigDecimal distanceFromFarmKm;

    @Column(name = "within_geofence")
    private Boolean withinGeofence;
    
    @Column(name = "current_hash", columnDefinition = "TEXT", nullable = false)
    private String currentHash;
    
    @Column(name = "previous_hash", columnDefinition = "TEXT")
    private String previousHash;
    
    @Column(columnDefinition = "TEXT")
    private String signature;
    
    @Column(name = "signature_algorithm", length = 50)
    private String signatureAlgorithm;
    
    @Column(name = "signed_by")
    private UUID signedBy;
    
    @Column(name = "signed_at")
    private LocalDateTime signedAt;
    
    @Column(name = "signature_verified")
    @Builder.Default
    private Boolean signatureVerified = false;
    
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;
    
    @Column(name = "verified_by")
    private UUID verifiedBy;
    
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
