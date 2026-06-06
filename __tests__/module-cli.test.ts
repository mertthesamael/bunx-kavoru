import { describe, expect, it } from "bun:test";
import { runModuleCommand } from "../src/module-cli";

describe("module cli", () => {
  it("requires a module name", async () => {
    await expect(runModuleCommand([])).rejects.toThrow(
      "Usage: kavoru module <module-name>",
    );
  });
});
