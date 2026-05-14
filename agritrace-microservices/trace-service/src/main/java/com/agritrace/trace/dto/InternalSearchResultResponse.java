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
public class InternalSearchResultResponse {
    private Long auditId;
    private UUID traceLogId;
    private String batchCode;
    private String operation;
    private String actorRole;
    private String traceAction;
    private String location;
    private String notes;
    private LocalDateTime createdAt;
}
