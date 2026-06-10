#!/usr/bin/env bun

import { parseArgs, printHelp, printVersion } from "./args";
import { runCli } from "./cli";
import { log } from "./log";
import { printModuleHelp, printRepositoryHelp, runModuleCommand, runRepositoryCommand } from "./module-cli";

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2);

    if (argv[0] === "module") {
      if (argv.includes("-h") || argv.includes("--help")) {
        printModuleHelp();
        return;
      }

      await runModuleCommand(argv.slice(1));
      return;
    }

    if (argv[0] === "repository") {
      if (argv.includes("-h") || argv.includes("--help")) {
        printRepositoryHelp();
        return;
      }

      await runRepositoryCommand(argv.slice(1));
      return;
    }

    const options = parseArgs(argv);

    if (options.help) {
      printHelp();
      return;
    }

    if (options.version) {
      printVersion();
      return;
    }

    await runCli(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(message);
    process.exit(1);
  }
}

await main();
