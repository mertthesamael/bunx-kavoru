import { describe, expect, it } from "bun:test";
import {
  assertValidPackageName,
  toPackageName,
} from "../src/validate";

describe("toPackageName", () => {
  it("slugifies human input", () => {
    expect(toPackageName("My Cool API")).toBe("my-cool-api");
  });
});

describe("assertValidPackageName", () => {
  it("accepts valid names", () => {
    expect(() => assertValidPackageName("my-api")).not.toThrow();
  });

  it("rejects empty names", () => {
    expect(() => assertValidPackageName("")).toThrow();
  });
});
