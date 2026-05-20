package com.agritrace.user.service;

import com.agritrace.user.dto.CreateFarmRequest;
import com.agritrace.user.dto.FarmResponse;
import com.agritrace.user.entity.Facility;
import com.agritrace.user.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * FarmService - Phase 3.1
 * 
 * Business logic for Farm (Facility) management
 * 
 * CRITICAL: Gets current user identity from Gateway forwarded headers
 * 
 * Methods:
 * - createFarm() - FARMER creates their own farm
 * - getMyFarms() - FARMER views their own farms
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FarmService {

    private final FacilityRepository facilityRepository;

    /**
     * Create a new farm
     * 
     * Authorization: FARMER only (enforced by @PreAuthorize at controller)
     * 
     * CRITICAL: Gets current user from Gateway headers (X-User-Id/X-Username)
     * 
     * @param request Farm creation request
     * @param ownerId Current user id from gateway header
     * @param ownerUsername Current username from gateway header
     * @return FarmResponse
     */
    @Transactional
    public FarmResponse createFarm(CreateFarmRequest request, UUID ownerId, String ownerUsername) {

        String safeOwnerUsername = (ownerUsername == null || ownerUsername.isBlank())
                ? "unknown"
                : ownerUsername;

        log.info("Creating new farm for user: {} (ID: {})", safeOwnerUsername, ownerId);

        // Build facility entity
        Facility facility = Facility.builder()
                .name(request.getName())
                .address(request.getLocation())
                .certificateCode(request.getCertificateCode())
                .ownerId(ownerId)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                // certificateCode can be added later (e.g., VietGAP, GlobalGAP)
                .build();

        // Save (createdAt and updatedAt auto-populated)
        Facility savedFacility = facilityRepository.save(facility);

        log.info("Farm created successfully with ID: {}", savedFacility.getId());

        return mapToResponse(savedFacility, safeOwnerUsername);
    }

    /**
     * Get all farms owned by current user
     * 
     * Authorization: FARMER only (enforced by @PreAuthorize at controller)
     * 
     * CRITICAL: Gets current user from Gateway headers (X-User-Id/X-Username)
     * 
     * @param ownerId Current user id from gateway header
     * @param ownerUsername Current username from gateway header
     * @return List of user's farms
     */
    @Transactional(readOnly = true)
    public List<FarmResponse> getMyFarms(UUID ownerId, String ownerUsername) {

        String safeOwnerUsername = (ownerUsername == null || ownerUsername.isBlank())
                ? "unknown"
                : ownerUsername;

        log.debug("Fetching farms for user: {} (ID: {})", safeOwnerUsername, ownerId);

        // Query farms by ownerId
        List<Facility> facilities = facilityRepository.findByOwnerId(ownerId);

        return facilities.stream()
                .map(facility -> mapToResponse(facility, safeOwnerUsername))
                .collect(Collectors.toList());
    }

    /**
     * Get all farms for admin management screens.
     */
    @Transactional(readOnly = true)
    public List<FarmResponse> getAllFarms() {
        return facilityRepository.findAll().stream()
                .map(facility -> mapToResponse(facility, null))
                .collect(Collectors.toList());
    }

    /**
     * Get farms with offset pagination for master-data screens.
     */
    @Transactional(readOnly = true)
    public Page<FarmResponse> getAllFarmsPage(String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        return facilityRepository
                .findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(
                        normalizedKeyword,
                        normalizedKeyword,
                        pageable
                )
                .map(facility -> mapToResponse(facility, null));
    }

    /**
     * Return total number of farms (facilities)
     *
     * @return total farm count
     */
    @Transactional(readOnly = true)
    public long countFarms() {
        return facilityRepository.count();
    }

    /**
     * Map Facility entity to FarmResponse DTO
     */
    private FarmResponse mapToResponse(Facility facility, String ownerUsername) {
        String normalizedOwnerUsername = (ownerUsername == null || ownerUsername.isBlank())
                ? null
                : ownerUsername;
        return FarmResponse.builder()
                .id(facility.getId())
                .name(facility.getName())
                .location(facility.getAddress())
                .certificateCode(facility.getCertificateCode())
                .ownerId(facility.getOwnerId())
                .ownerUsername(normalizedOwnerUsername)
                .latitude(facility.getLatitude())
                .longitude(facility.getLongitude())
                .createdAt(facility.getCreatedAt())
                .updatedAt(facility.getUpdatedAt())
                .build();
    }
}
