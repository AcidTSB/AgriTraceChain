package com.agritrace.trace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrityScanResponse {
    private long scannedBatches;
    private long compromisedDetected;
    private long newlyMarkedCompromised;
    private long alreadyCompromised;
    private long durationMs;
}
