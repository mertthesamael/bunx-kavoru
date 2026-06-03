#!/usr/bin/env bun

import { parseArgs, printHelp, printVersion } from "./args";
import { runCli } from "./cli";
import { log } from "./log";

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));

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
