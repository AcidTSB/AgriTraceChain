"""
AgriTrace Phase 4.1 - Microservices File Generator
Generates all necessary files for microservices architecture
"""

import os
from pathlib import Path

# Base path
BASE_PATH = Path(r"d:\Coding\Java\AgriTraceChain\agritrace-microservices")

# Proto files content
PROTO_FILES = {
    "common.proto": """syntax = "proto3";

package agritrace.common;

option java_multiple_files = true;
option java_package = "com.agritrace.proto.common";
option java_outer_classname = "CommonProto";

message Timestamp {
  int64 seconds = 1;
  int32 nanos = 2;
}

message Status {
  int32 code = 1;
  string message = 2;
}

message PageRequest {
  int32 page = 1;
  int32 size = 2;
  string sort_by = 3;
  string sort_direction = 4;
}

message PageMetadata {
  int32 page = 1;
  int32 size = 2;
  int64 total_elements = 3;
  int32 total_pages = 4;
}
""",

    "user.proto": """syntax = "proto3";

package agritrace.user;

import "common.proto";

option java_multiple_files = true;
option java_package = "com.agritrace.proto.user";
option java_outer_classname = "UserServiceProto";

service UserService {
  rpc GetUserById (GetUserByIdRequest) returns (UserResponse);
  rpc GetUserByUsername (GetUserByUsernameRequest) returns (UserResponse);
  rpc GetUsersByIds (GetUsersByIdsRequest) returns (UserListResponse);
  rpc VerifyCredentials (VerifyCredentialsRequest) returns (VerifyCredentialsResponse);
  rpc GetUserPublicKey (GetUserPublicKeyRequest) returns (PublicKeyResponse);
}

message GetUserByIdRequest {
  string user_id = 1;
}

message GetUserByUsernameRequest {
  string username = 1;
}

message GetUsersByIdsRequest {
  repeated string user_ids = 1;
}

message VerifyCredentialsRequest {
  string username = 1;
  string password = 2;
}

message GetUserPublicKeyRequest {
  string user_id = 1;
}

message UserResponse {
  string id = 1;
  string username = 2;
  string email = 3;
  string full_name = 4;
  string role = 5;
  string facility_id = 6;
  string facility_name = 7;
  bool active = 8;
  string created_at = 9;
  agritrace.common.Status status = 10;
}

message UserListResponse {
  repeated UserResponse users = 1;
  agritrace.common.Status status = 2;
}

message VerifyCredentialsResponse {
  bool valid = 1;
  string user_id = 2;
  string role = 3;
  agritrace.common.Status status = 4;
}

message PublicKeyResponse {
  string user_id = 1;
  string public_key = 2;
  string algorithm = 3;
  agritrace.common.Status status = 4;
}
""",

    "batch.proto": """syntax = "proto3";

package agritrace.batch;

import "common.proto";

option java_multiple_files = true;
option java_package = "com.agritrace.proto.batch";
option java_outer_classname = "BatchServiceProto";

service BatchService {
  rpc GetBatchById (GetBatchByIdRequest) returns (BatchResponse);
  rpc ValidateBatchOwnership (ValidateBatchOwnershipRequest) returns (OwnershipResponse);
  rpc CheckBatchStatus (CheckBatchStatusRequest) returns (BatchStatusResponse);
  rpc GetBatchesByFarmer (GetBatchesByFarmerRequest) returns (BatchListResponse);
}

message GetBatchByIdRequest {
  string batch_id = 1;
}

message ValidateBatchOwnershipRequest {
  string batch_id = 1;
  string user_id = 2;
}

message CheckBatchStatusRequest {
  string batch_id = 1;
}

message GetBatchesByFarmerRequest {
  string farmer_id = 1;
  agritrace.common.PageRequest page = 2;
}

message BatchResponse {
  string id = 1;
  string batch_number = 2;
  string product_id = 3;
  string product_name = 4;
  double quantity = 5;
  string unit = 6;
  string harvest_date = 7;
  string status = 8;
  string farmer_id = 9;
  string farmer_name = 10;
  string facility_id = 11;
  string facility_name = 12;
  bool is_compromised = 13;
  string created_at = 14;
  agritrace.common.Status grpc_status = 15;
}

message OwnershipResponse {
  bool is_owner = 1;
  string batch_id = 2;
  string user_id = 3;
  agritrace.common.Status status = 4;
}

message BatchStatusResponse {
  string batch_id = 1;
  string status = 2;
  bool is_compromised = 3;
  string reason = 4;
  agritrace.common.Status grpc_status = 5;
}

message BatchListResponse {
  repeated BatchResponse batches = 1;
  agritrace.common.PageMetadata page_metadata = 2;
  agritrace.common.Status status = 3;
}
""",

    "trace.proto": """syntax = "proto3";

package agritrace.trace;

import "common.proto";

option java_multiple_files = true;
option java_package = "com.agritrace.proto.trace";
option java_outer_classname = "TraceServiceProto";

service TraceService {
  rpc VerifyHashChain (VerifyHashChainRequest) returns (VerificationResponse);
  rpc VerifySignature (VerifySignatureRequest) returns (SignatureVerificationResponse);
  rpc GetTraceHistory (GetTraceHistoryRequest) returns (TraceHistoryResponse);
  rpc VerifyTraceLogIntegrity (VerifyTraceLogRequest) returns (IntegrityResponse);
}

message VerifyHashChainRequest {
  string batch_id = 1;
}

message VerifySignatureRequest {
  string trace_log_id = 1;
  string user_id = 2;
}

message GetTraceHistoryRequest {
  string batch_id = 1;
  agritrace.common.PageRequest page = 2;
}

message VerifyTraceLogRequest {
  string trace_log_id = 1;
}

message VerificationResponse {
  bool is_valid = 1;
  string batch_id = 2;
  int32 total_logs = 3;
  int32 verified_logs = 4;
  repeated string broken_links = 5;
  agritrace.common.Status status = 6;
}

message SignatureVerificationResponse {
  bool is_valid = 1;
  string trace_log_id = 2;
  string signed_by_user_id = 3;
  string signed_by_username = 4;
  string signature_algorithm = 5;
  string verification_timestamp = 6;
  agritrace.common.Status status = 7;
}

message TraceHistoryResponse {
  repeated TraceLogEntry entries = 1;
  agritrace.common.PageMetadata page_metadata = 2;
  agritrace.common.Status status = 3;
}

message TraceLogEntry {
  string id = 1;
  string batch_id = 2;
  string action = 3;
  string description = 4;
  string location = 5;
  double temperature = 6;
  double humidity = 7;
  string actor_id = 8;
  string actor_name = 9;
  string actor_role = 10;
  string timestamp = 11;
  string current_hash = 12;
  string previous_hash = 13;
  string signature = 14;
  bool signature_verified = 15;
}

message IntegrityResponse {
  bool is_valid = 1;
  string trace_log_id = 2;
  bool hash_chain_valid = 3;
  bool signature_valid = 4;
  string error_message = 5;
  agritrace.common.Status status = 6;
}
"""
}

