package com.agritrace.trace.service;

import com.agritrace.proto.batch.BatchResponse;
import com.agritrace.proto.batch.OwnershipResponse;
import com.agritrace.proto.user.UserResponse;
import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.trace.dto.CreateTraceLogRequest;
import com.agritrace.trace.dto.TraceLogResponse;
import com.agritrace.trace.entity.TraceAction;
import com.agritrace.trace.entity.TraceLog;
import com.agritrace.trace.grpc.BatchGrpcClient;
import com.agritrace.trace.grpc.UserGrpcClient;
import com.agritrace.trace.repository.TraceLogRepository;
import com.agritrace.trace.util.GeofenceUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@Transactional
public class TraceLogService {
    private static final BigDecimal SHIPPING_RADIUS_SENTINEL_KM = new BigDecimal("9999");

    @Autowired
    private TraceLogRepository traceLogRepository;
    @Autowired
    private UserGrpcClient userGrpcClient;
    @Autowired
    private BatchGrpcClient batchGrpcClient;
    @Autowired
    private DigitalSignatureService digitalSignatureService;
    @Autowired
    private TraceAuditService traceAuditService;

    @Value("${trace.geofence.default-radius-km:5.0}")
    private double defaultRadiusKm;

    @Value("${trace.geofence.packaging-radius-km:20.0}")
    private double packagingRadiusKm;

    @Value("${trace.geofence.inspection-radius-km:20.0}")
    private double inspectionRadiusKm;

    public TraceLogResponse createTraceLog(CreateTraceLogRequest request,
                                           UUID userId,
                                           String roleHeader,
                                           String facilityHeader,
                                           String regionHeader) {
        String normalizedRole = normalizeRole(roleHeader);
        if (!"FARMER".equals(normalizedRole) && !"INSPECTOR".equals(normalizedRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only FARMER or INSPECTOR can create trace logs");
        }

        TraceAction action = request.getAction();
        if (action == null) {
            throw new IllegalArgumentException("Action is required");
        }

        // Context ABAC: INSPECTOR may only submit INSPECTION actions.
        if ("INSPECTOR".equals(normalizedRole) && action != TraceAction.INSPECTION) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ABAC violation: INSPECTOR can only submit INSPECTION action");
        }

        // Context ABAC: FARMER cannot mark approvals/inspection events.
        if ("FARMER".equals(normalizedRole) && action == TraceAction.INSPECTION) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ABAC violation: FARMER cannot submit INSPECTION action");
        }

        UserResponse user = userGrpcClient.getUserById(userId.toString());
        if (user.getId() == null || user.getId().isBlank()) {
            throw new IllegalArgumentException("User validation failed: user-service unavailable or user not found");
        }

        BatchResponse batch = batchGrpcClient.getBatchById(request.getBatchId());
        if (batch.getId() == null || batch.getId().isBlank()) {
            throw new IllegalArgumentException("Batch validation failed: product-service unavailable or batch not found");
        }

        UUID batchId = UUID.fromString(request.getBatchId());

        if ("FARMER".equals(normalizedRole)) {
            OwnershipResponse ownership = batchGrpcClient.validateBatchOwnership(request.getBatchId(), userId.toString());
            if (!ownership.getIsOwner()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ABAC violation: FARMER can only append logs to owned batches");
            }
        }

        // Attribute ABAC: optional facility context from token must match batch facility.
        if (facilityHeader != null && !facilityHeader.isBlank()) {
            String batchFacility = batch.getFacilityId();
            if (batchFacility == null || batchFacility.isBlank() || !facilityHeader.equals(batchFacility)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ABAC violation: actor facility does not match batch facility");
            }
        }

        // Attribute ABAC: optional region claim must match log location context.
        if (regionHeader != null && !regionHeader.isBlank()) {
            String location = request.getLocation() == null ? "" : request.getLocation();
            if (!location.toUpperCase().contains(regionHeader.toUpperCase())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ABAC violation: action location is outside actor region context");
            }
        }

