package com.agritrace.trace.dto;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TraceLogResponse {
    private String id;
    private String batchId;
    private String batchCode;
    private String action;
    private String location;
    private Double latitude;
    private Double longitude;
    private String notes;
    private BigDecimal quantity;
    private BigDecimal distanceFromFarmKm;
    private Boolean withinGeofence;
    private String timestamp;
    private String createdBy;
    private String createdById;
    private String previousHash;
    private String signature;
    private String hashValue;
    private Boolean hashVerified;
    private Boolean signatureVerified;
    private Boolean chainVerified;
    private String integrityStatus;
}
