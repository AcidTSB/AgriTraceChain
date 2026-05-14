import os
from pathlib import Path

BASE_DIR = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices\user-service")

print("🤖 AI Agent đang tiến hành sửa lỗi User Service...")

# 1. Sửa file UserGrpcServiceImpl.java (Sửa package và Response class)
grpc_impl_path = BASE_DIR / "src/main/java/com/agritrace/user/grpc/UserGrpcServiceImpl.java"
grpc_content = """package com.agritrace.user.grpc;

import com.agritrace.proto.user.*;
import com.agritrace.user.entity.User;
import com.agritrace.user.repository.UserRepository;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

@GrpcService
public class UserGrpcServiceImpl extends UserServiceGrpc.UserServiceImplBase {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void getUserById(GetUserByIdRequest request, StreamObserver<UserResponse> responseObserver) {
        User user = userRepository.findById(UUID.fromString(request.getUserId())).orElse(null);
        UserResponse.Builder builder = UserResponse.newBuilder();
        
        if (user != null) {
            builder.setId(user.getId().toString())
                   .setUsername(user.getUsername())
                   .setRole(user.getRole().name())
                   .setFacilityId(user.getFacilityId() != null ? user.getFacilityId().toString() : "");
        }
        
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getUserByUsername(GetUserByUsernameRequest request, StreamObserver<UserResponse> responseObserver) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);
        UserResponse.Builder builder = UserResponse.newBuilder();
        
        if (user != null) {
            builder.setId(user.getId().toString())
                   .setUsername(user.getUsername())
                   .setRole(user.getRole().name());
        }
        
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getUserPublicKey(GetUserPublicKeyRequest request, StreamObserver<PublicKeyResponse> responseObserver) {
        User user = userRepository.findById(UUID.fromString(request.getUserId())).orElse(null);
        PublicKeyResponse.Builder builder = PublicKeyResponse.newBuilder();
        
        if (user != null && user.getPublicKey() != null) {
            builder.setUserId(user.getId().toString())
                   .setPublicKey(user.getPublicKey())
                   .setAlgorithm(user.getKeyAlgorithm() != null ? user.getKeyAlgorithm() : "RSA");
        }
        
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }
}
"""
with open(grpc_impl_path, 'w', encoding='utf-8') as f:
    f.write(grpc_content)
print("✅ Đã fix: Sửa toàn bộ đường dẫn import gRPC và Object Response")

# 2. Sửa file pom.xml (Thêm thư viện bị thiếu)
pom_path = BASE_DIR / "pom.xml"
with open(pom_path, 'r', encoding='utf-8') as f:
    pom_content = f.read()

if '<artifactId>commons-codec</artifactId>' not in pom_content:
    deps_to_add = '''
        <dependency>
            <groupId>commons-codec</groupId>
            <artifactId>commons-codec</artifactId>
            <version>1.16.0</version>
        </dependency>'''
    # Tìm tag </dependencies> cuối cùng để chèn vào trước nó
    pom_content = pom_content.replace('</dependencies>', deps_to_add + '\n    </dependencies>')
    with open(pom_path, 'w', encoding='utf-8') as f:
        f.write(pom_content)
    print("✅ Đã fix: Bổ sung thư viện commons-codec vào pom.xml")
else:
    print("ℹ️ commons-codec đã tồn tại trong pom.xml")

print("🎉 AI Agent đã hoàn thành nhiệm vụ! Vui lòng build lại.")