package com.agritrace.media.service.impl;

import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.media.service.QRCodeService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

/**
 * QRCodeServiceImpl - Phase 3.2 + 3.4 Refinement
 * 
 * Generates QR codes for batch traceability using ZXing
 * 
 * QR Code Flow:
 * 1. Consumer scans QR code on product
 * 2. Opens URL: {baseUrl}/api/v1/trace-logs/{batchCode}
 * 3. Views complete batch history (no login required)
 * 4. Verifies product authenticity and origin
 * 
 * Phase 3.4 Refinement: Kill Switch
 * - Blocks QR generation for compromised batches
 * - Prevents information leakage
 * - Security-first approach
 * 
 * Technical Details:
 * - Format: QR_CODE (2D barcode)
 * - Image: PNG (byte array)
 * - Size: Configurable (default 250x250)
 * - Error correction: Medium (survives ~15% damage)
 */
@Service
@RequiredArgsConstructor
public class QRCodeServiceImpl implements QRCodeService {

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final Logger log = LoggerFactory.getLogger(QRCodeServiceImpl.class);
    private final RestTemplate restTemplate = new RestTemplate();

      // Phase 3.4: Kill switch

    /**
     * Generate QR code for batch traceability
     * 
     * Phase 3.4 Refinement: Kill switch for compromised batches
     * 
     * @param batchCode Batch code
     * @param width QR code width in pixels
     * @param height QR code height in pixels
     * @return QR code as PNG byte array
     */
    @Override
    public byte[] generateQRCode(String batchCode, int width, int height) {
        // Real kill-switch: only generate QR for batches that are publicly retrievable.
        if (!isBatchPubliclyAccessible(batchCode)) {
            log.warn("KILL SWITCH: Blocked QR generation for unavailable/compromised batch {}", batchCode);
            throw new ResourceNotFoundException("Batch", "batchCode", batchCode);
        }

        try {
            // Build traceability URL
            String url = baseUrl + "/api/public/trace/" + batchCode;
            
            log.debug("Generating QR code for batch: {} → URL: {}", batchCode, url);

            // Generate QR code matrix
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(url, BarcodeFormat.QR_CODE, width, height);

            // Convert to PNG image
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            byte[] qrCode = outputStream.toByteArray();
            
            log.info("QR code generated successfully for batch: {} ({}x{}, {} bytes)", 
                     batchCode, width, height, qrCode.length);

            return qrCode;

        } catch (WriterException | IOException e) {
            log.error("Failed to generate QR code for batch: {}", batchCode, e);
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    private boolean isBatchPubliclyAccessible(String batchCode) {
        String checkUrl = "http://product-service:8082/api/v1/batches/" + batchCode;
        try {
            return restTemplate.getForEntity(checkUrl, String.class).getStatusCode().is2xxSuccessful();
        } catch (RestClientException ex) {
            log.warn("Batch public check failed for {} at {}: {}", batchCode, checkUrl, ex.getMessage());
            return false;
        }
    }

    /**
     * PRODUCTION HARDENING: Generate QR code as Base64 Data URI
     * 
     * Returns Data URI format for direct frontend use without blob handling
     * 
     * Format: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
     * 
     * Benefits:
     * - Can be used directly in <img src="{dataUri}" />
     * - No need for separate download/blob handling
     * - Better mobile app integration
     * - Reduced network requests
     * 
     * QR Size Optimization:
     * - Default 250x250 (good balance between scan-ability and file size)
     * - URL length affects QR density (shorter URL = easier scan)
     * - Current format: BATCH-YYYYMMDD-XXXXXXXX (32 chars)
     * - Future: Could implement short code (e.g., 6-8 chars) for denser QR
     * 
     * @param batchCode Batch code
     * @param width QR width in pixels
     * @param height QR height in pixels
     * @return Data URI string (data:image/png;base64,...)
     */
    @Override
    public String generateQRCodeAsBase64(String batchCode, int width, int height) {
        log.debug("Generating Base64 QR code for batch: {} ({}x{})", batchCode, width, height);
        
        // Generate PNG bytes
        byte[] pngBytes = generateQRCode(batchCode, width, height);
        
        // Encode to Base64
        String base64 = Base64.getEncoder().encodeToString(pngBytes);
        
        // CRITICAL: Add Data URI prefix for direct HTML use
        String dataUri = "data:image/png;base64," + base64;
        
        log.info("Base64 QR code generated for batch: {} ({} bytes → {} chars)", 
                 batchCode, pngBytes.length, dataUri.length());
        
        return dataUri;
    }
}
