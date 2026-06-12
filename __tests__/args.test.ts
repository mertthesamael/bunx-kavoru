import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";
import { resolveFeatureSelection } from "../src/cli";
import { MINIMAL_FEATURES } from "../src/features";

describe("parseArgs features", () => {
  it("parses --features", () => {
    const options = parseArgs(["demo", "--features", "auth,postgres"]);
    expect(options.features).toBe("auth,postgres");
    expect(options.targetDir).toBe("demo");
  });

  it("parses --no-features", () => {
    const options = parseArgs(["demo", "--no-features", "kafka,redis"]);
    expect(options.noFeatures).toEqual(["kafka", "redis"]);
  });

  it("rejects --minimal with --features", () => {
    expect(() =>
      parseArgs(["demo", "--minimal", "--features", "auth"]),
    ).toThrow("Use either --minimal or --features");
  });
});

describe("resolveFeatureSelection", () => {
  it("returns minimal selection", () => {
    const options = parseArgs(["demo", "--minimal"]);
    expect(resolveFeatureSelection(options)).toEqual(MINIMAL_FEATURES);
  });

  it("enables postgres when included", () => {
    const options = parseArgs(["demo", "--features", "auth,postgres"]);
    expect(resolveFeatureSelection(options)).toEqual({
      ...MINIMAL_FEATURES,
      auth: true,
      postgres: true,
    });
  });
});
