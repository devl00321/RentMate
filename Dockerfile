FROM eclipse-temurin:21-jre AS jre21

FROM node:22-bookworm-slim

COPY --from=jre21 /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@15.32.1 \
  && firebase setup:emulators:firestore

WORKDIR /app
COPY firebase.json firestore.rules firestore.indexes.json ./
COPY tools/docker-emulators.sh tools/seed-emulator.mjs ./tools/

EXPOSE 4000 4400 8081 9099 9150
CMD ["bash", "/app/tools/docker-emulators.sh"]
