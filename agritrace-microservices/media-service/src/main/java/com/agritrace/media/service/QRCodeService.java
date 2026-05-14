package com.agritrace.media.service;

/**
 * QRCodeService interface - declares QR generation operations.
 */
public interface QRCodeService {

    byte[] generateQRCode(String batchCode, int width, int height);

    String generateQRCodeAsBase64(String batchCode, int width, int height);
}
