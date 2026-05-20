package com.agritrace.product.grpc;

import com.agritrace.proto.batch.*;
import com.agritrace.proto.common.Status;
import com.agritrace.product.entity.Batch;
import com.agritrace.product.repository.BatchRepository;
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
    
    @Override
    public void getBatchById(GetBatchByIdRequest request,
                            StreamObserver<BatchResponse> responseObserver) {
        log.debug("gRPC call: getBatchById - batchId={}", request.getBatchId());
        
        try {
            UUID batchId = UUID.fromString(request.getBatchId());
            Batch batch = batchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("Batch not found"));
            
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
}
