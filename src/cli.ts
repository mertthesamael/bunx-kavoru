import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { CliOptions } from "./args";
import { log } from "./log";
import {
  customizeProject,
  fetchTemplate,
  installDependencies,
  removeGitMetadata,
  resolveTemplateSource,
} from "./template";
import {
  assertValidPackageName,
  isDirectoryEmpty,
  toPackageName,
} from "./validate";

async function promptProjectName(): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question("Project name: ");
    const name = toPackageName(answer);
    if (!name) {
      throw new Error("Project name cannot be empty.");
    }
    return name;
  } finally {
    rl.close();
  }
}

async function copyTemplateIntoTarget(
  tempDir: string,
  targetDir: string,
): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(tempDir, { withFileTypes: true });

  for (const entry of entries) {
    await cp(
      path.join(tempDir, entry.name),
      path.join(targetDir, entry.name),
      { recursive: true, force: true },
    );
  }
}

export async function runCli(options: CliOptions): Promise<void> {
  let targetArg = options.targetDir;

  if (!targetArg) {
    const interactive = process.stdin.isTTY && process.stdout.isTTY;
    if (!interactive) {
      throw new Error("Missing project directory. Usage: bunx kavoru <directory>");
    }
    targetArg = await promptProjectName();
  }

  const isCurrentDir = targetArg === ".";
  const packageName = isCurrentDir
    ? toPackageName(path.basename(process.cwd()))
    : toPackageName(path.basename(targetArg));

  assertValidPackageName(packageName);

  const targetDir = isCurrentDir
    ? process.cwd()
    : path.resolve(process.cwd(), targetArg);

  if (existsSync(targetDir) && !options.force && !isDirectoryEmpty(targetDir)) {
    throw new Error(
      `Target directory "${targetDir}" is not empty. Use --force to scaffold anyway.`,
    );
  }

  const source = resolveTemplateSource(options.repo, options.branch);
  const tempDir = path.join(os.tmpdir(), `kavoru-${Date.now()}`);

  log.info(`Creating Kavoru project "${packageName}"`);

  try {
    await fetchTemplate(source, tempDir);
    await removeGitMetadata(tempDir);
    await customizeProject(tempDir, packageName);
    await copyTemplateIntoTarget(tempDir, targetDir);

    if (options.install) {
      await installDependencies(targetDir);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }

  log.success(`Project ready at ${targetDir}`);
  console.log();
  console.log("Next steps:");
  if (!isCurrentDir) {
    console.log(`  cd ${targetArg}`);
  }
  if (!options.install) {
    console.log("  bun install");
  }
  console.log("  bun run dev");
  console.log();
  console.log("  API:     http://localhost:3131");
  console.log("  OpenAPI: http://localhost:3131/help");
}
