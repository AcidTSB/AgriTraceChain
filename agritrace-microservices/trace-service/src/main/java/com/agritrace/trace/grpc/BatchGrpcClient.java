package com.agritrace.trace.grpc;

import com.agritrace.proto.batch.BatchResponse;
import com.agritrace.proto.batch.BatchServiceGrpc;
import com.agritrace.proto.batch.GetBatchByIdRequest;
import com.agritrace.proto.batch.OwnershipResponse;
import com.agritrace.proto.batch.ValidateBatchOwnershipRequest;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class BatchGrpcClient {

    @GrpcClient("product-service")
    private BatchServiceGrpc.BatchServiceBlockingStub batchServiceStub;

    @CircuitBreaker(name = "productServiceGrpc", fallbackMethod = "getBatchByIdFallback")
    public BatchResponse getBatchById(String batchId) {
        return batchServiceStub.getBatchById(
                GetBatchByIdRequest.newBuilder().setBatchId(batchId).build()
        );
    }

    @CircuitBreaker(name = "productServiceGrpc", fallbackMethod = "validateBatchOwnershipFallback")
    public OwnershipResponse validateBatchOwnership(String batchId, String userId) {
        return batchServiceStub.validateBatchOwnership(
                ValidateBatchOwnershipRequest.newBuilder()
                        .setBatchId(batchId)
                        .setUserId(userId)
                        .build()
        );
    }

    private BatchResponse getBatchByIdFallback(String batchId, Throwable throwable) {
        log.warn("Circuit breaker fallback for product-service, batchId={}, reason={}", batchId, throwable.getMessage());
        return BatchResponse.newBuilder().build();
    }

    private OwnershipResponse validateBatchOwnershipFallback(String batchId, String userId, Throwable throwable) {
        log.warn("Circuit breaker fallback for ownership check, batchId={}, userId={}, reason={}",
                batchId, userId, throwable.getMessage());
        return OwnershipResponse.newBuilder().setIsOwner(false).build();
    }

    @CircuitBreaker(name = "productServiceGrpc", fallbackMethod = "markBatchCompromisedFallback")
    public BatchResponse markBatchCompromised(String batchCode, String reason, String auditId) {
        return batchServiceStub.markBatchCompromised(
                com.agritrace.proto.batch.MarkBatchCompromisedRequest.newBuilder()
                        .setBatchCode(batchCode)
                        .setReason(reason)
                        .setCompromisedByAuditId(auditId != null ? auditId : "")
                        .build()
        );
    }

    private BatchResponse markBatchCompromisedFallback(String batchCode, String reason, String auditId, Throwable throwable) {
        log.warn("Circuit breaker fallback for markBatchCompromised, batchCode={}, reason={}, error={}",
                batchCode, reason, throwable.getMessage());
        return BatchResponse.newBuilder().build();
    }
}
