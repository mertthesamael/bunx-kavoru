import { describe, expect, it } from "bun:test";
import { runModuleCommand, runRepositoryCommand } from "../src/module-cli";

describe("module cli", () => {
  it("requires a module name", async () => {
    await expect(runModuleCommand([])).rejects.toThrow(
      "Usage: kavoru module <module-name>",
    );
  });

  it("requires a repository name", async () => {
    await expect(runRepositoryCommand([])).rejects.toThrow(
      "Usage: kavoru repository <repository-name>",
    );
  });
});
