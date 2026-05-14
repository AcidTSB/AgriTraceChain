"""
Add RAM limits and JVM options to docker-compose.yml for 8GB system
"""

yaml_content = """
  product-service:
    environment:
      JAVA_OPTS: -Xms256m -Xmx512m -XX:MaxMetaspaceSize=128m -XX:+UseG1GC -XX:MaxGCPauseMillis=200
    deploy:
      resources:
        limits:
          memory: 768M
        reservations:
          memory: 384M

  trace-service:
    environment:
      JAVA_OPTS: -Xms256m -Xmx512m -XX:MaxMetaspaceSize=128m -XX:+UseG1GC -XX:MaxGCPauseMillis=200
    deploy:
      resources:
        limits:
          memory: 768M
        reservations:
          memory: 384M

  media-service:
    environment:
      JAVA_OPTS: -Xms128m -Xmx256m -XX:MaxMetaspaceSize=96m -XX:+UseG1GC
    deploy:
      resources:
        limits:
          memory: 384M
        reservations:
          memory: 192M

  api-gateway:
    environment:
      JAVA_OPTS: -Xms128m -Xmx256m -XX:MaxMetaspaceSize=96m -XX:+UseG1GC
    deploy:
      resources:
        limits:
          memory: 384M
        reservations:
          memory: 192M

  postgres-user:
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  postgres-product:
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  postgres-trace:
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  redis:
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

  kafka:
    environment:
      KAFKA_HEAP_OPTS: -Xms256m -Xmx512m
    deploy:
      resources:
        limits:
          memory: 768M
        reservations:
          memory: 384M

  zookeeper:
    environment:
      KAFKA_HEAP_OPTS: -Xms64m -Xmx128m
    deploy:
      resources:
        limits:
          memory: 192M
        reservations:
          memory: 96M
"""

# RAM Allocation Summary for 8GB System
summary = """
TOTAL RAM ALLOCATION (8GB System):
==================================

Microservices (5):
- user-service:    768MB (Xmx 512M + overhead)
- product-service: 768MB (Xmx 512M + overhead)
- trace-service:   768MB (Xmx 512M + overhead) 
- media-service:   384MB (Xmx 256M + overhead)
- api-gateway:     384MB (Xmx 256M + overhead)
Subtotal: 3,072MB (~3GB)

Infrastructure (6):
- postgres x3:     768MB (256MB each)
- redis:           128MB
- kafka:           768MB (Xmx 512M + overhead)
- zookeeper:       192MB
Subtotal: 1,856MB (~1.9GB)

TOTAL DOCKER:     ~4.9GB
WSL2 LIMIT:        5.5GB (leaves 0.6GB buffer)
WINDOWS + OTHER:  ~2.5GB
GRAND TOTAL:      ~8GB ✅
"""

print(summary)
