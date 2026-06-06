import { PACKAGE_VERSION } from "./constants";

export type CliOptions = {
  targetDir: string | undefined;
  help: boolean;
  version: boolean;
  install: boolean;
  force: boolean;
  repo: string;
  branch: string;
  minimal: boolean;
  features: string | undefined;
  noFeatures: string[];
};

const HELP = `\
Usage: kavoru [options] [directory]

Create a new project from the Kavoru Elysia + Bun template.

Arguments:
  directory          Project folder (use "." for current directory)

Options:
  -h, --help         Show help
  -V, --version      Show version
  -f, --force        Overwrite / use a non-empty target directory
  --no-install       Skip "bun install" after scaffolding
  --repo <owner/name>  GitHub template repo (default: mertthesamael/Kavoru)
  --branch <name>    Template branch (default: master)
  --minimal          Core only (health, OpenAPI, response envelope)
  --features <list>  Comma-separated features to include (default: all)
  --no-features <list>  Comma-separated features to exclude

Features:
  auth, prisma, otel, sentry, kafka, websocket, resend, cron, docker

Examples:
  bunx kavoru@latest my-api
  bunx kavoru@latest my-api --minimal
  bunx kavoru@latest my-api --features auth,prisma,otel
  bunx kavoru@latest my-api --no-features kafka,docker,resend
`;

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    targetDir: undefined,
    help: false,
    version: false,
    install: true,
    force: false,
    repo: "mertthesamael/Kavoru",
    branch: "master",
    minimal: false,
    features: undefined,
    noFeatures: [],
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-V":
      case "--version":
        options.version = true;
        break;
      case "-f":
      case "--force":
        options.force = true;
        break;
      case "--no-install":
        options.install = false;
        break;
      case "--minimal":
        options.minimal = true;
        break;
      case "--features": {
        const value = argv[++i];
        if (!value) throw new Error("--features requires a comma-separated list.");
        options.features = value;
        break;
      }
      case "--no-features": {
        const value = argv[++i];
        if (!value) {
          throw new Error("--no-features requires a comma-separated list.");
        }
        options.noFeatures.push(
          ...value.split(",").map((part) => part.trim()).filter(Boolean),
        );
        break;
      }
      case "--repo": {
        const value = argv[++i];
        if (!value) throw new Error("--repo requires a value (owner/name).");
        options.repo = value;
        break;
      }
      case "--branch": {
        const value = argv[++i];
        if (!value) throw new Error("--branch requires a value.");
        options.branch = value;
        break;
      }
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        positional.push(arg);
    }
  }

  if (positional[0]) {
    options.targetDir = positional[0];
  }

  if (options.minimal && options.features) {
    throw new Error("Use either --minimal or --features, not both.");
  }

  return options;
}

export function printHelp(): void {
  console.log(HELP.trim());
}

export function printVersion(): void {
  console.log(PACKAGE_VERSION);
}
