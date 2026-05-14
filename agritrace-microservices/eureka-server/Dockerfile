FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY eureka-server/pom.xml .
RUN mvn dependency:go-offline
COPY eureka-server/src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -S agritrace && adduser -S agritrace -G agritrace
COPY --from=build /app/target/*.jar app.jar
RUN chown -R agritrace:agritrace /app
USER agritrace
EXPOSE 8761 9761
ENTRYPOINT ["java", "-jar", "app.jar"]
