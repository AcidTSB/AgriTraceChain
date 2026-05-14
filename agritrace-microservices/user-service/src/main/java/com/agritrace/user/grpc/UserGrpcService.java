package com.agritrace.user.grpc;

import com.agritrace.proto.common.Status;
import com.agritrace.proto.user.*;
import com.agritrace.user.entity.User;
import com.agritrace.user.repository.UserRepository;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
@Slf4j
public class UserGrpcService extends UserServiceGrpc.UserServiceImplBase {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    public void getUserById(GetUserByIdRequest request, 
                           StreamObserver<UserResponse> responseObserver) {
        log.debug("gRPC call: getUserById - userId={}", request.getUserId());
        
        try {
            UUID userId = UUID.fromString(request.getUserId());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            UserResponse response = buildUserResponse(user, 200, "Success");
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error in getUserById", e);
            UserResponse errorResponse = UserResponse.newBuilder()
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage("User not found: " + e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void getUserByUsername(GetUserByUsernameRequest request,
                                 StreamObserver<UserResponse> responseObserver) {
        log.debug("gRPC call: getUserByUsername - username={}", request.getUsername());
        
        try {
            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            UserResponse response = buildUserResponse(user, 200, "Success");
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error in getUserByUsername", e);
            UserResponse errorResponse = UserResponse.newBuilder()
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage("User not found: " + e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    @Override
    public void getUserPublicKey(GetUserPublicKeyRequest request,
                                StreamObserver<PublicKeyResponse> responseObserver) {
        log.debug("gRPC call: getUserPublicKey - userId={}", request.getUserId());
        
        try {
            UUID userId = UUID.fromString(request.getUserId());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            if (user.getPublicKey() == null) {
                throw new RuntimeException("User has no public key");
            }
            
            PublicKeyResponse response = PublicKeyResponse.newBuilder()
                    .setUserId(user.getId().toString())
                    .setPublicKey(user.getPublicKey())
                    .setAlgorithm(user.getKeyAlgorithm())
                    .setStatus(Status.newBuilder()
                            .setCode(200)
                            .setMessage("Success")
                            .build())
                    .build();
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error in getUserPublicKey", e);
            PublicKeyResponse errorResponse = PublicKeyResponse.newBuilder()
                    .setStatus(Status.newBuilder()
                            .setCode(404)
                            .setMessage("Public key not found: " + e.getMessage())
                            .build())
                    .build();
            responseObserver.onNext(errorResponse);
            responseObserver.onCompleted();
        }
    }
    
    private UserResponse buildUserResponse(User user, int statusCode, String statusMessage) {
        UserResponse.Builder builder = UserResponse.newBuilder()
                .setId(user.getId().toString())
                .setUsername(user.getUsername())
                .setEmail(user.getEmail())
                .setFullName(user.getFullName() != null ? user.getFullName() : "")
                .setRole(user.getRole().name())
                .setActive(user.getActive())
                .setCreatedAt(user.getCreatedAt().toString())
                .setStatus(Status.newBuilder()
                        .setCode(statusCode)
                        .setMessage(statusMessage)
                        .build());
        
        if (user.getFacility() != null) {
            builder.setFacilityId(user.getFacility().getId().toString())
                   .setFacilityName(user.getFacility().getName());
        }
        
        return builder.build();
    }
}
