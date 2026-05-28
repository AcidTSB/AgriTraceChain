package com.agritrace.trace.service;

import com.agritrace.trace.entity.TraceAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit Tests for DigitalSignatureService
 *
 * Tests the core cryptographic functions:
 * 1. SHA-256 hash generation (hash chain integrity)
 * 2. RSA digital signature (non-repudiation)
 * 3. Canonical payload (determinism - same input = same hash)
 * 4. Hash chain linkage (previous_hash linkage)
 */
@DisplayName("DigitalSignatureService Tests")
class DigitalSignatureServiceTest {

    private DigitalSignatureService service;
    private KeyPair testKeyPair;

    @BeforeEach
    void setUp() throws Exception {
        service = new DigitalSignatureService();

        // Generate a fresh RSA 2048-bit keypair for testing
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        testKeyPair = gen.generateKeyPair();

        // Inject test keys via reflection (avoids DB dependency in unit tests)
        var signerPrivKeyField = DigitalSignatureService.class.getDeclaredField("signerPrivateKey");
        signerPrivKeyField.setAccessible(true);
        signerPrivKeyField.set(service, testKeyPair.getPrivate());

        var signerPubKeyField = DigitalSignatureService.class.getDeclaredField("signerPublicKey");
        signerPubKeyField.setAccessible(true);
        signerPubKeyField.set(service, testKeyPair.getPublic());
    }

    // =========================================================
    // Hash Generation Tests
    // =========================================================

    @Test
    @DisplayName("generateHash: same inputs produce same hash (deterministic)")
    void generateHash_samInputs_sameHash() {
        UUID batchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String timestamp = "2026-05-27T10:00:00";
        String action = TraceAction.PLANTING.name();
        String location = "Đà Lạt, Lâm Đồng";
        String notes = "Gieo hạt cà chua";
        BigDecimal quantity = new BigDecimal("50.000");
        String prevHash = null;

        String hash1 = service.generateHash(batchId, action, timestamp, userId, location, notes, quantity, prevHash);
        String hash2 = service.generateHash(batchId, action, timestamp, userId, location, notes, quantity, prevHash);

        assertThat(hash1)
                .isNotNull()
                .isNotBlank()
                .isEqualTo(hash2);
    }

    @Test
    @DisplayName("generateHash: different action produces different hash")
    void generateHash_differentAction_differentHash() {
        UUID batchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String timestamp = "2026-05-27T10:00:00";
        String location = "Đà Lạt";
        BigDecimal quantity = new BigDecimal("50.000");

        String plantingHash = service.generateHash(batchId, TraceAction.PLANTING.name(),
                timestamp, userId, location, null, quantity, null);
        String harvestHash = service.generateHash(batchId, TraceAction.HARVESTING.name(),
                timestamp, userId, location, null, quantity, null);

        assertThat(plantingHash).isNotEqualTo(harvestHash);
    }

    @Test
    @DisplayName("generateHash: changing previousHash breaks chain (tamper detection)")
    void generateHash_changedPreviousHash_differentCurrentHash() {
        UUID batchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String timestamp = "2026-05-27T10:00:00";

        String hashWithNoPrevious = service.generateHash(batchId, "PLANTING", timestamp, userId,
                "Đà Lạt", null, null, null);
        String hashWithFakePrevious = service.generateHash(batchId, "PLANTING", timestamp, userId,
                "Đà Lạt", null, null, "TAMPERED_HASH");

        assertThat(hashWithNoPrevious).isNotEqualTo(hashWithFakePrevious);
    }

    @Test
    @DisplayName("generateHash: null quantity handled (PLANTING has no quantity)")
    void generateHash_nullQuantity_noException() {
        UUID batchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        assertThatNoException().isThrownBy(() ->
                service.generateHash(batchId, "PLANTING", "2026-05-27T10:00:00",
                        userId, "Location", null, null, null)
        );
    }

