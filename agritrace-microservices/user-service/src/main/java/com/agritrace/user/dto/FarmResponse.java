package com.agritrace.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * FarmResponse - Phase 3.1
 * 
 * DTO for farm (Facility) response
 * 
 * Contains farm details for API responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FarmResponse {

    private UUID id;
    private String name;
    private String location;
    private String certificateCode;
    private UUID ownerId;
    private String ownerUsername;  // Convenience field for display
    private Double latitude;
    private Double longitude;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
