import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ALL_FEATURES,
  FEATURES,
  MINIMAL_FEATURES,
  type FeatureId,
  type FeatureSelection,
  formatFeatureSelection,
} from "./features";

function cloneSelection(selection: FeatureSelection): FeatureSelection {
  return { ...selection };
}

function printFeatureMenu(selection: FeatureSelection) {
  console.log();
  console.log("Select optional features for your project:");
  console.log(
    "  Type a number to toggle · a = all · m = minimal · Enter = continue",
  );
  console.log();

  FEATURES.forEach((feature, index) => {
    const checked = selection[feature.id] ? "x" : " ";
    console.log(
      `  [${checked}] ${index + 1}. ${feature.label.padEnd(22)} ${feature.description}`,
    );
  });

  console.log();
  console.log(`  Selected: ${formatFeatureSelection(selection)}`);
  console.log();
}

export async function promptFeatureSelection(
  initial: FeatureSelection = ALL_FEATURES,
): Promise<FeatureSelection> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return cloneSelection(initial);
  }

  const selection = cloneSelection(initial);
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      printFeatureMenu(selection);
      const answer = (await rl.question("Toggle feature: ")).trim().toLowerCase();

      if (!answer) {
        return selection;
      }

      if (answer === "a" || answer === "all") {
        Object.assign(selection, ALL_FEATURES);
        continue;
      }

      if (answer === "m" || answer === "minimal") {
        Object.assign(selection, MINIMAL_FEATURES);
        continue;
      }

      const index = Number.parseInt(answer, 10);
      if (Number.isNaN(index) || index < 1 || index > FEATURES.length) {
        console.log("Enter a number between 1 and 9, a, m, or press Enter.");
        continue;
      }

      const feature = FEATURES[index - 1];
      if (!feature) continue;
      selection[feature.id as FeatureId] = !selection[feature.id as FeatureId];
    }
  } finally {
    rl.close();
  }
}
