package com.agritrace.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CreateFarmRequest - Phase 3.1
 * 
 * DTO for creating a new farm (Facility)
 * 
 * Validation:
 * - name: Required, cannot be blank
 * - location: Optional (future: make required)
 * 
 * Example:
 * {
 *   "name": "Green Valley Farm",
 *   "location": "Da Lat, Lam Dong"
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFarmRequest {

    @NotBlank(message = "Farm name is required")
    private String name;

    private String location;  // Future: This could be expanded to address fields

    private Double latitude;

    private Double longitude;
}
