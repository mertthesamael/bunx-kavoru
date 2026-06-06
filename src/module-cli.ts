import { existsSync } from "node:fs";
import path from "node:path";
import { log } from "./log";

function findProjectRoot(cwd: string): string {
  let current = path.resolve(cwd);

  while (true) {
    const packageJson = path.join(current, "package.json");
    const localCli = path.join(current, "scripts/kavoru-cli.ts");
    const moduleScript = path.join(current, "scripts/generate-module.ts");
    if (
      existsSync(packageJson) &&
      (existsSync(localCli) || existsSync(moduleScript))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error(
    "Could not find a Kavoru project with the Project CLI enabled. Scaffold with the cli feature or run from a project that includes scripts/kavoru-cli.ts.",
  );
}

export async function runModuleCommand(argv: string[]): Promise<void> {
  const force = argv.includes("--force") || argv.includes("-f");
  const name = argv.find((arg) => !arg.startsWith("-"));

  if (!name) {
    throw new Error("Usage: kavoru module <module-name> [--force]");
  }

  const projectDir = findProjectRoot(process.cwd());
  const localCli = path.join(projectDir, "scripts/kavoru-cli.ts");
  const scriptPath = existsSync(localCli)
    ? localCli
    : path.join(projectDir, "scripts/generate-module.ts");
  const cmd = existsSync(localCli)
    ? ["bun", scriptPath, "module", name]
    : ["bun", scriptPath, name];
  if (force) cmd.push("--force");

  log.info(`Generating module "${name}" in ${projectDir}`);

  const proc = Bun.spawn(cmd, {
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode ?? 1);
  }
}

export function printModuleHelp(): void {
  console.log(`\
Usage: kavoru module <module-name> [options]

Generate a feature module under src/modules/<module-name>/ with:
  routes.ts, service.ts, types.ts

Options:
  -f, --force   Overwrite an existing module folder
  -h, --help    Show help

Examples:
  kavoru module users
  kavoru module user-profile --force
  bun run kavoru module billing
`);
}
