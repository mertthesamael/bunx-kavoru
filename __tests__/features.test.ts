import { describe, expect, it } from "bun:test";
import {
  ALL_FEATURES,
  MINIMAL_FEATURES,
  buildEnvExample,
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
});

describe("parseFeatureExcludeList", () => {
  it("disables listed features", () => {
    const selection = parseFeatureExcludeList(["kafka", "docker"], ALL_FEATURES);
    expect(selection.kafka).toBe(false);
    expect(selection.docker).toBe(false);
    expect(selection.auth).toBe(true);
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
});