    @Test
    @DisplayName("generateHash: quantity precision is stable (100.0 == 100.000)")
    void generateHash_quantityPrecision_stable() {
        UUID batchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String timestamp = "2026-05-27T10:00:00";

        // BigDecimal("100.0") and BigDecimal("100.000") should produce same canonical string
        String hash1 = service.generateHash(batchId, "HARVESTING", timestamp, userId,
                "Farm", null, new BigDecimal("100.0"), null);
        String hash2 = service.generateHash(batchId, "HARVESTING", timestamp, userId,
                "Farm", null, new BigDecimal("100.000"), null);

        // Both should be equal because canonicalPayload strips trailing zeros
        assertThat(hash1).isEqualTo(hash2);
    }

    // =========================================================
    // Hash Chain Integrity Tests
    // =========================================================

    @Test
    @DisplayName("Hash Chain: chain of 3 logs links correctly")
    void hashChain_threeLogsLinkedCorrectly() {
        UUID batchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        // Log 1: no previous hash (genesis)
        String hash1 = service.generateHash(batchId, "PLANTING", "2026-05-01T08:00:00",
                userId, "Farm A", null, null, null);
        assertThat(hash1).isNotNull();

        // Log 2: links to hash1
        String hash2 = service.generateHash(batchId, "FERTILIZING", "2026-05-10T08:00:00",
                userId, "Farm A", "Bón phân NPK", new BigDecimal("5.0"), hash1);
        assertThat(hash2).isNotNull().isNotEqualTo(hash1);

        // Log 3: links to hash2
        String hash3 = service.generateHash(batchId, "HARVESTING", "2026-05-30T08:00:00",
                userId, "Farm A", null, new BigDecimal("100.0"), hash2);
        assertThat(hash3).isNotNull().isNotEqualTo(hash2);

        // If we tamper log1 (change its previousHash) → hash2 will differ
        String tamperedHash2 = service.generateHash(batchId, "FERTILIZING", "2026-05-10T08:00:00",
                userId, "Farm A", "Bón phân NPK", new BigDecimal("5.0"), "TAMPERED");
        assertThat(tamperedHash2).isNotEqualTo(hash2);
    }

    // =========================================================
    // Digital Signature Tests
    // =========================================================

    @Test
    @DisplayName("signData + verifySignature: valid signature verifies correctly")
    void signAndVerify_validSignature_returnsTrue() throws Exception {
        String testData = "agritrace:batch:ABC123:PLANTING:2026-05-27";
        String publicKeyBase64 = java.util.Base64.getEncoder()
                .encodeToString(testKeyPair.getPublic().getEncoded());

        String signature = service.signData(testData, testKeyPair.getPrivate());

        assertThat(signature).isNotNull().isNotBlank();
        assertThat(service.verifySignature(testData, signature, publicKeyBase64)).isTrue();
    }

    @Test
    @DisplayName("verifySignature: tampered data fails verification")
    void verifySignature_tamperedData_returnsFalse() throws Exception {
        String originalData = "agritrace:batch:ABC123:PLANTING:2026-05-27";
        String tamperedData = "agritrace:batch:ABC123:PLANTING:2026-05-28"; // date changed
        String publicKeyBase64 = java.util.Base64.getEncoder()
                .encodeToString(testKeyPair.getPublic().getEncoded());

        String signature = service.signData(originalData, testKeyPair.getPrivate());

        assertThat(service.verifySignature(tamperedData, signature, publicKeyBase64)).isFalse();
    }

    @Test
    @DisplayName("signHash + verifyHashSignature: trace-service signer key round-trip")
    void signHashAndVerify_roundTrip_success() {
        String testHash = service.generateHash(
                UUID.randomUUID(), "INSPECTION", "2026-05-27T10:00:00",
                UUID.randomUUID(), "Inspection Office", "Đạt chuẩn VietGAP", null, "prevHash123"
        );

        String signature = service.signHash(testHash);
        assertThat(signature).isNotNull().isNotBlank();

        boolean verified = service.verifyHashSignature(testHash, signature);
        assertThat(verified).isTrue();
    }

    @Test
    @DisplayName("verifyHashSignature: wrong hash fails")
    void verifyHashSignature_wrongHash_returnsFalse() {
        String hash = service.generateHash(UUID.randomUUID(), "PLANTING", "2026-05-27T00:00:00",
                UUID.randomUUID(), "Loc", null, null, null);
        String signature = service.signHash(hash);

        assertThat(service.verifyHashSignature("different_hash_content", signature)).isFalse();
    }
}
