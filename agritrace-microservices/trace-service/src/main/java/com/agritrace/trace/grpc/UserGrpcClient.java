package com.agritrace.trace.grpc;

import com.agritrace.proto.user.GetUserByIdRequest;
import com.agritrace.proto.user.GetUserPublicKeyRequest;
import com.agritrace.proto.user.PublicKeyResponse;
import com.agritrace.proto.user.UserResponse;
import com.agritrace.proto.user.UserServiceGrpc;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class UserGrpcClient {

    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    @CircuitBreaker(name = "userServiceGrpc", fallbackMethod = "getUserByIdFallback")
    public UserResponse getUserById(String userId) {
        return userServiceStub.getUserById(
                GetUserByIdRequest.newBuilder().setUserId(userId).build()
        );
    }

    @CircuitBreaker(name = "userServiceGrpc", fallbackMethod = "getUserPublicKeyFallback")
    public PublicKeyResponse getUserPublicKey(String userId) {
        return userServiceStub.getUserPublicKey(
                GetUserPublicKeyRequest.newBuilder().setUserId(userId).build()
        );
    }

    private UserResponse getUserByIdFallback(String userId, Throwable throwable) {
        log.warn("Circuit breaker fallback for user-service, userId={}, reason={}", userId, throwable.getMessage());
        return UserResponse.newBuilder().build();
    }

    private PublicKeyResponse getUserPublicKeyFallback(String userId, Throwable throwable) {
        log.warn("Circuit breaker fallback for user-service public key, userId={}, reason={}", userId, throwable.getMessage());
        return PublicKeyResponse.newBuilder().build();
    }
}
