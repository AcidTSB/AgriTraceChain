package com.agritrace.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notification_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSetting {
    
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "push_enabled", nullable = false)
    @Builder.Default
    private Boolean pushEnabled = true;

    @Column(name = "sms_enabled", nullable = false)
    @Builder.Default
    private Boolean smsEnabled = false;

    @Column(name = "email_enabled", nullable = false)
    @Builder.Default
    private Boolean emailEnabled = true;

    @Column(name = "in_app_enabled", nullable = false)
    @Builder.Default
    private Boolean inAppEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
