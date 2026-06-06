import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";
import { resolveFeatureSelection } from "../src/cli";
import { MINIMAL_FEATURES } from "../src/features";

describe("parseArgs features", () => {
  it("parses --features", () => {
    const options = parseArgs(["demo", "--features", "auth,prisma"]);
    expect(options.features).toBe("auth,prisma");
    expect(options.targetDir).toBe("demo");
  });

  it("parses --no-features", () => {
    const options = parseArgs([
      "demo",
      "--no-features",
      "kafka,docker",
    ]);
    expect(options.noFeatures).toEqual(["kafka", "docker"]);
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
});
