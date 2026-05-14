package com.agritrace.trace.dto;

import java.math.BigDecimal;

import com.agritrace.trace.entity.TraceAction;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTraceLogRequest {
    @NotNull
    private String batchId;
    
    @NotNull
    private TraceAction action;
    
    private String location;
    private String notes;
    private Double latitude;
    private Double longitude;

    @DecimalMin(value = "0.001", message = "Quantity must be greater than 0")
    private BigDecimal quantity;
}