# Common-proto POM
COMMON_PROTO_POM = """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.agritrace</groupId>
    <artifactId>common-proto</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <java.version>21</java.version>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <grpc.version>1.60.0</grpc.version>
        <protobuf.version>3.25.1</protobuf.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>io.grpc</groupId>
            <artifactId>grpc-stub</artifactId>
            <version>${grpc.version}</version>
        </dependency>
        <dependency>
            <groupId>io.grpc</groupId>
            <artifactId>grpc-protobuf</artifactId>
            <version>${grpc.version}</version>
        </dependency>
        <dependency>
            <groupId>javax.annotation</groupId>
            <artifactId>javax.annotation-api</artifactId>
            <version>1.3.2</version>
        </dependency>
    </dependencies>

    <build>
        <extensions>
            <extension>
                <groupId>kr.motd.maven</groupId>
                <artifactId>os-maven-plugin</artifactId>
                <version>1.7.1</version>
            </extension>
        </extensions>
        <plugins>
            <plugin>
                <groupId>org.xolstice.maven.plugins</groupId>
                <artifactId>protobuf-maven-plugin</artifactId>
                <version>0.6.1</version>
                <configuration>
                    <protocArtifact>
                        com.google.protobuf:protoc:${protobuf.version}:exe:${os.detected.classifier}
                    </protocArtifact>
                    <pluginId>grpc-java</pluginId>
                    <pluginArtifact>
                        io.grpc:protoc-gen-grpc-java:${grpc.version}:exe:${os.detected.classifier}
                    </pluginArtifact>
                </configuration>
                <executions>
                    <execution>
                        <goals>
                            <goal>compile</goal>
                            <goal>compile-custom</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
"""

def create_proto_files():
    """Create all proto files"""
    proto_dir = BASE_PATH / "common-proto" / "src" / "main" / "proto"
    proto_dir.mkdir(parents=True, exist_ok=True)
    
    for filename, content in PROTO_FILES.items():
        file_path = proto_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Created {filename}")

def create_common_proto_pom():
    """Create common-proto pom.xml"""
    pom_path = BASE_PATH / "common-proto" / "pom.xml"
    with open(pom_path, 'w', encoding='utf-8') as f:
        f.write(COMMON_PROTO_POM)
    print(f"✅ Created common-proto/pom.xml")

def main():
    print("🚀 Starting Phase 4.1 file generation...")
    print()
    
    # Create proto files
    create_proto_files()
    create_common_proto_pom()
    
    print()
    print("✅ All proto files created successfully!")
    print("Next steps:")
    print("1. cd d:\\Coding\\Java\\AgriTraceChain\\agritrace-microservices\\common-proto")
    print("2. mvn clean install")

if __name__ == "__main__":
    main()
