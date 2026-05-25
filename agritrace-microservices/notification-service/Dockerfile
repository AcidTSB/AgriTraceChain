# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 1. Copy file POM gốc của toàn bộ dự án
COPY pom.xml .
# 2. Copy thư mục common-proto (NẾU CÓ trong dự án)
COPY agritrace-microservices/common-proto ./agritrace-microservices/common-proto
# 3. Copy thư mục notification-service
COPY agritrace-microservices/notification-service ./agritrace-microservices/notification-service

# 4. Tải dependencies riêng cho notification-service
WORKDIR /app/agritrace-microservices/notification-service
RUN mvn dependency:go-offline

# 5. Build
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -S agritrace && adduser -S agritrace -G agritrace
COPY --from=build /app/agritrace-microservices/notification-service/target/*.jar app.jar
RUN chown -R agritrace:agritrace /app
USER agritrace
EXPOSE 8085
CMD ["java", "-jar", "app.jar"]
