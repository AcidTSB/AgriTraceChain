FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY common-proto /common-proto
WORKDIR /common-proto
RUN mvn clean install -DskipTests
WORKDIR /app
COPY product-service/pom.xml .
RUN mvn dependency:go-offline
COPY product-service/src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -S agritrace && adduser -S agritrace -G agritrace
COPY --from=build /app/target/*.jar app.jar
RUN chown -R agritrace:agritrace /app
USER agritrace
EXPOSE 8080 9090 9082
ENTRYPOINT ["java", "-jar", "app.jar"]
