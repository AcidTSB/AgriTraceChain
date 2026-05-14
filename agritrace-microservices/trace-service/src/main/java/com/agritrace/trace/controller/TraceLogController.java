package com.agritrace.trace.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.agritrace.trace.dto.CreateTraceLogRequest;
import com.agritrace.trace.dto.TraceLogResponse;
import com.agritrace.trace.service.TraceLogService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/trace-logs")
public class TraceLogController {

    @Autowired
    private TraceLogService traceLogService;

    @PostMapping
    public ResponseEntity<TraceLogResponse> createTraceLog(
            @Valid @RequestBody CreateTraceLogRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Facility-Id", required = false) String facilityId,
            @RequestHeader(value = "X-User-Region", required = false) String region) {
        
        TraceLogResponse response = traceLogService.createTraceLog(request, UUID.fromString(userId), role, facilityId, region);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/batch/{batchId}")
    public ResponseEntity<List<TraceLogResponse>> getTraceLogsByBatch(@PathVariable String batchId) {
        List<TraceLogResponse> logs = traceLogService.getTraceLogsByBatch(batchId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/public/{batchCode}")
    public ResponseEntity<List<TraceLogResponse>> getTraceLogsByBatchCode(@PathVariable String batchCode) {
        List<TraceLogResponse> logs = traceLogService.getTraceLogsByBatchCode(batchCode);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/{traceId}/verify")
    public ResponseEntity<Map<String, Object>> verifyTraceLog(@PathVariable String traceId) {
        boolean isValid = traceLogService.verifyTraceLogIntegrity(traceId);
        if (!isValid) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trace log integrity compromised");
        }
        return ResponseEntity.ok(Map.of("traceId", traceId, "isValid", true));
    }
}
