# 🌾 AgriTrace System - Agricultural Product Traceability System

**Version:** 1.0.0-SNAPSHOT
**Architecture:** Modular Monolith (Phase 1)
**Tech Stack:** Java 17, Spring Boot 3.2.5, PostgreSQL, Flyway

---

## 📋 Mục Lục

1. [Giới thiệu](#giới-thiệu)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
4. [Cài đặt và chạy](#cài-đặt-và-chạy)
5. [Cấu trúc dự án](#cấu-trúc-dự-án)
6. [API Documentation](#api-documentation)
7. [Development Roadmap](#development-roadmap)

---

## 🎯 Giới thiệu

AgriTrace System là hệ thống quản lý chuỗi cung ứng nông sản, cho phép truy xuất nguồn gốc từ khâu giống, canh tác, thu hoạch đến đóng gói thông qua mã QR Code.

**Mục tiêu Phase 1.0:**
- ✅ Khởi tạo project với cấu trúc Modular Monolith
- ✅ Cấu hình Spring Boot, PostgreSQL, Flyway
- ✅ Tạo cấu trúc module: auth, user, product, trace, audit, common
- ✅ Application có thể BUILD và RUN thành công

---

## 🏗️ Kiến trúc hệ thống

### Modular Monolith Architecture

```
com.agritrace
├── auth/          → Authentication & Authorization
├── user/          → User & Facility Management
├── product/       → Product & Batch Management
├── trace/         → Traceability Logging
├── audit/         → Audit Trail (WORM)
└── common/        → Shared utilities, configs, exceptions
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Java 17 |
| Framework | Spring Boot 3.2.5 |
| Database | PostgreSQL 15+ |
| Migration | Flyway |
| Build Tool | Maven |
| Mapping | MapStruct |
| Utilities | Lombok |

---

## ⚙️ Yêu cầu hệ thống

### Bắt buộc

- **Java:** JDK 17 hoặc cao hơn
- **Maven:** 3.6+ hoặc sử dụng Maven Wrapper (mvnw)
- **PostgreSQL:** 15+ (hoặc Docker)

### Khuyến nghị

- **IDE:** IntelliJ IDEA / Eclipse / VS Code
- **Docker:** Để chạy PostgreSQL nhanh chóng
- **Postman/cURL:** Để test API

---

## 🚀 Cài đặt và chạy

### Bước 1: Clone/Setup project

Đảm bảo bạn đã có folder `AgriTraceChain` với đầy đủ file được tạo.

### Bước 2: Cài đặt PostgreSQL

#### Option A: Sử dụng Docker (Khuyến nghị)

```bash
docker run --name agritrace-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agritrace_db \
  -p 5432:5432 \
  -d postgres:15-alpine
```

#### Option B: Cài đặt PostgreSQL local

1. Download PostgreSQL từ: https://www.postgresql.org/download/
2. Cài đặt và tạo database:

```sql
CREATE DATABASE agritrace_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE agritrace_db TO postgres;
```

### Bước 3: Điều chỉnh cấu hình (nếu cần)

Mở file `src/main/resources/application.yml` và điều chỉnh:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/agritrace_db
    username: postgres
    password: postgres  # Thay đổi nếu khác
```

### Bước 4: Build project

```bash
# Windows
mvnw.cmd clean install

# Linux/Mac
./mvnw clean install
```

### Bước 5: Chạy ứng dụng

```bash
# Windows
mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw spring-boot:run
```

**Hoặc chạy từ IDE:**
- Mở class `AgriTraceApplication.java`
- Click Run

### Bước 6: Kiểm tra application

Khi chạy thành công, bạn sẽ thấy:

```
=============================================================
  AgriTrace System Started Successfully!
  Server running on: http://localhost:8080/api
  Swagger UI (to be added): http://localhost:8080/api/swagger-ui.html
=============================================================
```

**Test Health Check API:**

```bash
curl http://localhost:8080/api/health
```

**Response mong đợi:**

```json
{
  "status": "UP",
  "timestamp": "2026-03-26T10:30:00",
  "application": "AgriTrace System",
  "version": "1.0.0-SNAPSHOT",
  "message": "Application is running successfully!"
}
```

---

## 📁 Cấu trúc dự án

```
AgriTraceChain/
├── pom.xml                                    # Maven configuration
├── README.md                                  # Documentation
│
├── src/main/
│   ├── java/com/agritrace/
│   │   ├── AgriTraceApplication.java         # Main class
│   │   │
│   │   ├── auth/                             # Authentication Module
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── dto/
│   │   │   └── entity/
│   │   │
│   │   ├── user/                             # User Management Module
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── dto/
│   │   │   └── entity/
│   │   │
│   │   ├── product/                          # Product & Batch Module
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── dto/
│   │   │   └── entity/
│   │   │
│   │   ├── trace/                            # Traceability Module
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── dto/
│   │   │   └── entity/
│   │   │
│   │   ├── audit/                            # Audit Logging Module
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── dto/
│   │   │   └── entity/
│   │   │
│   │   └── common/                           # Shared Module
│   │       ├── config/
│   │       ├── controller/
│   │       │   └── HealthController.java    # Health check endpoint
│   │       ├── exception/
│   │       └── util/
│   │
│   └── resources/
│       ├── application.yml                   # Main configuration
│       └── db/migration/                     # Flyway scripts (empty for now)
│
└── src/test/
    └── java/com/agritrace/                   # Test classes
```

---

## 📡 API Documentation

### Health Check (Phase 1.0)

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "UP",
  "timestamp": "2026-03-26T10:30:00",
  "application": "AgriTrace System",
  "version": "1.0.0-SNAPSHOT",
  "message": "Application is running successfully!"
}
```

### Upcoming APIs (Next Phases)

- **Phase 1.1-1.4:** CRUD APIs cho User, Product, Batch, Trace
- **Phase 1.5:** Validation & Error Handling
- **Phase 1.6:** Data Seeder
- **Phase 1.7:** Complete API Testing

---

## 🗺️ Development Roadmap

### ✅ Phase 1.0 - KHỞI TẠO PROJECT (COMPLETED)

- [x] Tạo pom.xml với dependencies đầy đủ
- [x] Cấu hình application.yml
- [x] Tạo cấu trúc modular monolith
- [x] Main application class
- [x] Health check endpoint
- [x] Application có thể BUILD và RUN

### 🔜 Phase 1.1 - DATABASE (Next)

- [ ] Thiết kế schema database
- [ ] Viết Flyway migration V1__init.sql
- [ ] Tạo JPA Entities cho tất cả modules
- [ ] Định nghĩa ENUM types

### 🔜 Phase 1.2 - REPOSITORY

- [ ] Tạo JPA Repositories
- [ ] Custom query methods

### 🔜 Phase 1.3 - SERVICE

- [ ] Business logic layer
- [ ] Service interfaces và implementations

### 🔜 Phase 1.4 - CONTROLLER

- [ ] REST API endpoints
- [ ] DTO mappings

### 🔜 Phase 1.5 - VALIDATION

- [ ] Input validation
- [ ] Business rule validation
- [ ] Global exception handling

### 🔜 Phase 1.6 - DATA SEEDER

- [ ] Initial data loading
- [ ] Test users (admin, farmer)

### 🔜 Phase 1.7 - API TESTING

- [ ] cURL commands
- [ ] Postman collection

### 🔜 Phase 1.8 - DOCUMENTATION

- [ ] Complete API docs
- [ ] Setup guide

---

## 🔧 Troubleshooting

### Lỗi: "Could not connect to database"

**Nguyên nhân:** PostgreSQL chưa chạy hoặc cấu hình sai

**Giải pháp:**
```bash
# Kiểm tra PostgreSQL đang chạy
docker ps  # Nếu dùng Docker

# Hoặc kiểm tra service
sudo systemctl status postgresql  # Linux
```

### Lỗi: "Flyway validation failed"

**Nguyên nhân:** Database schema không khớp (Phase 1.0 chưa có migration)

**Giải pháp:**
- Tạm thời Flyway đã được config `baseline-on-migrate: true`
- Migration files sẽ được thêm ở Phase 1.1

### Lỗi: "Port 8080 already in use"

**Giải pháp:**
```yaml
# Thay đổi port trong application.yml
server:
  port: 8081  # Hoặc port khác
```

---

## 📝 Development Notes

### Important Rules (PHASE 1.0)

✅ **ĐÃ HOÀN THÀNH:**
- Project structure hoàn chỉnh
- Configuration files đầy đủ
- Application có thể chạy được

🚫 **CHƯA LÀM (Theo yêu cầu):**
- Database schema & migrations (Phase 1.1)
- Business logic (Phase 1.3+)
- Security/JWT (Later phase)
- Microservices split (Later phase)

### Code Standards

- **Java Version:** 17
- **Code Style:** Google Java Style Guide
- **Naming:** camelCase for variables, PascalCase for classes
- **Packages:** lowercase, separated by domain

---

## 👥 Contributors

- **Backend Team:** Senior Java Spring Boot Engineers
- **Architecture:** Modular Monolith → Microservices
- **Security:** RBAC + ABAC + Digital Signature

---

## 📄 License

Internal Project - AgriTrace System
© 2026 All Rights Reserved

---

## 📞 Support

Nếu gặp vấn đề khi chạy project, vui lòng kiểm tra:

1. ✅ Java 17 đã cài đặt: `java -version`
2. ✅ Maven đã cài đặt: `mvn -version`
3. ✅ PostgreSQL đang chạy: `psql --version`
4. ✅ Database `agritrace_db` đã tạo

---

**🎉 PHASE 1.0 HOÀN THÀNH - SẴN SÀNG CHO PHASE 1.1!**
