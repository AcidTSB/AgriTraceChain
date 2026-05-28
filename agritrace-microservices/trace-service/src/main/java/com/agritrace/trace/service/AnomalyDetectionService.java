package com.agritrace.trace.service;

import com.agritrace.trace.entity.TraceLog;
import com.agritrace.trace.repository.TraceLogRepository;
import com.agritrace.trace.util.GeofenceUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Anomaly Detection Service for Supply Chain Integrity.
 *
 * <p><b>Architecture:</b> This service is invoked <em>after</em> a trace log is successfully
 * persisted. It never blocks the main create-trace flow. Detection results are logged as
 * structured JSON events that can be alerted on via Grafana/ELK.</p>
 *
 * <p><b>Detection Algorithms:</b></p>
 * <ol>
 *   <li><b>GPS Teleportation:</b> New log's GPS is farther from the previous log's GPS than
 *       physically possible given time elapsed (speed > 500 km/h → suspicious)</li>
 *   <li><b>Duplicate Entry:</b> Same actor logs the same action for the same batch
 *       within a configurable window (default: 5 minutes)</li>
 *   <li><b>Sequence Violation:</b> Detects obviously invalid action sequences, e.g.,
 *       SHIPPING before HARVESTING</li>
 *   <li><b>Quantity Anomaly:</b> Output quantity exceeds input quantity by more than
 *       a configurable tolerance</li>
 * </ol>
 *
 * <p><b>Design Decision:</b> Anomalies are logged but NOT blocking. In production,
 * these log events would trigger Grafana alerts or be pushed to a notification queue.
 * Blocking would introduce latency and false-positive rejections.</p>
 *
 * <p><b>Extension Point:</b> Future versions can use ML models (e.g., Isolation Forest)
 * for behavioral anomaly detection beyond these rule-based checks.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final TraceLogRepository traceLogRepository;

    /**
     * Maximum plausible travel speed to flag GPS teleportation.
     * 500 km/h accounts for air freight (a legitimate supply chain step).
     */
    private static final double MAX_PLAUSIBLE_SPEED_KMH = 500.0;

    /**
     * Duplicate action window in minutes.
     * Two identical actions for the same batch by the same user within this window = suspicious.
     */
    private static final int DUPLICATE_WINDOW_MINUTES = 5;

    /**
     * Maximum allowed quantity inflation (output/input ratio).
     * >1.2 (20% more than input) triggers an anomaly alert.
     */
    @Value("${trace.anomaly.max-quantity-ratio:1.2}")
    private double maxQuantityRatio;

    @Value("${trace.anomaly.detection-enabled:true}")
    private boolean detectionEnabled;

    /**
     * Run all anomaly checks on the newly created trace log.
     * This method is called AFTER the trace log transaction has committed.
     *
     * <p>All checks are non-blocking – exceptions are caught and logged, not propagated.</p>
     *
     * @param newLog The freshly persisted trace log to validate
     */
    public void checkAnomalies(TraceLog newLog) {
        if (!detectionEnabled) {
            return;
        }

        try {
            checkGpsTeleportation(newLog);
        } catch (Exception e) {
            log.warn("GPS anomaly check failed: {}", e.getMessage());
        }

        try {
            checkDuplicateEntry(newLog);
        } catch (Exception e) {
            log.warn("Duplicate check failed: {}", e.getMessage());
        }

        try {
            checkSequenceViolation(newLog);
        } catch (Exception e) {
            log.warn("Sequence check failed: {}", e.getMessage());
        }

        try {
            checkQuantityAnomaly(newLog);
        } catch (Exception e) {
            log.warn("Quantity check failed: {}", e.getMessage());
        }
    }

    // =========================================================
    // CHECK 1: GPS Teleportation
    // =========================================================

    /**
     * Detects GPS teleportation: a location change that is physically impossible
     * given the time elapsed between two consecutive trace logs.
     *
     * <p>Algorithm: speed = distance(prev_gps, curr_gps) / time_elapsed_hours.
     * If speed > MAX_PLAUSIBLE_SPEED_KMH, flag as anomaly.</p>
     *
     * <p>This catches scenarios like:
     * <ul>
     *   <li>GPS spoofing (faking location)</li>
     *   <li>Manual backdating of trace logs</li>
     *   <li>Copy-paste errors in GPS coordinates</li>
     * </ul></p>
     */
    @Transactional(readOnly = true)
    public void checkGpsTeleportation(TraceLog newLog) {
        if (newLog.getLatitude() == null || newLog.getLongitude() == null) {
            return; // No GPS data to check
        }

        // Find the most recent previous log for this batch
        List<TraceLog> recentLogs = traceLogRepository.findByBatchIdOrderByCreatedAtDesc(newLog.getBatchId());
        TraceLog previousLog = recentLogs.stream()
                .filter(log -> !log.getId().equals(newLog.getId()))
                .filter(log -> log.getLatitude() != null && log.getLongitude() != null)
                .findFirst()
                .orElse(null);

        if (previousLog == null) {
            return; // No previous GPS data
        }

        double distanceKm = GeofenceUtils.calculateDistance(
                previousLog.getLatitude(), previousLog.getLongitude(),
                newLog.getLatitude(), newLog.getLongitude()
        );

        // Calculate time elapsed in hours
        Duration elapsed = Duration.between(previousLog.getCreatedAt(), newLog.getCreatedAt());
        double elapsedHours = elapsed.toMinutes() / 60.0;

        if (elapsedHours <= 0) {
            elapsedHours = 0.001; // Prevent division by zero
        }

        double impliedSpeedKmh = distanceKm / elapsedHours;

        if (impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH && distanceKm > 10.0) {
            log.warn("ANOMALY:GPS_TELEPORTATION batchId={} traceLogId={} " +
                    "distanceKm={:.2f} elapsedMinutes={} impliedSpeedKmh={:.1f} " +
                    "prevLocation=({},{}) currLocation=({},{}) userId={}",
                    newLog.getBatchId(), newLog.getId(),
                    distanceKm, elapsed.toMinutes(),
                    impliedSpeedKmh,
                    previousLog.getLatitude(), previousLog.getLongitude(),
                    newLog.getLatitude(), newLog.getLongitude(),
                    newLog.getCreatedBy());
        }
    }

    // =========================================================
    // CHECK 2: Duplicate Entry
    // =========================================================

    /**
     * Detects duplicate trace log entries.
     * Same user logging the same action for the same batch within DUPLICATE_WINDOW_MINUTES.
     *
     * <p>This catches:
     * <ul>
     *   <li>Double-click submissions (UI bug)</li>
     *   <li>Network retry causing duplicate inserts</li>
     *   <li>Fraudulent re-logging of old data</li>
     * </ul></p>
     */
    @Transactional(readOnly = true)
    public void checkDuplicateEntry(TraceLog newLog) {
        LocalDateTime windowStart = newLog.getCreatedAt().minusMinutes(DUPLICATE_WINDOW_MINUTES);

        List<TraceLog> recentSameAction = traceLogRepository.findByBatchIdOrderByCreatedAtDesc(newLog.getBatchId())
                .stream()
                .filter(log -> !log.getId().equals(newLog.getId()))
                .filter(log -> log.getActionType().equals(newLog.getActionType()))
                .filter(log -> log.getCreatedBy().equals(newLog.getCreatedBy()))
                .filter(log -> log.getCreatedAt().isAfter(windowStart))
                .toList();

        if (!recentSameAction.isEmpty()) {
            log.warn("ANOMALY:DUPLICATE_ENTRY batchId={} traceLogId={} action={} userId={} " +
                    "duplicateCount={} windowMinutes={} earliestDuplicate={}",
                    newLog.getBatchId(), newLog.getId(),
                    newLog.getActionType(), newLog.getCreatedBy(),
                    recentSameAction.size(), DUPLICATE_WINDOW_MINUTES,
                    recentSameAction.get(0).getCreatedAt());
        }
    }

    // =========================================================
    // CHECK 3: Sequence Violation
    // =========================================================

    /**
     * Detects invalid action sequences in the supply chain.
     *
     * <p>Valid supply chain sequence (simplified):
     * PLANTING → FERTILIZING/WATERING → HARVESTING → PROCESSING → PACKAGING → SHIPPING → INSPECTION</p>
     *
     * <p>Invalid examples:
     * <ul>
     *   <li>SHIPPING before HARVESTING</li>
     *   <li>PROCESSING before PLANTING</li>
     *   <li>PLANTING after SHIPPING</li>
     * </ul></p>
     */
    @Transactional(readOnly = true)
    public void checkSequenceViolation(TraceLog newLog) {
        // Actions that cannot occur before HARVESTING
        List<String> requiresHarvest = List.of("PROCESSING", "PACKAGING", "SHIPPING", "INSPECTION");
        // Actions that cannot occur after SHIPPING
        List<String> cannotFollowShipping = List.of("PLANTING", "FERTILIZING", "WATERING", "HARVESTING");

        List<TraceLog> allBatchLogs = traceLogRepository.findByBatchIdOrderByCreatedAtDesc(newLog.getBatchId())
                .stream()
                .filter(log -> !log.getId().equals(newLog.getId()))
                .toList();

        String newAction = newLog.getActionType();

        // Check: action requires HARVESTING but no HARVESTING exists yet
        if (requiresHarvest.contains(newAction)) {
            boolean hasHarvesting = allBatchLogs.stream()
                    .anyMatch(log -> "HARVESTING".equals(log.getActionType()));
            if (!hasHarvesting) {
                log.warn("ANOMALY:SEQUENCE_VIOLATION batchId={} traceLogId={} " +
                        "action={} reason='Action requires prior HARVESTING but none found' userId={}",
                        newLog.getBatchId(), newLog.getId(), newAction, newLog.getCreatedBy());
            }
        }

        // Check: action after SHIPPING (except INSPECTION)
        if (cannotFollowShipping.contains(newAction)) {
            boolean hasShipping = allBatchLogs.stream()
                    .anyMatch(log -> "SHIPPING".equals(log.getActionType()));
            if (hasShipping) {
                log.warn("ANOMALY:SEQUENCE_VIOLATION batchId={} traceLogId={} " +
                        "action={} reason='Action occurred after SHIPPING' userId={}",
                        newLog.getBatchId(), newLog.getId(), newAction, newLog.getCreatedBy());
            }
        }
    }

    // =========================================================
    // CHECK 4: Quantity Anomaly
    // =========================================================

    /**
     * Detects quantity anomalies: output quantities that are unrealistically high
     * compared to input quantities.
     *
     * <p>Rule: HARVESTING quantity > PLANTING quantity * maxQuantityRatio → anomaly.
     * This catches inflated yield reporting (a common agricultural fraud type).</p>
     *
     * <p>Configurable via {@code trace.anomaly.max-quantity-ratio} (default: 1.2 = 20% increase allowed).</p>
     */
    @Transactional(readOnly = true)
    public void checkQuantityAnomaly(TraceLog newLog) {
        if (newLog.getQuantity() == null) {
            return;
        }
        if (!"HARVESTING".equals(newLog.getActionType())) {
            return; // Only check harvest quantity vs planting
        }

        List<TraceLog> allLogs = traceLogRepository.findByBatchIdOrderByCreatedAtDesc(newLog.getBatchId());

        // Find the PLANTING quantity for this batch
        BigDecimal plantingQuantity = allLogs.stream()
                .filter(log -> "PLANTING".equals(log.getActionType()))
                .filter(log -> log.getQuantity() != null)
                .map(TraceLog::getQuantity)
                .findFirst()
                .orElse(null);

        if (plantingQuantity == null || plantingQuantity.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        double ratio = newLog.getQuantity().doubleValue() / plantingQuantity.doubleValue();

        if (ratio > maxQuantityRatio) {
            log.warn("ANOMALY:QUANTITY_ANOMALY batchId={} traceLogId={} " +
                    "action={} harvestQuantity={} plantingQuantity={} ratio={:.2f} maxRatio={} userId={}",
                    newLog.getBatchId(), newLog.getId(),
                    newLog.getActionType(),
                    newLog.getQuantity(), plantingQuantity,
                    ratio, maxQuantityRatio,
                    newLog.getCreatedBy());
        }
    }
}
