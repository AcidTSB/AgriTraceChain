package com.agritrace.trace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogItemResponse {
    private Long id;
    private UUID traceLogId;
    private String batchCode;
    private String operation;
    private UUID actorId;
    private String actorRole;
    private String actorRegion;
    private UUID actorFacilityId;
    private String notes;
    private LocalDateTime createdAt;
}