        BigDecimal quantity = request.getQuantity();
        validateQuantityForAction(action, quantity);
        validateGpsForAntiFraud(request);

        BigDecimal distanceFromFarmKm = calculateDistanceFromFarm(batch, request);
        BigDecimal allowedRadiusKm = resolveAllowedRadiusKm(action);
        boolean withinGeofence = distanceFromFarmKm.compareTo(allowedRadiusKm) <= 0;
        if (!withinGeofence) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    String.format(
                            "Geofence violation: vi tri ghi nhan cach nong trai %.2f km (vuot nguong %.2f km).",
                            distanceFromFarmKm.doubleValue(),
                            allowedRadiusKm.doubleValue()
                    )
            );
        }

        List<TraceLog> existingLogs = traceLogRepository.findByBatchIdOrderByCreatedAtAsc(batchId);
        validateBusinessRules(existingLogs, batchId, action, quantity);

        // Keep timestamp precision stable with PostgreSQL TIMESTAMP persistence to avoid hash drift.
        LocalDateTime createdAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        String previousHash = traceLogRepository.findFirstByBatchIdOrderByCreatedAtDesc(batchId)
                .map(TraceLog::getCurrentHash)
                .orElse(null);

        String currentHash = digitalSignatureService.generateHash(
                batchId,
                action.name(),
                createdAt.toString(),
                userId,
                request.getLocation(),
                request.getNotes(),
            quantity,
                previousHash
        );
        String signature = digitalSignatureService.signHash(currentHash);

        TraceLog traceLog = TraceLog.builder()
                .batchId(batchId)
                .batchCode(resolveBatchCode(batch))
                .actionType(action.name())
                .location(request.getLocation())
                .description(request.getNotes())
                .quantity(quantity)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .distanceFromFarmKm(distanceFromFarmKm)
                .withinGeofence(withinGeofence)
                .createdBy(userId)
                .previousHash(previousHash)
                .currentHash(currentHash)
                .signature(signature)
                .signatureAlgorithm("SHA256withRSA")
                .signedBy(userId)
                .signedAt(createdAt)
                .signatureVerified(true)
                .createdAt(createdAt)
                .build();

        traceLog = traceLogRepository.save(traceLog);
        log.info("Trace log created with integrity proof: action={}, batchId={}, hashPrefix={}",
            traceLog.getActionType(), request.getBatchId(), currentHash.substring(0, Math.min(12, currentHash.length())));

        traceAuditService.recordCreate(traceLog, normalizedRole, regionHeader, safeUuid(facilityHeader));

        return toResponse(traceLog, true, true, true);
    }

    public List<TraceLogResponse> getTraceLogsByBatch(String batchId) {
        List<TraceLog> logs = traceLogRepository.findByBatchIdOrderByCreatedAtAsc(UUID.fromString(batchId));
        return verifyAndMap(logs);
    }

    public List<TraceLogResponse> getTraceLogsByBatchCode(String batchCode) {
        List<TraceLog> logs = traceLogRepository.findByBatchCodeOrderByCreatedAtAsc(batchCode);
        if (logs.isEmpty()) {
            traceAuditService.recordPublicRead(batchCode, "DENIED_NOT_FOUND", "Public trace not found");
            throw new ResourceNotFoundException("TraceLog", "batchCode", batchCode);
        }

        List<TraceLogResponse> responses = verifyAndMap(logs);

        boolean hasCompromised = responses.stream().anyMatch(r -> "COMPROMISED".equals(r.getIntegrityStatus()));
        boolean approved = responses.stream().anyMatch(r -> "INSPECTION".equals(r.getAction()) && Boolean.TRUE.equals(r.getHashVerified())
                && Boolean.TRUE.equals(r.getSignatureVerified()) && Boolean.TRUE.equals(r.getChainVerified()));

        if (hasCompromised) {
            traceAuditService.recordPublicRead(batchCode, "READ_COMPROMISED", "Public trace returned with compromised integrity status");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Public trace is blocked due to compromised integrity");
        }

        if (!approved) {
            traceAuditService.recordPublicRead(batchCode, "READ_PENDING_INSPECTION", "Public trace returned without approved INSPECTION action");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Public trace is unavailable until inspection approval");
        }

        traceAuditService.recordPublicRead(batchCode, "READ_OK", "Public trace returned");
        return responses;
    }

    public boolean verifyTraceLogIntegrity(String traceId) {
        UUID traceUuid = UUID.fromString(traceId);
        TraceLog target = traceLogRepository.findById(traceUuid)
                .orElseThrow(() -> new ResourceNotFoundException("TraceLog", "id", traceId));

        List<TraceLogResponse> verifiedLogs = verifyAndMap(traceLogRepository.findByBatchIdOrderByCreatedAtAsc(target.getBatchId()));
        return verifiedLogs.stream()
                .filter(log -> traceId.equals(log.getId()))
                .findFirst()
                .map(log -> "VERIFIED".equals(log.getIntegrityStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("TraceLog", "id", traceId));
    }

    private List<TraceLogResponse> verifyAndMap(List<TraceLog> logs) {
        List<TraceLogResponse> responses = new ArrayList<>();

        String expectedPreviousHash = null;
        for (TraceLog log : logs) {
            String recalculatedHash = digitalSignatureService.generateHash(
                log.getBatchId(),
                log.getActionType(),
                log.getCreatedAt().toString(),
                log.getCreatedBy(),
                log.getLocation(),
                log.getDescription(),
                log.getQuantity(),
                log.getPreviousHash()
            );

            boolean hashVerified = Objects.equals(recalculatedHash, log.getCurrentHash());
            boolean chainVerified = Objects.equals(emptyToNull(log.getPreviousHash()), emptyToNull(expectedPreviousHash));
            boolean signatureVerified = log.getSignature() != null
                && !log.getSignature().isBlank()
                && digitalSignatureService.verifyHashSignature(log.getCurrentHash(), log.getSignature());

            responses.add(toResponse(log, hashVerified, signatureVerified, chainVerified));
            expectedPreviousHash = log.getCurrentHash();
        }

        return responses;
    }

    private TraceLogResponse toResponse(TraceLog log,
                                        boolean hashVerified,
                                        boolean signatureVerified,
                                        boolean chainVerified) {
        boolean compromised = !(hashVerified && signatureVerified && chainVerified);
        return TraceLogResponse.builder()
                .id(log.getId().toString())
                .batchId(log.getBatchId() == null ? "" : log.getBatchId().toString())
                .batchCode(log.getBatchCode())
                .action(log.getActionType())
                .location(log.getLocation())
                .latitude(log.getLatitude())
                .longitude(log.getLongitude())
                .notes(log.getDescription())
                .quantity(log.getQuantity())
                .distanceFromFarmKm(log.getDistanceFromFarmKm())
                .withinGeofence(log.getWithinGeofence())
                .timestamp(log.getCreatedAt().toString())
                .createdBy(log.getCreatedBy() == null ? "" : log.getCreatedBy().toString())
                .createdById(log.getCreatedBy() == null ? "" : log.getCreatedBy().toString())
                .previousHash(log.getPreviousHash())
                .signature(log.getSignature())
                .hashValue(log.getCurrentHash())
                .hashVerified(hashVerified)
                .signatureVerified(signatureVerified)
                .chainVerified(chainVerified)
                .integrityStatus(compromised ? "COMPROMISED" : "VERIFIED")
                .build();
    }

    private void validateGpsForAntiFraud(CreateTraceLogRequest request) {
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bat buoc phai dinh kem toa do GPS thuc te de chong gian lan."
            );
        }
    }

    private BigDecimal calculateDistanceFromFarm(BatchResponse batch, CreateTraceLogRequest request) {
        double farmLat = batch.getFarmLatitude();
        double farmLon = batch.getFarmLongitude();
        if (Double.compare(farmLat, 0.0) == 0 && Double.compare(farmLon, 0.0) == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Nong trai chua duoc cau hinh toa do goc, khong the thuc hien geofencing."
            );
        }
        double distance = GeofenceUtils.calculateDistance(farmLat, farmLon, request.getLatitude(), request.getLongitude());
        return BigDecimal.valueOf(distance).setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveAllowedRadiusKm(TraceAction action) {
        return switch (action) {
            case PLANTING, FERTILIZING, WATERING, SPRAYING, HARVESTING -> BigDecimal.valueOf(defaultRadiusKm);
            case PACKAGING -> BigDecimal.valueOf(packagingRadiusKm);
            case INSPECTION -> BigDecimal.valueOf(inspectionRadiusKm);
            case SHIPPING -> SHIPPING_RADIUS_SENTINEL_KM;
        };
    }

    private Double parseDouble(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private String normalizeRole(String roleHeader) {
        if (roleHeader == null || roleHeader.isBlank()) {
            return "";
        }

        String normalized = roleHeader.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            return normalized.substring("ROLE_".length());
        }
        return normalized;
    }

    private void validateBusinessRules(List<TraceLog> existingLogs,
                                       UUID batchId,
                                       TraceAction nextAction,
                                       BigDecimal nextQuantity) {
        boolean hasHarvesting = existingLogs.stream().anyMatch(l -> TraceAction.HARVESTING.name().equals(l.getActionType()));
        boolean hasInspection = existingLogs.stream().anyMatch(l -> TraceAction.INSPECTION.name().equals(l.getActionType()));

        if (hasHarvesting && (nextAction == TraceAction.PLANTING
                || nextAction == TraceAction.FERTILIZING
                || nextAction == TraceAction.WATERING
                || nextAction == TraceAction.SPRAYING)) {
            throw new IllegalArgumentException("Business rule violation: cannot add pre-harvest actions after HARVESTING");
        }

        if (nextAction == TraceAction.SHIPPING && !hasHarvesting) {
            throw new IllegalArgumentException("Business rule violation: SHIPPING requires prior HARVESTING");
        }

        if ((nextAction == TraceAction.PACKAGING || nextAction == TraceAction.SHIPPING) && !hasInspection) {
            throw new IllegalArgumentException("Business rule violation: PACKAGING/SHIPPING requires prior INSPECTION approval");
        }

        if (nextAction == TraceAction.SHIPPING || nextAction == TraceAction.PACKAGING) {
            BigDecimal totalProduced = traceLogRepository.sumQuantityByBatchIdAndActionType(batchId, TraceAction.HARVESTING.name());
            BigDecimal totalExported = traceLogRepository.sumQuantityByBatchIdAndActionType(batchId, nextAction.name());
            BigDecimal projectedExport = totalExported.add(nextQuantity == null ? BigDecimal.ZERO : nextQuantity);

            if (totalProduced.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Business rule violation: " + nextAction.name() + " requires available production quantity");
            }

            if (projectedExport.compareTo(totalProduced) > 0) {
                throw new IllegalArgumentException(
                        String.format("Business rule violation: action quantity exceeds production (total %.3f > production %.3f)",
                                projectedExport.doubleValue(),
                                totalProduced.doubleValue()));
            }
        }
    }

    private void validateQuantityForAction(TraceAction action, BigDecimal quantity) {
        boolean requiresQuantity = action == TraceAction.HARVESTING
                || action == TraceAction.PACKAGING
                || action == TraceAction.SHIPPING;

        if (requiresQuantity && quantity == null) {
            throw new IllegalArgumentException("Business rule violation: quantity is required for HARVESTING/PACKAGING/SHIPPING");
        }

        if (quantity != null && quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Business rule violation: quantity must be greater than 0");
        }
    }

    private UUID safeUuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveBatchCode(BatchResponse batch) {
        if (batch.getBatchCode() != null && !batch.getBatchCode().isBlank()) {
            return batch.getBatchCode();
        }
        if (batch.getBatchNumber() != null && !batch.getBatchNumber().isBlank()) {
            return batch.getBatchNumber();
        }
        return null;
    }
}
