package com.agritrace.trace.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.UUID;

@Service
@Slf4j
public class DigitalSignatureService {
    
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";
    private static final String KEY_ALGORITHM = "RSA";
    private static final int KEY_ROW_ID = 1;

    @Value("${trace.signature.private-key:}")
    private String privateKeyBase64;

    @Value("${trace.signature.public-key:}")
    private String publicKeyBase64;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private PrivateKey signerPrivateKey;
    private PublicKey signerPublicKey;

    @PostConstruct
    void initializeSignerKeys() {
        try {
            if (privateKeyBase64 != null && !privateKeyBase64.isBlank()
                    && publicKeyBase64 != null && !publicKeyBase64.isBlank()) {
                this.signerPrivateKey = parsePrivateKey(privateKeyBase64);
                this.signerPublicKey = parsePublicKey(publicKeyBase64);
                log.info("Loaded trace signer keypair from configuration");
                return;
            }

            if (loadSignerKeysFromDatabase()) {
                log.info("Loaded trace signer keypair from persistent database store");
                return;
            }

            generateAndPersistSignerKeys();
            log.info("Generated and persisted trace signer keypair in database store");
        } catch (Exception e) {
            log.error("Failed to initialize persistent signer keys; falling back to ephemeral in-memory keypair", e);
            initializeEphemeralKeys();
        }
    }
    
    /**
     * Sign data using private key
     */
    public String signData(String data, PrivateKey privateKey) throws Exception {
        Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
        signature.initSign(privateKey);
        signature.update(data.getBytes(StandardCharsets.UTF_8));
        byte[] signatureBytes = signature.sign();
        return Base64.getEncoder().encodeToString(signatureBytes);
    }

    /**
     * Sign hash with trace-service signer key.
     */
    public String signHash(String hash) {
        try {
            return signData(hash, signerPrivateKey);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign trace hash", e);
        }
    }
    
    /**
     * Verify signature using public key
     */
    public boolean verifySignature(String data, String signatureBase64, String publicKeyBase64) {
        try {
            PublicKey publicKey = parsePublicKey(publicKeyBase64);
            
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initVerify(publicKey);
            signature.update(data.getBytes(StandardCharsets.UTF_8));
            
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            return signature.verify(signatureBytes);
            
        } catch (Exception e) {
            log.error("Signature verification failed", e);
            return false;
        }
    }

    /**
     * Verify hash signature using trace-service signer public key.
     */
    public boolean verifyHashSignature(String hash, String signatureBase64) {
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initVerify(signerPublicKey);
            signature.update(hash.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            return signature.verify(signatureBytes);
        } catch (Exception e) {
            log.error("Trace hash signature verification failed", e);
            return false;
        }
    }

    public String getSignerPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(signerPublicKey.getEncoded());
    }
    
    /**
     * Generate hash for trace log (used before signing)
     */
    public String generateHash(UUID batchId,
                               String action,
                               String timestamp,
                               UUID createdBy,
                               String location,
                               String notes,
                               BigDecimal quantity,
                               String previousHash) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String data = canonicalPayload(batchId, action, timestamp, createdBy, location, notes, quantity, previousHash);
            byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("Hash generation failed", e);
        }
    }

    public String canonicalPayload(UUID batchId,
                                   String action,
                                   String timestamp,
                                   UUID createdBy,
                                   String location,
                                   String notes,
                                   BigDecimal quantity,
                                   String previousHash) {
        return String.join("|",
                safe(batchId),
                safe(action),
                safe(timestamp),
                safe(createdBy),
                safe(location),
                safe(notes),
                safeQuantity(quantity),
                safe(previousHash));
    }

    private String safeQuantity(BigDecimal value) {
        if (value == null) {
            return "";
        }
        return value.stripTrailingZeros().toPlainString();
    }

    private String safe(Object value) {
        return value == null ? "" : value.toString();
    }

    private PublicKey parsePublicKey(String keyBase64) throws Exception {
        byte[] publicKeyBytes = Base64.getDecoder().decode(keyBase64);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicKeyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(KEY_ALGORITHM);
        return keyFactory.generatePublic(keySpec);
    }

    private PrivateKey parsePrivateKey(String keyBase64) throws Exception {
        byte[] privateKeyBytes = Base64.getDecoder().decode(keyBase64);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(privateKeyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(KEY_ALGORITHM);
        return keyFactory.generatePrivate(keySpec);
    }

    private boolean loadSignerKeysFromDatabase() {
        ensureSignerKeyStoreTable();
        return jdbcTemplate.query(
                "SELECT private_key, public_key FROM trace_signer_keypair WHERE id = ?",
                rs -> {
                    if (!rs.next()) {
                        return false;
                    }

                    try {
                        String storedPrivateKey = rs.getString("private_key");
                        String storedPublicKey = rs.getString("public_key");
                        this.signerPrivateKey = parsePrivateKey(storedPrivateKey);
                        this.signerPublicKey = parsePublicKey(storedPublicKey);
                        return true;
                    } catch (Exception ex) {
                        throw new IllegalStateException("Failed to parse persisted signer keys", ex);
                    }
                },
                KEY_ROW_ID
        );
    }

    private void generateAndPersistSignerKeys() throws Exception {
        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(KEY_ALGORITHM);
        keyPairGenerator.initialize(2048);
        KeyPair generated = keyPairGenerator.generateKeyPair();
        String generatedPrivateKey = Base64.getEncoder().encodeToString(generated.getPrivate().getEncoded());
        String generatedPublicKey = Base64.getEncoder().encodeToString(generated.getPublic().getEncoded());

        ensureSignerKeyStoreTable();
        jdbcTemplate.update(
                """
                INSERT INTO trace_signer_keypair (id, private_key, public_key)
                VALUES (?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """,
                KEY_ROW_ID,
                generatedPrivateKey,
                generatedPublicKey
        );

        if (!loadSignerKeysFromDatabase()) {
            this.signerPrivateKey = generated.getPrivate();
            this.signerPublicKey = generated.getPublic();
        }
    }

    private void ensureSignerKeyStoreTable() {
        jdbcTemplate.execute(
                """
                CREATE TABLE IF NOT EXISTS trace_signer_keypair (
                    id SMALLINT PRIMARY KEY CHECK (id = 1),
                    private_key TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
        );
    }

    private void initializeEphemeralKeys() {
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(KEY_ALGORITHM);
            keyPairGenerator.initialize(2048);
            KeyPair keyPair = keyPairGenerator.generateKeyPair();
            this.signerPrivateKey = keyPair.getPrivate();
            this.signerPublicKey = keyPair.getPublic();
            log.warn("trace.signature keys are not configured; using ephemeral in-memory signer keypair");
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to initialize fallback signer keypair", ex);
        }
    }
}
