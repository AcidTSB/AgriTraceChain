package com.agritrace.trace.service;

import com.agritrace.proto.batch.BatchResponse;
import com.agritrace.proto.batch.OwnershipResponse;
import com.agritrace.proto.user.UserResponse;
import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.trace.dto.CreateTraceLogRequest;
import com.agritrace.trace.dto.TraceLogResponse;
import com.agritrace.trace.entity.TraceAction;
import com.agritrace.trace.entity.TraceLog;
import com.agritrace.trace.entity.TraceOutboxEvent;
import com.agritrace.trace.grpc.BatchGrpcClient;
import com.agritrace.trace.grpc.UserGrpcClient;
import com.agritrace.trace.repository.TraceLogRepository;
import com.agritrace.trace.repository.TraceOutboxRepository;
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
    @Autowired
    private TraceOutboxRepository outboxRepository;
    @Autowired
    private AnomalyDetectionService anomalyDetectionService;

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

        // === OUTBOX PATTERN ===
        // Persist event in the SAME transaction as the trace log.
        // OutboxPublisherService will pick this up asynchronously and publish to Kafka.
        // This guarantees no event is lost even if the service crashes after this TX.
        String outboxPayload = String.format(
            "{\"traceLogId\":\"%s\",\"batchId\":\"%s\",\"batchCode\":\"%s\",\"action\":\"%s\",\"userId\":\"%s\",\"timestamp\":\"%s\"}",
            traceLog.getId(), batchId, traceLog.getBatchCode(),
            action.name(), userId, createdAt
        );
        TraceOutboxEvent outboxEvent = TraceOutboxEvent.builder()
            .traceLogId(traceLog.getId())
            .topic("trace-events")
            .partitionKey(batchId.toString())   // same partition = ordered delivery per batch
            .payload(outboxPayload)
            .eventType("TRACE_CREATED")
            .status("PENDING")
            .build();
        outboxRepository.save(outboxEvent);
        log.debug("Outbox event queued: eventId={}, action={}", outboxEvent.getId(), action.name());
        // === END OUTBOX PATTERN ===

        traceAuditService.recordCreate(traceLog, normalizedRole, regionHeader, safeUuid(facilityHeader));

        // === ANOMALY DETECTION ===
        // Non-blocking: runs checks AFTER commit. Anomalies are logged as structured
        // WARNING events (ANOMALY:*) for Grafana alerting. Does NOT rollback the trace log.
        final TraceLog finalTraceLog = traceLog;
        try {
            anomalyDetectionService.checkAnomalies(finalTraceLog);
        } catch (Exception e) {
            log.warn("Anomaly detection failed for traceLogId={}: {}", finalTraceLog.getId(), e.getMessage());
        }
        // === END ANOMALY DETECTION ===

        return toResponse(traceLog, true, true, true);
    }

    public List<TraceLogResponse> getTraceLogsByBatch(String batchId) {
        List<TraceLog> logs = traceLogRepository.findByBatchIdOrderByCreatedAtAsc(UUID.fromString(batchId));
        return verifyAndMap(logs);
    }

    public List<TraceLogResponse> getTraceLogsByBatchCode(String batchCode) {
        List<TraceLog> logs = traceLogRepository.findByBatchCodeOrderByCreatedAtAsc(batchCode);
        if (logs.isEmpty()) {
            traceAuditService.recordPublicRead(batchCode, "DENIED_NOT_FOUND", "Public trace not found", null);
            throw new ResourceNotFoundException("TraceLog", "batchCode", batchCode);
        }

        List<TraceLogResponse> responses = verifyAndMap(logs);

        boolean hasCompromised = responses.stream().anyMatch(r -> "COMPROMISED".equals(r.getIntegrityStatus()));
        boolean hasInspection = responses.stream().anyMatch(r -> "INSPECTION".equals(r.getAction()));

        if (!hasInspection) {
            traceAuditService.recordPublicRead(batchCode, "READ_PENDING_INSPECTION", "Public trace returned without INSPECTION action", null);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Public trace is unavailable until inspection approval");
        }

        if (hasCompromised) {
            String batchOwnerId = responses.isEmpty() ? null : responses.get(0).getCreatedById();
            traceAuditService.recordPublicRead(batchCode, "READ_COMPROMISED", "Public trace returned with compromised integrity status", batchOwnerId);

            // Decoupled compromised update: check status and call markCompromised via gRPC (idempotent, try-catch)
            try {
                String targetBatchId = responses.get(0).getBatchId();
                if (targetBatchId != null && !targetBatchId.isBlank()) {
                    com.agritrace.proto.batch.BatchResponse batchInfo = batchGrpcClient.getBatchById(targetBatchId);
                    if (batchInfo != null && !batchInfo.getIsCompromised()) {
                        String firstCompromisedLogId = responses.stream()
                                .filter(r -> "COMPROMISED".equals(r.getIntegrityStatus()))
                                .map(TraceLogResponse::getId)
                                .findFirst()
                                .orElse(null);
                        String compromiseReason = responses.stream()
                                .filter(r -> "COMPROMISED".equals(r.getIntegrityStatus()))
                                .map(r -> {
                                    if (Boolean.FALSE.equals(r.getHashVerified())) return "Hash mismatch on action " + r.getAction();
                                    if (Boolean.FALSE.equals(r.getSignatureVerified())) return "Signature invalid on action " + r.getAction();
                                    return "Chain broken on action " + r.getAction();
                                })
                                .findFirst()
                                .orElse("Integrity verification failed");

                        batchGrpcClient.markBatchCompromised(batchCode, compromiseReason, firstCompromisedLogId);
                        log.warn("🚨 Successfully marked batch {} compromised in product-service via gRPC", batchCode);
                    }
                }
            } catch (Exception ex) {
                log.error("Failed to mark batch compromised in product-service (non-blocking): {}", ex.getMessage());
            }

            return responses;
        }

        traceAuditService.recordPublicRead(batchCode, "READ_OK", "Public trace returned", null);
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

    private String getActionNameVi(TraceAction action) {
        if (action == null) return "hành động";
        return switch (action) {
            case PLANTING -> "gieo hạt / trồng cây";
            case FERTILIZING -> "bón phân";
            case WATERING -> "tưới nước";
            case SPRAYING -> "phun thuốc";
            case HARVESTING -> "thu hoạch";
            case PACKAGING -> "đóng gói";
            case SHIPPING -> "vận chuyển";
            case INSPECTION -> "kiểm định";
        };
    }

    private void validateBusinessRules(List<TraceLog> existingLogs,
                                       UUID batchId,
                                       TraceAction nextAction,
                                       BigDecimal nextQuantity) {
        boolean hasPlanting = existingLogs.stream().anyMatch(l -> TraceAction.PLANTING.name().equals(l.getActionType()));
        boolean hasHarvesting = existingLogs.stream().anyMatch(l -> TraceAction.HARVESTING.name().equals(l.getActionType()));
        boolean hasShipping = existingLogs.stream().anyMatch(l -> TraceAction.SHIPPING.name().equals(l.getActionType()));
        boolean hasPackaging = existingLogs.stream().anyMatch(l -> TraceAction.PACKAGING.name().equals(l.getActionType()));

        // Rule 1: PLANTING only allowed if no logs exist.
        if (nextAction == TraceAction.PLANTING && !existingLogs.isEmpty()) {
            throw new IllegalArgumentException("Không thể gieo hạt / trồng cây khi lô hàng đã có nhật ký.");
        }

        // Rule 2: FERTILIZING, WATERING, SPRAYING only allowed after PLANTING and before HARVESTING/SHIPPING.
        if (nextAction == TraceAction.FERTILIZING || nextAction == TraceAction.WATERING || nextAction == TraceAction.SPRAYING) {
            if (!hasPlanting) {
                throw new IllegalArgumentException("Không thể ghi nhật ký " + getActionNameVi(nextAction) + " trước khi gieo hạt / trồng cây.");
            }
            if (hasHarvesting) {
                throw new IllegalArgumentException("Không thể ghi nhật ký " + getActionNameVi(nextAction) + " vì lô hàng đã được thu hoạch.");
            }
            if (hasShipping) {
                throw new IllegalArgumentException("Không thể ghi nhật ký " + getActionNameVi(nextAction) + " vì lô hàng đã được vận chuyển.");
            }
        }

        // Rule 3: HARVESTING requires PLANTING, and is blocked after SHIPPING.
        if (nextAction == TraceAction.HARVESTING) {
            if (!hasPlanting) {
                throw new IllegalArgumentException("Không thể thu hoạch vì lô hàng chưa được gieo hạt / trồng cây.");
            }
            if (hasShipping) {
                throw new IllegalArgumentException("Không thể ghi nhật ký thu hoạch vì lô hàng đã được vận chuyển.");
            }
        }

        // Rule 4: PACKAGING requires HARVESTING, and is blocked after SHIPPING.
        if (nextAction == TraceAction.PACKAGING) {
            if (!hasHarvesting) {
                throw new IllegalArgumentException("Không thể đóng gói vì lô hàng chưa được thu hoạch.");
            }
            if (hasShipping) {
                throw new IllegalArgumentException("Không thể đóng gói vì lô hàng đã được vận chuyển.");
            }
        }

        // Rule 5: SHIPPING requires HARVESTING. If packaging exists in the timeline, it is already before shipping.
        if (nextAction == TraceAction.SHIPPING) {
            if (!hasHarvesting) {
                throw new IllegalArgumentException("Không thể vận chuyển lô hàng trước khi thu hoạch.");
            }
        }

        // Quantity checks for SHIPPING or PACKAGING
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
