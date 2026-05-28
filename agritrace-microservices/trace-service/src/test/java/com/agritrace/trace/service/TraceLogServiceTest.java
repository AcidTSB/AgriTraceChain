package com.agritrace.trace.service;

import com.agritrace.proto.batch.BatchResponse;
import com.agritrace.proto.batch.OwnershipResponse;
import com.agritrace.proto.user.UserResponse;
import com.agritrace.trace.dto.CreateTraceLogRequest;
import com.agritrace.trace.dto.TraceLogResponse;
import com.agritrace.trace.entity.TraceAction;
import com.agritrace.trace.entity.TraceLog;
import com.agritrace.trace.entity.TraceOutboxEvent;
import com.agritrace.trace.grpc.BatchGrpcClient;
import com.agritrace.trace.grpc.UserGrpcClient;
import com.agritrace.trace.repository.TraceLogRepository;
import com.agritrace.trace.repository.TraceOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Tests for TraceLogService
 *
 * Focuses on core business logic:
 * 1. Hash chain generation (fetching previous hash)
 * 2. Outbox event creation
 * 3. ABAC validation rules (Farmer vs Inspector)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TraceLogService Tests")
class TraceLogServiceTest {

    @Mock
    private TraceLogRepository traceLogRepository;
    @Mock
    private UserGrpcClient userGrpcClient;
    @Mock
    private BatchGrpcClient batchGrpcClient;
    @Mock
    private DigitalSignatureService digitalSignatureService;
    @Mock
    private TraceAuditService traceAuditService;
    @Mock
    private TraceOutboxRepository outboxRepository;
    @Mock
    private AnomalyDetectionService anomalyDetectionService;

    @InjectMocks
    private TraceLogService traceLogService;

    private UUID userId;
    private String batchId;
    private UserResponse mockUser;
    private BatchResponse mockBatch;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        batchId = UUID.randomUUID().toString();

        mockUser = UserResponse.newBuilder()
                .setId(userId.toString())
                .setUsername("testfarmer")
                .build();

        mockBatch = BatchResponse.newBuilder()
                .setId(batchId)
                .setBatchCode("BATCH-123")
                .setFarmLatitude(11.9404)
                .setFarmLongitude(108.4583)
                .setFarmerId(userId.toString())
                .setFacilityId("FARM_01")
                .build();

