package com.agritrace.user.service;

import com.agritrace.user.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.*;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@Slf4j
public class KeyGenerationService {
    
    private static final String RSA_ALGORITHM = "RSA";
    private static final int RSA_KEY_SIZE = 2048;
    private static final String AES_ALGORITHM = "AES";
    private static final int AES_KEY_SIZE = 256;
    
    /**
     * Generate RSA key pair for user and encrypt private key
     */
    public void generateKeyPairForUser(User user, String masterPassword) {
        try {
            // Generate RSA key pair
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(RSA_ALGORITHM);
            keyPairGenerator.initialize(RSA_KEY_SIZE);
            KeyPair keyPair = keyPairGenerator.generateKeyPair();
            
            // Encode public key as Base64
            String publicKeyBase64 = Base64.getEncoder()
                    .encodeToString(keyPair.getPublic().getEncoded());
            
            // Encrypt private key with AES (using master password)
            String privateKeyBase64 = Base64.getEncoder()
                    .encodeToString(keyPair.getPrivate().getEncoded());
            String encryptedPrivateKey = encryptPrivateKey(privateKeyBase64, masterPassword);
            
            // Set user fields
            user.setPublicKey(publicKeyBase64);
            user.setPrivateKeyEncrypted(encryptedPrivateKey);
            user.setKeyAlgorithm(RSA_ALGORITHM);
            user.setKeySize(RSA_KEY_SIZE);
            user.setKeyGeneratedAt(LocalDateTime.now());
            
            log.info("Generated RSA key pair for user: {}", user.getUsername());
            
        } catch (Exception e) {
            log.error("Failed to generate key pair for user: {}", user.getUsername(), e);
            throw new RuntimeException("Key generation failed", e);
        }
    }
    
    /**
     * Encrypt private key using AES
     */
    private String encryptPrivateKey(String privateKeyBase64, String password) throws Exception {
        // Derive AES key from password (use PBKDF2 in production)
        SecretKey aesKey = deriveAESKey(password);
        
        Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, aesKey);
        
        byte[] encrypted = cipher.doFinal(privateKeyBase64.getBytes());
        return Base64.getEncoder().encodeToString(encrypted);
    }
    
    /**
     * Decrypt private key using AES
     */
    public String decryptPrivateKey(String encryptedPrivateKey, String password) throws Exception {
        SecretKey aesKey = deriveAESKey(password);
        
        Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, aesKey);
        
        byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedPrivateKey));
        return new String(decrypted);
    }
    
    /**
     * Derive AES key from password (simplified - use PBKDF2 in production)
     */
    private SecretKey deriveAESKey(String password) throws Exception {
        // WARNING: This is simplified for demo
        // In production, use PBKDF2WithHmacSHA256 with salt and iterations
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(password.getBytes());
        return new SecretKeySpec(keyBytes, AES_ALGORITHM);
    }
    
    /**
     * Get PublicKey object from Base64 string
     */
    public PublicKey getPublicKeyFromBase64(String publicKeyBase64) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(publicKeyBase64);
        java.security.spec.X509EncodedKeySpec spec = 
                new java.security.spec.X509EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
        return keyFactory.generatePublic(spec);
    }
    
    /**
     * Get PrivateKey object from Base64 string
     */
    public PrivateKey getPrivateKeyFromBase64(String privateKeyBase64) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(privateKeyBase64);
        java.security.spec.PKCS8EncodedKeySpec spec = 
                new java.security.spec.PKCS8EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
        return keyFactory.generatePrivate(spec);
    }
}