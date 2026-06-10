import { describe, expect, it } from "bun:test";
import {
  ALL_FEATURES,
  MINIMAL_FEATURES,
  buildDatabaseUrl,
  buildEntryIndex,
  buildEnvExample,
  normalizeFeatureSelection,
  parseFeatureExcludeList,
  parseFeatureIncludeList,
} from "../src/features";

describe("parseFeatureIncludeList", () => {
  it("returns all features for all", () => {
    expect(parseFeatureIncludeList("all")).toEqual(ALL_FEATURES);
  });

  it("returns minimal features for none", () => {
    expect(parseFeatureIncludeList("minimal")).toEqual(MINIMAL_FEATURES);
  });

  it("enables only listed features", () => {
    expect(parseFeatureIncludeList("auth,kafka")).toEqual({
      ...MINIMAL_FEATURES,
      auth: true,
      kafka: true,
    });
  });

  it("rejects unknown features", () => {
    expect(() => parseFeatureIncludeList("auth,unknown")).toThrow(
      "Unknown feature(s): unknown",
    );
  });
  it("accepts prisma as an alias for postgres", () => {
    expect(parseFeatureIncludeList("auth,prisma")).toEqual({
      ...MINIMAL_FEATURES,
      auth: true,
      postgres: true,
      docker: true,
    });
  });

  it("accepts kavoru-cli as an alias for cli", () => {
    expect(parseFeatureIncludeList("cli")).toEqual({
      ...MINIMAL_FEATURES,
      cli: true,
    });
  });
});

describe("normalizeFeatureSelection", () => {
  it("enables docker when postgres is selected", () => {
    expect(
      normalizeFeatureSelection({
        ...MINIMAL_FEATURES,
        postgres: true,
      }),
    ).toEqual({
      ...MINIMAL_FEATURES,
      postgres: true,
      docker: true,
    });
  });

  it("disables postgres when docker is excluded", () => {
    expect(parseFeatureExcludeList(["docker"], ALL_FEATURES).postgres).toBe(
      false,
    );
  });
});

describe("parseFeatureExcludeList", () => {
  it("disables listed features", () => {
    const selection = parseFeatureExcludeList(["kafka", "docker"], ALL_FEATURES);
    expect(selection.kafka).toBe(false);
    expect(selection.docker).toBe(false);
    expect(selection.auth).toBe(true);
  });
});

describe("buildEntryIndex", () => {
  it("bootstraps OpenTelemetry before Sentry when both are enabled", () => {
    const index = buildEntryIndex({
      ...MINIMAL_FEATURES,
      otel: true,
      sentry: true,
    });

    expect(index).toContain("bootstrapOpenTelemetry");
    expect(index).toContain("shutdownOpenTelemetry");
    expect(index.indexOf("bootstrapOpenTelemetry()")).toBeLessThan(
      index.indexOf("initSentry()"),
    );
    expect(index.indexOf("flushSentry()")).toBeLessThan(
      index.indexOf("shutdownOpenTelemetry()"),
    );
  });

  it("omits telemetry bootstrap when otel is disabled", () => {
    const index = buildEntryIndex({
      ...MINIMAL_FEATURES,
      sentry: true,
    });

    expect(index).not.toContain("bootstrapOpenTelemetry");
    expect(index).not.toContain("shutdownOpenTelemetry");
  });

  it("wires redis lifecycle when redis is enabled", () => {
    const index = buildEntryIndex({
      ...MINIMAL_FEATURES,
      redis: true,
    });

    expect(index).toContain("connectRedis");
    expect(index).toContain("stopRedis");
    expect(index).not.toContain("startKafka");
  });
});

describe("buildEnvExample", () => {
  it("includes only selected env blocks", () => {
    const env = buildEnvExample("my-api", {
      ...MINIMAL_FEATURES,
      otel: true,
      kafka: true,
    });

    expect(env).toContain("OTEL_SERVICE_NAME=my-api");
    expect(env).toContain("KAFKA_CLIENT_ID=my-api");
    expect(env).not.toContain("DATABASE_URL=");
    expect(env).not.toContain("SENTRY_SPOTLIGHT");
  });

  it("includes redis env block when redis is selected", () => {
    const env = buildEnvExample("my-api", {
      ...MINIMAL_FEATURES,
      redis: true,
    });

    expect(env).toContain("REDIS_URL=redis://localhost:6379");
    expect(env).toContain("REDIS_USERNAME=my_api");
    expect(env).toContain("REDIS_PASSWORD=my_api");
    expect(env).not.toContain("KAFKA_BROKERS");
  });

  it("includes docker postgres DATABASE_URL when postgres is selected", () => {
    const env = buildEnvExample("my-api", {
      ...MINIMAL_FEATURES,
      postgres: true,
      docker: true,
    });

    expect(env).toContain("docker compose up -d postgres");
    expect(env).toContain(
      `DATABASE_URL=${buildDatabaseUrl("my-api", "localhost")}`,
    );
  });
});
