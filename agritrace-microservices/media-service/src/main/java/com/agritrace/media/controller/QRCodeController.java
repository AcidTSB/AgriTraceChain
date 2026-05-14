package com.agritrace.media.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.media.service.QRCodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public QR endpoints used by packaging labels and consumer scans.
 */
@RestController
@RequestMapping("/api/v1/media/qr")
@RequiredArgsConstructor
@Slf4j
public class QRCodeController {

    private final QRCodeService qrCodeService;

    @GetMapping("/{batchCode}")
    public ResponseEntity<byte[]> getQrPng(@PathVariable String batchCode) {
        log.info("GET /api/v1/media/qr/{}", batchCode);
        byte[] png = qrCodeService.generateQRCode(batchCode, 300, 300);

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    @GetMapping("/{batchCode}/base64")
    public ResponseEntity<ApiResponse<String>> getQrBase64(@PathVariable String batchCode) {
        log.info("GET /api/v1/media/qr/{}/base64", batchCode);
        String dataUri = qrCodeService.generateQRCodeAsBase64(batchCode, 300, 300);

        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(HttpStatus.OK.value(), "QR generated successfully", dataUri));
    }
}
