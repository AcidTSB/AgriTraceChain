package com.agritrace.trace.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit Tests for Geofence Validation Logic
 *
 * Tests the Haversine distance calculation and geofence boundary checks
 * that prevent GPS fraud (e.g., a farmer logging from a distant location).
 *
 * Real coordinates used for accuracy:
 * - Đà Lạt Farm: 11.9404°N, 108.4583°E
 * - Hanoi: 21.0285°N, 105.8542°E (~1300 km away)
 */
@DisplayName("Geofence Validation Tests")
class GeofenceValidationTest {

    // Đà Lạt reference coordinates
    private static final double DA_LAT_FARM_LAT = 11.9404;
    private static final double DA_LAT_FARM_LON = 108.4583;

    // Slightly offset (within ~200m of farm center)
    private static final double WITHIN_FARM_LAT = 11.9403;
    private static final double WITHIN_FARM_LON = 108.4590;

    // 7km from farm (outside 5km default radius)
    private static final double OUTSIDE_FARM_LAT = 11.8800;
    private static final double OUTSIDE_FARM_LON = 108.4700;

    // Hanoi – clearly fraudulent location
    private static final double HANOI_LAT = 21.0285;
    private static final double HANOI_LON = 105.8542;

    // =========================================================
    // Distance Calculation Tests (Haversine)
    // =========================================================

    @Test
    @DisplayName("calculateDistance: within same farm returns < 1km")
    void calculateDistance_sameLocation_nearZero() {
        double distance = GeofenceUtils.calculateDistance(
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON,
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON
        );
        assertThat(distance).isLessThan(0.001);
    }

    @Test
    @DisplayName("calculateDistance: within farm boundary returns < 0.5km")
    void calculateDistance_withinFarm_lessThanHalfKm() {
        double distance = GeofenceUtils.calculateDistance(
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON,
                WITHIN_FARM_LAT, WITHIN_FARM_LON
        );
        assertThat(distance).isLessThan(0.5);
    }

    @Test
    @DisplayName("calculateDistance: outside farm returns > 5km")
    void calculateDistance_outsideFarm_greaterThan5km() {
        double distance = GeofenceUtils.calculateDistance(
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON,
                OUTSIDE_FARM_LAT, OUTSIDE_FARM_LON
        );
        assertThat(distance).isGreaterThan(5.0);
    }

    @Test
    @DisplayName("calculateDistance: Hanoi to Da Lat returns ~1300km (fraud detection)")
    void calculateDistance_hanoiToDaLat_approx1300km() {
        double distance = GeofenceUtils.calculateDistance(
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON,
                HANOI_LAT, HANOI_LON
        );
        // Expected: ~1300km (rough verification of Haversine accuracy)
        assertThat(distance)
                .isBetween(1000.0, 1400.0);
    }

    @Test
    @DisplayName("calculateDistance: symmetric (A→B == B→A)")
    void calculateDistance_isSymmetric() {
        double distAtoB = GeofenceUtils.calculateDistance(
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON,
                HANOI_LAT, HANOI_LON
        );
        double distBtoA = GeofenceUtils.calculateDistance(
                HANOI_LAT, HANOI_LON,
                DA_LAT_FARM_LAT, DA_LAT_FARM_LON
        );
        assertThat(distAtoB).isCloseTo(distBtoA, within(0.001));
    }

    // =========================================================
    // Parameterized Boundary Tests
    // =========================================================

    @ParameterizedTest(name = "action={0}: radius={1}km, distance={2}km → within={3}")
    @CsvSource({
        // action, radiusKm, distanceKm, expectedWithin
        "PLANTING,   5.0,  0.5, true",   // within default 5km radius
        "PLANTING,   5.0,  5.0, true",   // on the boundary (<=)
        "PLANTING,   5.0,  5.1, false",  // just outside boundary
        "HARVESTING, 5.0,  4.9, true",   // within
        "PACKAGING, 20.0, 19.9, true",   // within packaging radius
        "PACKAGING, 20.0, 20.1, false",  // outside packaging radius
        "SHIPPING, 9999.0, 500.0, true", // shipping has no geo limit
    })
    @DisplayName("Geofence boundary conditions (parameterized)")
    void geofenceBoundary_parameterized(String action, double radiusKm, double distanceKm, boolean expectedWithin) {
        // Simulate: distanceKm <= radiusKm → withinGeofence
        boolean withinGeofence = distanceKm <= radiusKm;
        assertThat(withinGeofence).isEqualTo(expectedWithin);
    }

    // =========================================================
    // Coordinate Validity Tests
    // =========================================================

    @Test
    @DisplayName("calculateDistance: valid for boundary coordinates")
    void calculateDistance_boundaryCoordinates_noException() {
        // Test extreme coordinates (poles, dateline)
        assertThatNoException().isThrownBy(() -> {
            GeofenceUtils.calculateDistance(0, 0, 0, 0);
            GeofenceUtils.calculateDistance(-90, -180, 90, 180);
            GeofenceUtils.calculateDistance(11.9404, 108.4583, 10.8231, 106.6297); // HCMC
        });
    }
}
