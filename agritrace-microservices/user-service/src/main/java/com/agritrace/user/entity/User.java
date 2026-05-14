package com.agritrace.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
  
    @Column(unique = true)
    private String email;
    
    @Column(name = "full_name")
    private String fullName;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id")
    private Facility facility;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
    
    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey;

    @Column(name = "wallet_address")
    private String walletAddress;
    
    @Column(name = "private_key_encrypted", columnDefinition = "TEXT")
    private String privateKeyEncrypted;
    
    @Column(name = "key_algorithm", length = 20)
    @Builder.Default
    private String keyAlgorithm = "RSA";
    
    @Column(name = "key_size")
    @Builder.Default
    private Integer keySize = 2048;
    
    @Column(name = "key_generated_at")
    private LocalDateTime keyGeneratedAt;
    
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
