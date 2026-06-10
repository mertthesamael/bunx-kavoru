import { existsSync } from "node:fs";
import path from "node:path";
import { log } from "./log";

function findProjectRoot(cwd: string): string {
  let current = path.resolve(cwd);

  while (true) {
    const packageJson = path.join(current, "package.json");
    const localCli = path.join(current, "scripts/kavoru-cli.ts");
    const moduleScript = path.join(current, "scripts/generate-module.ts");
    const repositoryScript = path.join(
      current,
      "scripts/generate-repository.ts",
    );
    if (
      existsSync(packageJson) &&
      (existsSync(localCli) ||
        existsSync(moduleScript) ||
        existsSync(repositoryScript))
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

async function runProjectScript(
  projectDir: string,
  command: "module" | "repository",
  name: string,
  force: boolean,
): Promise<void> {
  const localCli = path.join(projectDir, "scripts/kavoru-cli.ts");
  const fallbackScript =
    command === "module"
      ? path.join(projectDir, "scripts/generate-module.ts")
      : path.join(projectDir, "scripts/generate-repository.ts");

  const scriptPath = existsSync(localCli) ? localCli : fallbackScript;
  const cmd = existsSync(localCli)
    ? ["bun", scriptPath, command, name]
    : ["bun", scriptPath, name];
  if (force) cmd.push("--force");

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

export async function runModuleCommand(argv: string[]): Promise<void> {
  const force = argv.includes("--force") || argv.includes("-f");
  const name = argv.find((arg) => !arg.startsWith("-"));

  if (!name) {
    throw new Error("Usage: kavoru module <module-name> [--force]");
  }

  const projectDir = findProjectRoot(process.cwd());
  log.info(`Generating module "${name}" in ${projectDir}`);
  await runProjectScript(projectDir, "module", name, force);
}

export async function runRepositoryCommand(argv: string[]): Promise<void> {
  const force = argv.includes("--force") || argv.includes("-f");
  const name = argv.find((arg) => !arg.startsWith("-"));

  if (!name) {
    throw new Error("Usage: kavoru repository <repository-name> [--force]");
  }

  const projectDir = findProjectRoot(process.cwd());
  const prismaConfig = path.join(projectDir, "prisma.config.ts");
  if (!existsSync(prismaConfig)) {
    throw new Error(
      "PostgreSQL/Prisma is not enabled in this project. Scaffold with the postgres feature first.",
    );
  }

  log.info(`Generating repository "${name}" in ${projectDir}`);
  await runProjectScript(projectDir, "repository", name, force);
}

export function printModuleHelp(): void {
  console.log(`\
Usage: kavoru module <module-name> [options]

Generate a feature module under src/modules/<module-name>/ with:
  routes.ts, service.ts, types.ts
  src/models/schemas/<module-name>.ts (query, body, params schemas)

Options:
  -f, --force   Overwrite an existing module folder
  -h, --help    Show help

Examples:
  kavoru module users
  kavoru module user-profile --force
`);
}

export function printRepositoryHelp(): void {
  console.log(`\
Usage: kavoru repository <repository-name> [options]

Generate Prisma model + repository (requires postgres/prisma feature):
  src/infra/prisma/schemas/<name>.prisma
  src/infra/prisma/repositories/<name>.ts

Runs bunx prisma generate when finished.

Options:
  -f, --force   Overwrite existing schema/repository files
  -h, --help    Show help

Examples:
  kavoru repository user
  kavoru repository billing --force
`);
}
