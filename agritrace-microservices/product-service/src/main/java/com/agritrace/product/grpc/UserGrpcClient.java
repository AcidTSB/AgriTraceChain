package com.agritrace.product.grpc;

import com.agritrace.proto.user.*;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class UserGrpcClient {
    
    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;
    
    public UserResponse getUserById(String userId) {
        log.debug("Calling user-service via gRPC: getUserById({})", userId);
        GetUserByIdRequest request = GetUserByIdRequest.newBuilder()
                .setUserId(userId)
                .build();
        return userServiceStub.getUserById(request);
    }
    
    public UserResponse getUserByUsername(String username) {
        log.debug("Calling user-service via gRPC: getUserByUsername({})", username);
        GetUserByUsernameRequest request = GetUserByUsernameRequest.newBuilder()
                .setUsername(username)
                .build();
        return userServiceStub.getUserByUsername(request);
    }
}
