package com.agritrace.trace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogStatsResponse {
    private long totalEvents;
    private long successCount;
    private long warningOrBlockedCount;
    private long failedCount;
}