        ReflectionTestUtils.setField(traceLogService, "defaultRadiusKm", 5.0);
    }

    @Test
    @DisplayName("createTraceLog: Success -> Generates Hash, Signature, and OutboxEvent")
    void createTraceLog_success_hashAndOutboxGenerated() {
        // Arrange
        CreateTraceLogRequest request = new CreateTraceLogRequest();
        request.setBatchId(batchId);
        request.setAction(TraceAction.PLANTING);
        request.setLocation("Dalat Farm (REGION_1)");
        request.setLatitude(11.9403);
        request.setLongitude(108.4582);

        when(userGrpcClient.getUserById(userId.toString())).thenReturn(mockUser);
        when(batchGrpcClient.getBatchById(batchId)).thenReturn(mockBatch);
        when(batchGrpcClient.validateBatchOwnership(eq(batchId), eq(userId.toString())))
                .thenReturn(OwnershipResponse.newBuilder().setIsOwner(true).build());
        when(traceLogRepository.findFirstByBatchIdOrderByCreatedAtDesc(UUID.fromString(batchId)))
                .thenReturn(Optional.empty()); // No previous log

        String expectedHash = "genesis_hash_123";
        String expectedSignature = "signature_abc";
        when(digitalSignatureService.generateHash(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(expectedHash);
        when(digitalSignatureService.signHash(expectedHash)).thenReturn(expectedSignature);

        TraceLog savedLog = new TraceLog();
        savedLog.setId(UUID.randomUUID());
        savedLog.setBatchId(UUID.fromString(batchId));
        savedLog.setCurrentHash(expectedHash);
        savedLog.setCreatedAt(java.time.LocalDateTime.now());
        when(traceLogRepository.save(any(TraceLog.class))).thenReturn(savedLog);

        // Act
        TraceLogResponse response = traceLogService.createTraceLog(request, userId, "FARMER", "FARM_01", "REGION_1");

        // Assert
        assertThat(response).isNotNull();
        
        // Verify TraceLog saved with correct hash
        ArgumentCaptor<TraceLog> logCaptor = ArgumentCaptor.forClass(TraceLog.class);
        verify(traceLogRepository).save(logCaptor.capture());
        TraceLog capturedLog = logCaptor.getValue();
        assertThat(capturedLog.getCurrentHash()).isEqualTo(expectedHash);
        assertThat(capturedLog.getSignature()).isEqualTo(expectedSignature);
        assertThat(capturedLog.getPreviousHash()).isNull(); // Genesis block

        // Verify OutboxEvent saved
        ArgumentCaptor<TraceOutboxEvent> outboxCaptor = ArgumentCaptor.forClass(TraceOutboxEvent.class);
        verify(outboxRepository).save(outboxCaptor.capture());
        TraceOutboxEvent capturedOutbox = outboxCaptor.getValue();
        assertThat(capturedOutbox.getTopic()).isEqualTo("trace-events");
        assertThat(capturedOutbox.getEventType()).isEqualTo("TRACE_CREATED");
        assertThat(capturedOutbox.getPartitionKey()).isEqualTo(batchId);
        assertThat(capturedOutbox.getStatus()).isEqualTo("PENDING");

        // Verify async processes called
        verify(traceAuditService).recordCreate(any(), anyString(), anyString(), any());
        verify(anomalyDetectionService).checkAnomalies(any());
    }

    @Test
    @DisplayName("createTraceLog: Chain linking -> Sets previous hash from last log")
    void createTraceLog_chainLinking_setsPreviousHash() {
        // Arrange
        CreateTraceLogRequest request = new CreateTraceLogRequest();
        request.setBatchId(batchId);
        request.setAction(TraceAction.HARVESTING);
        request.setQuantity(new BigDecimal("100.5"));
        request.setLatitude(11.9403);
        request.setLongitude(108.4582);
        request.setLocation("Dalat Farm");

        when(userGrpcClient.getUserById(userId.toString())).thenReturn(mockUser);
        when(batchGrpcClient.getBatchById(batchId)).thenReturn(mockBatch);
        when(batchGrpcClient.validateBatchOwnership(eq(batchId), eq(userId.toString())))
                .thenReturn(OwnershipResponse.newBuilder().setIsOwner(true).build());

        TraceLog previousLog = new TraceLog();
        previousLog.setCurrentHash("prev_hash_xyz");
        when(traceLogRepository.findFirstByBatchIdOrderByCreatedAtDesc(UUID.fromString(batchId)))
                .thenReturn(Optional.of(previousLog));

        when(digitalSignatureService.generateHash(any(), any(), any(), any(), any(), any(), any(), eq("prev_hash_xyz")))
                .thenReturn("new_hash_456");
        when(digitalSignatureService.signHash("new_hash_456")).thenReturn("sig");

        TraceLog savedLog = new TraceLog();
        savedLog.setId(UUID.randomUUID());
        savedLog.setBatchId(UUID.fromString(batchId));
        savedLog.setCreatedAt(java.time.LocalDateTime.now());
        when(traceLogRepository.save(any(TraceLog.class))).thenReturn(savedLog);

        // Act
        traceLogService.createTraceLog(request, userId, "FARMER", null, null);

        // Assert
        ArgumentCaptor<TraceLog> logCaptor = ArgumentCaptor.forClass(TraceLog.class);
        verify(traceLogRepository).save(logCaptor.capture());
        TraceLog capturedLog = logCaptor.getValue();
        
        assertThat(capturedLog.getPreviousHash()).isEqualTo("prev_hash_xyz"); // Linked to previous
        assertThat(capturedLog.getCurrentHash()).isEqualTo("new_hash_456");
    }
}
