# ── Stage 1: Build ──────────────────────────────────
FROM eclipse-temurin:21-jdk AS builder

ARG SKIP_TESTS=false
WORKDIR /build
COPY gradle/ gradle/
COPY gradlew settings.gradle build.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon

COPY src/ src/
RUN if [ "$SKIP_TESTS" = "true" ]; then ./gradlew bootJar --no-daemon -x test; else ./gradlew bootJar --no-daemon; fi

# ── Stage 2: Runtime ───────────────────────────────
FROM eclipse-temurin:21-jre

RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

WORKDIR /app
COPY --from=builder /build/build/libs/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
