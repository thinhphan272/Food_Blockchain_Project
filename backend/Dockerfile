# Stage 1: Build Spring Boot Fat JAR with Maven & JDK 21
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Production Runtime with Eclipse Temurin 21 JRE Alpine
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S smartchain && adduser -S smartchain -G smartchain
USER smartchain:smartchain

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/system/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

