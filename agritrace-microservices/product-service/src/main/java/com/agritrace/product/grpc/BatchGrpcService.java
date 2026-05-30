package com.agritrace.product.grpc;

import com.agritrace.proto.batch.*;
import com.agritrace.proto.common.Status;
import com.agritrace.product.entity.Batch;
import com.agritrace.product.repository.BatchRepository;
import com.agritrace.product.repository.ProductRepository;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
@Slf4j
public class BatchGrpcService extends BatchServiceGrpc.BatchServiceImplBase {
    
    private final BatchRepository batchRepository;
    private final ProductRepository productRepository;
    private final com.agritrace.product.service.BatchService batchService;
    
    @Override
    public void getBatchById(GetBatchByIdRequest request,
                            StreamObserver<BatchResponse> responseObserver) {
        log.debug("gRPC call: getBatchById - batchId={}", request.getBatchId());
        
        try {
            UUID batchId = UUID.fromString(request.getBatchId());
            Batch batch = batchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("Batch not found"));

            boolean productActive = true;
            if (batch.getProductId() != null) {
                productActive = productRepository.findById(batch.getProductId())
                        .map(com.agritrace.product.entity.Product::getIsActive)
                        .orElse(true);
            }
            
            BatchResponse response = BatchResponse.newBuilder()
                    .setId(batch.getId().toString())
                    .setBatchNumber(batch.getBatchCode())
                    .setBatchCode(batch.getBatchCode())
                    .setProductId(batch.getProductId() != null ? batch.getProductId().toString() : "")
                    .setProductName(batch.getProductName() != null ? batch.getProductName() : "")
                    .setProductType(batch.getProductType() != null ? batch.getProductType() : "")
                    .setQuantity(batch.getQuantity() != null ? batch.getQuantity() : 0.0)
                    .setUnit(batch.getUnit() != null ? batch.getUnit() : "")
                    .setHarvestDate(batch.getHarvestDate() != null ? batch.getHarvestDate().toString() : "")
                    .setStatus(Boolean.TRUE.equals(batch.getIsCompromised()) ? "COMPROMISED" : "PENDING_INSPECTION")
                    .setFarmerId(batch.getOwnerId() != null ? batch.getOwnerId().toString() : "")
                    .setFarmerName(batch.getOwnerName() != null ? batch.getOwnerName() : "")
                    .setFacilityId(batch.getFacilityId() != null ? batch.getFacilityId().toString() : "")
                    .setFacilityName(batch.getFacilityName() != null ? batch.getFacilityName() : "")
                    .setFarmLatitude(batch.getFarmLatitude() != null ? batch.getFarmLatitude() : 0.0)
                    .setFarmLongitude(batch.getFarmLongitude() != null ? batch.getFarmLongitude() : 0.0)
                    .setIsCompromised(batch.getIsCompromised() != null ? batch.getIsCompromised() : false)
                    .setCompromisedAt(batch.getCompromisedAt() != null ? batch.getCompromisedAt().toString() : "")
                    .setCompromiseReason(batch.getCompromiseReason() != null ? batch.getCompromiseReason() : "")
                    .setCompromisedByAuditId(batch.getCompromisedByAuditId() != null ? batch.getCompromisedByAuditId() : "")
                    .setProductActive(productActive)
                    .setCreatedAt(batch.getCreatedAt() != null ? batch.getCreatedAt().toString() : "")
                    .setGrpcStatus(Status.newBuilder()
                            .setCode(200)
                            .setMessage("Success")
                            .build())
                    .build();
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error getting batch by ID", e);
            BatchResponse errorResponse = BatchResponse.newBuilder()
                    .setGrpcStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage(e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void validateBatchOwnership(ValidateBatchOwnershipRequest request,
                                      StreamObserver<OwnershipResponse> responseObserver) {
        log.debug("gRPC call: validateBatchOwnership - batchId={}, userId={}", 
                 request.getBatchId(), request.getUserId());
        
        try {
            UUID batchId = UUID.fromString(request.getBatchId());
            UUID userId = UUID.fromString(request.getUserId());
            
            Batch batch = batchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
            
            boolean isOwner = batch.getOwnerId() != null && batch.getOwnerId().equals(userId);
            
            OwnershipResponse response = OwnershipResponse.newBuilder()
                    .setIsOwner(isOwner)
                    .setBatchId(batchId.toString())
                    .setUserId(userId.toString())
                    .setStatus(Status.newBuilder()
                            .setCode(200)
                            .setMessage("Success")
                            .build())
                    .build();
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error validating batch ownership", e);
            OwnershipResponse errorResponse = OwnershipResponse.newBuilder()
                    .setIsOwner(false)
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage(e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void checkBatchStatus(CheckBatchStatusRequest request,
                                 StreamObserver<BatchStatusResponse> responseObserver) {
        try {
            UUID batchId = UUID.fromString(request.getBatchId());
            Batch batch = batchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
            
            BatchStatusResponse response = BatchStatusResponse.newBuilder()
                    .setBatchId(batchId.toString())
                    .setStatus(batch.getIsCompromised() ? "COMPROMISED" : "ACTIVE")
                    .setIsCompromised(batch.getIsCompromised() != null ? batch.getIsCompromised() : false)
                    .setGrpcStatus(Status.newBuilder()
                            .setCode(200)
                            .setMessage("Success")
                            .build())
                    .build();
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error checking batch status", e);
            BatchStatusResponse errorResponse = BatchStatusResponse.newBuilder()
                    .setGrpcStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage(e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void getBatchesByFarmer(GetBatchesByFarmerRequest request,
                                  StreamObserver<BatchListResponse> responseObserver) {
        // TODO: Implement pagination
        BatchListResponse response = BatchListResponse.newBuilder()
                .setStatus(Status.newBuilder()
                        .setCode(501)
                        .setMessage("Not implemented")
                        .build())
                .build();
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    @Override
    public void markBatchCompromised(MarkBatchCompromisedRequest request,
                                     StreamObserver<BatchResponse> responseObserver) {
        log.warn("gRPC call: markBatchCompromised - batchCode={}", request.getBatchCode());
        try {
            com.agritrace.product.dto.BatchResponse serviceRes = batchService.markCompromised(
                    request.getBatchCode(),
                    request.getReason(),
                    request.getCompromisedByAuditId()
            );

            BatchResponse response = BatchResponse.newBuilder()
                    .setId(serviceRes.getId().toString())
                    .setBatchNumber(serviceRes.getBatchCode())
                    .setBatchCode(serviceRes.getBatchCode())
                    .setProductId(serviceRes.getProductId() != null ? serviceRes.getProductId().toString() : "")
                    .setProductName(serviceRes.getProductName() != null ? serviceRes.getProductName() : "")
                    .setProductType(serviceRes.getProductType() != null ? serviceRes.getProductType() : "")
                    .setQuantity(serviceRes.getQuantity() != null ? serviceRes.getQuantity() : 0.0)
                    .setUnit(serviceRes.getUnit() != null ? serviceRes.getUnit() : "")
                    .setHarvestDate(serviceRes.getHarvestDate() != null ? serviceRes.getHarvestDate().toString() : "")
                    .setStatus(Boolean.TRUE.equals(serviceRes.getIsCompromised()) ? "COMPROMISED" : "PENDING_INSPECTION")
                    .setFarmerId(serviceRes.getFarmId() != null ? serviceRes.getFarmId().toString() : "")
                    .setFarmerName(serviceRes.getFarmName() != null ? serviceRes.getFarmName() : "")
                    .setFacilityId(serviceRes.getFarmId() != null ? serviceRes.getFarmId().toString() : "")
                    .setFacilityName(serviceRes.getFarmName() != null ? serviceRes.getFarmName() : "")
                    .setIsCompromised(serviceRes.getIsCompromised() != null ? serviceRes.getIsCompromised() : false)
                    .setCompromisedAt(serviceRes.getCompromisedAt() != null ? serviceRes.getCompromisedAt().toString() : "")
                    .setCompromiseReason(serviceRes.getCompromiseReason() != null ? serviceRes.getCompromiseReason() : "")
                    .setCompromisedByAuditId(serviceRes.getCompromisedByAuditId() != null ? serviceRes.getCompromisedByAuditId() : "")
                    .setProductActive(Boolean.TRUE.equals(serviceRes.getProductActive()))
                    .setGrpcStatus(Status.newBuilder()
                            .setCode(200)
                            .setMessage("Success")
                            .build())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Error marking batch compromised via gRPC", e);
            BatchResponse errorResponse = BatchResponse.newBuilder()
                    .setGrpcStatus(Status.newBuilder()
                            .setCode(500)
                            .setMessage(e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
}
