package com.agritrace.trace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogCursorResponse {
    private List<AuditLogItemResponse> data;
    private Long nextCursor;
}
